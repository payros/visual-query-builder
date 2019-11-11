import axios from 'axios'
import { EventEmitter } from 'events'
import dispatcher from './dispatcher'

class ResultsStore extends EventEmitter {
  constructor() {
    super()
    this.results = []
    this.errorLog = ""
  }

  setResults(results) {
    this.results = results
    setTimeout(() => { this.emit("results-fetched") }) // Avoids dispatcher invariant issues
  }

  setError(errorLog) {
    this.errorLog = errorLog
    this.emit("results-error")
  }

  getResults() {
    return this.results
  }

  getErrorLog() {
    return this.errorLog
  }

  handleActions(action) {
    switch(action.type) {
        case "FETCH_RESULTS":
            this.emit("results-loading")
            if(action.query.length){
              axios.get('/query', {params: { q:action.query }}).then(res => {
                if(res.data){
                  this.setResults(res.data)
                }
              }).catch(err => {
                this.setError(err.response.data)
              })              
            } else {
              this.setResults([])
            }
            break
    }
  }

}

const resultsStore = new ResultsStore
dispatcher.register(resultsStore.handleActions.bind(resultsStore))

export default resultsStore