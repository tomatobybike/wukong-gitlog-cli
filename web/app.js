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

function drawHourlyOvertime(stats, onHourClick) {
  const el = document.getElementById('hourlyOvertimeChart')
  const chart = echarts.init(el)

  const commits = stats.hourlyOvertimeCommits || []
  const percent = stats.hourlyOvertimePercent || []
  const labels = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, '0')
  )

  // 颜色逻辑（与 daily severity 风格一致）
  function getColor(h) {
    if (h >= 21) return '#d32f2f' // 深夜加班 红
    if (h >= 19) return '#fb8c00' // 夜间加班 橙
    if (h >= stats.lunchStart && h < stats.lunchEnd) return '#888888' // 午休灰
    if (h >= stats.startHour && h < stats.endHour) return '#1976d2' // 工作时段 蓝
    return '#b71c1c' // 凌晨 红
  }

  const data = commits.map((v, h) => ({
    value: v,
    itemStyle: { color: getColor(h) }
  }))

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter(params) {
        const p = params[0]
        const h = parseInt(p.axisValue, 10)
        const count = p.value
        const rate = (percent[h] * 100).toFixed(1)
        return `
          🕒 <b>${h}:00</b><br/>
          提交次数：<b>${count}</b><br/>
          占全天比例：<b>${rate}%</b>
        `
      }
    },

    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: '#555' }
    },

    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: { color: '#555' }
    },

    grid: { left: 40, right: 30, top: 20, bottom: 40 },

    series: [
      {
        type: 'bar',
        name: 'Overtime commits',
        data,
        barWidth: 18,

        markPoint: {
          symbol: 'pin',
          symbolSize: 45,
          itemStyle: { color: '#d32f2f' },
          data: [
            {
              name: '最晚提交',
              coord: [
                String(stats.latestCommitHour).padStart(2, '0'),
                commits[stats.latestCommitHour]
              ]
            }
          ]
        },

        markLine: {
          symbol: 'none',
          animation: true,
          label: { color: '#888', formatter: '{b}' },
          lineStyle: { type: 'dashed', color: '#aaa' },
          data: [
            {
              name: '上班开始',
              nameValue: String(stats.startHour).padStart(2, '0'),
              xAxis: String(stats.startHour).padStart(2, '0')
            },
            {
              name: '下班时间',
              nameValue: String(stats.endHour).padStart(2, '0'),
              xAxis: String(stats.endHour).padStart(2, '0')
            },
            {
              name: '午休开始',
              nameValue: String(stats.lunchStart).padStart(2, '0'),
              xAxis: String(stats.lunchStart).padStart(2, '0')
            },
            {
              name: '午休结束',
              nameValue: String(stats.lunchEnd).padStart(2, '0'),
              xAxis: String(stats.lunchEnd).padStart(2, '0')
            }
          ]
        }
      }
    ]
  })

  // 点击事件（点击某小时 → 打开侧栏）
  if (typeof onHourClick === 'function') {
    chart.on('click', (p) => {
      let hour = Number(p.name)
      if(p.componentType === 'markLine') {
        hour = Number(p.data.xAxis)
      }
      // FIXME: remove debug log before production
      console.log('❌', 'hour', hour, p)
      document.getElementById('dayDetailSidebar').classList.remove('show')
      if (Object.is(hour, NaN)) return
      onHourClick(hour, commits[hour])
    })
  }

  return chart
}

