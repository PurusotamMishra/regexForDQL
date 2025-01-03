const _ = require("lodash");
const { pipes, aggregateFunctions, allFunctions, nonAggregateFunctions, booleanFunctions } = require('./consts')

const monaco = {
  "MarkerSeverity": {
    "Error": 8,
    "Warning": 4
  }
}


const validateBrackets = model => {
  const value = model
  const stack = []
  const markers = []
  let quotes = {
    "'": false,
    '"': false,
  }
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "'") {
      quotes["'"] = !quotes["'"]
    } else if (value[i] === '"') {
      quotes['"'] = !quotes['"']
    }

    if (!quotes["'"] && !quotes['"']) {
      if (value[i] === '(') {
        stack.push(i)
      } else if (value[i] === ')') {
        if (stack.length === 0) {
          markers.push({
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: i,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: _.isArrayLike + 1,
            message: 'Unmatched closing bracket',
            severity: monaco.MarkerSeverity.Error,
          })
        } else {
          stack.pop()
        }
      }
    }
  }

  if (stack.length > 0) {
    stack.forEach(startIndex => {
      markers.push({
        // startLineNumber: model.getPositionAt(startIndex).lineNumber,
        startColumn: startIndex,
        // endLineNumber: model.getPositionAt(startIndex).lineNumber,
        endColumn: startIndex + 1,
        message: 'Unmatched opening bracket',
        severity: monaco.MarkerSeverity.Warning,
      })
    })
  }
  return markers
  // monaco.editor.setModelMarkers(model, 'invalidBrackets', markers)
}

const sourcenameValidation = (
  query,
  sourceNameDetails,
  streamList,
  selectedStream,
  fieldsList,
  streams,
  pipesExist,
) => {
  let whereSplit = splitingQuery(query, '', true, true, 'streamsWhere')
  let queryArr = whereSplit.splittedArray
  console.log(queryArr, whereSplit)
  let correctStr = ''
  let remStr = ''
  let arr = [...queryArr[0].matchAll(/^(\s*sourcename\s*=\s*)?/gim)][0]
  if (arr?.length > 0) {
    correctStr += arr[0]
    remStr = queryArr[0].slice(correctStr.length) || ''
  }
  let sourcenames = Object.keys(sourceNameDetails)
  if (remStr !== '') {
    if (/^[a-zA-Z0-0_-]+$/gm.test(remStr.trim())) {
      if (sourcenames.includes(remStr.trim().toUpperCase())) {
        let tempStream = JSON.parse(JSON.stringify(sourceNameDetails[remStr.trim().toUpperCase()]))
        tempStream.forEach(stream => selectedStream.push(stream.toLowerCase()))
        console.log(selectedStream, sourceNameDetails[remStr.trim().toUpperCase()])
      } else {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: correctStr.length,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: correctStr.length + remStr?.length + 1,
            message: `SOURCENAME: "${remStr.trim()}" does not exist!`,
            severity: monaco.MarkerSeverity.Error,
          },
        ]
      }
    } else {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: correctStr.length,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: correctStr.length + remStr?.length + 1,
          message: `SOURCENAME: "${remStr.trim()}" is not a valid sourcename!`,
          severity: monaco.MarkerSeverity.Error,
        },
      ]
    }
  } else {
    if (!pipesExist && queryArr.length === 1) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: correctStr.length,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: correctStr.length + remStr?.length + 1,
          message: `SOURCENAME: Write sourcename`,
          severity: monaco.MarkerSeverity.Warning,
        },
      ]
      // } else {
      //   return [
      //     {
      //       // startLineNumber: model.getPositionAt(i).lineNumber,
      //       startColumn: 1,
      //       // endLineNumber: model.getPositionAt(i).lineNumber,
      //       endColumn: correctStr.length + 1,
      //       message: `STREAM: Empty stream clause`,
      //       severity: monaco.MarkerSeverity.Error,
      //     },
      //   ]
    } else {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: correctStr.length,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: correctStr.length + remStr?.length + 1,
          message: `SOURCENAME: Write sourcename`,
          severity: monaco.MarkerSeverity.Error,
        },
      ]
    }
  }
  // else if where clause
  if (queryArr.length === 1 && whereSplit.charPos.length > 0) {
    return [
      {
        // startLineNumber: model.getPositionAt(i).lineNumber,
        startColumn: correctStr.length + 1,
        // endLineNumber: model.getPositionAt(i).lineNumber,
        endColumn: correctStr.length + remStr?.length + 2,
        message: `STREAM: write after "WHERE"`,
        severity: monaco.MarkerSeverity.Warning,
      },
    ]
  }

  if (queryArr.length === 2 && whereSplit.charPos.length === 1) {
    if (selectedStream[0].trim() === '*') {
      fieldsList = [...new Set(fieldsList.concat(...Object.values(streams)))]
    } else {
      selectedStream.forEach(element => {
        fieldsList = [...new Set(fieldsList.concat(streams[element.trim().toUpperCase()]))]
      })
    }
    fieldsList = fieldsList?.map(item => item.replace('$', '').toLowerCase())

    if (
      query.split(
        /^\s*(stream=(?:(?:[a-zA-Z0-9_-]+(?:\s*,\s*[a-zA-Z0-9_-]+)*\s+))|\*)(?:where|\|)?/gim,
      ).length > 0
    ) {
      correctStr = queryArr[0] + ' where '
      remStr = query.slice(correctStr.length)
      let res = separatingFromBrackets(remStr, false)
      console.log(res)
      let errorMsg = []
      let strObj = { correctStr: correctStr, remStr: remStr }
      console.log('fieldsList', fieldsList)
      for (let k = 0; k < res.splittedArray.length; k++) {
        let err = validatingWhereConditions(
          res.splittedArray[k],
          res.separators[k],
          query,
          strObj,
          fieldsList,
          selectedStream,
        )
        if (err && err[0] !== undefined) {
          errorMsg = errorMsg.concat(err)
        }
        if (errorMsg.length > 0) {
          console.log(query, errorMsg)
          let ind = getIndexOfSubstring(query, errorMsg[0].query)
          errorMsg[0].startColumn = ind + 1
          errorMsg[0].endColumn = ind + errorMsg[0].query.length + 1
          return errorMsg
        }
      }
      // for (let i = 0; i < errorMsg.length; i++) {
      //   if (errorMsg[i]) {
      //     return [errorMsg[i]]
      //   }
      // }
      correctStr = strObj.correctStr
      remStr = strObj.remStr
    }
  }

  if (queryArr.length > 2 || whereSplit.charPos.length > 1) {
    return [
      {
        // startLineNumber: model.getPositionAt(i).lineNumber,
        startColumn: correctStr.length + 1,
        // endLineNumber: model.getPositionAt(i).lineNumber,
        endColumn: correctStr.length + remStr?.length + 2,
        message: `STREAM: repeated WHERE`,
        severity: monaco.MarkerSeverity.Error,
      },
    ]
  }

  return []
}

const columnExtract = (str, pipe, fun, aggre) => {
  console.log(str)
  let fields = []
  let arr = splitingQuery(str, ',', false, true).splittedArray
  for (let i = 0; i < arr.length; i++) {
    console.log(arr[i])
    if (/^[a-zA-Z0-9_]+$/.test(arr[i].trim()) && !/^\d+$/.test(arr[i].trim())) {
      fields.push(arr[i])
    } else if (/^@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?$/gm.test(arr[i].trim())) {
      fields.push(arr[i])
    } else if (/^(\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\)$/.test(arr[i].trim())) {
      let tmp = /^(\w+|[|~!=%&*+-\/<>^]+)\(\s*(.+)\s*\)$/.exec(arr[i].trim())
      console.log(tmp)
      if (pipe === 'groupby') {
        if (allFunctions.includes(tmp[1].toLowerCase())) {
          if (aggregateFunctions.includes(tmp[1].toLowerCase())) {
            return []
          } else {
            fun.push(tmp[1].toLowerCase())
            let tmpRes = columnExtract(tmp[2].trim(), pipe, fun, aggre)
            console.log(tmpRes)
            if (tmpRes.length === 0) return []
            fields = fields.concat(tmpRes)
          }
        } else {
          return []
        }
      } else if (pipe === 'select') {
        if (allFunctions.includes(tmp[1].toLowerCase())) {
          fun.push(tmp[1].toLowerCase())
          if (aggregateFunctions.includes(tmp[1].toLowerCase())) {
            aggre.push(tmp[1])
          }
          let tmpRes = columnExtract(tmp[2].trim(), pipe, fun, aggre)
          if (
            tmp[1].toLowerCase() === 'count' &&
            tmpRes.length === 0 &&
            tmp[2].trim().includes('*')
          ) {
            tmpRes.push('*')
          }
          console.log(tmpRes)
          if (tmpRes.length === 0) return []
          fields = fields.concat(tmpRes)
        } else {
          return []
        }
      } else if (pipe === 'where-boolean') {
        if (booleanFunctions.includes(tmp[1].toLowerCase())) {
          fun.push(tmp[1].toLowerCase())
          let tmpRes = columnExtract(tmp[2].trim(), pipe, fun, aggre)
          console.log(tmpRes)
          if (tmpRes.length === 0) return []
          fields = fields.concat(tmpRes)
        } else {
          return []
        }
      } else if (pipe === 'where-all') {
        if (allFunctions.includes(tmp[1].toLowerCase())) {
          fun.push(tmp[1].toLowerCase())
          let tmpRes = columnExtract(tmp[2].trim(), pipe, fun, aggre)
          console.log(tmpRes)
          if (tmpRes.length === 0) return []
          fields = fields.concat(tmpRes)
        } else {
          return []
        }
      }
    } else if (/\d+|'([^']+)'|\"([^\"]+)\"/.test(arr[i].trim())) {
      continue
    } else if (/^\((.+)\)$/.test(arr[i].trim())) {
      console.log(arr[i])
      let tmpRes = columnExtract(/^\((.+)\)$/.exec(arr[i].trim())[1].trim(), pipe, fun, aggre)
      console.log(tmpRes)
      if (tmpRes.length === 0) return []
      fields = fields.concat(tmpRes)
    } else return []
  }
  return fields
}

const checkForGbySelFun = (funName, arr, gbyFun, funs) => {
  console.log(funName, arr, gbyFun, funs)
  if (funs.includes(funName)) {
    let indices = gbyFun
      .map((subarr, ind) => (subarr.includes(funName) ? ind : -1))
      .filter(ind => ind !== -1)
    for (let i = 0; i < indices.length; i++) {
      console.log(gbyFun[indices[i]][4], arr, indices)
      return _.isEqual(_.sortBy(gbyFun[indices[i]][4]), _.sortBy(arr))
    }
  }
  return false
}

const checkSelectAndGroupby = (
  pipes,
  fieldsList,
  groupbyFields,
  selectFields,
  selectAggregate,
  selectAliases,
  selectFunction,
  selectFullField,
) => {
  console.log('gby:', groupbyFields)
  console.log('selectF', selectFields)
  console.log('selectAgg', selectAggregate)
  console.log('selectAlias', selectAliases)
  console.log('selectFun', selectFunction)
  console.log('selectFull', selectFullField)

  let selAl = selectAliases.map(obj => Object.keys(obj)[0])
  for (let i = 0; i < groupbyFields.length; i++) {
    let tempKey = Object.keys(groupbyFields[i])[0]
    console.log(selectAliases.includes(tempKey), selectAliases, groupbyFields, selAl)
    if (groupbyFields[i][tempKey][2] && !selAl.includes(tempKey))
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: groupbyFields[i][tempKey][0] + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: groupbyFields[i][tempKey][1] + 1,
          message: `GROUPBY: column name ${tempKey} is INVALID!`,
          severity: monaco.MarkerSeverity.Error,
        },
      ]
  }
  // none of the both -> return []
  // only groupby -> check only for those whose isAlias is true
  // only select ->
  // both groupby and select ->

  if (pipes['groupby'][0] === -1 && pipes['select'][0] === -1) {
    return []
  } else if (pipes['groupby'][0] !== -1 && pipes['select'][0] === -1) {
    for (let i = 0; i < groupbyFields.length; i++) {
      let tempArr = Object.values(groupbyFields[i])[0]
      if (tempArr[2]) {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: tempArr[0],
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: tempArr[1],
            message: 'Syntax Error: GROUPBY: INVALID Column name',
            severity: monaco.MarkerSeverity.Error,
          },
        ]
      }
    }
  } else if (pipes['groupby'][0] === -1 && pipes['select'][0] !== -1) {
    if (selectAggregate.length > 0) {
      if (selectFields.length > 0) {
        let tempKey = Object.keys(selectFields[0])[0]
        console.log(tempKey)
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: selectFields[0][tempKey][0] + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: selectFields[0][tempKey][1] + 1,
            message: `Syntax Error: SELECT: GROUPBY clause is empty, and ${tempKey} is not an aggregate function`,
            severity: monaco.MarkerSeverity.Error,
          },
        ]
      } else if (selectFunction.length > 0) {
        let tempKey = Object.keys(selectFunction[0])[0]
        console.log(selectFunction[0])
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: selectFunction[0][tempKey][0] + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: selectFunction[0][tempKey][1] + 1,
            message: `Syntax Error: SELECT: GROUPBY clause is empty, and ${selectFunction[0][
              tempKey
            ][3][0] || tempKey} is not an aggregate function`,
            severity: monaco.MarkerSeverity.Error,
          },
        ]
      }
    }
  } else {
    let gbyAlias = groupbyFields
      .filter(obj => Object.values(obj)[0][2] === true)
      .map(obj => Object.keys(obj)[0])
    let gbyField = groupbyFields
      .filter(obj => Object.values(obj)[0][2] === false)
      .map(obj => Object.keys(obj)[0])
    let gbyFun = groupbyFields
      .filter(obj => Object.values(obj)[0].length > 3)
      .map(obj => Object.values(obj)[0])
    let funs = groupbyFields
      .filter(obj => Object.values(obj)[0].length > 3)
      .map(obj => Object.values(obj)[0][3])
    console.log(gbyAlias, gbyField, gbyFun)
    console.log(funs)

    for (let i = 0; i < selectFullField.length; i++) {
      if (selectFullField[i][1] === 'aggregate') {
        if (gbyAlias.includes(selectFullField[i][0]) || gbyField.includes(selectFullField[i][0])) {
          // mark error at groupby and not at select
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: selectFullField[i][2][0] + 1,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: selectFullField[i][2][1] + 2,
              message: `Aggregate functions are not allowed in GROUPBY clause, ${selectFullField[i][0]} is an aggregate function`,
              severity: monaco.MarkerSeverity.Error,
            },
          ]
        }
      } else if (selectFullField[i][1] === 'nonAggregate') {
        // check for directly the function or eachFields or aliases(?)
        console.log(selectFullField[i])
        console.log(
          'Hahahaa',
          gbyAlias.includes(selectFullField[i][3][2]),
          gbyField.includes(selectFullField[i][3][2]),
          checkForGbySelFun(selectFullField[i][2], selectFullField[i][3][3], gbyFun, funs),
          selectFullField[i][3][3].every(item => gbyField.includes(item)),
        )
        // alias check
        // each of fields check
        // directly function check
        if (
          !gbyAlias.includes(selectFullField[i][3][2]) &&
          !gbyField.includes(selectFullField[i][3][2]) &&
          !checkForGbySelFun(selectFullField[i][2], selectFullField[i][3][3], gbyFun, funs) &&
          !selectFullField[i][3][3].every(item => gbyField.includes(item))
        ) {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: selectFullField[i][3][0] + 1,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: selectFullField[i][3][1] + 2,
              message: `Expression ${selectFullField[
                i
              ][0].trim()} is neither present in GROUPBY nor is an Aggregate function!`,
              severity: monaco.MarkerSeverity.Error,
            },
          ]
        }
      } else if (selectFullField[i][1] === 'field' || selectFullField[i][1] === 'logField') {
        // check for keys or alias of the select field
        if (
          !gbyAlias.includes(selectFullField[i][2][2]) &&
          !gbyField.includes(selectFullField[i][2][2]) &&
          !gbyAlias.includes(selectFullField[i][0].split(/\s+as\s+/)[0].trim()) &&
          !gbyField.includes(selectFullField[i][0].split(/\s+as\s+/)[0].trim())
        ) {
          // mark error at groupby and not at select
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: selectFullField[i][2][0] + 1,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: selectFullField[i][2][1] + 2,
              message: `Expression ${selectFullField[
                i
              ][0].trim()} is neither present in GROUPBY nor is an Aggregate function!`,
              severity: monaco.MarkerSeverity.Error,
            },
          ]
        }
      } else if (selectFullField[i][1] === 'allFields') {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: selectFullField[i][2][0],
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: selectFullField[i][2][1],
            message: `SELECT: "*" cannot be used along with GROUPBY Clause or aggregate function`,
            severity: monaco.MarkerSeverity.Error,
          },
        ]
      }
    }
  }
  return []
}

