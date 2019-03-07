const {createDispatcher} = require('./utils')
const createInsertDbDispatcher = ({insertDbDelayMs, influx, influxDbName, influxDbMeasurement, bar, process}) => {
  const bucket = []
  return createDispatcher({refBucket: bucket, intervalTimeMs: insertDbDelayMs}, {
    pass: row => Object.keys(row.data).length > 0,
    fn: (row, ct, total) => {
      const point = Object.assign({}, row.data)
      const {stationId, stationName, time, jobId} = row.extra
      influx.writePoints([{
        measurement: influxDbMeasurement, tags: {stationId: stationName},
        fields: point,
        timestamp: time,
      }], {
        precision: 's',
        database: influxDbName
      }).then(() => {
        bar.update(ct / total, {a: ct, b: total, station: stationId, jobId, speed: 1000 / insertDbDelayMs})
      }).catch((err) => {
        console.log(`(${ct}${total}) stationId = ${stationId} write data point failed.`, err.toString())
        console.log(row)
        console.log('--------------------------------')
      })
    },
    finishFn: () => {
      bar.terminate()
      console.log('app finished.')
      process.exit()
    }
  })
}


module.exports = {createInsertDbDispatcher: createInsertDbDispatcher}
