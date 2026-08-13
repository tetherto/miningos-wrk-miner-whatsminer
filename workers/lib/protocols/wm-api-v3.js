'use strict'

const net = require('node:net')
const CryptoJS = require('crypto-js')
const WMApiBase = require('./wm-api-base')
const { API_VERSIONS, API_DEFAULTS, COMMAND_MAP_V3, V3_READ_PARAMS, RESPONSE_CODES_V3 } = require('./constants')

const DEFAULT_TIMEOUT_MS = 5000
const DEVICE_INFO_CACHE_TTL_MS = 2000
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024

/**
 * Sends one length-prefixed JSON request to the miner and reads one
 * length-prefixed JSON response (official v3 TCP framing: a 4-byte
 * little-endian length followed by the JSON payload, in both directions).
 *
 * @param {{address: string, port: number, timeout: number}} opts
 * @param {Object} payload - JSON-serializable request
 * @returns {Promise<Object>}
 */
function framedRequest ({ address, port, timeout }, payload) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    let buf = Buffer.alloc(0)
    let expected = null
    let settled = false

    const settle = (err, res) => {
      if (settled) return
      settled = true
      socket.destroy()
      if (err) reject(err)
      else resolve(res)
    }

    socket.setTimeout(timeout, () => settle(new Error('ERR_V3_REQUEST_TIMEOUT')))

    socket.on('error', (error) => {
      const err = new Error(`ERR_V3_REQUEST_FAILED: ${error.message}`)
      err.code = error.code
      settle(err)
    })

    socket.on('data', (data) => {
      buf = buf.length ? Buffer.concat([buf, data]) : data
      if (expected === null && buf.length >= 4) {
        expected = buf.readUInt32LE(0)
        if (expected > MAX_RESPONSE_BYTES) {
          return settle(new Error('ERR_V3_RESPONSE_TOO_LARGE'))
        }
        buf = buf.subarray(4)
      }
      if (expected !== null && buf.length >= expected) {
        try {
          settle(null, JSON.parse(buf.subarray(0, expected).toString('utf8')))
        } catch (e) {
          settle(new Error('ERR_V3_RESPONSE_PARSE_FAILED'))
        }
      }
    })

    socket.on('end', () => settle(new Error('ERR_V3_CONNECTION_ENDED')))

    socket.connect(port, address, () => {
      const body = Buffer.from(JSON.stringify(payload), 'utf8')
      const len = Buffer.alloc(4)
      len.writeUInt32LE(body.length, 0)
      socket.write(Buffer.concat([len, body]))
    })
  })
}

/**
 * Protocol handler for the WhatsMiner API v3 (port 4433).
 *
 * Verified against the official documentation (apidoc.whatsminer.com) and a
 * live M63S++ on firmware 20260312.16.REL3 (api 3.0.5):
 * - Transport: 4-byte LE length-prefixed JSON frames (NOT raw JSON like v2)
 * - Reads (get.*) need no authentication; get.miner.status requires a param
 *   (summary | pools | edevs), get.device.info accepts a section filter
 *   (miner | system | power | network | salt | error-code)
 * - Hash rates are reported in TH/s (v2 uses MH/s)
 * - Writes use a plaintext envelope {cmd, ts, token, account, param} where
 *   token = base64(sha256(cmd + password + salt + ts)).substring(0, 8)
 * - Response format: {code, when, msg, desc}; code 0 = success
 */
class WMApiV3 extends WMApiBase {
  constructor (opts) {
    super(opts)
    this.address = opts.address
    this.port = opts.port || API_DEFAULTS[API_VERSIONS.V3].port
    this.timeout = opts.timeout || DEFAULT_TIMEOUT_MS
    this.salt = undefined // Salt from get.device.info, used for token generation
    this._deviceInfoCache = null // { ts, promise }
    if (opts.deviceInfoSeed) {
      this._seedDeviceInfo(opts.deviceInfoSeed)
    }
  }

  static get VERSION () {
    return API_VERSIONS.V3
  }