const checkHaving = (query, pos, havingFullFields, lastPipe) => {
  let correctStr = ''
  let remStr = ''
  let arr = [...query.matchAll(/^(\|\s*having\s*)/gim)][0]
  if (arr?.length > 0) {
    correctStr += arr[0]
    remStr = query.slice(correctStr.length) || ''
  }
  let splittedArray = splitingQuery(remStr, '', true, true, 'having')
  console.log(remStr, splittedArray)

  let res = separatingFromBrackets(remStr, true)
  console.log(res)
  let errorMsg = []
  let strObj = { correctStr: correctStr, remStr: remStr }
  for (let k = 0; k < res.splittedArray.length; k++) {
    let err = validatingHavingConditions(
      res.splittedArray[k],
      res.separators[k] || '',
      query,
      strObj,
      pos,
      havingFullFields,
      // fieldsList,
      // selectedStream,
    )
    if (err && err[0] !== undefined) {
      errorMsg = errorMsg.concat(err)
    }
  }
  if (errorMsg.length > 0) {
    console.log(errorMsg, query)
    let ind = getIndexOfSubstring(query, errorMsg[0].query)
    errorMsg[0].startColumn = pos + ind + 1
    errorMsg[0].endColumn = pos + ind + errorMsg[0].query.length + 1
    return errorMsg
  }
  // for (let i = 0; i < errorMsg.length; i++) {
  //   if (errorMsg[i]) {
  //     return [errorMsg[i]]
  //   }
  // }

  for (let i = 0; i < havingFullFields.length; i++) {
    let item = havingFullFields[i]
    let ind = getIndexOfSubstring(query, item[0])
    item.push(pos + ind + 1, pos + ind + item[0].length + 1)
  }
  correctStr = strObj.correctStr
  remStr = strObj.remStr

  return []
}

const checkSelect = (
  query,
  pos,
  fieldsList,
  selectFields,
  selectAggregate,
  selectAliases,
  selectFunction,
  selectFullField,
  lastPip,
) => {
  let correctStr = ''
  let remStr = ''
  let arr = [...query.matchAll(/^(\|\s*select\s*)/gim)][0]
  if (arr?.length > 0) {
    correctStr += arr[0]
    remStr = query.slice(correctStr.length) || ''
  }
  let splittedArray = splitingQuery(remStr, ',', false, true).splittedArray
  console.log(splittedArray)
  let agg = []
  let starUsed = [false, -1, -1]
  for (let i = 0; i < splittedArray.length; i++) {
    if (splittedArray[i].trim() === '*') {
      starUsed = true
      if (agg.length > 0) {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: pos + correctStr.length + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: pos + correctStr.length + splittedArray[i].length + 2,
            message: `SELECT: "*" cannot be used along with GROUPBY Clause or aggregate function`,
            severity: monaco.MarkerSeverity.Error,
          },
        ]
      }
      correctStr += i > 0 ? ',' + splittedArray[i] : '' + splittedArray[i]
      remStr = query.slice(correctStr.length)
      starUsed = [
        true,
        pos + correctStr.length + 1,
        pos + correctStr.length + splittedArray[i].length + 2,
      ]
      selectFields.push({
        '*': [pos + correctStr.length - splittedArray[i].length, pos + correctStr.length, ''],
      })
      selectFullField.push([
        splittedArray[i],
        'allFields',
        [pos + correctStr.length - splittedArray[i].length, pos + correctStr.length, ''],
      ])
    } else if (
      /^(\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\)(?:\s+[aA][sS]\s+[a-zA-Z0-9_]+)?$/gm.test(
        splittedArray[i].trim(),
      )
    ) {
      let fun = /^((\w+|[|~!=%&*+-\/<>^]+)\(\s*(.+)\s*\))(?:\s+[aA][sS]\s+([a-zA-Z0-9_]+))?$/.exec(
        splittedArray[i].trim(),
      )
      console.log(fun)
      let aggre = []
      let func = []
      let arr = columnExtract(fun[1], 'select', func, aggre)
      console.log(arr, aggre, func)
      if (fun[2].toLowerCase() === 'distinct') {
        if (i !== 0) {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: pos + correctStr.length + 1,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: pos + correctStr.length + splittedArray[i].length + 2,
              message: `SELECT: 'DISTINCT' must follow 'SELECT' directly unless used within an aggregation function. It cannot be inside or after other functions.`,
              severity: monaco.MarkerSeverity.Error,
            },
          ]
        }
      }
      // if (aggre.length > 1) {
      //   return [
      //     {
      //       // startLineNumber: model.getPositionAt(i).lineNumber,
      //       startColumn: pos + correctStr.length + 1,
      //       // endLineNumber: model.getPositionAt(i).lineNumber,
      //       endColumn: pos + correctStr.length + splittedArray[i].length + 2,
      //       message: `SELECT: function "${splittedArray[
      //         i
      //       ].trim()}": 'It is not allowed to use an aggregate function in the argument of another aggregate function'`,
      //       severity: monaco.MarkerSeverity.Error,
      //     },
      //   ]
      // }

      if (arr.length === 0 && func.length === 0) {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: pos + correctStr.length + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: pos + correctStr.length + splittedArray[i].length + 2,
            message: `SELECT: function "${splittedArray[i].trim()}" is INVALID!`,
            severity: monaco.MarkerSeverity.Error,
          },
        ]
      } else {
        if ((agg.length > 0 || aggre.length > 0) && starUsed[0]) {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: pos + correctStr.length + 1,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: pos + correctStr.length + splittedArray[i].length + 2,
              message: `SELECT: "*" cannot be used along with GROUPBY Clause or aggregate function`,
              severity: monaco.MarkerSeverity.Error,
            },
          ]
        }
        let correctField = []
        for (let j = 0; j < arr.length; j++) {
          if (fieldsList.includes(arr[j].trim().toLowerCase())) {
            correctField.push(arr[j].trim().toLowerCase())
            continue
          } else if (
            aggre.some(w => /^count$/i.test(w.trim())) &&
            arr[j].trim().toLowerCase() === '*'
          ) {
            correctField.push(arr[j].trim().toLowerCase())
            continue
          } else if (/^@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?$/gm.test(arr[j].trim())) {
            correctField.push(arr[j].trim().toLowerCase())
            continue
          } else {
            return [
              {
                // startLineNumber: model.getPositionAt(i).lineNumber,
                startColumn: pos + correctStr.length + 1,
                // endLineNumber: model.getPositionAt(i).lineNumber,
                endColumn: pos + correctStr.length + splittedArray[i].length + 2,
                message: `SELECT: column name "${arr[j].trim()}" is DOES NOT EXISTS!`,
                severity: monaco.MarkerSeverity.Warning,
              },
            ]
          }
        }
        correctStr += i > 0 ? ',' + splittedArray[i] : '' + splittedArray[i]
        remStr = query.slice(correctStr.length)
        if (aggre.length > 0) {
          agg.push({
            [fun[1]]: [
              pos + correctStr.length - splittedArray[i].length,
              pos + correctStr.length,
              fun[4] || '',
              ...aggre,
            ],
          })
          selectAggregate.push({
            [fun[1]]: [
              pos + correctStr.length - splittedArray[i].length,
              pos + correctStr.length,
              fun[4] || '',
              ...aggre,
            ],
          })
          selectFullField.push([
            fun[2],
            'aggregate',
            [
              pos + correctStr.length - splittedArray[i].length,
              pos + correctStr.length,
              fun[4] || '',
              ...aggre,
            ],
          ])
          // if (fun[4]) agg.push({
          //   [fun[4]]: [pos + correctStr.length - splittedArray[i].length,
          //   pos + correctStr.length,
          //   fun[1],
          //   ...aggre]
          // })
        }
        console.log(arr, aggre, `\n`, agg)
        // if (aggre.length > 0) {
        // selectFields.push({[splittedArray[i].trim()] : [
        //   pos + correctStr.length - splittedArray[i].length,
        //   pos + correctStr.length,
        //   (fun[4] || '').trim(),
        // ]})
        // if (fun[4])
        // selectFields.push({[fun[4]] : [
        // pos + correctStr.length - splittedArray[i].length,
        // pos + correctStr.length,
        //   splittedArray[i].trim(),
        // ]})
        // } else {
        if (aggre.length === 0) {
          selectFunction.push({
            [splittedArray[i].trim()]: [
              pos + correctStr.length - splittedArray[i].length,
              pos + correctStr.length,
              (fun[4] || '').trim(),
              correctField,
            ],
          })
          selectFullField.push([
            splittedArray[i],
            'nonAggregate',
            fun[2],
            [
              pos + correctStr.length - splittedArray[i].length,
              pos + correctStr.length,
              (fun[4] || '').trim().toLowerCase(),
              correctField,
            ],
          ])
          if (fun[4])
            selectAliases.push({
              [fun[4].trim().toLowerCase()]: [
                pos + correctStr.length - splittedArray[i].length,
                pos + correctStr.length,
                splittedArray[i].trim(),
                ...correctField,
              ],
            })
          // correctField.forEach(fd => {
          //   selectFields.push({
          //     [fd.trim()]: [
          //       pos + correctStr.length - splittedArray[i].length,
          //       pos + correctStr.length,
          //       (fun[4] || '').trim(),
          //     ],
          //   })
          // })
        }
        // }
      }
    }
    // else if (Object.keys(agg).length === 0) {
    else if (
      /^\s*(?:([a-zA-Z]+\s+[aA][sS]\s+[a-zA-Z0-9_]+)|([a-zA-Z]+))$/gm.test(splittedArray[i].trim())
    ) {
      let sel = splittedArray[i].split(/\s+as\s+/i)
      if (fieldsList.includes(sel[0].trim().toLowerCase())) {
        correctStr += i > 0 ? ',' + splittedArray[i] : '' + splittedArray[i]
        remStr = query.slice(correctStr.length)
        selectFields.push({
          [sel[0].trim().toLowerCase()]: [
            pos + correctStr.length - splittedArray[i].length,
            pos + correctStr.length,
            (sel[1] || '').trim().toLowerCase(),
          ],
        })
        selectFullField.push([
          splittedArray[i].toLowerCase(),
          'field',
          [
            pos + correctStr.length - splittedArray[i].length,
            pos + correctStr.length,
            (sel[1] || '').trim().toLowerCase(),
          ],
        ])
        if (sel[1])
          selectAliases.push({
            [sel[1].trim().toLowerCase()]: [
              pos + correctStr.length - splittedArray[i].length,
              pos + correctStr.length,
              sel[0].trim().toLowerCase(),
            ],
          })
      } else {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: pos + correctStr.length + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: pos + correctStr.length + splittedArray[i].length + 2,
            message: `SELECT: column name "${sel[0].trim()}" DOES NOT EXISTS!`,
            severity: monaco.MarkerSeverity.Warning,
          },
        ]
      }
      // gbyCol.push(splittedArray[i].trim())
    } else if (
      /^\s*(?:([a-zA-Z]+(?:\s*[+\-*\/]\s*(?:[a-zA-Z]+|\d|\S+))\s+[aA][sS]\s+[a-zA-Z0-9_]+)|([a-zA-Z]+(?:\s*[+\-*\/]\s*(?:[a-zA-Z]+|\d|\S+))))$/gm.test(
        splittedArray[i].trim(),
      )
    ) {
      let selOps = splittedArray[i].split(/\s+as\s+/i)
      let sel = selOps[0].split(/\s*[+\-*\/]\s*/i)
      // using splitingQuery
      // let selOps = splitingQuery(splittedArray[i], 'as', false, true).splittedArray
      // let sel = splittingQuery(splittedArray[i], 'as', false, true).splittedArray
      console.log(sel, selOps)
      let correctField = []
      for (let k = 0; k < sel.length; k++) {
        if (/^[a-zA-Z]+$/.test(sel[k].trim())) {
          if (fieldsList.includes(sel[k].trim().toLowerCase())) {
            correctField.push(sel[k].trim())
          } else {
            return [
              {
                // startLineNumber: model.getPositionAt(i).lineNumber,
                startColumn: pos + correctStr.length + 1,
                // endLineNumber: model.getPositionAt(i).lineNumber,
                endColumn: pos + correctStr.length + splittedArray[i].length + 2,
                message: `SELECT: column name "${sel[0].trim()}" DOES NOT EXISTS!`,
                severity: monaco.MarkerSeverity.Warning,
              },
            ]
          }
        }
      }
      correctStr += i > 0 ? ',' + splittedArray[i] : '' + splittedArray[i]
      remStr = query.slice(correctStr.length)
      correctField.forEach(fd => {
        selectFields.push({
          [fd.trim().toLowerCase()]: [
            pos + correctStr.length - splittedArray[i].length,
            pos + correctStr.length,
            (selOps[1] || '').trim().toLowerCase(),
          ],
        })
      })
      selectFullField.push([
        splittedArray[i].toLowerCase().trim(),
        'fields',
        [
          pos + correctStr.length - splittedArray[i].length,
          pos + correctStr.length,
          (selOps[1] || '').trim().toLowerCase(),
        ],
      ])
      if (selOps[1])
        selectAliases.push({
          [selOps[1].trim().toLowerCase()]: [
            pos + correctStr.length - splittedArray[i].length,
            pos + correctStr.length,
            correctField,
          ],
        })
    } else if (/^@/.test(splittedArray[i].trim())) {
      if (
        /^@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?(?:\s+[aA][sS]\s+[a-zA-Z0-9_]+)?$/gm.test(
          splittedArray[i].trim(),
        )
      ) {
        let sel = splittedArray[i].split(/\s+as\s+/i)
        correctStr += i > 0 ? ',' + splittedArray[i] : '' + splittedArray[i]
        remStr = query.slice(correctStr.length)
        selectFullField.push([
          splittedArray[i].toLowerCase(),
          'logField',
          [
            pos + correctStr.length - splittedArray[i].length,
            pos + correctStr.length,
            (sel[1] || '').trim().toLowerCase(),
          ],
        ])
        selectFields.push({
          [sel[0].trim().toLowerCase()]: [
            pos + correctStr.length - splittedArray[i].length,
            pos + correctStr.length,
            (sel[1] || '').trim().toLowerCase(),
          ],
        })
        if (sel[1])
          selectAliases.push({
            [sel[1].trim().toLowerCase()]: [
              pos + correctStr.length - splittedArray[i].length,
              pos + correctStr.length,
              sel[0].trim().toLowerCase(),
            ],
          })
      } else if (/^@\w+(((\.)|(\[\s*\d+\s*\]))+)?$/gm.test(splittedArray[i].trim())) {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: pos + correctStr.length + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: pos + correctStr.length + splittedArray[i].length + 2,
            message: `SELECT: column name "${splittedArray[i].trim()}" is Incomplete!`,
            severity: monaco.MarkerSeverity.Warning,
          },
        ]
      } else {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: pos + correctStr.length + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: pos + correctStr.length + splittedArray[i].length + 2,
            message: `SELECT: column name "${splittedArray[i].trim()}" is INVALID!`,
            severity: monaco.MarkerSeverity.Error,
          },
        ]
      }
    } else {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + correctStr.length + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + correctStr.length + splittedArray[i].length + 2,
          message: `SELECT: column name "${splittedArray[i].trim()}" is INVALID!`,
          severity: lastPip ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Error,
        },
      ]
    }
    // } else {
    //   return [
    //     {
    //       // startLineNumber: model.getPositionAt(i).lineNumber,
    //       startColumn: pos + correctStr.length + 1,
    //       // endLineNumber: model.getPositionAt(i).lineNumber,
    //       endColumn: pos + correctStr.length + splittedArray[i].length + 2,
    //       message: `SELECT: "${splittedArray[i].trim()}" is not an aggregate function and GROUPBY Clause is empty!`,
    //       severity: monaco.MarkerSeverity.Error,
    //     },
    //   ]
    // }
  }
  // check for arithmatic operations
  console.log('selectFields', selectFields)
  console.log('select Alias', selectAliases)
  console.log(selectAggregate, 'selFun', selectFunction)
  return []
}

