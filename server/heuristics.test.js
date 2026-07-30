import test from 'node:test'
import assert from 'node:assert/strict'

import { extract } from './heuristics.js'

test('does not treat a job title before Education as a company', () => {
  const snippet =
    'Tania P. - Software Engineer — Software Engineer · Education: ' +
    'Santa Clara University · Location: San Francisco Bay Area · ' +
    "500+ connections on LinkedIn. View Tania P.'s profile on LinkedIn ..."

  assert.deepEqual(
    extract(snippet, 'Tania Pham', 'Santa Clara University'),
    { company: '', position: '' },
  )
})