  static get DEFAULT_PORT () {
    return API_DEFAULTS[API_VERSIONS.V3].port
  }

  /**
   * One-shot probe used for API version detection. Returns the full
   * get.device.info response or throws on connection/framing failure.
   */
  static async probeDeviceInfo ({ address, port, timeout }) {
    return framedRequest({
      address,
      port: port || API_DEFAULTS[API_VERSIONS.V3].port,
      timeout: timeout || DEFAULT_TIMEOUT_MS
    }, { cmd: 'get.device.info' })
  }

  getAuthCommand () {
    return API_DEFAULTS[API_VERSIONS.V3].authCommand
  }

  _seedDeviceInfo (response) {
    if (response?.code === RESPONSE_CODES_V3.SUCCESS && response.msg) {
      this._deviceInfoCache = { ts: Date.now(), promise: Promise.resolve(response) }
      if (response.msg.salt) this.salt = response.msg.salt
    }
  }

  async _framedRequest (payload) {
    return framedRequest({ address: this.address, port: this.port, timeout: this.timeout }, payload)
  }

  /**
   * V3 authentication - obtains the device salt used for per-command tokens
   */
  async authenticate () {
    const res = await this._framedRequest({ cmd: 'get.device.info', param: 'salt' })

    if (res?.code !== RESPONSE_CODES_V3.SUCCESS || !res.msg?.salt) {
      throw new Error(`ERR_AUTH_FAILED_${res?.code}`)
    }

    this.salt = res.msg.salt
    return { salt: this.salt }
  }

  async refreshToken () {
    try {
      await this.authenticate()
    } catch (e) {
      this.debugError('_refreshToken error', e)
      throw e
    }
  }

  /**
   * Generate token for a specific command
   * token = base64(sha256(cmd + password + salt + ts)).substring(0, 8)
   * The raw sha256 digest doubles as the AES-256 key for commands whose
   * param must be encrypted (set.miner.pools, set.user.change_passwd).
   * @param {string} command
   * @param {number} timestamp - Unix timestamp (seconds)
   * @returns {{token: string, key: Object}} token and AES key (WordArray)
   */
  _generateToken (command, timestamp) {
    const tokenHash = CryptoJS.SHA256(`${command}${this.password}${this.salt}${timestamp}`)
    const token = tokenHash.toString(CryptoJS.enc.Base64).substring(0, 8)
    return { token, key: tokenHash }
  }

  /**
   * Full get.device.info is requested by several read commands (version,
   * miner info, status merge) — cache it briefly and dedupe in-flight calls
   * so one snapshot triggers a single request.
   */
  async _getDeviceInfoCached () {
    const now = Date.now()
    if (this._deviceInfoCache && now - this._deviceInfoCache.ts < DEVICE_INFO_CACHE_TTL_MS) {
      return this._deviceInfoCache.promise
    }
    const promise = this._framedRequest({ cmd: 'get.device.info' }).then((res) => {
      if (res?.code === RESPONSE_CODES_V3.SUCCESS && res.msg?.salt) {
        this.salt = res.msg.salt
      }
      return res
    })
    this._deviceInfoCache = { ts: now, promise }
    promise.catch(() => { this._deviceInfoCache = null })
    return promise
  }

  /**
   * The v2 'status' command maps to get.miner.setting, but several fields
   * (mineroff, liquid temperature, hash percent, firmware version) only
   * exist in get.device.info — merge them into the setting response.
   */
  async _getMinerSettingMerged () {
    const res = await this._framedRequest({ cmd: 'get.miner.setting' })
    if (res?.code !== RESPONSE_CODES_V3.SUCCESS || typeof res.msg !== 'object') {
      return res
    }

    try {
      const di = await this._getDeviceInfoCached()
      if (di?.code === RESPONSE_CODES_V3.SUCCESS && di.msg) {
        const miner = di.msg.miner || {}
        const system = di.msg.system || {}
        const power = di.msg.power || {}
        res.msg = {
          ...res.msg,
          'miner-working': miner.working,
          'hash-percent': miner['hash-percent'],
          'power-limit-set': miner['power-limit-set'],
          'firmware-version': system.fwversion,
          'liquid-temp': power['liquid-temperature']
        }
      }
    } catch (e) {
      this.debugError('get.device.info merge failed', e.message)
    }

    return res
  }

