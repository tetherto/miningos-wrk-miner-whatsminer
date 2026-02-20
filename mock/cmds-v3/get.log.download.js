'use strict'

const { createV3SuccessResponse } = require('../utils')

/**
 * V3 API get.log.download command handler
 * Packages system logs and returns size for streaming
 * In production, server would stream the log file after this response
 */
module.exports = function (ctx, state) {
  // Mock log size
  const logsize = '12345'

  return createV3SuccessResponse({
    logsize
  }, 'get.log.download')
}
