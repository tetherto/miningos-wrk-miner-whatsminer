'use strict'

const net = require('net')
const fs = require('fs')
const path = require('path')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const debug = require('debug')('mock')
const { decryptCommand, encryptResponse } = require('./utils')
const MockControlAgent = require('./mock-control-agent')
const { promiseSleep } = require('@bitfinex/lib-js-util-promise')
const md5 = require('../workers/lib/utils/md5')

const MINER_TYPES = ['m63', 'm56s', 'm53s', 'm30sp', 'm30spp', 'm63spp']
const SALT = '5QAHiKMb'

/**
 * Generates encryption key from password (V2 - MD5 based).
 * The main port always speaks the v2 protocol (v3 firmware serves a
 * v2-compat API there); the v3 framed listener does not use this key.
 */
const generateEncryptionKey = (password) => {
  const key = md5.crypt(password, SALT)
  const arr = key.split('$')
  return arr[arr.length - 1]
}

/**
 * Finds the first existing path from a list of paths
 */
const findExistingPath = (paths) => {
  for (const p of paths) {
    const fullPath = path.resolve(__dirname, p) + '.js'
    if (fs.existsSync(fullPath)) {
      return p
    }
  }
  return null
}

/**
 * Sends an error response to the socket
 */
const sendErrorResponse = async (socket, code, msg, encryptionKey, isEncrypted, delay) => {
  const resp = {
    STATUS: 'E',
    When: +new Date(),
    Code: code,
    Msg: msg,
    Description: ''
  }

  if (delay) await promiseSleep(delay)

  if (isEncrypted) {
    socket.write(JSON.stringify(encryptResponse(resp, encryptionKey)))
  } else {
    socket.write(JSON.stringify(resp))
  }
  socket.destroy()
}

/**
 * Sends a response to the socket
 */
const sendResponse = async (socket, data, encryptionKey, isEncrypted, delay) => {
  if (delay) await promiseSleep(delay)

  if (isEncrypted) {
    socket.write(encryptResponse(data, encryptionKey))
  } else {
    socket.write(JSON.stringify(data))
  }
  socket.destroy()
}

/**
 * Two-phase download_logs response: JSON header, then raw binary.
 * CTX.dlFault injects wire-level failure modes for tests: coalesce,
 * split-json, truncate, truncate-once, slow, stall, empty, malformed.
 */
const sendDownloadLogsResponse = async (socket, res, binaryData, encryptionKey, isEncrypted, CTX) => {
  let fault = CTX.dlFault
  if (fault === 'truncate-once') {
    fault = CTX._dlFaultFired ? null : 'truncate'
    CTX._dlFaultFired = true
  }

  if (CTX.delay) await promiseSleep(CTX.delay)

  if (fault === 'empty') {
    if (res.Msg && typeof res.Msg === 'object') res.Msg.logfilelen = '0'
    if (res.msg && typeof res.msg === 'object') res.msg.logfilelen = '0'
    socket.end(isEncrypted ? encryptResponse(res, encryptionKey) : JSON.stringify(res))
    return
  }

  if (fault === 'malformed') {
    socket.end('THIS-IS-NOT-JSON{{{')
    return
  }

  const json = Buffer.from(isEncrypted ? encryptResponse(res, encryptionKey) : JSON.stringify(res))

  if (fault === 'coalesce') {
    socket.end(Buffer.concat([json, binaryData]))
    return
  }

  if (fault === 'split-json') {
    const mid = Math.floor(json.length / 2)
    socket.write(json.subarray(0, mid))
    await promiseSleep(5)
    socket.write(json.subarray(mid))
    await promiseSleep(10)
    socket.end(binaryData)
    return
  }

  socket.write(json)

  if (fault === 'stall') {
    return
  }

  await promiseSleep(10)

  if (fault === 'truncate') {
    socket.write(binaryData.subarray(0, Math.floor(binaryData.length / 2)))
    await promiseSleep(5)
    socket.destroy()
    return
  }

  if (fault === 'slow') {
    const chunk = Math.max(1, Math.ceil(binaryData.length / 4))
    for (let i = 0; i < binaryData.length; i += chunk) {
      socket.write(binaryData.subarray(i, i + chunk))
      await promiseSleep(150)
    }
    socket.end()
    return
  }

  // end() flushes the full payload; write() + destroy() truncates large payloads
  socket.end(binaryData)
}

