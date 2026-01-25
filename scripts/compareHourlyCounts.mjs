import commits from '../output-wukong/data/commits.mjs';
import overtimeFromFile from '../output-wukong/data/overtime.mjs';
import { analyzeOvertime } from '../src/domain/overtime/overtime.mjs';

const stats = analyzeOvertime(commits, {
  startHour: overtimeFromFile.startHour ?? 9,
  endHour: overtimeFromFile.endHour ?? 18,
  lunchStart: overtimeFromFile.lunchStart ?? 12,
  lunchEnd: overtimeFromFile.lunchEnd ?? 14,
  country: overtimeFromFile.country ?? 'CN'
});

console.log('Computed stats:');
console.log(' total:', stats.total);
console.log(' outsideWorkCount:', stats.outsideWorkCount);
console.log(' nightOutsideCount:', stats.nightOutsideCount);
console.log(' hourlyOvertimeCommits sum:', stats.hourlyOvertimeCommits.reduce((a,b)=>a+b,0));
console.log(' hourlyOvertimeCommits:', stats.hourlyOvertimeCommits);

const fileStats = (overtimeFromFile && overtimeFromFile.default) ? overtimeFromFile.default : overtimeFromFile;
console.log('\nFile stats:');
console.log(' total:', fileStats.total);
console.log(' outsideWorkCount:', fileStats.outsideWorkCount);
console.log(' nightOutsideCount:', fileStats.nightOutsideCount);
console.log(' hourlyOvertimeCommits sum (if present):', (fileStats.hourlyOvertimeCommits || []).reduce((a,b)=>a+b,0));
console.log(' hourlyOvertimeCommits:', fileStats.hourlyOvertimeCommits || 'N/A');

// Compare
console.log('\nComparisons:');
console.log(' outsideWorkCount equal?', stats.outsideWorkCount === fileStats.outsideWorkCount);
console.log(' nightOutsideCount equal?', stats.nightOutsideCount === fileStats.nightOutsideCount);
const hourlyEqual = JSON.stringify(stats.hourlyOvertimeCommits) === JSON.stringify(fileStats.hourlyOvertimeCommits || []);
console.log(' hourlyOvertimeCommits equal?', hourlyEqual);

if (!hourlyEqual) {
  console.log(' Differences by hour:');
  const a = stats.hourlyOvertimeCommits;
  const b = fileStats.hourlyOvertimeCommits || Array(24).fill(0);
  for (let i=0;i<24;i++) {
    if ((a[i]||0) !== (b[i]||0)) console.log(`  hour ${i}: computed=${a[i]||0} file=${b[i]||0}`);
  }
}
