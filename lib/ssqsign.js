
const got = require('got')
const Signer =  require('./signer')
const _ = require('lodash')
const sortAndStringify = require('./util')

class SSQSign {
  /**
   * @param {String} url
   * @param {String} developerId
   * @param {String} privateKey base64 string
   * @param {String} publicKey  base string
   * @param {Object} options  {alg,timeout,notifyUrl,returnUrl}
  */
  constructor(url, developerId, privateKey, publicKey, options = {}) {
    this.serverHost = url
    this.developerId = developerId
    this.privateKey = privateKey
    this.publicKey = publicKey
    this.timeout = options.timeout || 20000
    this.retry = options.retry || 2
    this.notifyUrl = options.notifyUrl,
    this.returnUrl = options.returnUrl,
    this.alg = options.alg || 'SHA1withRSA'
    this.signer = new Signer(privateKey, publicKey)

  }
  /**
   * @param {String} url
   * @param {Object} query
   * @param {Object} body
   * @returns {String}
  */
  getSignPlainText(url, query, body) {
    let queryStr = sortAndStringify(query)
    let bodyMd5Val = this.signer.signJsonWithMd5(body)
    let urlInst = new URL(url)
    let urlPath = urlInst.pathname
    return `${queryStr}${urlPath}${bodyMd5Val}`
  }

  /**
   * @param {String} url
   * @param {Object} query
   * @param {Object} body
   * @returns {String}
  */
  sign(url, query, body) {
    let plainText = this.getSignPlainText(url, query, body)
    console.log(plainText)
    return this.signer.sign(plainText)
  }

  /**
   * @param {String} method
   * @param {String} url
   * @param {Object} data {query:object, form: object}
   * @param {Object} options {retry, timeout}
   * @returns {String}
  */
  async doRequest(method, url, data, options = {}) {
    let query = _.merge(this.createQueryParams(), data.query)
    let signVal = this.sign(url, query, data.form)
    let urlParamStr = Object.keys(query).map((key) => {
      return  `${key}=${query[key]}`
    }).join('&')
    console.log(urlParamStr)
    url += `?${urlParamStr}&sign=${encodeURIComponent(signVal)}` 
    console.log(url)
    let response = await got({
      method: method,
      url: url,
      json: data.form,
      retry: options.retry || this.retry,
      timeout: options.timeout || this.timeout,
      responseType: options.responseType || 'json',
    })
    // console.log(Object.keys(response))
    return response.body
  }

  /**
   * @returns {Object} {developerId, rtick, signType}
  */
  createQueryParams() {
    return {developerId: this.developerId, rtick: Date.now(), signType: 'rsa'}
  }

  /**
   * @param {String} name idCard name
   * @param {String} identity idCard name code
   * @returns {Object}
  */
  async a2e(name, identity) {
    let a2ePath = '/credentialVerify/personal/identity2/'
    let data = await this.doRequest('POST', `${this.serverHost}${a2ePath}`, {
      form: {
        name: name,
        identity: identity
      }
    })
    console.log(data)
    return data
  }
}

module.exports = SSQSign