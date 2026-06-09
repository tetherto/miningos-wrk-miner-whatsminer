'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.log.upload command handler
 * Configures real-time log streaming to a remote server
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.log.upload')
  }

  const { ip, port, proto } = req.param || {}

  if (!ip || !port) {
    return createV3ErrorResponse(-1, 'Missing ip or port', 'set.log.upload')
  }

  if (proto && !['tcp', 'udp'].includes(proto.toLowerCase())) {
    return createV3ErrorResponse(-1, 'Invalid proto (tcp/udp)', 'set.log.upload')
  }

  state.log_upload = {
    ip,
    port,
    proto: proto || 'udp'
  }

  return createV3SuccessResponse('ok', 'set.log.upload')
}
