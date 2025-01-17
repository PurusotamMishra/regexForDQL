
const readline = require('readline');
var fs = require('fs');
const validateQuery = require('./validationQuery');
// const validationQuery = require('./validationQuery');
const downloadCSV = require('./resultCSV');
// const queries = require('./query')
const { streams, activeStream, sourceNameDetails } = require('./consts')
const streamList = [...new Set(activeStream.concat(...Object.keys(streams)))]

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


function promptUserForQuery() {
    // const query = `stream=AUTHENTICATION | duraton 5m | groupby system, length(col1, col2), user | limit 100 | select system, srcip as hohoho, user as hehehe`
//     const result = validateQuery(query, streams, streamList);
//     console.log('23', result.markers, result.time);


    fs.readFile("./eDQL_queries/wbks-8.log", "utf8", (err, file) => {
        // console.log(file.split(/\n/gm).filter(item => item !== '').filter(item => !/^stream/igm.test(item)))
        let queries = file.split(/\n/gm).filter(item => item !== '')
        var result = []
        for (let i in queries) {
            // console.log(streams)
            let res = validateQuery(queries[i], streams, streamList, sourceNameDetails)
            // console.log(res)
            // result.push(validateQuery(queries[i]));
            if (res.markers) {
                result[i].query = queries[i]
                result[i].performanceTime = res.time
                result.push(res.markers)
            } else {
                result[i].query = queries[i]
                result[i].performanceTime = res.time
                result.push([])
            }
        }
        downloadCSV(result, 'resultwithHaving.xlsx')
        console.log(result)
      });
    
    rl.close();
}

// Start the prompt
promptUserForQuery();
