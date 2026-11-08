'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { parseColors, themeOf, titleOf, contrast } = require('../dist/lib/palette')
const { TOKYO_NIGHT } = require('../scripts/build-theme')

const COLOR = /^(#[0-9a-f]{6}|rgba\(\d{1,3}, \d{1,3}, \d{1,3}, [01](\.\d+)?\))$/

test('parseColors reads key = "value" lines only', () => {
  const c = parseColors('# c\nmode = "dark"\n[x]\naccent = "#7aa2f7" # trailing\nn = 3\nbad = "#123\n')
  assert.deepEqual(c, { mode: 'dark', accent: '#7aa2f7' })
  assert.deepEqual(parseColors(null), {})
  assert.deepEqual(parseColors('a = "b"\n'.repeat(10000)), {})
})

test('Tokyo Night maps to the terminal Omarchy draws and a dark shell', () => {
  const t = themeOf(parseColors(TOKYO_NIGHT), 'tokyo-night')
  assert.equal(t.name, 'Omarchy · Tokyo Night')
  assert.equal(t.kind, 'dark')
  assert.equal(t.xterm.background, '#1a1b26')
  assert.equal(t.xterm.black, '#1a1b26')
  assert.equal(t.xterm.brightBlack, '#414868')
  assert.equal(t.xterm.cursor, '#c0caf5')
  assert.equal(t.vars['--cc-accent'], '#7aa2f7')
  assert.equal(t.vars['--cc-terminal-bg'], '#1a1b26')
  // The starting theme in the manifest is this mapping.
  const file = JSON.parse(fs.readFileSync(path.join(__dirname, '../themes/omarchy.json'), 'utf8'))
  assert.deepEqual(file.vars, t.vars)
  assert.deepEqual(file.xterm, t.xterm)
})

test('a missing or bad colour is an error, not a half theme', () => {
  const c = parseColors(TOKYO_NIGHT)
  delete c.accent
  assert.match(themeOf(c, 'x').error, /lacks accent/)
  assert.match(themeOf({ ...parseColors(TOKYO_NIGHT), red: 'red' }, 'x').error, /lacks red/)
  // No orange: bright_yellow stands in.
  const n = parseColors(TOKYO_NIGHT)
  delete n.orange
  assert.equal(themeOf(n, 'x').vars['--cc-flag-orange'], '#ff9e64')
})

test('titleOf', () => {
  assert.equal(titleOf('catppuccin-latte'), 'Catppuccin Latte')
  assert.equal(titleOf('<b>x</b>'), 'Bxb')
  assert.equal(titleOf(''), '')
})

// Every theme Omarchy ships, when this machine has Omarchy.
const SHIPPED = '/usr/share/omarchy/themes'
const shipped = fs.existsSync(SHIPPED) ? fs.readdirSync(SHIPPED).filter((d) => fs.existsSync(path.join(SHIPPED, d, 'colors.toml'))) : []
test('every shipped Omarchy theme maps to valid, readable colours', { skip: shipped.length ? false : 'no Omarchy here' }, () => {
  for (const name of shipped) {
    const c = parseColors(fs.readFileSync(path.join(SHIPPED, name, 'colors.toml'), 'utf8'))
    const t = themeOf(c, name)
    assert.ok(!t.error, `${name}: ${t.error}`)
    for (const [k, v] of [...Object.entries(t.vars), ...Object.entries(t.xterm)]) assert.match(v, COLOR, `${name} ${k}`)
    assert.equal(t.kind, c.mode === 'light' ? 'light' : 'dark', name)
    assert.ok(contrast(t.vars['--cc-fg'], t.vars['--cc-bg']) >= 4.5, `${name}: text on background`)
    assert.ok(contrast(t.vars['--cc-accent-fg'], t.vars['--cc-accent']) >= 2.5, `${name}: text on accent`)
  }
})
