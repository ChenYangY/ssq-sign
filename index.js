const fs = require('fs')
const serverHost = 'https://openapi.bestsign.info/openapi/v2'

const SSQSign = require('./lib/ssqsign')
const privateKey = fs.readFileSync('./keys/privateKey.der', 'utf-8')
const publicKey = fs.readFileSync('./keys/publicKey.der', 'utf-8')
const developerId = '1607064105015188260'


const ssqsign = new SSQSign(serverHost,developerId, privateKey, publicKey);

async function start() {
    let data = await ssqsign.a2e('陈阳阳', '430422199309093016')
    console.log(data)
    
}
// ssqsign.a2e('陈阳阳', '430422199309093016').then((response) => {
//     console.log(response)
// })
// .catch((e) => {
//     console.log(e)
// })

start()