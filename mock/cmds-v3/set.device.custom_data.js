'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.device.custom_data command handler
 * Sets custom data fields (CustomerSn or msg0-msg9)
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.device.custom_data')
  }

  const { key, value } = req.param
  const validKeys = ['CustomerSn', 'msg0', 'msg1', 'msg2', 'msg3', 'msg4', 'msg5', 'msg6', 'msg7', 'msg8', 'msg9']

  if (!validKeys.includes(key)) {
    return createV3ErrorResponse(-1, 'Invalid key', 'set.device.custom_data')
  }

  if (key.startsWith('msg') && value && value.length >= 128) {
    return createV3ErrorResponse(-1, 'Value too long (max 128 bytes)', 'set.device.custom_data')
  }

  state.customData = state.customData || {}
  state.customData[key] = value

  return createV3SuccessResponse('ok', 'set.device.custom_data')
}
