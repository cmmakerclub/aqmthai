const moment = require('moment-timezone')
const stations = require('./stationsDb')
const ProgressBar = require('progress')
const sequential = require('promise-sequential')
const Influx = require('influx')
const inquirer = require('inquirer')
const Constants = require('./Constants')
const {createInsertDbDispatcher} = require('./Dispatchers')
const {showFiglet, configStore, get} = require('./utils')

let influxHost = configStore.get(Constants.INFLUX_HOST) || process.env.INFLUX_HOST || 'localhost'
let influxPort = configStore.get(Constants.INFLUX_PORT) || process.env.INFLUX_PORT || 8086
let influxUsername = configStore.get(Constants.INFLUX_USERNAME) || process.env.INFLUX_USERNAME || 'admin'
let influxPassword = configStore.get(Constants.INFLUX_PASSWORD) || process.env.INFLUX_PASSWORD || 'admin'
let influxDbName = configStore.get(Constants.INFLUX_DB_NAME) || process.env.INFUX_DBNAME || "db1"
let influxDbMeasurement = process.env.INFUX_MEASUREMENT || 'aqm'
let insertDbDelayMs = configStore.get(Constants.INSERT_DELAY_MS) || process.env.INSERT_DELAY_MS || 25
let influx

const program = require('commander');
const pkg = require('../package.json');

let sct = 0

const log = (...args) => bar.interrupt(...args)

program
.usage('[options]')
.version(pkg.version)
.option('-b, --background', 'run aqmthai in non-interactive mode')

program.parse(process.argv);


const bar = new ProgressBar('[job=:jobId] inserting station=:station (:a/:b) [:bar] :percent remaining: :etas', {
  complete: Constants.COLOUR_GREEN,
  incomplete: Constants.COLOUR_RED,
  width: 20,
  total: 100
})

const go = ({selectedStations, insertDbDispatcher, startDate, endDate}) => {
  let downloadedCount = 1
  const promises = selectedStations.map(stationId => {
    return () => new Promise((resolve, reject) => {
      const stationName = stations[stationId]
      const _resolve = (items) => {
        if (downloadedCount > (selectedStations.length * 0.8))
          insertDbDispatcher.run_once()
        downloadedCount++
        insertDbDispatcher.add(items)
        log(`  ${items.length} records has been downloaded from station=${stationId}.`)
        resolve(items)
      }
      let jobId = ++sct

      log(`> starting job ${jobId}/${selectedStations.length} station=${stationName}`)
      let params = {
        paramValue: 'CO,NO,NOX,NO2,SO2,O3,PM10,WD,TEMP,RH,SRAD,NRAD,BP,RAIN,WS,THC,PM2.5',
        action: 'showTable',
        reportType: 'Raw',
        startTime: '00:00:00',
        endTime: '00:00:00',
        dataReportType: '_h',
        showNumRow: '100000',
        pageNo: '1',
      }
      params = Object.assign(params, {
        stationId,
        endDate,
        startDate,
        stationName,
        jobId
      })
      get(params).then(_resolve).catch(reject)
    })
  })

  bar.interrupt(`startDate = ${startDate}`)
  bar.interrupt(`endDate = ${endDate}`)


  sequential(promises).then(res => {
    // log('all http requests done.')
  })
  .catch(err => {
    log(`request error = ${err}`)
  })
}


influx = new Influx.InfluxDB({
  hosts: [{host: influxHost, port: influxPort}],
  username: influxUsername,
  password: influxPassword,
  database: influxDbName
})

if (program.background) {
  let insertDbDispatcher = createInsertDbDispatcher({
    insertDbDelayMs, influx,
    influxDbMeasurement, influxDbName, bar, process
  })

  selectedStations = configStore.get(Constants.PREV_SELECTED_STATIONS, [])
  let endDate = configStore.get(Constants.END_DATE)
  let startDate = configStore.get(Constants.START_DATE)
  go({selectedStations, insertDbDispatcher, startDate, endDate})

  return
} else {
  console.log('....')
}


