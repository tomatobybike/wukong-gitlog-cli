/* eslint-disable import/no-absolute-path */
/* eslint-disable no-use-before-define */
/* global echarts */
const formatDate = (d) => new Date(d).toLocaleString()

// 综合判断函数，考虑多种情况
function isEmptyObject(obj) {
  // 1. 检查是否为对象
  if (obj === null || typeof obj !== 'object') {
    return false
  }

  // 2. 检查是否是空对象
  return Object.keys(obj).length === 0
}

// 根据对象内容隐藏对应图表卡片
function hideElementByObj({ el, objectName }) {
  const isEmpty = isEmptyObject(objectName)
  if (isEmpty) {
    const chartCard = el?.closest('.chart-card')
    chartCard.style.display = 'none'
    return true
  }
  return isEmpty
}

function filterByDate(commits) {
  const start = document.getElementById('startDate')?.value
  const end = document.getElementById('endDate')?.value

  if (!start && !end) return commits

  const startTime = start ? new Date(`${start}T00:00:00`).getTime() : -Infinity

  const endTime = end ? new Date(`${end}T23:59:59`).getTime() : Infinity

  return commits.filter((c) => {
    const t = new Date(c.date).getTime()
    return t >= startTime && t <= endTime
  })
}

// ISO 周 key：YYYY-Www
function getIsoWeekKey(dStr) {
  const d = new Date(dStr)
  if (Number.isNaN(d.valueOf())) return null
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = target.getUTCDay() || 7 // Sunday=0
  target.setUTCDate(target.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((target - yearStart) / 86400000 + 1) / 7)
  const year = target.getUTCFullYear()
  return `${year}-W${String(weekNo).padStart(2, '0')}`
}

function formatDateYMD(d) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function getISOWeekRange(isoYear, isoWeek) {
  // 找到 ISO 年的第一个周一
  // ISO 年的第 1 周包含 1 月 4 日
  const simple = new Date(isoYear, 0, 4)
  const dayOfWeek = simple.getDay() || 7 // Sunday=7
  const firstMonday = new Date(simple)
  firstMonday.setDate(simple.getDate() - dayOfWeek + 1)

  // 计算目标周的周一
  const monday = new Date(firstMonday)
  monday.setDate(firstMonday.getDate() + (isoWeek - 1) * 7)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    start: formatDateYMD(monday),
    end: formatDateYMD(sunday)
  }
}

async function loadData() {
  // 定义加载函数，包装 import 以便添加错误处理
  const safeImport = async (path, defaultValue) => {
    try {
      const module = await import(path)
      return module.default || defaultValue
    } catch (e) {
      console.warn(`文件加载失败: ${path}`, e)
      return defaultValue
    }
  }

  // 并行加载所有静态模块
  const [commits, stats, weekly, monthly, latestByDay, config, authorChanges] =
    await Promise.all([
      safeImport('/data/commits.mjs', []),
      safeImport('/data/overtime.mjs', {}),
      safeImport('/data/overtime.week.mjs', []),
      safeImport('/data/overtime.month.mjs', []),
      safeImport('/data/overtime.latest.commit.day.mjs', []),
      safeImport('/data/config.mjs', {}),
      safeImport('/data/author.changes.mjs', {})
    ])

  return { commits, stats, weekly, monthly, latestByDay, config, authorChanges }
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
    tr.innerHTML = `<td>${c.hash.slice(0, 8)}</td><td>${c.author}</td><td>${c.email}</td><td>${formatDate(c.date)}</td><td>${c.message}</td><td>${c.changed}</td>`
    tbody.appendChild(tr)
  })
  document.getElementById('commitsTotal').textContent =
    `共${filtered.length}条记录`
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

  // ① 先做日期过滤
  const base = filterByDate(commitsAll)

  if (!q) {
    filtered = base.slice()
  } else {
    filtered = base.filter((c) => {
      const h = c.hash.toLowerCase()
      const a = String(c.author || '').toLowerCase()
      const e = String(c.email || '').toLowerCase()
      const m = String(c.message || '').toLowerCase()
      const d = formatDate(c.date).toLowerCase()
      return (
        h.includes(q) ||
        a.includes(q) ||
        e.includes(q) ||
        m.includes(q) ||
        d.includes(q)
      )
    })
  }
  page = 1
  updatePager()
  renderCommitsTablePage()
}

function initTableControls() {
  document.getElementById('searchInput').addEventListener('input', applySearch)
  document.getElementById('startDate')?.addEventListener('change', applySearch)
  document.getElementById('endDate')?.addEventListener('change', applySearch)
  document.getElementById('clearDate')?.addEventListener('click', () => {
    document.getElementById('startDate').value = ''
    document.getElementById('endDate').value = ''
    applySearch()
  })
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
  // TODO: remove debug log before production
  console.log('✅', 'stats', stats)
  const isEmpty = hideElementByObj({ el, objectName: stats })
  if (isEmpty) {
    return false
  }
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
      if (p.componentType === 'markLine') {
        hour = Number(p.data.xAxis)
      }
      document.getElementById('dayDetailSidebar').classList.remove('show')
      if (Number.isNaN(hour)) return
      onHourClick(hour, commits[hour])
    })
  }

  return chart
}

