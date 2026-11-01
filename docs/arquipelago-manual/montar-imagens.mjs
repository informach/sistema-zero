// Junta as telas do manual em ./img (JPEG até 1280 px). node docs/arquipelago-manual/montar-imagens.mjs
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.join(AQUI, '..', '..', 'package.json'))
const sharp = require('sharp')
const W = path.join(AQUI, '..', '..')
const P = `${W}/packages/arquipelago`
const M = `${P}/.cache/manual`
const V = `${P}/.cache/manual-v`
const Q = `${W}/docs/qa`
const A = `${P}/src/assets/abertura`
const SAIDA = path.join(AQUI, 'img')
mkdirSync(SAIDA, { recursive: true })

const MAPA = {
  // capturas do manual
  'arquipelago.jpg': `${M}/arquipelago.jpg`,
  'sua-ilha.jpg': `${M}/sua-ilha.jpg`,
  'hud.jpg': `${M}/hud.jpg`,
  'menu.jpg': `${M}/menu.jpg`,
  'menu-diario.jpg': `${M}/menu-diario.jpg`,
  'menu-album.jpg': `${M}/menu-album.jpg`,
  'menu-caderno.jpg': `${M}/menu-caderno.jpg`,
  'menu-mapa.jpg': `${M}/menu-mapa.jpg`,
  'construir.jpg': `${M}/construir.jpg`,
  'quadro-sua-ilha.jpg': `${M}/quadro-sua-ilha.jpg`,
  'noite-vila.jpg': `${M}/noite-vila.jpg`,
  ...Object.fromEntries(
    ['bosque', 'vila-doce', 'recife', 'pico', 'vale-dos-dinos', 'nuvens'].map((i) => [
      `ilha-${i}.jpg`,
      `${M}/ilha-${i}.jpg`,
    ]),
  ),
  ...Object.fromEntries(
    ['capi', 'bento', 'floco', 'jade', 'irie'].map((m) => [
      `conversa-${m}.jpg`,
      `${M}/conversa-${m}.jpg`,
    ]),
  ),
  'conversa-mare.jpg': `${Q}/2026-10-29-amizade/mare-r1/kids-computador-mare-conversa.png`,
  // a abertura (capturas do próprio jogo)
  ...Object.fromEntries(
    ['arquipelago', 'iris', 'sumiu', 'cinza', 'tempestade', 'carta', 'casa', 'zappy'].map((c) => [
      `ab-${c}.webp`,
      `${A}/${c}.webp`,
    ]),
  ),
  // verificadores do jogo (telas com a HUD atual)
  'luneta-vila.jpg': `${Q}/2026-11-01-luneta-bichos/luneta-posto-2.png`,
  'corrida-telhados.jpg': `${Q}/2026-11-01-vila-telhados/corrida-chamine-computador.png`,
  'media-da-ponte.jpg': `${Q}/2026-11-01-ilhas-medias/vila-doce-media-da-ponte.png`,
  'cipo.jpg': `${V}/animacoes/animacao-cipo.png`,
  'equilibrio.jpg': `${V}/animacoes/animacao-equilibrio.png`,
  'escorregar.jpg': `${V}/animacoes/animacao-escorregar.png`,
  'planar.jpg': `${V}/animacoes/animacao-planar.png`,
  'farol-escada.jpg': `${V}/animacoes/animacao-escada.png`,
  'farol-borda.jpg': `${V}/animacoes/animacao-pendurada-na-borda.png`,
  'mergulho.jpg': `${V}/mergulho/computador-superficie.png`,
  'navio.jpg': `${V}/mergulho/computador-bau.png`,
  'labirinto.jpg': `${V}/mergulho/computador-tesouro.png`,
  'banda.jpg': `${V}/pico/pico-computador-floco.png`,
  'montaria.jpg': `${V}/montaria/montaria-computador-andando.png`,
  'ovo.jpg': `${V}/filhote/filhote-computador-falha-ovo.png`,
  'balao.jpg': `${V}/balao/balao-computador-voo.png`,
  'saltos.jpg': `${V}/nuvens-aventura/saltos-computador-alto.png`,
  'farol-porta.jpg': `${V}/final-farol/porta-computador.png`,
  'farol-pagina.jpg': `${V}/final-farol/pagina-computador.png`,
  'farol-fachos.jpg': `${V}/final-farol/fachos-computador.png`,
  'farol-iris.jpg': `${V}/final-farol/iris-computador.png`,
  'farol-adulto.jpg': `${V}/final-farol/sala-adulto-computador.png`,
  'turno.jpg': `${V}/turnos/turno-bandeja.png`,
  'turno-fim.jpg': `${V}/turnos/turno-fim.png`,
  'feira.jpg': `${V}/feira/01-feira.png`,
  'feira-confirmar.jpg': `${V}/feira/02-confirmar.png`,
  'junina.jpg': `${V}/festa/junina-noite-1280.png`,
  'fogueira.jpg': `${V}/festa/pipoca-1280.png`,
  'mini-estudio.jpg': `${V}/mini-estudio/computador-1-blocos.png`,
  'rotina.jpg': `${V}/rotina/computador-1-rotina-montada.png`,
  'lumi-regando.jpg': `${V}/mini-estudio/computador-3-lumi-regando.png`,
  'borroes.jpg': `${V}/borroes/borroes-desbotando.png`,
  'borrao-fugindo.jpg': `${V}/borroes/borrao-fugindo.png`,
  'recordes.jpg': `${V}/visitas/computador-1-recordes.png`,
  'passos-oi.jpg': `${Q}/2026-10-30-primeiros-passos/computador-01-oi.png`,
  'passos-plantar.jpg': `${Q}/2026-10-30-primeiros-passos/computador-06-plantar.png`,
  'andar-construir.jpg': `${Q}/2026-10-31-revisao-dos-lotes/andar-moveis/construir-andar-de-cima.png`,
  'andar-fora.jpg': `${Q}/2026-10-31-revisao-dos-lotes/andar-moveis/casa-com-andar-de-fora.png`,
}

let feitas = 0
const faltam = []
for (const [nome, origem] of Object.entries(MAPA)) {
  if (!existsSync(origem)) {
    faltam.push(nome)
    continue
  }
  const destino = path.join(SAIDA, nome)
  if (nome.endsWith('.webp')) copyFileSync(origem, destino)
  else
    await sharp(origem)
      .resize({ width: 1280, withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(destino)
  feitas++
}
console.log(`prontas ${feitas}; faltam ${faltam.join(', ') || 'nenhuma'}`)
