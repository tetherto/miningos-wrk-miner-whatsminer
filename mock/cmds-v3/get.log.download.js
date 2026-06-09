'use strict'

const { createV3SuccessResponse } = require('../utils')

/**
 * V3 API get.log.download command handler
 * Packages system logs and returns size for streaming
 * Returns a _binaryPayload that the mock server sends after the JSON response
 */
module.exports = function (ctx, state) {
  const mockLogContent = Buffer.from(
    '=== Whatsminer Log Export ===\n' +
    `Serial: ${ctx.serial}\n` +
    `Type: ${ctx.type}\n` +
    `Timestamp: ${new Date().toISOString()}\n` +
    '--- System Log ---\n' +
    '[INFO] Miner started successfully\n' +
    '[INFO] Pool connection established\n' +
    '[INFO] Hashrate stable at target frequency\n' +
    '--- End of Log ---\n'
  )

  const response = createV3SuccessResponse({
    logfilelen: mockLogContent.length.toString()
  }, 'get.log.download')

  response._binaryPayload = mockLogContent

  return response
}
