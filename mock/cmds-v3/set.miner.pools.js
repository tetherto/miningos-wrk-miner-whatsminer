'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs, createPools } = require('../utils')

/**
 * V3 API set.miner.pools command handler
 * Updates pool configuration
 */
module.exports = function (ctx, state, req) {
  // V3 can accept pools in param field (possibly encrypted)
  // For mock purposes, we accept pool1/pool2/pool3 format
  if (!validateArgs([['pool1', 'pool2', 'pool3'], ['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing pool configuration', 'set.miner.pools')
  }

  const pools = state.pools || createPools()

  // Update pools from request
  if (req.pool1) {
    pools[0] = {
      ...pools[0],
      URL: req.pool1,
      User: req.worker1 || pools[0].User
    }
  }
  if (req.pool2) {
    pools[1] = {
      ...pools[1],
      URL: req.pool2,
      User: req.worker2 || pools[1].User
    }
  }
  if (req.pool3) {
    pools[2] = {
      ...pools[2],
      URL: req.pool3,
      User: req.worker3 || pools[2].User
    }
  }

  state.pools = pools

  return createV3SuccessResponse({
    pools: pools.length
  }, 'set.miner.pools')
}