const checkGroupby = (query, pos, fieldsList, groupbyFields, lastPip) => {
  let correctStr = ''
  let remStr = ''
  let arr = [...query.matchAll(/^(\|\s*groupby\s*)/gim)][0]
  if (arr?.length > 0) {
    correctStr += arr[0]
    remStr = query.slice(correctStr.length) || ''
  }
  let splittedArray = splitingQuery(remStr, ',', false, true).splittedArray
  console.log('gropuby:', splittedArray)
  for (let i = 0; i < splittedArray.length; i++) {
    if (/^(\w+|[|~!=%&*+-\/<>^]+)\s*\(\s*.+\s*\)$/.test(splittedArray[i].trim())) {
      //check if the function is not a aggregate function but is present in all function
      let fun = /^(\w+|[|~!=%&*+-\/<>^]+)\s*\(\s*(.+)\s*\)$/.exec(splittedArray[i].trim())
      let func = []
      let arr = columnExtract(fun[0], 'groupby', func)
      console.log('groupby: fun, arr', fun, arr, func)
      if (arr.length === 0 && func.length === 0) {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: pos + correctStr.length + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: pos + correctStr.length + splittedArray[i].length + 2,
            message: `GROUPBY: function "${splittedArray[i].trim()}" is INVALID!`,
            severity: monaco.MarkerSeverity.Error,
          },
        ]
      } else {
        for (let j = 0; j < arr.length; j++) {
          arr[j] = arr[j].trim()
          if (fieldsList.includes(arr[j].trim().toLowerCase())) {
            continue
            // } else if (
            //   selectFields.length > 0 &&
            //   selectFields[arr[j].trim()] &&
            //   selectFields[arr[j].trim()][1] === arr[j].trim()
            // ) {
            //   // check for aliases
            //   continue
          } else if (/^@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?$/gm.test(arr[j].trim())) {
            continue
          } else {
            return [
              {
                // startLineNumber: model.getPositionAt(i).lineNumber,
                startColumn: pos + correctStr.length + 1,
                // endLineNumber: model.getPositionAt(i).lineNumber,
                endColumn: pos + correctStr.length + splittedArray[i].length + 2,
                message: `GROUPBY: column name "${arr[j].trim()}" is DOES NOT EXISTS!`,
                severity: monaco.MarkerSeverity.Warning,
              },
            ]
          }
        }
        correctStr += i > 0 ? ',' + splittedArray[i] : '' + splittedArray[i]
        remStr = query.slice(correctStr.length)
        groupbyFields.push({
          [splittedArray[i].trim()]: [
            pos + correctStr.length - splittedArray[i].length,
            pos + correctStr.length,
            false,
            fun[1],
            arr,
          ],
        })
      }
    } else if (/^\s*[a-zA-Z]+$/gm.test(splittedArray[i].trim())) {
      if (fieldsList.includes(splittedArray[i].trim().toLowerCase())) {
        correctStr += i > 0 ? ',' + splittedArray[i] : '' + splittedArray[i]
        remStr = query.slice(correctStr.length)
        groupbyFields.push({
          [splittedArray[i].trim().toLowerCase()]: [
            pos + correctStr.length - splittedArray[i].length,
            pos + correctStr.length,
            false,
          ],
        })
      } else {
        correctStr += i > 0 ? ',' + splittedArray[i] : '' + splittedArray[i]
        remStr = query.slice(correctStr.length)
        groupbyFields.push({
          [splittedArray[i].trim().toLowerCase()]: [
            pos + correctStr.length - splittedArray[i].length,
            pos + correctStr.length,
            true,
          ],
        })
        // return [
        //   {
        //     // startLineNumber: model.getPositionAt(i).lineNumber,
        //     startColumn: pos + correctStr.length + 1,
        //     // endLineNumber: model.getPositionAt(i).lineNumber,
        //     endColumn: pos + correctStr.length + splittedArray[i].length + 2,
        //     message: `GROUPBY: column name "${splittedArray[i].trim()}" is DOES NOT EXISTS!`,
        //     severity: monaco.MarkerSeverity.Warning,
        //   },
        // ]
      }
    } else if (/^\s*[a-zA-Z0-9_]+$/gm.test(splittedArray[i].trim())) {
      correctStr += i > 0 ? ',' + splittedArray[i] : '' + splittedArray[i]
      remStr = query.slice(correctStr.length)
      groupbyFields.push({
        [splittedArray[i].trim().toLowerCase()]: [
          pos + correctStr.length - splittedArray[i].length,
          pos + correctStr.length,
          true,
        ],
      })
      // if (selectFields.length > 0) {
      //   // check for aliases only
      // } else {
      //   return [
      //     {
      //       // startLineNumber: model.getPositionAt(i).lineNumber,
      //       startColumn: pos + correctStr.length + 1,
      //       // endLineNumber: model.getPositionAt(i).lineNumber,
      //       endColumn: pos + correctStr.length + splittedArray[i].length + 2,
      //       message: `GROUPBY: column name "${splittedArray[i].trim()}" is DOES NOT EXISTS!`,
      //       severity: monaco.MarkerSeverity.Warning,
      //     },
      //   ]
      // }
    } else if (/^@/.test(splittedArray[i].trim())) {
      if (/^@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?$/gm.test(splittedArray[i].trim())) {
        correctStr += i > 0 ? ',' + splittedArray[i] : '' + splittedArray[i]
        remStr = query.slice(correctStr.length)
        groupbyFields.push({
          [splittedArray[i].trim().toLowerCase()]: [
            pos + correctStr.length - splittedArray[i].length,
            pos + correctStr.length,
            false,
          ],
        })
      } else if (/^@\w+(((\.)|(\[\s*\d+\s*\]))+)?$/gm.test(splittedArray[i].trim())) {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: pos + correctStr.length + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: pos + correctStr.length + splittedArray[i].length + 2,
            message: `GROUPBY: column name "${splittedArray[i].trim()}" is Incomplete!`,
            severity: monaco.MarkerSeverity.Warning,
          },
        ]
      } else {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: pos + correctStr.length + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: pos + correctStr.length + splittedArray[i].length + 2,
            message: `GROUPBY: column name "${splittedArray[i].trim()}" is INVALID!`,
            severity: monaco.MarkerSeverity.Error,
          },
        ]
      }
    } else {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + correctStr.length + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + correctStr.length + splittedArray[i].length + 2,
          message: `GROUPBY: column name "${splittedArray[i].trim()}" is INVALID!`,
          severity: lastPip ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Error,
        },
      ]
    }
  }
  console.log('groupbyFields', groupbyFields)

  return []
}

const validateCheckif = (query, pos, fieldsList, lastPipe) => {
  let correctStr = ''
  let remStr = ''
  let arr = [...query.matchAll(/^(\|\s*checkif\s*)/gim)][0]
  if (arr?.length > 0) {
    correctStr += arr[0]
    remStr = query.slice(correctStr.length) || ''
  }
  if (remStr === '') {
    if (lastPipe) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + correctStr.length,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + correctStr.length + 1,
          message: `CHECKIF: Empty Pipe`,
          severity: monaco.MarkerSeverity.Warning,
        },
      ]
    } else {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + correctStr.length + 1,
          message: `CHECKIF: Empty Pipe`,
          severity: monaco.MarkerSeverity.Error,
        },
      ]
    }
  }

  if (
    /^([a-zA-Z0-9]+\s+)(?:not\s+in|in)\s+([a-zA-Z0-9_$-]+)\.([a-zA-Z0-9_$-]+)$/gim.test(
      remStr.trim(),
    )
  ) {
    let grp = /^([a-zA-Z0-9]+\s+)(?:not\s+in|in)\s+([a-zA-Z0-9_$-]+)\.([a-zA-Z0-9_$-]+)$/gim.exec(
      remStr.trim(),
    )
    if (fieldsList.includes(grp[1].toLowerCase().trim())) {
      return []
    } else {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + correctStr.length,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + correctStr.length + 1 + remStr.length,
          message: `CHECKIF: Invalid vField name`,
          severity: monaco.MarkerSeverity.Error,
        },
      ]
    }
  } else if (/^([a-zA-Z0-9]+\s+)(not\s+in|in)\s+(.*)$/gim.test(remStr.trim())) {
    let grp = /^([a-zA-Z0-9]+\s+)(not\s+in|in)\s+(.*)$/gim.exec(remStr.trim())
    if (fieldsList.includes(grp[1].toLowerCase().trim())) {
      correctStr += grp[1] + grp[2]
      remStr = remStr = query.slice(correctStr.length) || ''
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + correctStr.length + 2,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + correctStr.length + remStr.length + 1,
          message: `CHECKIF: Invalid Eventstore Name`,
          severity: monaco.MarkerSeverity.Error,
        },
      ]
    } else {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + correctStr.length,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + correctStr.length + remStr.length + 1,
          message: `CHECKIF: Invalid vField name`,
          severity: monaco.MarkerSeverity.Error,
        },
      ]
    }
  } else {
    return [
      {
        // startLineNumber: model.getPositionAt(i).lineNumber,
        startColumn: pos + correctStr.length,
        // endLineNumber: model.getPositionAt(i).lineNumber,
        endColumn: pos + correctStr.length + remStr.length + 1,
        message: `CHECKIF: Invalid Syntax`,
        severity: monaco.MarkerSeverity.Error,
      },
    ]
  }
  return []
}

const checkWindow = (query, pos, lastPipe) => {
  let correctStr = ''
  let remStr = ''
  let arr = [...query.matchAll(/^(\|\s*window\s*)/gim)][0]
  if (arr?.length > 0) {
    correctStr += arr[0]
    remStr = query.slice(correctStr.length) || ''
  }
  if (remStr === '') {
    if (lastPipe) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + correctStr.length,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + correctStr.length + 1,
          message: `WINDOW: Empty Pipe`,
          severity: monaco.MarkerSeverity.Warning,
        },
      ]
    } else {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + correctStr.length + 1,
          message: `WINDOW: Empty Pipe`,
          severity: monaco.MarkerSeverity.Error,
        },
      ]
    }
  }
  if (!/^\d{1,}[mhdwM]\s*$/.test(remStr)) {
    return [
      {
        // startLineNumber: model.getPositionAt(i).lineNumber,
        startColumn: pos + correctStr.length + 1,
        // endLineNumber: model.getPositionAt(i).lineNumber,
        endColumn: pos + correctStr.length + remStr?.length + 1,
        message: 'Syntax Error: WINDOW',
        severity: monaco.MarkerSeverity.Error,
      },
    ]
  }
  return []
}

