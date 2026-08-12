import test from 'node:test'
import assert from 'node:assert/strict'

import { applyCompanyOverride } from './refresh.js'

test('canonicalizes Netflix Inkubator as Netflix', () => {
  assert.equal(applyCompanyOverride('Netflix Inkubator'), 'Netflix')
  assert.equal(applyCompanyOverride('  netflix   inkubator  '), 'Netflix')
})

test('canonicalizes Microsoft AI as Microsoft', () => {
  assert.equal(applyCompanyOverride('Microsoft AI'), 'Microsoft')
  assert.equal(applyCompanyOverride('  microsoft   ai  '), 'Microsoft')
})

test('canonicalizes Cognition Graphic as Cognition', () => {
  assert.equal(applyCompanyOverride('Cognition Graphic'), 'Cognition')
})

test('does not invent SkyLink from a member\'s prose headline', () => {
  assert.equal(applyCompanyOverride('sky using computers'), 'sky using computers')
})
