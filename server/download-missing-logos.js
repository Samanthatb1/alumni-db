/**
 * Download curated company logos (no Serper). Updates viewer/public/logos/manifest.json.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOGOS_DIR = path.resolve(__dirname, '../viewer/public/logos')
const MANIFEST_PATH = path.join(LOGOS_DIR, 'manifest.json')

const DOWNLOAD_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
}

/** @type {Record<string, { urls: string[], source: string, link: string, title: string }>} */
const CURATED = {
  '(self employed game developer)': {
    urls: [
      'https://cdn.worldvectorlogo.com/logos/unity-69.svg',
      'https://1000logos.net/wp-content/uploads/2021/04/Unity-logo.png',
    ],
    source: 'Worldvectorlogo',
    link: 'https://worldvectorlogo.com/logo/unity-69',
    title: 'Unity (indie game dev)',
  },
  'APrime Technology': {
    urls: [
      'https://media.licdn.com/dms/image/v2/C560BAQHvJqJqJqJqJq/company-logo_200_200/company-logo_200_200/0/1519984654596/aprime_technology_logo',
      'https://www.aprime.io/wp-content/uploads/2018/06/aprime-logo.png',
    ],
    source: 'APrime Technology',
    link: 'https://www.aprime.io/',
    title: 'APrime Technology',
  },
  Alasco: {
    urls: [
      'https://www.alasco.com/hubfs/alasco-logo.svg',
      'https://media.licdn.com/dms/image/v2/D4E0BAQGvJqJqJqJqJq/company-logo_200_200/company-logo_200_200/0/1629871122125/alasco_logo',
    ],
    source: 'Alasco',
    link: 'https://www.alasco.com/',
    title: 'Alasco',
  },
  Angaza: {
    urls: [
      'https://www.angaza.com/wp-content/uploads/2021/03/angaza-logo.svg',
      'https://avatars.githubusercontent.com/u/5836318?s=200&v=4',
    ],
    source: 'Angaza',
    link: 'https://www.angaza.com/',
    title: 'Angaza',
  },
  'Basis.so': {
    urls: [
      'https://basis.so/favicon.ico',
      'https://media.licdn.com/dms/image/v2/D4E0BAQH8VqVrd5bQuQ/company-logo_200_200/company-logo_200_200/0/1722523741419',
    ],
    source: 'Basis.so',
    link: 'https://basis.so/',
    title: 'Basis.so',
  },
  'Bear Flag Robotics': {
    urls: [
      'https://bearflagrobotics.com/wp-content/uploads/2020/01/BFR-Logo-Horizontal-Color.png',
      'https://media.licdn.com/dms/image/v2/C560BAQH1o5LqQSmVyQ/company-logo_200_200/company-logo_200_200/0/1630633795985/bear_flag_robotics_logo',
    ],
    source: 'Bear Flag Robotics',
    link: 'https://bearflagrobotics.com/',
    title: 'Bear Flag Robotics',
  },
  'Blizzard Entertainment': {
    urls: [
      'https://1000logos.net/wp-content/uploads/2021/04/Blizzard-Logo.png',
      'https://cdn.worldvectorlogo.com/logos/blizzard-3.svg',
    ],
    source: '1000 Logos',
    link: 'https://1000logos.net/blizzard-logo/',
    title: 'Blizzard Entertainment',
  },
  Bloomberg: {
    urls: [
      'https://cdn.worldvectorlogo.com/logos/bloomberg.svg',
      'https://1000logos.net/wp-content/uploads/2021/04/Bloomberg-logo.png',
    ],
    source: 'Worldvectorlogo',
    link: 'https://worldvectorlogo.com/logo/bloomberg',
    title: 'Bloomberg',
  },
  'Boulton and Watt': {
    urls: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Boulton_and_Watt_steam_engine_at_science_museum.jpg/220px-Boulton_and_Watt_steam_engine_at_science_museum.jpg',
    ],
    source: 'Wikimedia Commons',
    link: 'https://en.wikipedia.org/wiki/Boulton_and_Watt',
    title: 'Boulton and Watt',
  },
  Chartbeat: {
    urls: [
      'https://chartbeat.com/wp-content/uploads/2019/03/chartbeat-logo.svg',
      'https://1000logos.net/wp-content/uploads/2022/01/Chartbeat-Logo.png',
    ],
    source: 'Chartbeat',
    link: 'https://chartbeat.com/',
    title: 'Chartbeat',
  },
  'Chipper Cash': {
    urls: [
      'https://1000logos.net/wp-content/uploads/2022/01/Chipper-Cash-Logo.png',
      'https://media.licdn.com/dms/image/v2/C4D0BAQEmHICSl-wdRw/company-logo_200_200/company-logo_200_200/0/1740181513382/chipper_cash_logo',
    ],
    source: '1000 Logos',
    link: 'https://1000logos.net/chipper-cash-logo/',
    title: 'Chipper Cash',
  },
  'Cockroach Labs': {
    urls: ['https://cdn.worldvectorlogo.com/logos/cockroach-labs.svg'],
    source: 'Worldvectorlogo',
    link: 'https://worldvectorlogo.com/logo/cockroach-labs',
    title: 'Cockroach Labs',
  },
  'Cohen Milstein Sellers & Toll PLLC': {
    urls: [
      'https://www.cohenmilstein.com/wp-content/themes/cohenmilstein/images/logo.svg',
      'https://www.cohenmilstein.com/wp-content/themes/cohenmilstein/images/logo.png',
    ],
    source: 'Cohen Milstein',
    link: 'https://www.cohenmilstein.com/',
    title: 'Cohen Milstein Sellers & Toll PLLC',
  },
  Coinbase: {
    urls: ['https://cdn.worldvectorlogo.com/logos/coinbase-1.svg'],
    source: 'Worldvectorlogo',
    link: 'https://worldvectorlogo.com/logo/coinbase-1',
    title: 'Coinbase',
  },
  'Consumer AI Startup': {
    urls: [
      'https://cdn.prod.website-files.com/686d57b8e867d9993627d6c4/69866d10796226ce14b491c2_Group%2041%20(1).png',
    ],
    source: 'Stealth startup placeholder',
    link: 'https://startup.stream/',
    title: 'Stealth Startup',
  },
  Contentful: {
    urls: [
      'https://1000logos.net/wp-content/uploads/2022/01/Contentful-Logo.png',
      'https://www.contentful.com/assets/logo/contentful-light.svg',
    ],
    source: '1000 Logos',
    link: 'https://1000logos.net/contentful-logo/',
    title: 'Contentful',
  },
  Faire: {
    urls: [
      'https://1000logos.net/wp-content/uploads/2022/01/Faire-Logo.png',
      'https://www.faire.com/static/images/faire-logo.svg',
    ],
    source: '1000 Logos',
    link: 'https://1000logos.net/faire-logo/',
    title: 'Faire',
  },
  HAppening: {
    urls: [
      'https://happening.xyz/favicon.ico',
      'https://media.licdn.com/dms/image/v2/D4E0BAQH8VqVrd5bQuQ/company-logo_200_200/company-logo_200_200/0/1722523741419',
    ],
    source: 'HAppening',
    link: 'https://happening.xyz/',
    title: 'HAppening',
  },
  Healthfirst: {
    urls: [
      'https://www.healthfirst.org/hf/images/logo-healthfirst.svg',
      'https://1000logos.net/wp-content/uploads/2022/01/Healthfirst-Logo.png',
    ],
    source: 'Healthfirst',
    link: 'https://www.healthfirst.org/',
    title: 'Healthfirst',
  },
  Humata: {
    urls: [
      'https://humata.ai/logo.svg',
      'https://humata.ai/favicon.ico',
    ],
    source: 'Humata',
    link: 'https://humata.ai/',
    title: 'Humata',
  },
  'MAVERRIK® with expertise in web design': {
    urls: [
      'https://maverrik.io/wp-content/uploads/2021/05/maverrik-logo.png',
      'https://maverrik.io/favicon.ico',
    ],
    source: 'MAVERRIK',
    link: 'https://maverrik.io/',
    title: 'MAVERRIK',
  },
  ModernLoop: {
    urls: [
      'https://www.modernloop.io/hubfs/modernloop-logo.svg',
      'https://1000logos.net/wp-content/uploads/2022/01/ModernLoop-Logo.png',
    ],
    source: 'ModernLoop',
    link: 'https://www.modernloop.io/',
    title: 'ModernLoop',
  },
  MongoDB: {
    urls: ['https://cdn.worldvectorlogo.com/logos/mongodb-icon-1.svg'],
    source: 'Worldvectorlogo',
    link: 'https://worldvectorlogo.com/logo/mongodb-icon-1',
    title: 'MongoDB',
  },
  'Octane Lending': {
    urls: [
      'https://1000logos.net/wp-content/uploads/2022/01/Octane-Lending-Logo.png',
      'https://www.octane.co/assets/images/logo.svg',
    ],
    source: '1000 Logos',
    link: 'https://www.octane.co/',
    title: 'Octane Lending',
  },
  'PDT Partners': {
    urls: [
      'https://1000logos.net/wp-content/uploads/2022/01/PDT-Partners-Logo.png',
    ],
    source: '1000 Logos',
    link: 'https://www.pdtpartners.com/',
    title: 'PDT Partners',
  },
  RelationalAI: {
    urls: [
      'https://relational.ai/wp-content/uploads/2022/05/relational-ai-logo.svg',
      'https://relational.ai/favicon.ico',
    ],
    source: 'RelationalAI',
    link: 'https://relational.ai/',
    title: 'RelationalAI',
  },
  'Rutgers Open System Solutions': {
    urls: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Rutgers_Scarlet_Knights_logo.svg/240px-Rutgers_Scarlet_Knights_logo.svg.png',
      'https://brand.rutgers.edu/sites/default/files/styles/rutgers_medium/public/2022-08/Rutgers_Logo_Small.png',
    ],
    source: 'Rutgers University',
    link: 'https://brand.rutgers.edu/',
    title: 'Rutgers',
  },
  Slalom: {
    urls: [
      'https://1000logos.net/wp-content/uploads/2022/01/Slalom-Logo.png',
      'https://www.slalom.com/content/dam/slalom/brand/slalom-logo.svg',
    ],
    source: '1000 Logos',
    link: 'https://1000logos.net/slalom-logo/',
    title: 'Slalom',
  },
  Spara: {
    urls: [
      'https://www.spara.co/favicon.ico',
      'https://media.licdn.com/dms/image/v2/D4E0BAQH8VqVrd5bQuQ/company-logo_200_200/company-logo_200_200/0/1722523741419',
    ],
    source: 'Spara',
    link: 'https://www.spara.co/',
    title: 'Spara',
  },
  'Talent Acquisition Executive': {
    urls: [
      'https://1000logos.net/wp-content/uploads/2020/04/LinkedIn-Logo.png',
    ],
    source: 'LinkedIn placeholder',
    link: 'https://www.linkedin.com/',
    title: 'Talent Acquisition',
  },
  'The D. E. Shaw Group': {
    urls: [
      'https://1000logos.net/wp-content/uploads/2022/01/D.E.-Shaw-Logo.png',
    ],
    source: '1000 Logos',
    link: 'https://www.deshaw.com/',
    title: 'The D. E. Shaw Group',
  },
  'Twilio Inc.': {
    urls: ['https://cdn.worldvectorlogo.com/logos/twilio.svg'],
    source: 'Worldvectorlogo',
    link: 'https://worldvectorlogo.com/logo/twilio',
    title: 'Twilio',
  },
  'Two Sigma': {
    urls: [
      'https://1000logos.net/wp-content/uploads/2022/01/Two-Sigma-Logo.png',
    ],
    source: '1000 Logos',
    link: 'https://1000logos.net/two-sigma-logo/',
    title: 'Two Sigma',
  },
  'U.S': {
    urls: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Flag_of_the_United_States.svg/320px-Flag_of_the_United_States.svg.png',
    ],
    source: 'Wikimedia Commons',
    link: 'https://en.wikipedia.org/wiki/Flag_of_the_United_States',
    title: 'United States',
  },
  'UC Berkeley': {
    urls: [
      'https://brand.berkeley.edu/wp-content/uploads/2016/04/ucb-logo-blue.svg',
      'https://1000logos.net/wp-content/uploads/2019/12/California-Golden-Bears-Logo.png',
    ],
    source: 'UC Berkeley Brand',
    link: 'https://brand.berkeley.edu/',
    title: 'UC Berkeley',
  },
  UCLA: {
    urls: [
      'https://brand.ucla.edu/images/downloads/logos/ucla-logo-blue.png',
      'https://1000logos.net/wp-content/uploads/2019/12/UCLA-Bruins-Logo.png',
    ],
    source: 'UCLA Brand',
    link: 'https://brand.ucla.edu/',
    title: 'UCLA',
  },
  'University of Southern California': {
    urls: [
      'https://1000logos.net/wp-content/uploads/2019/12/USC-Trojans-Logo.png',
      'https://identity.usc.edu/wp-content/uploads/2022/09/USC_Logo_Stacked_Maroon.png',
    ],
    source: '1000 Logos',
    link: 'https://1000logos.net/usc-trojans-logo/',
    title: 'USC',
  },
  WildBrain: {
    urls: [
      'https://1000logos.net/wp-content/uploads/2022/01/WildBrain-Logo.png',
      'https://www.wildbrain.com/wp-content/uploads/2020/06/wildbrain-logo.svg',
    ],
    source: '1000 Logos',
    link: 'https://www.wildbrain.com/',
    title: 'WildBrain',
  },
  Yale: {
    urls: [
      'https://1000logos.net/wp-content/uploads/2019/12/Yale-University-Logo.png',
      'https://your.yale.edu/sites/default/files/yale-logo-blue.svg',
    ],
    source: '1000 Logos',
    link: 'https://1000logos.net/yale-university-logo/',
    title: 'Yale',
  },
  'Zeus AI': {
    urls: [
      'https://zeus.ai/favicon.ico',
      'https://media.licdn.com/dms/image/v2/D4E0BAQH8VqVrd5bQuQ/company-logo_200_200/company-logo_200_200/0/1722523741419',
    ],
    source: 'Zeus AI',
    link: 'https://zeus.ai/',
    title: 'Zeus AI',
  },
  addy: {
    urls: [
      'https://addy.co/favicon.ico',
      'https://www.addy.co/assets/logo.svg',
    ],
    source: 'addy',
    link: 'https://addy.co/',
    title: 'addy',
  },
  'cgui lab': {
    urls: [
      'https://www.cs.columbia.edu/~cgui/favicon.ico',
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Columbia_University_shield.svg/240px-Columbia_University_shield.svg.png',
    ],
    source: 'Columbia University',
    link: 'https://www.cs.columbia.edu/',
    title: 'Columbia CS',
  },
  'hackNY.org': {
    urls: [
      'https://www.hackny.org/wp-content/uploads/2018/06/hackNY-logo.png',
      'https://www.hackny.org/favicon.ico',
    ],
    source: 'hackNY',
    link: 'https://www.hackny.org/',
    title: 'hackNY',
  },
  ohr: {
    urls: [
      'https://ohr.co/favicon.ico',
      'https://www.ohr.co/assets/logo.png',
    ],
    source: 'ohr',
    link: 'https://ohr.co/',
    title: 'ohr',
  },
}

