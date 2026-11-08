'use strict'
// Where Omarchy keeps the active theme, and reading it. Omarchy's `theme-set` writes the theme's
// files into ~/.local/state/omarchy/current/theme/ and bumps current/theme.generation and
// current/theme.name: so the `current` folder is what to watch, and the generation says whether
// anything changed. Paths come from the environment only (XDG_STATE_HOME, HOME), never from a
// setting another program could write.
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

function currentDir(env = process.env) {
  const state = env.XDG_STATE_HOME && path.isAbsolute(env.XDG_STATE_HOME) ? env.XDG_STATE_HOME : path.join(env.HOME || os.homedir(), '.local/state')
  return path.join(state, 'omarchy/current')
}

const read = (file, max) => {
  try {
    const st = fs.statSync(file)
    if (!st.isFile() || st.size > max) return null
    return fs.readFileSync(file, 'utf8')
  } catch {
    return null
  }
}

/** The active theme's files: { colors, name, generation }, or null when Omarchy is not there. */
function readCurrent(dir) {
  const colors = read(path.join(dir, 'theme/colors.toml'), 64 * 1024)
  if (colors === null) return null
  return {
    colors,
    name: (read(path.join(dir, 'theme.name'), 200) || '').trim(),
    generation: (read(path.join(dir, 'theme.generation'), 200) || '').trim(),
  }
}

module.exports = { currentDir, readCurrent }
