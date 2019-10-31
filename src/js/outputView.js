import React from 'react'
import { Paper } from '@material-ui/core';
import resultsStore from './resultsStore'
import queryStore from './queryStore'
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
    	this.state = {results:[], loading:false, error:false, errorLog:"", dragging:false}
  	}

	componentWillMount(){
		//Allows this component to listen to events
        dispatcher.register(this.handleEvents.bind(this))

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

	render(){
		let content;
		if(this.state.loading){
			content = <Utils.AjaxLoader/>
		} else if(this.state.error) {
			content = <p id="error-msg">{this.state.errorLog}</p>
		} else {
			const headerValues = (this.state.results.length ? Object.keys(this.state.results[0]) : [])
			const rows = (this.state.results.length ? this.state.results : []).map(r => headerValues.map(h => r[h]))
			content = 	<FlexTable>
							<FlexHead>
					        	<FlexRow cells={headerValues} headCells={true}/>
					        </FlexHead>
					        <FlexBody rows={rows}/>
				      	</FlexTable>							
		}
		return  <Paper>
					{this.state.dragging && <div className="drop-curtain" onDragOver={this.handleDragOver} onDrop={(ev) => this.handleDrop(ev)}><p>Drop to Add Column to Query</p></div>}
					{content}
				</Paper>
	}
}

export default OutputView