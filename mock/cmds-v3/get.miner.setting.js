'use strict'

const { createV3SuccessResponse } = require('../utils')

/**
 * V3 API get.miner.setting command handler
 * New command in API v3.0.3 - returns miner power/performance settings
 *
 * Response fields:
 * - power-limit: Power limit in watts
 * - upfreq-speed: Upfreq speed setting
 * - power-mode: Normal/Low/High
 * - fast-boot: Fast boot enabled
 * - target-freq: Target frequency
 * - fast-mining: Fast mining enabled
 * - power: Current power consumption
 * - power-percent: Power percentage
 *
 * Response format (V3): {code, when, msg, desc}
 */
module.exports = function (ctx, state) {
  const summary = state.summary || {}

  return createV3SuccessResponse({
    'power-limit': summary['Power Limit'] || 8000,
    'upfreq-speed': state.minerInfo?.upfreq_speed || 2,
    'power-mode': summary['Power Mode'] || 'Normal',
    'fast-boot': summary['Btminer Fast Boot'] === 'enable',
    'target-freq': summary['Target Freq'] || 720,
    'fast-mining': state.fast_mining || false,
    power: summary.Power || 0,
    'power-percent': state.target_freq_pct || 100
  }, 'get.miner.setting')
}
