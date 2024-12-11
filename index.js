
const readline = require('readline');
const validateQuery = require('./validationQuery');
// const validationQuery = require('./validationQuery');
const downloadCSV = require('./resultCSV');
const queries = require('./query')
const { streams, activeStream } = require('./consts')
const streamList = [...new Set(activeStream.concat(...Object.keys(streams)))]

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


// Function to prompt user and validate query
function promptUserForQuery() {
    // stream=ep-registry where action='OBJECT_MODIFIED' and rlike(targetobject,".*currentversion\\\\(runservices|run| Windows\\\\Appinit_Dlls.*|Winlogon\\\\(Shell|Userinit|VmApplet)|policies\\\\explorer\\\\run)|.*currentcontrolset\\\\Control\\\\Lsa\\\\|Microsoft\\\\Windows\sNT\\\\CurrentVersion\\\\Image\sFile\sExecution\sOptions|HKLM\\\\SOFTWARE\\\\Microsoft\\\\Netsh.*") | duration 1h | groupby system
    // stream=dns | duration from  @now-10m  to  @now-5m
    // stream=AUTHENTICATION | duration 5m | groupby system, length(col1, col2), user | limit 100 | select system, srcip as hohoho, user as hehehe
    // const query = `stream=firewall WHERE name LIKE 'J%' AND department IN ('HR', 'Finance', 'IT') AND status = 'Active'`
    // const result = validateQuery(query);
    // console.log(result.message);

    var result = []
    for (let i in queries) {
        // console.log(streams)
        let res = validateQuery(queries[i], streams, streamList)
        console.log(res)
        // result.push(validateQuery(queries[i]));
        if (res) {
            result.push(res)
            result[i].query = queries[i]
        } else {
            result.push([])
            result[i].query = queries[i]
        }
    }
    downloadCSV(result, 'result.xlsx')
    console.log(result)

    rl.close();
}

// Start the prompt
promptUserForQuery();
