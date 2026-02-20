'use strict'

const { createV3SuccessResponse } = require('../utils')

/**
 * V3 API set.system.update_firmware command handler
 * Initiates firmware upgrade process
 * Returns 'ready' to indicate server is prepared for file transfer
 */
module.exports = function (ctx, state) {
  return createV3SuccessResponse('ready', 'set.system.update_firmware')
}
