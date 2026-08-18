'use strict'

const test = require('brittle')
const WrkMinerRack = require('../../workers/lib/worker-base')

function makeCtx (minerConf = {}) {
  const ctx = { conf: { thing: { miner: minerConf } } }
  ctx._getThingCredentials = WrkMinerRack.prototype._getThingCredentials.bind(ctx)
  return ctx
}

test('_getThingCredentials prefers thing opts over config defaults', (t) => {
  const ctx = makeCtx({ defaultUsername: 'confuser', defaultPassword: 'confpass' })
  const thg = { opts: { username: 'optsuser', password: 'optspass' } }
  t.alike(ctx._getThingCredentials(thg), { username: 'optsuser', password: 'optspass' })
})

test('_getThingCredentials falls back to config defaults when opts are missing', (t) => {
  const ctx = makeCtx({ defaultUsername: 'confuser', defaultPassword: 'confpass' })
  const thg = { opts: {} }
  t.alike(ctx._getThingCredentials(thg), { username: 'confuser', password: 'confpass' })
})

test('_getThingCredentials mixes opts and defaults per field', (t) => {
  const ctx = makeCtx({ defaultUsername: 'confuser', defaultPassword: 'confpass' })
  const thg = { opts: { password: 'optspass' } }
  t.alike(ctx._getThingCredentials(thg), { username: 'confuser', password: 'optspass' })
})

test('_getThingCredentials returns undefined when neither opts nor defaults are set', (t) => {
  const ctx = makeCtx()
  const thg = { opts: {} }
  t.alike(ctx._getThingCredentials(thg), { username: undefined, password: undefined })
})

test('_getThingCredentials handles missing miner conf section', (t) => {
  const ctx = { conf: { thing: {} } }
  ctx._getThingCredentials = WrkMinerRack.prototype._getThingCredentials.bind(ctx)
  const thg = { opts: { password: 'p' } }
  t.alike(ctx._getThingCredentials(thg), { username: undefined, password: 'p' })
})
