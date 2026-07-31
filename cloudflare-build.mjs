import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootVite = fileURLToPath(new URL('./node_modules/vite/bin/vite.js', import.meta.url))
const appVite = fileURLToPath(new URL('./social-media-platfrom/node_modules/vite/bin/vite.js', import.meta.url))
const vite = existsSync(rootVite) ? rootVite : appVite

if (!existsSync(vite)) {
  console.error('Vite is not installed. Run npm install from the repository root.')
  process.exit(1)
}

const result = spawnSync(process.execPath, [vite, 'build'], {
  stdio: 'inherit',
  cwd: fileURLToPath(new URL('./social-media-platfrom/', import.meta.url)),
})

process.exit(result.status ?? 1)