// showSideBarForHour 实现
function showSideBarForHour({ hour, commitsOrCount, titleDrawer }) {
  // 支持传入 number（仅次数）或 array（详细 commit 列表）
  // 统一复用通用详情侧栏 DOM
  const sidebar = document.getElementById('dayDetailSidebar')
  const backdrop = document.getElementById('sidebarBackdrop')
  const titleEl = document.getElementById('sidebarTitle')
  const contentEl = document.getElementById('sidebarContent')
  const drawerTitleEl = document.getElementById('sidebarDrawerTitle')

  // 兼容未传入侧栏 DOM 的情况（优雅降级）
  if (!sidebar || !titleEl || !contentEl) {
    console.warn(
      'hourDetailSidebar DOM not found. Please add the HTML snippet.'
    )
    return
  }

  drawerTitleEl.innerHTML = titleDrawer || '🕒 小时详情'
  titleEl.innerHTML = `🕒 ${String(hour).padStart(2, '0')}:00 - ${String(hour).padStart(2, '0')}:59`

  // 如果只是 number，显示计数
  if (typeof commitsOrCount === 'number') {
    contentEl.innerHTML = `<div style="font-size:14px;">提交次数：<b>${commitsOrCount}</b></div>`
  } else if (Array.isArray(commitsOrCount) && commitsOrCount.length === 0) {
    contentEl.innerHTML = `<div style="font-size:14px;">当小时无提交记录</div>`
  } else if (Array.isArray(commitsOrCount)) {
    // commits 列表：展示作者/时间/消息（最多前 50 条，避免性能问题）
    const commits = commitsOrCount.slice(0, 50)
    contentEl.innerHTML = `<div class="sidebar-list">${commits
      .map((c) => {
        const author = c.author ?? c.name ?? 'unknown'
        const time = c.date ?? c.time ?? ''
        const msg = (c.message ?? c.msg ?? c.body ?? '').replace(/\n/g, ' ')
        return `
          <div class="sidebar-item">
            <div class="sidebar-item-header">
              <span class="author">👤 ${escapeHtml(author)}</span>
              <span class="time">🕒 ${escapeHtml(time)}</span>
            </div>
            <div class="sidebar-item-message">${escapeHtml(msg)}</div>
          </div>
        `
      })
      .join('')}</div>`

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
  const titleDrawer = el.getAttribute('data-title') || ''

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
      // onDayClick(date, count, dayCommits)
      onDayClick({
        date,
        count,
        commits: dayCommits,
        titleDrawer
      })
    })
  }

  return chart
}

function showSideBarForWeek({ period, weeklyItem, commits = [], titleDrawer }) {
  // 统一复用通用详情侧栏 DOM
  const sidebar = document.getElementById('dayDetailSidebar')
  const backdrop = document.getElementById('sidebarBackdrop')
  const titleEl = document.getElementById('sidebarTitle')
  const contentEl = document.getElementById('sidebarContent')
  const drawerTitleEl = document.getElementById('sidebarDrawerTitle')

  titleEl.innerHTML = `📅 周期：<b>${period}</b>`
  drawerTitleEl.innerHTML = titleDrawer || ''

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
    html += `<div class="sidebar-list">${commits
      .map((c) => {
        const author = escapeHtml(c.author || 'unknown')
        const time = escapeHtml(c.date || '')
        const msg = escapeHtml((c.message || '').replace(/\n/g, ' '))
        return `
          <div class="sidebar-item">
            <div class="sidebar-item-header">
              <span class="author">👤 ${author}</span>
              <span class="time">🕒 ${time}</span>
            </div>
            <div class="sidebar-item-message">${msg}</div>
          </div>
        `
      })
      .join('')}</div>`
  }

  contentEl.innerHTML = html
  sidebar.classList.add('show')
  if (backdrop) backdrop.classList.add('show')
}

function drawWeeklyTrend(weekly, commits, onWeekClick) {
  const el = document.getElementById('weeklyTrendChart')
  const isEmpty = hideElementByObj({ el, objectName: weekly })
  if (isEmpty) {
    return null
  }
  if (!Array.isArray(weekly) || weekly.length === 0) {
    return null
  }

  const labels = weekly.map((w) => w.period)
  const dataRate = weekly.map((w) => +(w.outsideWorkRate * 100).toFixed(1)) // %
  const dataCount = weekly.map((w) => w.outsideWorkCount)

  // TODO: remove debug log before production
  console.log('✅', 'weekly', weekly)

  const titleDrawer = el.getAttribute('data-title') || ''

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
      // onWeekClick(w.period, w, weeklyCommits)
      onWeekClick({
        period: w.period,
        weeklyItem: w,
        commits: weeklyCommits,
        titleDrawer
      })
    }
  })

  return chart
}

function drawMonthlyTrend(monthly, commits, onMonthClick) {
  const el = document.getElementById('monthlyTrendChart')
  const isEmpty = hideElementByObj({ el, objectName: monthly })
  if (isEmpty) {
    return null
  }
  if (!Array.isArray(monthly) || monthly.length === 0) return null

  const labels = monthly.map((m) => m.period)
  const dataRate = monthly.map((m) => +(m.outsideWorkRate * 100).toFixed(1)) // 0–100%

  const titleDrawer = el.getAttribute('data-title') || ''
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
      // onMonthClick(ym, monthCommits.length, monthCommits)
      onMonthClick({
        date: ym,
        count: monthCommits.length,
        commits: monthCommits,
        titleDrawer
      })
    })
  }

  return chart
}

function drawLatestHourDaily(latestByDay, commits, onDayClick) {
  const el = document.getElementById('latestHourDailyChart')
  const isEmpty = hideElementByObj({ el, objectName: latestByDay })
  if (isEmpty) {
    return null
  }
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

  const titleDrawer = el.getAttribute('data-title') || ''

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
      // onDayClick(date, list.length, list)
      onDayClick({
        date,
        count: list.length,
        commits: list,
        titleDrawer
      })
    })
  }

  return chart
}

