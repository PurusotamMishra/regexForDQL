regexFun = "hello"

// timeslice = `(\b\s+\|\s+\b[tT][iI][mM][eE][sS][lL][iI][cC][eE]\s+(1m|1h))|(\bstream\b[\=]([\w]+|[*]))`
// stream = `(\bstream\b[\=]([\w]+|[*]))`
// duration = `(\s+\|\s+\b[dD][uU][rR][aA][tT][iI][oO][nN]\b\s+\d{1,}[mhdwM]|\s+\|\s+\b[dD][uU][rR][aA][tT][iI][oO][nN]\b\s+[fF][rR][oO][mM]\s+\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}:\d{2}\s+\b[tT][oO]\b\s+\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}:\d{2}\b)`
// groupby = `(\b\s+\|\s+\b[gG][rR][oO][uU][pP][bB][yY]\s+[\w+\,]+)`
// groupby = /\bgroupby\b\s*\w+(?:,\s*\w+)*/gm
// limit = `\b[lL][iI][mM][iI][tT]\b\s+\d{1,}`


// all = `(\s+\|\s+\b[dD][uU][rR][aA][tT][iI][oO][nN]\b\s+\d{1,}[mhdwM]|\s+\|\s+\b[dD][uU][rR][aA][tT][iI][oO][nN]\b\s+[fF][rR][oO][mM]\s+\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}:\d{2}\s+\b[tT][oO]\b\s+\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}:\d{2}\b)|(\b\s+\|\s+\b[gG][rR][oO][uU][pP][bB][yY]\s+[\w+\,]+)|(\b\s+\|\s+\b[tT][iI][mM][eE][sS][lL][iI][cC][eE]\s+(1m|1h))|(\bstream\b[\=]([\w]+|[*]))`