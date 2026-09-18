'use strict'

const libAlerts = require('@tetherto/miningos-tpl-wrk-miner/workers/lib/alerts')
const libUtils = require('@tetherto/miningos-tpl-wrk-miner/workers/lib/utils')
const { STATUS } = require('@tetherto/miningos-tpl-wrk-miner/workers/lib/constants')

const MIN_10_MS = 10 * 60 * 1000
const MIN_30_MS = 30 * 60 * 1000

// target power (W) derived from nominal efficiency (W/THs) * target hashrate (THs)
const targetPowerW = (snap) => {
  const nominalEff = snap.stats.nominal_efficiency_w_ths
  const targetMhs = snap.stats.hashrate_mhs?.target
  if (!nominalEff || !targetMhs) return 0
  return nominalEff * (targetMhs / 1e6)
}

// Fleet-wide targets for the deployed model at 100% power (normal mode):
// custom.low_hashrate.*/custom.high_power.* scale these
// linearly with the miner's power percentage, capped at the hardware max
const TARGET_CONSUMPTION_W_AT_100PCT = 7500
const TARGET_HASHRATE_MHS_AT_100PCT = 480_000_000
const MAX_CONSUMPTION_W = 10000
const MAX_HASHRATE_MHS = 640_000_000

const powerPct = (snap) => snap.stats.miner_specific?.power_pct ?? 100

const targetConsumptionW = (snap) => {
  return Math.min(MAX_CONSUMPTION_W, TARGET_CONSUMPTION_W_AT_100PCT * (powerPct(snap) / 100))
}

const targetHashrateMhs = (snap) => {
  return Math.min(MAX_HASHRATE_MHS, TARGET_HASHRATE_MHS_AT_100PCT * (powerPct(snap) / 100))
}

// Shared with custom.low_hashrate.* (defined in the base template), so the
// warm-up clock is tracked once, not per vendor.
const timeSinceMiningMs = libAlerts.timeSinceMiningMs

const isMining = (snap) => {
  return libUtils.isValidSnap(snap) && !libUtils.isOffline(snap) && snap.stats.status === STATUS.MINING
}

