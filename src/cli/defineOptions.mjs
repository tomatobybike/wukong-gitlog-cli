import { getPackage } from '../utils/getPackage.mjs'

export function defineOptions(program) {
  const pkg = getPackage()
  program
    .name('wukong-gitlog')
    .version(pkg.version, '-v')
    .description('Advanced Git commit log exporter.')
    .option('--author <name>')
    .option('--since <date>')
    .option('--until <date>')
    .option('--no-merges')
    .option('--group-by <type>')
    .option('--format <type>', 'text')
    .option('--json')
    .option('--overtime')
    .option('--serve')
    .option('--out <file>')
    .option('--out-dir <dir>')
    .option('--debug')
    .option('--profile')
    .option('--trace <file>')
    .option('--version', 'show version information')
}
