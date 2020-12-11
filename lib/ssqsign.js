
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
    this.account = options.account
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
    let bodyMd5Val = ''
    if(!_.isEmpty(body)) {
      bodyMd5Val = this.signer.signWithMd5(JSON.stringify(body))
    }
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
    url += `?${urlParamStr}&sign=${encodeURIComponent(signVal)}` 
    let response
    try {
      response = await got({
        method: method,
        url: url,
        json: data.form,
        retry: options.retry || this.retry,
        timeout: options.timeout || this.timeout,
        responseType: options.responseType || 'json',
      })
    }
    catch(e) {
      return {
        errno: 100002,
        data: {},
        errmsg: e.toString()
      }
    }
    
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
    let routePath = '/credentialVerify/personal/identity2/'
    let repsonseBody = await this.doRequest('POST', `${this.serverHost}${routePath}`, {
      form: {
        name: name,
        identity: identity
      }
    })
    
    return repsonseBody
  }

  /**
   * @param {String} account 账号id
   * @param {String} name 身份证姓名
   * @param {String} identity 身份证编号
   * @param {String} mobile 用户手机号码
   * @reuturns {Object} {errno, errmsg, data}
  */
  async personReg(account, name, identity, mobile) {
    let routePath = '/user/reg/'
    let repsonseBody = await this.doRequest('POST', `${this.serverHost}${routePath}`, {
      form: {
        account: account,
        name: name,
        mobile: mobile,
        userType: '1',
        applyCert: '1',
        credential : {
          identity: identity
        }
      }
    })
    return repsonseBody
  }

  /**
   * @param {String} account 为目标账号申请签名或创建默认签名
   * @returns {Object} {errno,errmsg,data: {}}
  */
  async createUserDefaultSignImage(account) {
    let routePath = '/signatureImage/user/create/'
    let repsonseBody = await this.doRequest('POST', `${this.serverHost}${routePath}`, {
      form: {
        account: account
      }
    })
    return repsonseBody

  }

  /**
   * @param {String} account 查询用户的id
   * @param {String} taskId personReg 接口产生出的taskId
   * @returns {Object} {errno, errmsg, data: {message, status}} data.status == '5' is ok
  */
  async syncApplyCertStatus(account,  taskId) {
    let routePath = '/user/async/applyCert/status/'
    let repsonseBody = await this.doRequest('POST', `${this.serverHost}${routePath}`, {
      form: {
        account: account,
        taskId: taskId 
      }
    })
    return repsonseBody
  }

  /**
   * @param {String} filename 
   * @param {Buffer} fileData
   * @param {Number} totalPage 文件
   * @return {boject} {errno, data: {fid}, errmsg}
  */
  async uploadPdf(filename, fileData, totalPage) {
    let routePath = '/storage/upload/'
    let repsonseBody = await this.doRequest('POST', `${this.serverHost}${routePath}`, {
      form: {
        account: this.account,
        fmd5: this.signer.signWithMd5(fileData),
        fname: filename,
        fdata: Buffer.from(fileData).toString('base64'),
        fpages: totalPage
      }
    })
    return repsonseBody
  }

 

  /**
   * @param {String} templateName 模板名称
   * @param {Object} pdfInfo {name, data, totalPage}
   * @param {Object} options {isReadForm, expireTime(s)}
   * @returns {Object} {errno, errmsg, data: {tid}}
  */

  async uploadTemplate(templateName, pdfInfo, options = {}) {
    let routePath = '/dist/template/upload/'
    let repsonseBody = await this.doRequest('POST', `${this.serverHost}${routePath}`, {
      form: {
        account: this.account,
        isReadForm: options.isReadForm || '0',
        fmd5: this.signer.signWithMd5(pdfInfo.data),
        fname: pdfInfo.name,
        ftype: 'pdf',
        title: templateName,
        fdata: Buffer.from(pdfInfo.data).toString('base64'),
        fpages: pdfInfo.totalPage,
        expireTime: options.expireTime || (Math.floor(Date.now()/1000) + 7200).toString(),
      }
    })
    return repsonseBody
  }


  /**
   * @param {Object} pdfInfo  {data, totalPage, name}
   * @param {Object} contractInfo {title, description}
   * @param {Object} options {expireTime}
   * @returns {Object} {errno, errmsg, data: {tid}}
  */
  async createContractByUploadPdf(pdfInfo, contractInfo, options = {}) {
    let routePath = '/storage/contract/upload/'
    let repsonseBody = await this.doRequest('POST', `${this.serverHost}${routePath}`, {
      form: {
        account: this.account,
        fmd5: this.signer.signWithMd5(pdfInfo.data),
        fname: pdfInfo.name,
        ftype: 'pdf',
        title: contractInfo.title,
        description: contractInfo.description || '',
        fdata: Buffer.from(pdfInfo.data).toString('base64'),
        fpages: pdfInfo.totalPage,
        expireTime: options.expireTime || (Math.floor(Date.now()/1000) + 7200).toString(),
      }
    })
    return repsonseBody
  }

  async getUserSignContractUrl(signer, contractId, localContractId, options = {}) {
    let routePath = '/contract/send/'
    let repsonseBody = await this.doRequest('POST', `${this.serverHost}${routePath}`, {
      form: {
        signer: signer,
        contractId: contractId,
        expireTime: options.expireTime || (Math.floor(Date.now()/1000) + 1800).toString(),
        dpi: '120',
        isAllowChangeSignaturePosition: '1',
        sid: localContractId,
        signatureImageName: 'default',
        isDrawSignatureImage: '0',
        returnUrl: options.returnUrl,
        pushUrl:  options.pushUrl,
        signaturePositions: [{
          dateTimeFormat: 'yyyy-MM-dd',
          pageNum: '1',
          x: '0.1',
          y: '0.1'
        }]
      }
    })
    return repsonseBody
  }


  async createContractByFileId() {

  }

  async createContractByTemplateId(tid, templateParams, contractInfo = {}, options = {}) {
    let routePath = '/dist/template/createContract/'
    let repsonseBody = await this.doRequest('POST', `${this.serverHost}${routePath}`, {
      form: {
        account: this.account,
        tid: tid,
        templateValues: templateParams,
        title: contractInfo.title || 'contract',
        expireTime: options.expireTime || (Math.floor(Date.now()/1000) + 7200).toString(),
      }
    })
    return repsonseBody
  }


  async searchKeyWordSign(contractId, keyword, options = {}) {
    let routePath = '/contract/sign/keywords/'
    let repsonseBody = await this.doRequest('POST', `${this.serverHost}${routePath}`, {
      form: {
        contractId: contractId,
        signerAccount: this.account,
        keywords: [keyword],
        align: options.align || 'rc'
      }
    })
    return repsonseBody
  }

  async AutoSign(contractId, signaturePos, options) {
    let routePath = '/contract/sign/cert/'
    let repsonseBody = await this.doRequest('POST', `${this.serverHost}${routePath}`, {
      form: {
        contractId: contractId,
        signerAccount: this.account,
        signaturePositions: [{

        }]
      }
    })
    return repsonseBody
  }



  async lockContract(contractId) {
    let routePath = '/storage/contract/lock/'
    let repsonseBody = await this.doRequest('POST', `${this.serverHost}${routePath}`, {
      form: {
        contractId: contractId,
        signerAccount: this.account
      }
    })
    return repsonseBody
  }

  async getContractSignProof(contractId) {
    let routePath = '/contract/downloadAttachment/'
    let repsonseBody = await this.doRequest('GET', `${this.serverHost}${routePath}`, {
      query: {
        contractId: contractId
      }
    }, {responseType: 'buffer'})
    return repsonseBody
  }

  async getTemplateVars(tid, options) {
    let routePath = '/template/getTemplateVars/'
    let repsonseBody = await this.doRequest('POST', `${this.serverHost}${routePath}`, {
      form: {
        tid: tid,
        isRetrieveAllVars: options.isRetrieveAllVars
      }
    })
    return repsonseBody
  }

  async getContractPreviewUrl(contractId, options = {}) {
    let routePath = '/contract/getPreviewURL/'
    let repsonseBody = await this.doRequest('POST', `${this.serverHost}${routePath}`, {
      form: {
        contractId: contractId,
        account: this.account,
        dpi: options.dpi || '160',
        expireTime: options.expireTime || (Math.floor(Date.now()/1000) + 7200).toString(),
      }
    })
    return repsonseBody
  }

  async downloadContract(contractId) {
    let routePath = '/storage/contract/download/'
    let repsonseBody = await this.doRequest('GET', `${this.serverHost}${routePath}`, {
      query: {
        contractId: contractId
      }
    }, {responseType: 'buffer'})
    return repsonseBody
  }
}

module.exports = SSQSign