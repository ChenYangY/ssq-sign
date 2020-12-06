const _ = require('lodash')
const crypto = require('crypto')
const jsRsaSign = require('jsrsasign')
const Signature = jsRsaSign.KJUR.crypto.Signature
const sortAndStringify = require('./util')

class Signer {
  /**
   * @param {String} privateKey base64 string
   * @param {String} publicKey base64 string
   * @param {Object} options  {alg: string, passphrase: string}
  */
  constructor(privateKey, publicKey, options = {}) {
    if(!privateKey) throw new Error('privateKey is empty')
    if(!publicKey) throw new Error('publicKey is empty')
    this.privateKey = Buffer.from(privateKey, 'base64')
    this.publicKey = Buffer.from(publicKey, 'base64')
    this.alg = options.alg || 'SHA1withRSA'
    this.passphrase = options.passphrase
  }

  /**
   * @param {Object} data
   * @return {String} hex string
   */
  signJsonWithMd5(data) {
    if(_.isEmpty(data)) return ''
    let str = JSON.stringify(data)
    console.log(str)
    let cipher = crypto.createHash('md5')
    cipher.update(str)
    return cipher.digest('hex')
  }

  

  sign(plainText, format = 'base64') {
    let cipher = new jsRsaSign.KJUR.crypto.Signature({alg: this.alg})
    cipher.setAlgAndProvider('SHA1withRSA', 'cryptojs/jsrsa')
    let rsaPrvKey = new jsRsaSign.RSAKey()
    rsaPrvKey.readPKCS8PrvKeyHex(this.privateKey.toString('hex'))
    cipher.init(rsaPrvKey,this.passphrase)
    cipher.updateString(plainText)
    return Buffer.from(cipher.sign(), 'hex').toString(format)
  }


  verify(plainText, signature, signatureFormat = 'base64') {
    let cipher = new jsRsaSign.KJUR.crypto.Signature({alg: this.alg})
    cipher.setAlgAndProvider('SHA1withRSA', 'cryptojs/jsrsa')
    let rsaPubKey = new jsRsaSign.RSAKey()
    rsaPubKey.readPKCS8PubKeyHex(this.publicKey.toString('hex'))
    cipher.init(rsaPubKey,this.passphrase)
    cipher.updateString(plainText)
    return cipher.verify(Buffer.from(signature, signatureFormat).toString('hex'))
  }
}

module.exports = Signer