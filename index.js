
const readline = require('readline');
const validateQuery = require('./validationQuery');
// const validationQuery = require('./validationQuery');
const downloadCSV = require('./resultCSV');
const queries = require('./query')
const { streams, activeStream, sourceNameDetails } = require('./consts')
const streamList = [...new Set(activeStream.concat(...Object.keys(streams)))]

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


// Function to prompt user and validate query
function promptUserForQuery() {
    // stream=ep-registry where action='OBJECT_MODIFIED' and rlike(targetobject,".*currentversion\\\\(runservices|run| Windows\\\\Appinit_Dlls.*|Winlogon\\\\(Shell|Userinit|VmApplet)|policies\\\\explorer\\\\run)|.*currentcontrolset\\\\Control\\\\Lsa\\\\|Microsoft\\\\Windows\sNT\\\\CurrentVersion\\\\Image\sFile\sExecution\sOptions|HKLM\\\\SOFTWARE\\\\Microsoft\\\\Netsh.*") | duration 1h | groupby system
    // stream=dns | duration from  @now-10m  to  @now-5m
    // const query = `stream=AUTHENTICATION | duraton 5m | groupby system, length(col1, col2), user | limit 100 | select system, srcip as hohoho, user as hehehe`
    // const query = `stream=threat where devsrcip='Abnormal' and attacktype like("%Phishing%") and isautoremediated='False' and ispostremediated='False' | checkif domain in tcstipdomain.Domain |duration 1h`
    // const result = validateQuery(query, streams, streamList);
    // console.log('23', result.markers, result.time);

    var result = []
    for (let i in queries) {
        // console.log(streams)
        let res = validateQuery(queries[i], streams, streamList, sourceNameDetails)
        // console.log(res)
        // result.push(validateQuery(queries[i]));
        if (res.markers) {
            result.push(res.markers)
            result[i].query = queries[i]
            result[i].performanceTime = res.time
        } else {
            result.push([])
            result[i].query = queries[i]
        }
    }
    downloadCSV(result, 'resultwithHaving.xlsx')
    console.log(result)

    rl.close();
}

// Start the prompt
promptUserForQuery();
