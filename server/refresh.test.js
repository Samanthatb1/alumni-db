import test from 'node:test'
import assert from 'node:assert/strict'

import { applyCompanyOverride } from './refresh.js'

test('canonicalizes Netflix Inkubator as Netflix', () => {
  assert.equal(applyCompanyOverride('Netflix Inkubator'), 'Netflix')
  assert.equal(applyCompanyOverride('  netflix   inkubator  '), 'Netflix')
})
