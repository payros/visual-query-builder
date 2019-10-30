import React from 'react'
import queryStore from './queryStore'
import dispatcher from './dispatcher'

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
        this.state = { value:queryStore.getQueryString() };
        this.delay = 1000;
    }

    componentWillMount(){
       queryStore.on("query-updated", () => {
            this.setState({value:queryStore.getQueryString()}, this.executeQuery)
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

    handleDrop(columnString){

    }

    handleChange(event) {
        this.setState({value: event.target.value}, () => {
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
        return  <textarea value={this.state.value} onChange={(e) => this.handleChange(e)} placeholder="Type SQL Query"></textarea>
    }
}

export default InputView