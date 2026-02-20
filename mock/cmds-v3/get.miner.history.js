'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API get.miner.history command handler
 * Retrieves historical performance data within a time range (max 24 hours)
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'get.miner.history')
  }

  const { begin, end } = req.param || {}

  if (!begin || !end) {
    return createV3ErrorResponse(-1, 'Missing begin/end timestamps', 'get.miner.history')
  }

  const beginTs = parseInt(begin, 10)
  const endTs = parseInt(end, 10)

  // Check 24 hour limit
  if (endTs - beginTs > 86400) {
    return createV3ErrorResponse(-1, 'Time range exceeds 24 hours', 'get.miner.history')
  }

  // Return mock history data
  return createV3SuccessResponse({
    begin: beginTs,
    end: endTs,
    data: [
      { ts: beginTs, hashrate: 100.5, power: 3200 },
      { ts: beginTs + 3600, hashrate: 101.2, power: 3250 },
      { ts: endTs, hashrate: 100.8, power: 3180 }
    ]
  }, 'get.miner.history')
}
