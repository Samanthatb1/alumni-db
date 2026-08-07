import test from 'node:test'
import assert from 'node:assert/strict'

import { extract } from './heuristics.js'

test('does not treat a job title before Education as a company', () => {
  const snippet =
    'Example P. - Software Engineer — Software Engineer · Education: ' +
    'Santa Clara University · Location: San Francisco Bay Area · ' +
    "500+ connections on LinkedIn. View Example P.'s profile on LinkedIn ..."

  assert.deepEqual(
    extract(snippet, 'Example Person', 'Santa Clara University'),
    { company: '', position: '' },
  )
})

test('extracts company from a semicolon-formatted Experience snippet', () => {
  const snippet =
    'Sample Member - Founder, connecting everyone in the care ... — ' +
    'Experience ; Founder. CCN Health. May 2019 ; ' +
    'UC Berkeley Coding Bootcamp Instructor. University of California, Berkeley.'

  assert.deepEqual(
    extract(snippet, 'Sample Member', 'Boston University'),
    { company: 'CCN Health', position: 'Founder' },
  )
})

test('does not treat LinkedIn tenure text as a company', () => {
  const snippet =
    "Demo Member - Infra Engineer | hackNY '22 | I like servers — " +
    'Experience · Healthfirst Graphic. Infrastructure Engineer. Healthfirst. ' +
    'Sep 2024 - Present 1 year 11 months · Hunter College. 2 years · ' +
    'Hunter College Graphic ...'

  assert.deepEqual(
    extract(snippet, 'Demo Member', 'Hunter College'),
    { company: '', position: '' },
  )
})

test('does not treat an employer marked prev in a compound headline as current', () => {
  const snippet =
    'Example Member - Community member, prev: early eng at Example Corp — ' +
    'Experience · Example Corp Graphic. Staff Software Engineer. Example Corp. ' +
    '2022 - 2024 2 years.'

  assert.deepEqual(
    extract(snippet, 'Example Member', 'Example University'),
    { company: '', position: '' },
  )
})

test('extracts the current employer before a prev employment suffix', () => {
  const snippet =
    'Example Member - SWE @ Robinhood prev @ Meta — Software engineer building products.'

  assert.deepEqual(
    extract(snippet, 'Example Member', 'Example University'),
    { company: 'Robinhood', position: 'SWE' },
  )
})
