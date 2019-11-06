import schemaStore from './schemaStore'

let astUtils = {}

//Get all columns in a select query ast tree without the table. prefix
astUtils.getColumns = function(tree, columnList){
    //This will get you a list of all literal columns
    columnList = tree.value.selectItems.value.reduce((arr, curr) => {
      if(curr.type === "Identifier"){
        let vals = curr.value.split(".")
        //arr.push(vals[vals.length-1])
        //Use this instead to preserve the prefix to check for start
        arr.push(curr.value)
      } 
      return arr
    }, columnList)
    //console.log("cols = ",columnList)
    //TO Expand * into the literal column names
    //Check for * and table.* and expand
    //Return a list of all expanded columns without the prefix
    return columnList
}

//Recursively get all tables and alias in a select query ast tree
astUtils.getTables = function(tree, tableList){
    console.log("this is the tree", tree)
    return recurse(tree.value, tableList)

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

astUtils.isColInStar = function(tree, column) {
    // if column is from same table that is in FROM, and * or <table>.* is present then return true
    let currColumns = astUtils.getColumns(tree, [])

    let currTables = astUtils.getTables(tree, [])
    let schema = schemaStore.getSchema()
    var i;
    for(i = 0; i < currTables.length; i++) {
        //if col is in table's schema and table.* or * is present then return true
        if(schema[currTables[i]].indexOf(column) !== -1 &&
        ( (currColumns.indexOf(currTables[i] + ".*") !== -1) || (currColumns.indexOf("*") !== -1) ) ) {
            return true
        }
    }
    return false
}

astUtils.addSelectColumn = function(tree, column) {
    let newTree = Object.assign({}, tree)
    if(!astUtils.isColInStar(tree, column)) {
        newTree.value.selectItems.value.push({type:"Identifier", value:column, alias:null, hasAs:null})
    }
    //TODO * Optimization
    //Get all columns
    //Get all tables
    //Get the schema
    //Check each table against all columns to see if it's complete
    //Replace single table columns with table.*
    //Potentially replace all table.* with a single *
    //console.log("schema =",schemaStore.getSchema())

    return newTree
}

//TO DO - Removes the column from the select clause.
//Additionally it removes any table or tables that no longer have any columns on select by calling removeTable
astUtils.removeSelectColumn = function(tree, column) {}

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
astUtils.removeNaturalJoinTable = function(tree, table) {}

//adds AND ${column} ${operator} ${val} to end of WHERE clause
/**
examples:
astUtils.where(tree, "actual_time", ">=", 178) //adds actual_time>=178 to end of where
astUtils.where(tree, "dest_city", "=", "'denver'") note how the string needs to include '' inside
astUtils.where(tree, "arrival_delay", "<", 31)
**/
astUtils.addWhereColumn = function(tree, column, operator, val) {
    let newTree = JSON.parse(JSON.stringify(tree))
    let node = newTree.value.where
    let valType = typeof val
    valType = val.chartAt(0).toUpperCase() + val.substring(1) //Uppercase first letter
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
        node = newNode
    //Append to the current where clause
    } else {
        let prev = null
        //keep recursing until current node has no operator
        //the one previous to it needs to be changed
        while(node.operator != null) {
            prev = node
            node = node.right
        }
        
        //deep copy of prev into prev.left
        prev.left = JSON.parse(JSON.stringify(prev))
        prev.right = newNode
        //the high level operator needs to be AND
        prev.operator = 'AND'
        prev.type = 'AndExpression'       
    }

    return newTree
}

//TO DO - Remove where clause (or clauses) that match a certain column
//Returns a new copy of the tree (it does not modify the original)
astUtils.removeWhereColumn = function(tree, column) {
    let newTree = JSON.parse(JSON.stringify(tree))
    let node = newTree.value.where
    //Loop through the tree and remove any matches to the column...
    return newTree
}
export default astUtils

