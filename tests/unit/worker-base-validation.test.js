'use strict'

const test = require('brittle')
const WrkMinerRack = require('../../workers/lib/worker-base')

function createMockWorker () {
  const worker = Object.create(WrkMinerRack.prototype)
  worker.mem = { things: {} }
  worker.conf = { thing: {} }
  return worker
}

test('worker-base: _validateMacAddress rejects malformed values', (t) => {
  const worker = createMockWorker()
  const badMacs = [
    'AA:BB:CC:DD:EE',
    'AA:BB:CC:DD:EE:FF:00',
    'AABBCCDDEEFF',
    'AA:BB:CC:DD:EE:GG',
    'AA.BB.CC.DD.EE.FF',
    ' AA:BB:CC:DD:EE:FF',
    123
  ]
  for (const macAddress of badMacs) {
    t.exception(
      () => worker._validateMacAddress({ info: { macAddress } }),
      /ERR_THING_MACADDRESS_INVALID/,
      `rejects "${macAddress}"`
    )
  }
})

test('worker-base: _validateMacAddress rejects multicast addresses', (t) => {
  const worker = createMockWorker()
  const multicastMacs = ['01:00:5E:00:00:01', '33:33:00:00:00:01', 'ff:ff:ff:ff:ff:ff', '0B:AA:BB:CC:DD:EE']
  for (const macAddress of multicastMacs) {
    t.exception(
      () => worker._validateMacAddress({ info: { macAddress } }),
      /ERR_THING_MACADDRESS_MULTICAST/,
      `rejects "${macAddress}"`
    )
  }
})

test('worker-base: _validateMacAddress accepts valid unicast addresses', (t) => {
  const worker = createMockWorker()
  const validMacs = ['00:1A:2B:3C:4D:5E', 'aa:bb:cc:dd:ee:ff', 'AA-BB-CC-DD-EE-FF', '02:00:00:00:00:01']
  for (const macAddress of validMacs) {
    t.execution(
      () => worker._validateMacAddress({ info: { macAddress } }),
      `accepts "${macAddress}"`
    )
  }
})

test('worker-base: _validateMacAddress noops when macAddress is absent or empty', (t) => {
  const worker = createMockWorker()
  t.execution(() => worker._validateMacAddress({ info: { serialNum: 'SN1' } }))
  t.execution(() => worker._validateMacAddress({ info: { macAddress: null } }))
  t.execution(() => worker._validateMacAddress({ info: { macAddress: '' } }))
  t.execution(() => worker._validateMacAddress({}))
})

test('worker-base: _validateRegisterThing rejects invalid macAddress', (t) => {
  const worker = createMockWorker()
  t.exception(
    () => worker._validateRegisterThing({ opts: { address: '10.0.0.1' }, info: { macAddress: 'not-a-mac' } }),
    /ERR_THING_MACADDRESS_INVALID/
  )
  t.exception(
    () => worker._validateRegisterThing({ opts: { address: '10.0.0.1' }, info: { macAddress: '01:00:5E:00:00:01' } }),
    /ERR_THING_MACADDRESS_MULTICAST/
  )
  t.execution(
    () => worker._validateRegisterThing({ opts: { address: '10.0.0.1' }, info: { macAddress: '00:1A:2B:3C:4D:5E' } })
  )
})

test('worker-base: _validateUpdateThing rejects invalid macAddress', (t) => {
  const worker = createMockWorker()
  worker.mem.things = {
    m1: { id: 'm1', info: { serialNum: 'SN1' } }
  }

  t.exception(
    () => worker._validateUpdateThing({ id: 'm1', info: { macAddress: 'not-a-mac' } }),
    /ERR_THING_MACADDRESS_INVALID/
  )
  t.exception(
    () => worker._validateUpdateThing({ id: 'm1', info: { macAddress: '33:33:00:00:00:01' } }),
    /ERR_THING_MACADDRESS_MULTICAST/
  )
  t.execution(
    () => worker._validateUpdateThing({ id: 'm1', info: { macAddress: '00:1A:2B:3C:4D:5E' } })
  )
})
