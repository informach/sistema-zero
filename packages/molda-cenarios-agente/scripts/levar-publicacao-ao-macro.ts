/**
 * Leva ao `/macro` local a publicação que está no ar numa ilha da plataforma, com os mesmos bytes.
 *
 *   MOLDA_CENARIOS_APP=... MOLDA_CENARIOS_GATEWAY=... MOLDA_CENARIOS_EMAIL=... MOLDA_CENARIOS_SENHA=... \
 *     bun packages/molda-cenarios-agente/scripts/levar-publicacao-ao-macro.ts [ilha] [pasta]
 *
 * Ilha: sua-ilha (padrão, a Faísca), bosque, vila-doce, recife, pico, vale-dos-dinos, nuvens.
 * Pasta: output/cenarios-reforma/macro-staging (padrão). Depois:
 *
 *   cd packages/arquipelago && CENARIOS_PUBLICADOS_QA_DIR=<pasta> bun run dev
 *   abrir http://127.0.0.1:4520/macro
 */
import { resolve } from 'node:path'
import type { PerfilDePublicacao } from '@sistemazero/molda-cenarios-core/publicacao'
import { criarClienteDaOficina, lerAcessoDaOficina } from '../src/oficina/cliente'
import { levarPublicacaoAoMacro } from '../src/oficina/publicacao-no-macro'

const raiz = resolve(import.meta.dirname, '../../..')
const ilha = (process.argv[2] ?? 'sua-ilha') as PerfilDePublicacao['ilha']
const pasta = resolve(process.argv[3] ?? resolve(raiz, 'output/cenarios-reforma/macro-staging'))
const cliente = criarClienteDaOficina(lerAcessoDaOficina())
const inicio = performance.now()
const r = await levarPublicacaoAoMacro(cliente, { ilha, pasta })
console.log(
  [
    `Versão ${r.publicacao.versao} de ${ilha} (revisão ${r.publicacao.fonte.revisao}) no /macro.`,
    `${r.arquivos} arquivos, ${r.baixados} baixados agora (${(r.bytes / 1048576).toFixed(1)} MiB), ${Math.round((performance.now() - inicio) / 1000)} s.`,
    `Pasta: ${r.pasta}`,
    `Abra: cd packages/arquipelago && CENARIOS_PUBLICADOS_QA_DIR="${r.pasta}" bun run dev`,
  ].join('\n'),
)
