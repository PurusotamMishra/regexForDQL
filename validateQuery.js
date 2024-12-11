
const { pipes, aggregateFunctions, allFunctions, nonAggregateFunctions, boolean_functions } = require('./consts')

const queryPattern = {
    stream: /\b[sS][tT][rR][eE][aA][mM]\b\s*=\s*(\*|\w+(?:,\s*\w+)*)/,
    timeslice: /\|\s*\btimeslice\b/ig,
    duration: /\|\s*\bduration\b/ig,
    limit_first_last: /\|\s*\blimit\b|\|\s*\bfirst\b|\|\s*\blast\b/ig,
    groupby: /\|\s*\bgroupby\b/ig,
    select: /\|\s*\bselect\b/ig,
    having: /\|\s*\bhaving\b/ig,
    all: /\btimeslice\b|\bduration\b|\blimit\b|\bfirst\b|\blast\b|\bgroupby\b|\bselect\b|\bhaving\b/i,
}

const checkLimitFirstLast = (query) => {
    let validity = {
        isValid: false,
        message: "Invalid Query",
    }
    if (query.includes('limit'))
        if (!/\blimit\b\s+\d{1,}/i.test(query))
            return { isValid: false, message: 'For limit pipe, please write number after giving space' }
        else validity = { isValid: true, message: "Valid Query" }
    else if (query.includes('first'))
        if (!/\blimit\b\s+\d{1,}/i.test(query))
            return { isValid: false, message: 'For first pipe, please write number after giving space' }
        else validity = { isValid: true, message: "Valid Query" }
    else
        if (!/\blimit\b\s+\d{1,}/i.test(query))
            return { isValid: false, message: 'For last pipe, please write number after giving space' }
        else validity = { isValid: true, message: "Valid Query" }

    return validity
}

const checkTimeslice = (query) => {
    let validity = {
        isValid: false,
        message: "Invalid Query",
    }
    if (!/\b[tT][iI][mM][eE][sS][lL][iI][cC][eE]\b\s+(1m|1h)/.test(query))
        return { isValid: false, message: 'For timeslice pipe, please write "1m" or "1h"' }
    else return { isValid: true, message: "Valid Query" }
}

const checkDuration = (query) => {
    let validity = {
        isValid: false,
        message: "Invalid Query",
    }
    let arr = query.trim().split(" ")
    // console.log(/^duration$/i.test(arr[0].trim()), query)
    if ((/duration/i.test(arr[0].trim()) && arr[1] === undefined) || arr.length === 0) {
        return { isValid: false, message: `Error at 'duration': Invalid clause!` }
    }
    if (/[a-zA-Z]/.test(arr[1][0])) {
        if (!/\b[dD][uU][rR][aA][tT][iI][oO][nN]\b\s+[fF][rR][oO][mM]\s+\d{4}-(((0[13578]|1[02])-([0-2][0-9]|3[0-1]))|((0[469]|11)-([0-2][0-9]|30))|(02-[0-2][0-9]))T([0-1][0-9]|2[0-3]):(0[0-9]|[1-5][0-9]):(0[0-9]|[1-5][0-9])\s+\b[tT][oO]\b\s+\d{4}-(((0[13578]|1[02])-([0-2][0-9]|3[0-1]))|((0[469]|11)-([0-2][0-9]|30))|(02-[0-2][0-9]))T([0-1][0-9]|2[0-3]):(0[0-9]|[1-5][0-9]):(0[0-9]|[1-5][0-9])/.test(query)) {
            if (!arr.includes('from')) {
                return { isValid: false, message: 'For duration pipe, "from" is missing!' }
            }
            else if (!/\d{4}-(((0[13578]|1[02])-([0-2][0-9]|3[0-1]))|((0[469]|11)-([0-2][0-9]|30))|(02-[0-2][0-9]))T\d{1,2}:\d{2}:\d{2}/.test(arr[2])) {
                return { isValid: false, message: 'Incorrect Date format after "from"!' }
            }
            else if (!/\d{4}-(((0[13578]|1[02])-([0-2][0-9]|3[0-1]))|((0[469]|11)-([0-2][0-9]|30))|(02-[0-2][0-9]))T([0-1][0-9]|2[0-3]):(0[0-9]|[1-5][0-9]):(0[0-9]|[1-5][0-9])/.test(arr[2])) {
                return { isValid: false, message: 'Incorrect Time format after "from"!' }
            }
            else if (!arr.includes('to')) {
                return { isValid: false, message: 'For duration pipe, "to" is missing!' }
            }
            else if (!/\d{4}-(((0[13578]|1[02])-([0-2][0-9]|3[0-1]))|((0[469]|11)-([0-2][0-9]|30))|(02-[0-2][0-9]))T\d{1,2}:\d{2}:\d{2}/.test(arr[4])) {
                return { isValid: false, message: 'Incorrect Date format after "to"!' }
            }
            else if (!/\d{4}-(((0[13578]|1[02])-([0-2][0-9]|3[0-1]))|((0[469]|11)-([0-2][0-9]|30))|(02-[0-2][0-9]))T([0-1][0-9]|2[0-3]):(0[0-9]|[1-5][0-9]):(0[0-9]|[1-5][0-9])/.test(arr[4])) {
                return { isValid: false, message: 'Incorrect Time format after "to"!' }
            }
            else
                return { isValid: false, message: 'For duration pipe, "from yyyy-mm-ddThh:mm:ss to yyyy-mm-ddThh:mm:ss" error at date and time!' }
        }
    }
    else if (/[0-9]/.test(arr[1][0])) {
        if ((!/^\b[dD][uU][rR][aA][tT][iI][oO][nN]\b\s+\d{1,}[mhdwM]$/m.test(query)))
            return { isValid: false, message: 'For duration pipe, "1m", "1h", "1d", "1w", or "1M"' }
    }
    else {
        return { isValid: false, message: "Error at 'duration': Invalid syntax" }
    }
    validity = { isValid: true, message: "Valid Query" }

    return validity
}

