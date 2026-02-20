'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.miner.report command handler
 * Configures automatic status reporting at regular intervals
 * param.gap: interval in seconds (0 to disable, max 285)
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.miner.report')
  }

  const { gap } = req.param || {}
  const gapValue = parseInt(gap, 10)

  if (isNaN(gapValue) || gapValue < 0 || gapValue > 285) {
    return createV3ErrorResponse(-1, 'Invalid gap value (0-285)', 'set.miner.report')
  }

  state.report_gap = gapValue

  return createV3SuccessResponse('ok', 'set.miner.report')
}
