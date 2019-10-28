import '../scss/styles.scss'
import 'typeface-roboto'
import React from 'react'
import ReactDOM from 'react-dom'
import InputView from './inputView'
import OutputView from './outputView'


class App extends React.Component {
    render(){ 
        return  <React.Fragment>
        			<OutputView/>
        			<InputView/>
        		</React.Fragment>
    }
}

//Loads the app on the DOM
ReactDOM.render(<App/>, document.getElementById('app'));