'use strict'

// core
// const querystring = require('querystring')

// self
const utils = require('./lib/utils')

const marked = require('marked')
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

let secrets

utils()
  .then((r) => {
    if (!r || !r.dbSync) { return false }
    db.sync(r.dbSync, { live: true, retry: true })
    db.post({
      type: 'boot',
      created_at: new Date().toISOString(),
      host: process.env.NOW_URL
    })
    secrets = r
  })

export default (req, res) => secrets ? frontPage(res) : notReady()