function drawDailySeverity(latestByDay, commits, onDayClick) {
  const el = document.getElementById('dailySeverityChart')
  const isEmpty = hideElementByObj({ el, objectName: latestByDay })
  if (isEmpty) {
    return null
  }
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

  const titleDrawer = el.getAttribute('data-title') || ''

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
      // onDayClick(date, list.length, list)
      onDayClick({
        date,
        count: list.length,
        commits: list,
        titleDrawer
      })
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
  if (Array.isArray(weekly) && weekly.length > 0) {
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
      [{ name: '0–5 次', yAxis: 0 }, { yAxis: 5 }],
      [
        { name: '5–10 次', yAxis: 5 },
        { yAxis: 10, itemStyle: { color: 'orange', opacity: 0.25 } }
      ],
      [
        { name: '10 次以上', yAxis: 10 },
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
  const titleDrawer = el.getAttribute('data-title') || ''

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
        // onDayClick(date, count, dayCommitsDetail[date])
        onDayClick({
          date,
          count,
          commits: dayCommitsDetail[date],
          titleDrawer
        })
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

function showDayDetailSidebar({ date, count, commits, titleDrawer }) {
  const sidebar = document.getElementById('dayDetailSidebar')
  const backdrop = document.getElementById('sidebarBackdrop')
  const title = document.getElementById('sidebarTitle')
  const content = document.getElementById('sidebarContent')
  const drawerTitleEl = document.getElementById('sidebarDrawerTitle')

  title.innerHTML = `📅 ${date}（${count} 次提交）`
  drawerTitleEl.innerHTML = titleDrawer || ''

  // 渲染详情
  content.innerHTML = commits
    .map(
      (c) => `
    <div class="sidebar-item">
      <div class="sidebar-item-header">
        <span class="author">👤 ${escapeHtml(c.author || 'unknown')}</span>
        <span class="time">🕒 ${escapeHtml(c.time || c.date || '')}</span>
      </div>
      <div class="sidebar-item-message">${escapeHtml(c.msg || c.message || '')}</div>
    </div>
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

  const htmlLatest = latest
    ? `<div>最后一次提交时间：${latest ? formatDate(latest.date) : '-'}${typeof latestHour === 'number' ? `（${String(latestHour).padStart(2, '0')}:00）` : ''} <div class="author">${latest?.author}</div> <div> ${latest?.message} <div></div>`
    : ``
  const html = [
    htmlLatest,
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

// 基于 latestByDay + cutoff/endHour 统计「最晚加班的一天 / 一周 / 一月」
function computeAndRenderLatestOvertime(latestByDay) {
  if (!Array.isArray(latestByDay) || latestByDay.length === 0) return

  const endH = window.__overtimeEndHour || 18

  // 每天的 latestHourNormalized → 超出下班的小时数
  const dailyOvertime = latestByDay
    .map((d) => {
      let v = null
      if (typeof d.latestHourNormalized === 'number') {
        v = d.latestHourNormalized
      } else if (typeof d.latestHour === 'number') {
        v = d.latestHour
      }
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

function buildDataset(stats, type) {
  const dataMap = stats[type] // { author: { period: changed } }

  const authors = Object.keys(dataMap)
  const allPeriods = Array.from(
    new Set(authors.flatMap((a) => Object.keys(dataMap[a])))
  ).sort()

  const series = authors.map((a) => ({
    name: a,
    type: 'line',
    smooth: true,
    data: allPeriods.map((p) => dataMap[a][p] || 0)
  }))

  return { authors, allPeriods, series }
}

const drawChangeTrends = (stats) => {
  const el = document.getElementById('chartAuthorChanges')
  if (!el) return null
  const chart = echarts.init(el)

  function render(type) {
    const { authors, allPeriods, series } = buildDataset(stats, type)
    const ds = { authors, allPeriods, series }
    ds.rangeMap = {}

    for (const period of ds.allPeriods) {
      if (period.includes('-W')) {
        const [yy, ww] = period.split('-W')
        ds.rangeMap[period] = getISOWeekRange(Number(yy), Number(ww))
      }
    }
    chart.setOption({
      // tooltip: { trigger: 'axis' },
      tooltip: {
        trigger: 'axis',
        formatter(params) {
          if (!params || !params.length) return ''

          const p = params[0]
          const label = p.axisValue
          const isWeekly = type === 'weekly'

          let extra = ''
          if (isWeekly && ds.rangeMap && ds.rangeMap[label]) {
            const { start, end } = ds.rangeMap[label]
            //   extra = `<div style="margin-top:4px;color:#999;font-size:12px">
            //   周区间：${start} ~ ${end}
            // </div>`
            // TODO: remove debug log before production
            extra = ''
          }

          const lines = params
            .filter((i) => i.data > 0)
            .map(
              (item) => `${item.marker}${item.seriesName}: ${item.data} 行变更`
            )
            .join('<br/>')

          return `
          <div>${label}</div>
          ${extra}
          ${lines}
        `
        }
      },
      legend: { data: authors },
      xAxis: { type: 'category', data: allPeriods },
      yAxis: { type: 'value' },
      series
    })
  }

  // 初次渲染：日
  render('daily')

  // tabs 切换
  const tabs = document.querySelectorAll('#tabs button')
  tabs.forEach((btnEl) => {
    btnEl.addEventListener('click', () => {
      tabs.forEach((b) => b.classList.remove('active'))
      btnEl.classList.add('active')
      render(btnEl.dataset.type)
    })
  })

  return chart
}

