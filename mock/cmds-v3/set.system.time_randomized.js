'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.system.time_randomized command handler
 * Configures randomized delays for network services and mining stop
 * param.start: delay before starting network services (0-120 seconds)
 * param.stop: delay before stopping mining (0-120 seconds)
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.system.time_randomized')
  }

  const { start, stop } = req.param || {}
  const startVal = parseInt(start, 10)
  const stopVal = parseInt(stop, 10)

  if (isNaN(startVal) || startVal < 0 || startVal > 120) {
    return createV3ErrorResponse(-1, 'Invalid start value (0-120)', 'set.system.time_randomized')
  }

  if (isNaN(stopVal) || stopVal < 0 || stopVal > 120) {
    return createV3ErrorResponse(-1, 'Invalid stop value (0-120)', 'set.system.time_randomized')
  }

  state.time_randomized = { start: startVal, stop: stopVal }

  return createV3SuccessResponse('ok', 'set.system.time_randomized')
}