/**
 * Validates token for encrypted commands
 */
const validateToken = (cmd, validTokens, hasPassword) => {
  if (!cmd.token) return false
  if (hasPassword) return true // Accept any non-empty token when password is provided
  return validTokens.has(cmd.token)
}

/**
 * Creates a mock control agent
 */
const createMockControlAgent = (things, mockControlPort) => {
  return new MockControlAgent({
    thgs: things,
    port: mockControlPort
  })
}

if (require.main === module) {
  const argv = yargs(hideBin(process.argv))
    .option('port', { alias: 'p', type: 'number', description: 'port to run on', default: 4028 })
    .option('host', { alias: 'h', type: 'string', description: 'host to run on', default: '127.0.0.1' })
    .option('type', { description: 'miner type', type: 'string' })
    .option('serial', { description: 'serial number', type: 'string', default: 'HHM38S98302B24K40073' })
    .option('mockControlPort', { description: 'mock control port port', type: 'number' })
    .option('delay', { description: 'delay in ms', type: 'number', default: 0 })
    .option('bulk', { description: 'bulk file', type: 'string' })
    .option('error', { description: 'send errored response', type: 'boolean', default: false })
    .option('minerpoolMockPort', { type: 'number', description: 'minerpool mock port', default: 8000 })
    .option('minerpoolMockHost', { type: 'string', description: 'minerpool mock host', default: '127.0.0.1' })
    .option('apiVersion', { description: 'API version (v2 or v3)', type: 'string', default: 'v2' })
    .option('v3Port', { description: 'port for the v3 API (length-prefixed framing); mirrors v3 firmware serving v2-compat on `port` and the v3 API here', type: 'number' })
    .parse()

  const things = argv.bulk ? JSON.parse(fs.readFileSync(argv.bulk)) : [argv]
  const agent = createMockControlAgent(things, argv.mockControlPort)
  agent.init(runServer)
} else {
  module.exports = {
    createServer ({ port, host, type, serial, password, apiVersion, v3Port, dlFault, dlLogSizeBytes }) {
      return runServer({ port, host, type, serial, password, apiVersion, v3Port, dlFault, dlLogSizeBytes })
    }
  }
}

