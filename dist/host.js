'use strict'
// bronos.omarchy-theme: the cc-cockpit theme "Omarchy" follows the desktop's Omarchy theme. The
// manifest's themes/omarchy.json (Tokyo Night) is what the app shows first and on a system without
// Omarchy; once the plugin has read the active Omarchy theme it replaces it with ctx.themes.set,
// and again on every theme switch. Plain JavaScript with no build step; the mapping is
// lib/palette.js, finding and reading Omarchy's files lib/omarchy.js.
//
// Every project window runs its own plugin host, so each one reads the same files and sends the
// same theme: the app ignores an update equal to the theme it has. Each host also skips sending
// what it sent last.

const fs = require('node:fs')
const { parseColors, themeOf } = require('./lib/palette')
const { currentDir, readCurrent } = require('./lib/omarchy')

const THEME = 'omarchy'
const DEBOUNCE_MS = 300
// fs.watch misses changes on some file systems and cannot watch a folder that is not there yet
// (Omarchy installed later): a slow poll of the generation covers both.
const POLL_MS = 15_000

let state = null

function start(ctx, { dir = currentDir(), poll = POLL_MS } = {}) {
  const st = { ctx, dir, lastKey: null, lastSent: null, watcher: null, timer: null, interval: null, warned: false }
  if (!ctx.themes || typeof ctx.themes.set !== 'function') {
    ctx.log.warn('this cc-cockpit has no ctx.themes.set (0.15.0 or later): the theme stays Tokyo Night')
    return st
  }
  const check = async () => {
    const cur = readCurrent(dir)
    if (!cur) {
      if (!st.warned) ctx.log.info(`no Omarchy theme at ${dir}: the theme stays Tokyo Night`)
      st.warned = true
      watch()
      return
    }
    st.warned = false
    const key = `${cur.generation}\n${cur.name}\n${cur.colors}`
    if (key === st.lastKey) return
    st.lastKey = key
    const theme = themeOf(parseColors(cur.colors), cur.name)
    if (theme.error) {
      ctx.log.warn(`Omarchy theme "${cur.name}": ${theme.error}; keeping the last one`)
      return
    }
    const json = JSON.stringify(theme)
    if (json === st.lastSent) return
    try {
      await ctx.themes.set(THEME, theme)
      st.lastSent = json
      ctx.log.info(`following Omarchy theme ${cur.name || '(unnamed)'} (${theme.kind})`)
    } catch (e) {
      st.lastKey = null // try again on the next change or poll
      ctx.log.warn(`could not set the theme: ${(e && e.message) || e}`)
    }
    watch()
  }
  const later = () => {
    clearTimeout(st.timer)
    st.timer = setTimeout(() => void check(), DEBOUNCE_MS)
  }
  const watch = () => {
    if (st.watcher) return
    try {
      st.watcher = fs.watch(dir, later)
      st.watcher.on('error', () => {
        st.watcher?.close()
        st.watcher = null
      })
    } catch {
      st.watcher = null // not there yet: the poll keeps looking
    }
  }
  st.interval = setInterval(() => void check(), poll)
  st.check = check
  void check()
  return st
}

function stop(st) {
  if (!st) return
  clearTimeout(st.timer)
  clearInterval(st.interval)
  st.watcher?.close()
}

exports.activate = (ctx) => {
  state = start(ctx)
}
exports.deactivate = () => {
  stop(state)
  state = null
}
exports._test = { start, stop }
