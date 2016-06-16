'use strict'

// npm
const got = require('got')
const debug = require('debug')('vault-demo')
const pick = require('lodash.pick')

module.exports = function (vault) {
  const shared = ((n) => {
    const y = new Uint32Array(n)
    y.forEach((v, k, m) => m[k] = Math.floor(Math.random() * Math.pow(2, 32)))
    return new Buffer(y.buffer).toString('base64').slice(0, Math.floor(Math.random() * 5) - 6)
  })(5)

  const post = pick(process.env, ['DEPLOYMENT_ID', 'AUTH_TOKEN', 'NOW_URL'])
  post.shared = shared

  if (!vault) { vault = 'https://btcart.com/vault-server/' }
  return got(vault, {
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
    .catch((e) => {
      debug('nup', new Date(), e)
      return false
    })
}
