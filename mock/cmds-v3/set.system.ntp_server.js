'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.system.ntp_server command handler
 * Configures NTP servers (comma-separated list)
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.system.ntp_server')
  }

  const servers = req.param
  if (!servers || typeof servers !== 'string') {
    return createV3ErrorResponse(-1, 'Invalid NTP server list', 'set.system.ntp_server')
  }

  state.ntp_servers = servers.split(',').map(s => s.trim())

  return createV3SuccessResponse('ok', 'set.system.ntp_server')
}
