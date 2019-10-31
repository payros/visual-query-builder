export default  {
    //Get all columns in a select query ast tree without the table. prefix
    getColumns:(tree, columnList) => {
        //This will get you a list of all literal columns
        columnList = tree.value.selectItems.value.reduce((arr, curr) => {
          if(curr.type === "Identifier"){
            let vals = curr.value.split(".")
            arr.push(vals[vals.length-1])
            //Use this instead to preserve the prefix to check for start
            // arr.push(curr.value)
          } 
          return arr
        }, columnList)
        //TO Expand * into the literal column names
        //Check for * and table.* and expand
        //Return a list of all expanded columns without the prefix
        return columnList
    },
    //Recursively get all tables and alias in a select query ast tree
    getTables:(tree, tableList) => {
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
    },
    addSelectColumn:(tree, column) => {
        let newTree = Object.assign({}, tree)
        newTree.value.selectItems.value.push({type:"Identifier", value:column, alias:null, hasAs:null})
        //TODO * Optimization
        //Get all columns
        //Get all tables
        //Get the schema
        //Check each table against all columns to see if it's complete
        //Replace single table columns with table.*
        //Potentially replace all table.* with a single *
        return newTree
    },
    //Recursively add table via natural join to the tree
    addNaturalJoinTable:(tree, table) => {
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
    },
    where:(column, operator, value) => {

        
    }

}