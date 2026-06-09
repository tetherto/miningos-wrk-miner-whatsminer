'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.miner.fastboot command handler
 * Enables/disables fast boot
 * param: 'enable' | 'disable'
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.miner.fastboot')
  }

  const action = req.param
  if (!['enable', 'disable'].includes(action)) {
    return createV3ErrorResponse(-1, 'Invalid fastboot action', 'set.miner.fastboot')
  }

  state.summary = state.summary || {}
  state.summary['Btminer Fast Boot'] = action

  return createV3SuccessResponse({
    'fast-boot': action === 'enable'
  }, 'set.miner.fastboot')
}
