'use strict'

const { createV3SuccessResponse } = require('../utils')

/**
 * V3 API get.miner.setting command handler
 *
 * Real response shape (verified on fw 20260312.16.REL3 / api 3.0.5):
 * {power-limit, upfreq-speed, power-mode, fast-boot, fast-hash, heat-mode,
 *  target-freq, power, power-percent, btrom-worker-suffix}
 * Note: mineroff/liquid-temp/firmware-version are NOT part of this command —
 * they live in get.device.info.
 *
 * Response format (V3): {code, when, msg, desc}
 */
module.exports = function (ctx, state) {
  const summary = state.summary || {}

  return createV3SuccessResponse({
    'power-limit': summary['Power Limit'] || 8000,
    'upfreq-speed': state.miner_info?.upfreq_speed !== undefined ? state.miner_info.upfreq_speed : 2,
    'power-mode': (summary['Power Mode'] || 'Normal').toLowerCase(),
    'fast-boot': summary['Btminer Fast Boot'] === 'enable' ? 'enable' : 'disable',
    'fast-hash': state.fast_hash ? 'enable' : 'disable',
    'heat-mode': 'normal',
    'target-freq': summary['Target Freq'] || 0,
    power: summary.Power || 0,
    'power-percent': state.power_pct !== undefined ? state.power_pct : 0,
    'btrom-worker-suffix': ''
  }, 'get.miner.setting')
}
