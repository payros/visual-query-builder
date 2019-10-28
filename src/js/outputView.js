import React from 'react'
import { Paper } from '@material-ui/core';
import resultsStore from './resultsStore'
import dispatcher from './dispatcher'
import { FlexTable, FlexHead, FlexBody, FlexRow } from './flexTable'
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
    	this.state = {results:[], loading:true, error:false, errorLog:""}
  	}

	componentWillMount(){
		resultsStore.on("results-loading", () => {
			this.setState({error:false, loading:true, results:[]})
		})
		resultsStore.on("results-fetched", () => {
			this.setState({loading:false, results:resultsStore.getResults()})
		})
		resultsStore.on("results-error", () => {
			this.setState({error:true, loading:false, errorLog:resultsStore.getErrorLog()})
		})
	}

	render(){
		let content;
		if(this.state.loading){
			content = <Utils.AjaxLoader/>
		} else if(this.state.error) {
			content = <p id="error-msg">{this.state.errorLog}</p>
		} else {
			const headerValues = (this.state.results.length ? Object.keys(this.state.results[0]) : [])
			const headers = headerValues.map(h => <th className="flex-cell" align="left">{h}</th>)
			const rows = (this.state.results.length ? this.state.results : []).map(r => headerValues.map(h => r[h]))
			content = 	<FlexTable>
							<FlexHead>
					        	<FlexRow cells={headerValues} headCells={true}/>
					        </FlexHead>
					        <FlexBody rows={rows}/>
				      	</FlexTable>							
		}
		return  <Paper>{content}</Paper>
	}
}

export default OutputView