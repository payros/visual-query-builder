import React from 'react'
import axios from 'axios'
import Utils from './utils'

class SchemaView extends React.Component {
	constructor() {
    	super()
    	this.state = {loading:true, schema:{}}
  	}

  	componentWillMount(){
  		//Get Schema for the first time
  		axios.get('/get-schema').then(res => {
          if(res.data){
            this.setState({loading:false, schema:res.data})
          }
        })
  	}

    render(){
    	let content;
    	if(this.state.loading){
    		content = <Utils.AjaxLoader/>
    	} else {
    		const s = this.state.schema
    		content = <ul className="table-list">{ Object.keys(s).map(k => <li><TableList title={k} columns={s[k]}/></li>)}</ul>
    	}
        return  <sidebar id="schema_browser">
        			<h3>Schema</h3>
        			{content}
                </sidebar>
    }
}

class TableList extends React.Component {
	render(){
		return <React.Fragment>
					<p className="table-title">{this.props.title}</p>
					<ul className="column-list">{ this.props.columns.map(c => <li>{c}</li>)}</ul>
			   </React.Fragment>
	}
}

export default SchemaView