const checkDuration = (query, pos, lastPipe) => {
  let correctStr = ''
  let remStr = ''

  let arrs = [...query.matchAll(/^(\|\s*duration\s*)/gim)][0]
  if (arrs?.length > 0) {
    correctStr += arrs[0]
    remStr = query.slice(correctStr.length) || ''
  }
  if (remStr === '') {
    if (lastPipe) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + correctStr.length,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + correctStr.length + remStr?.length + 1,
          message: `DURATION: Empty Pipe`,
          severity: monaco.MarkerSeverity.Warning,
        },
      ]
    } else {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + correctStr.length + 1,
          message: `DURATION: Empty Pipe`,
          severity: monaco.MarkerSeverity.Error,
        },
      ]
    }
  }

  // let arr = remStr?.trim().split(" ").filter(w => w !== undefined && w !== null && w !== '')

  // console.log(/^duration$/i.test(arr[0].trim()), query)
  // if remStr[0] is an alphabet or a digit
  if (/[a-zA-Z]/.test(remStr[0])) {
    let arr = splitingQuery(remStr, ' ', true).splittedArray
    let indSp = []
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] !== ' ') {
        indSp.push(i)
      }
    }
    console.log(indSp, arr)
    let nowIsUsed = false

    // from
    if (!/\w+/.test(arr[0]) || (arr.length > 1 && arr[0].toLowerCase() !== 'from')) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + correctStr.length + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + correctStr.length + remStr?.length + 1,
          message: 'Syntax Error: DURATION at "from"',
          severity: monaco.MarkerSeverity.Error,
        },
      ]
    } else if (arr[0].toLowerCase() === 'from') {
      correctStr += arr[0]
      if (indSp.length > 1) {
        correctStr += ' '.repeat(indSp[1] - 1)
      }
      remStr = query.slice(correctStr.length)
      console.log(remStr, correctStr)
    }

    // arr[1] === YYYY-MM-DDThh:mm:ss || @now-[d][mhdwM]
    if (indSp.length > 1) {
      if (arr[indSp[1]].trim()[0] === '@') {
        if (arr.length > indSp[1] + 1) {
          if (!/^\s*@now-\d{1,}[mhdwM]$/m.test(arr[indSp[1]])) {
            return [
              {
                // startLineNumber: model.getPositionAt(i).lineNumber,
                startColumn: pos + correctStr.length + 2,
                // endLineNumber: model.getPositionAt(i).lineNumber,
                endColumn: pos + correctStr.length + remStr?.length + 1,
                message: 'Syntax Error: DURATION: after "from" at date-time using "@now"',
                severity: monaco.MarkerSeverity.Error,
              },
            ]
          } else {
            if (
              /^\s*@now-(\d{1,})[mhdwM]$/m.exec(arr[indSp[1]]) !== null &&
              parseInt(/^\s*@now-(\d{1,})[mhdwM]$/m.exec(arr[indSp[1]])[1]) === 0
            ) {
              return [
                {
                  // startLineNumber: model.getPositionAt(i).lineNumber,
                  startColumn: pos + correctStr.length + 2,
                  // endLineNumber: model.getPositionAt(i).lineNumber,
                  endColumn: pos + correctStr.length + remStr?.length + 1,
                  message:
                    'Syntax Error: DURATION: after "from" at date-time using "@now" --- cannot have "0" value',
                  severity: monaco.MarkerSeverity.Error,
                },
              ]
            }
            nowIsUsed = true
            correctStr += arr[indSp[1]]
            if (indSp.length > 2) {
              correctStr += ' '.repeat(indSp[2] - indSp[1] - 1)
            }
            remStr = query.slice(correctStr.length)
            console.log(remStr, correctStr)
          }
        } else {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: pos + correctStr.length + 2,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: pos + correctStr.length + remStr?.length + 1,
              message: 'Syntax Error: DURATION: need after "from" at date-time',
              severity: monaco.MarkerSeverity.Warning,
            },
          ]
        }
      } else if (/[0-9]/.test(arr[indSp[1]].trim()[0])) {
        if (arr.length > indSp[1] + 1) {
          if (
            !/^\s*\d{4}-(((0[13578]|1[02])-([0-2][0-9]|3[0-1]))|((0[469]|11)-([0-2][0-9]|30))|(02-[0-2][0-9]))T([0-1][0-9]|2[0-3]):(0[0-9]|[1-5][0-9]):(0[0-9]|[1-5][0-9])$/m.test(
              arr[indSp[1]],
            )
          ) {
            return [
              {
                // startLineNumber: model.getPositionAt(i).lineNumber,
                startColumn: pos + correctStr.length + 2,
                // endLineNumber: model.getPositionAt(i).lineNumber,
                endColumn: pos + correctStr.length + remStr?.length + 1,
                message: 'Syntax Error: DURATION: after "from" at date-time',
                severity: monaco.MarkerSeverity.Error,
              },
            ]
          } else {
            correctStr += arr[indSp[1]]
            if (indSp.length > 2) {
              correctStr += ' '.repeat(indSp[2] - indSp[1] - 1)
            }
            remStr = query.slice(correctStr.length)
            console.log(remStr, correctStr)
          }
        } else {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: pos + correctStr.length + 2,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: pos + correctStr.length + remStr?.length + 1,
              message: 'Syntax Error: DURATION: need after "from" at date-time',
              severity: monaco.MarkerSeverity.Warning,
            },
          ]
        }
      } else {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: pos + correctStr.length + 2,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: pos + correctStr.length + remStr?.length + 1,
            message: 'Syntax Error: DURATION: need after "from" at date-time',
            severity: monaco.MarkerSeverity.Error,
          },
        ]
      }
    }

    // arr[2] === 'to'
    if (indSp.length > 2) {
      if (
        !/\w+/.test(arr[indSp[2]]) ||
        (arr.length > indSp[2] + 1 && arr[indSp[2]].toLowerCase() !== ' to')
      ) {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: pos + correctStr.length + 2,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: pos + correctStr.length + remStr?.length + 1,
            message: 'Syntax Error: DURATION: at "to"',
            severity: monaco.MarkerSeverity.Error,
          },
        ]
      } else if (arr[indSp[2]].toLowerCase() === ' to') {
        correctStr += arr[indSp[2]]
        if (indSp.length > 3) {
          correctStr += ' '.repeat(indSp[3] - indSp[2] - 1)
        }
        remStr = query.slice(correctStr.length)
        console.log(remStr, correctStr)
      }
    }
    // arr[3] === YYYY-MM-DDThh:mm:ss || @now-[d][mhdwM]
    // /\d{4}-(((0[13578]|1[02])-([0-2][0-9]|3[0-1]))|((0[469]|11)-([0-2][0-9]|30))|(02-[0-2][0-9]))T([0-1][0-9]|2[0-3]):(0[0-9]|[1-5][0-9]):(0[0-9]|[1-5][0-9])/
    if (indSp.length > 3) {
      // if (arr[indSp[3]].trim()[0] === '@' && nowIsUsed) {
      if (nowIsUsed) {
        if (!/^\s*@now-\d{1,}[mhdwM]$/m.test(arr[indSp[3]])) {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: pos + correctStr.length + 2,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: pos + correctStr.length + remStr?.length + 1,
              message: 'Syntax Error: DURATION: after "to" at date-time using "@now"',
              severity: monaco.MarkerSeverity.Error,
            },
          ]
        } else {
          if (
            /^\s*@now-(\d{1,})[mhdwM]$/m.exec(arr[indSp[3]]) &&
            parseInt(/^\s*@now-(\d{1,})[mhdwM]$/m.exec(arr[indSp[3]])[1]) === 0
          ) {
            return [
              {
                // startLineNumber: model.getPositionAt(i).lineNumber,
                startColumn: pos + correctStr.length + 2,
                // endLineNumber: model.getPositionAt(i).lineNumber,
                endColumn: pos + correctStr.length + remStr?.length + 1,
                message:
                  'Syntax Error: DURATION: after "to" at date-time using "@now" -- cannot give "0"',
                severity: monaco.MarkerSeverity.Error,
              },
            ]
          }
          correctStr += arr[indSp[3]]
          correctStr += ' '.repeat(arr.length - indSp[3] - 1)
          remStr = query.slice(correctStr.length)
          console.log(remStr, 'HEHEHEHE', correctStr)
          console.log(correctStr === query)
        }
      } else {
        if (
          !/^\s*\d{4}-(((0[13578]|1[02])-([0-2][0-9]|3[0-1]))|((0[469]|11)-([0-2][0-9]|30))|(02-[0-2][0-9]))T([0-1][0-9]|2[0-3]):(0[0-9]|[1-5][0-9]):(0[0-9]|[1-5][0-9])$/m.test(
            arr[indSp[3]],
          )
        ) {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: pos + correctStr.length + 2,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: pos + correctStr.length + remStr?.length + 1,
              message: 'Syntax Error: DURATION: after "to" at date-time',
              severity: monaco.MarkerSeverity.Error,
            },
          ]
        } else {
          correctStr += arr[indSp[3]]
          // if (indSp.length > 3) {
          correctStr += ' '.repeat(arr.length - indSp[3] - 1)
          // }
          remStr = query.slice(correctStr.length)
          console.log(remStr, 'HEHEHEHE', correctStr)
          console.log(correctStr === query)
        }
      }
      // else not needed
    }

    if (indSp.length > 4) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + correctStr.length + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + query.length + 2,
          message: 'Syntax Error: DURATION: after "to" and date-time ::: unwanted',
          severity: monaco.MarkerSeverity.Error,
        },
      ]
    }
  } else if (/\d/.test(remStr[0])) {
    if (/^\d{1,}$/.test(remStr)) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + correctStr.length + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + correctStr.length + remStr?.length + 1,
          message: 'Syntax Error: DURATION',
          severity: monaco.MarkerSeverity.Warning,
        },
      ]
    }
    if (!/^\d{1,}[mhdwM]\s*$/.test(remStr)) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + correctStr.length + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + correctStr.length + remStr?.length + 1,
          message: 'Syntax Error: DURATION',
          severity: monaco.MarkerSeverity.Error,
        },
      ]
    }
  } else {
    return [
      {
        // startLineNumber: model.getPositionAt(i).lineNumber,
        startColumn: pos + correctStr.length + 1,
        // endLineNumber: model.getPositionAt(i).lineNumber,
        endColumn: pos + correctStr.length + remStr?.length + 1,
        message: 'Syntax Error: DURATION :: Unwanted',
        severity: monaco.MarkerSeverity.Error,
      },
    ]
  }

  return []
}

const checkLimitFirstLast = (query, pos, lastPipe) => {
  let correctStr = ''
  let remStr = ''

  let arr = [...query.matchAll(/^(\|\s*(limit|first|last)\s*)/gim)][0]
  if (arr?.length > 0) {
    correctStr += arr[0]
    remStr = query.slice(correctStr.length) || ''
  }
  if (remStr === '') {
    if (lastPipe) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + correctStr.length,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + correctStr.length + remStr?.length + 1,
          message: `LIMIT/FIRST/LAST: Empty Pipe`,
          severity: monaco.MarkerSeverity.Warning,
        },
      ]
    } else {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + correctStr.length + 1,
          message: `LIMIT/FIRST/LAST: Empty Pipe`,
          severity: monaco.MarkerSeverity.Error,
        },
      ]
    }
  }
  if (!/^(\d{1,})\s*$/.test(remStr)) {
    return [
      {
        // startLineNumber: model.getPositionAt(i).lineNumber,
        startColumn: pos + correctStr.length + 1,
        // endLineNumber: model.getPositionAt(i).lineNumber,
        endColumn: pos + correctStr.length + remStr?.length + 1,
        message: 'Syntax Error: LIMIT/FIRST/LAST',
        severity: monaco.MarkerSeverity.Error,
      },
    ]
  }

  return []
}

const checkTimeslice = (query, pos, lastPipe) => {
  let correctStr = ''
  let remStr = ''
  let arr = [...query.matchAll(/^(\|\s*timeslice\s*)/gim)][0]
  if (arr?.length > 0) {
    correctStr += arr[0]
    remStr = query.slice(correctStr.length) || ''
  }
  if (remStr === '') {
    if (lastPipe) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + correctStr.length,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + correctStr.length + remStr?.length + 1,
          message: `TIMESLICE: Empty pipe`,
          severity: monaco.MarkerSeverity.Warning,
        },
      ]
    } else {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + correctStr.length + 1,
          message: `TIMESLICE: Empty pipe`,
          severity: monaco.MarkerSeverity.Error,
        },
      ]
    }
  }
  if (!/^\d{1,}[mhdwM]\s*$/.test(remStr)) {
    return [
      {
        // startLineNumber: model.getPositionAt(i).lineNumber,
        startColumn: pos + correctStr.length + 1,
        // endLineNumber: model.getPositionAt(i).lineNumber,
        endColumn: pos + correctStr.length + remStr?.length + 1,
        message: 'Syntax Error: TIMESLICE',
        severity: monaco.MarkerSeverity.Error,
      },
    ]
  }
  return []
  // if (!/\b[tT][iI][mM][eE][sS][lL][iI][cC][eE]\b\s+(1m|1h)/.test(query))
  //   return { isValid: false, message: 'For timeslice pipe, please write "1m" or "1h"' }
  // else return { isValid: true, message: 'Valid Query' }
}

const checkForStreamsAndWhere = (
  query,
  streamList,
  selectedStream,
  fieldsList,
  streams,
  pipesExist,
) => {
  let whereSplit = splitingQuery(query, '', true, true, 'streamsWhere')
  let queryArr = whereSplit.splittedArray
  console.log(queryArr, whereSplit)
  let correctStr = ''
  let remStr = ''
  let arr = [...queryArr[0].matchAll(/^(\s*stream\s*=\s*)?/gim)][0]
  if (arr?.length > 0) {
    correctStr += arr[0]
    remStr = queryArr[0].slice(correctStr.length) || ''
  }
  if (remStr !== '') {
    let streams = splitingQuery(remStr, ',', false).splittedArray

    for (let i = 0; i < streams.length; i++) {
      if (streams.length === 1 && streams[0].trim() === '*') {
        correctStr += streams[0]
        remStr = query.slice(correctStr.length)
        selectedStream.push(streams[i])
        break
      }
      if (streams[i].trim() === '*') {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: correctStr.length + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: correctStr.length + streams[i].length + 2,
            message: 'Syntax Error: STREAM :: cannot have multiple stream name with "*"',
            severity: monaco.MarkerSeverity.Error,
          },
        ]
      }
      if (streams[i]?.trim() === '' && i === streams.length - 1) {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: correctStr.length + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: correctStr.length + streams[i].length + 2,
            message: 'Syntax Error: STREAM',
            severity: monaco.MarkerSeverity.Warning,
          },
        ]
      }
      if (!/^([a-zA-Z-]+|\*)$/m.test(streams[i]?.trim())) {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: correctStr.length + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: correctStr.length + streams[i].length + 2,
            message: 'Syntax Error: STREAM',
            severity: monaco.MarkerSeverity.Error,
          },
        ]
      } else if (/^([a-zA-Z-]+|\*)$/m.test(streams[i]?.trim())) {
        if (streamList.includes(streams[i].trim().toUpperCase())) {
          correctStr += i > 0 ? ',' + streams[i] : '' + streams[i]
          remStr = query.slice(correctStr.length)
          selectedStream.push(streams[i])
        } else {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: correctStr.length + 1,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: correctStr.length + streams[i].length + 2,
              message: 'Syntax Error: STREAM',
              severity: monaco.MarkerSeverity.Warning,
            },
          ]
        }
      }
    }
    // return []
  } else {
    if (!pipesExist && queryArr.length === 1) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: correctStr.length,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: correctStr.length + remStr?.length + 1,
          message: `STREAM: Write stream name`,
          severity: monaco.MarkerSeverity.Warning,
        },
      ]
      // } else {
      //   return [
      //     {
      //       // startLineNumber: model.getPositionAt(i).lineNumber,
      //       startColumn: 1,
      //       // endLineNumber: model.getPositionAt(i).lineNumber,
      //       endColumn: correctStr.length + 1,
      //       message: `STREAM: Empty stream clause`,
      //       severity: monaco.MarkerSeverity.Error,
      //     },
      //   ]
    }
  }

  // else if where clause
  if (queryArr.length === 1 && whereSplit.charPos.length > 0) {
    return [
      {
        // startLineNumber: model.getPositionAt(i).lineNumber,
        startColumn: correctStr.length + 1,
        // endLineNumber: model.getPositionAt(i).lineNumber,
        endColumn: correctStr.length + remStr?.length + 2,
        message: `STREAM: write after "WHERE"`,
        severity: monaco.MarkerSeverity.Warning,
      },
    ]
  }

  if (queryArr.length === 2 && whereSplit.charPos.length === 1) {
    if (selectedStream[0].trim() === '*') {
      fieldsList = [...new Set(fieldsList.concat(...Object.values(streams)))]
    } else {
      selectedStream.forEach(element => {
        fieldsList = [...new Set(fieldsList.concat(streams[element.trim().toUpperCase()]))]
      })
    }
    fieldsList = fieldsList?.map(item => item.replace('$', '').toLowerCase())

    if (
      query.split(
        /^\s*(stream=(?:(?:[a-zA-Z0-9_-]+(?:\s*,\s*[a-zA-Z0-9_-]+)*\s+))|\*)(?:where|\|)?/gim,
      ).length > 0
    ) {
      correctStr = queryArr[0] + ' where '
      remStr = query.slice(correctStr.length)
      let res = separatingFromBrackets(remStr, false)
      console.log(res)
      let errorMsg = []
      let strObj = { correctStr: correctStr, remStr: remStr }
      console.log('fieldsList', fieldsList)
      for (let k = 0; k < res.splittedArray.length; k++) {
        let err = validatingWhereConditions(
          res.splittedArray[k],
          res.separators[k],
          query,
          strObj,
          fieldsList,
          selectedStream,
        )
        if (err && err[0] !== undefined) {
          errorMsg = errorMsg.concat(err)
        }
        if (errorMsg.length > 0) {
          console.log(query, errorMsg)
          let ind = getIndexOfSubstring(query, errorMsg[0].query)
          errorMsg[0].startColumn = ind + 1
          errorMsg[0].endColumn = ind + errorMsg[0].query.length + 1
          return errorMsg
        }
      }
      // for (let i = 0; i < errorMsg.length; i++) {
      //   if (errorMsg[i]) {
      //     return [errorMsg[i]]
      //   }
      // }
      correctStr = strObj.correctStr
      remStr = strObj.remStr
    }
  }

  if (queryArr.length > 2 || whereSplit.charPos.length > 1) {
    return [
      {
        // startLineNumber: model.getPositionAt(i).lineNumber,
        startColumn: correctStr.length + 1,
        // endLineNumber: model.getPositionAt(i).lineNumber,
        endColumn: correctStr.length + remStr?.length + 2,
        message: `STREAM: repeated WHERE`,
        severity: monaco.MarkerSeverity.Error,
      },
    ]
  }

  return []
}

