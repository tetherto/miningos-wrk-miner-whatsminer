'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.miner.power_limit command handler
 * Sets power limit in watts
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.miner.power_limit')
  }

  const powerLimit = parseInt(req.param, 10)
  if (isNaN(powerLimit) || powerLimit < 0) {
    return createV3ErrorResponse(-1, 'Invalid power limit', 'set.miner.power_limit')
  }

  state.summary = state.summary || {}
  state.summary['Power Limit'] = powerLimit

  return createV3SuccessResponse({
    'power-limit': powerLimit
  }, 'set.miner.power_limit')
}
