import axios from 'axios'
import { EventEmitter } from 'events'
import dispatcher from './dispatcher'

class SchemaStore extends EventEmitter {
  constructor() {
    super()
    this.schema = {}
    this.filtering = false
    this.grouping = false
    this.ordering = false
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

  setGrouping(checked){
    this.grouping = checked
    this.emit("grouping-toggled")
  }

  getGrouping(){
    return this.grouping
  }

  setOrdering(checked){
    this.ordering = checked
    this.emit("ordering-toggled")
  }

  getOrdering(){
    return this.ordering
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
        break
      case "TOGGLE_GROUPING":
        this.setGrouping(action.checked)
        break
      case "TOGGLE_ORDERING":
        this.setOrdering(action.checked)
        break
    }
  }

}

const schemaStore = new SchemaStore
dispatcher.register(schemaStore.handleActions.bind(schemaStore))

export default schemaStore