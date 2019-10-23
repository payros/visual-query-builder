import React from 'react'
import resultsStore from './resultsStore'
import dispatcher from './dispatcher'
import { Table, TableBody, TableCell, TableHead, TableRow, Paper } from '@material-ui/core';

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

	  componentDidMount() {
	    const height = this.refs.paper.clientHeight;
	    this.setState({ tableHeight:height });
	  }

	render(){
			    console.log(this.state.tableHeight)
		const headerValues = (this.state.results.length ? Object.keys(this.state.results[0]) : [])
		const headers = headerValues.map(h => <TableCell align="left">{h}</TableCell>)
		const rows = (this.state.results.length ? this.state.results : []).map(r => <TableRow>{headerValues.map(h => { return <TableCell align="left">{r[h]}</TableCell> })}</TableRow>)
		return  <Paper ref="paper">
			      <Table>
			        <TableHead>
			          <TableRow>
			            {headers}
			          </TableRow>
			        </TableHead>
			        <TableBody>
			          {rows}
			        </TableBody>
			      </Table>
			    </Paper>
	}
}

export default OutputView