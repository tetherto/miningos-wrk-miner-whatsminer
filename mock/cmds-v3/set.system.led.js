'use strict'

const { createV3SuccessResponse, validateArgs } = require('../utils')

/**
 * V3 API set.system.led command handler
 * Sets LED status
 * Accepts either:
 * - param: 'on' | 'off' | 'auto'
 * - color, period, duration, start (V2 compatibility)
 */
module.exports = function (ctx, state, req) {
  const args = [[
    'param'
  ], [
    'color',
    'period',
    'duration',
    'start'
  ]]

  if (!validateArgs(args, req)) {
    return createV3SuccessResponse('ok', 'set.system.led')
  }

  if (req.param === 'auto') {
    state.led_mode = 'auto'
    if (state.miner_info) {
      state.miner_info.ledstat = 'auto'
    }
  } else {
    state.led_mode = 'manual'
    if (state.miner_info) {
      state.miner_info.ledstat = 'manual'
    }
  }

  return createV3SuccessResponse('ok', 'set.system.led')
}
