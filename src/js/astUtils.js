import schemaStore from './schemaStore'
import utils from './utils'
import parser from 'js-sql-parser'

let astUtils = {}

/* #############   PRIVATE FUNCTIONS   ############# */


// table has the structure {name:'tableName', columns:['column1', 'column2', 'column3']}
function isTableRedundant(table, tableIndex, tables){
    //Table has more than one column, therefore it is not redundant
    if(table.columns.length > 1) return true
    //If table has a single column, check to see if it is on other tables
    const columnToCheck = table.columns[0]
    const otherTablesWithCol = tables.filter(t => t.name !== table.name && t.columns.indexOf(columnToCheck) > -1)
    // console.log("otherTables=",otherTablesWithCol)
    //if otherTablesWithCol is empty then then we need the current table so we must return true in order for filter to keep it
    return otherTablesWithCol.length == 0
}

// converts a function object {name:'funcName' params:['param1', 'param2']} to string 'funcName(param1,param2)'
function funcToString(funcObj){
    if(funcObj.type !== "FunctionCall") return ""
    const funcName = funcObj.name
    const funcParams = funcObj.params.reduce((str, p, i) => str += (p.value ? p.value : p) + (i+1 === funcObj.params.length ? "" : ",") ,"")
    return funcName + "(" + funcParams + ")"
}

//Compresses a list of columns into a starred version of the list
function colsToStar(oldColumns, tables){
    const schema = schemaStore.getSchema()
    let newColumns = oldColumns

    //First replace  all columns with table.*
    tables.forEach(table => {
        //Get only columns from the table that are NOT in the current column list
        const filteredColumns = schema[table].filter(c => oldColumns.indexOf(c.name) === -1)

        // If all columns from the table are in the list, the filteredList length is 0
        if(filteredColumns.length === 0) {
            //First filter out all the columns from this table
            newColumns = newColumns.filter(col => schema[table].map(c => c.name).indexOf(col) === -1)
            //TO DO Check if the table has an alias when optimizing with table.* and use the alias instead
            newColumns.unshift(table + ".*")
        }
    })

    //Now replace all table.* with a single *
    const starCols = newColumns.filter(c => c.indexOf(".*") > -1)
    if(starCols.length === newColumns.length) newColumns = ["*"]

    return newColumns
}

function mapColString(colStr){
    const funcMatch = colStr.match(/([a-zA-Z]+)\((.+)\)/)
    let colObj = { alias:null, hasAs:null }
    if(funcMatch){
        colObj.type = "FunctionCall"
        colObj.name = funcMatch[1]
        colObj.params = funcMatch[2].indexOf("*") > -1 ? [funcMatch[2]] : funcMatch[2].split(',').map(p => { return { type:"Identifier", value:p }})
    } else {
        colObj.type = "Identifier"
        colObj.value = colStr
    }
    return colObj
}

function getOperatorForColumn(colStr){
        let colType = null
        const funcMatch = colStr.match(/([a-zA-Z]+)\((.+)\)/)
        if(funcMatch && ['avg', 'sum', 'min', 'max', 'count'].indexOf(funcMatch[1].toLowerCase()) === -1) {
            colType = "string"
        } else if(funcMatch === null) {
            const schema = schemaStore.getSchema()
            const allColumns = Object.keys(schema).reduce((arr, table) => arr.concat(schema[table]), [])
            const headerObjs = allColumns.filter(c => c.name === colStr)
            colType = headerObjs.length ? headerObjs[0].type : "string"
        }
        return colType === "integer" ? "=" : "like"
}

function useHaving(colStr){
    const funcMatch = colStr.match(/([a-zA-Z]+)\((.+)\)/)
    return funcMatch && ['avg', 'sum', 'min', 'max', 'count'].indexOf(funcMatch[1].toLowerCase()) > -1
}

function unwrapAggregateColumn(colStr){
        const funcMatch = colStr.match(/([a-zA-Z]+)\((.+)\)/)
        if(funcMatch && ['avg', 'sum', 'min', 'max', 'count'].indexOf(funcMatch[1].toLowerCase()) > -1) {
            return funcMatch[2]
        }

        return colStr
}

