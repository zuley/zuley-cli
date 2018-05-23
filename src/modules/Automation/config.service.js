// 服务器 A
const serviceA = {
  host: 'xxx.xxx.xxx.xxx',
  username: 'xxx',
  password: 'xxx'
}

module.exports = {
  // 项目A，微信测试环境
  'A-WX-TEST': {
    service: serviceA,
    localPath: '/Users/zuley/ChuDaoNew/minshengjingwu-h5',
    remotePath: '/root/html/test'
  },
  // 项目A，微信正式环境
  'A-WX-PROD': {
    service: serviceA,
    localPath: '/Users/zuley/ChuDaoNew/minshengjingwu-h5',
    remotePath: '/root/html/prod'
  }
}
