'use strict'

const test = require('brittle')
const net = require('node:net')
const CryptoJS = require('crypto-js')
const WMApiV3 = require('../../workers/lib/protocols/wm-api-v3')
const { API_VERSIONS, COMMAND_MAP_V3 } = require('../../workers/lib/protocols/constants')

// Response fixture captured from a live M63S++ (fw 20260312.16.REL3, api 3.0.5)
const DEVICE_INFO_FIXTURE = {
  code: 0,
  when: 1786611588,
  msg: {
    network: {
      ip: '10.0.44.105',
      proto: 'dhcp',
      netmask: '255.255.255.0',
      dns: '10.0.44.1',
      mac: 'A0:5B:06:00:36:60',
      gateway: '10.0.44.1',
      hostname: 'WhatsMiner'
    },
    miner: {
      working: 'true',
      type: 'M7BS_VM30',
      'hash-percent': '0',
      chipdata0: 'KAAP315-2601 BINVLC-199004E',
      'miner-sn': 'BTM7BS30FA26031256090407244H05947',
      'power-limit-set': '10030'
    },
    system: {
      api: '3.0.5',
      platform: 'H616',
      fwversion: '20260312.16.REL3',
      'control-board-version': 'CB6V5',
      apiswitch: '1',
      ledstatus: 'auto'
    },
    power: {
      type: 'P566Z',
      hwversion: 'HA3000000',
      swversion: '1653.1411',
      model: 'P566Z',
      iin: 10.52,
      vin: 409,
      pin: 7477,
      'liquid-temperature': 44.1,
      fanspeed: 6000,
      sn: '2F260200665',
      vendor: '6'
    },
    salt: 's3xkGSq1',
    'error-code': []
  },
  desc: 'get.device.info'
}

const MINER_STATUS_FIXTURE = {
  code: 0,
  when: 1786611554,
  msg: {
    summary: {
      elapsed: 489,
      'freq-avg': 342.345,
      'factory-hash': 560.974,
      'hash-average': 496.471,
      'hash-1min': 520.003,
      'hash-15min': 496.471,
      'hash-realtime': 520.003,
      'power-rate': 14.335,
      'power-5min': 7505.937,
      'power-realtime': 7478,
      'environment-temperature': 41.3,
      'board-temperature': [57, 57, 48.5, 48.5],
      'chip-temp-min': 50.1,
      'chip-temp-avg': 57.8,
      'chip-temp-max': 66.3,
      'power-limit': 8085,
      'up-freq-finish': 0,
      'fan-speed-in': 0,
      'fan-speed-out': 0,
      'bootup-time': 507
    },
    pools: [{
      id: 1,
      url: 'stratum+tcp://btc.f2pool.com:1314',
      status: 'alive',
      account: 'haven7346.M7bS_test',
      'stratum-active': true,
      'reject-rate': 0,
      'last-share-time': 1786611536
    }],
    edevs: [{
      id: 0,
      slot: 0,
      'hash-average': 126.895,
      'factory-hash': 139.93,
      freq: 339.255,
      'effective-chips': 288,
      'chip-temp-min': 58.4,
      'chip-temp-avg': 62,
      'chip-temp-max': 66.2
    }, {
      id: 1,
      slot: 1,
      'hash-average': 131.604,
      'factory-hash': 139.93,
      freq: 346.398,
      'effective-chips': 288,
      'chip-temp-min': 50.1,
      'chip-temp-avg': 54,
      'chip-temp-max': 59.1
    }]
  },
  desc: 'get.miner.status'
}

test('protocols/v3-handler - static VERSION', (t) => {
  t.is(WMApiV3.VERSION, API_VERSIONS.V3, 'VERSION should be 3.0.3')
  t.is(WMApiV3.VERSION, '3.0.3', 'VERSION should match string')
})

test('protocols/v3-handler - static DEFAULT_PORT', (t) => {
  t.is(WMApiV3.DEFAULT_PORT, 4433, 'DEFAULT_PORT should be 4433')
})