// showSideBarForHour 实现
function showSideBarForHour(hour, commitsOrCount) {
  // 支持传入 number（仅次数）或 array（详细 commit 列表）
  // 统一复用通用详情侧栏 DOM
  const sidebar = document.getElementById('dayDetailSidebar')
  const backdrop = document.getElementById('sidebarBackdrop')
  const titleEl = document.getElementById('sidebarTitle')
  const contentEl = document.getElementById('sidebarContent')

  // 兼容未传入侧栏 DOM 的情况（优雅降级）
  if (!sidebar || !titleEl || !contentEl) {
    console.warn(
      'hourDetailSidebar DOM not found. Please add the HTML snippet.'
    )
    return
  }

  titleEl.innerHTML = `🕒 ${String(hour).padStart(2, '0')}:00 - ${String(hour).padStart(2, '0')}:59`

  // 如果只是 number，显示计数
  if (typeof commitsOrCount === 'number') {
    contentEl.innerHTML = `<div style="font-size:14px;">提交次数：<b>${commitsOrCount}</b></div>`
  } else if (Array.isArray(commitsOrCount) && commitsOrCount.length === 0) {
    contentEl.innerHTML = `<div style="font-size:14px;">当小时无提交记录</div>`
  } else if (Array.isArray(commitsOrCount)) {
    // commits 列表：展示作者/时间/消息（最多前 50 条，避免性能问题）
    const commits = commitsOrCount.slice(0, 50)
    contentEl.innerHTML = commits
      .map((c) => {
        const author = c.author ?? c.name ?? 'unknown'
        const time = c.date ?? c.time ?? ''
        const msg = (c.message ?? c.msg ?? c.body ?? '').replace(/\n/g, ' ')
        return `
        <div class="hour-commit">
          <div class="meta">👤 <b>${escapeHtml(author)}</b> · 🕒 ${escapeHtml(time)}</div>
          <div class="msg">${escapeHtml(msg)}</div>
        </div>
      `
      })
      .join('')

    if (commitsOrCount.length > 50) {
      const more = commitsOrCount.length - 50
      contentEl.innerHTML += `<div style="color:#888; padding:8px 0">另外 ${more} 条已省略</div>`
    }
  } else {
    contentEl.innerHTML = `<div style="font-size:14px;">无可展示数据</div>`
  }

  // 打开侧栏 + 遮罩
  sidebar.classList.add('show')
  if (backdrop) backdrop.classList.add('show')
}

// 简单的 HTML 转义，防止 XSS 与布局断裂
function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
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

function drawDailyTrend(commits, onDayClick) {
  if (!Array.isArray(commits) || commits.length === 0) return null

  // 聚合每日提交数量
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
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = params?.[0]
        if (!p) return ''

        const date = p.axisValue
        const count = p.data

        // 分级说明
        let level = '🟢 正常（≤5 次）'
        if (count > 5 && count < 10) level = '🟠 较高频（6–10 次）'
        if (count >= 10) level = '🔴 高频（≥10 次）'

        return `
          <div style="font-size:13px; line-height:1.5;">
            <b>${date}</b><br/>
            提交次数：<b>${count}</b><br/>
            等级：${level}
          </div>
        `
      }
    },

    xAxis: { type: 'category', data: labels },

    yAxis: { type: 'value', min: 0 },

    series: [
      {
        type: 'line',
        name: '每日提交',
        data,

        smooth: true,

        // ⭐ area 渐变背景
        areaStyle: {
          opacity: 0.2
        },

        // ⭐ 背景区间（低 / 中 / 高频）
        markArea: {
          data: [
            [
              { yAxis: 0 },
              { yAxis: 5, itemStyle: { color: 'rgba(76, 175, 80, 0.12)' } } // 绿
            ],
            [
              { yAxis: 5 },
              { yAxis: 10, itemStyle: { color: 'rgba(251, 140, 0, 0.12)' } } // 橙
            ],
            [
              { yAxis: 10 },
              { yAxis: 50, itemStyle: { color: 'rgba(211, 47, 47, 0.12)' } } // 红
            ]
          ]
        },

        // ⭐ 阈值线
        markLine: {
          symbol: ['none', 'arrow'],
          data: [
            {
              yAxis: 5,
              lineStyle: { color: '#fb8c00', width: 2, type: 'dashed' },
              label: { formatter: '5 次', color: '#fb8c00' }
            },
            {
              yAxis: 10,
              lineStyle: { color: '#d32f2f', width: 2, type: 'dashed' },
              label: { formatter: '10 次', color: '#d32f2f' }
            }
          ]
        }
      }
    ]
  })

  // 点击某一天，打开抽屉显示当日 commits
  if (typeof onDayClick === 'function') {
    chart.on('click', (params) => {
      const idx = params.dataIndex
      const date = labels[idx]
      const count = data[idx]
      const dayCommits = commits.filter(
        (c) => new Date(c.date).toISOString().slice(0, 10) === date
      )
      onDayClick(date, count, dayCommits)
    })
  }

  return chart
}

function showSideBarForWeek(period, weeklyItem, commits = []) {
  // 统一复用通用详情侧栏 DOM
  const sidebar = document.getElementById('dayDetailSidebar')
  const backdrop = document.getElementById('sidebarBackdrop')
  const titleEl = document.getElementById('sidebarTitle')
  const contentEl = document.getElementById('sidebarContent')

  titleEl.innerHTML = `📅 周期：<b>${period}</b>`

  let html = `
    <div style="padding:6px 0;">
      加班次数：<b>${weeklyItem.outsideWorkCount}</b><br/>
      占比：<b>${(weeklyItem.outsideWorkRate * 100).toFixed(1)}%</b>
    </div>
    <hr/>
  `

  if (!commits.length) {
    html += `<div style="padding:10px;color:#777;">该周无提交记录</div>`
  } else {
    html += commits
      .map((c) => {
        return `
          <div class="week-commit">
            <div class="meta">👤 <b>${escapeHtml(c.author || 'unknown')}</b> · 🕒 ${
              c.date
            }</div>
            <div class="msg">${escapeHtml((c.message || '').replace(/\n/g, ' '))}</div>
          </div>
        `
      })
      .join('')
  }

  contentEl.innerHTML = html
  sidebar.classList.add('show')
  if (backdrop) backdrop.classList.add('show')
}

