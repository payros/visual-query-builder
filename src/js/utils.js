import '../scss/_ajax-loader.scss'
import React from 'react'

function node_walk(node, func) {
  var result = func(node);
  for(node = node.firstChild; result !== false && node; node = node.nextSibling)
    result = node_walk(node, func);
  return result;
}

function createRange(node, chars, range) {
  if (!range) {
      range = document.createRange()
      range.selectNode(node);
      range.setStart(node, 0);
  }

  if (chars.count === 0) {
      range.setEnd(node, chars.count);
  } else if (node && chars.count >0) {
      if (node.nodeType === Node.TEXT_NODE) {
          if (node.textContent.length < chars.count) {
              chars.count -= node.textContent.length;
          } else {
              range.setEnd(node, chars.count);
              chars.count = 0;
          }
      } else {
         for (var lp = 0; lp < node.childNodes.length; lp++) {
              range = createRange(node.childNodes[lp], chars, range);

              if (chars.count === 0) {
                  break;
              }
          }
      }
  }

  return range;
}

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
    getTypeFromHeader:(headerStr, allColumns, isFiltering) => {
        const funcMatch = headerStr.match(/([a-zA-Z]+)\((.+)\)/)
        //The column is wrapped in an aggregator function
        if(funcMatch && ['avg', 'sum', 'min', 'max', 'count'].indexOf(funcMatch[1].toLowerCase()) > -1){
          // For filtering turn it into an integer
          if(isFiltering){
            return "integer"
          // For grouping, unwrap
          } else {
            headerStr = funcMatch[2]
          }
        }

        let headerObjs = allColumns.filter(c => c.name === headerStr)
        return headerObjs.length && headerObjs[0].type === "integer" ? "integer" : "string"
    },
    getStringFromHTML:(html) => {
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
    setCaretPosition:(elem, pos) => {
      if (pos >= 0) {
          let selection = window.getSelection();
          let range = createRange(elem.parentNode, { count: pos+1 });

          if (range) {
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
          }
      }
    },
    humanReadableOrdering:(col) => {
      if(col === null || isNaN(col)) return color
      if(col === 1) return "primary"
      if(col === 2) return "secondary"
      switch(col % 10){
        case 1:
          return col + (col === 11 ? "th" : "st")
        case 2:
          return col + (col === 12 ? "th" : "nd")
        case 3:
          return col + (col === 13 ? "th" : "rd")
        default:
          return col + "th"
      }
    },
    //Filter an array by a value matching certain properties
    filterByProps:(arr, val, props) => arr.filter(o => props.reduce((bool,prop) => bool = bool || (o[prop] && o[prop].toLowerCase().indexOf(val.toLowerCase()) > -1), false)),
    AjaxLoader:() => <div className="lds-css"><div className="lds-ellipsis"><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div></div></div>,
}
