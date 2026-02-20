'use strict'

const ApiV2Handler = require('./v2-handler')
const ApiV3Handler = require('./v3-handler')
const { API_VERSIONS, API_DEFAULTS } = require('./constants')

const HANDLERS = {
  [API_VERSIONS.V2]: ApiV2Handler,
  [API_VERSIONS.V3]: ApiV3Handler
}

/**
 * Factory for creating protocol handlers based on API version
 */
class ApiHandlerFactory {
  /**
   * Creates a protocol handler for the specified API version
   * @param {string} version - The API version ('2.0.5' or '3.0.3')
   * @param {Object} opts - Handler options (rpc, password, debugError, etc.)
   * @returns {ApiV2Handler|ApiV3Handler}
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
   * @returns {typeof ApiV2Handler|typeof ApiV3Handler}
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
    return API_DEFAULTS[version]?.port || API_DEFAULTS[API_VERSIONS.V2].port
  }

  /**
   * Gets the default password for a specific API version
   * @param {string} version
   * @returns {string}
   */
  static getDefaultPassword (version) {
    return API_DEFAULTS[version]?.password || API_DEFAULTS[API_VERSIONS.V2].password
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
  ApiV2Handler,
  ApiV3Handler,
  API_VERSIONS,
  API_DEFAULTS
}
