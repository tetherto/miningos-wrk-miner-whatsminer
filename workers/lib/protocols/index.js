'use strict'

const WMApiV2 = require('./v2-handler')
const WMApiV3 = require('./v3-handler')
const { API_VERSIONS, DEFAULT_API_VERSION, API_DEFAULTS } = require('./constants')

const HANDLERS = {
  [API_VERSIONS.V2]: WMApiV2,
  [API_VERSIONS.V3]: WMApiV3
}

/**
 * Factory for creating protocol handlers based on API version
 */
class ApiHandlerFactory {
  /**
   * Creates a protocol handler for the specified API version
   * @param {string} version - The API version ('2.0.5' or '3.0.3')
   * @param {Object} opts - Handler options (rpc, password, debugError, etc.)
   * @returns {WMApiV2|WMApiV3}
   */
  static create (version, opts) {
    const HandlerClass = HANDLERS[version]
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
    return Object.keys(HANDLERS)
  }

  /**
   * Gets the handler class for a specific version
   * @param {string} version
   * @returns {typeof WMApiV2|typeof WMApiV3}
   */
  static getHandlerClass (version) {
    return HANDLERS[version]
  }

  /**
   * Gets the default port for a specific API version
   * @param {string} version
   * @returns {number}
   */
  static getDefaultPort (version) {
    return API_DEFAULTS[version]?.port || API_DEFAULTS[DEFAULT_API_VERSION].port
  }

  /**
   * Checks if a version is supported
   * @param {string} version
   * @returns {boolean}
   */
  static isVersionSupported (version) {
    return version in HANDLERS
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