function splitingQuery(value, ch, addCh, addBrackets, word) {
  if (ch) {
    if (!addBrackets) {
      let quotes = {
        "'": false,
        '"': false,
      }
      let charPos = []
      let str = ''
      let splittedArray = []
      for (let i = 0; i < value.length; i++) {
        if (value[i] === "'") {
          quotes["'"] = !quotes["'"]
        } else if (value[i] === '"') {
          quotes['"'] = !quotes['"']
        }

        if (value[i] === ch && !quotes['"'] && !quotes["'"]) {
          charPos.push(i)
          splittedArray.push(str)
          if (addCh === true) {
            str = ch
          } else {
            str = ''
          }
        } else {
          str += value[i]
        }

        if (i === value.length - 1) {
          splittedArray.push(str)
          str = ''
        }
      }
      return { splittedArray, charPos }
    } else {
      let quotes = {
        "'": false,
        '"': false,
      }
      let bracketCount = 0
      let charPos = []
      let str = ''
      let splittedArray = []
      for (let i = 0; i < value.length; i++) {
        if (value[i] === "'") {
          quotes["'"] = !quotes["'"]
        } else if (value[i] === '"') {
          quotes['"'] = !quotes['"']
        }

        if (value[i] === '(' && !quotes["'"] && !quotes['"']) {
          bracketCount++
        } else if (value[i] === ')' && !quotes["'"] && !quotes['"']) {
          bracketCount--
        }

        if (value[i] === ',' && !quotes['"'] && !quotes["'"] && bracketCount === 0) {
          charPos.push(i)
          splittedArray.push(str)
          str = ''
        } else {
          str += value[i]
        }
        if (i === value.length - 1) {
          splittedArray.push(str)
          str = ''
        }
      }
      return { splittedArray, charPos }
    }
  }
  if (word === 'having') {
    if (!addBrackets) {
      let splittedArray = []
      let charPos = []
      let currentSegment = ''
      let quotes = {
        "'": false,
        '"': false,
      }

      for (let i = 0; i < value.length; i++) {
        const char = value[i]
        if (char === "'" && !quotes['"']) {
          quotes["'"] = !quotes["'"]
          currentSegment += char
          continue
        }

        if (char === '"' && !quotes["'"]) {
          quotes['"'] = !quotes['"']
          currentSegment += char
          continue
        }

        if (!quotes["'"] && !quotes['"']) {
          if (/^\sand\s$/m.test(value.slice(i, i + 5))) {
            charPos.push(i)
            splittedArray.push(currentSegment)
            currentSegment = ''
            i += 4
            continue
          } else if (/^\sor\s$/m.test(value.slice(i, i + 4))) {
            charPos.push(i)
            splittedArray.push(currentSegment)
            currentSegment = ''
            i += 3
            continue
          }
        }

        currentSegment += char
      }

      if (currentSegment) {
        splittedArray.push(currentSegment)
      }

      return { splittedArray, charPos }
    } else {
      let splittedArray = []
      let charPos = []
      let currentSegment = ''
      let bracketCount = 0
      let quotes = {
        "'": false,
        '"': false,
      }

      for (let i = 0; i < value.length; i++) {
        const char = value[i]
        if (char === "'" && !quotes['"']) {
          quotes["'"] = !quotes["'"]
          currentSegment += char
          continue
        }

        if (char === '"' && !quotes["'"]) {
          quotes['"'] = !quotes['"']
          currentSegment += char
          continue
        }

        if (value[i] === '(' && !quotes["'"] && !quotes['"']) {
          bracketCount++
        } else if (value[i] === ')' && !quotes["'"] && !quotes['"']) {
          bracketCount--
        }

        if (!quotes["'"] && !quotes['"'] && bracketCount === 0) {
          if (/^\sand\s$/m.test(value.slice(i, i + 5))) {
            charPos.push(i)
            splittedArray.push(currentSegment)
            currentSegment = ''
            i += 4
            continue
          } else if (/^\sor\s$/m.test(value.slice(i, i + 4))) {
            charPos.push(i)
            splittedArray.push(currentSegment)
            currentSegment = ''
            i += 3
            continue
          }
        }

        currentSegment += char
      }

      if (currentSegment) {
        splittedArray.push(currentSegment)
      }

      return { splittedArray, charPos }
    }
  } else if (word === 'streamsWhere') {
    if (!addBrackets) {
      let splittedArray = []
      let charPos = []
      let currentSegment = ''
      let quotes = {
        "'": false,
        '"': false,
      }

      for (let i = 0; i < value.length; i++) {
        const char = value[i]
        if (char === "'" && !quotes['"']) {
          quotes["'"] = !quotes["'"]
          currentSegment += char
          continue
        }

        if (char === '"' && !quotes["'"]) {
          quotes['"'] = !quotes['"']
          currentSegment += char
          continue
        }

        if (!quotes["'"] && !quotes['"']) {
          if (/^\swhere\s$/im.test(value.slice(i, i + 7))) {
            charPos.push(i)
            splittedArray.push(currentSegment)
            currentSegment = ''
            i += 6
            continue
          }
        }

        currentSegment += char
      }

      if (currentSegment.trim()) {
        splittedArray.push(currentSegment)
      }

      return { splittedArray, charPos }
    } else {
      let splittedArray = []
      let charPos = []
      let currentSegment = ''
      let bracketCount = 0
      let quotes = {
        "'": false,
        '"': false,
      }

      for (let i = 0; i < value.length; i++) {
        const char = value[i]
        if (char === "'" && !quotes['"']) {
          quotes["'"] = !quotes["'"]
          currentSegment += char
          continue
        }

        if (char === '"' && !quotes["'"]) {
          quotes['"'] = !quotes['"']
          currentSegment += char
          continue
        }

        if (value[i] === '(' && !quotes["'"] && !quotes['"']) {
          bracketCount++
        } else if (value[i] === ')' && !quotes["'"] && !quotes['"']) {
          bracketCount--
        }

        if (!quotes["'"] && !quotes['"'] && bracketCount === 0) {
          if (/^\swhere\s$/im.test(value.slice(i, i + 7))) {
            charPos.push(i)
            splittedArray.push(currentSegment)
            currentSegment = ''
            i += 6
            continue
          }
        }

        currentSegment += char
      }

      if (currentSegment.trim()) {
        splittedArray.push(currentSegment)
      }

      return { splittedArray, charPos }
    }
  } else if (word === 'havingCond') {
    let splittedArray = []
    let charPos = []
    let currentSegment = ''
    let bracketCount = 0
    let quotes = {
      "'": false,
      '"': false,
    }

    for (let i = 0; i < value.length; i++) {
      const char = value[i]
      if (char === "'" && !quotes['"']) {
        quotes["'"] = !quotes["'"]
        currentSegment += char
        continue
      }

      if (char === '"' && !quotes["'"]) {
        quotes['"'] = !quotes['"']
        currentSegment += char
        continue
      }

      if (value[i] === '(' && !quotes["'"] && !quotes['"']) {
        bracketCount++
      } else if (value[i] === ')' && !quotes["'"] && !quotes['"']) {
        bracketCount--
      }

      if (!quotes["'"] && !quotes['"'] && bracketCount === 0) {
        // /(<=|>=|==|!=|<|>)/
        if (/^(<=|>=|==|!=)$/m.test(value.slice(i, i + 2))) {
          let char = /^(<=|>=|==|!=)$/m.exec(value.slice(i, i + 2))[0]
          charPos.push(i)
          splittedArray.push(currentSegment)
          splittedArray.push(char)
          currentSegment = ''
          i += 1
          continue
        } else if (/^(<|>)$/m.test(value.slice(i, i + 1))) {
          let char = /^(<|>)$/m.exec(value.slice(i, i + 1))[0]
          charPos.push(i)
          splittedArray.push(currentSegment)
          splittedArray.push(char)
          currentSegment = ''
          i += 0
          continue
        }
      }

      currentSegment += char
    }

    if (currentSegment) {
      splittedArray.push(currentSegment)
    }

    return { splittedArray, charPos }
  }
}

function checkBetween(value) {
  let splittedArray = []
  let currentSegment = ''
  let bracketCount = 0
  let quotes = {
    "'": false,
    '"': false,
  }

  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    if (char === "'" && !quotes['"']) {
      quotes["'"] = !quotes["'"]
      currentSegment += char
      continue
    }

    if (char === '"' && !quotes["'"]) {
      quotes['"'] = !quotes['"']
      currentSegment += char
      continue
    }

    if (value[i] === '(' && !quotes["'"] && !quotes['"']) {
      bracketCount++
    } else if (value[i] === ')' && !quotes["'"] && !quotes['"']) {
      bracketCount--
    }

    if (!quotes["'"] && !quotes['"'] && bracketCount === 0) {
      if (/^\sbetween\s$/im.test(value.slice(i, i + 9))) {
        splittedArray.push(currentSegment)
        currentSegment = ''
        i += 8
        continue
      }
    }

    currentSegment += char
  }

  if (currentSegment) {
    splittedArray.push(currentSegment)
  }

  return splittedArray.length > 1
}

function separatingFromBrackets(value, flag) {
  let quotes = {
    "'": false,
    '"': false,
  }
  let bracketCount = 0
  let str = ''
  let ignoreBracketCount = 0
  let splittedArray = []
  let isBetween = false
  let separators = []

  for (let i = 0; i < value.length; i++) {
    if (i === 0 && value[0] === '(' && value[value.length - 1] === ')') {
      continue
    }

    if (i === value.length - 1 && value[0] === '(' && value[value.length - 1] === ')') {
      continue
    }

    str += value[i]

    if (value[i] === "'") {
      quotes["'"] = !quotes["'"]
    } else if (value[i] === '"') {
      quotes['"'] = !quotes['"']
    }

    if (!quotes["'"] && !quotes['"']) {
      if (value[i] === '(') {
        if (i !== 0 && ignoreBracketCount === 0 && (value[i - 1] === ' ' || value[i] === '(')) {
          bracketCount++
        } else {
          ignoreBracketCount++
        }
      } else if (value[i] === ')') {
        if (ignoreBracketCount > 0) {
          ignoreBracketCount--
        } else {
          bracketCount--
        }
      }
      if (bracketCount === 0 && ignoreBracketCount === 0) {
        if (!flag) {
          if (/^\sand\s$/im.test(value.slice(i, i + 5))) {
            //   check for between
            if (isBetween) {
              splittedArray.push(str)
              str = ''
              i += 4
              separators.push(' AND ')
              isBetween = false
              continue
            }
            if (checkBetween(str, 'between') && !isBetween) {
              isBetween = true
              continue
            }
            splittedArray.push(str)
            separators.push(' AND ')
            str = ''
            i += 4
          } else if (/^\sor\s$/im.test(value.slice(i, i + 4))) {
            if (isBetween) {
              isBetween = false
            }
            splittedArray.push(str)
            separators.push(' OR ')
            str = ''
            i += 3
          }
        } else {
          if (/^\sand\s$/m.test(value.slice(i, i + 5))) {
            splittedArray.push(str.slice(0, str.length - 1))
            separators.push(' and ')
            str = ''
            i += 4
          } else if (/^\sor\s$/m.test(value.slice(i, i + 4))) {
            splittedArray.push(str.slice(0, str.length - 1))
            separators.push(' or ')
            str = ''
            i += 3
          }
        }
      }
    }
  }
  splittedArray.push(str)

  return { splittedArray, separators }
}

