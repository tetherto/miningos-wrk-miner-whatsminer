'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.user.permission command handler
 * Sets command permissions for a user account
 * Only executable by super account
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.user.permission')
  }

  const { user, permission } = req.param || {}
  const validUsers = ['user1', 'user2', 'user3']

  if (!user || !validUsers.includes(user)) {
    return createV3ErrorResponse(-1, 'Invalid user (user1/user2/user3)', 'set.user.permission')
  }

  if (!permission || typeof permission !== 'string') {
    return createV3ErrorResponse(-1, 'Invalid permission list', 'set.user.permission')
  }

  state.permissions = state.permissions || {}
  state.permissions[user] = permission.split(',').map(p => p.trim())

  return createV3SuccessResponse('ok', 'set.user.permission')
}
