import test from 'node:test'
import assert from 'node:assert/strict'

import { SnippetSearcher, buildQueries } from './snippets.js'

test('searches the exact LinkedIn Experience section first', () => {
  assert.deepEqual(
    buildQueries({
      name: 'Tal Safran',
      linkedin_url: 'http://linkedin.com/in/talsafran',
      university: 'New York University',
    }),
    [
      'site:linkedin.com/in/talsafran "Experience"',
      'site:linkedin.com/in/talsafran "Tal Safran"',
    ],
  )
})

test('stops after the Experience query yields a parseable company', async () => {
  const queries = []
  const searcher = new SnippetSearcher('serper-key', {
    minIntervalMs: 0,
    fetchImpl: async (_url, options) => {
      const query = JSON.parse(options.body).q
      queries.push(query)
      return Response.json({
        organic: [{
          link: 'https://www.linkedin.com/in/alex-wheeler-233b89a8',
          title: 'Alex Wheeler - Founder, connecting everyone in the care ...',
          snippet: 'Experience ; Founder. CCN Health. May 2019 ; Software Engineer. VTS, Inc.',
        }],
      })
    },
  })

  const snippet = await searcher.findSnippet({
    name: 'Alex Wheeler',
    university: 'Boston University',
    linkedin_url: 'https://www.linkedin.com/in/alex-wheeler-233b89a8/',
  })

  assert.match(snippet, /CCN Health/)
  assert.deepEqual(queries, [
    'site:linkedin.com/in/alex-wheeler-233b89a8 "Experience"',
  ])
})

test('uses a broader query when the Experience snippet is not parseable', async () => {
  const queries = []
  const searcher = new SnippetSearcher('serper-key', {
    minIntervalMs: 0,
    fetchImpl: async (_url, options) => {
      const query = JSON.parse(options.body).q
      queries.push(query)
      const snippet = queries.length === 1
        ? 'Experience and education are available on LinkedIn.'
        : 'Software Engineer at Example Corp.'
      return Response.json({
        organic: [{
          link: 'https://www.linkedin.com/in/talsafran',
          title: queries.length === 1
            ? 'Tal Safran - Software Engineer | LinkedIn'
            : 'Tal Safran - Software Engineer at Example Corp. | LinkedIn',
          snippet,
        }],
      })
    },
  })

  const snippet = await searcher.findSnippet({
    name: 'Tal Safran',
    university: 'New York University',
    linkedin_url: 'https://www.linkedin.com/in/talsafran',
  })

  assert.match(snippet, /Example Corp/)
  assert.equal(queries.length, 2)
})

test('falls back to Context.dev after Serper credits are exhausted', async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    if (url.includes('serper.dev')) {
      return new Response(
        JSON.stringify({ message: 'Not enough credits', statusCode: 400 }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return Response.json({
      results: [
        {
          url: 'https://www.linkedin.com/in/talsafran',
          title: 'Tal Safran - LinkedIn',
          description: 'Engineering leader · Experience: Example Co',
        },
      ],
    })
  }

  const searcher = new SnippetSearcher('serper-key', {
    contextApiKey: 'context-key',
    fetchImpl,
    minIntervalMs: 0,
    maxRetries: 0,
  })

  assert.deepEqual(await searcher.search('"Tal Safran" LinkedIn'), [
    {
      link: 'https://www.linkedin.com/in/talsafran',
      title: 'Tal Safran - LinkedIn',
      snippet: 'Engineering leader · Experience: Example Co',
    },
  ])

  assert.equal(calls.length, 2)
  assert.match(calls[0].url, /serper/)
  assert.match(calls[1].url, /context\.dev/)
  assert.equal(calls[1].options.headers.Authorization, 'Bearer context-key')
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    query: '"Tal Safran" LinkedIn',
    numResults: 10,
    includeDomains: ['linkedin.com'],
    country: 'us',
    queryFanout: false,
    markdownOptions: { enabled: false },
  })
})

test('keeps using Context.dev after Serper exhaustion is detected', async () => {
  const urls = []
  const fetchImpl = async (url) => {
    urls.push(url)
    if (url.includes('serper.dev')) {
      return new Response('Not enough credits', { status: 400 })
    }
    return Response.json({ results: [] })
  }

  const searcher = new SnippetSearcher('serper-key', {
    contextApiKey: 'context-key',
    fetchImpl,
    minIntervalMs: 0,
    maxRetries: 0,
  })

  await searcher.search('first query')
  await searcher.search('second query')

  assert.equal(urls.filter((url) => url.includes('serper.dev')).length, 1)
  assert.equal(urls.filter((url) => url.includes('context.dev')).length, 2)
})
