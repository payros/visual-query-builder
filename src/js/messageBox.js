import React from 'react'
import { CSSTransition } from 'react-transition-group'
import resultsStore from './resultsStore'
import queryStore from './queryStore'

class MessageBox extends React.Component {
  constructor() {
    super()
    this.state = { show:false, msgLog:"drop a column or type a query", msgClass:"info" }
  }

  getDerivedStateFromProps(nextProps, prevState) {
   return prevState.show != nextProps.show ? {
      show: nextProps.show,
    } : {};
  }

  componentDidMount(){
    resultsStore.on("results-loading", () => this.setMsg())
    resultsStore.on("results-fetched", () => this.setMsg())
    queryStore.on("query-parsed", () => this.setMsg())

    queryStore.on("parse-error", () => this.setMsg(queryStore.getErrorLog(), "warning"))
    resultsStore.on("results-error", () => this.setMsg(resultsStore.getErrorLog(), "error"))
  }


  setMsg(msgLog, msgClass) {
      let newState = {show:this.props.show}
      if(msgLog) {
        newState.msgLog = msgLog
        newState.msgClass = msgClass
      } else if(!this.props.animate) {
        newState.msgLog = "drop a column or type a query"
        newState.msgClass = "info"
      }
      this.setState(newState)
   }

  render(){
      if(this.props.animate){
        return <CSSTransition classNames="msg-box" in={this.state.show} timeout={1000}>
                  <div className={"msg " + this.state.msgClass}>{this.state.msgLog}</div>
               </CSSTransition>
      } else {
        return this.props.show && <div className={"msg " + this.state.msgClass}>{this.state.msgLog}</div>
      }
  }
}

export default MessageBox
