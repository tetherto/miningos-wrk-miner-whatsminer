'use strict'

const test = require('brittle')
const Miner = require('../../workers/lib/miner')
const TcpFacility = require('@tetherto/svc-facs-tcp')
const srv = require('../../mock/server')

// Mirrors real v3 firmware: v2-compat API on PORT, v3 API (framed) on V3_PORT
const PORT = 14028
const V3_PORT = 14433
const HOST = '127.0.0.1'
const PASSWORD = 'super'
const SERIAL = 'TEST12345V3'

let mockServer
let miner

test('V3 Protocol - setup (auto-detection)', async (t) => {
  mockServer = srv.createServer({
    host: HOST,
    port: PORT,
    v3Port: V3_PORT,
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
    port: PORT, // registered on the v2 port — v3 must still be detected
    password: PASSWORD,
    id: 'test-v3',
    conf: { v3ApiPort: V3_PORT }
  })

  await miner.init()

  t.is(miner.apiVersion, '3.0.3', 'should auto-detect the v3 API version reported by the device')
  t.ok(miner._isV3(), 'should be treated as v3')
  t.ok(miner.protocolHandler, 'should have a v3 protocol handler')
  t.ok(miner.writeHandler, 'should keep a v2-compat write handler')
  t.not(miner.writeHandler, miner.protocolHandler, 'read and write handlers should differ on v3')
})

test('V3 Protocol - command transformation', (t) => {
  const handler = miner.protocolHandler

  // All device data commands map to get.device.info in v3
  t.is(handler.transformCommand('get_token'), 'get.device.info', 'get_token transforms correctly')
  t.is(handler.transformCommand('get_version'), 'get.device.info', 'get_version transforms correctly')
  t.is(handler.transformCommand('get_miner_info'), 'get.device.info', 'get_miner_info transforms correctly')
  t.is(handler.transformCommand('get_error_code'), 'get.device.info', 'get_error_code transforms correctly')
  t.is(handler.transformCommand('get_psu'), 'get.device.info', 'get_psu transforms correctly')

  // Official v3 write command names
  t.is(handler.transformCommand('update_pools'), 'set.miner.pools', 'update_pools transforms correctly')
  t.is(handler.transformCommand('power_on'), 'set.miner.service', 'power_on transforms correctly')
  t.is(handler.transformCommand('set_led'), 'set.system.led', 'set_led transforms correctly')
  t.is(handler.transformCommand('enable_web_pools'), 'set.system.webpools', 'enable_web_pools transforms correctly')
  t.is(handler.transformCommand('net_config'), 'set.system.net_config', 'net_config transforms correctly')

  // get.miner.status params
  t.is(handler.transformCommand('summary'), 'get.miner.status', 'summary transforms to get.miner.status')
  t.is(handler.getStatusParam('summary'), 'summary', 'summary has correct status param')
  t.is(handler.getStatusParam('pools'), 'pools', 'pools has correct status param')
  t.is(handler.getStatusParam('edevs'), 'edevs+summary', 'edevs fetches summary too (board temps)')
  t.is(handler.getStatusParam('get_error_code'), 'error-code', 'get_error_code reads the error-code section')
  t.is(handler.getStatusParam('get_psu'), 'power', 'get_psu reads the power section')
})

test('V3 Protocol - getVersion', async (t) => {
  const version = await miner.getVersion()

  t.ok(version, 'should return version')
  t.ok(version.chip, 'should have chip')
  t.ok(version.platform, 'should have platform')
  t.is(version.whatsminer.api, '3.0.3', 'should report the real v3 api version')
  t.ok(version.whatsminer.firmware, 'should have firmware version')
  t.is(version.apiVersion, '3.0.3', 'should include apiVersion')
})

test('V3 Protocol - getMinerStats', async (t) => {
  const stats = await miner.getMinerStats()

  t.ok(stats, 'should return stats')
  t.ok(stats.elapsed >= 0, 'should have elapsed')
  t.ok(typeof stats.mhs_av === 'number', 'should have mhs_av')
  t.ok(typeof stats.mhs_5s === 'number', 'should fall back for the missing 5s window')
  t.ok(typeof stats.mhs_5m === 'number', 'should fall back for the missing 5m window')
  t.ok(typeof stats.target_mhs === 'number', 'should derive target_mhs from factory hash')
  t.ok(typeof stats.chip_temp_max === 'number', 'should have chip_temp_max')
  t.ok(typeof stats.power === 'number', 'should have power')
})

test('V3 Protocol - getDevices includes chip temps and board temp', async (t) => {
  const devices = await miner.getDevices()

  t.ok(Array.isArray(devices), 'should return devices array')
  t.ok(devices.length > 0, 'should have devices')
  for (const dev of devices) {
    t.ok(Number.isFinite(parseFloat(dev.chip_temp_max)), 'device has chip_temp_max')
    t.ok(Number.isFinite(parseFloat(dev.chip_temp_min)), 'device has chip_temp_min')
    t.ok(Number.isFinite(parseFloat(dev.chip_temp_avg)), 'device has chip_temp_avg')
    t.ok(Number.isFinite(parseFloat(dev.temperature)), 'device has PCB temperature from summary board temps')
    t.ok(Number.isFinite(parseFloat(dev.chip_frequency)), 'device has chip frequency')
  }
})

