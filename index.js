'use strict'

// core
const querystring = require('querystring')

// npm
const got = require('got')
const marked = require('marked')
const pick = require('lodash.pick')
const debug = require('debug')('vault-demo')
const PouchDB = require('pouchdb-core')
  .plugin(require('pouchdb-adapter-memory'))
  .plugin(require('pouchdb-adapter-http'))
  .plugin(require('pouchdb-replication'))
  .plugin(require('pouchdb-find'))

const db = new PouchDB('ram')

const notReady = () => 'Should be ready any second now...'

const frontPage = (res) => db.find({ selector: { type: 'boot' } })
  .then((x) => x.docs.map((y) => Date.parse(y.created_at)))
  .then((x) => x.sort().reverse().slice(0, 5))
  .then((x) => x.map((y) => new Date(y).toISOString()))
  .then((x) => db.get('home')
    .then((y) => {
      const txt = `<doctype html><html><head><meta charset='utf8'></head>
        <body>
        ${marked(y.markdown)}
        <h3>Last boots</h3>
        <ol>
          <li>${x.join('</li><li>')}</li>
        </ol>
      `
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(txt)
    })
    .catch((e) => { return { lastBootTimes: x } })
  )

const shared = ((n) => {
  const y = new Uint32Array(n)
  y.forEach((v, k, m) => m[k] = Math.floor(Math.random() * Math.pow(2, 32)))
  return new Buffer(y.buffer).toString('base64').slice(0, Math.floor(Math.random() * 5) - 6)
})(5)

const post = pick(process.env, ['DEPLOYMENT_ID', 'AUTH_TOKEN', 'NOW_URL'])
// const post = process.env
post.shared = shared

let secrets

debug('tickling...')
got('https://btcart.com/vault-server/', {
  json: true,
  body: post,
  timeout: 15000,
  retries: 10
})
  .then((r) => {
    debug('so...', new Date())
    if (r && r.body && r.body.shared === shared) {
      debug('yup', new Date())
      return r.body.secrets
    }
    debug('almost', new Date(), r.body)
  })
  .then((r) => {
    if (!r || !r.dbSync) { return }
    secrets = r
    db.sync(secrets.dbSync, { live: true, retry: true })
    db.post({
      type: 'boot',
      created_at: new Date().toISOString(),
      host: process.env.NOW_URL
    })
  })
  .catch((e) => {
    debug('nup', new Date(), e)
  })

export default (req, res) => secrets ? frontPage(res) : notReady()