// ========= 开发者加班趋势（基于 commits 现场计算） =========
function buildAuthorOvertimeDataset(commits, type, startHour, endHour, cutoff) {
  const byAuthor = new Map()
  const periods = new Set()

  commits.forEach((c) => {
    const d = new Date(c.date)
    if (Number.isNaN(d.valueOf())) return
    const h = d.getHours()
    const isOvertime =
      (h >= endHour && h < 24) || (h >= 0 && h < cutoff && h < startHour)
    if (!isOvertime) return

    let key
    if (type === 'daily') {
      key = d.toISOString().slice(0, 10)
    } else if (type === 'weekly') {
      key = getIsoWeekKey(d.toISOString().slice(0, 10))
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    if (!key) return
    periods.add(key)

    const author = c.author || 'unknown'
    if (!byAuthor.has(author)) byAuthor.set(author, {})
    const obj = byAuthor.get(author)
    obj[key] = (obj[key] || 0) + 1
  })

  const allPeriods = Array.from(periods).sort()
  const authors = Array.from(byAuthor.keys()).sort()
  const series = authors.map((a) => ({
    name: a,
    type: 'line',
    smooth: true,
    data: allPeriods.map((p) => byAuthor.get(a)[p] || 0)
  }))
  return { authors, allPeriods, series }
}

function drawAuthorOvertimeTrends(commits, stats) {
  const el = document.getElementById('chartAuthorOvertime')
  if (!el) return null
  const chart = echarts.init(el)

  const startHour =
    typeof stats.startHour === 'number' && stats.startHour >= 0
      ? stats.startHour
      : 9
  const endHour =
    typeof stats.endHour === 'number' && stats.endHour >= 0
      ? stats.endHour
      : window.__overtimeEndHour || 18
  const cutoff = window.__overnightCutoff ?? 6

  function render(type) {
    const ds = buildAuthorOvertimeDataset(
      commits,
      type,
      startHour,
      endHour,
      cutoff
    )
    ds.rangeMap = {}

    for (const period of ds.allPeriods) {
      if (period.includes('-W')) {
        const [yy, ww] = period.split('-W')
        ds.rangeMap[period] = getISOWeekRange(Number(yy), Number(ww))
      }
    }
    chart.setOption({
      tooltip: {
        trigger: 'axis',
        formatter(params) {
          if (!params || !params.length) return ''

          const p = params[0]
          const label = p.axisValue
          const isWeekly = type === 'weekly'

          let extra = ''
          if (isWeekly && ds.rangeMap && ds.rangeMap[label]) {
            const { start, end } = ds.rangeMap[label]
            extra = `<div style="margin-top:4px;color:#999;font-size:12px">
            周区间：${start} ~ ${end}
          </div>`
          }

          const lines = params
            .filter((i) => i.data > 0)
            .map(
              (item) => `${item.marker}${item.seriesName}: ${item.data} 次提交`
            )
            .join('<br/>')

          return `
          <div>${label}</div>
          ${extra}
          ${lines}
        `
        }
      },
      legend: { data: ds.authors },
      xAxis: { type: 'category', data: ds.allPeriods },
      // 把 y 轴名称改为提交数
      yAxis: { type: 'value', name: '提交数 (次)' },

      series: ds.series
    })
  }

  // 初始按日
  render('daily')

  // tabs 切换
  const tabs = document.querySelectorAll('#tabsOvertime button')
  tabs.forEach((btnEl) => {
    btnEl.addEventListener('click', () => {
      tabs.forEach((b) => b.classList.remove('active'))
      btnEl.classList.add('active')
      render(btnEl.dataset.type)
    })
  })

  // 输出本周风险总结
  renderWeeklyRiskSummary(commits, { startHour, endHour, cutoff })
  renderMonthlyRiskSummary(commits, { startHour, endHour, cutoff })
  renderWeeklyDurationRiskSummary(commits, { startHour, endHour, cutoff })
  renderMonthlyDurationRiskSummary(commits, { startHour, endHour, cutoff })
  renderRolling30DurationRiskSummary(commits, { startHour, endHour, cutoff })

  return chart
}

function renderWeeklyRiskSummary(
  commits,
  { startHour = 9, endHour = 18, cutoff = 6 } = {}
) {
  const box = document.getElementById('weeklyRiskSummary')
  if (!box) return

  // 获取当前周与上一周 key
  const now = new Date()
  const curKey = getIsoWeekKey(now.toISOString().slice(0, 10))
  const prev = new Date(now)
  prev.setDate(prev.getDate() - 7)
  const prevKey = getIsoWeekKey(prev.toISOString().slice(0, 10))

  // 统计：每周 -> author -> count；同时统计每周日期集合
  const weekAuthor = new Map()
  const weekDatesByAuthor = new Map() // week -> author -> Set(date)

  commits.forEach((c) => {
    const d = new Date(c.date)
    if (Number.isNaN(d.valueOf())) return
    const h = d.getHours()
    const isOT =
      (h >= endHour && h < 24) || (h >= 0 && h < cutoff && h < startHour)
    if (!isOT) return

    const key = getIsoWeekKey(d.toISOString().slice(0, 10))
    if (!key) return
    const author = c.author || 'unknown'

    if (!weekAuthor.has(key)) weekAuthor.set(key, new Map())
    const m = weekAuthor.get(key)
    m.set(author, (m.get(author) || 0) + 1)

    if (!weekDatesByAuthor.has(key)) weekDatesByAuthor.set(key, new Map())
    const dMap = weekDatesByAuthor.get(key)
    if (!dMap.has(author)) dMap.set(author, new Set())
    dMap.get(author).add(d.toISOString().slice(0, 10))
  })

  const curMap = weekAuthor.get(curKey) || new Map()
  const prevMap = weekAuthor.get(prevKey) || new Map()
  const curTotal = Array.from(curMap.values()).reduce((a, b) => a + b, 0)
  const prevTotal = Array.from(prevMap.values()).reduce((a, b) => a + b, 0)
  const delta =
    prevTotal > 0
      ? Math.round(((curTotal - prevTotal) / prevTotal) * 100)
      : null

  // 找当前周最“活跃”的人（加班提交最多），并统计他加班的自然日数
  let topAuthor = null
  let topCount = -1
  curMap.forEach((v, k) => {
    if (v > topCount) {
      topCount = v
      topAuthor = k
    }
  })
  const curDatesMap = weekDatesByAuthor.get(curKey) || new Map()
  const topDays =
    topAuthor && curDatesMap.get(topAuthor)
      ? curDatesMap.get(topAuthor).size
      : 0

  // 文案
  const lines = []
  lines.push('【本周风险总结】')

  if (curTotal === 0) {
    lines.push('团队本周暂无加班提交。')
  } else if (delta === null) {
    lines.push(`团队本周加班提交 ${curTotal} 次。`)
  } else {
    const trend = delta >= 0 ? '上升' : '下降'
    lines.push(`团队加班${trend} ${Math.abs(delta)}%（vs 上周）。`)
  }

  if (topAuthor && curTotal > 0) {
    const pct = Math.round((topCount / curTotal) * 100)
    lines.push(
      `${topAuthor} 夜间活跃度 ${pct}%，${topDays} 天出现下班后提交（${endHour}:00 后或次日 ${cutoff}:00 前）。`
    )
  }

  box.innerHTML = `
    <div class="risk-summary">
      <div class="risk-title">【本周风险总结】</div>
      <ul>
        ${lines
          .slice(1)
          .map((l) => `<li>${escapeHtml(l)}</li>`)
          .join('')}
      </ul>
    </div>
  `
}

function computeAuthorDailyMaxOvertime(commits, startHour, endHour, cutoff) {
  const byAuthorDay = new Map()
  commits.forEach((c) => {
    const d = new Date(c.date)
    if (Number.isNaN(d.valueOf())) return
    const h = d.getHours()
    let overtime = null
    let dayKey = null
    if (h >= endHour && h < 24) {
      overtime = h - endHour
      dayKey = d.toISOString().slice(0, 10)
    } else if (h >= 0 && h < cutoff && h < startHour) {
      overtime = 24 - endHour + h
      const cur = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
      )
      cur.setUTCDate(cur.getUTCDate() - 1)
      dayKey = cur.toISOString().slice(0, 10)
    }
    if (overtime == null || !dayKey) return
    const author = c.author || 'unknown'
    if (!byAuthorDay.has(author)) byAuthorDay.set(author, new Map())
    const m = byAuthorDay.get(author)
    const cur = m.get(dayKey)
    if (!cur || overtime > cur) m.set(dayKey, overtime)
  })
  return byAuthorDay
}

