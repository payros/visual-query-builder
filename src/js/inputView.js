import React from 'react'
import ReactDOM from 'react-dom'
import ContentEditable from 'react-contenteditable'
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
        this.state = { html:queryStore.getQueryHTML() };
        this.query = queryStore.getQueryString()
        this.delay = 1000;
    }

    componentWillMount(){
       queryStore.on("query-updated", () => {
            this.setState({html:queryStore.getQueryHTML()})
            this.query = queryStore.getQueryString()
            this.executeQuery()

        })
        resultsStore.on("results-fetched", () => {
            dispatcher.dispatch({
               type:'UPDATE_QUERY',
               query:this.query
            })
        })
    }

    componentDidMount() {
        if(this.query.length){
            if(this.requestTimeout) clearTimeout(this.requestTimeout);
            this.requestTimeout = setTimeout(() => this.executeQuery(), this.delay);
        }
    }

    handleEvents(ev){
        switch(ev.type){
            case "COLUMN_DROP":
                this.handleDrop(ev.column)
                break
        }
    }

    handleChange(event) {
        const query = Utils.getStringFromHTML(event.target.value)
        const HTML = queryStore.getQueryHTML(query)
        const carretPosition = Utils.getCaretPosition(this.refs.inputbox.el.current)[0]
        const stringLength = query.length

        //Only update the html colors if the carret is at the end, otherwise it will jump
        if(carretPosition === stringLength) {
            this.setState({ html:HTML })
        }

        //Now fetch new results based on the updated query
        this.query = query;
        if(this.requestTimeout) clearTimeout(this.requestTimeout);
        this.requestTimeout = setTimeout(() => this.executeQuery(), this.delay);

    }

    executeQuery(){
        dispatcher.dispatch({
           type:'FETCH_RESULTS',
           query:this.query
        })
    }

    render(){
        return  <ContentEditable ref="inputbox" className="input-form" html={this.state.html} onChange={(e) => this.handleChange(e)}/>
    }
}

export default InputView