test('protocols/v3-handler - constructor', (t) => {
  const handler = new WMApiV3({
    address: '127.0.0.1',
    password: 'testpass'
  })
  t.ok(handler, 'should create handler')
  t.is(handler.password, 'testpass', 'should set password')
  t.is(handler.port, 4433, 'should default to port 4433')
  t.is(handler.salt, undefined, 'salt should be undefined initially')
})

test('protocols/v3-handler - getAuthCommand', (t) => {
  const handler = new WMApiV3({ password: 'super' })
  t.is(handler.getAuthCommand(), 'get.device.info', 'should return get.device.info')
})

test('protocols/v3-handler - transformCommand basic', (t) => {
  const handler = new WMApiV3({ password: 'super' })

  t.is(handler.transformCommand('get_token'), 'get.device.info', 'get_token should map to get.device.info')
  t.is(handler.transformCommand('get_version'), 'get.device.info', 'get_version should map to get.device.info')
  t.is(handler.transformCommand('summary'), 'get.miner.status', 'summary should map to get.miner.status')
})

test('protocols/v3-handler - transformCommand all mappings', (t) => {
  const handler = new WMApiV3({ password: 'super' })

  for (const [v2Cmd, v3Cmd] of Object.entries(COMMAND_MAP_V3)) {
    t.is(handler.transformCommand(v2Cmd), v3Cmd, `${v2Cmd} should map to ${v3Cmd}`)
  }
})

test('protocols/v3-handler - transformCommand unknown returns unchanged', (t) => {
  const handler = new WMApiV3({ password: 'super' })

  t.is(handler.transformCommand('unknown_cmd'), 'unknown_cmd', 'unknown command should remain unchanged')
  t.is(handler.transformCommand('custom.command'), 'custom.command', 'dot notation should remain unchanged')
})

test('protocols/v3-handler - getStatusParam', (t) => {
  const handler = new WMApiV3({ password: 'super' })

  t.is(handler.getStatusParam('summary'), 'summary', 'summary should return summary param')
  t.is(handler.getStatusParam('pools'), 'pools', 'pools should return pools param')
  t.is(handler.getStatusParam('edevs'), 'edevs+summary', 'edevs should fetch summary too (board temps)')
  t.is(handler.getStatusParam('get_error_code'), 'error-code', 'get_error_code should filter to error-code')
  t.is(handler.getStatusParam('get_psu'), 'power', 'get_psu should filter to power')
  t.is(handler.getStatusParam('unknown'), undefined, 'unknown command should return undefined')
})

test('protocols/v3-handler - token generation matches official algorithm', (t) => {
  const handler = new WMApiV3({ password: 'super' })
  handler.salt = 's3xkGSq1'

  const ts = 1700000000
  const { token, key } = handler._generateToken('set.miner.service', ts)

  // token = base64(sha256(cmd + password + salt + ts)).substring(0, 8)
  const expectedHash = CryptoJS.SHA256(`set.miner.servicesupers3xkGSq1${ts}`)
  t.is(token, expectedHash.toString(CryptoJS.enc.Base64).substring(0, 8), 'token should follow the documented formula')
  t.is(token.length, 8, 'token should be 8 characters')
  t.is(key.toString(), expectedHash.toString(), 'the raw sha256 digest is the AES key')
})

test('protocols/v3-handler - parseResponse returns v2 responses unchanged', (t) => {
  const handler = new WMApiV3({ password: 'super' })

  const response = { Code: 131, Msg: { data: 'test' } }
  t.alike(handler.parseResponse(response, 'cmd'), response, 'should return v2-format response unchanged')
  t.is(handler.parseResponse(null, 'cmd'), null, 'should pass null through')
})

