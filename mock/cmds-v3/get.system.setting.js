'use strict'

const { createV3SuccessResponse } = require('../utils')

/**
 * V3 API get.system.setting command handler
 * Returns system settings
 */
module.exports = function (ctx, state) {
  return createV3SuccessResponse({
    hostname: state.minerInfo?.hostname || 'WhatsMiner',
    timezone: state.zone?.timezone || 'Asia/Shanghai',
    'led-mode': state.led_mode || 'auto',
    mac: state.minerInfo?.mac || 'CA:7A:0A:00:02:23'
  }, 'get.system.setting')
}
