/* eslint-disable import/no-absolute-path */
const formatDate = (d) => new Date(d).toLocaleString()

async function loadData() {
  try {
    const [
      commitsModule,
      statsModule,
      weeklyModule,
      monthlyModule,
      latestByDayModule,
      configModule
    ] = await Promise.all([
      import('/data/commits.mjs'),
      import('/data/overtime-stats.mjs'),
      import('/data/overtime-weekly.mjs'),
      import('/data/overtime-monthly.mjs').catch(() => ({ default: [] })),
      import('/data/overtime-latest-by-day.mjs').catch(() => ({ default: [] })),
      import('/data/config.mjs').catch(() => ({ default: {} }))
    ])
    const commits = commitsModule.default || []
    const stats = statsModule.default || {}
    const weekly = weeklyModule.default || []
    const monthly = monthlyModule.default || []
    const latestByDay = latestByDayModule.default || []
    const config = configModule.default || {}
    return { commits, stats, weekly, monthly, latestByDay, config }
  } catch (err) {
    console.error('Load data failed', err)
    return { commits: [], stats: {}, weekly: [], monthly: [], latestByDay: [] }
  }
}

let commitsAll = []
let filtered = []
let page = 1
let pageSize = 10

function renderCommitsTablePage() {
  const tbody = document.querySelector('#commitsTable tbody')
  tbody.innerHTML = ''
  const start = (page - 1) * pageSize
  const end = start + pageSize
  filtered.slice(start, end).forEach((c) => {
    const tr = document.createElement('tr')
    tr.innerHTML = `<td>${c.hash.slice(0, 8)}</td><td>${c.author}</td><td>${formatDate(c.date)}</td><td>${c.message}</td>`
    tbody.appendChild(tr)
  })
}

function updatePager() {
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  if (page > totalPages) page = totalPages
  const pageInfo = document.getElementById('pageInfo')
  pageInfo.textContent = `${page} / ${totalPages}`
  document.getElementById('prevPage').disabled = page <= 1
  document.getElementById('nextPage').disabled = page >= totalPages
}

function applySearch() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase()
  if (!q) {
    filtered = commitsAll.slice()
  } else {
    filtered = commitsAll.filter((c) => {
      const h = c.hash.toLowerCase()
      const a = String(c.author || '').toLowerCase()
      const m = String(c.message || '').toLowerCase()
      const d = formatDate(c.date).toLowerCase()
      return h.includes(q) || a.includes(q) || m.includes(q) || d.includes(q)
    })
  }
  page = 1
  updatePager()
  renderCommitsTablePage()
}

function initTableControls() {
  document.getElementById('searchInput').addEventListener('input', applySearch)
  document.getElementById('pageSize').addEventListener('change', (e) => {
    pageSize = parseInt(e.target.value, 10) || 10
    page = 1
    updatePager()
    renderCommitsTablePage()
  })
  document.getElementById('prevPage').addEventListener('click', () => {
    if (page > 1) {
      page -= 1
      updatePager()
      renderCommitsTablePage()
    }
  })
  document.getElementById('nextPage').addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    if (page < totalPages) {
      page += 1
      updatePager()
      renderCommitsTablePage()
    }
  })
}

function drawHourlyOvertime(stats) {
  const el = document.getElementById('hourlyOvertimeChart')
  // eslint-disable-next-line no-undef
  const chart = echarts.init(el)
  const data = stats.hourlyOvertimeCommits || []
  const labels = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, '0')
  )
  chart.setOption({
    tooltip: {},
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', name: 'Overtime commits', data }]
  })
  return chart
}

function drawOutsideVsInside(stats) {
  const el = document.getElementById('outsideVsInsideChart')
  // eslint-disable-next-line no-undef
  const chart = echarts.init(el)
  const outside = stats.outsideWorkCount || 0
  const total = stats.total || 0
  const inside = Math.max(0, total - outside)
  chart.setOption({
    tooltip: {},
    series: [
      {
        type: 'pie',
        radius: '55%',
        data: [
          { value: inside, name: '工作时间内' },
          { value: outside, name: '下班时间' }
        ]
      }
    ]
  })
  return chart
}

