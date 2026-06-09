'use strict'

const test = require('brittle')
const {
  API_VERSIONS,
  DEFAULT_API_VERSION,
  API_DEFAULTS,
  COMMAND_MAP_V3,
  COMMAND_MAP_V2,
  RESPONSE_CODES
} = require('../../workers/lib/protocols/constants')

test('protocols/constants - API_VERSIONS exports', (t) => {
  t.ok(API_VERSIONS, 'should export API_VERSIONS')
  t.is(API_VERSIONS.V2, '2.0.5', 'V2 should be 2.0.5')
  t.is(API_VERSIONS.V3, '3.0.3', 'V3 should be 3.0.3')
})

test('protocols/constants - DEFAULT_API_VERSION', (t) => {
  t.ok(DEFAULT_API_VERSION, 'should export DEFAULT_API_VERSION')
  t.is(DEFAULT_API_VERSION, '2.0.5', 'DEFAULT_API_VERSION should be 2.0.5')
  t.is(DEFAULT_API_VERSION, API_VERSIONS.V2, 'DEFAULT_API_VERSION should equal API_VERSIONS.V2')
})

test('protocols/constants - API_DEFAULTS structure', (t) => {
  t.ok(API_DEFAULTS, 'should export API_DEFAULTS')
  t.ok(API_DEFAULTS['2.0.5'], 'should have 2.0.5 defaults')
  t.ok(API_DEFAULTS['3.0.3'], 'should have 3.0.3 defaults')
})

test('protocols/constants - V2 defaults', (t) => {
  const v2 = API_DEFAULTS['2.0.5']
  t.is(v2.port, 4028, 'V2 default port should be 4028')
  t.is(v2.authCommand, 'get_token', 'V2 auth command should be get_token')
})

test('protocols/constants - V3 defaults', (t) => {
  const v3 = API_DEFAULTS['3.0.3']
  t.is(v3.port, 4433, 'V3 default port should be 4433')
  t.is(v3.authCommand, 'get.device.info', 'V3 auth command should be get.device.info')
})

test('protocols/constants - COMMAND_MAP_V3 structure', (t) => {
  t.ok(COMMAND_MAP_V3, 'should export COMMAND_MAP_V3')
  t.is(typeof COMMAND_MAP_V3, 'object', 'should be an object')
})

test('protocols/constants - COMMAND_MAP_V3 auth commands', (t) => {
  t.is(COMMAND_MAP_V3.get_token, 'get.device.info', 'get_token should map to get.device.info')
})

test('protocols/constants - COMMAND_MAP_V3 read commands', (t) => {
  t.is(COMMAND_MAP_V3.get_version, 'get.version', 'get_version should map correctly')
  t.is(COMMAND_MAP_V3.get_miner_info, 'get.miner.info', 'get_miner_info should map correctly')
  t.is(COMMAND_MAP_V3.get_error_code, 'get.error.code', 'get_error_code should map correctly')
  t.is(COMMAND_MAP_V3.get_psu, 'get.psu', 'get_psu should map correctly')
  // V3 uses get.miner.status with param for summary/pools/edevs/devdetails
  t.is(COMMAND_MAP_V3.summary, 'get.miner.status', 'summary should map to get.miner.status')
  t.is(COMMAND_MAP_V3.pools, 'get.miner.status', 'pools should map to get.miner.status')
  t.is(COMMAND_MAP_V3.edevs, 'get.miner.status', 'edevs should map to get.miner.status')
  t.is(COMMAND_MAP_V3.devdetails, 'get.miner.status', 'devdetails should map to get.miner.status')
})

test('protocols/constants - COMMAND_MAP_V3 write commands', (t) => {
  // V3 API uses set.* commands per documentation
  t.is(COMMAND_MAP_V3.update_pools, 'set.miner.pools', 'update_pools should map correctly')
  t.is(COMMAND_MAP_V3.update_pwd, 'set.miner.passwd', 'update_pwd should map correctly')
  t.is(COMMAND_MAP_V3.reboot, 'set.system.reboot', 'reboot should map correctly')
  // V3 uses set.miner.service for power control (param: start/stop)
  t.is(COMMAND_MAP_V3.power_on, 'set.miner.service', 'power_on should map correctly')
  t.is(COMMAND_MAP_V3.power_off, 'set.miner.service', 'power_off should map correctly')
  t.is(COMMAND_MAP_V3.restart_btminer, 'set.miner.service', 'restart_btminer should map correctly')
  t.is(COMMAND_MAP_V3.factory_reset, 'set.system.factory_reset', 'factory_reset should map correctly')
})

