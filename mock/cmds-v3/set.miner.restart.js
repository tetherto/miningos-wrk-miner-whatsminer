'use strict'

const { createV3SuccessResponse } = require('../utils')

/**
 * V3 API set.miner.restart command handler
 * Restarts the btminer process
 */
module.exports = function (ctx, state) {
  // Reset elapsed time to simulate restart
  state.elapsed = +new Date()

  return createV3SuccessResponse({
    status: 'restarting'
  }, 'set.miner.restart')
}
