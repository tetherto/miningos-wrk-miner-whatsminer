'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.system.timezone command handler
 * Sets the timezone
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['timezone', 'zonename']], req)) {
    return createV3ErrorResponse(-1, 'Missing timezone/zonename', 'set.system.timezone')
  }

  const timezone = req.timezone || req.zonename
  state.zone = {
    timezone,
    zonename: timezone
  }

  return createV3SuccessResponse({
    timezone
  }, 'set.system.timezone')
}
