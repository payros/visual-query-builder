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
    // console.log(parser.parse("SELECT count(name) FROM carriers"))

    schemaStore.on("filtering-toggled", () => {
      const isFilteringChecked = schemaStore.getFiltering()
      //If filtering was unchecked, remove the where clause
      if(!isFilteringChecked && this.query !== null) {
        this.query.value.where = null;
        this.emit("query-updated");
      }
    })

    schemaStore.on("grouping-toggled", () => {
      if(this.query !== null) {
        const isGroupingChecked = schemaStore.getGrouping()
        if(isGroupingChecked) {
          this.query = ast.addAllGrouping(this.query)
        } else {
          this.query = ast.removeAllGrouping(this.query)
        }
        this.emit("query-updated");
      }

    })
  }

  addColumn(col) {
    const table = col.split(".")[0]
    const column = col.split(".")[1]

    if(!this.query){
      this.query = parser.parse("SELECT " + column + " FROM " + table)
    } else {
      const currTables = ast.getTables(this.query, [])
      const currColumns = ast.getColumns(this.query, [], false) //return all the column names (unwrapped)

      //Check if the column is already listed on the 'select' list (or is star)
      if(column === "*" || currColumns.indexOf(column) === -1) {
        this.query = ast.addSelectColumn(this.query, column, table)
      }

      //Check if the table is already on the 'from' list
      if(currTables.indexOf(table) === -1) {
        this.query = ast.addNaturalJoinTable(this.query, table)
      }
    }

    this.emit("query-updated");
  }

  removeColumn(colIdx) {
    this.query = ast.removeSelectColumn(this.query, colIdx)
    this.emit("query-updated");
  }

  filterColumn(column, operator, value) {
    this.query = ast.removeWhereColumn(this.query, column, operator)

    if(value.length) {
      value = operator === "like" ? "'" + value + "%'" : parseInt(value)
      this.query = ast.addWhereColumn(this.query, column, operator, value)
    }
    setTimeout(() => { this.emit("query-updated") })  // Avoids dispatcher invariant issues
  }

  groupColumn(colIdx, func){
    this.query = ast.addGroupByColumn(this.query, colIdx, func)
    console.log(this.query)
    this.emit("query-updated");
  }

  getGroupByColumn(column) {
    return ast.getGroupByColumn(column)
  }

  orderColumn(column, order, sort){
    //TO DO add ordering to the ast tree
  }

  getWhereForColumn(column) {
    const whereNode = ast.getWhereColumn(this.query, column)
    let operator = ""
    let value = ""

    if(whereNode !== null) {
      operator = whereNode.type == "LikePredicate" ? "like" : whereNode.operator
      value = whereNode.type == "LikePredicate" ? whereNode.right.value.match(/^'%?([^%]*)%?'$/)[1] : whereNode.right.value
    }
    
    return { operator, value }
  }

  parseQuery(queryStr){ //Assumes the query is valid or empty
    this.query = queryStr.length ? parser.parse(queryStr) : null
    console.log(this.query)
    this.emit("query-parsed");
  }

  getColumns(){
    return this.query ? ast.getColumns(this.query, [], true) : []
  }

  getQueryString() {
    console.log(this.query)
    return this.query ? parser.stringify(this.query).trim() : ""
  }

  getQueryHTML(str) {
    // console.log("string", str)
    let query = str || this.getQueryString() || ""
    let html = '<p>' + query + '</p>'
    html = html.replace(/(select) /i, '<span class="clause select">$1</span>&nbsp;')
    // html = query.replace(/(having|where)/ig, '<span class="where">$1</span>')
    // html = query.replace(/(group by)/i, '<span class="group-by">$1</span>')
    // html = query.replace(/(order by)/i, '<span class="order-by">$1</span>')
    // console.log("HTML", html)
    return html
  }

  handleActions(action) {
    switch(action.type) {
        case "COLUMN_DROP":
          this.addColumn(action.column)
          break

        case "COLUMN_REMOVE":
          this.removeColumn(action.colIdx)
          break

        case "UPDATE_QUERY":
          this.parseQuery(action.query)
          break

        case "FILTER_COLUMN":
          this.filterColumn(action.column, action.operator, action.value)
          break

        case "GROUP_COLUMN":
          this.groupColumn(action.column, action.func)
          break

        case "ORDER_COLUMN":
          this.orderColumn(action.column, action.order, action.sort)
          break
    }
  }
}

const queryStore = new QueryStore
dispatcher.register(queryStore.handleActions.bind(queryStore))

export default queryStore