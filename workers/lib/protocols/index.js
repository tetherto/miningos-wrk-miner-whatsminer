'use strict'

const WMApiV2 = require('./wm-api-v2')
const WMApiV3 = require('./wm-api-v3')
const { API_VERSIONS, DEFAULT_API_VERSION, API_DEFAULTS } = require('./constants')

// Map major versions to handlers
const HANDLERS = {
  2: WMApiV2,
  3: WMApiV3
}

// Map major versions to canonical version strings
const MAJOR_TO_CANONICAL = {
  2: API_VERSIONS.V2,
  3: API_VERSIONS.V3
}

/**
 * Factory for creating protocol handlers based on API version
 */
class ApiHandlerFactory {
  /**
   * Extracts major version number from version string
   * @param {string} version - Version string like '2.0.5', '2.2.2', '3.0.3'
   * @returns {number|null} Major version number or null if invalid
   */
  static getMajorVersion (version) {
    if (!version || typeof version !== 'string') return null
    const match = version.match(/^(\d+)/)
    return match ? parseInt(match[1], 10) : null
  }

  /**
   * Normalizes any version string to canonical version (2.0.5 or 3.0.3)
   * @param {string} version - Any version string like '2.2.2', '3.1.0'
   * @returns {string} Canonical version string
   */
  static normalizeVersion (version) {
    const major = ApiHandlerFactory.getMajorVersion(version)
    return MAJOR_TO_CANONICAL[major] || DEFAULT_API_VERSION
  }

  /**
   * Creates a protocol handler for the specified API version
   * @param {string} version - The API version (e.g., '2.0.5', '2.2.2', '3.0.3')
   * @param {Object} opts - Handler options (rpc, password, debugError, etc.)
   * @returns {WMApiV2|WMApiV3}
   */
  static create (version, opts) {
    const major = ApiHandlerFactory.getMajorVersion(version)
    const HandlerClass = HANDLERS[major]
    if (!HandlerClass) {
      throw new Error(`ERR_UNSUPPORTED_API_VERSION: ${version}`)
    }
    return new HandlerClass(opts)
  }

  /**
   * Returns list of supported API versions
   * @returns {string[]}
   */
  static getSupportedVersions () {
    return Object.values(MAJOR_TO_CANONICAL)
  }

  /**
   * Gets the handler class for a specific version
   * @param {string} version
   * @returns {typeof WMApiV2|typeof WMApiV3}
   */
  static getHandlerClass (version) {
    const major = ApiHandlerFactory.getMajorVersion(version)
    return HANDLERS[major]
  }

  /**
   * Gets the default port for a specific API version
   * @param {string} version
   * @returns {number}
   */
  static getDefaultPort (version) {
    const canonical = ApiHandlerFactory.normalizeVersion(version)
    return API_DEFAULTS[canonical]?.port || API_DEFAULTS[DEFAULT_API_VERSION].port
  }

  /**
   * Checks if a version is supported
   * @param {string} version
   * @returns {boolean}
   */
  static isVersionSupported (version) {
    const major = ApiHandlerFactory.getMajorVersion(version)
    return major in HANDLERS
  }
}

module.exports = {
  ApiHandlerFactory,
  WMApiV2,
  WMApiV3,
  API_VERSIONS,
  DEFAULT_API_VERSION,
  API_DEFAULTS
}
