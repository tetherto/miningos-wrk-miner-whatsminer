'use strict'

const { createV3SuccessResponse } = require('../utils')

/**
 * V3 API get.version command handler
 *
 * Response format (V3): {code, when, msg, desc}
 */
module.exports = function (ctx, state) {
  const version = state.version || {}

  return createV3SuccessResponse({
    api_ver: '3.0.3',
    fw_ver: version.fw_ver || '20250101.15.Rel',
    platform: version.platform || 'H616',
    chip: version.chip || 'WM30SP'
  }, 'get.version')
}
