'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.fan.temp_offset command handler
 * Sets temperature offset
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param', 'offset']], req)) {
    return createV3ErrorResponse(-1, 'Missing param/offset', 'set.fan.temp_offset')
  }

  const offset = parseInt(req.param || req.offset, 10)
  if (isNaN(offset)) {
    return createV3ErrorResponse(-1, 'Invalid offset', 'set.fan.temp_offset')
  }

  state.temp_offset = offset

  return createV3SuccessResponse({
    'temp-offset': offset
  }, 'set.fan.temp_offset')
}
