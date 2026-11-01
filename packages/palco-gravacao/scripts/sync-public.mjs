/**
 * A pasta pública do palco é a do Kids: a aula gravada aqui é a mesma que a criança vê, com os
 * mesmos ícones, sons, cenas e o Zappy. Copia a do Kids e roda os mesmos sincronizadores que o
 * `dev` e o `build` do Kids rodam (assets das aulas, artes do ediSVG e da câmera ao vivo).
 * Nada é escrito no Kids: só em `packages/palco-gravacao/public`, que fica fora do git.
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const palco = path.join(here, '..')
const kids = path.join(palco, '..', 'community-kids')
const publicDir = path.join(palco, 'public')

rmSync(publicDir, { recursive: true, force: true })
mkdirSync(publicDir, { recursive: true })
if (existsSync(path.join(kids, 'public')))
  cpSync(path.join(kids, 'public'), publicDir, { recursive: true })

const run = (command, args) => execFileSync(command, args, { cwd: palco, stdio: 'inherit' })
run('node', ['../member-shell/scripts/sync-lesson-assets.mjs', 'public'])
run('bun', ['../edisvg/scripts/sync-assets.ts', 'public'])
run('node', ['../member-shell/scripts/sync-live-camera-assets.mjs', 'public/live-camera'])