  async requestRead (command, params = {}) {
    this.debugError(`Sending command ${command} ${JSON.stringify(params)}`)
    try {
      let res
      if (command === 'get.device.info' && params.param === undefined) {
        res = await this._getDeviceInfoCached()
      } else if (command === 'get.miner.setting') {
        res = await this._getMinerSettingMerged()
      } else {
        const payload = { cmd: command }
        if (params.param !== undefined) payload.param = params.param
        res = await this._framedRequest(payload)
      }
      this.debugError(`Received response ${JSON.stringify(res)}`)
      return res
    } catch (error) {
      this.debugError(error)
      throw new Error('ERR_READ_FAILED')
    }
  }

  /**
   * Native v3 writes are not wired up yet — write commands are routed
   * through the v2-compat API (see miner.js init()).
   */
  async requestWrite (command, params = {}, json = true) {
    throw new Error('ERR_V3_WRITE_NOT_IMPLEMENTED')
  }

  /**
   * Transform v2 underscore commands to v3 dot notation
   */
  transformCommand (command) {
    return COMMAND_MAP_V3[command] || command
  }

  /**
   * Get the v3 `param` value for a read command (original v2 name)
   */
  getStatusParam (command) {
    return V3_READ_PARAMS[command]
  }

  /**
   * Parse V3 response format to V2-compatible format
   * V3: {code, when, msg, desc}
   * V2: {STATUS, When, Code, Msg, Description}
   */
  parseResponse (response, originalCommand) {
    // If response is already in V2 format (or null), return as-is
    if (!response || response.code === undefined) {
      return response
    }

    const base = {
      STATUS: response.code === RESPONSE_CODES_V3.SUCCESS ? 'S' : 'E',
      When: response.when || Math.floor(Date.now() / 1000),
      Code: this._convertV3CodeToV2(response.code),
      Description: response.desc || ''
    }

    const msg = response.msg
    if (response.code !== RESPONSE_CODES_V3.SUCCESS || msg === undefined) {
      return { ...base, Msg: msg }
    }

    switch (originalCommand) {
      case 'summary':
      case 'pools':
      case 'edevs':
      case 'devdetails':
        return { ...base, ...this._convertStatusResponse(msg, originalCommand) }
      case 'status':
        return { ...base, Msg: this._convertSettingFields(msg) }
      case 'get_version':
        return { ...base, Msg: this._convertVersionFields(msg) }
      case 'get_miner_info':
        return { ...base, Msg: this._convertMinerInfoFields(msg) }
      case 'get_error_code':
        return { ...base, Msg: { error_code: msg['error-code'] || [] } }
      case 'get_psu':
        return { ...base, Msg: this._convertPsuFields(msg.power || msg) }
      default:
        return { ...base, Msg: msg }
    }
  }

  /**
   * Convert V3 get.miner.status response to V2 format
   */
  _convertStatusResponse (msg, originalCommand) {
    const result = {}

    if (msg.summary) {
      result.SUMMARY = [this._convertSummaryFields(msg.summary)]
    }

    if (msg.pools) {
      result.POOLS = msg.pools.map(p => this._convertPoolFields(p))
    }

    if (msg.edevs) {
      const boardTemps = Array.isArray(msg.summary?.['board-temperature'])
        ? msg.summary['board-temperature']
        : []
      result.DEVS = msg.edevs.map((d, i) => this._convertEdevFields(d, i, boardTemps))
    }

    // devdetails is deprecated and has no v3 equivalent
    if (originalCommand === 'devdetails' && !result.DEVDETAILS) {
      result.DEVDETAILS = []
    }

    return result
  }