function renderWeeklyDurationRiskSummary(
  commits,
  { startHour = 9, endHour = 18, cutoff = 6 } = {}
) {
  const box = document.getElementById('weeklyDurationRiskSummary')
  if (!box) return
  const now = new Date()
  const curWeek = getIsoWeekKey(now.toISOString().slice(0, 10))
  const byAuthorDay = computeAuthorDailyMaxOvertime(
    commits,
    startHour,
    endHour,
    cutoff
  )
  const sums = []
  byAuthorDay.forEach((dayMap, author) => {
    let total = 0
    dayMap.forEach((v, dayKey) => {
      const wk = getIsoWeekKey(dayKey)
      if (wk === curWeek) total += v
    })
    if (total > 0) sums.push({ author, total })
  })
  sums.sort((a, b) => b.total - a.total)
  const top = sums.slice(0, 6)
  const lines = []
  lines.push('【本周加班时长风险】')
  if (top.length === 0) {
    lines.push('本周暂无加班时长风险。')
  } else {
    top.forEach(({ author, total }) => {
      let level = '轻度'
      if (total >= 12) level = '严重'
      else if (total >= 6) level = '中度'
      lines.push(
        `${author} 本周累计加班 ${total.toFixed(2)} 小时（${level}）。`
      )
    })
  }
  box.innerHTML = `
    <div class="risk-summary">
      <div class="risk-title">【本周加班时长风险】</div>
      <ul>
        ${lines
          .slice(1)
          .map((l) => `<li>${escapeHtml(l)}</li>`)
          .join('')}
      </ul>
    </div>
  `
}

