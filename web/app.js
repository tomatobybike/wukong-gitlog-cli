/* eslint-disable import/no-absolute-path */
const formatDate = (d) => new Date(d).toLocaleString();

async function loadData() {
  try {
    const [commitsModule, statsModule, weeklyModule] = await Promise.all([
      import("/data/commits.mjs"),
      import("/data/overtime-stats.mjs"),
      import("/data/overtime-weekly.mjs"),
    ]);
    const commits = commitsModule.default || [];
    const stats = statsModule.default || {};
    const weekly = weeklyModule.default || [];
    return { commits, stats, weekly };
  } catch (err) {
    console.error('Load data failed', err);
    return { commits: [], stats: {}, weekly: [] };
  }
}

let commitsAll = [];
let filtered = [];
let page = 1;
let pageSize = 10;

function renderCommitsTablePage() {
  const tbody = document.querySelector('#commitsTable tbody');
  tbody.innerHTML = '';
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  filtered.slice(start, end).forEach((c) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${c.hash.slice(0, 8)}</td><td>${c.author}</td><td>${formatDate(c.date)}</td><td>${c.message}</td>`;
    tbody.appendChild(tr);
  });
}

function updatePager() {
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (page > totalPages) page = totalPages;
  const pageInfo = document.getElementById('pageInfo');
  pageInfo.textContent = `${page} / ${totalPages}`;
  document.getElementById('prevPage').disabled = page <= 1;
  document.getElementById('nextPage').disabled = page >= totalPages;
}

function applySearch() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  if (!q) {
    filtered = commitsAll.slice();
  } else {
    filtered = commitsAll.filter((c) => {
      const h = c.hash.toLowerCase();
      const a = String(c.author || '').toLowerCase();
      const m = String(c.message || '').toLowerCase();
      const d = formatDate(c.date).toLowerCase();
      return h.includes(q) || a.includes(q) || m.includes(q) || d.includes(q);
    });
  }
  page = 1;
  updatePager();
  renderCommitsTablePage();
}

function initTableControls() {
  document.getElementById('searchInput').addEventListener('input', applySearch);
  document.getElementById('pageSize').addEventListener('change', (e) => {
    pageSize = parseInt(e.target.value, 10) || 10;
    page = 1;
    updatePager();
    renderCommitsTablePage();
  });
  document.getElementById('prevPage').addEventListener('click', () => {
    if (page > 1) {
      page -= 1;
      updatePager();
      renderCommitsTablePage();
    }
  });
  document.getElementById('nextPage').addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (page < totalPages) {
      page += 1;
      updatePager();
      renderCommitsTablePage();
    }
  });
}

function drawHourlyOvertime(stats) {
  const el = document.getElementById('hourlyOvertimeChart');
  const chart = echarts.init(el);
  const data = stats.hourlyOvertimeCommits || [];
  const labels = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  chart.setOption({
    tooltip: {},
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', name: 'Overtime commits', data }]
  });
  return chart;
}

function drawOutsideVsInside(stats) {
  const el = document.getElementById('outsideVsInsideChart');
  const chart = echarts.init(el);
  const outside = stats.outsideWorkCount || 0;
  const total = stats.total || 0;
  const inside = Math.max(0, total - outside);
  chart.setOption({
    tooltip: {},
    series: [{ type: 'pie', radius: '55%', data: [
      { value: inside, name: '工作时间内' },
      { value: outside, name: '下班时间' }
    ] }]
  });
  return chart;
}

function drawDailyTrend(commits) {
  const map = new Map();
  commits.forEach((c) => {
    const d = new Date(c.date).toISOString().slice(0, 10);
    map.set(d, (map.get(d) || 0) + 1);
  });
  const labels = Array.from(map.keys()).sort();
  const data = labels.map(l => map.get(l));
  const el = document.getElementById('dailyTrendChart');
  const chart = echarts.init(el);
  chart.setOption({
    tooltip: {},
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value' },
    series: [{ type: 'line', name: '每日提交', data, areaStyle: {} }]
  });
  return chart;
}

function drawWeeklyTrend(weekly) {
  const labels = weekly.map(w => w.period);
  const dataRate = weekly.map(w => +(w.outsideWorkRate * 100).toFixed(1));
  const dataCount = weekly.map(w => w.outsideWorkCount);
  const el = document.getElementById('weeklyTrendChart');
  const chart = echarts.init(el);
  chart.setOption({
    tooltip: {},
    xAxis: { type: 'category', data: labels },
    yAxis: [
      { type: 'value', min: 0, max: 100 },
      { type: 'value' }
    ],
    series: [
      { type: 'line', name: '加班占比(%)', data: dataRate, yAxisIndex: 0 },
      { type: 'line', name: '加班次数', data: dataCount, yAxisIndex: 1 }
    ]
  });
  return chart;
}

(async function main() {
  const { commits, stats, weekly } = await loadData();
  commitsAll = commits;
  filtered = commitsAll.slice();
  initTableControls();
  updatePager();
  renderCommitsTablePage();
  drawHourlyOvertime(stats);
  drawOutsideVsInside(stats);
  drawDailyTrend(commits);
  drawWeeklyTrend(weekly);
})();
