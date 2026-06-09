'use strict'

const { createV3SuccessResponse, createV3ErrorResponse } = require('../utils')

/**
 * V3 API get.miner.status command handler
 * Replaces separate summary/pools/edevs commands from V2
 *
 * Params:
 * - param: "summary" | "pools" | "edevs" | "devdetails" | "summary+pools" etc.
 *
 * Returns data in V3 format with V3 field names
 */
module.exports = function (ctx, state, req) {
  const param = req.param || 'summary'
  const params = param.split('+')

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
      case 'devdetails':
        result.devdetails = getDevdetails(ctx, state)
        break
      default:
        return createV3ErrorResponse(-2, `Invalid param: ${p}`, 'get.miner.status')
    }
  }

  return createV3SuccessResponse(result, 'get.miner.status')
}

function getSummary (ctx, state) {
  const summary = state.summary || {}
  const elapsed = Math.floor((Date.now() - state.elapsed) / 1000)
  const bootupTime = Math.floor((Date.now() - state.uptime) / 1000)

  // V3 uses TH/s for hash rates, convert from MH/s
  const mhsToThs = (mhs) => mhs / 1000000

  return {
    elapsed,
    'bootup-time': bootupTime,
    'freq-avg': summary.freq_avg || 808,
    'target-freq': summary['Target Freq'] || 720,
    'factory-hash': mhsToThs(summary['Factory GHS'] * 1000 || 239326000),
    'hash-average': mhsToThs(summary['MHS av'] || 0),
    'hash-1min': mhsToThs(summary['MHS 1m'] || 0),
    'hash-15min': mhsToThs(summary['MHS 15m'] || 0),
    'hash-realtime': mhsToThs(summary['HS RT'] || 0),
    'power-rate': summary['Power Rate'] || 30.05,
    'power-5min': summary.Power || 0,
    'power-realtime': summary.Power || 0,
    'environment-temperature': parseFloat(summary['Env Temp']) || 35,
    'board-temperature': [
      state.currentTemp || 70,
      state.currentTemp || 71,
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
    'stratum-diff': pool['Stratum Difficulty'] || 65536,
    accepted: pool.Accepted || 0,
    rejected: pool.Rejected || 0,
    stale: pool.Stale || 0,
    'reject-rate': pool['Pool Rejected%'] || 0,
    'last-share-time': Math.floor(Date.now() / 1000)
  }))
}

function getEdevs (ctx, state) {
  const devs = state.devs || []

  // V3 uses TH/s for hash rates
  const mhsToThs = (mhs) => mhs / 1000000

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

function getDevdetails (ctx, state) {
  const devdetails = state.devdetails || []

  return devdetails.map((detail, idx) => ({
    id: detail.ID !== undefined ? detail.ID : idx,
    slot: detail.DEVDETAILS !== undefined ? detail.DEVDETAILS : idx,
    name: detail.Name || 'SM',
    driver: detail.Driver || 'bitmicro',
    model: detail.Model || state.version?.chip || 'WM30SP'
  }))
}