function validatingWhereConditions(value, separator, query, strObj, fieldsList, selectedStream) {
  let errMsg = []
  if (/^(?:not\s+)?\((.+)\)$/gim.test(value.trim())) {
    let res = separatingFromBrackets(/^(?:not\s+)?\((.+)\)$/gim.exec(value.trim())[1].trim(), false)
    for (let i = 0; i < res.splittedArray.length; i++) {
      let err = validatingWhereConditions(
        res.splittedArray[i],
        separator,
        query,
        strObj,
        fieldsList,
        selectedStream,
      )
      if (err && err[0]) {
        errMsg = errMsg.concat(err)
      }
      if (errMsg.length > 0) {
        return errMsg
      }
    }
    return errMsg
  } else {
    console.log('val:', value)
    // like
    if (
      /^(?:\(?\s*not\s+)?\(*\s*(?:(("[^\n"]*")|('[^\n']*'))|(@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?)|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?\s+(not\s*like|like)\s*\(?\s*(?:(("[^\n"]*")|('[^\n']*'))|(@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?)|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?\s*\)?$/gim.test(
        value.trim(),
      )
    ) {
      if (
        /^(?:\(?\s*not\s+)?\(?\s*(?:(@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?)|([a-zA-Z0-9_-]+))\s+(not\s*like|like)\s*\(?\s*(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?\s*\)?$/gim.test(
          value.trim(),
        )
      ) {
        if (!/^@/.test(value.trim())) {
          let temp = /^(?:\(?\s*not\s+)?\(?\s*(?:(@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?)|([a-zA-Z0-9_-]+))\s+(not\s*like|like)\s*\(?\s*(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?\s*\)?$/gim.exec(
            value.trim(),
          )
          console.log(temp)
          if (!(temp && temp[6] && fieldsList.includes(temp[6].trim()))) {
            return [
              {
                // startLineNumber: model.getPositionAt(i).lineNumber,
                startColumn: strObj.correctStr.length + 1,
                // endLineNumber: model.getPositionAt(i).lineNumber,
                endColumn: strObj.correctStr.length + value.length + 1,
                message: 'Syntax Error: WHERE :: not a valid field name',
                severity: monaco.MarkerSeverity.Error,
                query: value,
              },
            ]
          }
        }
      } else if (
        /^(?:\(?\s*not\s+)?\(*\s*(?:((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\)))\s*\)?\s+(not\s*like|like)\s*\(?\s*(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?\s*\)?$/gim.test(
          value.trim(),
        )
      ) {
        let fun = /^(?:\(?\s*not\s+)?\(*\s*(?:((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\)))\s*\)?\s+(not\s*like|like)\s*\(?\s*(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?\s*\)?$/gim.exec(
          value.trim(),
        )
        let arr = []
        let func = []
        if (fun && fun[1]) {
          arr = columnExtract(fun[1], 'where-all', func)
          console.log(func)
        }
        if (arr.length > 0 || func.length > 0) {
          let invalidField = 0
          arr.forEach(element => {
            if (
              !fieldsList.includes(element.trim().toLowerCase()) &&
              !/^@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?$/gm.test(element.trim())
            ) {
              invalidField++
            }
          })
          if (invalidField === 0) {
            strObj.correctStr += value + separator
            strObj.remStr = query.slice(strObj.correctStr.length)
          } else {
            return [
              {
                // startLineNumber: model.getPositionAt(i).lineNumber,
                startColumn: strObj.correctStr.length + 1,
                // endLineNumber: model.getPositionAt(i).lineNumber,
                endColumn: strObj.correctStr.length + value.length + 1,
                message: 'Syntax Error: WHERE :: not a valid field in the function',
                severity: monaco.MarkerSeverity.Error,
                query: value,
              },
            ]
          }
        } else {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: strObj.correctStr.length + 1,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: strObj.correctStr.length + value.length + 1,
              message: 'Syntax Error: WHERE :: not a function',
              severity: monaco.MarkerSeverity.Error,
              query: value,
            },
          ]
        }
      }
    }

    // in
    else if (
      /^(?:\(?\s*not\s+)?\(??\s*(?:(?:(?:"[^\n"]*")|(?:'[^\n']*'))|(@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?)|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*(not\s+in|in)\s*(?:\(*(?:(?:"[^\n"]*")|(?:'[^\n']*'))(?:\s*,\s*(?:(?:"[^\n"]*")|(?:'[^\n']*')))*\s*\)*)\s*?$/gim.test(
        value.trim(),
      )
    ) {
      if (
        /^(?:\(?\s*not\s+)?\(?\s*(?:([a-zA-Z-]+))\s*(not\s+in|in)\s*(?:\(*(?:(?:"[^\n"]*")|(?:'[^\n']*'))(?:\s*,\s*(?:(?:"[^\n"]*")|(?:'[^\n']*')))*\s*\)*)\s*?$/gim.test(
          value.trim(),
        )
      ) {
        let temp = /^(?:\(?\s*not\s+)?\(?\s*(?:([a-zA-Z-]+))\s*(not\s+in|in)\s*(?:\(*(?:(?:"[^\n"]*")|(?:'[^\n']*'))(?:\s*,\s*(?:(?:"[^\n"]*")|(?:'[^\n']*')))*\s*\)*)\s*?$/gim.exec(
          value.trim(),
        )
        if (!(temp && temp[1] && fieldsList.includes(temp[1].trim()))) {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: strObj.correctStr.length + 1,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: strObj.correctStr.length + value.length + 1,
              message: 'Syntax Error: WHERE :: not a valid field name',
              severity: monaco.MarkerSeverity.Error,
              query: value,
            },
          ]
        }
      } else if (
        /^(?:\(?\s*not\s+)?\(?\s*(?:((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\)))\s*(not\s+in|in)\s*(?:\(*(?:(?:"[^\n"]*")|(?:'[^\n']*'))(?:\s*,\s*(?:(?:"[^\n"]*")|(?:'[^\n']*')))*\s*\)*)\s*?$/gim.test(
          value.trim(),
        )
      ) {
        let fun = /^(?:\(?\s*not\s+)?\(?\s*(?:((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\)))\s*(not\s+in|in)\s*(?:\(*(?:(?:"[^\n"]*")|(?:'[^\n']*'))(?:\s*,\s*(?:(?:"[^\n"]*")|(?:'[^\n']*')))*\s*\)*)\s*?$/gim.exec(
          value.trim(),
        )
        let arr = []
        let func = []
        if (fun && fun[1]) {
          arr = columnExtract(fun[1], 'where-all', func)
          console.log(func)
        }
        if (arr.length > 0 || func.length > 0) {
          let invalidField = 0
          arr.forEach(element => {
            if (
              !fieldsList.includes(element.trim().toLowerCase()) &&
              !/^@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?$/gm.test(element.trim())
            ) {
              invalidField++
            }
          })
          if (invalidField === 0) {
            strObj.correctStr += value + separator
            strObj.remStr = query.slice(strObj.correctStr.length)
          } else {
            return [
              {
                // startLineNumber: model.getPositionAt(i).lineNumber,
                startColumn: strObj.correctStr.length + 1,
                // endLineNumber: model.getPositionAt(i).lineNumber,
                endColumn: strObj.correctStr.length + value.length + 1,
                message: 'Syntax Error: WHERE :: not a valid field in the function',
                severity: monaco.MarkerSeverity.Error,
                query: value,
              },
            ]
          }
        } else {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: strObj.correctStr.length + 1,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: strObj.correctStr.length + value.length + 1,
              message: 'Syntax Error: WHERE :: not a function',
              severity: monaco.MarkerSeverity.Error,
              query: value,
            },
          ]
        }
      }
    }

    // . is null | . is not null
    else if (
      /^(?:\(?\s*not\s+)?\(?\s*(?:(("[^\n"]*")|('[^\n']*'))|(@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?)|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*(?:is|is\s+not)\s+null\s*\)?$/gim.test(
        value.trim(),
      )
    ) {
      if (
        /^(?:\(?\s*not\s+)?\(?\s*(?:([a-zA-Z0-9_-]+))\s*(?:is|is\s+not)\s+null\s*\)?$/gim.test(
          value.trim(),
        )
      ) {
        let temp = /^(?:\(?\s*not\s+)?\(?\s*(?:([a-zA-Z0-9_-]+))\s*(?:is|is\s+not)\s+null\s*\)?$/gim.exec(
          value.trim(),
        )
        if (!(temp && temp[1] && fieldsList.includes(temp[1].trim()))) {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: strObj.correctStr.length + 1,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: strObj.correctStr.length + value.length + 1,
              message: 'Syntax Error: WHERE :: not a valid field name',
              severity: monaco.MarkerSeverity.Error,
              query: value,
            },
          ]
        }
      } else if (
        /^(?:\(?\s*not\s+)?\(?\s*(?:((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\)))\s*(?:is|is\s+not)\s+null\s*\)?$/gim.test(
          value.trim(),
        )
      ) {
        let fun = /^(?:\(?\s*not\s+)?\(?\s*(?:((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\)))\s*(?:is|is\s+not)\s+null\s*\)?$/gim.exec(
          value.trim(),
        )
        let arr = []
        let func = []
        if (fun && fun[1]) {
          arr = columnExtract(fun[1], 'where-all', func)
          console.log(func)
        }
        if (arr.length > 0 || func.length > 0) {
          let invalidField = 0
          arr.forEach(element => {
            if (
              !fieldsList.includes(element.trim().toLowerCase()) &&
              !/^@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?$/gm.test(element.trim())
            ) {
              invalidField++
            }
          })
          if (invalidField === 0) {
            strObj.correctStr += value + separator
            strObj.remStr = query.slice(strObj.correctStr.length)
          } else {
            return [
              {
                // startLineNumber: model.getPositionAt(i).lineNumber,
                startColumn: strObj.correctStr.length + 1,
                // endLineNumber: model.getPositionAt(i).lineNumber,
                endColumn: strObj.correctStr.length + value.length + 1,
                message: 'Syntax Error: WHERE :: not a valid field in the function',
                severity: monaco.MarkerSeverity.Error,
                query: value,
              },
            ]
          }
        } else {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: strObj.correctStr.length + 1,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: strObj.correctStr.length + value.length + 1,
              message: 'Syntax Error: WHERE :: not a function',
              severity: monaco.MarkerSeverity.Error,
              query: value,
            },
          ]
        }
      }
    } else if (/^(?:not\s+)?(\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\)$/gm.test(value.trim())) {
      let fun = /^(?:not\s+)?((\w+|[|~!=%&*+-\/<>^]+)\(\s*(.+)\s*\))$/gm.exec(value.trim())
      console.log(fun)
      let arr = []
      let func = []
      if (fun && fun[1]) {
        arr = columnExtract(fun[1], 'where-boolean', func)
        console.log(func)
      }
      console.log(arr)
      if (arr.length > 0 || func.length > 0) {
        let invalidField = 0
        arr.forEach(element => {
          if (
            !fieldsList.includes(element.trim().toLowerCase()) &&
            !/^@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?$/gm.test(element.trim())
          ) {
            invalidField++
          }
        })
        if (invalidField === 0) {
          strObj.correctStr += value + separator
          strObj.remStr = query.slice(strObj.correctStr.length)
        } else {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: strObj.correctStr.length + 1,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: strObj.correctStr.length + value.length + 1,
              message: 'Syntax Error: WHERE :: not a valid field in the boolean function',
              severity: monaco.MarkerSeverity.Error,
              query: value,
            },
          ]
        }
      } else {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: strObj.correctStr.length + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: strObj.correctStr.length + value.length + 1,
            message: 'Syntax Error: WHERE :: not a boolean function',
            severity: monaco.MarkerSeverity.Error,
            query: value,
          },
        ]
      }
    }
    // conditions having operators
    else if (
      /^(?:\(?\s*not\s+)?\(?\s*(?:(("[^\n"]*")|('[^\n']*'))|(@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?)|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*(?:<=|>=|<|>|=|!=|<>)\s*\(?(?:(("[^\n"]*")|('[^\n']*'))|(@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?)|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?$/gim.test(
        value.trim(),
      )
    ) {
      //first half
      if (
        /^(?:\(?\s*not\s+)?\(?\s*(?:((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|)\s*(?:<=|>=|<|>|=|!=|<>)\s*(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?$/gim.test(
          value.trim(),
        )
      ) {
        // functions verification
        let tempWord = /^(?:\(?\s*not\s+)?(?:(\(?\s*(\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|)\s*(?:<=|>=|<|>|=|!=|<>)\s*(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?$/gim.exec(
          value.trim(),
        )[1]
        let fun = /^(\(?\s*(\w+|[|~!=%&*+-\/<>^]+)\(\s*(.+)\s*\))$/gm.exec(tempWord)
        let arr = []
        let func = []
        if (fun && fun[1]) {
          arr = columnExtract(fun[1], 'where-all', func)
          console.log(func)
        }
        console.log(arr)
        let invalidField = 0
        if (arr.length > 0 || func.length > 0) {
          // check for every fieldnames extracted from arr should be valid
          arr.forEach(element => {
            if (
              !fieldsList.includes(element.trim().toLowerCase()) &&
              !/^@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?$/gm.test(element.trim())
            ) {
              invalidField++
            }
          })
          if (invalidField > 0) {
            return [
              {
                // startLineNumber: model.getPositionAt(i).lineNumber,
                startColumn: strObj.correctStr.length + 1,
                // endLineNumber: model.getPositionAt(i).lineNumber,
                endColumn: strObj.correctStr.length + value.length + 1,
                message: 'Syntax Error: WHERE :: not a valid field',
                severity: monaco.MarkerSeverity.Error,
                query: value,
              },
            ]
          }
        } else {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: strObj.correctStr.length + 1,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: strObj.correctStr.length + value.length + 1,
              message: 'Syntax Error: WHERE :: not a valid function',
              severity: monaco.MarkerSeverity.Error,
              query: value,
            },
          ]
        }
      } else if (
        /^(?:\(?\s*not\s+)?\(?\s*(?:(\d+))\s*(?:<=|>=|<|>|=|!=|<>)\s*(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?$/gim.test(
          value.trim(),
        )
      ) {
        // digits
      } else if (
        /^(?:\(?\s*not\s+)?\(?\s*(?:(([a-zA-Z0-9_-]+)))\s*(?:<=|>=|<|>|=|!=|<>)\s*(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?$/gim.test(
          value.trim(),
        )
      ) {
        // field Names
        let tempWord = /^(?:\(?\s*not\s+)?\(?\s*([a-zA-Z0-9_-]+)\s*(?:<=|>=|<|>|=|!=|<>)\s*(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?$/gim.exec(
          value.trim(),
        )[1]
        if (!(tempWord && fieldsList.includes(tempWord.trim().toLowerCase()))) {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: strObj.correctStr.length + 1,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: strObj.correctStr.length + value.length + 1,
              message: 'Syntax Error: WHERE:: Invalid field name',
              severity: monaco.MarkerSeverity.Error,
              query: value,
            },
          ]
        }
      } else if (
        /^(?:\(?\s*not\s+)?\(?\s*(?:(("[^\n"]*")|('[^\n']*')))\s*(?:<=|>=|<|>|=|!=|<>)\s*(?:(("[^\n"]*")|('[^\n']*'))|(\(?\s*(\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?$/gim.test(
          value.trim(),
        )
      ) {
        // string
      }

      //second half
      if (
        /^(?:\(?\s*not\s+)?\(?\s*(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*(?:<=|>=|<|>|=|!=|<>)\s*(?:((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\)))\s*\)?$/gim.test(
          value.trim(),
        )
      ) {
        // functions verification
        let tempWord = /^(?:\(?\s*not\s+)?\(?\s*(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*(?:<=|>=|<|>|=|!=|<>)\s*(?:((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\)))\s*\)?$/gim.exec(
          value.trim(),
        )[9]

        let fun = /^((\w+|[|~!=%&*+-\/<>^]+)\(\s*(.+)\s*\))$/gm.exec(tempWord)
        let arr = []
        let func = []
        if (fun && fun[1]) {
          arr = columnExtract(fun[1], 'where-all', func)
          console.log(func)
        }
        console.log(arr)
        let invalidField = 0
        if (arr.length > 0 || func.length > 0) {
          arr.forEach(element => {
            if (
              !fieldsList.includes(element.trim().toLowerCase()) &&
              !/^@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?$/gm.test(element.trim())
            ) {
              invalidField++
            }
          })
          if (invalidField > 0) {
            return [
              {
                // startLineNumber: model.getPositionAt(i).lineNumber,
                startColumn: strObj.correctStr.length + 1,
                // endLineNumber: model.getPositionAt(i).lineNumber,
                endColumn: strObj.correctStr.length + value.length + 1,
                message: 'Syntax Error: WHERE :: not a valid field',
                severity: monaco.MarkerSeverity.Error,
                query: value,
              },
            ]
          }
        } else {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: strObj.correctStr.length + 1,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: strObj.correctStr.length + value.length + 1,
              message: 'Syntax Error: WHERE :: not a valid function',
              severity: monaco.MarkerSeverity.Error,
              query: value,
            },
          ]
        }
      } else if (
        /^(?:\(?\s*not\s+)?\(?\s*(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*(?:<=|>=|<|>|=|!=|<>)\s*(?:(\d+))\s*\)?$/gim.test(
          value.trim(),
        )
      ) {
        // digits
      } else if (
        /^(?:\(?\s*not\s+)?\(?\s*(?:(?:(?:"[^\n"]*")|(?:'[^\n']*'))|(?:(?:[\w|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(?:(?:[a-zA-Z0-9_-]+))|(?:\d+))\s*(?:<=|>=|<|>|=|!=|<>)\s*(?:(?:([a-zA-Z0-9_-]+)))\s*\)?$/gim.test(
          value.trim(),
        )
      ) {
        // field Names
        let tempWord = /^(?:\(?\s*not\s+)?\(?\s*(?:(?:(?:"[^\n"]*")|(?:'[^\n']*'))|(?:(?:[\w|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(?:(?:[a-zA-Z0-9_-]+))|(?:\d+))\s*(?:<=|>=|<|>|=|!=|<>)\s*(?:(?:([a-zA-Z0-9_-]+)))\s*\)?$/gim.exec(
          value.trim(),
        )[1]
        if (!(tempWord && fieldsList.includes(tempWord.trim().toLowerCase()))) {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: strObj.correctStr.length + 1,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: strObj.correctStr.length + value.length + 1,
              message: 'Syntax Error: WHERE:: Invalid field name',
              severity: monaco.MarkerSeverity.Error,
              query: value,
            },
          ]
        }
      } else if (
        /^(?:\(?\s*not\s+)?\(?\s*(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*(?:<=|>=|<|>|=|!=|<>)\s*(?:(("[^\n"]*")|('[^\n']*')))\s*\)?$/gim.test(
          value.trim(),
        )
      ) {
        // string
      }

      strObj.correctStr += value + separator
      strObj.remStr = query.slice(strObj.correctStr.length)
    }

    // between ... and
    else if (
      /^\(?(?:not\s+)?\s*(?:(("[^\n"]*")|('[^\n']*'))|(@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?)|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\bbetween\b\s*\(?(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?\s+\band\b\s+\(?(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?$/gim.test(
        value.trim(),
      )
    ) {
      if (
        /^\(?(?:not\s+)?\s*(?:([a-zA-Z]+))\s*\bbetween\b\s*\(?(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?\s+\band\b\s+\(?(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?$/gim.test(
          value.trim(),
        )
      ) {
        // check for valid field name
        let temp = /^\(?(?:not\s+)?\s*(?:([a-zA-Z]+))\s*\bbetween\b\s*\(?(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?\s+\band\b\s+\(?(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?$/gim.exec(
          value.trim(),
        )
        if (!(temp && temp[1] && fieldsList.includes(temp[1].trim()))) {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: strObj.correctStr.length + 1,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: strObj.correctStr.length + value.length + 1,
              message: 'Syntax Error: WHERE :: not a valid field name',
              severity: monaco.MarkerSeverity.Error,
              query: value,
            },
          ]
        }
      } else if (
        /^\(?(?:not\s+)?\s*(?:((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\)))\s*\bbetween\b\s*\(?(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?\s+\band\b\s+\(?(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?$/gim.test(
          value.trim(),
        )
      ) {
        // check for valid function
        let fun = /^\(?(?:not\s+)?\s*(?:((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\)))\s*\bbetween\b\s*\(?(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?\s+\band\b\s+\(?(?:(("[^\n"]*")|('[^\n']*'))|((\w+|[|~!=%&*+-\/<>^]+)\(\s*.+\s*\))|(([a-zA-Z0-9_-]+))|(\d+))\s*\)?$/gim.exec(
          value.trim(),
        )
        let arr = []
        let func = []
        if (fun && fun[1]) {
          arr = columnExtract(fun[1], 'where-all', func)
          console.log(func)
        }
        if (arr.length > 0 || func.length > 0) {
          let invalidField = 0
          arr.forEach(element => {
            if (
              !fieldsList.includes(element.trim().toLowerCase()) &&
              !/^@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?$/gm.test(element.trim())
            ) {
              invalidField++
            }
          })
          if (invalidField === 0) {
            strObj.correctStr += value + separator
            strObj.remStr = query.slice(strObj.correctStr.length)
          } else {
            return [
              {
                // startLineNumber: model.getPositionAt(i).lineNumber,
                startColumn: strObj.correctStr.length + 1,
                // endLineNumber: model.getPositionAt(i).lineNumber,
                endColumn: strObj.correctStr.length + value.length + 1,
                message: 'Syntax Error: WHERE :: not a valid field in the function',
                severity: monaco.MarkerSeverity.Error,
                query: value,
              },
            ]
          }
        } else {
          return [
            {
              // startLineNumber: model.getPositionAt(i).lineNumber,
              startColumn: strObj.correctStr.length + 1,
              // endLineNumber: model.getPositionAt(i).lineNumber,
              endColumn: strObj.correctStr.length + value.length + 1,
              message: 'Syntax Error: WHERE :: not a function',
              severity: monaco.MarkerSeverity.Error,
              query: value,
            },
          ]
        }
      }
      console.log('val:', value)
    }

    // else
    else {
      console.log('"WHERE" Invalid', value)
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: strObj.correctStr.length + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: strObj.correctStr.length + value.length + 1,
          message: 'Syntax Error: "WHERE" Invalid',
          severity: monaco.MarkerSeverity.Error,
          query: value,
        },
      ]
    }
  }
}

function validatingHavingConditions(value, separator, query, strObj, pos, havingFullFields) {
  let errMsg = []
  if (/^\((.+)\)$/gim.test(value.trim())) {
    let res = separatingFromBrackets(value.trim(), true)
    for (let i = 0; i < res.splittedArray.length; i++) {
      let err = validatingHavingConditions(
        res.splittedArray[i],
        separator,
        query,
        strObj,
        pos,
        havingFullFields,
        // fieldsList,
        // selectedStream,
      )
      if (err && err[0]) {
        errMsg = errMsg.concat(err)
      }
      if (errMsg.length > 0) {
        return errMsg
      }
    }
    return errMsg
  } else {
    console.log('val::::', value)
    console.log(splitingQuery(value, '', false, false, 'havingCond'))
    // let opers = value.trim().split(/(<=|>=|==|!=|<|>)/).filter((op) => (op !== undefined && op !== null && !/^\s*$/m.test(op)))
    let opers = splitingQuery(value, '', false, false, 'havingCond').splittedArray
    const operators = ['<=', '>=', '==', '!=', '<', '>']
    console.log(opers)
    if (opers.length === 0 || opers[0] === '') {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + strObj.correctStr.length + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + strObj.correctStr.length + value?.length + 1,
          message: `Error at 'having': Missing operand`,
          severity: monaco.MarkerSeverity.Error,
          query: value,
        },
      ]
    }
    // log Field
    if (opers[0].trim().includes('@')) {
      if (/^(?:(?:\w+)\s*[+\-*\/]\s*)@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?$/gm.test(opers[0].trim())) {
        let tempOpers = opers[0].trim().split(/[+\-*\/]/gm)
        havingFullFields.push([value, tempOpers[1]])
      } else if (/^@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?$/gm.test(opers[0].trim())) {
        havingFullFields.push([value, opers[0]])
      } else {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: pos + strObj.correctStr.length + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: pos + strObj.correctStr.length + value?.length + 1,
            message: `Error at 'having': Invalid operand-1, found "${opers[0]}"`,
            severity: monaco.MarkerSeverity.Error,
            query: value,
          },
        ]
      }
    }
    // check for function
    else if (
      !/^(?:(?:\w+)\s*[+\-*\/]\s*)?(?:(?:\w+)|(?:"[^\n"]*")|(?:'[^\n']*'))$/gm.test(opers[0].trim())
    ) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + strObj.correctStr.length + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + strObj.correctStr.length + value?.length + 1,
          message: `Error at 'having': Invalid operand, found "${opers[0]}"`,
          severity: monaco.MarkerSeverity.Error,
          query: value,
        },
      ]
    }
    if (
      /^(?:(?:\w+)\s*[+\-*\/]\s*)(?:(?:\w+))$/gm.test(opers[0].trim()) &&
      !/^(?:(?:\d+)\s*[+\-*\/]\s*)(?:(?:\w+))$/gm.test(opers[0].trim())
    ) {
      // field check
      let tempOpers = opers[0].trim().split(/[+\-*\/]/gm)
      havingFullFields.push([value, tempOpers[0]])
    }
    if (
      /^(?:(?:\w+)\s*[+\-*\/]\s*)(?:(?:\w+))$/gm.test(opers[0].trim()) &&
      !/^(?:(?:\w+)\s*[+\-*\/]\s*)(?:(?:\d+))$/gm.test(opers[0].trim())
    ) {
      // field check
      let tempOpers = opers[0].trim().split(/[+\-*\/]/gm)
      havingFullFields.push([value, tempOpers[1]])
    }
    if (/^(?:(?:\w+))$/gm.test(opers[0].trim()) && !/^(?:(?:\d+))$/gm.test(opers[0].trim())) {
      // field check
      havingFullFields.push([value, opers[0]])
    }

    if (opers[1] === undefined) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + strObj.correctStr.length + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + strObj.correctStr.length + value?.length + 1,
          message: `Error at 'having': Missing 'Comparison Operators(== < > >= <= !=)'`,
          severity: monaco.MarkerSeverity.Warning,
          query: value,
        },
      ]
    }
    if (!operators.includes(opers[1].trim())) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + strObj.correctStr.length + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + strObj.correctStr.length + value?.length + 1,
          message: `Error at 'having': Missing 'Comparison Operators(== < > >= <= !=)', found "${opers[1]}"`,
          severity: monaco.MarkerSeverity.Warning,
          query: value,
        },
      ]
    }

    if (opers[2] === undefined) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + strObj.correctStr.length + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + strObj.correctStr.length + value?.length + 1,
          message: `Error at 'having': Missing operand`,
          severity: monaco.MarkerSeverity.Warning,
          query: value,
        },
      ]
    }
    // log Field
    if (opers[2].trim().includes('@')) {
      if (/^(?:(?:\w+)\s*[+\-*\/]\s*)@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?$/gm.test(opers[2].trim())) {
        let tempOpers = opers[0].trim().split(/[+\-*\/]/gm)
        havingFullFields.push([value, tempOpers[1]])
      } else if (/^@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?$/gm.test(opers[2].trim())) {
        havingFullFields.push([value, opers[2]])
      } else {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: pos + strObj.correctStr.length + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: pos + strObj.correctStr.length + value?.length + 1,
            message: `Error at 'having': Invalid operand, found "${opers[2]}"`,
            severity: monaco.MarkerSeverity.Error,
            query: value,
          },
        ]
      }
    } else if (
      !/^(?:(?:\w+)\s*[+\-*\/]\s*)?(?:(?:\w+)|(?:"[^\n"]*")|(?:'[^\n']*'))$/gm.test(opers[2].trim())
    ) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + strObj.correctStr.length + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + strObj.correctStr.length + value?.length + 1,
          message: `Error at 'having': Invalid operand, found "${opers[2]}"`,
          severity: monaco.MarkerSeverity.Error,
          query: value,
        },
      ]
    }
    if (
      /^(?:(?:\w+)\s*[+\-*\/]\s*)(?:(?:\w+))$/gm.test(opers[2].trim()) &&
      !/^(?:(?:\d+)\s*[+\-*\/]\s*)(?:(?:\w+))$/gm.test(opers[2].trim())
    ) {
      // field check
      let tempOpers = opers[2].trim().split(/[+\-*\/]/gm)
      havingFullFields.push([value, tempOpers[0]])
    }
    if (
      /^(?:(?:\w+)\s*[+\-*\/]\s*)(?:(?:\w+))$/gm.test(opers[2].trim()) &&
      !/^(?:(?:\w+)\s*[+\-*\/]\s*)(?:(?:\d+))$/gm.test(opers[2].trim())
    ) {
      // field check
      let tempOpers = opers[2].trim().split(/[+\-*\/]/gm)
      havingFullFields.push([value, tempOpers[1]])
    }
    if (/^(?:(?:\w+))$/gm.test(opers[2].trim()) && !/^(?:(?:\d+))$/gm.test(opers[2].trim())) {
      // field check
      havingFullFields.push([value, opers[2]])
    }

    if (opers[3] && !operators.includes(opers[3].trim())) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + strObj.correctStr.length + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + strObj.correctStr.length + value?.length + 1,
          message: `Error at 'having': Missing 'Comparison Operators(== < > >= <= !=)', found "${opers[3]}"`,
          severity: monaco.MarkerSeverity.Warning,
          query: value,
        },
      ]
    }
    if (opers[3] !== undefined && opers[4] === undefined) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + strObj.correctStr.length + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + strObj.correctStr.length + value?.length + 1,
          message: `Error at 'having': Missing operand`,
          severity: monaco.MarkerSeverity.Warning,
          query: value,
        },
      ]
    }
    // log Field
    if (opers[3] !== undefined && opers[4].trim().includes('@')) {
      if (/^(?:(?:\w+)\s*[+\-*\/]\s*)@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?$/gm.test(opers[4].trim())) {
        let tempOpers = opers[4].trim().split(/[+\-*\/]/gm)
        havingFullFields.push([value, tempOpers[1]])
      } else if (/^@\w+(((\.\w+)|(\[\s*\d+\s*\]))+)?$/gm.test(opers[4].trim())) {
        havingFullFields.push([value, opers[4]])
      } else {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: pos + strObj.correctStr.length + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: pos + strObj.correctStr.length + value?.length + 1,
            message: `Error at 'having': Invalid operand, found "${opers[4]}"`,
            severity: monaco.MarkerSeverity.Error,
            query: value,
          },
        ]
      }
    } else if (
      opers[3] !== undefined &&
      !/^(?:(?:\w+)\s*[+\-*\/]\s*)?(?:(?:\w+)|(?:"[^\n"]*")|(?:'[^\n']*'))$/gm.test(opers[4].trim())
    ) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + strObj.correctStr.length + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + strObj.correctStr.length + value?.length + 1,
          message: `Error at 'having': Missing 'Comparison Operators(== < > >= <= !=)', found "${opers[4]}"`,
          severity: monaco.MarkerSeverity.Warning,
          query: value,
        },
      ]
    }
    if (
      opers[3] !== undefined &&
      /^(?:(?:\w+)\s*[+\-*\/]\s*)(?:(?:\w+))$/gm.test(opers[3].trim()) &&
      !/^(?:(?:\d+)\s*[+\-*\/]\s*)(?:(?:\w+))$/gm.test(opers[3].trim())
    ) {
      // field check
      let tempOpers = opers[3].trim().split(/[+\-*\/]/gm)
      havingFullFields.push([value, tempOpers[0]])
    }
    if (
      opers[3] !== undefined &&
      /^(?:(?:\w+)\s*[+\-*\/]\s*)(?:(?:\w+))$/gm.test(opers[3].trim()) &&
      !/^(?:(?:\w+)\s*[+\-*\/]\s*)(?:(?:\d+))$/gm.test(opers[3].trim())
    ) {
      // field check
      let tempOpers = opers[3].trim().split(/[+\-*\/]/gm)
      havingFullFields.push([value, tempOpers[1]])
    }
    if (
      opers[3] !== undefined &&
      /^(?:(?:\w+))$/gm.test(opers[4].trim()) &&
      !/^(?:(?:\d+))$/gm.test(opers[4].trim())
    ) {
      // field check
      havingFullFields.push([value, opers[4]])
    }

    if (opers.length > 5) {
      return [
        {
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pos + strObj.correctStr.length + 1,
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: pos + strObj.correctStr.length + value?.length + 1,
          message: `Error at 'having': Unknown found "${opers[5]}"`,
          severity: monaco.MarkerSeverity.Warning,
          query: value,
        },
      ]
    }

    strObj.correctStr += value + separator
    strObj.remStr = strObj.remStr.slice(value.length + separator.length - 1)
    console.log(strObj, value)
  }
}

function validatingHavingWithSelectAndGroupby(
  pipes,
  fieldsList,
  groupbyFields,
  selectFields,
  selectAggregate,
  selectAliases,
  selectFunction,
  selectFullField,
  havingFullFields,
) {
  console.log('HAVING')
  console.log('pipes', pipes)
  console.log('fields', fieldsList)
  console.log('gby:', groupbyFields)
  console.log('selectF', selectFields)
  console.log('selectAgg', selectAggregate)
  console.log('selectAlias', selectAliases)
  console.log('selectFun', selectFunction)
  console.log('selectFull', selectFullField)
  console.log('havingFullFields', havingFullFields)
  // only groupby -> count_col1 is allowed
  // JSON.parse(JSON.stringify(fieldsList))
  let fieldsListForHaving = []
  if (pipes['having'][0] !== -1) {
    if (pipes['timeslice'][0] !== -1) {
      fieldsListForHaving.push('count_col0')
      console.log('timeslice exist')
    }
    if (pipes['groupby'][0] !== -1 && pipes['select'][0] === -1) {
      fieldsListForHaving.push('count_col1')
      console.log('Groupby but not select')
    } else if (pipes['select'][0] !== -1) {
      for (let i = 0; i < selectFullField.length; i++) {
        if (selectFullField[i][1] === 'aggregate') {
          console.log(selectFullField[i][2][2])
          if (selectFullField[i][2][2] && selectFullField[i][2][2] !== '') {
            fieldsListForHaving.push(selectFullField[i][2][2].trim())
          } else {
            fieldsListForHaving.push(selectFullField[i][0].trim() + '_col' + i)
          }
        } else if (selectFullField[i][1] === 'nonAggregate') {
          console.log(selectFullField[i])
          if (selectFullField[i][3][2] && selectFullField[i][3][2] !== '') {
            fieldsListForHaving.push(selectFullField[i][3][2].trim())
          } else {
            fieldsListForHaving.push(selectFullField[i][2].trim() + '_col' + i)
          }
        } else if (selectFullField[i][1] === 'field' || selectFullField[i][1] === 'logField') {
          if (selectFullField[i][2][2] && selectFullField[i][2][2] !== '') {
            fieldsListForHaving.push(selectFullField[i][2][2].trim())
          } else {
            fieldsListForHaving.push(selectFullField[i][0].trim())
          }
        } else if (selectFullField[i][1] === 'allFields') {
        }
      }
      console.log('select exist', fieldsListForHaving)
    }

    for (let i = 0; i < havingFullFields.length; i++) {
      if (!fieldsListForHaving.includes(havingFullFields[i][1].toLowerCase().trim())) {
        return [
          {
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: havingFullFields[i][2],
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: havingFullFields[i][3],
            message: `Error at 'having': Unknown field "${havingFullFields[i][1].trim()}"`,
            severity: monaco.MarkerSeverity.Error,
          },
        ]
      }
    }
  } else return []
}

function getIndexOfSubstring(str, ss) {
  function badCharHeuristic(str, size, badchar) {
    for (let i = 0; i < 256; i++) badchar[i] = -1
    for (let i = 0; i < size; i++) badchar[str[i].charCodeAt(0)] = i
  }
  function search(txt, pat) {
    let m = pat.length
    let n = txt.length

    let badchar = new Array(256)

    badCharHeuristic(pat, m, badchar)

    let s = 0
    while (s <= n - m) {
      let j = m - 1
      while (j >= 0 && pat[j] == txt[s + j]) j--
      if (j < 0) {
        console.log('Patterns occur at shift = ' + s)
        return parseInt(s)
        s += s + m < n ? m - badchar[txt[s + m].charCodeAt(0)] : 1
      } else {
        s += Math.max(1, j - badchar[txt[s + j].charCodeAt(0)])
      }
    }
  }
  return search(str, ss)
}

function getLineNumber(arr, start, end) {
  let cummulativeSum = 0
  let s = false
  let e = false
  let ans = []
  let i = 0
  for (i; i < arr.length; i++) {
    cummulativeSum += arr[i]
    if (start > cummulativeSum) {
      ans.push([])
      continue
    } else {
      s = true
      if (end <= cummulativeSum) {
        e = true
        ans.push([arr[i] - cummulativeSum + start, arr[i] - cummulativeSum + end])
      } else {
        ans.push([arr[i] - cummulativeSum + start, arr[i]])
      }
      i++
      break
    }
  }
  for (i; i < arr.length; i++) {
    cummulativeSum += arr[i]
    if (!e) {
      if (end > cummulativeSum) {
        ans.push([0, arr[i]])
        continue
      } else {
        e = true
        ans.push([0, arr[i] - cummulativeSum + end])
      }
    } else {
      ans.push([])
    }
  }

  return ans
}

function validateQuery(model, streams, streamList) {
  // console.time('validateQuery')
  let start = process.hrtime();
  let pipes = {
    limit: [-1, -1, -1],
    first: [-1, -1, -1],
    last: [-1, -1, -1],
    select: [-1, -1, -1],
    groupby: [-1, -1, -1],
    duration: [-1, -1, -1],
    timeslice: [-1, -1, -1],
    having: [-1, -1, -1],
    window: [-1, -1, -1],
    checkif: [-1, -1, -1],
  }
  let valueArr = model.split(/\n/g)
  let value = valueArr.join('')
  console.log('^^^^^^^^^^', value, valueArr)
  let markers = []
  let pipePos = []
  let queryArray = []

  let groupbyFields = [] // {field: [start, end, isAlias]}
  let selectFields = [] // {field: [start, end, aliasName]}
  let selectFunction = [] // {func: [start, end, aliasName, ...fields]}
  let selectAggregate = [] // {func: [start, end, aliasName, ...fields]}
  let selectAliases = [] // {aliasName: [start, end, full]}
  let selectFullField = [] // {fullFieldName : typeInStrin}
  let havingFullFields = []
  let selectedStream = []
  let fieldsList = []
  let temp = splitingQuery(value, '|', true)

  queryArray = temp.splittedArray
  pipePos = temp.charPos
  // validQ = checkForBrackets(queryString)
  // if (!validQ.isValid) {
  //   return validQ
  // }
  // console.log(queryPattern['stream'].test(value), /^\s*\bstream\s*=.+/gi.test(value))
  if (/^(\s*\bstream\s*=.+)|(\s*\bsourcename\s*=.+)/gi.test(value)) {
    // const queryArray = value.split('|')
    // const queryArray = value.split('|')
    console.log(queryArray)
    let bracketsErr = validateBrackets(value)
    if(bracketsErr.length > 0){
      let end = process.hrtime(start);
      console.log(bracketsErr)
      return { markers: bracketsErr[0], time: Math.round((end[0] * 1000 + end[1] / 1000000) * 10000) / 10000 }
    } 

    if (/^(\s*\bstream\s*=.+)/gi.test(value)) {
      streamErrors = checkForStreamsAndWhere(
        queryArray[0],
        streamList,
        selectedStream,
        fieldsList,
        streams,
        pipePos.length > 0,
      )
    } else {
      streamErrors = sourcenameValidation(
        queryArray[0],
        sourceNameDetails,
        streamList,
        selectedStream,
        fieldsList,
        streams,
        pipePos.length > 0,
      )
    }
    if (streamErrors.length > 0) {
      markers.push(streamErrors[0])
      console.log(streamErrors)
    }

    if (selectedStream.length > 0 && streamErrors.length === 0) {
      if (selectedStream[0].trim() === '*') {
        fieldsList = [...new Set(fieldsList.concat(...Object.values(streams)))]
        fieldsList.push('xhour', 'xminutes')
      } else {
        selectedStream.forEach(element => {
          fieldsList = [...new Set(fieldsList.concat(streams[element.trim().toUpperCase()]))]
          fieldsList.push('xhour', 'xminutes')
        })
      }
      fieldsList = fieldsList?.map(item => item.replace('$', '').toLowerCase())
    }
    let pipeArr = queryArray.slice(1)

    // checkForIncorrectAndRepeatedPipes(value, markers, pipes, model, pipePos, pipeArr)
    // checkfor incorrect/repeated pipes, if correct pipes found -> check for full syntax
    console.log(pipePos, 'pipeArr', pipeArr, 'pipes:', pipes)
    for (let k = 0; k < pipeArr.length && markers.length === 0; k++) {
      let matches = [
        ...pipeArr[k].matchAll(
          /^\|(\s*)(\btimeslice\b|\bduration\b|\blimit\b|\bfirst\b|\blast\b|\bgroupby\b|\bselect\b|\bhaving\b|\bwindow\b|\bcheckif\b)(\s*)/gim,
        ),
      ]
      if (matches.length > 0) {
        console.log(matches[0][2], 'matchemaa', matches, pipePos[k])
        if (pipes[matches[0][2]][0] === -1) {
          pipes[matches[0][2]][0] = pipePos[k]
          pipes[matches[0][2]][1] = matches[0][1].length
          pipes[matches[0][2]][2] = matches[0][3].length

          if (matches[0][2].toLowerCase() === 'timeslice') {
            let errors = checkTimeslice(pipeArr[k], pipePos[k], pipePos.length === k + 1)
            if (errors.length > 0) {
              markers.push(errors[0])
              break
            }
          } else if (['limit', 'first', 'last'].includes(matches[0][2].toLowerCase())) {
            pipes['limit'] = JSON.parse(JSON.stringify(pipes[matches[0][2]]))
            pipes['first'] = JSON.parse(JSON.stringify(pipes[matches[0][2]]))
            pipes['last'] = JSON.parse(JSON.stringify(pipes[matches[0][2]]))
            let errors = checkLimitFirstLast(pipeArr[k], pipePos[k], pipePos.length === k + 1)
            if (errors.length > 0) {
              markers.push(errors[0])
              break
            }
          } else if (matches[0][2].toLowerCase() === 'duration') {
            let errors = checkDuration(pipeArr[k], pipePos[k], pipePos.length === k + 1)
            if (errors.length > 0) {
              markers.push(errors[0])
              break
            }
          } else if (matches[0][2].toLowerCase() === 'window') {
            let errors = checkWindow(pipeArr[k], pipePos[k], pipePos.length === k + 1)
            if (errors.length > 0) {
              markers.push(errors[0])
              break
            }
          } else if (matches[0][2].toLowerCase() === 'groupby') {
            let errors = checkGroupby(
              pipeArr[k],
              pipePos[k],
              fieldsList,
              groupbyFields,
              pipePos.length === k + 1,
            )
            if (errors.length > 0) {
              markers.push(errors[0])
              break
            }
          } else if (matches[0][2].toLowerCase() === 'select') {
            let errors = checkSelect(
              pipeArr[k],
              pipePos[k],
              fieldsList,
              selectFields,
              selectAggregate,
              selectAliases,
              selectFunction,
              selectFullField,
              pipePos.length === k + 1,
            )
            if (errors.length > 0) {
              markers.push(errors[0])
              break
            }
          } else if (matches[0][2].toLowerCase() === 'having') {
            let errors = checkHaving(
              pipeArr[k],
              pipePos[k],
              havingFullFields,
              pipePos.length === k + 1,
            )
            if (errors.length > 0) {
              markers.push(errors[0])
              break
            }
          } else if (matches[0][2].toLowerCase() === 'checkif') {
            let errors = validateCheckif(
              pipeArr[k],
              pipePos[k],
              fieldsList,
              pipePos.length === k + 1,
            )
            if (errors.length > 0) {
              markers.push(errors[0])
              break
            }
          }
        } else {
          markers.push({
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: pipePos[k] + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: pipePos[k] + 1 + matches[0][1].length + matches[0][2].length + 1,
            message: 'Repeated Pipe',
            severity: monaco.MarkerSeverity.Error,
          })
          break
        }
      } else if (pipeArr[k].trim() === '|') {
        if (pipePos[k + 1] !== undefined) {
          markers.push({
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: pipePos[k] + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: pipePos[k + 1] + 2,
            message: 'Empty Pipe',
            severity: monaco.MarkerSeverity.Error,
          })
          break
        } else {
          markers.push({
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: pipePos[k] + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: pipePos[k + 1] + 2,
            message: 'Empty Pipe',
            severity: monaco.MarkerSeverity.Warning,
          })
          break
        }
      } else {
        if (/^\|\s*\w+$/.test(pipeArr[k])) {
          markers.push({
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: pipePos[k] + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: k + 1 < pipeArr.length ? pipePos[k + 1] + 1 : value.length + 1,
            message: 'Wrong Pipe',
            severity: monaco.MarkerSeverity.Warning,
          })
          break
        } else {
          markers.push({
            // startLineNumber: model.getPositionAt(i).lineNumber,
            startColumn: pipePos[k] + 1,
            // endLineNumber: model.getPositionAt(i).lineNumber,
            endColumn: k + 1 < pipeArr.length ? pipePos[k + 1] + 1 : value.length + 1,
            message: 'Wrong Pipe',
            severity: monaco.MarkerSeverity.Error,
          })
          break
        }
      }
    }

    // check for select and groupby interaction
    if (markers.length === 0) {
      let gbySelectErrors = checkSelectAndGroupby(
        pipes,
        fieldsList,
        groupbyFields,
        selectFields,
        selectAggregate,
        selectAliases,
        selectFunction,
        selectFullField,
      )
      if (gbySelectErrors.length > 0) {
        markers.push(gbySelectErrors[0])
      }
    }
    if (markers.length === 0) {
      let havingwithSelectAndGroupbyErrors = validatingHavingWithSelectAndGroupby(
        pipes,
        fieldsList,
        groupbyFields,
        selectFields,
        selectAggregate,
        selectAliases,
        selectFunction,
        selectFullField,
        havingFullFields,
      )
      if (havingwithSelectAndGroupbyErrors?.length > 0) {
        markers.push(havingwithSelectAndGroupbyErrors[0])
      }
    }
    if (markers.length === 0 && pipes['timeslice'][0] !== -1) {
      let endColumn = -1
      for (const key in pipes) {
        if (key !== 'timeslice' && pipes[key][0] > pipes['timeslice'][0]) {
          endColumn = pipes[key][0]
        }
      }
      if (pipes['select'][0] !== -1 && pipes['groupby'][0] === -1) {
        markers.push({
          // startLineNumber: model.getPositionAt(i).lineNumber,
          startColumn: pipes['timeslice'][0] + pipes['timeslice'][1],
          // endLineNumber: model.getPositionAt(i).lineNumber,
          endColumn: endColumn !== -1 ? endColumn : value.length,
          message: `Error at 'timeslice': Cannot use timeslice with select only`,
          severity: monaco.MarkerSeverity.Error,
        })
      }
    }
  }
  let lengthOfValueArr = []
  valueArr.forEach(item => lengthOfValueArr.push(item.length))
  let newMark = []
  if (markers.length > 0) {
    let lineArr = getLineNumber(lengthOfValueArr, markers[0].startColumn, markers[0].endColumn)
    let tempMarker = JSON.parse(JSON.stringify(markers[0]))
    for (let k = 0; k < lineArr.length; k++) {
      if (lineArr[k].length === 0) continue
      tempMarker.startColumn = lineArr[k][0]
      tempMarker.endColumn =
        lineArr[k][1] === lengthOfValueArr[k] ? lineArr[k][1] + 1 : lineArr[k][1]
      tempMarker.startLineNumber = k + 1
      tempMarker.endLineNumber = k + 1
      newMark.push(JSON.parse(JSON.stringify(tempMarker)))
    }
  }

  console.log('MARKERS', markers)
  // console.log('newMarkers', newMark)
  // monaco.editor.setModelMarkers(model, 'Pipe position', newMark)
  // console.timeEnd('validateQuery')
  let end = process.hrtime(start);
  console.log("ELAPSED TIME", Math.round((end - start) * 10000) / 10000);
  return { markers: newMark[0], time: Math.round((end[0] * 1000 + end[1] / 1000000) * 10000) / 10000 }
}

module.exports = validateQuery;
