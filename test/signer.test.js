
const fs = require('fs')
const privateKey = fs.readFileSync('./keys/privateKey.der', 'utf-8')
const publicKey = fs.readFileSync('./keys/publicKey.der', 'utf-8')
const Signer = require('../lib/signer')
const assert = require('assert')


describe('signer.test.js', () => {
    describe('sign and verify without passphrase', function() {
        it('testcase', () => {
            let signer = new Signer(privateKey, publicKey)
            let plainText = '123&456'
            let signature = signer.sign(plainText)
            assert(signer.verify(plainText, signature))
        })
    })

    describe('sign and verify with passphrase', function() {
        it('testcase', () => {
            let signer = new Signer(privateKey, publicKey, {passphrase: '123'})
            let plainText = '123&456'
            let signature = signer.sign(plainText)
            assert(signer.verify(plainText, signature))
        })
    })
    
})