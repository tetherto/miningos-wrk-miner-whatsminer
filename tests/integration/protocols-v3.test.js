'use strict'

const test = require('brittle')
const Miner = require('../../workers/lib/miner')
const TcpFacility = require('svc-facs-tcp')
const srv = require('../../mock/server')

const PORT = 14433
const HOST = '127.0.0.1'
const PASSWORD = 'super'
const SERIAL = 'TEST12345V3'

let mockServer
let miner

test('V3 Protocol - setup', async (t) => {
  mockServer = srv.createServer({
    host: HOST,
    port: PORT,
    type: 'M56s',
    serial: SERIAL,
    password: PASSWORD,
    apiVersion: 'v3'
  })

  miner = new Miner({
    timeout: 5000,
    socketer: {
      readStrategy: TcpFacility.TCP_READ_STRATEGY.ON_END,
      rpc: (opts) => new TcpFacility().getRPC(opts)
    },
    address: HOST,
    port: PORT,
    password: PASSWORD,
    id: 'test-v3',
    apiVersion: '3.0.3'
  })

  await miner.init()

  t.is(miner.apiVersion, '3.0.3', 'should have V3 API version')
  t.ok(miner.protocolHandler, 'should have protocol handler')
})

test('V3 Protocol - command transformation', (t) => {
  const handler = miner.protocolHandler

  // Verify commands are transformed to dot notation
  t.is(handler.transformCommand('get_token'), 'get.device.info', 'get_token transforms correctly')
  t.is(handler.transformCommand('get_version'), 'get.version', 'get_version transforms correctly')
  t.is(handler.transformCommand('update_pools'), 'update.pools', 'update_pools transforms correctly')
  t.is(handler.transformCommand('power_on'), 'power.on', 'power_on transforms correctly')
  t.is(handler.transformCommand('set_led'), 'set.led', 'set_led transforms correctly')

  // V3 uses get.miner.status with param for summary/pools/edevs
  t.is(handler.transformCommand('summary'), 'get.miner.status', 'summary transforms to get.miner.status')
  t.is(handler.getStatusParam('summary'), 'summary', 'summary has correct status param')
  t.is(handler.getStatusParam('pools'), 'pools', 'pools has correct status param')
  t.is(handler.getStatusParam('edevs'), 'edevs', 'edevs has correct status param')
})

test('V3 Protocol - getVersion', async (t) => {
  const version = await miner.getVersion()

  t.ok(version, 'should return version')
  t.ok(version.chip, 'should have chip')
  t.ok(version.platform, 'should have platform')
  t.ok(version.whatsminer, 'should have whatsminer info')
  t.ok(version.whatsminer.api, 'should have api version')
  t.ok(version.whatsminer.firmware, 'should have firmware version')
  t.is(version.apiVersion, '3.0.3', 'should include apiVersion')
})

test('V3 Protocol - getMinerStats', async (t) => {
  const stats = await miner.getMinerStats()

  t.ok(stats, 'should return stats')
  t.ok(typeof stats.elapsed === 'number' || stats.elapsed !== undefined, 'should have elapsed')
  t.ok(typeof stats.mhs_av === 'number' || stats.mhs_av !== undefined, 'should have mhs_av')
  t.ok(typeof stats.temperature === 'number' || stats.temperature !== undefined, 'should have temperature')
  t.ok(typeof stats.power === 'number' || stats.power !== undefined, 'should have power')
})

test('V3 Protocol - getPools', async (t) => {
  const pools = await miner.getPools()

  t.ok(Array.isArray(pools), 'should return array of pools')
  t.ok(pools.length > 0, 'should have at least one pool')

  const pool = pools[0]
  t.ok(pool.url, 'pool should have url')
  t.ok(typeof pool.index === 'number', 'pool should have index')
  t.ok(pool.user, 'pool should have user')
})

test('V3 Protocol - getDevices', async (t) => {
  const devices = await miner.getDevices()

  t.ok(Array.isArray(devices), 'should return array of devices')
  t.ok(devices.length > 0, 'should have at least one device')

  const device = devices[0]
  t.ok(typeof device.index === 'number', 'device should have index')
  t.ok(typeof device.slot === 'number', 'device should have slot')
})

test('V3 Protocol - getErrors', async (t) => {
  const errors = await miner.getErrors()

  t.ok(Array.isArray(errors), 'should return array of errors')
})

test('V3 Protocol - getMinerInfo', async (t) => {
  const info = await miner.getMinerInfo()

  t.ok(info, 'should return miner info')
  t.ok(info.ip, 'should have ip')
  t.ok(info.proto, 'should have proto')
})

test('V3 Protocol - getSnap', async (t) => {
  const snap = await miner.getSnap()

  t.ok(snap, 'should return snap')
  t.ok(snap.success, 'should be successful')
  t.ok(snap.stats, 'should have stats')
  t.ok(snap.config, 'should have config')
  t.is(snap.config.api_version, '3.0.3', 'should have api_version in config')
})

test('V3 Protocol - setLED on', async (t) => {
  const result = await miner.setLED(true)

  t.ok(result, 'should return result')
  t.ok(result.success, 'should be successful')
})

test('V3 Protocol - setLED off', async (t) => {
  const result = await miner.setLED(false)

  t.ok(result, 'should return result')
  t.ok(result.success, 'should be successful')
})

test('V3 Protocol - reboot', async (t) => {
  const result = miner.reboot()

  t.ok(result, 'should return result')
  t.ok(result.success, 'should be successful')
})

// Note: restartMinerSoftware is not tested here because the mock returns null
// (simulating the miner restarting without responding)

test('V3 Protocol - cleanup', async (t) => {
  try {
    await miner.close()
  } catch (e) {
    // Ignore cleanup errors
  }
  try {
    mockServer.exit()
  } catch (e) {
    // Ignore cleanup errors
  }
  t.ok(true, 'cleanup complete')
})
