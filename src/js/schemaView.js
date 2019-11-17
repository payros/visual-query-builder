import React from 'react'
import axios from 'axios'
import { FormGroup, FormControlLabel, Switch } from '@material-ui/core';
import schemaStore from './schemaStore'
import dispatcher from './dispatcher'
import Utils from './utils'

class SchemaView extends React.Component {
	constructor() {
    	super()
    	this.state = { loading:true, schema:{}, filteringToggle:schemaStore.getFiltering(), groupingToggle:schemaStore.getGrouping(), orderingToggle:schemaStore.getOrdering() }
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
		schemaStore.on("filtering-toggled", () => {
			this.setState({filteringToggle:schemaStore.getFiltering()})
		})
		schemaStore.on("grouping-toggled", () => {
			this.setState({groupingToggle:schemaStore.getGrouping()})
		})
		schemaStore.on("ordering-toggled", () => {
			this.setState({orderingToggle:schemaStore.getOrdering()})
		})

		//Get schema for the first time
		dispatcher.dispatch({ type:'FETCH_SCHEMA' })
  	}

  	handleChange(e){
        const key = e.target.name
        this.setState({ [key]: e.target.checked }, () => {
        	let toggleType
        	switch(key){
        		case "filteringToggle":
        			toggleType = "TOGGLE_FILTERING"
        			break;
        		case "groupingToggle":
        			toggleType = "TOGGLE_GROUPING"
        			break;
        		case "orderingToggle":
        			toggleType = "TOGGLE_ORDERING"
        			break;
        	}
        	dispatcher.dispatch({
            	type:toggleType,
            	checked:this.state[key]
            })
        })
    }

    render(){
    	let content;
    	if(this.state.loading){
    		content = <Utils.AjaxLoader/>
    	} else {
    		const s = this.state.schema
    		content = <ul className="table-list">{ Object.keys(s).map(k => <li><ColumnList title={k} columns={s[k]}/></li>)}</ul>
    	}
        return  <sidebar id="schema-browser">
        			<h3>Columns</h3>
        			{content}
        			<h3>Operations</h3>
        			<FormGroup row className="toggles-list">
				    	<FormControlLabel label="Filtering" control={<Switch checked={this.state.filteringToggle} onChange={(ev) => this.handleChange(ev)} className="yellow" inputProps={{ 'aria-label': 'checkbox', 'name':'filteringToggle' }}/> }/>
				    	<FormControlLabel label="Grouping" control={<Switch checked={this.state.groupingToggle} onChange={(ev) => this.handleChange(ev)} className="blue" inputProps={{ 'aria-label': 'checkbox', 'name':'groupingToggle' }}/> }/>
				    	<FormControlLabel label="Ordering" control={<Switch checked={this.state.orderingToggle} onChange={(ev) => this.handleChange(ev)} className="orange" inputProps={{ 'aria-label': 'checkbox', 'name':'orderingToggle' }}/> }/>
    				</FormGroup>
                </sidebar>
    }
}

class ColumnList extends React.Component {
	render(){
		return <React.Fragment>
					<p className="table-title">{this.props.title}</p>
					<ul className="column-list">
						{ this.props.columns.map(c => <ColumnItem table={this.props.title} column={c.name}/>)}
						<ColumnItem table={this.props.title} column="*"/>
					</ul>
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