//if there is a table with only one column, and this column appears on other tables as well,
//then remove that table with the one column
// table has the structure {name:'tableName', columns:['column1', 'column2', 'column3']}
function getReducedTables(tables) {
    var i
    let res = JSON.parse(JSON.stringify(tables))
    for(i = 0; i < res.length; i++) {
        if (res[i].columns.length > 1) {
            //if table has more than one column then it needs to stay
            continue;
        }
        var j
        for(j = 0; j < res.length; j++) {
            //if table j contains the only column in table i then table i is redundant
            if( i != j && (res[j].columns.map(t => t.name).indexOf(res[i].columns[0].name) != -1) ) {
                console.log("removing",res[i])
                res.splice(i,1)
            }
        }

    }
    return res
}
function getTablesFromCols(columns){
    const schema = schemaStore.getSchema()
    let tables = Object.keys(schema).reduce((tbls, tbl) => {
        //Get only columns from the table that ARE in the current column list
        const filteredColumns = schema[tbl].filter(c => columns.indexOf(c.name) > -1)
        //At least one column is in the list -- Add it
        if(filteredColumns.length) tbls.push({name:tbl, columns:filteredColumns})
        return tbls
    }, [])
    //Now check if the same column is on multiple tables. If so, check which table (if any) only contains that single column and remove it
    return (columns.length === 1 ? [tables[0].name] : getReducedTables(tables).map(t => t.name))
}

//returns a tree that only has newTables elements in it's FROM clause
function updateTables(tree,newTables) {
    let newTree = JSON.parse(JSON.stringify(tree))
    let queryStr = "SELECT * FROM"

    var i
    //add all talbes to query string
    for(i = 0; i < newTables.length; i++) {
        if(i == 0) {
            queryStr += " " + newTables[i]
        }
        else {
            queryStr += " NATURAL JOIN " + newTables[i]
        }

    }
    let tempTree = parser.parse(queryStr)
    //deep copy of tempTree's FROM to newTree's FROM
     newTree.value.from = JSON.parse(JSON.stringify(tempTree.value.from))
     return newTree
}






/* #############   PUBLIC FUNCTIONS   ############# */




/* ------- GET FUNCTIONS ------- */

//Get all columns in the select query tree with the table prefix and without being expanded
astUtils.getRawColumns = function(tree, columnList){
  if(tree === null) return columnList
  return tree.value.selectItems.value.reduce((arr, curr) => {
        if(curr.type === "Identifier"){
          arr.push(curr.value)
        } else if (curr.type === "FunctionCall") {
          arr = arr.concat(curr.params.filter(p => p.type === "Identifier").map(p => p.value))
        }
        return arr
  }, columnList)
}

//Get all columns in a select query ast tree without the table. prefix
astUtils.getColumns = function(tree, columnList, wrap){
    if(tree === null) return columnList
    const schema = schemaStore.getSchema()
    const currTables = astUtils.getTables(tree, [])
    //This will get you a list of all literal columns
    columnList = tree.value.selectItems.value.reduce((arr, curr) => {
      if(curr.type === "Identifier"){
        const vals = curr.value.split(".")
        //First check if column is *
        if(curr.value === "*"){
            //Add all the columns form currTables to the array
            arr = currTables.reduce((arr, tbl) => schema[tbl] ? arr.concat(schema[tbl].map(c => c.name)) : arr, arr)
        //Now check if it matches "table.*"
        } else if (curr.value.match(/[^\.]+\.\*$/) !== null){
            //Add the colmns from that table to the array
            if(schema[vals[0]]) arr = arr.concat(schema[vals[0]].map(c => c.name))
        } else {
            //Just add the single column
            arr.push(vals[vals.length-1])
        }
      } else if (curr.type === "FunctionCall") {
            if(wrap){
                arr.push(funcToString(curr))
            } else {
                //Push each param individually (if it is a column a.k.a 'Identifier')
                arr = arr.concat(curr.params.filter(p => p.type === "Identifier").map(p => p.value))
            }
      }
      return arr
    }, columnList)

    //Return a list of all expanded columns without the prefix
    return columnList.filter((el, i, self) => i === self.indexOf(el)) //Remove possible duplicates
}