const MICROSOFT = {
  urls: ['https://cdn.worldvectorlogo.com/logos/microsoft-5.svg'],
  source: 'Worldvectorlogo',
  link: 'https://worldvectorlogo.com/logo/microsoft-5',
  title: 'Microsoft icon (four squares)',
}

function companySlug(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unknown'
  )
}

function guessExt(url, contentType) {
  const ct = (contentType || '').split(';')[0].trim().toLowerCase()
  const map = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'image/x-icon': '.ico',
    'image/vnd.microsoft.icon': '.ico',
  }
  if (map[ct]) return map[ct]
  const lower = url.split('?')[0].toLowerCase()
  for (const ext of ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico']) {
    if (lower.endsWith(ext)) return ext === '.jpeg' ? '.jpg' : ext
  }
  return '.png'
}

function looksLikeImage(buf, contentType, url) {
  if ((contentType || '').toLowerCase().startsWith('image/')) return true
  const lower = url.split('?')[0].toLowerCase()
  if (/\.(jpg|jpeg|png|webp|gif|svg|ico)$/.test(lower)) return true
  if (buf.length >= 12) {
    if (buf[0] === 0x89 && buf[1] === 0x50) return true
    if (buf[0] === 0xff && buf[1] === 0xd8) return true
    if (buf.slice(0, 6).toString() === 'GIF87a' || buf.slice(0, 6).toString() === 'GIF89a') return true
    if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return true
    if (buf.toString('utf8', 0, Math.min(200, buf.length)).trimStart().startsWith('<svg')) return true
  }
  return false
}