function renderMonthlyDurationRiskSummary(
  commits,
  { startHour = 9, endHour = 18, cutoff = 6 } = {}
) {
  const box = document.getElementById('monthlyDurationRiskSummary')
  if (!box) return
  const now = new Date()
  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const byAuthorDay = computeAuthorDailyMaxOvertime(
    commits,
    startHour,
    endHour,
    cutoff
  )
  const sums = []
  byAuthorDay.forEach((dayMap, author) => {
    let total = 0
    dayMap.forEach((v, dayKey) => {
      const m = dayKey.slice(0, 7)
      if (m === curMonth) total += v
    })
    if (total > 0) sums.push({ author, total })
  })
  sums.sort((a, b) => b.total - a.total)
  const top = sums.slice(0, 6)
  const lines = []
  lines.push('【本月加班时长风险】')
  if (top.length === 0) {
    lines.push('本月暂无加班时长风险。')
  } else {
    top.forEach(({ author, total }) => {
      let level = '轻度'
      if (total >= 20) level = '严重'
      else if (total >= 10) level = '中度'
      lines.push(
        `${author} 本月累计加班 ${total.toFixed(2)} 小时（${level}）。`
      )
    })
  }
  box.innerHTML = `
    <div class="risk-summary">
      <div class="risk-title">【本月加班时长风险】</div>
      <ul>
        ${lines
          .slice(1)
          .map((l) => `<li>${escapeHtml(l)}</li>`)
          .join('')}
      </ul>
    </div>
  `
}

