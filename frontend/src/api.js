const BASE = import.meta.env.VITE_API_URL || ''

async function req(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const e = new Error(err.detail || res.statusText)
    e.status = res.status
    throw e
  }
  return res.json()
}

let cfgPromise = null   // the config (including the question order) is fetched once and reused

export const api = {
  config: () => {
    if (!cfgPromise) cfgPromise = req('/api/config').catch((e) => { cfgPromise = null; throw e })
    return cfgPromise
  },
  start: (consent) => req('/api/session', { method: 'POST', body: { consent } }),
  state: (sid) => req(`/api/session/${sid}`),
  answer: (sid, item, value) => req(`/api/session/${sid}/answer`, { method: 'POST', body: { item, value } }),
  result: (sid) => req(`/api/session/${sid}/result`),
  adminLogin: (password) => req('/api/admin/login', { method: 'POST', body: { password } }),
  adminStats: (token, includeDemo) => req(`/api/admin/stats?include_demo=${includeDemo}`, { token }),
  adminSeed: (token, n) => req('/api/admin/seed', { method: 'POST', body: { n }, token }),
  adminClearDemo: (token) => req('/api/admin/demo', { method: 'DELETE', token }),
}

// Apple system colours
export const TRAIT_COLORS = {
  EXT: '#ff9500', EST: '#ff3b30', AGR: '#34c759', CSN: '#007aff', OPN: '#af52de',
}

export const tooltipStyle = {
  contentStyle: {
    background: 'var(--tooltip-bg)', color: 'var(--tooltip-text)', border: '1px solid var(--grid)',
    borderRadius: 14, fontSize: 12, boxShadow: '0 12px 32px rgba(0,0,0,.16)',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
  },
  labelStyle: { color: 'var(--tooltip-text)', fontWeight: 600 },
  itemStyle: { color: 'var(--tooltip-text)' },
}
export const axisTick = { fill: 'var(--tick)', fontSize: 11 }