//Recursively get all tables and alias in a select query ast tree
astUtils.getTables = function(tree, tableList){
    if(tree === null) return tableList
    return recurse(tree.value, tableList).filter((el, i, self) => i === self.indexOf(el)) //Remove possible duplicates

    function recurse(node, tableList){
        if(!node) return tableList
        const nodeType = node.type.substring(node.type.length-9) === "JoinTable" ? "JoinTable" : node.type
        switch(nodeType){
          case 'TableReference':
          case 'TableFactor':
          case 'SubQuery':
            return recurse(node.value, tableList)
          case 'Select':
            return recurse(node.from, tableList)
          case 'TableReferences':
            return node.value.reduce((list, tr) => recurse(tr, tableList), tableList)
          case 'JoinTable':
            return tableList.concat(recurse(node.left,[])).concat(recurse(node.right,[]))
          case 'Identifier':
            tableList.push(node.value)
          default:
            return tableList
        }
    }
}




/* ------- GROUP BY FUNCTIONS ------- */

// Adds (or removes if func === "") a function from the selected column index  and adds (or removes if func !== "") the column in the the groupBy clause
astUtils.addGroupByColumn = function(tree, colIdx, func){
    let newTree = JSON.parse(JSON.stringify(tree))
    let columns = astUtils.getColumns(newTree, [], true)

    // We're adding an aggregate function
    if(func.length) {
        const colName = unwrapAggregateColumn(columns[colIdx])
        columns[colIdx] = func + "(" + colName + ")"

        // Remove the column from the group by array
        if(newTree.value.groupBy !== null) {
            newTree.value.groupBy.value = newTree.value.groupBy.value.filter(item => item.value.value !== colName)
        }

    // We're removing an aggregate function
    } else {
        const funcMatch = columns[colIdx].match(/([a-zA-Z]+)\((.+)\)/)
        columns[colIdx] = funcMatch[2]

        // Add the column from the group by array
        if(newTree.value.groupBy === null) {
            newTree.value.groupBy = {rollUp:null, type:"GroupBy", value:[]}
        }
        newTree.value.groupBy.value.push({sortOpt:null, type:"GroupByOrderByItem", value:{type: "Identifier", value: funcMatch[2]}})
    }

    //Finally add the new select columns to the tree
    newTree.value.selectItems.value = columns.map(mapColString)

    return newTree
}

//Unwraps the column or removes it from the "group by" list (used when a column is removed from the table)
astUtils.removeGroupByColumn = function(tree, col){
    let newTree = JSON.parse(JSON.stringify(tree))
    let newColumns = astUtils.getColumns(newTree, [], true).map(c => c === col ? unwrapAggregateColumn(col) : c)

    if(newTree.value.groupBy !== null) {
        newTree.value.groupBy.value = newTree.value.groupBy.value.filter(v => v.value.value !== col)
        if(newTree.value.groupBy.value.length === 0) newTree.value.groupBy = null
    }

    //Finally add the new select columns to the tree
    newTree.value.selectItems.value = newColumns.map(mapColString)

    return newTree
}

// Returns a new tree with all select columns in the groupBy clause, unless they are wrapped
astUtils.addAllGrouping = function(tree){
    let newTree = JSON.parse(JSON.stringify(tree))
    let columns = astUtils.getColumns(newTree, [], true)

    // Add the column from the group by array
    if(newTree.value.groupBy === null) {
        newTree.value.groupBy = {rollUp:null, type:"GroupBy", value:[]}
    }

    let groupedColumns =  newTree.value.groupBy.value.map(c => c.value.value)

    //Loop through each column and add them to the group if they aren't there already
    columns.forEach(column => {
        const funcMatch = column.match(/([a-zA-Z]+)\((.+)\)/)
        //Check if the column already belongs in the group or is an aggregate
        if(groupedColumns.indexOf(column) === -1 && (!funcMatch || ['avg', 'sum', 'min', 'max', 'count'].indexOf(funcMatch[1].toLowerCase()) === -1)) {
            //Add it to the group clause
            newTree.value.groupBy.value.push({sortOpt:null, type:"GroupByOrderByItem", value:{type: "Identifier", value: column}})
        }
    })

    return newTree
}

// Returns a new tree with all select columns "unwrapped" and with groupBy === null
astUtils.removeAllGrouping = function(tree){
    let newTree = JSON.parse(JSON.stringify(tree))

    //First, unwrap every column in the list columns
    let newColumns = astUtils.getColumns(newTree, [], true).map(unwrapAggregateColumn)

    //Then, Add the unwrapped columns to the newTree
    newTree.value.selectItems.value = newColumns.map(mapColString)

    //Finally, set groupBy to null
    newTree.value.groupBy = null

    //Finally, set having to null
    newTree.value.having = null

    return newTree
}


