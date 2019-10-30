import axios from 'axios'
import { EventEmitter } from 'events'
import dispatcher from './dispatcher'
import schemaStore from './schemaStore'
import ast from './astUtils'
import parser from 'js-sql-parser'


class QueryStore extends EventEmitter {
  constructor() {
    super()
    this.query = null
    let tree = parser.parse('SELECT mid, fid FROM carriers NATURAL JOIN flights NATURAL JOIN months')

    const currColumns = tree.value.selectItems.value.reduce((arr, curr) => {
      if(curr.type === "Identifier"){
        let vals = curr.value.split(".")
        arr.push(vals[vals.length-1])
      } 
      return arr
    },[])

    console.log(tree)
    let currTables = ast.getTables(tree.value, [])
    // ast.value.selectItems.value.push({alias:null, hasAs:null, type:"Identifier", value:"origin_city"})
    console.log(currTables)
    console.log(parser.stringify(tree))
  }

  addColumn(col) {
    const table = col.split(".")[0]
    const column = col.split(".")[1]

    if(!this.query){
      this.query = parser.parse("SELECT " + column + " FROM " + table)
    } else {
      const currTables = ast.getTables(this.query, []).filter((el, i, self) => i === self.indexOf(el)) //Remove possible duplicates
      const currColumns = ast.getColumns(this.query, []).filter((el, i, self) => i === self.indexOf(el)) //Remove possible duplicates

      //Check if the column is already list on the 'select' list 
      if(currColumns.indexOf(column) === -1) {
        this.query = ast.addSelectColumn(this.query, column)
      }

      //Check if the table is already on the 'from' list
      if(currTables.indexOf(table) === -1) {
        console.log(ast.addNaturalJoinTable(this.query, table))
        this.query = ast.addNaturalJoinTable(this.query, table)
      }
    }

    this.emit("query-updated");
  }

  parseQuery(queryStr){ //Assumes the query is valid

  }

  getQueryString() {
    return this.query ? parser.stringify(this.query).trim() : ""
  }

  getQueryHTML() {
    return ""
  }

  handleActions(action) {
    switch(action.type) {
        case "COLUMN_DROP":
          console.log("column drop", action.column)
            this.addColumn(action.column)
            break
    }
  }
}

const queryStore = new QueryStore
dispatcher.register(queryStore.handleActions.bind(queryStore))

export default queryStore