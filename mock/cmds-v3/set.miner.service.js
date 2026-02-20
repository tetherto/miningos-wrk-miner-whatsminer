'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.miner.service command handler
 * Controls the mining service (btminer)
 * param: 'restart' | 'start' | 'stop' | 'enable' | 'disable'
 *
 * Used for:
 * - restart_btminer (param: 'restart')
 * - power_on (param: 'start')
 * - power_off (param: 'stop')
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.miner.service')
  }

  const action = req.param
  const validActions = ['restart', 'start', 'stop', 'enable', 'disable']
  if (!validActions.includes(action)) {
    return createV3ErrorResponse(-1, 'Invalid service action', 'set.miner.service')
  }

  switch (action) {
    case 'restart':
      // Reset elapsed time to simulate restart
      state.elapsed = +new Date()
      break
    case 'start':
      state.suspended = false
      state.pre_power_on = false
      break
    case 'stop':
      state.suspended = true
      state.pre_power_on = false
      break
    case 'enable':
      // Enable mining service on boot
      state.miningEnabled = true
      break
    case 'disable':
      // Disable mining service on boot
      state.miningEnabled = false
      break
  }

  return createV3SuccessResponse({
    service: action
  }, 'set.miner.service')
}
