'use strict'

const { createV3SuccessResponse, createV3ErrorResponse } = require('../utils')

const SALT = '5QAHiKMb'

/**
 * V3 API get.device.info command handler
 *
 * Per the official API v3 documentation this single command exposes all
 * device data. `param` optionally filters to one section:
 *   miner | system | power | network | salt | error-code
 * With no param all sections (plus salt and error-code) are returned.
 *
 * Response format (V3): {code, when, msg, desc}
 */
module.exports = function (ctx, state, req) {
  const minerInfo = state.miner_info || {}
  const version = state.version || {}
  const summary = state.summary || {}

  const sections = {
    network: {
      ip: minerInfo.ip || ctx.host,
      proto: minerInfo.proto || 'dhcp',
      netmask: minerInfo.netmask || '255.255.255.0',
      dns: minerInfo.dns || '192.168.0.1',
      mac: minerInfo.mac || 'CA:7A:0A:00:02:23',
      gateway: minerInfo.gateway || '192.168.0.1',
      hostname: minerInfo.hostname || 'WhatsMiner'
    },
    miner: {
      working: state.suspended ? 'false' : 'true',
      type: version.miner_type || 'M7BS_VM30',
      'hash-board': 'M30',
      cointype: 'BTC',
      'pool-strategy': 'FAILOVER',
      heatmode: '',
      'hash-percent': state.hash_percent || '0',
      chipdata0: version.chip || 'KAAP315-2601 BINVLC-199004E',
      'fast-boot': summary['Btminer Fast Boot'] === 'enable' ? 'enable' : 'disable',
      'board-num': '4',
      'miner-sn': ctx.serial,
      'power-limit-set': summary['Power Limit'] ? summary['Power Limit'].toString() : '',
      UpfreqSpeed: '',
      'web-pool': 1,
      permission: 'super=255 user1=0 user2=0 user3=0'
    },
    system: {
      api: version.api_ver || '3.0.3',
      platform: version.platform || 'H616',
      fwversion: version.fw_ver || '20260312.16.REL3',
      'control-board-version': 'CB6V5',
      apiswitch: '1',
      ledstatus: state.led_mode === 'manual' ? 'manual' : (minerInfo.ledstat || 'auto')
    },
    power: {
      type: 'P566Z',
      mode: '1',
      hwversion: 'HA3000000',
      swversion: '1653.1411',
      model: 'P566Z',
      iin: 10.52,
      vin: 409,
      vout: 4084,
      pin: summary.Power || 7477,
      'liquid-temperature': state.liquid_temp !== undefined ? state.liquid_temp : 44.1,
      fanspeed: 6000,
      temp0: 55.0,
      sn: '2F260200665',
      vendor: '6'
    },
    salt: SALT,
    'error-code': (state.error_code || []).map((item) => {
      if (typeof item === 'object') return item
      return { [item]: new Date().toISOString(), reason: `Error ${item}` }
    })
  }

  if (req.param !== undefined) {
    if (!(req.param in sections)) {
      return createV3ErrorResponse(-2, `invalid param: ${req.param}`, 'get.device.info')
    }
    return createV3SuccessResponse({ [req.param]: sections[req.param] }, 'get.device.info')
  }

  return createV3SuccessResponse(sections, 'get.device.info')
}
