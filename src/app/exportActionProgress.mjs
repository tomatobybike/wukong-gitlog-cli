import chalk from 'chalk'
import { createMultiBar } from 'wukong-progress'

const someAsyncLogTask = () =>
  new Promise((resolve) => {setTimeout(resolve, 1000)})
const someDataProcessing = () =>
  new Promise((resolve) => {setTimeout(resolve, 1500)})
const writeToFile = () => new Promise((resolve) => {setTimeout(resolve, 1000)})

export async function exportAction(rawOpts = {}) {
  const mb = createMultiBar()
  const bar = mb.create(100, {
    prefix: chalk.cyan('Build'),
    format: 'Build [:bar] :percent :current/:total'
  })

  console.log('\n🚀', chalk.cyan('Wukong GitLog'), '报告导出中...\n')

  // --- 模拟业务步骤 ---

  // 1. 获取日志 (30%)
  await someAsyncLogTask()
  bar.tick(30)

  // 2. 处理数据 (再加 40%)
  await someDataProcessing()
  bar.tick(40)

  // 3. 写入文件 (最后 30%)
  await writeToFile()
  bar.tick(30)

  // --- 业务结束 ---

  mb.stop()
  console.log(chalk.green('\nDone!\n'))
}
