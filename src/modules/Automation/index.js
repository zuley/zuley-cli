const program = require('commander')
const inquirer = require('inquirer')
const chalk = require('chalk')
const ora = require('ora')
const shell = require('shelljs')
const node_ssh = require('node-ssh')
const ssh = new node_ssh()

// 导入选项配置
const prompsConfig = require('./config.promps')
// 导入服务器配置
const serviceConfig = require('./config.service')
const log = console.log

// 字段字典
const TEXTDATA = {
  'A': '项目A',
  'B': '项目B',
  'PC': 'PC 网站',
  'WX': '微信公众号',
  'TEST': '测试环境',
  'PROD': '正式环境',
  '': '其他'
}

// 添加一个名字为 a 别名为 automation 的命令模块
program
  .command('a')
  .alias('automation')
  .description('前端自动化发布系统')
  .action(async option => {
    // 项目名称
    let { name } = await inquirer.prompt(prompsConfig.name)
    // 项目渠道
    let source = ''
    if (prompsConfig.source[name].length > 0) {
      source = await inquirer.prompt(prompsConfig.source[name])
      source = source.source
    }
    // 项目环境
    let { type } = await inquirer.prompt(prompsConfig.type)
    
    // 确认选项
    log('请确认你选择了以下选项')
    log(chalk.green('项目名称：') + chalk.red(TEXTDATA[name]))
    log(chalk.green('项目渠道：') + chalk.red(TEXTDATA[source]))
    log(chalk.green('项目环境：') + chalk.red(TEXTDATA[type]))
    
    // 获取配置
    let config = serviceConfig[`${name}-${source}-${type}`]

    log(`使用服务器配置：${name}-${source}-${type}`)

    // 编译项目
    compile(config, type)

    // 连接服务器
    await ConnectService(config)

    // 上传文件
    await updateFile(config)
  })

program.parse(process.argv)

/**
 * 连接服务器
 * @param {Object} config 项目配置
 */
async function ConnectService (config) {
  log('尝试连接服务：' + chalk.red(config.service.host))
  let spinner = ora('正在连接')
  spinner.start()
  await ssh.connect(config.service)
  spinner.stop()
  log(chalk.green('成功连接到服务器'))
}

/**
 * 上传文件
 * @param {Object} config 项目配置
 */
async function updateFile (config) {
  // 存储失败序列
  let failed = []
  // 存储成功序列
  let successful = []
  let spinner = ora('准备上传文件').start()
  // 上传文件夹
  let status = await ssh.putDirectory(config.localPath + '/dist', config.remotePath, {
    // 递归
    recursive: true,
    // 并发数
    concurrency: 10,
    tick (localPath, remotePath, error) {
      if (error) {
        failed.push(localPath)
      } else {
        spinner.text = '正在上传文件：' + localPath
        successful.push(localPath)
      }
    }
  })
  spinner.stop()
  if (status) { 
    log(chalk.green('完成上传'))
  } else {
    log(chalk.red('上传失败'))
  }
  if (failed.length > 0) {
    log(`一共有${chalk.red(failed.length)}个上传失败的文件`)
    log(failed)
  }
}

/**
 * 编译源码
 * @param {Object} config 项目配置
 * @param {String} type 编译类型 TEST or PROD
 */
async function compile (config, type) {
  // 进入项目本地目录
  shell.cd(config.localPath)
  if (type === 'TEST') {
    log('测试环境编译')
    shell.exec(`sudo npm run test`)
  } else {
    log('正式环境编译')
    shell.exec(`sudo npm run build`)
  }
  log('编译完成')
}