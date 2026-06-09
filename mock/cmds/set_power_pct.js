'use strict'

const { createSuccessResponse, createErrorResponse, validateArgs } = require('../utils')

const args = [[
  'percent'
]]

module.exports = function (ctx, state, req) {
  if (validateArgs(args, req)) {
    state.power_pct = Number(req.percent)
    return createSuccessResponse()
  } else {
    return createErrorResponse()
  }
}
