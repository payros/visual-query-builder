import '../scss/_ajax-loader.scss'
import React from 'react'

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
    //Filter an array by a value matching certain properties
    filterByProps:(arr, val, props) => arr.filter(o => props.reduce((bool,prop) => bool = bool || (o[prop] && o[prop].toLowerCase().indexOf(val.toLowerCase()) > -1), false)),
    AjaxLoader:() => <div className="lds-css"><div className="lds-ellipsis"><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div></div></div>,
}
