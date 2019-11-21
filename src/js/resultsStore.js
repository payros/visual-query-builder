import axios from 'axios'
import { EventEmitter } from 'events'
import dispatcher from './dispatcher'

class ResultsStore extends EventEmitter {
  constructor() {
    super()
    this.showTable = false
    this.results = []
    this.errorLog = ""
  }

  setResults(results) {
    this.prevCount = this.results.length
    this.results = results
    setTimeout(() => { this.emit("results-fetched") }) // Avoids dispatcher invariant issues
  }

  setError(error) {
    this.errorLog = error.msg
    this.emit("results-error", error.pos-1)
  }

  getResults() {
    return this.results
  }

  getShowTable(){
    return this.showTable
  }

  setShowTable(showTable){
    this.showTable = showTable
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
                  this.setShowTable(true)
                  this.setResults(res.data)
                }
              }).catch(err => {
                this.setError(err.response.data)
              })
            } else {
              this.setShowTable(false)
              this.setResults([])
            }
            break
    }
  }

}

const resultsStore = new ResultsStore
dispatcher.register(resultsStore.handleActions.bind(resultsStore))

export default resultsStore
