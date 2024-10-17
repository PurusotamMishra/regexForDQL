// const fs = require('fs');

// function convertToCSV(array) {
//     const keys = Object.keys(array[0]);
//     const csvRows = [];

//     csvRows.push(keys.join(','));

//     for (const row of array) {
//         csvRows.push(keys.map(key => `"${row[key]}"`).join(',')); // Enclose values in quotes
//     }

//     return csvRows.join('\n');
// }
// function writeCSVToFile(array, filename) {
//     const csvContent = convertToCSV(array)
//     fs.writeFileSync(filename, csvContent, 'utf8');
// }

function downloadCSV(array, filename) {
    // writeCSVToFile(array, filename)
    writeXLSXFile(array, filename)
}

const xlsx = require('xlsx');

function writeXLSXFile(array, filename) {
    // Create a new workbook
    const workbook = xlsx.utils.book_new();
    
    // Convert the array of objects to a worksheet
    const worksheet = xlsx.utils.json_to_sheet(array);
    
    // Append the worksheet to the workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    
    // Write the workbook to a file
    xlsx.writeFile(workbook, filename);
}


module.exports = downloadCSV;