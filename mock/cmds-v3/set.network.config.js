'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.network.config command handler
 * Configures network settings
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['ip', 'netmask', 'gateway', 'dns']], req)) {
    return createV3ErrorResponse(-1, 'Missing network configuration', 'set.network.config')
  }

  state.minerInfo = state.minerInfo || {}
  state.minerInfo.ip = req.ip || state.minerInfo.ip
  state.minerInfo.netmask = req.netmask || state.minerInfo.netmask
  state.minerInfo.gateway = req.gateway || state.minerInfo.gateway
  state.minerInfo.dns = req.dns || state.minerInfo.dns
  state.minerInfo.proto = req.proto || 'static'

  return createV3SuccessResponse({
    ip: state.minerInfo.ip,
    netmask: state.minerInfo.netmask,
    gateway: state.minerInfo.gateway,
    dns: state.minerInfo.dns
  }, 'set.network.config')
}
