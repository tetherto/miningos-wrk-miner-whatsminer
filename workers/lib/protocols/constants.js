'use strict'

const API_VERSIONS = {
  V2: '2.0.5',
  V3: '3.0.3'
}

const DEFAULT_API_VERSION = API_VERSIONS.V2

const API_DEFAULTS = {
  '2.0.5': {
    port: 4028,
    authCommand: 'get_token'
  },
  '3.0.3': {
    port: 4433,
    authCommand: 'get.device.info'
  }
}

// Command mapping from v2 (underscore) to v3 (dot notation), per the official
// WhatsMiner API v3 documentation (apidoc.whatsminer.com).
// Notes:
// - There is NO get.version / get.miner.info / get.error.code / get.psu in v3;
//   all device data comes from get.device.info (optionally filtered via param:
//   miner | system | power | network | salt | error-code).
// - summary/pools/edevs are params of get.miner.status. devdetails is
//   deprecated and has no v3 equivalent.
const COMMAND_MAP_V3 = {
  // Authentication (salt for token generation)
  get_token: 'get.device.info',

  // Read commands -> get.device.info sections
  get_version: 'get.device.info',
  get_miner_info: 'get.device.info',
  get_error_code: 'get.device.info',
  get_psu: 'get.device.info',

  // Status command
  status: 'get.miner.setting',

  // V3 uses get.miner.status with param instead of separate commands
  summary: 'get.miner.status',
  pools: 'get.miner.status',
  edevs: 'get.miner.status',
  devdetails: 'get.miner.status',

  // Log download is a read command in v3 (no token required)
  download_logs: 'get.log.download',

  // Write commands (documented v3 names; currently write traffic is routed
  // through the v2-compat API on port 4028 — see miner.js init())
  update_pools: 'set.miner.pools',
  update_pwd: 'set.user.change_passwd',
  update_firmware: 'set.system.update_firmware',
  restart_btminer: 'set.miner.service',
  factory_reset: 'set.system.factory_reset',
  reboot: 'set.system.reboot',
  // V3 uses set.miner.service for power on/off (param: start/stop)
  power_on: 'set.miner.service',
  power_off: 'set.miner.service',
  pre_power_on: 'set.miner.service',
  set_led: 'set.system.led',
  set_hostname: 'set.system.hostname',
  set_zone: 'set.system.timezone',
  set_temp_offset: 'set.fan.temp_offset',
  set_poweroff_cool: 'set.fan.poweroff_cool',
  set_fan_zero_speed: 'set.fan.zero_speed',
  set_target_freq: 'set.miner.target_freq',
  set_low_power: 'set.miner.power_mode',
  set_normal_power: 'set.miner.power_mode',
  set_high_power: 'set.miner.power_mode',
  set_power_pct: 'set.miner.power_percent',
  set_power_pct_v2: 'set.miner.power_percent',
  adjust_power_limit: 'set.miner.power_limit',
  adjust_upfreq_speed: 'set.miner.upfreq_speed',
  enable_btminer_fast_boot: 'set.miner.fastboot',
  disable_btminer_fast_boot: 'set.miner.fastboot',
  enable_web_pools: 'set.system.webpools',
  disable_web_pools: 'set.system.webpools',
  net_config: 'set.system.net_config'
}

// V3 `param` values for read commands, keyed by the original v2 command.
// - get.miner.status REQUIRES a param (summary | pools | edevs, combinable
//   with '+'). edevs is combined with summary so per-board PCB temperatures
//   (summary.board-temperature) can be attached to each device.
// - get.device.info accepts a section filter; commands without an entry here
//   fetch the full (cached) device info.
const V3_READ_PARAMS = {
  summary: 'summary',
  pools: 'pools',
  edevs: 'edevs+summary',
  get_token: 'salt',
  get_error_code: 'error-code',
  get_psu: 'power'
}

// Reverse mapping from v3 to v2 commands
const COMMAND_MAP_V2 = Object.entries(COMMAND_MAP_V3).reduce((acc, [v2, v3]) => {
  acc[v3] = v2
  return acc
}, {})

// V2 Response codes
const RESPONSE_CODES_V2 = {
  OK: 131,
  TOKEN_EXPIRED: 135,
  IP_LIMIT: 136
}

// V3 Response codes (per official API v3 documentation)
const RESPONSE_CODES_V3 = {
  SUCCESS: 0,
  FAIL: -1,
  INVALID_COMMAND: -2,
  PARAM_NULL: -3,
  NO_PERMISSION: -4
}

// Legacy alias for backward compatibility
const RESPONSE_CODES = RESPONSE_CODES_V2

module.exports = {
  API_VERSIONS,
  DEFAULT_API_VERSION,
  API_DEFAULTS,
  COMMAND_MAP_V3,
  COMMAND_MAP_V2,
  V3_READ_PARAMS,
  RESPONSE_CODES,
  RESPONSE_CODES_V2,
  RESPONSE_CODES_V3
}
