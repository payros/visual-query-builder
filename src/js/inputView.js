import React from 'react'
import ContentEditable from 'react-contenteditable'
import MessageBox from './messageBox'
import queryStore from './queryStore'
import resultsStore from './resultsStore'
import dispatcher from './dispatcher'
import Utils from './utils'

class InputView extends React.Component {
    render(){
        return  <section id="input-view">
                    <SqlForm/>
                </section>
    }
}

class SqlForm extends React.Component {
    constructor(props) {
        super(props);
        this.requestTimeout = null;
        this.parseTimeout = null;
        this.query = queryStore.getQueryString()
        this.state = { html:queryStore.getQueryHTML(), placeholder:this.query.length ? ">" : "> Type SQL Query"};
        this.delay = 1500;
    }

    componentWillMount(){
       queryStore.on("query-updated", () => {
            this.query = queryStore.getQueryString()
            this.setState({html:queryStore.getQueryHTML(), placeholder:this.query.length ? ">" : "> Type SQL Query"})
            this.executeQuery()
        })

        resultsStore.on("results-fetched", () => {
            dispatcher.dispatch({
               type:'UPDATE_QUERY',
               query:this.query
            })
        })

        resultsStore.on("results-error", (errorPos) => {
            this.safelyUpdateHTML(queryStore.getErrorHTML(this.query, "error", errorPos))
            // this.setState({placeholder:this.query.length ? ">" : "> Type SQL Query"})
         })
    }

    componentDidMount() {
        if(this.query.length){
            if(this.requestTimeout) clearTimeout(this.requestTimeout);
            this.requestTimeout = setTimeout(() => this.executeQuery(), this.delay);
        }
    }

    // handleEvents(ev){
    //     switch(ev.type){
    //         case "COLUMN_DROP":
    //             this.handleDrop(ev.column)
    //             break
    //     }
    // }

    safelyUpdateHTML(html) {
        const positions = Utils.getCaretPosition(this.refs.inputbox.el.current)
        const caretPosition = positions ? positions[0] : null
        this.setState({ html:html, placeholder:this.query.length || caretPosition !== null ? ">" : "> Type SQL Query"}, () => {
          if(this.query.length && positions && positions[0] === positions[1]) Utils.setCaretPosition(this.refs.inputbox.el.current, caretPosition)
        })
    }

    handleChange(event) {
        const query = Utils.getStringFromHTML(event.target.value)
        const HTML = queryStore.getQueryHTML(query)
        // Manually set the caret position to avoid making it jump
        if(this.parseTimeout) clearTimeout(this.parseTimeout);
        this.parseTimeout = setTimeout(() => this.safelyUpdateHTML(HTML), this.delay/3);
        //Now fetch new results based on the updated query
        this.query = query;
        if(this.requestTimeout) clearTimeout(this.requestTimeout);
        this.requestTimeout = setTimeout(() => this.executeQuery(), this.delay);

    }

    handleFocus(){
      if(this.query.length === 0) this.setState({ placeholder:">" })
    }

    handleBlur(){
      if(this.query.length === 0) this.setState({ placeholder:this.query.length ? ">" : "> Type SQL Query" })
    }

    executeQuery(){
        const success = queryStore.parseQuery(this.query)
        if(success){
          dispatcher.dispatch({
             type:'FETCH_RESULTS',
             query:this.query
          })
        }
    }

    render(){
        return  <React.Fragment>
                  <p className="placeholder">{this.state.placeholder}</p>
                  <ContentEditable ref="inputbox" className="input-form" html={this.state.html} onFocus={ () => this.handleFocus() }  onBlur={ () => this.handleBlur() } onChange={(e) => this.handleChange(e)}/>
                  <InputMessageBox/>
                </React.Fragment>
    }
}

class InputMessageBox extends React.Component {
  constructor(){
    super();
    this.state = {show:false}
  }

  componentWillMount(){
      resultsStore.on("results-loading", () => this.setState({show:false}))
      queryStore.on("parse-error", () => this.setState({show:resultsStore.getShowTable()}))
      resultsStore.on("results-error", () => this.setState({show:resultsStore.getShowTable()}))
  }

  render(){
    return <MessageBox show={this.state.show} animate={true}/>
  }
}

export default InputView