  /**
   * Convert V3 summary fields to V2 format.
   * V3 hash rates are in TH/s, V2 uses MH/s. Fields v3 does not expose
   * (MHS 5s / MHS 5m / Target MHS / Accepted / Rejected) are intentionally
   * left undefined — the caller applies explicit fallbacks.
   */
  _convertSummaryFields (summary) {
    const thsToMhs = (ths) => (parseFloat(ths) || 0) * 1000000
    const boardTemp = summary['board-temperature']

    return {
      Elapsed: summary.elapsed ?? 0,
      Uptime: summary['bootup-time'] ?? 0,
      'MHS av': thsToMhs(summary['hash-average']),
      'MHS 1m': thsToMhs(summary['hash-1min']),
      'MHS 15m': thsToMhs(summary['hash-15min']),
      'HS RT': thsToMhs(summary['hash-realtime']),
      freq_avg: summary['freq-avg'] ?? 0,
      'Target Freq': summary['target-freq'] ?? 0,
      'Factory GHS': (parseFloat(summary['factory-hash']) || 0) * 1000,
      Power: summary['power-5min'] ?? summary['power-realtime'] ?? 0,
      'Power Rate': summary['power-rate'] ?? 0,
      'Env Temp': summary['environment-temperature'] ?? 0,
      Temperature: Array.isArray(boardTemp) ? (boardTemp[0] ?? 0) : (boardTemp ?? 0),
      'Chip Temp Min': summary['chip-temp-min'] ?? 0,
      'Chip Temp Avg': summary['chip-temp-avg'] ?? 0,
      'Chip Temp Max': summary['chip-temp-max'] ?? 0,
      'Power Limit': summary['power-limit'] ?? 0,
      'Upfreq Complete': summary['up-freq-finish'] ?? 0,
      'Fan Speed In': summary['fan-speed-in'] ?? 0,
      'Fan Speed Out': summary['fan-speed-out'] ?? 0,
      Debug: summary.Debug
    }
  }

  /**
   * Convert V3 pool fields to V2 format.
   * V3 does not report share counts (Accepted/Rejected/Stale) — those are
   * supplemented from the v2-compat API by the caller when available.
   */
  _convertPoolFields (pool) {
    return {
      POOL: pool.id ?? 0,
      URL: pool.url || '',
      Status: pool.status ? pool.status.charAt(0).toUpperCase() + pool.status.slice(1) : '',
      User: pool.account || '',
      'Stratum Active': pool['stratum-active'] || false,
      'Stratum Difficulty': pool['stratum-diff'],
      'Pool Rejected%': pool['reject-rate'] ?? 0,
      'Last Share Time': pool['last-share-time']
    }
  }

  /**
   * Convert V3 edev fields to V2 format. PCB temperature comes from the
   * summary board-temperature array (requested together via edevs+summary).
   */
  _convertEdevFields (dev, index, boardTemps) {
    const thsToMhs = (ths) => (parseFloat(ths) || 0) * 1000000
    const slot = dev.slot ?? index

    return {
      ASC: dev.id ?? index,
      ID: dev.id ?? index,
      Slot: slot,
      Temperature: boardTemps[slot] ?? boardTemps[index],
      'MHS av': thsToMhs(dev['hash-average']),
      'Factory GHS': (parseFloat(dev['factory-hash']) || 0) * 1000,
      'Chip Frequency': dev.freq ?? 0,
      'Effective Chips': dev['effective-chips'] ?? 0,
      'Chip Temp Min': dev['chip-temp-min'] ?? 0,
      'Chip Temp Avg': dev['chip-temp-avg'] ?? 0,
      'Chip Temp Max': dev['chip-temp-max'] ?? 0
    }
  }

