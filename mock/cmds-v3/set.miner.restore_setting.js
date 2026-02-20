'use strict'

const { createV3SuccessResponse } = require('../utils')

/**
 * V3 API set.miner.restore_setting command handler
 * Restores miner settings to factory defaults
 */
module.exports = function (ctx, state) {
  // Reset miner-specific settings
  state.summary = state.summary || {}
  state.summary['Power Mode'] = 'Normal'
  state.summary['Power Limit'] = 8000
  state.summary['Target Freq'] = 720
  state.summary['Btminer Fast Boot'] = 'disable'
  state.target_freq_pct = 100
  state.fast_hash = false
  state.heat_mode = 'normal'

  return createV3SuccessResponse('ok', 'set.miner.restore_setting')
}
