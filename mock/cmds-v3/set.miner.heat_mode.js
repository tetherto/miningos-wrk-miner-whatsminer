'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.miner.heat_mode command handler
 * Sets the heating mode for liquid-cooled devices
 * param: 'heating' | 'normal' | 'anti-freezing'
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.miner.heat_mode')
  }

  const mode = req.param
  const validModes = ['heating', 'normal', 'anti-freezing']

  if (!validModes.includes(mode)) {
    return createV3ErrorResponse(-1, 'Invalid heat mode', 'set.miner.heat_mode')
  }

  state.heat_mode = mode

  return createV3SuccessResponse('ok', 'set.miner.heat_mode')
}
