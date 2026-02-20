'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.system.hostname command handler
 * Sets the hostname
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.system.hostname')
  }

  const hostname = req.param
  if (!hostname || typeof hostname !== 'string') {
    return createV3ErrorResponse(-1, 'Invalid hostname', 'set.system.hostname')
  }

  if (state.minerInfo) {
    state.minerInfo.hostname = hostname
  }

  return createV3SuccessResponse({
    hostname
  }, 'set.system.hostname')
}
