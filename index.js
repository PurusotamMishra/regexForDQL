// index.js

const readline = require('readline');
const validateQuery = require('./validateQuery');

// Create an interface for input and output
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to prompt user and validate query
function promptUserForQuery() {
    rl.question('Please enter your SQL query: ', (query) => {
        // const query = "stream = firewall | groupby srcip,dstip, system | limit 10 | timeslice 1m | duration from 2024-09-12T12:00:00 to 2024-09-12T12:00:00 "
        const result = validateQuery(query);
        console.log(result.message);
        rl.close();
    });
}

// Start the prompt
promptUserForQuery();