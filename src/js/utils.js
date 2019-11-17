import '../scss/_ajax-loader.scss'
import React from 'react'

function node_walk(node, func) {
  var result = func(node);
  for(node = node.firstChild; result !== false && node; node = node.nextSibling)
    result = node_walk(node, func);
  return result;
};

export default  {
    objByIdx:(arr, val, prop) => {
        for (var i=0; i<arr.length;i++) {
            if(arr[i][prop] === val) return i
        }
        return -1
    },
    isEqualJSON:(a,b) => {
      return JSON.stringify(a) === JSON.stringify(b)
    },
    getTypeFromHeader:(headerStr, allColumns) => {
        const funcMatch = headerStr.match(/([a-zA-Z]+)\((.+)\)/)
        let headerObjs = []
        if(funcMatch && ['avg', 'sum', 'min', 'max', 'count'].indexOf(funcMatch[1].toLowerCase()) > -1) {
            headerObjs = allColumns.filter(c => c.name === funcMatch[2])
        } else if(funcMatch === null) {
            headerObjs = allColumns.filter(c => c.name === headerStr)
        }
        return headerObjs.length ? headerObjs[0].type : "string"
    },
    getStringFromHTML:(html) => {
        // if(html = "<p>Type SQL Query</p>") return "Type SQL Query"
        return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<')
    },
    // getCaretPosition: return [start, end] as offsets to elem.textContent that
    //   correspond to the selected portion of text
    //   (if start == end, caret is at given position and no text is selected)
    getCaretPosition:(elem) => {
      var sel = window.getSelection();
      var cum_length = [0, 0];

      if(sel.anchorNode == elem)
        cum_length = [sel.anchorOffset, sel.extentOffset];
      else {
        var nodes_to_find = [sel.anchorNode, sel.extentNode];
        if(!elem.contains(sel.anchorNode) || !elem.contains(sel.extentNode))
          return undefined;
        else {
          var found = [0,0];
          var i;
          node_walk(elem, function(node) {
            for(i = 0; i < 2; i++) {
              if(node == nodes_to_find[i]) {
                found[i] = true;
                if(found[i == 0 ? 1 : 0])
                  return false; // all done
              }
            }

            if(node.textContent && !node.firstChild) {
              for(i = 0; i < 2; i++) {
                if(!found[i])
                  cum_length[i] += node.textContent.length;
              }
            }
          });
          cum_length[0] += sel.anchorOffset;
          cum_length[1] += sel.extentOffset;
        }
      }
      if(cum_length[0] <= cum_length[1])
        return cum_length;
      return [cum_length[1], cum_length[0]];
    },
    //Filter an array by a value matching certain properties
    filterByProps:(arr, val, props) => arr.filter(o => props.reduce((bool,prop) => bool = bool || (o[prop] && o[prop].toLowerCase().indexOf(val.toLowerCase()) > -1), false)),
    AjaxLoader:() => <div className="lds-css"><div className="lds-ellipsis"><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div></div></div>,
}