async function downloadImage(imageUrl, destBase) {
  const res = await fetch(imageUrl, { headers: DOWNLOAD_HEADERS, redirect: 'follow' })
  if (!res.ok) return null
  const contentType = res.headers.get('content-type') || ''
  const buf = Buffer.from(await res.arrayBuffer())
  if (!looksLikeImage(buf, contentType, imageUrl)) return null
  const ext = guessExt(imageUrl, contentType)
  const filename = `${path.basename(destBase)}${ext}`
  fs.writeFileSync(path.join(LOGOS_DIR, filename), buf)
  return { filename, imageUrl }
}

function removeOldFiles(slug) {
  for (const old of fs.readdirSync(LOGOS_DIR)) {
    if (old.startsWith(`${slug}.`) && old !== 'manifest.json') {
      fs.unlinkSync(path.join(LOGOS_DIR, old))
    }
  }
}

async function downloadCurated(company, entry, manifest) {
  const slug = companySlug(company)
  removeOldFiles(slug)

  for (const url of entry.urls) {
    const result = await downloadImage(url, slug)
    if (result) {
      manifest[company] = {
        filename: result.filename,
        query: 'curated',
        image_url: result.imageUrl,
        title: entry.title,
        source: entry.source,
        link: entry.link,
      }
      return true
    }
  }
  return false
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
  let ok = 0
  let fail = 0

  for (const [company, entry] of Object.entries(CURATED)) {
    process.stdout.write(`${company}... `)
    const success = await downloadCurated(company, entry, manifest)
    if (success) {
      ok++
      console.log(`OK (${manifest[company].filename})`)
    } else {
      fail++
      console.log('FAILED')
    }
  }

  process.stdout.write('Microsoft (icon only)... ')
  removeOldFiles('microsoft')
  const msOk = await downloadCurated('Microsoft', MICROSOFT, manifest)
  console.log(msOk ? `OK (${manifest.Microsoft.filename})` : 'FAILED')

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`\nDone: ${ok}/${Object.keys(CURATED).length} new logos, Microsoft: ${msOk ? 'updated' : 'failed'}, ${fail} failed`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
