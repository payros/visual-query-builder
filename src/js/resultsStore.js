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
    this.emit("results-fetched")
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
            axios.get('/query', {params: { q:action.query }}).then(res => {
              if(res.data){
                this.setResults(res.data)
              }
            }).catch(err => {
              this.setError(err.response.data)
            })
            break
    }
  }

}

const resultsStore = new ResultsStore
dispatcher.register(resultsStore.handleActions.bind(resultsStore))

export default resultsStore