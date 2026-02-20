'use strict'

const { createV3SuccessResponse, getRandomIP } = require('../utils')

/**
 * V3 API get.miner.info command handler
 *
 * Response format (V3): {code, when, msg, desc}
 */
module.exports = function (ctx, state) {
  const minerInfo = state.minerInfo || {}

  return createV3SuccessResponse({
    ip: minerInfo.ip || ctx.host,
    proto: minerInfo.proto || 'dhcp',
    netmask: minerInfo.netmask || getRandomIP(),
    gateway: minerInfo.gateway || getRandomIP(),
    dns: minerInfo.dns || getRandomIP(),
    hostname: minerInfo.hostname || 'WhatsMiner',
    mac: minerInfo.mac || 'CA:7A:0A:00:02:23',
    ledstat: state.led_mode || minerInfo.ledstat || 'auto',
    upfreq_speed: minerInfo.upfreq_speed || 2,
    minersn: ctx.serial
  }, 'get.miner.info')
}
