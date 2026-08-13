'use strict'

const { createV3SuccessResponse, createV3ErrorResponse } = require('../utils')

/**
 * V3 API get.miner.status command handler
 *
 * Per the official API v3 documentation:
 * - param is REQUIRED: "summary" | "pools" | "edevs", combinable with "+"
 *   (missing param -> code -3, invalid param -> -2)
 * - hash rates are in TH/s
 * - pools do NOT include share counts (accepted/rejected/stale) — those only
 *   exist on the v2-compat API
 */
module.exports = function (ctx, state, req) {
  if (req.param === undefined || req.param === null || req.param === '') {
    return createV3ErrorResponse(-3, 'param item is null', 'get.miner.status')
  }

  const params = String(req.param).split('+')
  const result = {}

  for (const p of params) {
    switch (p.trim()) {
      case 'summary':
        result.summary = getSummary(ctx, state)
        break
      case 'pools':
        result.pools = getPools(ctx, state)
        break
      case 'edevs':
        result.edevs = getEdevs(ctx, state)
        break
      default:
        return createV3ErrorResponse(-2, `invalid param: ${p}`, 'get.miner.status')
    }
  }

  return createV3SuccessResponse(result, 'get.miner.status')
}

function getSummary (ctx, state) {
  const summary = state.summary || {}
  const elapsed = Math.floor((Date.now() - state.elapsed) / 1000)
  const bootupTime = Math.floor((Date.now() - state.uptime) / 1000)

  // V3 uses TH/s for hash rates, convert from MH/s
  const mhsToThs = (mhs) => (mhs || 0) / 1000000

  return {
    elapsed,
    'bootup-time': bootupTime,
    'freq-avg': summary.freq_avg || 808,
    'target-freq': summary['Target Freq'] || 0,
    'factory-hash': mhsToThs(summary['Factory GHS'] * 1000 || 239326000),
    'hash-average': mhsToThs(summary['MHS av'] || 0),
    'hash-1min': mhsToThs(summary['MHS 1m'] || 0),
    'hash-15min': mhsToThs(summary['MHS 15m'] || 0),
    'hash-realtime': mhsToThs(summary['HS RT'] || summary['MHS 5s'] || 0),
    'power-rate': summary['Power Rate'] || 30.05,
    'power-5min': summary.Power || 0,
    'power-realtime': summary.Power || 0,
    'environment-temperature': parseFloat(summary['Env Temp']) || 35,
    'board-temperature': [
      state.currentTemp || 70,
      state.currentTemp || 71,
      state.currentTemp || 72,
      state.currentTemp || 72
    ],
    'chip-temp-min': summary['Chip Temp Min'] || 83,
    'chip-temp-avg': summary['Chip Temp Avg'] || 93,
    'chip-temp-max': summary['Chip Temp Max'] || 100,
    'power-limit': summary['Power Limit'] || 8000,
    'up-freq-finish': summary['Upfreq Complete'] || 1,
    'fan-speed-in': summary['Fan Speed In'] || 4980,
    'fan-speed-out': summary['Fan Speed Out'] || 5070
  }
}

function getPools (ctx, state) {
  const pools = state.pools || []

  return pools.map((pool, idx) => ({
    id: pool.POOL || idx + 1,
    url: pool.URL || '',
    status: (pool.Status || 'Alive').toLowerCase(),
    account: pool.User || '',
    'stratum-active': pool['Stratum Active'] || false,
    'reject-rate': pool['Pool Rejected%'] || 0,
    'last-share-time': Math.floor(Date.now() / 1000)
  }))
}

function getEdevs (ctx, state) {
  const devs = state.devs || []

  // V3 uses TH/s for hash rates
  const mhsToThs = (mhs) => (mhs || 0) / 1000000

  return devs.map((dev, idx) => ({
    id: dev.ID !== undefined ? dev.ID : idx,
    slot: dev.Slot !== undefined ? dev.Slot : idx,
    'hash-average': mhsToThs(dev['MHS av'] || 0),
    'factory-hash': mhsToThs(dev['Factory GHS'] * 1000 || 60000000),
    freq: dev['Chip Frequency'] || 808,
    'effective-chips': dev['Effective Chips'] || 128,
    'chip-temp-min': dev['Chip Temp Min'] || 84,
    'chip-temp-avg': dev['Chip Temp Avg'] || 92,
    'chip-temp-max': dev['Chip Temp Max'] || 97
  }))
}
