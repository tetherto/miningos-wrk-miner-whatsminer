'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.miner.upfreq_speed command handler
 * Sets frequency ramp-up speed (0=normal, 10=fastest)
 * Higher values result in faster startup but may impact stability
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.miner.upfreq_speed')
  }

  const speed = parseInt(req.param, 10)

  if (isNaN(speed) || speed < 0 || speed > 10) {
    return createV3ErrorResponse(-1, 'Invalid speed (0-10)', 'set.miner.upfreq_speed')
  }

  state.minerInfo = state.minerInfo || {}
  state.minerInfo.upfreq_speed = speed

  return createV3SuccessResponse('ok', 'set.miner.upfreq_speed')
}
