'use strict'

const { createSuccessResponse } = require('../utils')

/**
 * V3 API get.error.code command handler
 *
 * Returns data in same format as V2 for compatibility
 */
module.exports = function (ctx, state) {
  return createSuccessResponse({ error_code: state.error_code || [] })
}
