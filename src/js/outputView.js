import React from 'react'
import { Paper, NativeSelect } from '@material-ui/core';
import resultsStore from './resultsStore'
import queryStore from './queryStore'
import schemaStore from './schemaStore'
import dispatcher from './dispatcher'
import MessageBox from './messageBox'
import { FlexTable, FlexHead, FlexBody, FlexRow, FlexCell } from './flexTable'
import Utils from './utils'


class OutputView extends React.Component {
    render(){
        return  <section id="output-view">
                    <ResultsTable></ResultsTable>
                </section>
    }
}

class ResultsTable extends React.Component {
	constructor() {
    	super()
    	this.state = {
    		headers:[],
    		results:[],
    	  loading:false,
    		error:false,
    		dragging:false,
    		filteringToggle:schemaStore.getFiltering(),
  			groupingToggle:schemaStore.getGrouping(),
  			orderingToggle:schemaStore.getOrdering()
  		}
  }

	componentWillMount(){
		//Allows this component to listen to events
    dispatcher.register(this.handleEvents.bind(this))

		resultsStore.on("results-loading", () => {
			this.setState({error:false, loading:true})
		})
		resultsStore.on("results-fetched", () => {
			this.setState({error:false, loading:false, headers:queryStore.getColumns(), results:resultsStore.getResults()})
		})
		resultsStore.on("results-error", () => {
			this.setState({error:true, loading:false})
		})
		queryStore.on("query-parsed", () => {
			this.setState({error:false, loading:false})
		})
    queryStore.on("parse-error", () => {
      this.setState({error:true, loading:false})
    })

		schemaStore.on("filtering-toggled", () => this.handleToggle())
		schemaStore.on("grouping-toggled", () => this.handleToggle())
		schemaStore.on("ordering-toggled", () => this.handleToggle())
	}

	handleToggle(){
		this.setState({
			filteringToggle:schemaStore.getFiltering(),
			groupingToggle:schemaStore.getGrouping(),
			orderingToggle:schemaStore.getOrdering()
		}, () => {
			if(this.refs.table) this.refs.table.handleResize()
		})
	}

	handleEvents(ev){
        switch(ev.type){
            case "COLUMN_DRAG_START":
                this.handleDrag(true)
                break
            case "COLUMN_DRAG_END":
                this.handleDrag(false)
                break
        }
    }

   	handleDragOver(ev){
   		ev.preventDefault();
   	}


    handleDrag(isDragging){
    	this.setState({ dragging:isDragging })
    }

    handleDrop(ev){
    	const column = ev.dataTransfer.getData('column')
    	dispatcher.dispatch({ type:'COLUMN_DROP', column:column })
    }

    handleRemoveColumn(colIdx){
    	dispatcher.dispatch({ type:'COLUMN_REMOVE', colIdx:colIdx })
    }

	render(){
		const rows = (this.state.results.length ? this.state.results : []).map(r => this.state.headers.map(h => r[ h.indexOf("(") === -1 ? h : h.substring(0, h.indexOf("(")).toLowerCase()]))
		const schema = schemaStore.getSchema()
		const allColumns = Object.keys(schema).reduce((arr, table) => arr.concat(schema[table]), [])
		const headerCells = this.state.headers.map((col, idx) => <FlexCell className="column-remove-btn" onClick={() => this.handleRemoveColumn(idx)} >{col}</FlexCell>)
		const filterCells = this.state.headers.map(headerStr => <FilterCell column={{name:headerStr, type:Utils.getTypeFromHeader(headerStr, allColumns, true)}}/>)
		const groupCells = this.state.headers.map((headerStr, idx) => <GroupCell idx={idx} column={{name:headerStr, type:Utils.getTypeFromHeader(headerStr, allColumns, false)}}/>)
		const orderCells = this.state.headers.map((headerStr, idx) => <OrderCell idx={idx} colNum={this.state.headers.length} column={{name:headerStr, type:Utils.getTypeFromHeader(headerStr, allColumns, false)}}/>)
    const showMsg = !this.state.loading && !resultsStore.getShowTable();

    return  <Paper>
					{this.state.dragging && <div className="drop-curtain" onDragOver={this.handleDragOver} onDrop={(ev) => this.handleDrop(ev)}><p>Drop to Add Column to Query</p></div>}
					{this.state.loading && <Utils.AjaxLoader/>}
					<MessageBox show={showMsg} animate={false}/>
          {!showMsg && !this.state.loading && this.state.results.length === 0 && <p className="empty-msg">No Results</p>}
					{!showMsg && <FlexTable ref="table">
  												<FlexHead>
  										        	<FlexRow>{headerCells}</FlexRow>
  										        	{this.state.filteringToggle && <FlexRow>{filterCells}</FlexRow>}
  										        	{this.state.groupingToggle && <FlexRow>{groupCells}</FlexRow>}
  										        	{this.state.orderingToggle && <FlexRow>{orderCells}</FlexRow>}
  												</FlexHead>
  										        <FlexBody rows={rows}/>
									      </FlexTable>}
				</Paper>
	}
}

