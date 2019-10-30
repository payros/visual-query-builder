import React from 'react'
import axios from 'axios'
import schemaStore from './schemaStore'
import dispatcher from './dispatcher'
import Utils from './utils'

class SchemaView extends React.Component {
	constructor() {
    	super()
    	this.state = {loading:true, schema:{}}
  	}

  	componentWillMount(){
		schemaStore.on("schema-loading", () => {
			this.setState({error:false, loading:true, schema:[]})
		})
		schemaStore.on("schema-fetched", () => {
			this.setState({loading:false, schema:schemaStore.getSchema()})
		})
		schemaStore.on("schema-error", () => {
			this.setState({error:true, loading:false, errorLog:schemaStore.getErrorLog()})
		})

		//Get schema for the first time
		dispatcher.dispatch({ type:'FETCH_SCHEMA' })
  	}

    render(){
    	let content;
    	if(this.state.loading){
    		content = <Utils.AjaxLoader/>
    	} else {
    		const s = this.state.schema
    		content = <ul className="table-list">{ Object.keys(s).map(k => <li><ColumnList title={k} columns={s[k]}/></li>)}</ul>
    	}
        return  <sidebar id="schema_browser">
        			<h3>Schema</h3>
        			{content}
                </sidebar>
    }
}

class ColumnList extends React.Component {
	render(){
		return <React.Fragment>
					<p className="table-title">{this.props.title}</p>
					<ul className="column-list">{ this.props.columns.map(c => <ColumnItem table={this.props.title} column={c}/>)}</ul>
			   </React.Fragment>
	}
}

class ColumnItem extends React.Component {
	handleDragStart(ev){
		ev.dataTransfer.setData('column', this.props.table + "." + this.props.column)
		dispatcher.dispatch({ type:'COLUMN_DRAG_START' })
	}

	handleDragEnd(){
		dispatcher.dispatch({ type:'COLUMN_DRAG_END' })
	}

	render(){
		return <li draggable="true" onDragStart={(ev) => this.handleDragStart(ev)} onDragEnd={this.handleDragEnd}>{this.props.column}</li>
	}
}

export default SchemaView