test('protocols/v3-handler - parseResponse get_version from device info', (t) => {
  const handler = new WMApiV3({ password: 'super' })

  const res = handler.parseResponse(DEVICE_INFO_FIXTURE, 'get_version')
  t.is(res.Code, 131, 'success maps to Code 131')
  t.is(res.Msg.api_ver, '3.0.5', 'api_ver comes from system.api')
  t.is(res.Msg.fw_ver, '20260312.16.REL3', 'fw_ver comes from system.fwversion')
  t.is(res.Msg.platform, 'H616', 'platform comes from system.platform')
  t.is(res.Msg.chip, 'KAAP315-2601 BINVLC-199004E', 'chip comes from miner.chipdata0')
})

test('protocols/v3-handler - parseResponse get_miner_info from device info', (t) => {
  const handler = new WMApiV3({ password: 'super' })

  const res = handler.parseResponse(DEVICE_INFO_FIXTURE, 'get_miner_info')
  t.is(res.Code, 131, 'success maps to Code 131')
  t.is(res.Msg.ip, '10.0.44.105', 'ip mapped')
  t.is(res.Msg.mac, 'A0:5B:06:00:36:60', 'mac mapped')
  t.is(res.Msg.dns, '10.0.44.1', 'dns mapped')
  t.is(res.Msg.ledstat, 'auto', 'ledstat comes from system.ledstatus')
  t.is(res.Msg.minersn, 'BTM7BS30FA26031256090407244H05947', 'minersn comes from miner.miner-sn')
})

test('protocols/v3-handler - parseResponse summary converts TH/s to MH/s', (t) => {
  const handler = new WMApiV3({ password: 'super' })

  const res = handler.parseResponse(MINER_STATUS_FIXTURE, 'summary')
  t.is(res.Code, 131, 'success maps to Code 131')
  const summary = res.SUMMARY[0]
  t.is(summary['MHS av'], 496.471 * 1e6, 'hash-average TH -> MHS')
  t.is(summary['MHS 1m'], 520.003 * 1e6, 'hash-1min TH -> MHS')
  t.is(summary['HS RT'], 520.003 * 1e6, 'hash-realtime TH -> MHS')
  t.is(summary['Factory GHS'], 560.974 * 1000, 'factory-hash TH -> GHS')
  t.is(summary['Chip Temp Max'], 66.3, 'chip temp max mapped')
  t.is(summary['Env Temp'], 41.3, 'env temp mapped')
  t.is(summary.Uptime, 507, 'uptime comes from bootup-time')
  t.is(summary.Temperature, 57, 'temperature comes from first board temp')
  t.is(summary['MHS 5s'], undefined, 'no fabricated 5s window')
  t.is(summary['MHS 5m'], undefined, 'no fabricated 5m window')
})

test('protocols/v3-handler - parseResponse edevs attaches board temps', (t) => {
  const handler = new WMApiV3({ password: 'super' })

  const res = handler.parseResponse(MINER_STATUS_FIXTURE, 'edevs')
  t.is(res.Code, 131, 'success maps to Code 131')
  t.is(res.DEVS.length, 2, 'should have devices')
  t.is(res.DEVS[0]['MHS av'], 126.895 * 1e6, 'device hash TH -> MHS')
  t.is(res.DEVS[0]['Chip Temp Max'], 66.2, 'chip temp mapped')
  t.is(res.DEVS[0].Temperature, 57, 'PCB temp from board-temperature[slot]')
  t.is(res.DEVS[1].Temperature, 57, 'PCB temp from board-temperature[slot]')
  t.is(res.DEVS[0]['Effective Chips'], 288, 'effective chips mapped')
})

test('protocols/v3-handler - parseResponse pools (no share counts in v3)', (t) => {
  const handler = new WMApiV3({ password: 'super' })

  const res = handler.parseResponse(MINER_STATUS_FIXTURE, 'pools')
  t.is(res.Code, 131, 'success maps to Code 131')
  const pool = res.POOLS[0]
  t.is(pool.URL, 'stratum+tcp://btc.f2pool.com:1314', 'url mapped')
  t.is(pool.User, 'haven7346.M7bS_test', 'account -> User')
  t.is(pool.Status, 'Alive', 'status capitalized')
  t.is(pool.Accepted, undefined, 'v3 has no accepted count — supplemented elsewhere')
})

