/**
 * @file: initAction.mjs
 * @description: 使用 @inquirer/prompts 初始化配置文件并维护 .gitignore
 * @author: King Monkey
 */
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { select, confirm } from '@inquirer/prompts';
import { DEFAULT_CONFIG } from '../infra/configStore.mjs';

/**
 * 自动将输出目录添加到 .gitignore
 */
async function manageGitignore(outputDir) {
  const gitignorePath = path.join(process.cwd(), '.gitignore');

  if (!fs.existsSync(gitignorePath)) return;

  try {
    const content = fs.readFileSync(gitignorePath, 'utf8');

    // 如果已经忽略了该目录，则跳过
    if (content.includes(outputDir)) return;

    const shouldAdd = await confirm({
      message: `是否自动将报告目录 "${outputDir}/" 添加到 .gitignore?`,
      default: true
    });

    if (shouldAdd) {
      const prefix = content.endsWith('\n') ? '' : '\n';
      const entry = `${prefix}\n# Wukong GitLog Reports\n${outputDir}/\n`;
      fs.appendFileSync(gitignorePath, entry, 'utf8');
      console.log(`✅ 已更新 .gitignore`);
    }
  } catch (err) {
    if (err.name !== 'ExitPromptError') {
      console.warn(`⚠️ 无法更新 .gitignore: ${err.message}`);
    }
  }
}


export async function initAction(options) {
  console.log(`\n🚀 ${'Wukong GitLog'} 配置文件初始化\n`);

  try {
    // 1. 选择格式
    const format = await select({
      message: '请选择要生成的配置文件格式:',
      choices: [
        { name: 'YAML (推荐，支持注释)', value: 'yaml' },
        { name: 'JSON', value: 'json' }
      ]
    });

    const isYaml = format === 'yaml';
    const fileName = isYaml ? '.wukonggitlogrc.yml' : '.wukonggitlogrc.json';
    const targetPath = path.join(process.cwd(), fileName);

    // 2. 检查冲突
    if (fs.existsSync(targetPath) && !options.force) {
      console.error(`\n❌ 错误: 当前目录已存在 ${fileName}`);
      console.log(`💡 使用 --force 参数可强制覆盖，或先手动删除该文件。`);
      return;
    }

    // 3. 生成内容
    let content = '';
    if (isYaml) {
      const commentBefore = `# Wukong GitLog Configuration\n# 生成时间: ${new Date().toLocaleString()}\n\n`;
      content = commentBefore + yaml.stringify(DEFAULT_CONFIG);
    } else {
      content = JSON.stringify(DEFAULT_CONFIG, null, 2);
    }

    // 4. 写入文件
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log(`✅ 成功生成配置: ${fileName}`);

    // 5. 自动维护 .gitignore
    await manageGitignore(DEFAULT_CONFIG.output.dir);

    console.log(`\n✨ 初始化完成！你可以开始运行 'wukong-gitlog analyze' 了。\n`);

  } catch (err) {
    // 处理用户按下 Ctrl+C 强行退出的情况
    if (err.name === 'ExitPromptError') {
      console.log('\n👋 已取消初始化');
    } else {
      console.error(`\n❌ 初始化失败: ${err.message}`);
    }
  }
}

