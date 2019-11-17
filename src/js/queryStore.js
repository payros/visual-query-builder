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

  parseQuery(queryStr){
    try {
      this.query = queryStr.length ? parser.parse(queryStr) : null
      console.log(this.query)
      this.emit("query-parsed");
    } catch(error){
      console.error("PARSE ERROR");
    }
  }

  getColumns(){
    return this.query ? ast.getColumns(this.query, [], true) : []
  }

  getQueryString() {
    console.log(this.query)
    return this.query ? parser.stringify(this.query).trim() : ""
  }

  getQueryHTML(str) {
    let selectKeyword, selectClause, fromKeyword, fromClause
    let optionalClauses = [{},{},{},{}]
    let query = typeof str === "undefined" ?  this.getQueryString() : str
    // console.log("INPUT STRING:", query)

    //Escape any spaces
    let escapedQuery = query.replace(/\s/g, '&nbsp;')

    // I should get an automatic A just for coming up with this RegEx...
    const queryMatch = escapedQuery.match(/(select)(.*?)(from)(?:(.*?)(where|group(?:&nbsp;)+by|order(?:&nbsp;)+by)|(.*))(?:(.*?)(group(?:&nbsp;)+by|having|order(?:&nbsp;)+by)|(.*))(?:(.*?)(having|order(?:&nbsp;)+by)|(.*))(?:(.*?)(order(?:&nbsp;)+by)|(.*))(.*)/i);
    console.log("queryMatch", queryMatch);

    if(queryMatch === null) return '<p>' + escapedQuery + '</p>' // No matches... this is not a valid sql query, so just return it

    //First let's color the keywords
    selectKeyword =  queryMatch[1] ? '<span class="clause select">SELECT</span>' : '';
    selectClause = queryMatch[2] ? queryMatch[2] : '';
    fromKeyword =  queryMatch[3] ? '<span class="clause select">FROM</span>' : '';
    fromClause =  queryMatch[6] ? queryMatch[6] : queryMatch[4] ? queryMatch[4] : '';

    optionalClauses.forEach((optional, i) => {
      let offset = i*3
      optional.class = queryMatch[5+offset] ? queryMatch[5+offset].toLowerCase().replace(/(&nbsp;)+/g, '-') : '';
      optional.keyword =  queryMatch[5+offset] ? '<span class="clause ' + optional.class + '">' + queryMatch[5+offset].replace(/(&nbsp;)+/g, ' ').toUpperCase() + '</span>' : '';
      optional.clause =  queryMatch[9+offset] ? queryMatch[9+offset] : queryMatch[7+offset] ? queryMatch[7+offset] : '';
    })

    // Now let's try to color the columns
    try {
        const queryTree = parser.parse(query)
        //First parse the query and get the raw columns
        let currColumns = ast.getRawColumns(queryTree, [])
        // Now join regular columns with expanded columns
        currColumns = ast.getColumns(queryTree, currColumns, true)
        //Finally, turn it into a string that can be used in the regex
        currColumns = currColumns.reduce((str, c) => str + "|" + c,  "").substring(1).replace('*', '\\*')

        console.log('currColumns', currColumns)

        let colRegex = new RegExp('(' + currColumns + ')', 'gi')
        selectClause = selectClause.replace(colRegex, '<span class="column select">$1</span>');
        optionalClauses.forEach((optional, i) => {
          optional.clause = optional.clause.replace(colRegex, '<span class="column ' + optional.class + '">$1</span>');
        })

    } catch(error) {
      console.error("PARSE ERROR", error)
    }

    //Finally, let's color the aggregate functions
    let funcRegex = /(count|min|max|avg|sum)(\(.*?\))(&nbsp;|,)/gi

    selectClause = selectClause.replace(funcRegex, ($0, $1, $2, $3) => '<span class="function group-by">' + $1.toUpperCase() + $2 + '</span>' + $3);
    optionalClauses.forEach((optional, i) => {
      optional.clause = optional.clause.replace(funcRegex, ($0, $1, $2, $3) => '<span class="function group-by">' + $1.toUpperCase() + $2 + '</span>' + $3);
    })
    // console.log("optClauses", optionalClauses, optionalClauses.reduce((str, opt) => str + opt.keyword + opt.clause,''))
    let html = '<p>' + selectKeyword + selectClause + fromKeyword + fromClause + optionalClauses.reduce((str, opt) => str + opt.keyword + opt.clause,'') + '</p>'
    // console.log("OUTPUT HTML:", html)
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