function drawDailyTrend(commits) {
  const map = new Map()
  commits.forEach((c) => {
    const d = new Date(c.date).toISOString().slice(0, 10)
    map.set(d, (map.get(d) || 0) + 1)
  })
  const labels = Array.from(map.keys()).sort()
  const data = labels.map((l) => map.get(l))
  const el = document.getElementById('dailyTrendChart')
  // eslint-disable-next-line no-undef
  const chart = echarts.init(el)
  chart.setOption({
    tooltip: {},
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value' },
    series: [{ type: 'line', name: '每日提交', data, areaStyle: {} }]
  })
  return chart
}

function drawWeeklyTrend(weekly) {
  const labels = weekly.map((w) => w.period)
  const dataRate = weekly.map((w) => +(w.outsideWorkRate * 100).toFixed(1))
  const dataCount = weekly.map((w) => w.outsideWorkCount)
  const el = document.getElementById('weeklyTrendChart')
  // eslint-disable-next-line no-undef
  const chart = echarts.init(el)
  chart.setOption({
    tooltip: {},
    xAxis: { type: 'category', data: labels },
    yAxis: [{ type: 'value', min: 0, max: 100 }, { type: 'value' }],
    series: [
      { type: 'line', name: '加班占比(%)', data: dataRate, yAxisIndex: 0 },
      { type: 'line', name: '加班次数', data: dataCount, yAxisIndex: 1 }
    ]
  })
  return chart
}

function drawMonthlyTrend(monthly) {
  if (!Array.isArray(monthly) || monthly.length === 0) return null
  const labels = monthly.map((m) => m.period)
  const dataRate = monthly.map((m) => +(m.outsideWorkRate * 100).toFixed(1))
  const el = document.getElementById('monthlyTrendChart')
  // eslint-disable-next-line no-undef
  const chart = echarts.init(el)
  chart.setOption({
    tooltip: {},
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value', min: 0, max: 100 },
    series: [{ type: 'line', name: '加班占比(%)', data: dataRate }]
  })
  return chart
}

function drawLatestHourDaily(latestByDay) {
  if (!Array.isArray(latestByDay) || latestByDay.length === 0) return null

  const labels = latestByDay.map((d) => d.date)

  const raw = latestByDay.map((d) =>
    typeof d.latestHourNormalized === 'number'
      ? d.latestHourNormalized
      : (d.latestHour ?? null)
  )

  // 数据点颜色
  const data = raw.map((v) => ({
    value: v,
    itemStyle: {
      color:
        v >= 20
          ? '#d32f2f' // 红
          : v >= 19
            ? '#fb8c00' // 橙
            : '#1976d2' // 蓝
    }
  }))

  // 获取最大值，用于设置 yAxis 的 max
  const numericValues = raw.filter((v) => typeof v === 'number')
  const maxV = numericValues.length > 0 ? Math.max(...numericValues) : 0

  const el = document.getElementById('latestHourDailyChart')
  const chart = echarts.init(el)

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params
        const v = p?.value != null ? Number(p.value) : null
        const endH = window.__overtimeEndHour || 18
        const sev = v != null ? Math.max(0, v - endH) : 0
        return `${p.axisValue}<br/>最晚小时: ${v != null ? v : '-'}<br/>超过下班: ${sev} 小时`
      }
    },
    xAxis: { type: 'category', data: labels },
    yAxis: {
      type: 'value',
      min: 0,
      max: Math.max(26, Math.ceil(maxV + 1))
    },
    series: [
      {
        type: 'line',
        name: '每日最晚提交小时',
        data,
        markLine: {
          symbol: ['none', 'arrow'],
          data: [
            // 20 小时线（橙色）
            {
              yAxis: 19,
              lineStyle: {
                color: '#fb8c00',
                width: 2,
                type: 'solid'
              },
              label: {
                formatter: '21h',
                color: '#fb8c00'
              }
            },
            // 21 小时线（红色）
            {
              yAxis: 20,
              lineStyle: {
                color: '#d32f2f',
                width: 2,
                type: 'solid'
              },
              label: {
                formatter: '24h',
                color: '#d32f2f'
              }
            }
          ]
        }
      }
    ]
  })

  return chart
}