// Gets the function value for a column or returns "" if column is unwrapped - used to preset the values of the forms
astUtils.getGroupByColumn = function(col){
    const funcMatch = col.match(/([a-zA-Z]+)\((.+)\)/)
    return funcMatch && ['avg', 'sum', 'min', 'max', 'count'].indexOf(funcMatch[1].toLowerCase()) > -1 ? funcMatch[1].toUpperCase() : ""
}


/* ------- FROM FUNCTIONS ------- */


//Recursively add table via natural join to the tree
astUtils.addNaturalJoinTable = function(tree, table) {
    let newTree = JSON.parse(JSON.stringify(tree))
    newTree.value = recurse(newTree.value)
    return newTree

    function recurse(node){
        if(!node) return node
        const nodeType = node.type.substring(node.type.length-9) === "JoinTable" ? "JoinTable" : node.type
        switch(nodeType){
          case 'TableReference':
          case 'SubQuery':
            node.value = recurse(node.value)
            break
          case 'Select':
            node.from = recurse(node.from)
            break
          case 'TableReferences':
            node.value[0] = recurse(node.value[0])
            break
          case 'JoinTable':
            node.left = recurse(node.left)
            break
          case 'TableFactor':
            let leftChild = JSON.parse(JSON.stringify(node))
            let rightChild = { alias:null, hasAs:null, indexHintOpt:null, partition:null, type:"TableFactor", value:{type: "Identifier", value: table} }
            node = {
                type:"NaturalJoinTable",
                left:leftChild,
                right:rightChild,
                leftRight:null,
                outOpt:null
            }
            break
        }
        return node
    }
}

//Recursively removes table from tree
//implementation built on remove Where -- TO DO Turn this into a general RemoveTable
astUtils.removeNaturalJoinTable = function(tree, table) {
    let newTree = JSON.parse(JSON.stringify(tree))

    newTree.value.from.value[0].value = recurse(newTree.value.from.value[0].value)
    return newTree

    function recurse(node){
        if(!node) return node
        const nodeType = node.type

        switch(nodeType){
            case 'NaturalJoinTable':
                if( node.left.type === "TableFactor" && node.left.value.value === table) {
                    node = node.right
                } else if(node.right.type === "TableFactor" && node.right.value.value === table){
                    node = node.left
                } else {
                    node.left = recurse(node.left)
                    node.right = recurse(node.right)
                }
                break
        }
        return node
    }

}




/* ------- WHERE FUNCTIONS ------- */

//adds AND ${column} ${operator} ${val} to end of WHERE clause
/**
examples:
astUtils.where(tree, "actual_time", ">=", 178) //adds actual_time>=178 to end of where
astUtils.where(tree, "dest_city", "=", "'denver'") note how the string needs to include '' inside
astUtils.where(tree, "arrival_delay", "<", 31)
**/
astUtils.addWhereColumn = function(tree, column, operator, val) {
    let newTree = JSON.parse(JSON.stringify(tree))
    const clause = useHaving(column) ? 'having': 'where'
    let node = newTree.value[clause]
    let valType = typeof val
    valType = valType.charAt(0).toUpperCase() + valType.substring(1) //Uppercase first letter
    let nodeType = operator.toUpperCase() === "LIKE" ? "LikePredicate" : "ComparisonBooleanPrimary"
    let newNode =  {
        left:{type: "Identifier", value: column},
        right:{type: valType, value: val},
        type:nodeType
    }
    //We only need the operator if it's not 'like'
    if(operator.toUpperCase() !== "LIKE") newNode.operator = operator

    //Node is null only if where is empty
    if(node == null) {
        newTree.value[clause] = newNode
    //Append to the current where clause
    } else {
        let prev = null
        //keep recursing until the left leaf of the current node is an identifier (we reached the bottom of the tree)
        //the one previous to it needs to be changed
        do {
            prev = node
            node = node.right
        } while(node.left && node.left.type == "Identifier")

        //deep copy of prev into prev.left
        prev.left = JSON.parse(JSON.stringify(prev))
        prev.right = newNode
        //the high level operator needs to be AND
        prev.operator = 'AND'
        prev.type = 'AndExpression'
    }


    return newTree
}

