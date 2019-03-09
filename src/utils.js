const clear = require('clear')
const chalk = require('chalk')
const figlet = require('figlet')
const moment = require('moment-timezone')
const pkg = require('../package')
const fetch = require('node-fetch')
const FormData = require('form-data')
const parse = require('xml-parser')
const Configstore = require('configstore')
const stations = require('./stationsDb')
const Constants = require('./Constants')

const createDispatcher = ({refBucket, intervalTimeMs}, {pass, fn, finishFn}) => {
  let intervalId
  let ct = 0
  let total = 0
  let started = false
  let finished = false
  return {
    run_once: () => {
      if (started) {
        // do nothing
      } else {
        console.log(`starting dispatcher interval time = ${1000 / intervalTimeMs}Hz`)
        intervalId = setInterval(() => {
            if (refBucket.length === 0) {
              if (started && !finished) {
                finished = true
                started = false
                clearInterval(intervalId)
                finishFn && finishFn()
              }
            } else {
              started = true
              let row = refBucket.shift()
              if (pass && !pass(row)) return

              fn(row, ++ct, total)
            }
          }, intervalTimeMs
        )
      }
    },
    stop: () => {
      clearInterval(intervalId)
    },
    add: (items) => {
      total += items.length
      refBucket.push(...items)
    },
    isFinished: () => finished
  }
}

const showFiglet = () => {
  clear()
  let t1 = figlet.textSync(`${pkg.name}`, {
    font: 'Fuzzy',
    horizontalLayout: 'full',
    verticalLayout: 'fitted'
  })

  console.log(chalk.magenta(t1))
  console.log(`v${pkg.version}`)

}

const configStore = new Configstore(pkg.name, {})


const get = (params) => {
  let body = new FormData()
  let sensorTitleMap
  let stationId = params.stationId
  let jobId = params.jobId
  Object.entries(params).forEach(([key, value]) => body.append(key, value))
  // log(`start fetching station ${stationId}....`)

  return fetch('http://aqmthai.com/includes/getMultiManReport.php', {
    method: 'POST', body, header: body.getHeaders()
  }).then(res => res.text())
  .then(body => {
    const xml = parse(body)
    const rows = xml.root.children[2].children
    const trHeader = rows.shift().children
    sensorTitleMap = trHeader.map(val => {
      const [field1, field2] = val.content.split('_')
      return field2 || '_time'
    })
    rows.splice(-5) // remove average fields 5 last fields
    return rows
  })
  .then(rows => {
    return rows.map(v => {
      let c = v.children.shift().content
      let [yyyy, m, d, hh, mm, ss] = c.split(',')
      let time = moment.tz([yyyy, m - 1, d, hh, mm, ss], 'Asia/Bangkok').toDate()
      let values = v.children.map(v => parseFloat(v.content) || -1)
      let data = Object.entries([time, ...values]).reduce((prev, [idx, val]) => {
        (val !== -1) && (prev[sensorTitleMap[idx]] = val)
        return prev
      }, {})
      delete data._time
      return Object.assign({}, {
        data,
        extra: {
          time: time,
          stationId: stationId,
          jobId,
          stationName: stations[stationId]
        }
      })
    })
  })
  .catch(err => {
    console.log('...fetch error.')
    log(`fetch data error at station ${stationId}.`)
  })
}

const reloadConfig = () => {
  let influxHost = configStore.get(Constants.INFLUX_HOST) || process.env.INFLUX_HOST || 'localhost'
  let influxPort = configStore.get(Constants.INFLUX_PORT) || process.env.INFLUX_PORT || 8086
  let influxUsername = configStore.get(Constants.INFLUX_USERNAME) || process.env.INFLUX_USERNAME || 'admin'
  let influxPassword = configStore.get(Constants.INFLUX_PASSWORD) || process.env.INFLUX_PASSWORD || 'admin'
  let influxDbName = configStore.get(Constants.INFLUX_DB_NAME) || process.env.INFUX_DBNAME || "db1"
  let influxDbMeasurement = process.env.INFUX_MEASUREMENT || 'aqm'
  let insertDbDelayMs = configStore.get(Constants.INSERT_DELAY_MS) || process.env.INSERT_DELAY_MS || 25
  return {
    influxHost,
    influxPort,
    influxUsername,
    influxPassword,
    influxDbName,
    influxDbMeasurement,
    insertDbDelayMs
  }
}
module.exports = {
  createDispatcher, showFiglet, configStore, get, reloadConfig
}

