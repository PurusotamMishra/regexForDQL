
const readline = require('readline');
const validateQuery = require('./validateQuery');
const downloadCSV = require('./resultCSV');
const queries = require('./query')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


// Function to prompt user and validate query
function promptUserForQuery() {
    const query = `stream=nta-dhcp where evtlen between 800 and 900 and (sourcetype="FIREWALL") | limit 1`
    const result = validateQuery(query);
    console.log(result.message);

    // var result = []
    // for (let i in queries) {
    //     result.push(validateQuery(queries[i]));
    //     result[i].query=queries[i]
    // }
    // downloadCSV(result, 'result.xlsx')
    // console.log(result)

    rl.close();
}

// Start the prompt
promptUserForQuery();
