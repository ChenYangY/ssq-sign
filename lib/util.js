const _ = require('lodash')
module.exports = (data) => {
    return Object.keys(data).sort()
    .filter((key) => !(!data[key] || key === 'sign'))
    .map((key) => `${key}=${data[key]}`).join('')
}