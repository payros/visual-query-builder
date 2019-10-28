import '../scss/_flex-table.scss'
import React from 'react'

///***/// REUSABLE REACT CLASS IMPLEMENTING RESPONSIVE TABLE WITH FIXED HEADERS ///***///

class FlexTable extends React.Component {
	constructor() {
	    super()
	    this.state = {width:0}
	    this.children = []
	}

	componentWillMount(){
		window.addEventListener("resize", () => this.handleResize());
	}

	componentDidMount(){
		this.handleResize()
	}

	handleResize(){
		//Check if any of the child refs are null
		if(!this.children.reduce((n,c) => n || c === null  , false)){
			//Set Head and Body Width
			const tableWidth = this.refs.table.clientWidth
			this.children.forEach(c => {c.setWidth(tableWidth)})

			//Give a bit of time for the head cells to adjust so we can get the correct head width
			setTimeout(() => {
				//Set Body Height
				const headerHeight = this.children[0].getRef().clientHeight
				const tableHeight = this.refs.table.clientHeight
				this.children[1].setHeight(tableHeight - headerHeight)	
			})
		}

	}

	render(){
		return 	<table ref="table" className="flex-table">
					{ this.props.children.map((child, i) => React.cloneElement(React.Children.only(child), { ref: el => this.children[i] = el }) ) }
				</table>
	}
}


class FlexHead extends React.Component {
	constructor() {
	    super()
	    this.state = {width:0}
	}

	getRef(){
	     return this.refs.thead;
	} 

	setWidth(newWidth){
		this.setState({ width:newWidth })
	} 

	render(){
		let rows;
		if(this.props.rows && this.props.rows.length) { // Content defined via props
			rows = this.props.rows.map(r => <FlexRow cells={r} headCells={true} tableWidth={this.state.width}/>)
		} else if(this.props.children && this.props.children.length) { // Multiple children
			rows = this.props.children.map(child => React.cloneElement(React.Children.only(child), { tableWidth:this.state.width }));
		} else if(this.props.children){ // One Child
			rows = React.cloneElement(React.Children.only(this.props.children), { tableWidth:this.state.width });
		}
		return 	<thead ref="thead" className="flex-head">{rows}</thead>
	}
}

class FlexBody extends React.Component {
	constructor() {
	    super()
	    this.state = {width:0, height:0}
	}

	getRef(){
	     return this.refs.tbody;
	}

	setWidth(newWidth){
		this.setState({ width:newWidth })
	} 

	setHeight(newHeight){
		this.setState({ height:newHeight })
	} 

	render(){
		let rows;
		if(this.props.rows && this.props.rows.length) {  // Content defined via props
			rows = this.props.rows.map(r => <FlexRow cells={r} tableWidth={this.state.width} headCells={false}/>)
		} else if(this.props.children && this.props.children.length) { // Multiple children
			rows = this.props.children.map(child => React.cloneElement(React.Children.only(child), { tableWidth:this.state.width }));
		} else if(this.props.children){ // One Child
			rows = React.cloneElement(React.Children.only(this.props.children), { tableWidth:this.state.width });
		}
		return 	<tbody ref="tbody" className="flex-body" style={{height:this.state.height}}>{rows}</tbody>
	}
}

class FlexRow extends React.Component {
	render(){
		let cells;
		let fontSize = this.props.cells.length > 10 ? "sm-font" : 
					   this.props.cells.length > 2 ? "md-font" : "lg-font"
		if(this.props.cells && this.props.cells.length){  // Content defined via props
			cells = this.props.cells.map(c => <FlexCell width={this.props.tableWidth/this.props.cells.length} headCell={this.props.headCells}>{c}</FlexCell>)
		} else if(this.props.children && this.props.children.length) { // Multiple children
			const cellWidth = this.props.tableWidth/this.props.children.length;
			cells = this.props.children.map(child => React.cloneElement(React.Children.only(child), { width:cellWidth }));
		} else if(this.props.children){ // One Child
			cells = React.cloneElement(React.Children.only(this.props.children), { width:this.props.tableWidth });
		}
		return 	<tr className={"flex-row " + fontSize}>{cells}</tr>
	}
}

class FlexCell extends React.Component {
	render(){
		return 	this.props.headCell ? <th className="flex-cell" style={{ width:this.props.width }}>{this.props.children}</th> : 
									  <td className="flex-cell" style={{ width:this.props.width }}>{this.props.children}</td>
	}
}



export { FlexTable, FlexHead, FlexBody, FlexRow, FlexCell }