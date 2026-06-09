'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.miner.power_mode command handler
 * Sets power mode: low, normal, high
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.miner.power_mode')
  }

  const powerMode = req.param
  if (!['low', 'normal', 'high'].includes(powerMode.toLowerCase())) {
    return createV3ErrorResponse(-1, 'Invalid power mode', 'set.miner.power_mode')
  }

  // Update state
  state.summary = state.summary || {}
  state.summary['Power Mode'] = powerMode.charAt(0).toUpperCase() + powerMode.slice(1).toLowerCase()

  // Set power limits based on mode
  if (powerMode.toLowerCase() === 'low') {
    state.summary['Power Limit'] = 5000
    state.summary['Target Freq'] = 600
  } else if (powerMode.toLowerCase() === 'high') {
    state.summary['Power Limit'] = 10000
    state.summary['Target Freq'] = 900
  } else {
    state.summary['Power Limit'] = 8000
    state.summary['Target Freq'] = 720
  }

  return createV3SuccessResponse({
    'power-mode': state.summary['Power Mode']
  }, 'set.miner.power_mode')
}