test('protocols/v3-handler - parseResponse devdetails is empty (deprecated)', (t) => {
  const handler = new WMApiV3({ password: 'super' })

  const res = handler.parseResponse({ code: 0, when: 1, msg: {}, desc: 'get.miner.status' }, 'devdetails')
  t.alike(res.DEVDETAILS, [], 'devdetails should be empty')
})

test('protocols/v3-handler - parseResponse get_error_code', (t) => {
  const handler = new WMApiV3({ password: 'super' })

  const withErrors = {
    code: 0,
    when: 1,
    msg: { 'error-code': [{ 531: '2025-03-12 14:52:35', reason: 'Slot1 not found.' }] },
    desc: 'get.device.info'
  }
  const res = handler.parseResponse(withErrors, 'get_error_code')
  t.is(res.Msg.error_code.length, 1, 'error codes mapped')
  t.is(Object.keys(res.Msg.error_code[0])[0], '531', 'numeric code is the first key')
})

test('protocols/v3-handler - parseResponse get_psu', (t) => {
  const handler = new WMApiV3({ password: 'super' })

  const res = handler.parseResponse({
    code: 0,
    when: 1,
    msg: { power: DEVICE_INFO_FIXTURE.msg.power },
    desc: 'get.device.info'
  }, 'get_psu')
  t.is(res.Msg.name, 'P566Z', 'name from power.type')
  t.is(res.Msg.hw_version, 'HA3000000', 'hw version mapped')
  t.is(res.Msg.serial_no, '2F260200665', 'serial mapped')
  t.is(res.Msg.vender, '6', 'v2 vender spelling preserved')
})

test('protocols/v3-handler - parseResponse status merges setting + device info', (t) => {
  const handler = new WMApiV3({ password: 'super' })

  const merged = {
    code: 0,
    when: 1,
    msg: {
      'power-limit': 10030,
      'upfreq-speed': 0,
      'power-mode': 'normal',
      'fast-boot': 'disable',
      'fast-hash': 'disable',
      'target-freq': 0,
      power: 0,
      'power-percent': 0,
      // merged from get.device.info
      'miner-working': 'true',
      'hash-percent': '0',
      'power-limit-set': '10030',
      'firmware-version': '20260312.16.REL3',
      'liquid-temp': 44.1
    },
    desc: 'get.miner.setting'
  }
  const res = handler.parseResponse(merged, 'status')
  t.is(res.Msg.mineroff, 'false', 'working true -> mineroff false')
  t.is(res.Msg.power_mode, 'normal', 'power mode mapped')
  t.is(res.Msg.FirmwareVersion, '20260312.16.REL3', 'firmware version mapped')
  t.is(res.Msg.liquid_temp, 44.1, 'liquid temp mapped')
  t.is(res.Msg.power_pct, '100', 'power-percent 0 means no override -> 100')
  t.is(res.Msg.fast_hash, 'false', 'disable -> false')
})

test('protocols/v3-handler - parseResponse error codes', (t) => {
  const handler = new WMApiV3({ password: 'super' })

  t.is(handler.parseResponse({ code: -1, when: 1, msg: 'fail', desc: 'x' }, 'summary').Code, 132, '-1 -> 132')
  t.is(handler.parseResponse({ code: -2, when: 1, msg: 'invalid command', desc: 'x' }, 'summary').Code, 14, '-2 -> 14')
  t.is(handler.parseResponse({ code: -3, when: 1, msg: 'param item is null', desc: 'x' }, 'summary').Code, 23, '-3 -> 23')
  t.is(handler.parseResponse({ code: -4, when: 1, msg: 'no permission', desc: 'x' }, 'summary').Code, 45, '-4 -> 45')
})

