export function defineOptions(program) {
  program
    .name('wukong-gitlog')
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
}
