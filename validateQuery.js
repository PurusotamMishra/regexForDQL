
const queryPattern = {
    stream: /\b[sS][tT][rR][eE][aA][mM]\b\s*=\s*\w+(?:,\s*\w+)*/,
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
    else validity = { isValid: true, message: "Valid Query" }
}

const checkDuration = (query) => {
    let validity = {
        isValid: false,
        message: "Invalid Query",
    }
    let arr = query.trim().split(" ")
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
        if ((!/\b[dD][uU][rR][aA][tT][iI][oO][nN]\b\s+\d{1,}[mhdwM]/.test(query)))
            return { isValid: false, message: 'For duration pipe, "1m", "1h", "1d", "1w", or "1M"' }
    }
    else {
        return { isValid: false, message: "Syntax Error: duration!" }
    }
    validity = { isValid: true, message: "Valid Query" }

    return validity
}

const checkGroupby = (query) => {
    let validity = {
        isValid: false,
        message: "Invalid Query",
    }
    if (!/\b[gG][rR][oO][uU][pP][bB][yY]\b\s*\w+(?:,\s*\w+)*./.test(query)) {
        return { isValid: false, message: 'Error at "groupby"!' }
    }
    validity = { isValid: true, message: "Valid Query" }
    return validity
}

const checkHaving = (query) => {
    let validity = {
        isValid: false,
        message: "Invalid Query",
    }
    if (!/\b[hH][aA][vV][iI][nN][gG]\b\s*\w+(?:,\s*\w+)*./.test(query)) {
        return { isValid: false, message: 'Error at "having"!' }
    }
    validity = { isValid: true, message: "Valid Query" }
    return validity
}
/*
count()
count_if()
distinct()
length()
avg()
*/


const checkSelect = (query) => {
    let validity = {
        isValid: false,
        message: "Invalid Query",
    }
    if (!/\b[sS][eE][lL][eE][cC][tT]\b\s*\w+(?:,\s*\w+)/.test(query)) {
        return { isValid: false, message: 'Error at "select"!' }
    }
    else if (query.includes('distinct_count') && !/\b[sS][eE][lL][eE][cC][tT]\b\s*((\w+(?:,\s*\w+))|(distinct_count\(\w+\)\s*as\s*\w+))./.test(query)) {
        return { isValid: false, message: 'Error at "distinct_count" function in "select"!' }
    }
    else if (query.includes('count') && !/\b[sS][eE][lL][eE][cC][tT]\b\s*((\w+(?:,\s*\w+))|(count\(\w+\)\s*as\s*\w+))./.test(query)) {
        return { isValid: false, message: 'Error at "count" function in "select"!' }
    }
    else if (query.includes('count_if') && !/\b[sS][eE][lL][eE][cC][tT]\b\s*((\w+(?:,\s*\w+))|(count_if\(\w+\)\s*as\s*\w+))./.test(query)) {
        return { isValid: false, message: 'Error at "count_if" function in "select"!' }
    }
    else if (query.includes('distinct') && !/\b[sS][eE][lL][eE][cC][tT]\b\s*((\w+(?:,\s*\w+))|(distinct\(\w+\)\s*as\s*\w+))./.test(query)) {
        return { isValid: false, message: 'Error at "distinct" function in "select"!' }
    }
    else if (query.includes('length') && !/\b[sS][eE][lL][eE][cC][tT]\b\s*((\w+(?:,\s*\w+))|(length\(\w+\)\s*as\s*\w+))./.test(query)) {
        return { isValid: false, message: 'Error at "length" function in "select"!' }
    }
    else if (query.includes('avg') && !/\b[sS][eE][lL][eE][cC][tT]\b\s*((\w+(?:,\s*\w+))|(avg\(\w+\)\s*as\s*\w+))./.test(query)) {
        return { isValid: false, message: 'Error at "avg" function in "select"!' }
    }
    // else {
    //     return { isValid: false, message: 'Error: the function is not defined in "select"!' }
    // }

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

const checkForIncorrectPipes = (queryArray) => {
    for (const i in queryArray) {
        if (queryPattern.stream.test(queryArray[i]))
            continue
        let query = queryArray[i].trim().split(' ')
        // console.log(query)
        // console.log(queryPattern.all.test(query[0]))
        if (!queryPattern.all.test('limit'))
            return { isValid: false, message: `The pipe ${query[0]} does not exist` }

    }
    return { isValid: true, message: 'All pipe functions are' }
}



function validateQuery(queryString) {

    let validQ = {
        isValid: false,
        message: "Invalid Query",
    }


    if (queryPattern.stream.test(queryString)) {
        const queryArray = queryString.split("|")
        // console.log(queryArray)


        validQ = checkForIncorrectPipes(queryArray)
        if (!validQ.isValid) {
            return validQ
        }
        //check for non-repeatability of pipes
        validQ = checkForNonRepeatability(queryString)
        if (!validQ.isValid) {
            return validQ
        }


        for (const ind in queryArray) {
            if (queryPattern.stream.test(queryArray[ind]))
                continue
            if (queryArray[ind].toLowerCase().includes('limit') || queryArray[ind].includes('first') || queryArray[ind].includes('last')) {
                validQ = checkLimitFirstLast(queryArray[ind])
                continue
            }
            if (queryArray[ind].toLowerCase().includes('timeslice')) {
                validQ = checkTimeslice(queryArray[ind])
                continue
            }
            if (queryArray[ind].toLowerCase().includes('duration')) {
                validQ = checkDuration(queryArray[ind])
                continue
            }
            if (queryArray[ind].toLowerCase().includes('groupby')) {
                validQ = checkGroupby(queryArray[ind])
                continue
            }
            if (queryArray[ind].toLowerCase().includes('having')) {
                validQ = checkHaving(queryArray[ind])
                continue
            }
            if (queryArray[ind].toLowerCase().includes('select')) {
                validQ = checkSelect(queryArray[ind])
                continue
            }
            console.log(validQ)
        }
        //  all pipe functions should only come once
        // if (queryPattern.duration.test(query)) {

        //     let syntax2 = /\b[dD][uU][rR][aA][tT][iI][oO][nN]\b\s+\d{1,}[mhdwM]/
        //     let syntax1 = /\b[dD][uU][rR][aA][tT][iI][oO][nN]\b\s+[fF][rR][oO][mM]\s+\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}:\d{2}\s+\b[tT][oO]\b\s+\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}:\d{2}/
        //     // if (!syntax1.test(query) || !syntax2.test(query)) {
        //     if (!/\b[dD][uU][rR][aA][tT][iI][oO][nN]\b\s+\d{1,}[mhdwM]|\b[dD][uU][rR][aA][tT][iI][oO][nN]\b\s+[fF][rR][oO][mM]\s+\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}:\d{2}\s+\b[tT][oO]\b\s+\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}:\d{2}/g.test(query)) {
        //         return { isValid: false, message: 'For duration pipe, please write "1m" or "from date&time to date&time' }
        //     }
        //     else validQ = { isValid: true, message: "Valid Query" }
        // }
        // if (queryPattern.groupby.test(query)) {
        //     // if(/groupby(?:\s+\w+)(?:,\s*\w+)*/)
        //     // validQ =  { isValid: true, message: 'Query contains groupby' }
        //     // return {isValid: true, message: "Valid Query"}
        //     console.log("Groupby is there")

        // }
        return validQ
    }
    else {
        return { isValid: false, message: 'Invalid Query: Stream Missing' }
    }
}



//  groupby more discretely
//  duration more cases


module.exports = validateQuery;