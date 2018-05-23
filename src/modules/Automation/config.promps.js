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
