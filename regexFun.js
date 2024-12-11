regexFun = "hello"

// timeslice = `(\b\s+\|\s+\b[tT][iI][mM][eE][sS][lL][iI][cC][eE]\s+(1m|1h))|(\bstream\b[\=]([\w]+|[*]))`
// stream = `(\bstream\b[\=]([\w]+|[*]))`
// duration = `(\s+\|\s+\b[dD][uU][rR][aA][tT][iI][oO][nN]\b\s+\d{1,}[mhdwM]|\s+\|\s+\b[dD][uU][rR][aA][tT][iI][oO][nN]\b\s+[fF][rR][oO][mM]\s+\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}:\d{2}\s+\b[tT][oO]\b\s+\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}:\d{2}\b)`
// groupby = `(\b\s+\|\s+\b[gG][rR][oO][uU][pP][bB][yY]\s+[\w+\,]+)`
// groupby = /\bgroupby\b\s*\w+(?:,\s*\w+)*/gm
// limit = `\b[lL][iI][mM][iI][tT]\b\s+\d{1,}`


// all = `(\s+\|\s+\b[dD][uU][rR][aA][tT][iI][oO][nN]\b\s+\d{1,}[mhdwM]|\s+\|\s+\b[dD][uU][rR][aA][tT][iI][oO][nN]\b\s+[fF][rR][oO][mM]\s+\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}:\d{2}\s+\b[tT][oO]\b\s+\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}:\d{2}\b)|(\b\s+\|\s+\b[gG][rR][oO][uU][pP][bB][yY]\s+[\w+\,]+)|(\b\s+\|\s+\b[tT][iI][mM][eE][sS][lL][iI][cC][eE]\s+(1m|1h))|(\bstream\b[\=]([\w]+|[*]))`


// stream=firewall | select srcip ,  dstip as  col1  ,  length(sourcename) , length( user ) as col2
// stream=firewall | select count( evtlen )



// // if groupby dne in the dql query
// if (gbyQuery === -1) {
//     // case I: does not contains functions that require groupby -- aggregate function
//     // case II: functions' syntax that does not require groupby
//     // case III: select contains single or multi fields 

//     if (/distinct_count\s*\(|count\s*\(|count_if\s*\(|distinct\s*\(|length\s*\(|avg\s*\(/i.test(query)) {
//         // console.log('Functions should not exists without groupby')
//         return { isValid: false, message: "Functions doesn't exists without groupby clause" }
//     }
//     else {
//         if (!/^\b[sS][eE][lL][eE][cC][tT]\b\s+(((\w+\s+as\s+\w+)|(\w+))(?:\s*,\s*(\w+(?:\s+as\s+\w+)?))*)$/.test(query.trim())) {
//             // check for columns syntax only: single and multiple fields with "as col_name"
//             let match = /\b[sS][eE][lL][eE][cC][tT]\b\s+(((\w+\s+as\s+\w+)|(\w+))(?:\s*,\s*(\w+(?:\s+as\s+\w+)?))*)/.exec(query.trim())
//             if (!match) {
//                 return { isValid: false, message: 'Error near select clause' }
//             }
//             const matchedPart = match[0]
//             const mismatchStart = matchedPart.length
//             return { isValid: false, message: `Error near 'select' clause at: ${query.trim().slice(mismatchStart)}` }
//         }
//     }
// }
// // if groupby exists in dql query
// else {
//     // case I: checks for functions that require groupby 
//     // case II: functions' syntax that does not require groupby
//     // case III: matches all the fields with grpby fields
//     if (/distinct_count\s*\(|count\s*\(|count_if\s*\(|distinct\s*\(|length\s*\(|avg\s*\(/i.test(query)) {
//         for (let i = 0; i < subFields.length; i++) {
//             if (/distinct_count\s*\(|count\s*\(|count_if\s*\(|distinct\s*\(|length\s*\(|avg\s*\(/i.test(subFields[i].trim().split('as')[0])) {
//                 validity = selectSubDirectiveCheck(subFields[i], i)
//                 if (validity.isValid) {
//                     if (!gbyFields.includes(validity.message.trim().split('as')[0])) {
//                         validity = { isValid: false, message: `Error at 'select' clause: ${validity.message.trim().split('as')[0]} is neither an aggregate function nor present in groupby clause!` }
//                     }
//                     if (!validity.isValid) break
//                 }
//                 else break
//             }
//             else {
//                 field = subFields[i]
//                 if (!gbyFields.includes(field.trim().split('as')[0])) {
//                     validity = { isValid: false, message: `Error at 'select' clause: ${field.trim().split('as')[0]} is neither an aggregate function nor present in groupby clause!` }
//                 }
//                 if (!validity.isValid) break
//             }
//         }
//         return validity
//         // return { isValid: false, message: "Functions doesn't exists without groupby clause" }
//     }
//     else {
//         if (!/^\b[sS][eE][lL][eE][cC][tT]\b\s+(((\w+\s+as\s+\w+)|(\w+))(?:\s*,\s*(\w+(?:\s+as\s+\w+)?))*)$/.test(query.trim())) {
//             // check for columns syntax only: single and multiple fields with "as col_name"
//             let match = /\b[sS][eE][lL][eE][cC][tT]\b\s+(((\w+\s+as\s+\w+)|(\w+))(?:\s*,\s*(\w+(?:\s+as\s+\w+)?))*)/.exec(query.trim())
//             if (!match) {
//                 return { isValid: false, message: 'Error near select clause' }
//             }
//             const matchedPart = match[0]
//             const mismatchStart = matchedPart.length
//             return { isValid: false, message: `Error near 'select' clause at: ${query.trim().slice(mismatchStart)}` }
//         }
//         else {
//             // syntax is correct, now check for column names matching with groupby clause
//             subFields.forEach(field => {
//                 if (!gbyFields.includes(field.trim().split('as')[0])) {
//                     validity = { isValid: false, message: `Error at 'select' clause: ${field.trim().split('as')[0]} is neither an aggregate function nor present in groupby clause!` }
//                 }
//             });
//             return validity
//         }
//     }
// }

[ 'Aggregate Functions', 'Window Functions', 'Array Functions', 'Map Functions', 'Date and Timestamp Functions', 'JSON Functions', 'Mathematical Functions', 'String Functions', 'Conditional Functions', 'Bitwise Functions', 'Conversion Functions', 'Predicate Functions', 'Csv Functions', 'Misc Functions', 'Generator Functions']