const promptLogin = () => {
  const currentYear = moment().year()
  let selectedStartYear = currentYear
  let start = 2010
  let years = [
    ...Array.from({length: currentYear - start + 1}).map((v, k) => start + k),
    new inquirer.Separator()
  ]

  const questions = [
    {
      name: 'influxHost',
      type: 'input',
      default: influxHost,
      message: 'Enter your InfluxDB host:',
      validate: function (value) {
        if (value.length) {
          influxHost = value
          configStore.set(Constants.INFLUX_HOST, influxHost)
          return true
        } else {
          return 'Please enter your host:'
        }
      }
    },
    {
      name: 'influxPort',
      type: 'number',
      default: influxPort,
      message: 'Enter your InfluxDB port:',
      validate: function (value) {
        const input = parseInt(value, 10)
        if (!isNaN(input)) {
          influxPort = input
          configStore.set(Constants.INFLUX_PORT, influxPort)
          return true
        } else {
          return 'Please the valid port number.'
        }
      }
    },
    {
      name: 'influxDbName',
      type: 'input',
      default: influxDbName,
      message: 'Enter your InfluxDB database name:',
      validate: function (value) {
        if (value.length) {
          influxDbName = value
          configStore.set(Constants.INFLUX_DB_NAME, influxDbName)
          return true
        } else {
          return 'Please enter your influxDB database name.'
        }
      }
    },
    {
      name: 'influxUsername',
      type: 'input',
      default: influxUsername,
      message: 'Enter your InfluxDB username:',
      validate: function (value) {
        if (value.length) {
          influxUsername = value
          configStore.set(Constants.INFLUX_USERNAME, influxUsername)
          return true
        } else {
          return 'Please enter your influxDB username.'
        }
      }
    },
    {
      name: 'influxPassword',
      type: 'password',
      mask: '*',
      default: influxPassword.split('').map(c => '*').join(''),
      message: 'Enter your InfluxDB password:',
      validate: function (value) {
        const marked = influxPassword.split('').map(c => '*').join('')
        if (value.length) {
          if (value === marked) {
            // do nothing
          } else {
            influxPassword = value
          }
          configStore.set(Constants.INFLUX_PASSWORD, influxPassword)
          return true
        } else {
          return 'Please enter your influxdb password'
        }
      }
    },
    {
      name: 'influxMeasurement',
      type: 'input',
      default: influxDbMeasurement,
      message: 'Enter your InfluxDB measurement:',
      validate: value => {
        if (value.length) {
          influxDbMeasurement = value
          configStore.set(Constants.INFLUX_DB_MEASUREMENT, influxDbMeasurement)
          return true
        } else {
          return 'Please enter your influxdb measurement name.'
        }
      }
    },
    {
      name: 'insertDbDelayMs',
      type: 'input',
      default: insertDbDelayMs,
      message: 'Insertion delay in ms.',
      validate: value => {
        if (value.length) {
          insertDbDelayMs = value
          configStore.set(Constants.INSERT_DELAY_MS, insertDbDelayMs)
          return true
        } else {
          return 'Insertion delay in ms.'
        }
      }
    },
    {
      name: 'startyear',
      default: currentYear,
      type: 'input',
      validate: (startyear) => {
        const startYear = parseInt(startyear, 10)
        if (startYear <= currentYear && startYear >= 2010) {
          selectedStartYear = startYear
          years = years.filter(val => val < startYear)
          return true
        } else {
          return 'enter a valid sensor data date from 2010 until now, try again:'
        }
      },
      message: 'Enter the start-year:',
    },
    {
      name: 'endyear',
      type: 'input',
      message: 'Enter the end-year:',
      default: selectedStartYear,
      validate: (endyear) => {
        const endYear = parseInt(endyear, 10)
        if (endYear >= selectedStartYear && endYear <= currentYear) {

          return true
        } else {
          return `enter a valid sensor data date from ${selectedStartYear} to ${currentYear}.`
        }
      },
    },
  ]
  return inquirer.prompt(questions)
}

const login = () => {
  promptLogin().then(answers => {

    let endDate = process.env.START_DATE || `${answers.endyear}-12-31`
    let startDate = process.env.END_DATE || `${answers.startyear}-01-01`

    configStore.set(Constants.END_DATE, endDate)
    configStore.set(Constants.START_DATE, startDate)

    let insertDbDispatcher = createInsertDbDispatcher({
      insertDbDelayMs, influx,
      influxDbMeasurement, influxDbName, bar, process
    })

    influx.getDatabaseNames().then(names => {
      if (names.includes(influxDbName)) {
        showStationsCheckbox().then(selectedStations => {
          configStore.set(Constants.PREV_SELECTED_STATIONS, selectedStations)
          selectedStations = configStore.get(Constants.PREV_SELECTED_STATIONS) || []
          let endDate = configStore.get(Constants.END_DATE)
          let startDate = configStore.get(Constants.START_DATE)
          go({selectedStations, insertDbDispatcher, startDate, endDate})
        })
      } else {
        console.log(names, 'your input >>', influxDbName)
        console.log(`invalid database name.`)
        login()
      }
    }).catch(ex => {
      console.log(ex.toString())
      login()
    })
  })
}

showFiglet()
login()

const showStationsCheckbox = () => {
  const qText = 'choose stations'
  const prevSelectedStations = configStore.get(Constants.PREV_SELECTED_STATIONS) || []


  let questions = [{
    name: qText,
    message: 'Select aqmthai.com\'s station.',
    type: 'checkbox',
    defaultChecked: true,
    paginated: false,
    pageSize: 10,
    choices: [...Object.entries(stations).map(([stationId, name]) => {
      return {
        value: stationId,
        name,
        checked: prevSelectedStations.includes(stationId)
      }
    }), new inquirer.Separator()],
    validate: val => val.length !== 0
  }]
  return inquirer.prompt(questions).then(answers => {
    return answers[qText]
  })
}

// const fetchBucket = []
// const d2 = createDispatcher(fetchBucket, 10, {
//   fn: (row, ct, total) => {
//     console.log('d2 dispatcher', row, ct, total)
//   }
// })
