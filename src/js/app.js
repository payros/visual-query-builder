import '../../node_modules/font-awesome/css/font-awesome.min.css'
import '../scss/styles.scss'
import 'typeface-roboto'
import React from 'react'
import ReactDOM from 'react-dom'
import InputView from './inputView'
import OutputView from './outputView'
import SchemaView from './schemaView'


class App extends React.Component {
    render(){ 
        return  <React.Fragment>
        			<main>
	        			<OutputView/>
	        			<InputView/>
        			</main>
        			<SchemaView/>
        		</React.Fragment>
    }
}

//Loads the app on the DOM
ReactDOM.render(<App/>, document.getElementById('app'));