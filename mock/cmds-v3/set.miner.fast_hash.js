'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.miner.fast_hash command handler
 * Enables/disables fast hash mode during startup
 * This reduces hash rate loss during startup but may increase time to stability
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.miner.fast_hash')
  }

  const enable = req.param === 1 || req.param === '1' || req.param === true

  state.fast_hash = enable

  return createV3SuccessResponse('ok', 'set.miner.fast_hash')
}
