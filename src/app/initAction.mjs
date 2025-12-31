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
    const format = await select({
      message: '请选择要生成的配置文件格式:',
      choices: [
        { name: 'ES Module (.mjs)', value: 'mjs' },
        { name: 'JavaScript (.js)', value: 'js' },
        { name: 'YAML', value: 'yml' },
        { name: 'JSON', value: 'json' }
      ]
    });

    const fileName = `.wukonggitlogrc.${format}`;
    const targetPath = path.join(process.cwd(), fileName);

    if (fs.existsSync(targetPath) && !options.force) {
      console.error(`\n❌ 错误: 当前目录已存在 ${fileName}`);
      return;
    }

    let content = '';
    const headerComment = `// Wukong GitLog Config\n// Generated at ${new Date().toLocaleString()}\n\n`;

    switch (format) {
      case 'mjs':
      case 'js':
        content = `${headerComment}export default ${JSON.stringify(DEFAULT_CONFIG, null, 2)};`;
        break;
      case 'yaml':
        content = `# Wukong GitLog Config\n${yaml.stringify(DEFAULT_CONFIG)}`;
        break;
      case 'json':
        content = JSON.stringify(DEFAULT_CONFIG, null, 2);
        break;
    }

    fs.writeFileSync(targetPath, content, 'utf8');
    console.log(`✅ 成功生成配置: ${fileName}`);

    await manageGitignore(DEFAULT_CONFIG.output.dir);
    console.log(`\n✨ 初始化完成！\n`);

  } catch (err) {
    if (err.name === 'ExitPromptError') console.log('\n👋 已取消');
    else console.error(`\n❌ 失败: ${err.message}`);
  }
}
