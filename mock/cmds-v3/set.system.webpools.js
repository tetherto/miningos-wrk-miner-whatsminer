'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.system.webpools command handler
 * Enables/disables pool configuration from web interface
 * param: 'enable' | 'disable'
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.system.webpools')
  }

  const action = req.param
  if (!['enable', 'disable'].includes(action)) {
    return createV3ErrorResponse(-1, 'Invalid param (enable/disable)', 'set.system.webpools')
  }

  state.web_pools = action === 'enable'

  return createV3SuccessResponse('ok', 'set.system.webpools')
}