class FilterCell extends React.Component {
	constructor(props) {
    	super(props)
    	const filter = queryStore.getWhereForColumn(this.props.column.name, this.props.column.type)
    	this.state = {operator:filter.operator.length ? filter.operator : this.props.column.type === "integer" ? "=" : "", value:filter.value }
    	this.timeout = null
    	this.delay = 1000
  	}

  	componentWillMount(){
		resultsStore.on("results-fetched", () => {
			const filter = queryStore.getWhereForColumn(this.props.column.name, this.props.column.type)
			this.setState({operator:filter.operator.length ? filter.operator : this.props.column.type === "integer" ? "=" : "", value:filter.value })
		})
	}

    handleChange(e){
        const key = e.target.name
        this.setState({ [key]: e.target.value }, () => {
        	if(this.timeout) clearInterval(this.timeout)
        	this.timeout = setTimeout(() => {

        		if(this.state.value.length || key !== "operator"){
		            dispatcher.dispatch({
		            	type:'FILTER_COLUMN',
		            	column:this.props.column.name,
		            	value:this.state.value,
		            	operator:this.state.operator.length ? this.state.operator : "like"
		            })
	        	}
        	}, this.delay)
        })
    }

	render(){
		return <FlexCell className="filter" {...this.props} >
					{this.props.column.type === "integer" &&
					<NativeSelect value={this.state.operator} onChange={(ev) => this.handleChange(ev)} inputProps={{ name: 'operator' }}>
						<option value="<" >less than</option>
						<option value="<=" >less or equal</option>
						<option value="=" selected>equal to</option>
						<option value=">=" >greater or equal</option>
						<option value=">" >greater than</option>
						<option value="<>" >not equal</option>
        			</NativeSelect>}
					{this.props.column.type !== null && <input name="value" type={this.props.column.type === "integer" ? 'number' : 'text'} placeholder={"filter " + this.props.column.name} value={this.state.value} onChange={(ev) => this.handleChange(ev)}/>}
				</FlexCell>
	}
}

class GroupCell extends React.Component {
	constructor(props) {
    	super(props)
    	this.state = {func:queryStore.getGroupByColumn(this.props.column.name)}
  	}

  	componentWillMount(){
		resultsStore.on("results-fetched", () => {
			this.setState({func:queryStore.getGroupByColumn(this.props.column.name)})
		})
	}

    handleChange(e){
        const key = e.target.name
        this.setState({ [key]: e.target.value }, () => {
            dispatcher.dispatch({
            	type:'GROUP_COLUMN',
            	column:this.props.idx,
            	func:this.state.func,
              colType:this.props.column.type
            })
        })
    }

	render(){
		return <FlexCell className="group" {...this.props} >
					<NativeSelect value={this.state.func} onChange={(ev) => this.handleChange(ev)} inputProps={{ name: 'func' }}>
						<option value="" >unique</option>
						<option value="COUNT" >count</option>
						{this.props.column.type === "integer" &&
							<React.Fragment>
								<option value="SUM" >sum</option>
								<option value="AVG" >average</option>
								<option value="MIN">minimum</option>
								<option value="MAX" >maximum</option>
							</React.Fragment>}
        			</NativeSelect>
				</FlexCell>
	}
}

class OrderCell extends React.Component {
	constructor(props) {
    	super(props)
    	this.state = queryStore.getOrderFromColumn(this.props.idx)
  	}

  	componentWillMount(){
		resultsStore.on("results-fetched", () => {
			this.setState(queryStore.getOrderFromColumn(this.props.idx))
		})
	}

    handleChange(e){
        const key = e.target.name
        this.setState({ [key]: e.target.value }, () => {
            dispatcher.dispatch({
            	type:'ORDER_COLUMN',
            	column:this.props.idx,
            	order:this.state.order.length ? parseInt(this.state.order) : null,
            	sort:this.state.sort === "desc" ? "DESC" : null
            })
        })
    }

	render(){
		const numberOptions = [...Array(this.props.colNum).keys()].map(i => <option value={i} >{i+1}</option>)
		return <FlexCell className="order" {...this.props} >
					<NativeSelect value={this.state.order} onChange={(ev) => this.handleChange(ev)} inputProps={{ name: 'order' }}>
						<option value="" >unordered</option>
						{numberOptions}
        			</NativeSelect>
        			<NativeSelect value={this.state.sort} onChange={(ev) => this.handleChange(ev)} inputProps={{ name: 'sort' }}>
						<option value="asc" >ascending</option>
						<option value="desc" >descending</option>
        			</NativeSelect>
				</FlexCell>
	}
}

export default OutputView