const checkForStreamsAndWhere = (query) => {
    let queryArr = query.split(/\s(where)\s/i)
    // streams' name validation (multi streams)
    let streams = queryArr[0].trim().split(/stream\s*=/i).filter(str => str !== '' && str !== null && str !== undefined)
    streams = streams[0].trim().split(',')
    console.log(streams)
    for (let i = 0; i < streams.length; i++) {
        if (streams.length === 1 && streams[0].trim() === '*') {
            break
        }
        if (i > 0 && streams[i].trim() === '*') {
            return { isValid: false, message: `Error at 'stream': Cannot have multiple stream name with "*" ` }
        }
        if (!/^([a-zA-Z-]+|\*)$/m.test(streams[i]?.trim())) {
            return { isValid: false, message: `Error at 'streams': Invalid stream name, found ${streams[i]}` }
        }
    }

    // operators in select
    // stream names from list
    //  empty pipe per error  -> "| | groupby"

    //where clause validation
    // boolean functions, brackets
    // multiply or add or subtract or divide ko include karna padega 
    // between, like, in
    const operators = ['<=', '>=', '=', '!=', '<>', '<', '>']
    let whereQuery = queryArr[2]?.trim().split(/\sand\s+not\s|\sor\s+not\s|\sand\s|\sor\s/i) || []
    let conjuctions = queryArr[2]?.trim().match(/\sand\s+not\s|\sor\s+not\s|\sand\s|\sor\s/ig) || []
    console.log(conjuctions)
    for (let i = 0; i < whereQuery?.length; i++) {
        if (whereQuery[i].toLowerCase().includes(' between ')) {
            let cols = (whereQuery[i].trim() + ' ').split(/\sbetween\s/i)
            if (conjuctions[i] === undefined || conjuctions[i] !== ' and ') {
                return { isValid: false, message: `Error at 'where': Invalid 'between' operator, Missing 'and'` }
            }
            if (cols[0] === undefined || cols[0].trim() === '') {
                return { isValid: false, message: `Error at 'where': Missing column name before 'between'` }
            } else if (!/^(\(\s*)?\w+$/m.test(cols[0].trim())) {
                return { isValid: false, message: `Error at 'where': Invalid operand, found "${cols[0]}" near 'between'` }
            } else if (cols[1] === undefined || cols[1].trim() === '') {
                return { isValid: false, message: `Error at 'where': Missing operand after 'between' and before 'and'` }
            } else if (!/^('.+')|(".+"|[\d])$/m.test(cols[1].trim())) {
                return { isValid: false, message: `Error at 'where': Invalid operand, found "${cols[1]}" near 'between'` }
            } else if (whereQuery[i + 1] === undefined || whereQuery[i + 1].trim() === '') {
                return { isValid: false, message: `Error at 'where': Missing operand after 'and' near between` }
            } else if (!/^('.+')|(".+"|[\d])$/m.test(whereQuery[i + 1])) {
                return { isValid: false, message: `Error at 'where': Invalid operand after 'and' near between` }
            }
            i++;
            continue
        } else if (whereQuery[i].toLowerCase().includes(' like ')) {
            let opers = whereQuery[i].trim().split(/( like )/i).filter((op) => (op !== undefined && op !== null && !/^\s*$/m.test(op)))
            console.log(opers)
        } else if ((whereQuery[i].toLowerCase().includes(' in '))) {
            let opers = whereQuery[i].trim().split(/( in )/i).filter((op) => (op !== undefined && op !== null && !/^\s*$/m.test(op)))
            // check for column name and then "(" and ")" after in
            console.log(opers)
        } else if (/^([\w|~!=%&*+-\/<>^]+)\s*\(\s*.+\s*\)$/.test(whereQuery[i].trim())) {
            let fun = /^([\w|~!=%&*+-\/<>^]+)\s*\(\s*.+\s*\)$/.exec(whereQuery[i].trim())[1]
            if (!boolean_functions.includes(fun))
                return { isValid: false, message: `Error at 'where': Invalid function "${fun}"` }
        } else {
            let opers = whereQuery[i].trim().split(/(<=|>=|=|!=|<>|<|>| like | in )/i).filter((op) => (op !== undefined && op !== null && !/^\s*$/m.test(op)))
            if (opers.length === 0 || opers[0] === '') {
                return { isValid: false, message: `Error at 'where': Missing operand` }
            } else if (!/^(\(\s*)?\w+$/m.test(opers[0].trim())) {
                return { isValid: false, message: `Error at 'where': Invalid operand, found "${opers[0]}"` }
            } else if (opers[1] === undefined) {
                return { isValid: false, message: `Error at 'where': Missing 'Comparison Operators(= < > >= <= != <>)'` }
            } else if (!operators.includes(opers[1].trim())) {
                return { isValid: false, message: `Error at 'where': Missing 'Comparison Operators(= < > >= <= != <>)', found "${opers[1]}"` }
            } else if (opers[2] === undefined) {
                return { isValid: false, message: `Error at 'where': Missing operand` }
            } else if (!/^(?:['"]|)\s*.+\s*(?:['"]|)$/m.test(opers[2].trim())) {
                return { isValid: false, message: `Error at 'where': Invalid operand, found "${opers[2]}"` }
            }
        }
    }
    return { isValid: true, message: `Valid Query!` }
}

const checkGroupby = (query, gbyCol) => {
    let validity = {
        isValid: false,
        message: "Invalid Query",
    }

    let gbyFields = query.trim().split(/groupby/i).join("").split(',').filter(word => word !== undefined && word !== '')
    if (gbyFields.length === 0) {
        return { isValid: false, message: `Error at 'groupby': Missing column name(s)!` }
    }
    let repeatGroupby = query.trim().split(/(groupby\s)/i).filter(word => /^groupby$/i.test(word.trim()))
    if (repeatGroupby.length > 1) {
        return { isValid: false, message: `Error at 'groupby': 'groupby' clause is repeated` }
    }

    for (let i = 0; i < gbyFields.length; i++) {
        if (/^([\w|~!=%&*+-\/<>^]+)\s*\(\s*.+\s*\)$/.test(gbyFields[i].trim())) {
            //check if the function is not a aggregate function but is present in all function
            let fun = /^([\w|~!=%&*+-\/<>^]+)\s*\(\s*.+\s*\)$/.exec(gbyFields[i].trim())[1]
            if (aggregateFunctions.includes(fun)) {
                return { isValid: false, message: `Error at 'groupby: "${fun}" is an aggregate function and cannot be with groupby clause!` }
            } else if (allFunctions.includes(fun)) {
                gbyCol.push(gbyFields[i].split(" ").join(""))
            } else {
                return { isValid: false, message: `Error at 'groupby': "${fun}" is not a valid function!` }
            }
        }
        else if (/^[a-zA-Z]+$/g.test(gbyFields[i].trim())) {
            gbyCol.push(gbyFields[i].trim())
        }
        else {
            return { isValid: false, message: `Error at 'groupby': column name "${gbyFields[i].trim()}" is INVALID!` }
        }
    }

    validity = { isValid: true, message: "Valid Query" }
    return validity
}

const checkHaving = (query, gbyCol, selCol) => {
    let validity = {
        isValid: false,
        message: "Invalid Query",
    }
    const operators = ['<=', '>=', '==', '!=', '<', '>']

    let havCond = query.trim().split(/having/i).join("").split(/\sand\s|\sor\s/i)

    for (let i = 0; i < havCond.length; i++) {
        let opers = havCond[i].trim().split(/(<=|>=|==|!=|<|>)/).filter((op) => (op !== undefined && op !== null && !/^\s*$/m.test(op)))
        if (opers.length === 0 || opers[0] === '') {
            return { isValid: false, message: `Error at 'having': Missing operand` }
        } else if (!/^\w+$/m.test(opers[0].trim())) {
            return { isValid: false, message: `Error at 'having': Invalid operand, found "${opers[0]}"` }
        } else if (opers[1] === undefined) {
            return { isValid: false, message: `Error at 'having': Missing 'Comparison Operators(== < > >= <= !=)'` }
        } else if (!operators.includes(opers[1].trim())) {
            return { isValid: false, message: `Error at 'having': Missing 'Comparison Operators(== < > >= <= !=)', found "${opers[1]}"` }
        } else if (opers[2] === undefined) {
            return { isValid: false, message: `Error at 'having': Missing operand` }
        } else if (!/^\w+$/m.test(opers[2].trim())) {
            return { isValid: false, message: `Error at 'having': Invalid operand, found "${opers[2]}"` }
        } else if (opers[3] && !operators.includes(opers[3].trim())) {
            return { isValid: false, message: `Error at 'having': Missing operand, found "${opers[3]}"` }
        } else if (opers[3] !== undefined && opers[4] === undefined) {
            return { isValid: false, message: `Error at 'having': Missing operand` }
        } else if (opers[3] !== undefined && !/^\w+$/m.test(opers[4].trim())) {
            return { isValid: false, message: `Error at 'having': Invalid operand, found ${opers[4]}` }
        } else if (opers.length > 5) {
            return { isValid: false, message: `Error at 'having': Unknown found "${opers[5]}"` }
        }
    }

    if (!/\b[hH][aA][vV][iI][nN][gG]\b\s*\w+(?:,\s*\w+)*./.test(query)) {
        return { isValid: false, message: 'Error at "having"!' }
    }
    validity = { isValid: true, message: "Valid Query" }
    return validity
}

const checkSelect = (query, gbyCol, selCol) => {
    let validity = {
        isValid: false,
        message: "Invalid Query",
    }

    let selFields = query.trim().split(/select/i).join(" ").trim().split(',').filter(word => word !== '' && word !== undefined)
    if (selFields.length === 0) {
        return { isValid: false, message: `Error at 'select': Missing column name(s)!` }
    }
    let repeatSelect = query.trim().split(/(select\s)/i).filter(word => /^select$/i.test(word.trim()))
    if (repeatSelect.length > 1) {
        return { isValid: false, message: `Error at 'select': 'select' clause is repeated` }
    }
    if (gbyCol.length === 0) { //groupby clause is not present in the queryString
        let agg = []
        for (let i = 0; i < selFields.length; i++) {
            let tempArr = selFields[i].trim().split(/\sas\s/i)
            selCol.push({ 'col': tempArr[0], 'alias': tempArr[1] ? tempArr[1] : '', fun: '', agg: false })
            if (/^([\w|~!=%&*+-\/<>^]+)\s*\(\s*.+\s*\)$/.test(tempArr[0].trim())) {
                let fun = /^([\w|~!=%&*+-\/<>^]+)\s*\(\s*(.+)\s*\)$/.exec(tempArr[0].trim())
                if (allFunctions.includes(fun[1])) {
                    if (aggregateFunctions.includes(fun[1])) {
                        agg.push(tempArr[0])
                        selCol[i].agg = true
                    }
                    selCol[i].fun = fun[1]
                    selCol[i].col = fun[2]
                }
                else {
                    return { isValid: false, message: `Error at 'select': "${fun}" is not a valid function!` }
                }
            } else if (/^[a-zA-Z]+$/.test(tempArr[0].trim())) {
                continue
            } else if (tempArr[0].trim() === '') {
                return { isValid: false, message: `Error at 'select': column name is missing` }
            } else if (tempArr[0].includes('@')) {
                if (!/^\w+(((\.\w+)|(\[\s*\d+\s*\]))+|)$/m.test(tempArr[0].trim().replace('@', ''))) {
                    return { isValid: false, message: `Error at 'select': column name "${tempArr[0].trim()}" is INVALID!` }
                }
            }
            else {
                return { isValid: false, message: `Error at 'select': column name "${tempArr[0].trim()}" is INVALID!` }
            }
        }
        if (agg.length !== 0 && agg.length !== selCol.length) {
            for (let j = 0; j < selCol.length; j++) {
                if (!agg.includes(selCol[j]['col'])) {
                    return { isValid: false, message: `Error at 'select': "${selCol[j]['col']}" is not an aggregate function` }
                }
            }
        }
    }
    else { // groupby clause is present in the queryString
        let nonAgg = []
        for (let i = 0; i < selFields.length; i++) {
            let tempArr = selFields[i].trim().split(/\sas\s/i)
            selCol.push({ 'col': tempArr[0], 'alias': tempArr[1] ? tempArr[1] : '', fun: '', agg: false })
            if (/^([\w|~!=%&*+-\/<>^]+)\s*\(\s*.+\s*\)$/.test(tempArr[0].trim())) {
                let fun = /^([\w|~!=%&*+-\/<>^]+)\s*\(\s*(.+)\s*\)$/.exec(tempArr[0].trim())
                if (allFunctions.includes(fun[1])) {
                    if (aggregateFunctions.includes(fun[1])) {
                        selCol[i].agg = true
                    } else {
                        nonAgg.push(fun[1])
                    }
                    selCol[i].fun = fun[1]
                    selCol[i].col = fun[2]
                }
                else {
                    return { isValid: false, message: `Error at 'select': "${fun[1]}" is not a valid function!` }
                }
            } else if (/^[a-zA-Z]+$/.test(tempArr[0].trim())) {
                continue
            }
            else {
                return { isValid: false, message: `Error at 'select': column name "${tempArr[0].trim()}" is INVALID!` }
            }
        }

        if (nonAgg.length !== 0) {
            for (let j = 0; j < selFields.length; j++) {
                if (nonAgg.includes(selCol[j]['fun'])) {
                    if (!gbyCol.includes(selCol[j]['col']) && !aggregateFunctions.includes(selCol[j]['col'])) {
                        return { isValid: false, message: `Error at 'select': "${selCol[j]['col']}" is neither present in 'groupby' clause nor is an aggregate functions!` }
                    }
                }
            }
        }
    }

    validity = { isValid: true, message: "Valid Query" }
    return validity
}

const checkForNonRepeatability = (queryString) => {
    if ([...queryString.matchAll(queryPattern.duration)].length > 1) {
        return { isValid: false, message: '"Duration" is repeated twice' }
    }
    else if ([...queryString.matchAll(queryPattern.having)].length > 1) {
        return { isValid: false, message: '"Having" is repeated twice' }
    }
    else if ([...queryString.matchAll(queryPattern.groupby)].length > 1) {
        return { isValid: false, message: '"Groupby" is repeated twice' }
    }
    else if ([...queryString.matchAll(queryPattern.select)].length > 1) {
        return { isValid: false, message: '"Select" is repeated twice' }
    }
    else if ([...queryString.matchAll(queryPattern.timeslice)].length > 1) {
        return { isValid: false, message: '"Timeslice" is repeated twice' }
    }
    else if ([...queryString.matchAll(queryPattern.limit_first_last)].length > 1) {
        return { isValid: false, message: 'Only one of "Limit", "First" or "Last" should be used' }
    }
    else return { isValid: true, message: 'No repeatance' }
}

const checkForIncorrectPipes = (queryArray, pipesIndex) => {
    for (let i = 0; i < queryArray.length; i++) {
        if (queryPattern.stream.test(queryArray[i]))
            continue
        let query = queryArray[i].trim().split(' ')
        if (!queryPattern.all.test(query[0]))
            return { isValid: false, message: `The pipe "${query[0].toUpperCase()}" is not a valid in DQL!` }
        else if (queryArray[i].toLowerCase().includes('groupby')) {
            pipesIndex['groupby'] = i
        }
        else if (queryArray[i].toLowerCase().includes('having')) {
            pipesIndex['having'] = i
        }
        else if (queryArray[i].toLowerCase().includes('select')) {
            pipesIndex['select'] = i
        }
    }
    return { isValid: true, message: 'All pipe functions are' }
}

const checkForBrackets = str => {
    const stack = [];
    const brackets = {
        '(': ')',
        '{': '}',
        '[': ']'
    };
    const invalidBrackets = {
        '{': '}',
        '[': ']'
    }
    const closingBrackets = new Set(Object.values(brackets));

    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if (brackets[char]) {
            if (invalidBrackets[char]) {
                return { isValid: false, message: `Unexpected character: ${char} at position ${i}` }
            }
            stack.push({ char, index: i });
        } else if (closingBrackets.has(char)) {
            if (stack.length === 0) {
                return { isValid: false, message: `Unexpected closing character: ${char} at position ${i}` }
            }
            const lastOpen = stack.pop();
            if (brackets[lastOpen.char] !== char) {
                return { isValid: false, message: `Mismatched characters: ${lastOpen.char} at position ${lastOpen.index} and ${char} at position ${i}` }
            }
        }
    }

    while (stack.length > 0) {
        const unclosed = stack.pop();
        return { isValid: false, message: `Unexpected opening character: ${unclosed.char} at position ${unclosed.index}` }
    }

    return { isValid: true, message: `Brackets Balanced` }
}

// validate all inside the brackets

function validateQuery(queryString) {

    let validQ = {
        isValid: false,
        message: "Invalid Query",
    }

    var pipesIndex = {
        'groupby': -1,
        'select': -1,
        'having': -1,
    }

    validQ = checkForBrackets(queryString)
    if (!validQ.isValid) {
        return validQ
    }

    if (queryPattern.stream.test(queryString)) {
        const queryArray = queryString.split("|")

        validQ = checkForIncorrectPipes(queryArray, pipesIndex)
        if (!validQ.isValid) {
            return validQ
        }

        //check for non-repeatability of pipes
        validQ = checkForNonRepeatability(queryString)
        if (!validQ.isValid) {
            return validQ
        }

        validQ = checkForStreamsAndWhere(queryArray[0])
        if (!validQ.isValid)
            return validQ

        var gbyCol = []
        var selCol = []
        if (pipesIndex['groupby'] !== -1) {
            validQ = checkGroupby(queryArray[pipesIndex['groupby']], gbyCol)
            if (!validQ.isValid) {
                return validQ
            }
        }
        if (pipesIndex['select'] !== -1) {
            validQ = checkSelect(queryArray[pipesIndex['select']], gbyCol, selCol)
            if (!validQ.isValid) {
                return validQ
            }
        }
        if (pipesIndex['having'] !== -1) {
            validQ = checkHaving(queryArray[pipesIndex['having']], gbyCol, selCol)
            if (!validQ.isValid) {
                return validQ
            }
        }

        if (!validQ.isValid)
            return validQ
        for (let ind = 0; ind < queryArray.length; ind++) {
            if (queryPattern.stream.test(queryArray[ind]))
                continue
            if (queryArray[ind].toLowerCase().includes('limit') || queryArray[ind].includes('first') || queryArray[ind].includes('last')) {
                validQ = checkLimitFirstLast(queryArray[ind])
                if (validQ.isValid) continue
                else break
            }
            if (queryArray[ind].toLowerCase().includes('timeslice')) {
                validQ = checkTimeslice(queryArray[ind])
                if (validQ.isValid) continue
                else break
            }
            if (queryArray[ind].toLowerCase().includes('duration')) {
                validQ = checkDuration(queryArray[ind])
                if (validQ.isValid) continue
                else break
            }
            if (queryArray[ind].toLowerCase().includes('having')) {
                // validQ = checkHaving(queryArray[ind])
                // if (validQ.isValid) continue
                // else break
                continue
            }
            if (queryArray[ind].toLowerCase().includes('groupby')) {
                continue
                // validQ = checkGroupby(queryArray[ind])
                // if (validQ.isValid) continue
                // else break
            }
            if (queryArray[ind].toLowerCase().includes('select')) {
                // if (pipesIndex['groupby'] !== -1)
                //     validQ = checkSelect(queryArray[ind], queryArray[pipesIndex['groupby']])
                // else
                //     validQ = checkSelect(queryArray[ind], -1)
                // if (validQ.isValid) continue
                // else break
                continue
            }
        }
        if (!validQ.isValid) {
            return validQ
        }
        else return { isValid: true, message: `Valid Query` }
    }
    else {
        return { isValid: false, message: 'Invalid Query: Stream Missing' }
    }
}


module.exports = validateQuery;