//Remove where clause (or clauses) that match a certain column
//Returns a new copy of the tree (it does not modify the original)
astUtils.removeWhereColumn = function(tree, column, operator) {
    const targetType = operator.toUpperCase() === "LIKE" ? "LikePredicate" : "ComparisonBooleanPrimary"
    const clause = useHaving(column) ? 'having': 'where'
    let newTree = JSON.parse(JSON.stringify(tree))
    newTree.value[clause] = recurse(newTree.value[clause])
    return newTree

    function recurse(node){
        if(!node) return node
        const nodeType = node.type
        switch(nodeType){
            case 'AndExpression':
            case 'OrExpression':
                if(node.left.type === targetType && (node.left.left.value === column || funcToString(node.left.left) == column)) {
                    node = node.right
                } else if(node.right.type === targetType && (node.right.left.value === column || funcToString(node.right.left) == column)){
                    node = node.left
                } else {
                    node.left = recurse(node.left)
                    node.right = recurse(node.right)
                }
                break
            default:
                node = node.type === targetType && (node.left.value === column || funcToString(node.left) == column) ? null : node
        }
        return node
    }
}


astUtils.getWhereColumn = function(tree, column, colType) {
    if(tree === null) return null
    const clause = useHaving(column) ? 'having': 'where'
    const targetType = colType !== "integer" ? "LikePredicate" : "ComparisonBooleanPrimary"
    return recurse(tree.value[clause])

    function recurse(node){
        if(!node) return null
        const nodeType = node.type
        switch(nodeType){
          case 'AndExpression':
          case 'OrExpression':
            return recurse(node.left) || recurse(node.right)
          default:
            if(nodeType === targetType &&
              (node.left && node.left.type === "Identifier" && node.left.value == column ||
               node.left && node.left.type === "FunctionCall" && funcToString(node.left) == column)) {
                return node
            } else {
                return null
            }
        }
    }
}



/* ------- ORDER BY FUNCTIONS ------- */




/* ------- SELECT FUNCTIONS ------- */


astUtils.addSelectColumn = function(tree, column, table) {
    let newTree = Object.assign({}, tree)
    if(column === "*") column = table + "." + column

    //Push the new column into the tree
    newTree.value.selectItems.value.push({type:"Identifier", value:column, alias:null, hasAs:null})

    //Get current state
    const currColumns = astUtils.getColumns(newTree, [], true) //Wrap function. We need to diferentiate between functions and regular columns
    const currTables = astUtils.getTables(newTree, [table]) //Include the table of the column you're adding

    // const colsList = currColumns.filter(c => !c.match(/[a-zA-Z]+\(.+\)/))
    // const funcList = currColumns.filter(c => c.match(/[a-zA-Z]+\(.+\)/))

    //Convert to * optimized column list
    let newColumns = colsToStar(currColumns, currTables)

    //Finally, add all columns back on the new ast tree
    newTree.value.selectItems.value = newColumns.map(mapColString)

    //Now add grouping if necessary
    if(schemaStore.getGrouping()) newTree = astUtils.addAllGrouping(newTree)

    return newTree
}

//Additionally it removes any table or tables that no longer have any columns on select by calling removeTable
astUtils.removeSelectColumn = function(tree, columnIdx) {
    let newTree = JSON.parse(JSON.stringify(tree))

    //Get the current columns -- including function calls
    let columns = astUtils.getColumns(newTree, [], true)
    //Get the name of the column being removed
    const colName = columns[columnIdx]
    //Get current state and remove the column
    columns = columns.filter((c,i) => i !== columnIdx) //Includes wrapped function calls

    //If the last column was removed, return null
    if(!columns.length) return null

    //Check if there are no columns from a particular table
    const newTables = getTablesFromCols(columns)
    //const newTables = ["weekdays","carriers"]  // for testing purposes as getTablesFromCols isn't working
    const currTables = astUtils.getTables(newTree, [])
    currTables.forEach(table => {
        if(newTables.indexOf(table) === -1) {
            newTree = astUtils.removeNaturalJoinTable(newTree, table)
            //remove all tables from tree
        }
    })


    //Remove where clause for that column
    newTree = astUtils.removeWhereColumn(newTree, colName, getOperatorForColumn(colName))

    //TO DO Remove grouping for the column
    newTree = astUtils.removeGroupByColumn(newTree, colName)

    //TO DO Remove ordering for that colum

    //Convert to * optimized column list
    let newColumns = colsToStar(columns, newTables)

    //Add columns to the tree
    newTree.value.selectItems.value = newColumns.map(mapColString)

    return newTree
}

export default astUtils
