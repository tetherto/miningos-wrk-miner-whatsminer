'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.fan.zero_speed command handler
 * Enables/disables zero speed fan mode
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.fan.zero_speed')
  }

  const enable = req.param === 'enable' || req.param === '1' || req.param === true

  state.zeroSpeed = enable

  return createV3SuccessResponse({
    'zero-speed': enable
  }, 'set.fan.zero_speed')
}
