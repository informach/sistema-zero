/**
 * O projeto da página de medida dos mundos grandes (plano "Mundos de 2 km", lote 8, 23/11/2026).
 *
 * A Helena abre `/estudio/medida-mundos` no staging (só a equipe) no notebook simples dela; a
 * página baixa ESTE projeto (o mundo de 2 km na versão de ensaio, com `window.__qaJogoE`) pela rota
 * dos exemplos grandes, roda no player do Estúdio e recebe os números por `postMessage`. O programa
 * do jogo ganha, no fim, o percurso automático: espera a cena carregar, anda pela rota das regiões e
 * mede com a MESMA função da prova local (`src/medida/mundoGrande.ts`, `codigoDaMedida`).
 *
 *   bun scripts/gen-medida-mundos.ts [pasta]   (padrão: output/cenarios-reforma/mundo-2km)
 *
 * Sai `.cache/galeria/estudio-exemplos/medida-mundos/<sha256>.json` (vai para o R2 do ambiente) e o
 * resumo `packages/member-shell/src/components/creator/world-measurement-file.generated.ts`.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { codigoDaMedida } from '../src/medida/mundoGrande'
import { writeGeneratedSource } from './writeGeneratedSource'

const raiz = resolve(import.meta.dir, '../../..')
const pasta = resolve(process.argv[2] ?? join(raiz, 'output/cenarios-reforma/mundo-2km'))
export const OPCOES_DA_MEDIDA = { velocidade: 10, aquecimentoMs: 5000, duracaoMs: 90_000 } as const

const projeto = JSON.parse(await readFile(join(pasta, 'regioes.project.json'), 'utf8')) as {
  files?: Record<string, string>
  assets?: unknown[]
}
const programa = projeto.files?.['script.js']
if (!programa?.includes('window.__qaJogoE'))
  throw new Error('O projeto não é a versão de ensaio (falta window.__qaJogoE).')
if (!Array.isArray(projeto.assets) || projeto.assets.length === 0)
  throw new Error('O projeto não tem os materiais do mundo.')

// O percurso: espera a cena e a carga inicial, dá 3 s de folga e mede. O resultado (ou o erro)
// vai à página que embute o player; nada sai para a rede.
const percurso = `
;(function () {
  function pronto() {
    var q = window.__qaJogoE
    var h = q && q.cena && q.cena._sceneHandle
    if (!h) return false
    var regioes = h.estadoDasRegioes && h.estadoDasRegioes()
    var relevo = h.estadoDoRelevo && h.estadoDoRelevo()
    return (!regioes || regioes.carregando.length === 0) && (!relevo || relevo.faltam === 0)
  }
  function esperar() {
    if (!pronto()) {
      setTimeout(esperar, 500)
      return
    }
    setTimeout(function () {
      Promise.resolve(${codigoDaMedida(OPCOES_DA_MEDIDA)}).then(
        function (medida) {
          window.parent.postMessage({ type: 'sz-medida-mundo', medida: medida }, '*')
        },
        function (erro) {
          window.parent.postMessage(
            { type: 'sz-medida-mundo', erro: String((erro && erro.message) || erro) },
            '*',
          )
        },
      )
    }, 3000)
  }
  esperar()
})()
`
const comMedida = {
  ...projeto,
  name: 'Medida do mundo de 2 km',
  files: { ...projeto.files, 'script.js': `${programa}\n${percurso}` },
}
const conteudo = Buffer.from(JSON.stringify(comMedida))
const sha256 = createHash('sha256').update(conteudo).digest('hex')
const destino = join(import.meta.dir, '../.cache/galeria/estudio-exemplos/medida-mundos')
await mkdir(destino, { recursive: true })
await writeFile(join(destino, `${sha256}.json`), conteudo)
writeGeneratedSource(
  join(raiz, 'packages/member-shell/src/components/creator/world-measurement-file.generated.ts'),
  `// Gerado por packages/studio/scripts/gen-medida-mundos.ts. Não edite.
/** O projeto da página de medida no R2 do ambiente (estudio-exemplos/<caminho>), conferido pelo hash. */
export const MEDIDA_MUNDOS_ARQUIVO = {
  caminho: 'medida-mundos/${sha256}.json',
  sha256: '${sha256}',
  bytes: ${conteudo.length},
  velocidade: ${OPCOES_DA_MEDIDA.velocidade},
  duracaoMs: ${OPCOES_DA_MEDIDA.duracaoMs},
} as const
`,
)
console.log(`medida dos mundos: ${conteudo.length} bytes, sha256 ${sha256}`)
