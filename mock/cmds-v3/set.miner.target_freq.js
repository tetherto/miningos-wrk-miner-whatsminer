'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.miner.target_freq command handler
 * Sets target frequency as percentage of factory default (-100 to 100)
 * Liquid-cooled: can increase or decrease
 * Air-cooled: can only decrease (negative percentage)
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.miner.target_freq')
  }

  const percent = parseInt(req.param, 10)

  if (isNaN(percent) || percent < -100 || percent > 100) {
    return createV3ErrorResponse(-1, 'Invalid percent (-100 to 100)', 'set.miner.target_freq')
  }

  state.target_freq_pct = 100 + percent

  return createV3SuccessResponse('ok', 'set.miner.target_freq')
}
