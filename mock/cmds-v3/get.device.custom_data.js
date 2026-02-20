'use strict'

const { createV3SuccessResponse } = require('../utils')

/**
 * V3 API get.device.custom_data command handler
 * Retrieves all previously set custom data fields for the device
 */
module.exports = function (ctx, state) {
  const customData = state.customData || {}

  return createV3SuccessResponse({
    CustomerSn: customData.CustomerSn || '',
    msg0: customData.msg0 || '',
    msg1: customData.msg1 || '',
    msg2: customData.msg2 || '',
    msg3: customData.msg3 || '',
    msg4: customData.msg4 || '',
    msg5: customData.msg5 || '',
    msg6: customData.msg6 || '',
    msg7: customData.msg7 || '',
    msg8: customData.msg8 || '',
    msg9: customData.msg9 || ''
  }, 'get.device.custom_data')
}