test('V3 Protocol - getPools supplements share counts from v2-compat', async (t) => {
  const pools = await miner.getPools()

  t.ok(Array.isArray(pools), 'should return pools array')
  t.ok(pools.length > 0, 'should have pools')
  for (const pool of pools) {
    t.ok(pool.url, 'pool has url')
    t.ok(pool.user, 'pool has user/account')
    t.ok(Number.isFinite(parseInt(pool.accepted)), 'pool has accepted count (from v2-compat)')
    t.ok(Number.isFinite(parseInt(pool.rejected)), 'pool has rejected count (from v2-compat)')
    t.ok(Number.isFinite(parseInt(pool.stale)), 'pool has stale count (from v2-compat)')
  }
})

test('V3 Protocol - getMinerStatus', async (t) => {
  const status = await miner.getMinerStatus()

  t.ok(status, 'should return status')
  t.ok(typeof status.mineroff === 'boolean', 'should have mineroff')
  t.ok(status.power_mode, 'should have power_mode')
  t.ok(status.firmware_version, 'should have firmware_version (from device info)')
  t.ok(typeof status.liquid_temp === 'number', 'should have liquid_temp (from device info)')
  t.ok(parseFloat(status.power_pct) > 0, 'should have power_pct')
})

test('V3 Protocol - getErrors', async (t) => {
  const errors = await miner.getErrors()
  t.ok(Array.isArray(errors), 'should return errors array')
})

test('V3 Protocol - getMinerInfo', async (t) => {
  const info = await miner.getMinerInfo()

  t.ok(info, 'should return miner info')
  t.ok(info.ip, 'should have ip')
  t.ok(info.mac, 'should have mac')
  t.ok(info.dns, 'should have dns')
  t.ok(info.ledstat, 'should have ledstat')
})

test('V3 Protocol - getSnap has no null telemetry', async (t) => {
  const snap = await miner._prepSnap()

  t.ok(snap, 'should return snap')
  t.ok(snap.stats, 'should have stats')
  t.ok(snap.config, 'should have config')
  t.is(snap.config.api_version, '3.0.3', 'should report the v3 api version')

  const temp = snap.stats.temperature_c
  t.ok(Number.isFinite(temp.max), 'temperature max should not be null')
  t.ok(Number.isFinite(temp.avg), 'temperature avg should not be null')
  for (const chip of temp.chips) {
    t.ok(Number.isFinite(chip.max), 'chip temp max should not be null')
    t.ok(Number.isFinite(chip.min), 'chip temp min should not be null')
    t.ok(Number.isFinite(chip.avg), 'chip temp avg should not be null')
  }
  for (const pcb of temp.pcb) {
    t.ok(Number.isFinite(pcb.current), 'pcb temp should not be null')
  }

  const hr = snap.stats.hashrate_mhs
  t.ok(Number.isFinite(hr.avg), 'hashrate avg should not be null')
  t.ok(Number.isFinite(hr.target), 'hashrate target should not be null')
  t.ok(Number.isFinite(hr.t_5s), 'hashrate t_5s should not be null')
  t.ok(Number.isFinite(hr.t_5m), 'hashrate t_5m should not be null')

  for (const pool of snap.stats.pool_status) {
    t.ok(Number.isFinite(pool.accepted), 'pool accepted should not be null')
  }

  t.ok(typeof snap.config.suspended === 'boolean', 'should have suspended as boolean')
  t.ok(typeof snap.config.power_mode === 'string', 'should have power_mode as string')
})

test('V3 Protocol - writes still work through v2-compat', async (t) => {
  const resOn = await miner.setLED(true)
  t.ok(resOn.success, 'setLED(true) should succeed via v2-compat')

  const resOff = await miner.setLED(false)
  t.ok(resOff.success, 'setLED(false) should succeed via v2-compat')
})

test('V3 Protocol - reboot', async (t) => {
  const result = miner.reboot()
  t.ok(result.success, 'should be successful')
})

test('V3 Protocol - explicit apiVersion is honored', async (t) => {
  const pinned = new Miner({
    timeout: 5000,
    socketer: {
      readStrategy: TcpFacility.TCP_READ_STRATEGY.ON_END,
      rpc: (opts) => new TcpFacility().getRPC(opts)
    },
    address: HOST,
    port: PORT,
    password: PASSWORD,
    id: 'test-v3-pinned',
    apiVersion: '3.0.3',
    conf: { v3ApiPort: V3_PORT }
  })

  await pinned.init()
  t.is(pinned.apiVersion, '3.0.3', 'explicit version should not be re-detected')
  const version = await pinned.getVersion()
  t.is(version.whatsminer.api, '3.0.3', 'reads should work on the pinned version')
  await pinned.close()
})

test('V3 Protocol - cleanup', async (t) => {
  await miner.close()
  mockServer.exit()
  t.pass('cleanup complete')
})