test('protocols/constants - COMMAND_MAP_V3 power mode commands', (t) => {
  // V3 API uses set.miner.power_mode for all power mode changes
  t.is(COMMAND_MAP_V3.set_low_power, 'set.miner.power_mode', 'set_low_power should map correctly')
  t.is(COMMAND_MAP_V3.set_normal_power, 'set.miner.power_mode', 'set_normal_power should map correctly')
  t.is(COMMAND_MAP_V3.set_high_power, 'set.miner.power_mode', 'set_high_power should map correctly')
  t.is(COMMAND_MAP_V3.set_power_pct_v2, 'set.miner.power_percent', 'set_power_pct_v2 should map correctly')
})

test('protocols/constants - COMMAND_MAP_V3 config commands', (t) => {
  // V3 API uses set.system.* for system config commands
  t.is(COMMAND_MAP_V3.set_led, 'set.system.led', 'set_led should map correctly')
  t.is(COMMAND_MAP_V3.set_hostname, 'set.system.hostname', 'set_hostname should map correctly')
  t.is(COMMAND_MAP_V3.set_zone, 'set.system.timezone', 'set_zone should map correctly')
  t.is(COMMAND_MAP_V3.net_config, 'set.network.config', 'net_config should map correctly')
})

test('protocols/constants - COMMAND_MAP_V2 reverse mapping', (t) => {
  t.ok(COMMAND_MAP_V2, 'should export COMMAND_MAP_V2')
  t.is(COMMAND_MAP_V2['get.device.info'], 'get_token', 'get.device.info should reverse map to get_token')
  t.is(COMMAND_MAP_V2['get.version'], 'get_version', 'get.version should reverse map correctly')
  t.is(COMMAND_MAP_V2['set.miner.pools'], 'update_pools', 'set.miner.pools should reverse map correctly')
})

test('protocols/constants - COMMAND_MAP_V2 bidirectional consistency', (t) => {
  // Note: Multiple V2 commands can map to the same V3 command (many-to-one mapping):
  // - summary, pools, edevs, devdetails -> get.miner.status
  // - power_on, power_off, pre_power_on, restart_btminer -> set.miner.service
  // - set_low_power, set_normal_power, set_high_power -> set.miner.power_mode
  // - enable_btminer_fast_boot, disable_btminer_fast_boot -> set.miner.fastboot
  // - enable_web_pools, disable_web_pools -> set.miner.web_pools
  // The reverse mapping only keeps one (the last one processed), which is expected

  const multiMappedV3Commands = [
    'get.miner.status',
    'set.miner.service',
    'set.miner.power_mode',
    'set.miner.fastboot',
    'set.miner.web_pools'
  ]

  for (const [v2Cmd, v3Cmd] of Object.entries(COMMAND_MAP_V3)) {
    if (multiMappedV3Commands.includes(v3Cmd)) {
      // For commands that map multiple V2 commands to one V3 command,
      // just verify the reverse mapping exists
      t.ok(COMMAND_MAP_V2[v3Cmd], `${v3Cmd} should have a reverse mapping`)
    } else {
      t.is(COMMAND_MAP_V2[v3Cmd], v2Cmd, `${v3Cmd} should reverse map to ${v2Cmd}`)
    }
  }
})

test('protocols/constants - RESPONSE_CODES', (t) => {
  t.ok(RESPONSE_CODES, 'should export RESPONSE_CODES')
  t.is(RESPONSE_CODES.OK, 131, 'OK should be 131')
  t.is(RESPONSE_CODES.TOKEN_EXPIRED, 135, 'TOKEN_EXPIRED should be 135')
  t.is(RESPONSE_CODES.IP_LIMIT, 136, 'IP_LIMIT should be 136')
})
