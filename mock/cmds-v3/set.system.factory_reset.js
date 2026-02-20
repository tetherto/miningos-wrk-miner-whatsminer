'use strict'

const { createV3SuccessResponse } = require('../utils')

/**
 * V3 API set.system.factory_reset command handler
 * Performs factory reset
 */
module.exports = function (ctx, state) {
  // Reset relevant state fields
  state.led_mode = 'auto'
  state.temp_offset = 0
  state.target_freq_pct = 100

  return createV3SuccessResponse({
    status: 'resetting'
  }, 'set.system.factory_reset')
}
