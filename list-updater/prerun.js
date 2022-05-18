const { runDate } = require('./settings.json')

const date = new Date()
const dateToPass = new Date(runDate)
const millis = date.getTime()
const millisToPass = dateToPass.getTime()

if (millis <= millisToPass) {
    process.exit(1)
} 