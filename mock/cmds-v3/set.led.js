'use strict'

const { proxyState, createSuccessResponse, createErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.led command handler
 *
 * Accepts same params as V2:
 * - { param: 'auto' } - set LED to auto mode
 * - { color, period, duration, start } - set LED to manual mode
 *
 * Returns V2-compatible response for compatibility
 */
const args = [[
  'param'
], [
  'color',
  'period',
  'duration',
  'start'
]]

module.exports = proxyState(function (ctx, state, req) {
  if (validateArgs(args, req)) {
    if (req.param === 'auto') {
      if (state.minerInfo) {
        state.minerInfo.ledstat = 'auto'
      }
      state.led_mode = 'auto'
    } else {
      if (state.minerInfo) {
        state.minerInfo.ledstat = 'manual'
      }
      state.led_mode = 'manual'
    }
    return createSuccessResponse()
  } else {
    return createErrorResponse()
  }
})
