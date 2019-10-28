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
    //Filter an array by a value matching certain properties
    filterByProps:(arr, val, props) => arr.filter(o => props.reduce((bool,prop) => bool = bool || (o[prop] && o[prop].toLowerCase().indexOf(val.toLowerCase()) > -1), false)),
    AjaxLoader:() => <div className="lds-css"><div className="lds-ellipsis"><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div><div><div></div></div></div></div>,
}