function drawDailySeverity(latestByDay) {
  if (!Array.isArray(latestByDay) || latestByDay.length === 0) return null;

  const labels = latestByDay.map((d) => d.date);
  const endH = window.__overtimeEndHour || 18;

  const raw = latestByDay.map((d) =>
    typeof d.latestHourNormalized === 'number'
      ? d.latestHourNormalized
      : (d.latestHour ?? null)
  );

  // 计算超过下班的小时数
  const sev = raw.map((v) => (v == null ? null : Math.max(0, Number(v) - endH)));

  const el = document.getElementById('dailySeverityChart');
  const chart = echarts.init(el);

  chart.setOption({
    tooltip: {},
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value', min: 0 },
    series: [
      {
        type: 'line',
        name: '超过下班小时数',
        data: sev,
        markLine: {
          symbol: ['none', 'arrow'],
          data: [
            // 1h —— 橙色
            {
              yAxis: 1,
              lineStyle: {
                color: '#fb8c00',
                width: 2,
                type: 'dashed'
              },
              label: {
                formatter: '1h',
                color: '#fb8c00'
              }
            },
            // 2h —— 红色
            {
              yAxis: 2,
              lineStyle: {
                color: '#d32f2f',
                width: 2,
                type: 'dashed'
              },
              label: {
                formatter: '2h',
                color: '#d32f2f'
              }
            }
          ]
        }
      }
    ]
  });

  return chart;
}


function renderKpi(stats) {
  const el = document.getElementById('kpiContent')
  if (!el || !stats) return
  const latest = stats.latestCommit
  const latestHour = stats.latestCommitHour
  const latestOut = stats.latestOutsideCommit
  const latestOutHour =
    stats.latestOutsideCommitHour ??
    (latestOut ? new Date(latestOut.date).getHours() : null)
  const cutoff = window.__overnightCutoff ?? 6
  const html = [
    `<div>最晚一次提交时间：${latest ? formatDate(latest.date) : '-'}${typeof latestHour === 'number' ? `（${String(latestHour).padStart(2, '0')}:00）` : ''}</div>`,
    `<div>加班最晚一次提交时间：${latestOut ? formatDate(latestOut.date) : '-'}${typeof latestOutHour === 'number' ? `（${String(latestOutHour).padStart(2, '0')}:00）` : ''}</div>`,
    `<div>次日归并窗口：凌晨 <b>${cutoff}</b> 点内归前一日</div>`
  ].join('')
  el.innerHTML = html
}

;(async function main() {
  const { commits, stats, weekly, monthly, latestByDay, config } =
    await loadData()
  commitsAll = commits
  filtered = commitsAll.slice()
  window.__overtimeEndHour =
    stats && typeof stats.endHour === 'number'
      ? stats.endHour
      : (config.endHour ?? 18)
  window.__overnightCutoff =
    typeof config.overnightCutoff === 'number' ? config.overnightCutoff : 6
  initTableControls()
  updatePager()
  renderCommitsTablePage()
  drawHourlyOvertime(stats)
  drawOutsideVsInside(stats)
  drawDailyTrend(commits)
  drawWeeklyTrend(weekly)
  drawMonthlyTrend(monthly)
  drawLatestHourDaily(latestByDay)
  drawDailySeverity(latestByDay)
  renderKpi(stats)
})()
