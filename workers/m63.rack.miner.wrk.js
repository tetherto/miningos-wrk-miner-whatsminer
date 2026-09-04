'use strict'

const WrkMinerRack = require('./lib/worker-base.js')
const async = require('async')
const lWrkFunLogs = require('@tetherto/miningos-tpl-wrk-thing/workers/lib/wrk-fun-logs')
const { groupByMinerInfo } = require('./lib/stats')
const { DAILY_STAT_KEY, DAILY_TEMPERATURE_KEY } = require('./lib/constants')

class WrkMinerRackM63 extends WrkMinerRack {
  getThingType () {
    return super.getThingType() + '-m63'
  }

  getSpecTags () {
    return super.getSpecTags().concat([this.getThingType()])
  }

  async buildStats (sk, fireTime) {
    if (sk === DAILY_STAT_KEY) {
      await this.saveDailyTemperatures(fireTime)
    }

    return super.buildStats(sk, fireTime)
  }

  async saveDailyTemperatures (time) {
    const ts = Math.floor(time.getTime() / 1000) * 1000
    const temperatureCGroup = {}

    for (const thg of Object.values(this.mem.things)) {
      const reading = thg?.last?.snap?.stats?.temperature_c
      if (!reading || !thg.info?.container || !thg.info?.pos) continue
      temperatureCGroup[groupByMinerInfo(null, thg)] = reading
    }

    try {
      await lWrkFunLogs.saveLogData.call(
        this,
        `${DAILY_TEMPERATURE_KEY}-t-miner`,
        ts,
        { ts, temperature_c_group: temperatureCGroup },
        0,
        true
      )
    } catch (e) {
      this.debugError('ERR_DAILY_TEMPERATURES_SAVE', e)
    }
  }

  _start (cb) {
    async.series([
      (next) => { super._start(next) },
      (next) => {
        this._addWhitelistedActions([
          ['setUpfreqSpeed', 2]
        ])

        next()
      }
    ], cb)
  }
}

module.exports = WrkMinerRackM63
