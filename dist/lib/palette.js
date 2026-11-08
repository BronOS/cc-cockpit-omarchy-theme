'use strict'
// An Omarchy palette (colors.toml) as a cc-cockpit theme: the shell's colour tokens and the terminal
// palette. Pure (text in, theme out), so test/palette.test.js runs it under node, and
// scripts/build-theme.js writes the starting theme (themes/omarchy.json) with the same code.
//
// Omarchy's colors.toml is flat `key = "#rrggbb"` lines (mode, accent, selection, muted, four
// backgrounds, four foregrounds, six colours and their bright forms; orange and brown in most
// themes). The terminal palette follows Omarchy's own alacritty template exactly, so a Claude tab
// looks like the terminal next to the app. The shell keeps cc-cockpit's elevation order (window <
// bars < menus < banners), stepped from `background` towards `lighter_background`.

const REQUIRED = [
  'accent', 'selection', 'muted', 'background', 'lighter_background',
  'foreground', 'dark_foreground', 'bright_foreground',
  'red', 'yellow', 'green', 'cyan', 'blue', 'magenta',
  'bright_red', 'bright_yellow', 'bright_green', 'bright_cyan', 'bright_blue', 'bright_magenta',
]
const HEX6 = /^#[0-9a-fA-F]{6}$/
const MAX_TOML = 64 * 1024

/** The `key = "value"` pairs of a colors.toml (tables, comments and other value types ignored). */
function parseColors(text) {
  const out = {}
  if (typeof text !== 'string' || text.length > MAX_TOML) return out
  for (const line of text.split('\n')) {
    const m = /^\s*([a-z][a-z0-9_]*)\s*=\s*"([^"]{0,40})"\s*(?:#.*)?$/.exec(line)
    // Hex as lower case: some themes write #060B1E.
    if (m) out[m[1]] = /^#[0-9a-fA-F]{6}$/.test(m[2]) ? m[2].toLowerCase() : m[2]
  }
  return out
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const hex = (c) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`
/** a mixed towards b by t (0: a, 1: b). */
const mix = (a, b, t) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t))
const rgba = (h, alpha) => `rgba(${rgb(h).join(', ')}, ${alpha})`
function luminance(h) {
  const [r, g, b] = rgb(h).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/** "tokyo-night" -> "Tokyo Night". */
function titleOf(name) {
  const clean = String(name || '').trim().slice(0, 40).replace(/[^A-Za-z0-9 _-]/g, '')
  return clean.split(/[-_ ]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
}

/**
 * The theme for a parsed palette: { name, kind, vars, xterm }, or { error } when a colour the
 * mapping needs is missing or not #rrggbb (the app keeps the last good theme then).
 */
function themeOf(c, themeName) {
  const missing = REQUIRED.filter((k) => !HEX6.test(c[k] || ''))
  if (missing.length) return { error: `colors.toml lacks ${missing.join(', ')}` }
  const light = c.mode === 'light' || (c.mode !== 'dark' && luminance(c.background) > 0.4)
  const bg = c.background
  const raised = c.lighter_background
  const step = (t) => mix(bg, raised, t)
  const orange = HEX6.test(c.orange || '') ? c.orange : c.bright_yellow
  const accentFg = contrast(c.accent, bg) >= contrast(c.accent, c.bright_foreground) ? bg : c.bright_foreground
  const grey = mix(c.muted, c.foreground, 0.35)
  const vars = {
    '--cc-bg': bg,
    '--cc-fg': c.foreground,
    '--cc-bg-bar': step(0.35),
    '--cc-bg-menu': step(0.7),
    '--cc-bg-banner': raised,
    '--cc-bg-error': mix(bg, c.red, light ? 0.15 : 0.22),
    '--cc-border': mix(bg, c.muted, 0.4),
    '--cc-border-strong': mix(bg, c.muted, 0.75),
    '--cc-terminal-bg': bg,
    '--cc-status-starting': c.dark_foreground,
    '--cc-status-idle': c.dark_foreground,
    '--cc-status-working': c.blue,
    '--cc-status-needs-permission': c.yellow,
    '--cc-status-waiting': c.green,
    '--cc-status-ended': c.red,
    '--cc-fg-muted': mix(c.foreground, c.dark_foreground, 0.45),
    '--cc-fg-subtle': c.dark_foreground,
    '--cc-surface-1': step(0.35),
    '--cc-surface-2': step(0.7),
    '--cc-surface-3': raised,
    '--cc-accent': c.accent,
    '--cc-accent-hover': mix(c.accent, light ? c.foreground : c.bright_foreground, 0.2),
    '--cc-accent-fg': accentFg,
    '--cc-accent-soft': rgba(c.accent, light ? 0.12 : 0.16),
    '--cc-focus': c.accent,
    '--cc-shadow': light ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.5)',
  }
  const named = { red: c.red, orange, yellow: c.yellow, green: c.green, blue: c.blue, purple: c.magenta }
  for (const [k, v] of Object.entries(named)) vars[`--cc-project-${k}`] = vars[`--cc-flag-${k}`] = v
  vars['--cc-project-teal'] = c.cyan
  vars['--cc-project-grey'] = grey
  const xterm = {
    foreground: c.foreground,
    background: bg,
    cursor: c.bright_foreground,
    cursorAccent: bg,
    selectionBackground: c.selection,
    black: bg,
    red: c.red,
    green: c.green,
    yellow: c.yellow,
    blue: c.blue,
    magenta: c.magenta,
    cyan: c.cyan,
    white: c.foreground,
    brightBlack: c.muted,
    brightRed: c.bright_red,
    brightGreen: c.bright_green,
    brightYellow: c.bright_yellow,
    brightBlue: c.bright_blue,
    brightMagenta: c.bright_magenta,
    brightCyan: c.bright_cyan,
    brightWhite: c.bright_foreground,
  }
  const title = titleOf(themeName)
  return { name: title ? `Omarchy · ${title}` : 'Omarchy', kind: light ? 'light' : 'dark', vars, xterm }
}

module.exports = { REQUIRED, parseColors, themeOf, titleOf, mix, contrast }
