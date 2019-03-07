let keyMirror = require('keymirror')

// const Constants = keyMirror({
//   INFLUX_HOST: null,
//   INFLUX_PORT: null,
// })
const Constants = {}

Constants.INFLUX_HOST = 'INFLUX_HOST'
Constants.INFLUX_PORT = 'INFLUX_PORT'
Constants.INFLUX_USERNAME = 'INFLUX_USERNAME'
Constants.INFLUX_PASSWORD = 'INFLUX_PASSWORD'
Constants.INFLUX_DB_NAME = 'INFLUX_DB_NAME'
Constants.INFLUX_DB_MEASUREMENT = 'INFLUX_DB_MEASUREMENT'
Constants.INSERT_DELAY_MS = 'INSERT_DELAY_MS'
Constants.PREV_SELECTED_STATIONS = 'PREV_SELECTED_STATIONS'
Constants.START_DATE = 'START_DATE'
Constants.END_DATE = 'END_DATE'
Constants.COLOUR_RED = '\u001b[41m \u001b[0m';
Constants.COLOUR_GREEN = '\u001b[42m \u001b[0m';

module.exports = Constants
