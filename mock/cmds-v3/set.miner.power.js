'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.miner.power command handler
 * Handles power_on, power_off, pre_power_on
 * param: 'on' | 'off' | 'pre'
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.miner.power')
  }

  const powerAction = req.param
  if (!['on', 'off', 'pre'].includes(powerAction)) {
    return createV3ErrorResponse(-1, 'Invalid power action', 'set.miner.power')
  }

  if (powerAction === 'off') {
    state.suspended = true
    state.pre_power_on = false
  } else if (powerAction === 'pre') {
    state.pre_power_on = true
  } else if (powerAction === 'on') {
    state.suspended = false
    state.pre_power_on = false
  }

  return createV3SuccessResponse({
    power: powerAction
  }, 'set.miner.power')
}
