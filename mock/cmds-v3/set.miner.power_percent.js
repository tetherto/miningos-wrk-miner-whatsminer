'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.miner.power_percent command handler
 * Sets power percentage (0-100)
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param', 'percent']], req)) {
    return createV3ErrorResponse(-1, 'Missing param/percent', 'set.miner.power_percent')
  }

  const percent = parseInt(req.param || req.percent, 10)
  if (isNaN(percent) || percent < 0 || percent > 100) {
    return createV3ErrorResponse(-1, 'Invalid power percent', 'set.miner.power_percent')
  }

  state.target_freq_pct = percent

  return createV3SuccessResponse({
    'power-percent': percent
  }, 'set.miner.power_percent')
}