test('protocols/v3-handler - framed transport against a mock socket server', async (t) => {
  // Length-prefixed framing server that answers get.device.info
  const server = net.createServer((socket) => {
    let buf = Buffer.alloc(0)
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk])
      if (buf.length < 4) return
      const len = buf.readUInt32LE(0)
      if (buf.length < 4 + len) return
      const req = JSON.parse(buf.subarray(4, 4 + len).toString())
      t.is(req.cmd, 'get.device.info', 'request should be framed JSON')
      const body = Buffer.from(JSON.stringify(DEVICE_INFO_FIXTURE))
      const lenBuf = Buffer.alloc(4)
      lenBuf.writeUInt32LE(body.length, 0)
      socket.write(Buffer.concat([lenBuf, body]))
    })
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port

  const probe = await WMApiV3.probeDeviceInfo({ address: '127.0.0.1', port, timeout: 2000 })
  t.is(probe.code, 0, 'probe should succeed')
  t.is(probe.msg.system.api, '3.0.5', 'probe returns device info')

  const handler = new WMApiV3({ address: '127.0.0.1', port, timeout: 2000, password: 'super' })
  const auth = await handler.authenticate()
  t.is(auth.salt, 's3xkGSq1', 'authenticate extracts the salt')

  server.close()
})

test('protocols/v3-handler - deviceInfoSeed pre-populates cache and salt', async (t) => {
  const handler = new WMApiV3({
    address: '127.0.0.1',
    port: 1, // unreachable — cache must be used
    timeout: 500,
    password: 'super',
    deviceInfoSeed: DEVICE_INFO_FIXTURE
  })

  t.is(handler.salt, 's3xkGSq1', 'salt should be seeded')
  const res = await handler.requestRead('get.device.info')
  t.is(res.msg.system.api, '3.0.5', 'device info served from seed without a connection')
})

test('protocols/v3-handler - getTokenInfo / generateTokenInfo / clearToken', (t) => {
  const handler = new WMApiV3({ password: 'super' })

  t.is(handler.getTokenInfo(), undefined, 'should return undefined when no salt')
  t.is(handler.generateTokenInfo('set.miner.power'), undefined, 'should return undefined when no salt')

  handler.salt = '5QAHiKMb'
  t.alike(handler.getTokenInfo(), { salt: '5QAHiKMb' }, 'should return salt info')

  const tokenInfo = handler.generateTokenInfo('set.miner.power')
  t.ok(tokenInfo, 'should return token info')
  t.is(tokenInfo.token.length, 8, 'token should be 8 characters')
  t.ok(tokenInfo.key, 'should have key')
  t.is(tokenInfo.salt, '5QAHiKMb', 'should have salt')
  t.ok(tokenInfo.ts, 'should have timestamp')

  handler.clearToken()
  t.is(handler.salt, undefined, 'should clear salt')
})

test('protocols/v3-handler - requestWrite is not implemented (routed via v2-compat)', async (t) => {
  const handler = new WMApiV3({ password: 'super' })

  try {
    await handler.requestWrite('set.miner.service', { param: 'start' })
    t.fail('should throw')
  } catch (e) {
    t.is(e.message, 'ERR_V3_WRITE_NOT_IMPLEMENTED', 'writes are not wired to v3 yet')
  }
})

test('protocols/v3-handler - isResponseOK', (t) => {
  const handler = new WMApiV3({ password: 'super' })

  // V3 format
  t.ok(handler.isResponseOK({ code: 0 }), 'should return true for V3 code 0')
  t.not(handler.isResponseOK({ code: -1 }), 'should return false for V3 code -1')
  t.not(handler.isResponseOK({ code: -4 }), 'should return false for V3 code -4')

  // V2 format (backward compatibility)
  t.ok(handler.isResponseOK({ Code: 131 }), 'should return true for V2 Code 131')
  t.not(handler.isResponseOK({ Code: 135 }), 'should return false for V2 Code 135')
  t.not(handler.isResponseOK(null), 'should return false for null')
})