  /**
   * Convert merged get.miner.setting + get.device.info fields to the v2
   * 'status' response shape.
   */
  _convertSettingFields (msg) {
    const toBoolString = (v) => {
      if (v === true || v === 'true' || v === 'enable' || v === 1 || v === '1') return 'true'
      return 'false'
    }
    const powerPct = parseFloat(msg['power-percent'])

    return {
      // get.device.info miner.working: 'true' while btminer runs
      mineroff: msg['miner-working'] !== undefined ? toBoolString(msg['miner-working'] !== 'true') : 'false',
      mineroff_reason: '',
      mineroff_time: '',
      FirmwareVersion: msg['firmware-version'] || '',
      power_mode: msg['power-mode'] || 'normal',
      power_limit_set: (msg['power-limit-set'] ?? msg['power-limit'] ?? '').toString(),
      hash_percent: (msg['hash-percent'] ?? '0').toString(),
      fast_mining: toBoolString(msg['fast-mining']),
      fast_hash: toBoolString(msg['fast-hash']),
      liquid_temp: msg['liquid-temp'] ?? 0,
      // power-percent is 0 when no percent override is active
      power_pct: (powerPct > 0 ? powerPct : 100).toString(),
      upfreq_speed: msg['upfreq-speed']
    }
  }

  /**
   * Build the v2 get_version Msg from the get.device.info response
   */
  _convertVersionFields (msg) {
    const system = msg.system || {}
    const miner = msg.miner || {}
    return {
      api_ver: system.api || '',
      fw_ver: system.fwversion || '',
      platform: system.platform || '',
      chip: miner.chipdata0 || ''
    }
  }

  /**
   * Build the v2 get_miner_info Msg from the get.device.info response
   */
  _convertMinerInfoFields (msg) {
    const network = msg.network || {}
    const system = msg.system || {}
    const miner = msg.miner || {}
    return {
      ip: network.ip || '',
      proto: network.proto || '',
      netmask: network.netmask || '',
      gateway: network.gateway || '',
      dns: network.dns || '',
      hostname: network.hostname || '',
      mac: network.mac || '',
      ledstat: system.ledstatus || 'auto',
      minersn: miner['miner-sn'] || ''
    }
  }

  /**
   * Build the v2 get_psu Msg from the get.device.info power section
   */
  _convertPsuFields (power = {}) {
    return {
      name: power.type || power.model || '',
      hw_version: power.hwversion || '',
      sw_version: power.swversion || '',
      model: power.model || '',
      fan_speed: power.fanspeed,
      iin: power.iin,
      vin: power.vin,
      serial_no: power.sn || '',
      // v2 uses the 'vender' typo; provide both spellings
      vender: power.vendor || '',
      vendor: power.vendor || ''
    }
  }

  /**
   * Convert V3 response code to the closest V2 code
   */
  _convertV3CodeToV2 (v3Code) {
    const codeMap = {
      [RESPONSE_CODES_V3.SUCCESS]: 131, // Command OK
      [RESPONSE_CODES_V3.FAIL]: 132, // Command error
      [RESPONSE_CODES_V3.INVALID_COMMAND]: 14, // Invalid API command or data
      [RESPONSE_CODES_V3.PARAM_NULL]: 23, // Invalid JSON message
      [RESPONSE_CODES_V3.NO_PERMISSION]: 45 // Permission denied
    }
    return codeMap[v3Code] ?? v3Code
  }

  /**
   * Get salt info (v3 tokens are generated per-command from the salt)
   * @returns {{salt: string}|undefined}
   */
  getTokenInfo () {
    if (!this.salt) return undefined
    return { salt: this.salt }
  }

  /**
   * Generate token info for a specific command (for external use)
   * @param {string} command
   * @returns {{token: string, key: Object, salt: string, ts: number}|undefined}
   */
  generateTokenInfo (command) {
    if (!this.salt) return undefined
    const ts = Math.floor(Date.now() / 1000)
    const { token, key } = this._generateToken(command, ts)
    return { token, key, salt: this.salt, ts }
  }

  /**
   * Clear the current salt
   */
  clearToken () {
    this.salt = undefined
  }
}

module.exports = WMApiV3
