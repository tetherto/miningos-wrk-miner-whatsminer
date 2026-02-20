'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.system.led command handler
 * Sets LED status
 * param: 'on' | 'off' | 'auto'
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.system.led')
  }

  const ledMode = req.param
  if (!['on', 'off', 'auto'].includes(ledMode)) {
    return createV3ErrorResponse(-1, 'Invalid LED mode', 'set.system.led')
  }

  state.led_mode = ledMode

  return createV3SuccessResponse({
    'led-mode': ledMode
  }, 'set.system.led')
}
