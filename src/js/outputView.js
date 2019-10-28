import React from 'react'
import { Paper } from '@material-ui/core';
import resultsStore from './resultsStore'
import dispatcher from './dispatcher'
import { FlexTable, FlexHead, FlexBody, FlexRow } from './flexTable'

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
    	this.state = {results:[], tableHeight:100}
  	}

	componentWillMount(){
		resultsStore.on("new-results", () => {
			this.setState({results: resultsStore.getResults()})
		})
	}

	render(){
		let content;
			const headerValues = (this.state.results.length ? Object.keys(this.state.results[0]) : [])
			const headers = headerValues.map(h => <th className="flex-cell" align="left">{h}</th>)
			const rows = (this.state.results.length ? this.state.results : []).map(r => headerValues.map(h => r[h]))
			content = 	<FlexTable>
							<FlexHead>
					        	<FlexRow cells={headerValues} headCells={true}/>
					        </FlexHead>
					        <FlexBody rows={rows}/>
				      	</FlexTable>							
		return  <Paper>{content}</Paper>
	}
}

export default OutputView