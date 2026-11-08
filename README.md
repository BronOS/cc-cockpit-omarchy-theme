# Omarchy Theme for cc-cockpit

`bronos.omarchy-theme` adds the theme **Omarchy** to cc-cockpit, and it follows your
[Omarchy](https://omarchy.org) desktop theme. Switch Omarchy from Tokyo Night to Catppuccin, Rose
Pine or any other theme and the app, its panels and the Claude terminals re-colour within a second,
with no restart. Light Omarchy themes give a light cc-cockpit theme.

Without Omarchy (another Linux desktop, or a Mac), it is a Tokyo Night theme.

## Use

1. Install the plugin from the marketplace (Settings › Plugins).
2. Settings › Appearance › Theme: pick **Omarchy**. Its name shows the Omarchy theme it follows
   (`Omarchy · Tokyo Night`).

## How it works

Omarchy's `theme-set` writes the active theme to `~/.local/state/omarchy/current/theme/` (the
plugin reads `colors.toml` and `theme.name` there, and `$XDG_STATE_HOME` when it is set). The
plugin watches that folder, maps the palette onto cc-cockpit's colour tokens and hands the theme to
the app (`ctx.themes.set`). The terminal palette is the one Omarchy's own terminal template uses,
so a Claude tab matches the terminal next to it. The plugin reads only those files and runs no
commands.

A palette that lacks a colour the mapping needs keeps the last good theme (the plugin log says why).

## Requirements

cc-cockpit 0.15.0 or later (`ctx.themes.set`). An older app shows the Tokyo Night theme only.

## Development

`npm test` runs the tests (with every theme Omarchy ships, when it is installed).
`npm run build:theme` rewrites `themes/omarchy.json`, the starting theme, from the mapping in
`dist/lib/palette.js`. Link the folder in cc-cockpit's Settings › Plugins › Link a folder to try it.

## Credits

The Tokyo Night colours are by [enkia](https://github.com/enkia/tokyo-night-vscode-theme) (MIT), as
packaged by Omarchy.

## License

MIT
