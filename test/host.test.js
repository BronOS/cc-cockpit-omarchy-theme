'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { TOKYO_NIGHT } = require('../scripts/build-theme')
const { _test } = require('../dist/host')
const { currentDir } = require('../dist/lib/omarchy')

function fakeCtx({ themes = true, fail = false } = {}) {
  const sets = []
  const logs = []
  const log = { info: (m) => logs.push(m), warn: (m) => logs.push(m), error: (m) => logs.push(m) }
  const ctx = { log }
  if (themes) ctx.themes = { set: async (id, t) => { if (fail) throw new Error('refused'); sets.push([id, t]) } }
  return { ctx, sets, logs }
}
function omarchy(name = 'tokyo-night', colors = TOKYO_NIGHT, gen = '1') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omarchy-'))
  fs.mkdirSync(path.join(dir, 'theme'))
  const write = (n, c, g) => {
    fs.writeFileSync(path.join(dir, 'theme/colors.toml'), c)
    fs.writeFileSync(path.join(dir, 'theme.name'), `${n}\n`)
    fs.writeFileSync(path.join(dir, 'theme.generation'), g)
  }
  write(name, colors, gen)
  return { dir, write }
}
const tick = (ms = 50) => new Promise((r) => setTimeout(r, ms))

test('sets the theme from Omarchy at start, once, and again after a switch', async () => {
  const { dir, write } = omarchy()
  const { ctx, sets } = fakeCtx()
  const st = _test.start(ctx, { dir, poll: 1e9 })
  await tick()
  assert.equal(sets.length, 1)
  assert.equal(sets[0][0], 'omarchy')
  assert.equal(sets[0][1].name, 'Omarchy · Tokyo Night')
  await st.check() // nothing changed
  assert.equal(sets.length, 1)
  write('white', fs.readFileSync('/usr/share/omarchy/themes/white/colors.toml', 'utf8').toString(), '2')
  await tick(600) // the watcher's debounce
  await st.check()
  assert.equal(sets.length, 2)
  assert.equal(sets[1][1].kind, 'light')
  _test.stop(st)
}).skip = !fs.existsSync('/usr/share/omarchy/themes/white/colors.toml') && 'no Omarchy here'

test('no Omarchy, an old app, a bad palette: the starting theme stays, said once', async () => {
  const none = fakeCtx()
  const st = _test.start(none.ctx, { dir: path.join(os.tmpdir(), 'no-omarchy-here'), poll: 1e9 })
  await tick()
  await st.check()
  assert.equal(none.sets.length, 0)
  assert.equal(none.logs.filter((l) => /no Omarchy theme/.test(l)).length, 1)
  _test.stop(st)

  const old = fakeCtx({ themes: false })
  _test.stop(_test.start(old.ctx, { dir: omarchy().dir }))
  assert.match(old.logs[0], /no ctx\.themes\.set/)

  const bad = fakeCtx()
  const b = _test.start(bad.ctx, { dir: omarchy('x', 'mode = "dark"\n').dir, poll: 1e9 })
  await tick()
  assert.equal(bad.sets.length, 0)
  assert.match(bad.logs.join('\n'), /lacks/)
  _test.stop(b)
})

test('a refused set is tried again on the next check', async () => {
  const { dir } = omarchy()
  const f = fakeCtx({ fail: true })
  const st = _test.start(f.ctx, { dir, poll: 1e9 })
  await tick()
  assert.match(f.logs.join('\n'), /could not set the theme: refused/)
  f.ctx.themes.set = async (id, t) => f.sets.push([id, t])
  await st.check()
  assert.equal(f.sets.length, 1)
  _test.stop(st)
})

test('currentDir: XDG_STATE_HOME when absolute, else ~/.local/state', () => {
  assert.equal(currentDir({ XDG_STATE_HOME: '/s', HOME: '/h' }), '/s/omarchy/current')
  assert.equal(currentDir({ XDG_STATE_HOME: 'rel', HOME: '/h' }), '/h/.local/state/omarchy/current')
})
