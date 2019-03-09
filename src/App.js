const stations = require('./stationsDb')
const ProgressBar = require('progress')
const Influx = require('influx')
const Constants = require('./Constants')
const {createInsertDbDispatcher} = require('./Dispatchers')

const {inquirerAppConfigs, showStationsCheckbox} = require('./Questions')
const sequential = require('promise-sequential')
const {configStore, get, reloadConfig} = require('./utils')

let sct = 0
const log = (...args) => bar.interrupt(...args)
const bar = new ProgressBar('[job=:jobId] inserting station=:station (:a/:b) [:bar] :percent remaining: :etas', {
  complete: Constants.COLOUR_GREEN,
  incomplete: Constants.COLOUR_RED,
  width: 20,
  total: 100
})

let {
  influxHost,
  influxPort,
  influxUsername,
  influxPassword,
  influxDbName,
  influxDbMeasurement,
  insertDbDelayMs,
  influx
} = reloadConfig()

const start = () => {
  inquirerAppConfigs().then(answers => {
    let endDate = process.env.START_DATE || `${answers.endyear}-12-31`
    let startDate = process.env.END_DATE || `${answers.startyear}-01-01`

    configStore.set(Constants.END_DATE, endDate)
    configStore.set(Constants.START_DATE, startDate)

    let {
      influxHost,
      influxPort,
      influxUsername,
      influxPassword,
      influxDbName,
      influxDbMeasurement,
      insertDbDelayMs,
    } = reloadConfig()

    influx = new Influx.InfluxDB({
      hosts: [{host: influxHost, port: influxPort}],
      username: influxUsername,
      password: influxPassword,
      database: influxDbName
    })

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
        start()
      }
    }).catch(ex => {
      console.log(ex.toString())
      start()
    })
  })
}

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

const background = () => {
  influx = new Influx.InfluxDB({
    hosts: [{host: influxHost, port: influxPort}],
    username: influxUsername,
    password: influxPassword,
    database: influxDbName
  })

  let insertDbDispatcher = createInsertDbDispatcher({
    insertDbDelayMs, influx,
    influxDbMeasurement, influxDbName, bar, process
  })

  let selectedStations = configStore.get(Constants.PREV_SELECTED_STATIONS) || []
  let endDate = configStore.get(Constants.END_DATE)
  let startDate = configStore.get(Constants.START_DATE)

  go({
    selectedStations,
    insertDbDispatcher,
    startDate, endDate
  })

}

module.exports = {
  background,
  start,
  go
}
