import axios from 'axios'
import { EventEmitter } from 'events'
import dispatcher from './dispatcher'

class SchemaStore extends EventEmitter {
  constructor() {
    super()
    this.schema = {}
    this.filtering = false
    this.errorLog = ""
  }

  setSchema(schema) {
    this.schema = schema
    this.emit("schema-fetched")
  }

  setError(errorLog) {
    this.errorLog = errorLog
    this.emit("schema-error")
  }

  getSchema() {
    return this.schema
  }

  getErrorLog() {
    return this.errorLog
  }

  setFiltering(checked){
    this.filtering = checked
    this.emit("filtering-toggled")
  }

  getFiltering(){
    return this.filtering
  }

  handleActions(action) {
    switch(action.type) {
        case "FETCH_SCHEMA":
            this.emit("schema-loading")
            axios.get('/get-schema').then(res => {
              if(res.data){
                this.setSchema(res.data)
              }
            }).catch(err => {
              this.setError(err.response.data)
            })
            break
        case "TOGGLE_FILTERING":
          this.setFiltering(action.checked)
    }
  }

}

const schemaStore = new SchemaStore
dispatcher.register(schemaStore.handleActions.bind(schemaStore))

export default schemaStore