function drawWeeklyTrend(weekly, commits, onWeekClick) {
  if (!Array.isArray(weekly) || weekly.length === 0) return null

  const labels = weekly.map((w) => w.period)
  const dataRate = weekly.map((w) => +(w.outsideWorkRate * 100).toFixed(1)) // %
  const dataCount = weekly.map((w) => w.outsideWorkCount)

  const el = document.getElementById('weeklyTrendChart')
  const chart = echarts.init(el)

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const pp = params[0]
        const weekItem = weekly[pp.dataIndex]
        const { start, end } = weekItem.range

        const rate = params.find((p) => p.seriesName.includes('%'))?.data
        const count = params.find((p) => p.seriesName.includes('次数'))?.data

        // 加班等级
        let level = '🟢 健康（<10%）'
        if (rate >= 10 && rate < 20) level = '🟠 中度（10–20%）'
        if (rate >= 20) level = '🔴 严重（≥20%）'

        return `
          <div style="font-size:13px; line-height:1.5;">
            <b>${params[0].axisValue}</b><br/>
            📅 周区间：<b>${start} ~ ${end}</b><br/>
            加班占比：<b>${rate}%</b><br/>
            加班次数：${count} 次<br/>
            等级：${level}
          </div>
        `
      }
    },

    legend: { top: 10 },

    xAxis: { type: 'category', data: labels },
    yAxis: [
      { type: 'value', min: 0, max: 100, name: '占比(%)' },
      { type: 'value', name: '次数', min: 0 }
    ],

    series: [
      {
        type: 'line',
        name: '加班占比(%)',
        data: dataRate,
        markArea: {
          data: [
            [
              { yAxis: 0 },
              { yAxis: 10, itemStyle: { color: 'rgba(76, 175, 80, 0.15)' } }
            ],
            [
              { yAxis: 10 },
              { yAxis: 20, itemStyle: { color: 'rgba(251, 140, 0, 0.15)' } }
            ],
            [
              { yAxis: 20 },
              { yAxis: 100, itemStyle: { color: 'rgba(211, 47, 47, 0.15)' } }
            ]
          ]
        },
        markLine: {
          symbol: ['none', 'arrow'],
          data: [
            {
              yAxis: 10,
              lineStyle: { color: '#fb8c00', width: 2, type: 'dashed' },
              label: { formatter: '10%', color: '#fb8c00' }
            },
            {
              yAxis: 20,
              lineStyle: { color: '#d32f2f', width: 2, type: 'dashed' },
              label: { formatter: '20%', color: '#d32f2f' }
            }
          ]
        }
      },

      {
        type: 'line',
        name: '加班次数',
        data: dataCount,
        yAxisIndex: 1,
        smooth: true
      }
    ]
  })

  // ⭐ 点击事件：从 commits 过滤该周提交
  chart.on('click', (p) => {
    const idx = p.dataIndex
    const w = weekly[idx]

    const start = new Date(w.range.start)
    const end = new Date(w.range.end)
    end.setHours(23, 59, 59, 999) // 包含当天

    const weeklyCommits = commits.filter((c) => {
      const d = new Date(c.date)
      return d >= start && d <= end
    })

    // 回调交给外面决定如何打开侧栏
    if (typeof onWeekClick === 'function') {
      onWeekClick(w.period, w, weeklyCommits)
    }
  })

  return chart
}

