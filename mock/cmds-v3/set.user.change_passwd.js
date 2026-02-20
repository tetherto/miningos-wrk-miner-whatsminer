'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.user.change_passwd command handler
 * Changes password for a user account
 * Note: param should be encrypted Base64 string in production
 * For mock, we accept plain object with account, old, new
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.user.change_passwd')
  }

  // In production, param would be encrypted
  // For mock, accept either encrypted string or plain object
  const params = req.param
  if (typeof params === 'string') {
    // Mock: treat as success for encrypted param
    return createV3SuccessResponse('ok', 'set.user.change_passwd')
  }

  const { account, new: newPwd } = params || {}

  if (!account || !newPwd) {
    return createV3ErrorResponse(-1, 'Missing account or new password', 'set.user.change_passwd')
  }

  // Mock: store new password
  state.passwords = state.passwords || {}
  state.passwords[account] = newPwd

  return createV3SuccessResponse('ok', 'set.user.change_passwd')
}
