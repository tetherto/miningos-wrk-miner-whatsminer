'use strict'

const test = require('brittle')
const Miner = require('../../workers/lib/miner')
const TcpFacility = require('svc-facs-tcp')
const srv = require('../../mock/server')

const V2_PORT = 24028
const V3_PORT = 24433
const HOST = '127.0.0.1'
const V2_PASSWORD = 'admin'
const V3_PASSWORD = 'super'
const SERIAL = 'TESTCOMPARE'

let mockServerV2
let mockServerV3
let minerV2
let minerV3

test('Protocol Comparison - setup both servers', async (t) => {
  // Create V2 mock server
  mockServerV2 = srv.createServer({
    host: HOST,
    port: V2_PORT,
    type: 'M56s',
    serial: SERIAL + 'V2',
    password: V2_PASSWORD,
    apiVersion: 'v2'
  })

  // Create V3 mock server
  mockServerV3 = srv.createServer({
    host: HOST,
    port: V3_PORT,
    type: 'M56s',
    serial: SERIAL + 'V3',
    password: V3_PASSWORD,
    apiVersion: 'v3'
  })

  // Create V2 miner
  minerV2 = new Miner({
    timeout: 5000,
    socketer: {
      readStrategy: TcpFacility.TCP_READ_STRATEGY.ON_END,
      rpc: (opts) => new TcpFacility().getRPC(opts)
    },
    address: HOST,
    port: V2_PORT,
    password: V2_PASSWORD,
    id: 'compare-v2',
    apiVersion: '2.0.5'
  })

  // Create V3 miner
  minerV3 = new Miner({
    timeout: 5000,
    socketer: {
      readStrategy: TcpFacility.TCP_READ_STRATEGY.ON_END,
      rpc: (opts) => new TcpFacility().getRPC(opts)
    },
    address: HOST,
    port: V3_PORT,
    password: V3_PASSWORD,
    id: 'compare-v3',
    apiVersion: '3.0.3'
  })

  await minerV2.init()
  await minerV3.init()

  t.is(minerV2.apiVersion, '2.0.5', 'V2 miner should have correct version')
  t.is(minerV3.apiVersion, '3.0.3', 'V3 miner should have correct version')
})

test('Protocol Comparison - different default ports', (t) => {
  const { ApiHandlerFactory, DEFAULT_API_VERSION } = require('../../workers/lib/protocols')

  t.is(ApiHandlerFactory.getDefaultPort('2.0.5'), 4028, 'V2 default port')
  t.is(ApiHandlerFactory.getDefaultPort('3.0.3'), 4433, 'V3 default port')
  t.is(DEFAULT_API_VERSION, '2.0.5', 'DEFAULT_API_VERSION should be 2.0.5')
})

test('Protocol Comparison - different auth commands', (t) => {
  t.is(minerV2.protocolHandler.getAuthCommand(), 'get_token', 'V2 auth command')
  t.is(minerV3.protocolHandler.getAuthCommand(), 'get.device.info', 'V3 auth command')
})

test('Protocol Comparison - command transformation difference', (t) => {
  const testCommands = [
    { v2: 'get_token', v3: 'get.device.info' },
    { v2: 'get_version', v3: 'get.version' },
    { v2: 'update_pools', v3: 'set.miner.pools' },
    { v2: 'power_on', v3: 'set.miner.service' },
    { v2: 'set_led', v3: 'set.system.led' }
  ]

  for (const { v2, v3 } of testCommands) {
    t.is(minerV2.protocolHandler.transformCommand(v2), v2, `V2 keeps ${v2} unchanged`)
    t.is(minerV3.protocolHandler.transformCommand(v2), v3, `V3 transforms ${v2} to ${v3}`)
  }
})

test('Protocol Comparison - both return version info', async (t) => {
  const v2Version = await minerV2.getVersion()
  const v3Version = await minerV3.getVersion()

  t.ok(v2Version.whatsminer, 'V2 should return whatsminer info')
  t.ok(v3Version.whatsminer, 'V3 should return whatsminer info')

  t.is(v2Version.apiVersion, '2.0.5', 'V2 version should be 2.0.5')
  t.is(v3Version.apiVersion, '3.0.3', 'V3 version should be 3.0.3')
})

test('Protocol Comparison - both return stats', async (t) => {
  const v2Stats = await minerV2.getMinerStats()
  const v3Stats = await minerV3.getMinerStats()

  // Both should have the same structure
  const requiredFields = ['elapsed', 'mhs_av', 'temperature', 'power']

  for (const field of requiredFields) {
    t.ok(field in v2Stats, `V2 stats should have ${field}`)
    t.ok(field in v3Stats, `V3 stats should have ${field}`)
  }
})

test('Protocol Comparison - both return pools', async (t) => {
  const v2Pools = await minerV2.getPools()
  const v3Pools = await minerV3.getPools()

  t.ok(Array.isArray(v2Pools), 'V2 pools should be array')
  t.ok(Array.isArray(v3Pools), 'V3 pools should be array')

  t.ok(v2Pools.length > 0, 'V2 should have pools')
  t.ok(v3Pools.length > 0, 'V3 should have pools')

  // Both should have same pool structure
  const requiredPoolFields = ['url', 'index', 'user', 'status']
  for (const field of requiredPoolFields) {
    t.ok(field in v2Pools[0], `V2 pool should have ${field}`)
    t.ok(field in v3Pools[0], `V3 pool should have ${field}`)
  }
})

test('Protocol Comparison - both return devices', async (t) => {
  const v2Devices = await minerV2.getDevices()
  const v3Devices = await minerV3.getDevices()

  t.ok(Array.isArray(v2Devices), 'V2 devices should be array')
  t.ok(Array.isArray(v3Devices), 'V3 devices should be array')

  t.ok(v2Devices.length > 0, 'V2 should have devices')
  t.ok(v3Devices.length > 0, 'V3 should have devices')
})

test('Protocol Comparison - both return snap with api_version', async (t) => {
  const v2Snap = await minerV2.getSnap()
  const v3Snap = await minerV3.getSnap()

  t.ok(v2Snap.success, 'V2 snap should be successful')
  t.ok(v3Snap.success, 'V3 snap should be successful')

  t.is(v2Snap.config.api_version, '2.0.5', 'V2 snap should have api_version 2.0.5')
  t.is(v3Snap.config.api_version, '3.0.3', 'V3 snap should have api_version 3.0.3')
})

test('Protocol Comparison - both handle setLED', async (t) => {
  const v2Result = await minerV2.setLED(true)
  const v3Result = await minerV3.setLED(true)

  t.ok(v2Result.success, 'V2 setLED should succeed')
  t.ok(v3Result.success, 'V3 setLED should succeed')

  const v2Off = await minerV2.setLED(false)
  const v3Off = await minerV3.setLED(false)

  t.ok(v2Off.success, 'V2 setLED off should succeed')
  t.ok(v3Off.success, 'V3 setLED off should succeed')
})

test('Protocol Comparison - both handle reboot', async (t) => {
  const v2Result = minerV2.reboot()
  const v3Result = minerV3.reboot()

  t.ok(v2Result.success, 'V2 reboot should succeed')
  t.ok(v3Result.success, 'V3 reboot should succeed')
})

test('Protocol Comparison - cleanup', async (t) => {
  try { await minerV2.close() } catch (e) { /* ignore */ }
  try { await minerV3.close() } catch (e) { /* ignore */ }
  try { mockServerV2.exit() } catch (e) { /* ignore */ }
  try { mockServerV3.exit() } catch (e) { /* ignore */ }
  t.ok(true, 'cleanup complete')
})
