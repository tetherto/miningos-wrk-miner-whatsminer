'use strict'

const test = require('brittle')
const lWrkFunLogs = require('@tetherto/miningos-tpl-wrk-thing/workers/lib/wrk-fun-logs')
const WrkMinerRackM63 = require('../../workers/m63.rack.miner.wrk')

const saved = []
lWrkFunLogs.saveLogData = async function (key, ts, data) { saved.push({ key, ts, data }) }

const proto = WrkMinerRackM63.prototype
const THINGS = {
  a: { info: { container: 'group-16', pos: '16-3_12' }, last: { snap: { stats: { temperature_c: { max: 69.2, chips: [{ index: 0, max: 68.09 }] } } } } },
  b: { info: { container: 'maintenance', pos: '' }, last: { snap: { stats: { temperature_c: { max: 40 } } } } },
  c: { info: { container: 'group-16', pos: '16-3_13' }, last: { snap: { stats: {} } } }
}
const rack = (extra = {}) => Object.assign(Object.create(proto), { ctx: {}, loadLib: () => null, mem: { things: THINGS } }, extra)

test('m63 daily temperatures: stores one reading per racked position', async (t) => {
  saved.length = 0
  await rack().saveDailyTemperatures(new Date('2026-09-04T00:00:00.500Z'))

  t.is(saved.length, 1)
  t.is(saved[0].key, 'stat-temperature-1D-t-miner', 'writes to its own daily log')
  t.is(saved[0].ts, 1788480000000, 'timestamp is floored to the scheduler tick')
  t.alike(Object.keys(saved[0].data.temperature_c_group), ['group-16-16-3_12'], 'unpositioned and unread miners are skipped')
  t.alike(saved[0].data.temperature_c_group['group-16-16-3_12'], THINGS.a.last.snap.stats.temperature_c, 'reading is stored as-is')
})

test('m63 daily temperatures: only the daily stat build writes the log', async (t) => {
  saved.length = 0
  await rack().buildStats('stat-5m', new Date())
  t.is(saved.length, 0, 'no write on the 5m build')

  await rack().buildStats('stat-1D', new Date())
  t.is(saved.length, 1, 'written on the daily build')
})
