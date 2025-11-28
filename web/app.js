const formatDate = (d) => new Date(d).toLocaleString();

async function loadData() {
  try {
    const [commitsModule, statsModule] = await Promise.all([
      import("../../../../../../../data/commits.mjs"),
      import("../../../../../../../data/overtime-stats.mjs"),
    ]);
    const commits = commitsModule.default || [];
    const stats = statsModule.default || {};
    return { commits, stats };
  } catch (err) {
    console.error('Load data failed', err);
    return { commits: [], stats: {} };
  }
}

function renderCommitsTable(commits) {
  const tbody = document.querySelector('#commitsTable tbody');
  tbody.innerHTML = '';
  commits.forEach((c) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${c.hash.slice(0, 8)}</td><td>${c.author}</td><td>${formatDate(c.date)}</td><td>${c.message}</td>`;
    tbody.appendChild(tr);
  });
}

function drawHourlyOvertime(stats) {
  const ctx = document.getElementById('hourlyOvertimeChart').getContext('2d');
  const data = stats.hourlyOvertimeCommits || [];
  const labels = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Overtime commits', data }] },
    options: { responsive: true }
  });
}

function drawOutsideVsInside(stats) {
  const ctx = document.getElementById('outsideVsInsideChart').getContext('2d');
  const outside = stats.outsideWorkCount || 0;
  const total = stats.total || 0;
  const inside = Math.max(0, total - outside);
  new Chart(ctx, {
    type: 'pie',
    data: { labels: ['Inside work', 'Outside work'], datasets: [{ data: [inside, outside], backgroundColor: ['#36a2eb', '#ff6384'] }] },
  });
}

function drawDailyTrend(commits) {
  // group by day
  const map = new Map();
  commits.forEach((c) => {
    const d = new Date(c.date).toISOString().slice(0, 10);
    map.set(d, (map.get(d) || 0) + 1);
  });
  const labels = Array.from(map.keys()).sort();
  const data = labels.map(l => map.get(l));
  const ctx = document.getElementById('dailyTrendChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Commits per day', data, fill: true, tension: 0.3 }] },
  });
}

(async function main() {
  const { commits, stats } = await loadData();
  renderCommitsTable(commits);
  drawHourlyOvertime(stats);
  drawOutsideVsInside(stats);
  drawDailyTrend(commits);
})();