libAlerts.specs.miner = {
  ...libAlerts.specs.miner_default,
  pcb_temp_warning: {
    valid: (ctx, snap) => {
      return libUtils.isValidSnap(snap) && !libUtils.isOffline(snap) && ctx.conf.pcb_temp_warning
    },
    probe: (ctx, snap) => {
      const a = (
        (snap.config.power_mode === 'low' && snap.stats.temperature_c?.pcb?.some((t) => t.current > ctx.conf.pcb_temp_warning.lowTemp)) ||
        (snap.config.power_mode === 'high' && snap.stats.temperature_c?.pcb?.some((t) => t.current > ctx.conf.pcb_temp_warning.highTemp)) ||
        (snap.config.power_mode === 'normal' && snap.stats.temperature_c?.pcb?.some((t) => t.current > ctx.conf.pcb_temp_warning.normalTemp))
      )
      return a || false
    }
  },
  chip_temp_warning: {
    valid: (ctx, snap) => {
      return libUtils.isValidSnap(snap) && !libUtils.isOffline(snap) && ctx.conf.chip_temp_warning
    },
    probe: (ctx, snap) => {
      const a = (
        (snap.config.power_mode === 'low' && snap.stats.temperature_c?.chips?.some((t) => t.avg > ctx.conf.chip_temp_warning.lowTemp)) ||
        (snap.config.power_mode === 'high' && snap.stats.temperature_c?.chips?.some((t) => t.avg > ctx.conf.chip_temp_warning.highTemp)) ||
        (snap.config.power_mode === 'normal' && snap.stats.temperature_c?.chips?.some((t) => t.avg > ctx.conf.chip_temp_warning.normalTemp))
      )
      return a || false
    }
  },
  low_power_warning: {
    valid: (ctx, snap) => {
      const miningMs = timeSinceMiningMs(ctx, snap)
      return isMining(snap) && ctx.conf.low_power_warning &&
        miningMs > MIN_10_MS && targetPowerW(snap) > 0
    },
    probe: (ctx, snap) => {
      const threshold = targetPowerW(snap) * (ctx.conf.low_power_warning.lowPower / 100)
      return snap.stats.power_w < threshold
    }
  },
  low_hashrate_warning: {
    valid: (ctx, snap) => {
      const miningMs = timeSinceMiningMs(ctx, snap)
      return isMining(snap) && ctx.conf.low_hashrate_warning &&
        miningMs > MIN_30_MS && snap.stats.hashrate_mhs?.target > 0
    },
    probe: (ctx, snap) => {
      const threshold = snap.stats.hashrate_mhs.target * (ctx.conf.low_hashrate_warning.lowHash / 100)
      return snap.stats.hashrate_mhs.avg < threshold
    }
  },
  high_efficiency_warning: {
    valid: (ctx, snap) => {
      const miningMs = timeSinceMiningMs(ctx, snap)
      return isMining(snap) && ctx.conf.high_efficiency_warning &&
        miningMs > MIN_30_MS && snap.stats.nominal_efficiency_w_ths > 0
    },
    probe: (ctx, snap) => {
      const threshold = snap.stats.nominal_efficiency_w_ths * (ctx.conf.high_efficiency_warning.highEfficiency / 100)
      return snap.stats.efficiency_w_ths > threshold
    }
  },
  'custom.high_board_temp.warning': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.high_board_temp.warning']
      const enabled = configuredParams?.enabled

      return enabled && libUtils.isValidSnap(snap)
    },
    probe: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.high_board_temp.warning']
      const threshold = configuredParams.maxTempC
      return snap.stats.temperature_c?.pcb?.some((t) => t.current > threshold)
    }
  },
  'custom.high_board_temp.critical': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.high_board_temp.critical']
      const enabled = configuredParams?.enabled

      return enabled && libUtils.isValidSnap(snap)
    },
    probe: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.high_board_temp.critical']
      const threshold = configuredParams.maxTempC
      return snap.stats.temperature_c?.pcb?.some((t) => t.current > threshold)
    }
  },
  'custom.chip_temp.warning': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.chip_temp.warning']
      const enabled = configuredParams?.enabled

      return enabled && libUtils.isValidSnap(snap) && !libUtils.isOffline(snap)
    },
    probe: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.chip_temp.warning']
      const a = (
        (snap.config.power_mode === 'low' && snap.stats.temperature_c?.chips?.some((t) => t.avg > configuredParams.lowTemp)) ||
        (snap.config.power_mode === 'high' && snap.stats.temperature_c?.chips?.some((t) => t.avg > configuredParams.highTemp)) ||
        (snap.config.power_mode === 'normal' && snap.stats.temperature_c?.chips?.some((t) => t.avg > configuredParams.normalTemp))
      )
      return a || false
    }
  },
  'custom.chip_temp.critical': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.chip_temp.critical']
      const enabled = configuredParams?.enabled

      return enabled && libUtils.isValidSnap(snap) && !libUtils.isOffline(snap)
    },
    probe: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.chip_temp.critical']
      const a = (
        (snap.config.power_mode === 'low' && snap.stats.temperature_c?.chips?.some((t) => t.avg > configuredParams.lowTemp)) ||
        (snap.config.power_mode === 'high' && snap.stats.temperature_c?.chips?.some((t) => t.avg > configuredParams.highTemp)) ||
        (snap.config.power_mode === 'normal' && snap.stats.temperature_c?.chips?.some((t) => t.avg > configuredParams.normalTemp))
      )
      return a || false
    }
  },
  // Overrides the flat MH/s threshold inherited from miner_default: the
  // deployed model's real-world targets don't match a generic per-model
  // efficiency table, so this compares against targetHashrateMhs instead.
  'custom.low_hashrate.warning': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.low_hashrate.warning']
      const enabled = configuredParams?.enabled
      const miningMs = timeSinceMiningMs(ctx, snap)

      return enabled && isMining(snap) && miningMs > MIN_30_MS
    },
    probe: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.low_hashrate.warning']
      const threshold = targetHashrateMhs(snap) * (configuredParams.lowHashrate / 100)
      return snap.stats.hashrate_mhs.avg < threshold
    }
  },
  'custom.low_hashrate.critical': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.low_hashrate.critical']
      const enabled = configuredParams?.enabled
      const miningMs = timeSinceMiningMs(ctx, snap)

      return enabled && isMining(snap) && miningMs > MIN_30_MS
    },
    probe: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.low_hashrate.critical']
      const threshold = targetHashrateMhs(snap) * (configuredParams.lowHashrate / 100)
      return snap.stats.hashrate_mhs.avg < threshold
    }
  },
  'custom.low_power.warning': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.low_power.warning']
      const enabled = configuredParams?.enabled
      const miningMs = timeSinceMiningMs(ctx, snap)

      return enabled && isMining(snap) && miningMs > MIN_10_MS
    },
    probe: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.low_power.warning']
      const threshold = targetConsumptionW(snap) * (configuredParams.lowPower / 100)
      return snap.stats.power_w < threshold
    }
  },
  'custom.low_power.critical': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.low_power.critical']
      const enabled = configuredParams?.enabled
      const miningMs = timeSinceMiningMs(ctx, snap)

      return enabled && isMining(snap) && miningMs > MIN_10_MS
    },
    probe: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.low_power.critical']
      const threshold = targetConsumptionW(snap) * (configuredParams.lowPower / 100)
      return snap.stats.power_w < threshold
    }
  },
  'custom.high_power.warning': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.high_power.warning']
      const enabled = configuredParams?.enabled
      const miningMs = timeSinceMiningMs(ctx, snap)

      return enabled && isMining(snap) && miningMs > MIN_10_MS
    },
    probe: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.high_power.warning']
      const threshold = targetConsumptionW(snap) * (configuredParams.highPower / 100)
      return snap.stats.power_w > threshold
    }
  },
  'custom.high_power.critical': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.high_power.critical']
      const enabled = configuredParams?.enabled
      const miningMs = timeSinceMiningMs(ctx, snap)

      return enabled && isMining(snap) && miningMs > MIN_10_MS
    },
    probe: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.high_power.critical']
      const threshold = targetConsumptionW(snap) * (configuredParams.highPower / 100)
      return snap.stats.power_w > threshold
    }
  },
  'custom.high_efficiency.warning': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.high_efficiency.warning']
      const enabled = configuredParams?.enabled
      const miningMs = timeSinceMiningMs(ctx, snap)

      return enabled && isMining(snap) &&
        miningMs > MIN_30_MS && snap.stats.nominal_efficiency_w_ths > 0
    },
    probe: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.high_efficiency.warning']
      const threshold = snap.stats.nominal_efficiency_w_ths * (configuredParams.highEfficiency / 100)
      return snap.stats.efficiency_w_ths > threshold
    }
  },
  'custom.high_efficiency.critical': {
    valid: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.high_efficiency.critical']
      const enabled = configuredParams?.enabled
      const miningMs = timeSinceMiningMs(ctx, snap)

      return enabled && isMining(snap) &&
        miningMs > MIN_30_MS && snap.stats.nominal_efficiency_w_ths > 0
    },
    probe: (ctx, snap) => {
      const configuredParams = ctx.configuredParams['custom.high_efficiency.critical']
      const threshold = snap.stats.nominal_efficiency_w_ths * (configuredParams.highEfficiency / 100)
      return snap.stats.efficiency_w_ths > threshold
    }
  }
}

module.exports = libAlerts
