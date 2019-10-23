import axios from 'axios'
import { EventEmitter } from 'events'
import dispatcher from './dispatcher'

class ResultsStore extends EventEmitter {
  constructor() {
    super()
    this.results = []
  }

  setResults(results) {
    this.results = results
    this.emit("new-results")
  }

  getResults() {
    return this.results
  }

  handleActions(action) {
    switch(action.type) {
        case "FETCH_RESULTS":
            axios.get('/query', {params: { q:action.query }}).then(res => {
                if(res.data) this.setResults(res.data)
            })
            break
    }
  }

}

const resultsStore = new ResultsStore
dispatcher.register(resultsStore.handleActions.bind(resultsStore))

export default resultsStore