function drawMonthlyTrend(monthly, commits, onMonthClick) {
  if (!Array.isArray(monthly) || monthly.length === 0) return null

  const labels = monthly.map((m) => m.period)
  const dataRate = monthly.map((m) => +(m.outsideWorkRate * 100).toFixed(1)) // 0–100%

  const el = document.getElementById('monthlyTrendChart')
  // eslint-disable-next-line no-undef
  const chart = echarts.init(el)

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = params[0]
        if (!p) return ''

        const rate = p.data
        let level = '🟢 健康（<10%）'
        if (rate >= 10 && rate < 20) level = '🟠 中度（10–20%）'
        if (rate >= 20) level = '🔴 严重（≥20%）'

        return `
          <div style="font-size:13px; line-height:1.5">
            <b>${p.axisValue}</b><br/>
            加班占比：<b>${rate}%</b><br/>
            加班等级：${level}
          </div>
        `
      }
    },

    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value', min: 0, max: 100 },

    series: [
      {
        type: 'line',
        name: '加班占比(%)',
        data: dataRate,

        // ⭐ 区间背景（可配置）
        markArea: {
          data: [
            // <10% 绿色轻度
            [
              { yAxis: 0 },
              { yAxis: 10, itemStyle: { color: 'rgba(76, 175, 80, 0.15)' } }
            ],
            // 10–20% 橙色中度
            [
              { yAxis: 10 },
              { yAxis: 20, itemStyle: { color: 'rgba(251, 140, 0, 0.15)' } }
            ],
            // ≥20% 红色严重
            [
              { yAxis: 20 },
              { yAxis: 100, itemStyle: { color: 'rgba(211, 47, 47, 0.15)' } }
            ]
          ]
        },

        // ⭐ 阈值线（同每日图风格）
        markLine: {
          symbol: ['none', 'arrow'],
          data: [
            {
              yAxis: 10,
              lineStyle: {
                color: '#fb8c00',
                width: 2,
                type: 'dashed'
              },
              label: {
                formatter: '10%',
                color: '#fb8c00'
              }
            },
            {
              yAxis: 20,
              lineStyle: {
                color: '#d32f2f',
                width: 2,
                type: 'dashed'
              },
              label: {
                formatter: '20%',
                color: '#d32f2f'
              }
            }
          ]
        }
      }
    ]
  })

  // 点击某个月份，打开抽屉显示该月的所有 commits
  if (typeof onMonthClick === 'function' && Array.isArray(commits)) {
    chart.on('click', (params) => {
      const idx = params.dataIndex
      const ym = labels[idx] // 'YYYY-MM'
      const monthCommits = commits.filter((c) => {
        const d = new Date(c.date)
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          '0'
        )}`
        return m === ym
      })
      onMonthClick(ym, monthCommits.length, monthCommits)
    })
  }

  return chart
}

function drawLatestHourDaily(latestByDay, commits, onDayClick) {
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
        // eslint-disable-next-line no-nested-ternary
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
  // eslint-disable-next-line no-undef
  const chart = echarts.init(el)

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params
        const v = p?.value != null ? Number(p.value) : null
        const endH = window.__overtimeEndHour || 18

        if (v == null) {
          return `
        <div style="font-size:13px; line-height:1.5">
          <b>${p.axisValue}</b><br/>
          无数据
        </div>
      `
        }

        const overtime = Math.max(0, v - endH)
        const overtimeText = overtime.toFixed(2)

        let level = '🟢 正常（无明显加班）'
        if (overtime >= 1 && overtime < 2) level = '🟠 中度加班（1–2h）'
        if (overtime >= 2) level = '🔴 严重加班（≥2h）'

        return `
      <div style="font-size:13px; line-height:1.5">
        <b>${p.axisValue}</b><br/>
        最晚提交时间：<b>${v.toFixed(2)} 点</b><br/>
        超出下班：<b>${overtimeText} 小时</b><br/>
        加班等级：${level}
      </div>
    `
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
        // 让折线在 null 点之间连起来，避免视觉上“断裂”
        connectNulls: true,
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

  // 点击某一天的最晚提交时间点，打开抽屉显示该日 commits
  if (typeof onDayClick === 'function' && Array.isArray(commits)) {
    // 预聚合：按天收集 commits
    const dayCommitsMap = {}
    commits.forEach((c) => {
      const d = new Date(c.date).toISOString().slice(0, 10)
      if (!dayCommitsMap[d]) dayCommitsMap[d] = []
      dayCommitsMap[d].push(c)
    })

    chart.on('click', (params) => {
      const idx = params.dataIndex
      const date = labels[idx]
      const list = dayCommitsMap[date] || []
      onDayClick(date, list.length, list)
    })
  }

  return chart
}

function drawDailySeverity(latestByDay, commits, onDayClick) {
  if (!Array.isArray(latestByDay) || latestByDay.length === 0) return null

  const labels = latestByDay.map((d) => d.date)
  const endH = window.__overtimeEndHour || 18

  const raw = latestByDay.map((d) =>
    typeof d.latestHourNormalized === 'number'
      ? d.latestHourNormalized
      : (d.latestHour ?? null)
  )

  // 若某天 latestHourNormalized 为空，表示「没有下班后到次日上班前的提交」，
  // 这里按 0 小时加班处理，保证折线连续。
  const sev = raw.map((v) => (v == null ? 0 : Math.max(0, Number(v) - endH)))

  const el = document.getElementById('dailySeverityChart')
  // eslint-disable-next-line no-undef
  const chart = echarts.init(el)

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = params[0]
        if (!p) return ''
        const date = p.axisValue
        const overtime = p.data
        const rawHour = raw[p.dataIndex] // 原始 latestHour 或 latestHourNormalized

        return `
      <div style="font-size:13px;">
        <b>${date}</b><br/>
        下班后：<b>${overtime.toFixed(2)} 小时</b><br/>
        原始最晚提交：${rawHour != null ? `${rawHour.toFixed(2)} 点` : '无'}<br/>
        加班等级：${
          // eslint-disable-next-line no-nested-ternary
          overtime < 1
            ? '🟢 0–1 小时（轻度）'
            : overtime < 2
              ? '🟠 1–2 小时（中度）'
              : '🔴 ≥2 小时（严重）'
        }
      </div>
    `
      }
    },

    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value', min: 0 },

    series: [
      {
        type: 'line',
        name: '超过下班小时数',
        data: sev,
        // 连续显示 0 小时加班的日期，避免折线断开
        connectNulls: true,

        // ⭐ 加班区域背景
        markArea: {
          data: [
            // 0–1h：透明
            [{ yAxis: 0 }, { yAxis: 1, itemStyle: { color: 'rgba(0,0,0,0)' } }],
            // 1–2h：半透明橙色
            [
              { yAxis: 1 },
              { yAxis: 2, itemStyle: { color: 'rgba(251, 140, 0, 0.15)' } } // #fb8c00
            ],
            // ≥2h：半透明红色
            [
              { yAxis: 2 },
              { yAxis: 10, itemStyle: { color: 'rgba(211, 47, 47, 0.15)' } } // #d32f2f
            ]
          ]
        },

        // ⭐ 超时阈值标线
        markLine: {
          symbol: ['none', 'arrow'],
          data: [
            {
              yAxis: 1,
              lineStyle: {
                color: '#fb8c00',
                width: 2,
                type: 'dashed'
              },
              label: { formatter: '1h', color: '#fb8c00' }
            },
            {
              yAxis: 2,
              lineStyle: {
                color: '#d32f2f',
                width: 2,
                type: 'dashed'
              },
              label: { formatter: '2h', color: '#d32f2f' }
            }
          ]
        }
      }
    ]
  })

  // 点击某一天的「超过下班小时数」点，打开抽屉显示该日 commits
  if (typeof onDayClick === 'function' && Array.isArray(commits)) {
    const dayCommitsMap = {}
    commits.forEach((c) => {
      const d = new Date(c.date).toISOString().slice(0, 10)
      if (!dayCommitsMap[d]) dayCommitsMap[d] = []
      dayCommitsMap[d].push(c)
    })

    chart.on('click', (params) => {
      const idx = params.dataIndex
      const date = labels[idx]
      const list = dayCommitsMap[date] || []
      onDayClick(date, list.length, list)
    })
  }

  return chart
}

/**
 * 绘制每日趋势（带加班严重度背景区间）并自动分析最累的日期
 * @param {Array} commits - 原始提交记录（包含 c.date）
 * @param {Function} onDayClick - 用户点击某一天时的回调 (date, count) => void
 */
/**
 * 绘制每日趋势（含严重度背景区间、最累标记、tooltip 明细）
 */
function drawDailyTrendSeverity(commits, weekly, onDayClick) {
  // ---------- 1. 聚合每日数据 ----------
  const dayMap = new Map()
  const dayCommitsDetail = {}

  commits.forEach((c) => {
    const d = new Date(c.date).toISOString().slice(0, 10)

    // 数量统计
    dayMap.set(d, (dayMap.get(d) || 0) + 1)

    // 详细信息统计（用于 tooltip 显示）
    if (!dayCommitsDetail[d]) dayCommitsDetail[d] = []
    dayCommitsDetail[d].push({
      author: c.author,
      time: c.date,
      msg: c.message
    })
  })

  const labels = Array.from(dayMap.keys()).sort()
  const data = labels.map((l) => dayMap.get(l))

  // ---------- 2. 自动分析「最累的一天」 ----------
  const maxDailyCount = Math.max(...data)
  const maxDailyIndex = data.indexOf(maxDailyCount)
  const mostTiredDay = labels[maxDailyIndex]

  document.getElementById('mostTiredDay').innerHTML =
    `🔥 最累的一天：<b>${mostTiredDay}</b>（${maxDailyCount} 次提交）`

  // ---------- 3. 自动分析「最累的一周」 ----------
  let maxWeek = null
  if (Array.isArray(weekly)) {
    maxWeek = weekly.reduce((a, b) =>
      a.outsideWorkCount > b.outsideWorkCount ? a : b
    )
    if (maxWeek) {
      document.getElementById('mostTiredWeek').innerHTML =
        `🔥 最累的一周：<b>${maxWeek.period}</b>（${maxWeek.outsideWorkCount} 次加班）`
    }
  }

  // ---------- 4. 自动分析「最累的月份」 ----------
  const monthMap = new Map()
  commits.forEach((c) => {
    const d = new Date(c.date)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap.set(ym, (monthMap.get(ym) || 0) + 1)
  })

  const mostTiredMonth = Array.from(monthMap.entries()).sort(
    (a, b) => b[1] - a[1]
  )[0]

  document.getElementById('mostTiredMonth').innerHTML =
    `🔥 最累的月份：<b>${mostTiredMonth[0]}</b>（${mostTiredMonth[1]} 次提交）`

  // ---------- 5. 背景严重度区块 ----------
  const markArea = {
    silent: true,
    itemStyle: { opacity: 0.15 },
    data: [
      [{ name: '0–1 小时', yAxis: 0 }, { yAxis: 1 }],
      [
        { name: '1–2 小时', yAxis: 1 },
        { yAxis: 2, itemStyle: { color: 'orange', opacity: 0.25 } }
      ],
      [
        { name: '2 小时以上', yAxis: 2 },
        { yAxis: 999, itemStyle: { color: 'red', opacity: 0.25 } }
      ]
    ]
  }

  // ---------- 6. 构造 tooltip ----------
  const tooltipFormatter = (params) => {
    const date = params?.[0].name
    const count = params?.[0].value
    const details = dayCommitsDetail[date] || []

    let html = `📅 <b>${date}</b><br/>提交次数：${count}<br/><br/>`

    details.slice(0, 5).forEach((d) => {
      html += `👤 ${d.author}<br/>🕒 ${d.time}<br/>💬 ${d.msg}<br/><br/>`
    })

    if (details.length > 5) {
      html += `（其余 ${details.length - 5} 条已省略）`
    }

    return html
  }

  // ---------- 7. 绘图 ----------
  const el = document.getElementById('dailyTrendChartDog')
  const chart = echarts.init(el)

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: tooltipFormatter,
      axisPointer: { type: 'shadow' }
    },
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value', min: 0 },
    series: [
      {
        type: 'line',
        name: '每日提交',
        data,
        areaStyle: {},
        markArea,
        markPoint: {
          data: [
            {
              name: '最累的一天',
              coord: [mostTiredDay, maxDailyCount],
              value: maxDailyCount,
              symbolSize: 70,
              itemStyle: { color: '#ff4d4f' },
              label: { formatter: '🔥 最累' }
            }
          ]
        }
      }
    ]
  })

  // ---------- 8. 点击事件 ----------
  if (typeof onDayClick === 'function') {
    chart.on('click', (params) => {
      if (params.componentType === 'series') {
        const date = labels[params.dataIndex]
        const count = data[params.dataIndex]
        onDayClick(date, count, dayCommitsDetail[date])
      }
    })
  }

  return {
    chart,
    analysis: {
      mostTiredDay,
      mostTiredMonth,
      mostTiredWeek: maxWeek
    }
  }
}

function showDayDetailSidebar(date, count, commits) {
  const sidebar = document.getElementById('dayDetailSidebar')
  const backdrop = document.getElementById('sidebarBackdrop')
  const title = document.getElementById('sidebarTitle')
  const content = document.getElementById('sidebarContent')

  title.innerHTML = `📅 ${date}（${count} 次提交）`

  // 渲染详情
  content.innerHTML = commits
    .map(
      (c) => `
    <div style="margin-bottom:12px;">
      <div>👤 <b>${c.author}</b></div>
      <div>🕒 ${c.time || c.date}</div>
      <div>💬 ${c.msg || c.message}</div>
    </div>
    <hr/>
  `
    )
    .join('')

  sidebar.classList.add('show')
  if (backdrop) backdrop.classList.add('show')
}

function renderKpi(stats) {
  const el = document.getElementById('kpiContent')
  if (!el || !stats) return
  const latest = stats.latestCommit
  const latestHour = stats.latestCommitHour

  // 使用 cutoff + 上下班时间，重新在全部 commits 中计算「加班最晚一次提交」
  const cutoff = window.__overnightCutoff ?? 6
  const startHour =
    typeof stats.startHour === 'number' && stats.startHour >= 0
      ? stats.startHour
      : 9
  const endHour =
    typeof stats.endHour === 'number' && stats.endHour >= 0
      ? stats.endHour
      : (window.__overtimeEndHour ?? 18)

  let latestOut = null
  let latestOutHour = null
  let maxSeverity = -1

  if (Array.isArray(commitsAll) && commitsAll.length > 0) {
    commitsAll.forEach((c) => {
      const d = new Date(c.date)
      if (!d || Number.isNaN(d.valueOf())) return
      const h = d.getHours()

      // 只看「当日下班后」以及「次日凌晨 cutoff 之前，且仍在上班前」的提交
      let sev = null
      if (h >= endHour && h < 24) {
        // 当晚：直接按 h - endHour 计算
        sev = h - endHour
      } else if (h >= 0 && h < cutoff && h < startHour) {
        // 次日凌晨：视作跨天，加上 24
        sev = 24 - endHour + h
      }

      if (sev != null && sev >= 0 && sev > maxSeverity) {
        maxSeverity = sev
        latestOut = c
        latestOutHour = h
      }
    })
  }

  // 若按 cutoff 没算出结果，则退回到原来的 stats.latestOutsideCommit
  if (!latestOut && stats.latestOutsideCommit) {
    latestOut = stats.latestOutsideCommit
    latestOutHour =
      stats.latestOutsideCommitHour ??
      (latestOut ? new Date(latestOut.date).getHours() : null)
  }

  const html = [
    `<div>最晚一次提交时间：${latest ? formatDate(latest.date) : '-'}${typeof latestHour === 'number' ? `（${String(latestHour).padStart(2, '0')}:00）` : ''} <div class="author">${latest.author}</div> <div> ${latest.message} <div></div>`,
    `<div class="hr"></div>`,
    `<div>加班最晚一次提交时间：${latestOut ? formatDate(latestOut.date) : '-'}${typeof latestOutHour === 'number' ? `（${String(latestOutHour).padStart(2, '0')}:00）` : ''} <div class="author">${latestOut.author}</div> <div>${latestOut.message}</div> </div>`,
    `<div class="hr"></div>`,
    `<div>次日归并窗口：凌晨 <b>${cutoff}</b> 点内归前一日</div>`
  ].join('')
  el.innerHTML = html
}

// 1) 按小时分组（例：commits 为原始提交数组）
function groupCommitsByHour(commits) {
  const byHour = Array.from({ length: 24 }, () => [])
  commits.forEach((c) => {
    // 解析 commit 的本地小时（考虑时区已有 '+0800' 等）
    const d = new Date(c.date)
    const h = d.getHours() // 若数据已为 UTC，请按需求调整
    byHour[h].push(c)
  })
  return byHour
}

async function main() {
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

  drawHourlyOvertime(stats, (hour, count) => {
    // 使用举例
    const hourCommitsDetail = groupCommitsByHour(commits)
    // 将 commit 列表传给侧栏（若没有详情，则传空数组）
    showSideBarForHour(hour, hourCommitsDetail[hour] || [])
  })
  drawOutsideVsInside(stats)

  // 按日提交趋势：点击某天打开抽屉，显示当日所有 commits
  drawDailyTrend(commits, showDayDetailSidebar)

  // 周趋势：保持原有点击行为（显示该周详情）
  drawWeeklyTrend(weekly, commits, showSideBarForWeek)

  // 月趋势（加班占比）：点击某个月打开抽屉，显示该月所有 commits
  drawMonthlyTrend(monthly, commits, showDayDetailSidebar)

  // 每日最晚提交时间（小时）：点击某天打开抽屉，显示当日所有 commits
  drawLatestHourDaily(latestByDay, commits, showDayDetailSidebar)

  // 每日超过下班的小时数：点击某天打开抽屉，显示当日所有 commits
  drawDailySeverity(latestByDay, commits, showDayDetailSidebar)

  const daily = drawDailyTrendSeverity(commits, weekly, showDayDetailSidebar)

  console.log('最累的一天：', daily.analysis.mostTiredDay)
  computeAndRenderLatestOvertime(latestByDay)
  renderKpi(stats)
}

// 基于 latestByDay + cutoff/endHour 统计「最晚加班的一天 / 一周 / 一月」
function computeAndRenderLatestOvertime(latestByDay) {
  if (!Array.isArray(latestByDay) || latestByDay.length === 0) return

  const endH = window.__overtimeEndHour || 18

  // 每天的 latestHourNormalized → 超出下班的小时数
  const dailyOvertime = latestByDay
    .map((d) => {
      const v =
        typeof d.latestHourNormalized === 'number'
          ? d.latestHourNormalized
          : typeof d.latestHour === 'number'
            ? d.latestHour
            : null
      if (v == null) return null
      const overtime = Math.max(0, Number(v) - endH)
      return { date: d.date, overtime, raw: v }
    })
    .filter(Boolean)

  if (!dailyOvertime.length) return

  // 1) 最晚加班的一天（超出下班小时数最大，若相同取日期更晚）
  const dailySorted = [...dailyOvertime].sort((a, b) => {
    if (b.overtime !== a.overtime) return b.overtime - a.overtime
    return new Date(b.date) - new Date(a.date)
  })
  const worstDay = dailySorted[0]
  const dayEl = document.getElementById('latestOvertimeDay')
  if (dayEl) {
    dayEl.innerHTML = `⏰ 最晚加班的一天：<b>${worstDay.date}</b>（超过下班 <b>${worstDay.overtime.toFixed(
      2
    )}</b> 小时，逻辑时间约 ${worstDay.raw.toFixed(2)} 点）`
  }

  // 工具：根据日期字符串计算 ISO 周 key：YYYY-Www
  const getIsoWeekKey = (dStr) => {
    const d = new Date(dStr)
    if (Number.isNaN(d.valueOf())) return null
    const target = new Date(
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
    )
    const dayNum = target.getUTCDay() || 7 // Sunday=0
    target.setUTCDate(target.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil(((target - yearStart) / 86400000 + 1) / 7)
    const year = target.getUTCFullYear()
    return `${year}-W${String(weekNo).padStart(2, '0')}`
  }

  // 2) 按周聚合：每周取「该周内任意一天的最大加班时长」
  const weekMap = new Map()
  dailyOvertime.forEach((d) => {
    const key = getIsoWeekKey(d.date)
    if (!key) return
    const cur = weekMap.get(key)
    if (!cur || d.overtime > cur.overtime) {
      weekMap.set(key, d)
    }
  })

  if (weekMap.size) {
    const weeks = Array.from(weekMap.entries()).sort((a, b) => {
      if (b[1].overtime !== a[1].overtime) return b[1].overtime - a[1].overtime
      return new Date(b[1].date) - new Date(a[1].date)
    })
    const [weekKey, weekInfo] = weeks[0]
    const weekEl = document.getElementById('latestOvertimeWeek')
    if (weekEl) {
      weekEl.innerHTML = `⏰ 最晚加班的一周：<b>${weekKey}</b>（代表日期 ${weekInfo.date}，超过下班 <b>${weekInfo.overtime.toFixed(
        2
      )}</b> 小时）`
    }
  }

  // 3) 按月聚合：每月取「该月任意一天的最大加班时长」
  const monthMap = new Map()
  dailyOvertime.forEach((d) => {
    const dt = new Date(d.date)
    if (Number.isNaN(dt.valueOf())) return
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
      2,
      '0'
    )}`
    const cur = monthMap.get(key)
    if (!cur || d.overtime > cur.overtime) {
      monthMap.set(key, d)
    }
  })

  if (monthMap.size) {
    const months = Array.from(monthMap.entries()).sort((a, b) => {
      if (b[1].overtime !== a[1].overtime) return b[1].overtime - a[1].overtime
      return new Date(b[1].date) - new Date(a[1].date)
    })
    const [monthKey, monthInfo] = months[0]
    const monthEl = document.getElementById('latestOvertimeMonth')
    if (monthEl) {
      monthEl.innerHTML = `⏰ 最晚加班的月份：<b>${monthKey}</b>（代表日期 ${monthInfo.date}，超过下班 <b>${monthInfo.overtime.toFixed(
        2
      )}</b> 小时）`
    }
  }
}

// 抽屉关闭交互（按钮 + 点击遮罩）
document.getElementById('sidebarClose').onclick = () => {
  document.getElementById('dayDetailSidebar').classList.remove('show')
  const backdrop = document.getElementById('sidebarBackdrop')
  if (backdrop) backdrop.classList.remove('show')
}

const sidebarBackdropEl = document.getElementById('sidebarBackdrop')
if (sidebarBackdropEl) {
  sidebarBackdropEl.addEventListener('click', () => {
    document.getElementById('dayDetailSidebar').classList.remove('show')
    sidebarBackdropEl.classList.remove('show')
  })
}
main()
