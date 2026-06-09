'use strict'

const { createV3SuccessResponse, createV3ErrorResponse, validateArgs } = require('../utils')

/**
 * V3 API set.miner.cointype command handler
 * Sets the coin type for mining
 */
module.exports = function (ctx, state, req) {
  if (!validateArgs([['param']], req)) {
    return createV3ErrorResponse(-1, 'Missing param', 'set.miner.cointype')
  }

  const { cointype } = req.param || {}
  const validCoins = ['BTC', 'BCH', 'BSV', 'DCR', 'HC', 'DGB', 'SHA256']

  if (!cointype || !validCoins.includes(cointype.toUpperCase())) {
    return createV3ErrorResponse(-1, 'Invalid cointype', 'set.miner.cointype')
  }

  state.cointype = cointype.toUpperCase()

  return createV3SuccessResponse('ok', 'set.miner.cointype')
}