function renderRolling30DurationRiskSummary(
  commits,
  { startHour = 9, endHour = 18, cutoff = 6 } = {}
) {
  const box = document.getElementById('rolling30DurationRiskSummary')
  if (!box) return
  const now = new Date()
  const utcToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  utcToday.setUTCDate(utcToday.getUTCDate() - 29)
  const startKey = utcToday.toISOString().slice(0, 10)

  const byAuthorDay = computeAuthorDailyMaxOvertime(
    commits,
    startHour,
    endHour,
    cutoff
  )
  const sums = []
  byAuthorDay.forEach((dayMap, author) => {
    let total = 0
    dayMap.forEach((v, dayKey) => {
      if (dayKey >= startKey) total += v
    })
    if (total > 0) sums.push({ author, total })
  })
  sums.sort((a, b) => b.total - a.total)
  const top = sums.slice(0, 6)
  const lines = []
  lines.push('【最近30天加班时长风险】')
  if (top.length === 0) {
    lines.push('最近30天暂无加班时长风险。')
  } else {
    top.forEach(({ author, total }) => {
      let level = '轻度'
      if (total >= 20) level = '严重'
      else if (total >= 10) level = '中度'
      lines.push(
        `${author} 最近30天累计加班 ${total.toFixed(2)} 小时（${level}）。`
      )
    })
  }
  box.innerHTML = `
    <div class="risk-summary">
      <div class="risk-title">【最近30天加班时长风险】</div>
      <ul>
        ${lines
          .slice(1)
          .map((l) => `<li>${escapeHtml(l)}</li>`)
          .join('')}
      </ul>
    </div>
  `
}
function renderMonthlyRiskSummary(
  commits,
  { startHour = 9, endHour = 18, cutoff = 6 } = {}
) {
  const box = document.getElementById('monthlyRiskSummary')
  if (!box) return

  const now = new Date()
  const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prev = new Date(now)
  prev.setMonth(prev.getMonth() - 1)
  const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`

  const monthAuthor = new Map()
  const monthMax = new Map()

  commits.forEach((c) => {
    const d = new Date(c.date)
    if (Number.isNaN(d.valueOf())) return
    const h = d.getHours()
    const isOT =
      (h >= endHour && h < 24) || (h >= 0 && h < cutoff && h < startHour)
    if (!isOT) return

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const author = c.author || 'unknown'

    if (!monthAuthor.has(key)) monthAuthor.set(key, new Map())
    const m = monthAuthor.get(key)
    m.set(author, (m.get(author) || 0) + 1)

    let overtime = null
    if (h >= endHour && h < 24) overtime = h - endHour
    else if (h >= 0 && h < cutoff && h < startHour) overtime = 24 - endHour + h
    if (overtime == null) return

    if (!monthMax.has(key)) monthMax.set(key, new Map())
    const mm = monthMax.get(key)
    const cur = mm.get(author)
    const dateStr = d.toISOString().slice(0, 10)
    if (!cur || overtime > cur.max)
      mm.set(author, { max: overtime, date: dateStr })
  })

  const curMap = monthAuthor.get(curKey) || new Map()
  const prevMap = monthAuthor.get(prevKey) || new Map()
  const curTotal = Array.from(curMap.values()).reduce((a, b) => a + b, 0)
  const prevTotal = Array.from(prevMap.values()).reduce((a, b) => a + b, 0)
  const delta =
    prevTotal > 0
      ? Math.round(((curTotal - prevTotal) / prevTotal) * 100)
      : null

  let topAuthor = null
  let top = { max: -1, date: null }
  const curMaxMap = monthMax.get(curKey) || new Map()
  curMaxMap.forEach((v, k) => {
    if (v.max > top.max) {
      top = v
      topAuthor = k
    }
  })

  let prevMax = -1
  const prevMaxMap = monthMax.get(prevKey) || new Map()
  prevMaxMap.forEach((v) => {
    if (v.max > prevMax) prevMax = v.max
  })

  const lines = []
  lines.push('【本月加班风险】')

  if (curTotal === 0) {
    lines.push('本月尚无下班后提交，未发现明显风险。')
  } else {
    if (delta === null) {
      lines.push(`本月下班后提交 ${curTotal} 次。`)
    } else {
      const trend = delta >= 0 ? '上升' : '下降'
      lines.push(`本月下班后提交${trend} ${Math.abs(delta)}%（vs 上月）。`)
    }

    if (top.max >= 0) {
      let trend2 = '暂无上月对比'
      if (prevMax >= 0) {
        if (top.max > prevMax) trend2 = '较上月更晚'
        else if (top.max < prevMax) trend2 = '较上月提前'
        else trend2 = '与上月持平'
      }
      lines.push(
        `${topAuthor} 本月最晚超出下班 ${top.max.toFixed(2)} 小时（${top.date}），${trend2}。`
      )
      if (top.max >= 2) lines.push('已超过 2 小时，存在严重加班风险。')
      else if (top.max >= 1) lines.push('已超过 1 小时，存在中度加班风险。')
    }
  }

  box.innerHTML = `
    <div class="risk-summary">
      <div class="risk-title">【本月加班风险】</div>
      <ul>
        ${lines
          .slice(1)
          .map((l) => `<li>${escapeHtml(l)}</li>`)
          .join('')}
      </ul>
    </div>
  `
}

// ========= 开发者加班“最晚”趋势（每期取最大超时） =========
function buildAuthorLatestDataset(commits, type, startHour, endHour, cutoff) {
  const byAuthor = new Map()
  const periods = new Set()

  commits.forEach((c) => {
    const d = new Date(c.date)
    if (Number.isNaN(d.valueOf())) return
    const h = d.getHours()

    let overtime = null
    if (h >= endHour && h < 24) overtime = h - endHour
    else if (h >= 0 && h < cutoff && h < startHour) overtime = 24 - endHour + h
    if (overtime == null) return

    let key
    if (type === 'daily') {
      key = d.toISOString().slice(0, 10)
    } else if (type === 'weekly') {
      key = getIsoWeekKey(d.toISOString().slice(0, 10))
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    if (!key) return
    periods.add(key)

    const author = c.author || 'unknown'
    if (!byAuthor.has(author)) byAuthor.set(author, {})
    const obj = byAuthor.get(author)
    obj[key] = Math.max(obj[key] || 0, overtime)
  })

  const allPeriods = Array.from(periods).sort()

  const authors = Array.from(byAuthor.keys()).sort()
  const series = authors.map((a) => ({
    name: a,
    type: 'line',
    smooth: true,
    data: allPeriods.map((p) => byAuthor.get(a)[p] || 0)
  }))
  return { authors, allPeriods, series }
}

function drawAuthorLatestOvertimeTrends(commits, stats) {
  const el = document.getElementById('chartAuthorLatestOvertime')
  if (!el) return null
  const chart = echarts.init(el)

  const startHour =
    typeof stats.startHour === 'number' && stats.startHour >= 0
      ? stats.startHour
      : 9
  const endHour =
    typeof stats.endHour === 'number' && stats.endHour >= 0
      ? stats.endHour
      : window.__overtimeEndHour || 18
  const cutoff = window.__overnightCutoff ?? 6

  function render(type) {
    const ds = buildAuthorLatestDataset(
      commits,
      type,
      startHour,
      endHour,
      cutoff
    )
    ds.rangeMap = {}

    for (const period of ds.allPeriods) {
      if (period.includes('-W')) {
        const [yy, ww] = period.split('-W')
        ds.rangeMap[period] = getISOWeekRange(Number(yy), Number(ww))
      }
    }
    chart.setOption({
      tooltip: {
        trigger: 'axis',
        formatter(params) {
          if (!params || !params.length) return ''

          const p = params[0]
          const label = p.axisValue
          const isWeekly = type === 'weekly'

          let extra = ''
          if (isWeekly && ds.rangeMap && ds.rangeMap[label]) {
            const { start, end } = ds.rangeMap[label]
            extra = `<div style="margin-top:4px;color:#999;font-size:12px">
            周区间：${start} ~ ${end}
          </div>`
          }

          const lines = params
            .filter((i) => i.data > 0)
            .map(
              (item) => `${item.marker}${item.seriesName}: ${item.data} 小时`
            )
            .join('<br/>')

          return `
          <div>${label}</div>
          ${extra}
          ${lines}
        `
        }
      },
      legend: { data: ds.authors },
      xAxis: { type: 'category', data: ds.allPeriods },
      yAxis: {
        type: 'value',
        name: '超出下班(小时)',
        min: 0
      },
      series: ds.series
    })
  }

  render('daily')

  const tabs = document.querySelectorAll('#tabsLatestOvertime button')
  tabs.forEach((btnEl) => {
    btnEl.addEventListener('click', () => {
      tabs.forEach((b) => b.classList.remove('active'))
      btnEl.classList.add('active')
      render(btnEl.dataset.type)
    })
  })

  renderLatestRiskSummary(commits, { startHour, endHour, cutoff })
  renderLatestMonthlyRiskSummary(commits, { startHour, endHour, cutoff })

  return chart
}

// 本周“最晚加班”风险提示
function renderLatestRiskSummary(
  commits,
  { startHour = 9, endHour = 18, cutoff = 6 } = {}
) {
  const box = document.getElementById('latestRiskSummary')
  if (!box) return

  const now = new Date()
  const curKey = getIsoWeekKey(now.toISOString().slice(0, 10))
  const prev = new Date(now)
  prev.setDate(prev.getDate() - 7)
  const prevKey = getIsoWeekKey(prev.toISOString().slice(0, 10))

  // 统计每周每人最大超时
  const weekMax = new Map() // week -> Map(author -> {max, date})
  commits.forEach((c) => {
    const d = new Date(c.date)
    if (Number.isNaN(d.valueOf())) return
    const h = d.getHours()
    let overtime = null
    if (h >= endHour && h < 24) overtime = h - endHour
    else if (h >= 0 && h < cutoff && h < startHour) overtime = 24 - endHour + h
    if (overtime == null) return

    const wKey = getIsoWeekKey(d.toISOString().slice(0, 10))
    if (!wKey) return
    if (!weekMax.has(wKey)) weekMax.set(wKey, new Map())
    const m = weekMax.get(wKey)
    const author = c.author || 'unknown'
    const cur = m.get(author)
    if (!cur || overtime > cur.max) {
      m.set(author, { max: overtime, date: d.toISOString().slice(0, 10) })
    }
  })

  const curMap = weekMax.get(curKey) || new Map()
  const prevMap = weekMax.get(prevKey) || new Map()

  // 当前周的全局最晚
  let topAuthor = null
  let top = { max: -1, date: null }
  curMap.forEach((v, k) => {
    if (v.max > top.max) {
      top = v
      topAuthor = k
    }
  })

  // 上周全局最晚，用于趋势判断
  let prevMax = -1
  prevMap.forEach((v) => {
    if (v.max > prevMax) prevMax = v.max
  })

  const lines = []
  lines.push('【本周最晚加班风险】')

  if (top.max < 0) {
    lines.push('本周尚无下班后/凌晨提交，未发现明显风险。')
  } else {
    let trend = '暂无上周对比'
    if (prevMax >= 0) {
      if (top.max > prevMax) trend = '较上周更晚'
      else if (top.max < prevMax) trend = '较上周提前'
      else trend = '与上周持平'
    }
    lines.push(
      `${topAuthor} 本周最晚超出下班 ${top.max.toFixed(
        2
      )} 小时（${top.date}），${trend}。`
    )
    if (top.max >= 2) {
      lines.push('已超过 2 小时，存在严重加班风险，请关注工作节奏。')
    } else if (top.max >= 1) {
      lines.push('已超过 1 小时，注意控制夜间工作时长。')
    }
  }

  box.innerHTML = `
    <div class="risk-summary">
      <div class="risk-title">【本周最晚加班风险】</div>
      <ul>
        ${lines
          .slice(1)
          .map((l) => `<li>${escapeHtml(l)}</li>`)
          .join('')}
      </ul>
    </div>
  `
}

function renderLatestMonthlyRiskSummary(
  commits,
  { startHour = 9, endHour = 18, cutoff = 6 } = {}
) {
  const box = document.getElementById('latestMonthlyRiskSummary')
  if (!box) return

  const now = new Date()
  const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prev = new Date(now)
  prev.setMonth(prev.getMonth() - 1)
  const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`

  const monthMax = new Map()
  commits.forEach((c) => {
    const d = new Date(c.date)
    if (Number.isNaN(d.valueOf())) return
    const h = d.getHours()
    let overtime = null
    if (h >= endHour && h < 24) overtime = h - endHour
    else if (h >= 0 && h < cutoff && h < startHour) overtime = 24 - endHour + h
    if (overtime == null) return

    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthMax.has(mKey)) monthMax.set(mKey, new Map())
    const m = monthMax.get(mKey)
    const author = c.author || 'unknown'
    const cur = m.get(author)
    if (!cur || overtime > cur.max) {
      m.set(author, { max: overtime, date: d.toISOString().slice(0, 10) })
    }
  })

  const curMap = monthMax.get(curKey) || new Map()
  const prevMap = monthMax.get(prevKey) || new Map()

  let topAuthor = null
  let top = { max: -1, date: null }
  curMap.forEach((v, k) => {
    if (v.max > top.max) {
      top = v
      topAuthor = k
    }
  })

  let prevMax = -1
  prevMap.forEach((v) => {
    if (v.max > prevMax) prevMax = v.max
  })

  const lines = []
  lines.push('【本月最晚加班风险】')

  if (top.max < 0) {
    lines.push('本月尚无下班后/凌晨提交，未发现明显风险。')
  } else {
    let trend = '暂无上月对比'
    if (prevMax >= 0) {
      if (top.max > prevMax) trend = '较上月更晚'
      else if (top.max < prevMax) trend = '较上月提前'
      else trend = '与上月持平'
    }
    lines.push(
      `${topAuthor} 本月最晚超出下班 ${top.max.toFixed(2)} 小时（${top.date}），${trend}。`
    )
    if (top.max >= 2) {
      lines.push('已超过 2 小时，存在严重加班风险，请关注工作节奏。')
    } else if (top.max >= 1) {
      lines.push('已超过 1 小时，注意控制夜间工作时长。')
    }
  }

  box.innerHTML = `
    <div class="risk-summary">
      <div class="risk-title">【本月最晚加班风险】</div>
      <ul>
        ${lines
          .slice(1)
          .map((l) => `<li>${escapeHtml(l)}</li>`)
          .join('')}
      </ul>
    </div>
  `
}

async function main() {
  const {
    commits,
    stats,
    weekly,
    monthly,
    latestByDay,
    config,
    authorChanges
  } = await loadData()
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

  drawHourlyOvertime(stats, (hour) => {
    // 使用举例
    const hourCommitsDetail = groupCommitsByHour(commits)
    // 将 commit 列表传给侧栏（若没有详情，则传空数组）
    showSideBarForHour({
      hour,
      commitsOrCount: hourCommitsDetail[hour] || [],
      titleDrawer: '每小时加班分布'
    })
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

  drawChangeTrends(authorChanges)
  drawAuthorOvertimeTrends(commits, stats)
  drawAuthorLatestOvertimeTrends(commits, stats)
  computeAndRenderLatestOvertime(latestByDay)
  renderKpi(stats)
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
