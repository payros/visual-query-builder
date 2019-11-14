import React from 'react'
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
        this.state = { value:queryStore.getQueryString(), html:queryStore.getQueryHTML()};
        this.delay = 1000;
    }

    componentWillMount(){
       queryStore.on("query-updated", () => {
            this.setState({value:queryStore.getQueryString(), html:queryStore.getQueryHTML()}, this.executeQuery)
        })
        resultsStore.on("results-fetched", () => {
            dispatcher.dispatch({
               type:'UPDATE_QUERY',
               query:this.state.value
            })
        })
    }

    componentDidMount() {
        if(this.state.value.length){
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
        // console.log(event.target.value, query, HTML)
        this.setState({value:query,  html:HTML}, () => {
            if(this.requestTimeout) clearTimeout(this.requestTimeout);
            this.requestTimeout = setTimeout(() => this.executeQuery(), this.delay);
        });
    }

    executeQuery(){
        dispatcher.dispatch({
           type:'FETCH_RESULTS',
           query:this.state.value
        })
    }

    render(){
        return  <ContentEditable className="input-form" html={this.state.html} onChange={(e) => this.handleChange(e)}/>
    }
}

export default InputView