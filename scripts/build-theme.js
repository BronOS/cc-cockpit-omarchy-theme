'use strict'
// Writes themes/omarchy.json, the theme the app shows before the plugin has read Omarchy (and on a
// system without Omarchy: then it simply is Tokyo Night). From Omarchy's Tokyo Night palette,
// through the same mapping as the live theme: `node scripts/build-theme.js`.
const fs = require('node:fs')
const path = require('node:path')
const { parseColors, themeOf } = require('../dist/lib/palette')

const TOKYO_NIGHT = `mode = "dark"
accent = "#7aa2f7"
selection = "#292e42"
muted = "#414868"
background = "#1a1b26"
dark_background = "#13141c"
darker_background = "#0e0e14"
lighter_background = "#24283b"
foreground = "#a9b1d6"
dark_foreground = "#565f89"
light_foreground = "#b4bee6"
bright_foreground = "#c0caf5"
red = "#f7768e"
yellow = "#e0af68"
orange = "#eb927b"
green = "#9ece6a"
cyan = "#449dab"
blue = "#7aa2f7"
magenta = "#ad8ee6"
bright_red = "#ff7a93"
bright_yellow = "#ff9e64"
bright_green = "#b9f27c"
bright_cyan = "#0db9d7"
bright_blue = "#7da6ff"
bright_magenta = "#bb9af7"
`
module.exports = { TOKYO_NIGHT }
if (require.main === module) {
  const t = themeOf(parseColors(TOKYO_NIGHT), 'tokyo-night')
  const out = { id: 'omarchy', name: 'Omarchy', kind: t.kind, vars: t.vars, xterm: t.xterm }
  fs.writeFileSync(path.join(__dirname, '../themes/omarchy.json'), `${JSON.stringify(out, null, 2)}\n`)
}
