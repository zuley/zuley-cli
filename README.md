# zuley-cli
基于Node的命令行开发，自动构建系统

目前就我所呆的公司来说，前端的发版都是开发完之后执行编译，然后通过 `ftp` 上传到服务器中。项目多起来之后，加上测试环境和正式环境的分离，导致管理混乱。而且整个流程也很麻烦，要一步步手动去做。

所以一直就有一个想法，能不能做一个像 `Vue Cli` 一样的自动化工具，可以通过命令输入命令和选择选项，进行自动化的编译和发版。说干就干立马就开发了一个 ~~~

[**GitHub 地址：** https://github.com/zuley/zuley-cli](https://github.com/zuley/zuley-cli)


![](https://user-gold-cdn.xitu.io/2018/5/23/1638c2a9ef6a819e?w=420&h=159&f=gif&s=3744366)


## 一、技术栈

* `chalk` 美化命令行，进行着色等
* `commander` 解析用户命令行输入
* `inquirer` 命令行交互功能，像用户提问等。
* `node-ssh` ssh 模块
* `ora` 命令行环境的 loading 效果
* `shelljs` 重新包装了 `child_process` 子进程模块，调用系统命令更方便。

## 二、创建项目

1. 直接使用 `npm init` 创建一个空项目
2. 在根目录创建一个不带后缀的系统文件 `app`，作为主入口文件。

## 三、简单命令行示例

在入口文件中输入以下代码

``` js
const program = require('commander')
const inquirer = require('inquirer')
const chalk = require('chalk')
program
  .command('module')
  .alias('m')
  .description('创建新的模块')
  .option('-n, --name [moduleName]', '模块名称')
  .action(option => {
    console.log('Hello World', option.name)
  })
    
program.parse(process.argv)
```

执行看效果

``` js
$ node app m -n zuley // 输出：Hello World zuley
```

## 四、以全局方式运行

上面的示例输入起来太麻烦，需要进入项目所在目录才能执行文件，现在我们需要一个简单的方式 `zuley m -n zuley` 

**1、配置 `package.json` 中的 `bin` 字段**

``` js
"bin": {
    "zuley": "app"
}
```

**2、注册全局命令**

然后执行注册符号链接，它会把 `zuley` 这个字段复制到 `npm` 全局模块安装文件夹 `node_modules` 内，也就是将 `zuley` 的路径加入环境变量 `PATH` 中。

如果是MAC，则需要加上 `sudo` 前缀，使用管理员权限。

> 本文中所有使用了 `sudo` 的地方，均是MAC系统限制，win用户需要删除此句。

``` bash
$ npm link

# or mac
$ sudo npm link
```

**3、声明为可执行应用**

在入口文件的最上方加入声明，声明这是一个可执行的应用。

``` js
#! /usr/bin/env node

...code
```

**四、执行命令**

``` bash
$ zuley m -n zuley
```

## 五、项目架构

实际开发中，我们以 `src`为源码目录，自动发布系统做为其中的一个模块，放置在模块目录中。

``` js
|-/src/ // 源码目录
|---/modules/ 模块目录
|-----/Automation/ // 发布模块目录
|-------index.js // 模块入口文件
|-------config.promps.js  // 选项配置文件
|-------config.service.js // 服务器配置文件
|-app  // 入口文件
```

## 六、在入口文件 `app` 中载入自动发布系统模块

``` js
#! /usr/bin/env node

// 导入自动化任务模块
require('./src/modules/Automation/index')
```

## 七、编写模块入口功能

编写模块入口文件 `/src/modules/Automation/index.js`

### 1、命令行询问选项

执行命令之后，我们需要提供命令行界面，让用户输入或者选择选项来确定接下来的操作。这里用到了 `inquirer` 包。

具体用例请去 `npm` 或者自行搜索学习。

**以下是代码片段**

``` js
// 导入选项配置
const prompsConfig = require('./config.promps')

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
```


![](https://user-gold-cdn.xitu.io/2018/5/23/1638c2b3f998d434)


### 2、执行shell命令编译项目

这里使用了 `shelljs` 包。`shelljs` 重新包装了 `child_process` 子进程模块，调用系统命令更方便。

> 本文中所有使用了 `sudo` 的地方，均是MAC系统限制，win用户需要删除此句。

**以下是代码片段**

``` js
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
```

### 3、上传文件

上传文件使用了 `node-ssh`包，该包封装了一些简单易用的方法，具体可以查询官网或者搜索教程。

**以下是代码片段**

``` js
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
```

本例只做简单的演示，实际应用还需要扩展上传失败的处理。比如断点续传，失败文件续传等。

而且单个上传会很慢，可以先运行命令压缩后再上传，再执行下服务器命令解压文件。

如果上传失败，检查远程目录是否有权限，使用命令修改权限。

``` bash
$ chmod -R 777 [目录]
```

### 4、源码

**1、index.js**

```js
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
```

**2、选项配置源码：config.promps.js**

此文件配置用户在命令行中输入或者选择的数据，供后续拼接生成 `A-WX-TEST` 类的字段。

`A-WX-TEST` 代表用户选择了：项目A-微信-测试环境

程序将通过此拼接字段，去 `config.service.js` 中获取项目配置

``` js
/**
 * 自动化模块 - 选项配置文件
 */
module.exports = {
  // 项目名字
  name: [
    {
      type: 'list',
      name: 'name',
      message: '请选择要发布的项目',
      choices: [
        {
          name: '项目A',
          value: 'A'
        },
        {
          name: '项目B',
          value: 'B'
        }
      ]
    }
  ],
  // 项目渠道
  source: {
    'A': [
      {
        type: 'list',
        name: 'source',
        message: '请选择要发布的渠道',
        choices: [
          {
            name: 'PC网站',
            value: 'PC'
          },
          {
            name: '微信',
            value: 'WX'
          }
        ]
      }
    ],
    'B': [
      {
        type: 'list',
        name: 'source',
        message: '请选择要发布的渠道',
        choices: [
          {
            name: 'PC网站',
            value: 'PC'
          },
          {
            name: '微信',
            value: 'WX'
          }
        ]
      }
    ]
  },
  // 项目环境
  type: [
    {
      type: 'list',
      name: 'type',
      message: '请选择发布环境',
      choices: [
        {
          name: '测试环境',
          value: 'TEST'
        },
        {
          name: '正式环境',
          value: 'PROD'
        }
      ]
    }
  ]
}
```

**3、服务器配置源码：config.service.js**

服务器配置只配置了两个作为演示，实际看现实情况补充。

**在 `GitHub` 上拉取项目测试的时候，记得一定要修改次文件。**

1. 修改服务器为自己的服务器和ssh账号密码
2. 修改项目的本地目录和远程目录
3. `A-WX-TEST` 这个字段代表用户输入的选项，具体看 `config.promps.js`

``` js
// 服务器 A
const serviceA = {
  // 服务器 IP
  host: 'xxx.xxx.xxx.xxx',
  // ssh 账号
  username: 'xxx',
  // ss 密码
  password: 'xxxxxx'
}

module.exports = {
  // 项目A，微信测试环境
  'A-WX-TEST': {
    service: serviceA,
    // 本地目录
    localPath: '/Users/zuley/ChuDaoNew/minshengjingwu-h5',
    // 远程目录
    remotePath: '/root/html/test'
  },
  // 项目A，微信正式环境
  'A-WX-PROD': {
    service: serviceA,
    // 本地目录
    localPath: '/Users/zuley/ChuDaoNew/minshengjingwu-h5',
    // 远程目录
    remotePath: '/root/html/prod'
  }
}

```

## 八、执行自动化发布

执行以下命令即可启动自动化

``` bash
$ zuley a
```

输入有误想终止命令可输入

``` bash
$ Ctrl+C
```

## 九、参考文章

[**GitHub 地址：** https://github.com/zuley/zuley-cli](https://github.com/zuley/zuley-cli)

[跟着老司机玩转Node命令行](https://aotu.io/notes/2016/08/09/command-line-development/index.html)

[chalk：美化命令行，进行着色](https://www.npmjs.com/package/chalk)

[commander：解析用户命令行输入](https://www.npmjs.com/package/commander)

[inquirer：命令行交互功能，像用户提问等](https://www.npmjs.com/package/inquirer)

[node-ssh：ssh 模块](https://www.npmjs.com/package/node-ssh)

[ora：命令行环境的 loading 效果](https://www.npmjs.com/package/ora)

[shelljs：更方便的调用系统命令](https://www.npmjs.com/package/shelljs)