function runServer (argv, ops = {}) {
  const apiVersion = argv.apiVersion || 'v2'
  const defaultPassword = apiVersion === 'v3' ? 'super' : 'admin'

  const CTX = {
    host: argv.host,
    port: argv.port,
    type: argv.type,
    serial: argv.serial,
    delay: argv.delay,
    error: argv.error,
    minerpoolMockPort: argv.minerpoolMockPort,
    minerpoolMockHost: argv.minerpoolMockHost,
    password: argv.password || defaultPassword,
    apiVersion,
    v3Port: argv.v3Port || null,
    dlFault: argv.dlFault || null,
    dlLogSizeBytes: argv.dlLogSizeBytes || null
  }

  const STATE = {}
  const validTokens = new Set()
  const encryptionKey = generateEncryptionKey(CTX.password)

  // Add validTokens to CTX so commands can add tokens
  CTX.validTokens = validTokens
  CTX.encryptionKey = encryptionKey

  if (!MINER_TYPES.includes(CTX.type?.toLowerCase())) {
    throw Error('ERR_UNSUPPORTED')
  }

  // Load initial state (model-specific takes priority over default)
  const statePaths = [`./initial_states/${CTX.type.toLowerCase()}`, './initial_states/default']
  const statePath = findExistingPath(statePaths)

  if (!statePath) {
    throw Error('ERR_INVALID_STATE')
  }

  try {
    debug(new Date(), `Loading initial state from ${statePath}`)
    Object.assign(STATE, require(statePath)(CTX))
  } catch (e) {
    throw Error('ERR_INVALID_STATE')
  }

  const processCmd = async (socket, chunk, socketCtx) => {
    const req = JSON.parse(chunk.toString())
    const id = req.ctx?.mockControl?.generateId()
    const isEncrypted = req.enc === 1
    let cmd

    // Handle encrypted commands
    if (isEncrypted) {
      try {
        cmd = decryptCommand(req, encryptionKey)
      } catch (e) {
        return sendErrorResponse(socket, 23, 'json cmd err', encryptionKey, true, CTX.delay)
      }

      if (!cmd) {
        return sendErrorResponse(socket, 135, 'check token err', encryptionKey, true, CTX.delay)
      }

      // Validate token
      if (!validateToken(cmd, validTokens, !!CTX.password)) {
        return sendErrorResponse(socket, 135, 'check token err', encryptionKey, true, CTX.delay)
      }

      // Store token for future validation
      if (cmd.token) {
        validTokens.add(cmd.token)
      }
    } else {
      cmd = req
    }

    // Find and execute command. The main port always speaks the v2 protocol —
    // real v3 firmware serves a v2-compat API here while the v3 API (framed)
    // lives on v3Port.
    const command = cmd.cmd || cmd.command || null
    const cmdPaths = [`./cmds/${command}`, `./cmds/${CTX.type}/${command}`]
    const cmdPath = findExistingPath(cmdPaths)

    if (!cmdPath) {
      return sendErrorResponse(socket, 14, 'invalid cmd', encryptionKey, isEncrypted, CTX.delay)
    }

    try {
      const res = require(cmdPath)(CTX, STATE.state, cmd, id)

      // If null, do nothing (reboot)
      if (res === null) {
        return
      }

      // Two-phase response: command handler attached raw bytes to send after the JSON
      if (res._binaryPayload) {
        const binaryData = res._binaryPayload
        delete res._binaryPayload
        await sendDownloadLogsResponse(socket, res, binaryData, encryptionKey, isEncrypted, CTX)
        return
      }

      // Firmware transfer: respond with "ready" and keep socket open to receive binary data
      if (res.__firmwareReady) {
        const readyResp = { STATUS: 'S', When: +new Date(), Code: 131, Msg: 'ready', Description: '' }
        if (isEncrypted) {
          socket.write(encryptResponse(readyResp, encryptionKey))
        } else {
          socket.write(JSON.stringify(readyResp))
        }
        socketCtx.firmwareMode = true
        socketCtx.isEncrypted = isEncrypted
        return
      }

      await sendResponse(socket, res, encryptionKey, isEncrypted, CTX.delay)
    } catch (e) {
      debug(new Date(), cmd, e)
      await sendErrorResponse(socket, 14, 'invalid cmd', encryptionKey, isEncrypted, CTX.delay)
    }
  }

  // --- V3 API server (length-prefixed JSON framing, official v3 protocol) ---

  const writeFramed = (socket, obj) => {
    const body = Buffer.from(JSON.stringify(obj), 'utf8')
    const len = Buffer.alloc(4)
    len.writeUInt32LE(body.length, 0)
    socket.write(Buffer.concat([len, body]))
  }

  const v3Error = (code, msg, desc) => ({ code, when: Math.floor(Date.now() / 1000), msg, desc })

  const processV3Cmd = async (socket, req) => {
    const command = req.cmd || null
    const cmdPath = command && findExistingPath([`./cmds-v3/${command}`, `./cmds-v3/${CTX.type}/${command}`])

    if (!cmdPath) {
      return writeFramed(socket, v3Error(-2, 'invalid command', command || ''))
    }

    try {
      const res = require(cmdPath)(CTX, STATE.state, req)

      if (res === null) return // e.g. reboot: no response

      if (CTX.delay) await promiseSleep(CTX.delay)

      // Two-phase response (get.log.download): framed JSON header then raw bytes
      if (res._binaryPayload) {
        const binaryData = res._binaryPayload
        delete res._binaryPayload
        writeFramed(socket, res)
        await promiseSleep(10)
        socket.end(binaryData)
        return
      }

      writeFramed(socket, res)
    } catch (e) {
      debug(new Date(), req, e)
      writeFramed(socket, v3Error(-1, 'command failed', command || ''))
    }
  }

  let v3Server = null
  if (CTX.v3Port) {
    v3Server = new net.Server()
    v3Server.listen(CTX.v3Port, argv.host, function () {
      debug(new Date(), `V3 server listening on ${argv.host}:${CTX.v3Port}`)
    })
    v3Server.on('connection', (socket) => {
      let buf = Buffer.alloc(0)
      socket.on('error', () => {})
      socket.on('data', async (chunk) => {
        buf = Buffer.concat([buf, chunk])
        while (buf.length >= 4) {
          const len = buf.readUInt32LE(0)
          if (buf.length < 4 + len) return
          const body = buf.subarray(4, 4 + len)
          buf = buf.subarray(4 + len)
          let req
          try {
            req = JSON.parse(body.toString('utf8'))
          } catch (e) {
            return writeFramed(socket, v3Error(-2, 'invalid json', ''))
          }
          await processV3Cmd(socket, req)
        }
      })
    })
  }

  const server = new net.Server()

  server.listen(argv.port, argv.host, function () {
    debug(new Date(), `Server listening for connection requests on socket ${argv.host}:${argv.port}`)
  })

  server.on('close', STATE.cleanup)
  server.on('connection', function (socket) {
    debug(new Date(), 'Connection from ' + socket.remoteAddress + ':' + socket.remotePort)

    const socketCtx = { firmwareMode: false, isEncrypted: false, buffer: Buffer.alloc(0), expectedSize: null }

    socket.on('data', async function (chunk) {
      if (socketCtx.firmwareMode) {
        socketCtx.buffer = Buffer.concat([socketCtx.buffer, chunk])

        if (socketCtx.expectedSize === null && socketCtx.buffer.length >= 4) {
          socketCtx.expectedSize = socketCtx.buffer.readInt32LE(0)
          socketCtx.buffer = socketCtx.buffer.subarray(4)
        }

        if (socketCtx.expectedSize !== null && socketCtx.buffer.length >= socketCtx.expectedSize) {
          socketCtx.firmwareMode = false
          const resp = { STATUS: 'S', When: +new Date(), Code: 131, Msg: 'Updated', Description: '' }
          await sendResponse(socket, resp, encryptionKey, socketCtx.isEncrypted, CTX.delay)
        }
        return
      }

      await processCmd(socket, chunk, socketCtx)
    })
  })

  return {
    state: STATE.state,
    exit: () => {
      server.close()
      if (v3Server) v3Server.close()
    },
    start: () => {
      // if server isn't started
      if (!server.listening) {
        server.listen(argv.port, argv.host, () => {
          debug(`Server listening on socket ${argv.host}:${argv.port}`)
        })
      }
      if (v3Server && !v3Server.listening) {
        v3Server.listen(CTX.v3Port, argv.host)
      }
    },
    stop: () => {
      // if server is started
      if (server.listening) {
        server.close()
      }
      if (v3Server && v3Server.listening) {
        v3Server.close()
      }
    },
    reset: () => {
      return STATE.cleanup()
    },
    setDlFault: (fault) => {
      CTX.dlFault = fault
      CTX._dlFaultFired = false
    }
  }
}
