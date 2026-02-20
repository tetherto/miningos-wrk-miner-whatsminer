'use strict'

const { createV3SuccessResponse } = require('../utils')

/**
 * V3 API get.fan.setting command handler
 * Returns fan settings
 */
module.exports = function (ctx, state) {
  return createV3SuccessResponse({
    'fan-mode': state.fanMode || 'auto',
    'fan-speed': state.fanSpeed || 0,
    'poweroff-cool': state.poweroffCool || false,
    'temp-offset': state.temp_offset || 0,
    'zero-speed': state.zeroSpeed || false
  }, 'get.fan.setting')
}
