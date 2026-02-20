'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.fan.poweroff_cool command handler
 * Enables/disables poweroff cooling
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.fan.poweroff_cool')
  }

  const enable = req.param === 'enable' || req.param === '1' || req.param === true

  state.poweroffCool = enable

  return createV3SuccessResponse({
    'poweroff-cool': enable
  }, 'set.fan.poweroff_cool')
}
