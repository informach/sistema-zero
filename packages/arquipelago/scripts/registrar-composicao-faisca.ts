/** Registra as instâncias/arte de revisão; não exporta os binários privados do catálogo. */
import { resolve } from 'node:path'
import { ARTE_DA_FAISCA as arte } from '../src/mundo/faisca/arte.generated'
import { assentamentoDaPeca } from '../src/sistemas/assentamento-da-faisca'
import { COMPOSICAO_DA_FAISCA as colecao } from '../src/sistemas/composicao-faisca'
import { LAGO_DA_FAISCA } from '../src/sistemas/lago-da-faisca'
import { passeiosDaFaisca } from '../src/sistemas/passeios-da-faisca'

const saida = resolve(import.meta.dirname, '../../../docs/qa/2026-11-15-faisca-gate21')
const apoios = new Map(colecao.map((p) => [p.id, assentamentoDaPeca(p)]))
for (const p of colecao)
  if (p.apoio) apoios.get(p.id)!.y = apoios.get(p.apoio)!.y + (p.deslocamentoY ?? 0)
const instancias = colecao.map((p) => ({
  ...p,
  y: apoios.get(p.id)!.y,
  fundacao: apoios.get(p.id)!.fundacao,
  contato: arte.pecas[p.peca as keyof typeof arte.pecas].colisao[0],
  estado: 'integrado ao ensaio; aceite artístico pendente',
}))
const modelos = Object.values(arte.pecas).map((p) => ({
  ...p,
  sourceCommit: 'sourceCommit' in p ? p.sourceCommit : arte.commit,
  estado: colecao.some((c) => c.peca === p.id)
    ? 'integrado ao ensaio'
    : p.id === 'lago_nadavel'
      ? 'proposta L2'
      : p.id === 'coelho'
        ? 'NPC de estudo'
        : p.id.startsWith('caminho_') || p.id.startsWith('trilha_')
          ? 'comparação T1/T2/T3'
          : 'acervo exportado; não necessariamente carregado',
}))
await Bun.write(
  resolve(saida, 'arte-instancias.json'),
  `${JSON.stringify(
    {
      referencia: arte.commit,
      proposta: {
        piso: 'templo',
        lago: 'l2',
        contexto: 'somente /macro',
        aprovacaoArtistica: false,
      },
      modelos,
      instancias,
      lago: LAGO_DA_FAISCA,
      passeios: {
        tipo: 'templo',
        regra:
          'mesma malha recortada/assentada em render e Rapier; UV nativas; juntas sem faces sobrepostas',
        modulos: passeiosDaFaisca('templo').map((p) => ({
          ...p,
          escala: 1,
          colisor: 'trimesh da geometria final, agrupada por material',
          apoio:
            'alturaNaMalhaDoSetor em cada vértice + perfil nativo; referência superior + 0,025 m',
        })),
      },
    },
    null,
    2,
  )}\n`,
)
const linhas = modelos.map(
  (p) =>
    `| \`${p.id}\` | ${p.origem} | ${p.dims.map((n) => n.toFixed(2)).join(' × ')} | \`${p.digest.slice(0, 12)}\` | ${p.estado} |`,
)
await Bun.write(
  resolve(saida, 'arte.md'),
  `# Arte utilizada no ensaio\n\nFontes, hashes SHA-256 completos, transformações e colisores por instância: [registro JSON](./arte-instancias.json). Medidas da coluna são largura × profundidade × altura. Binários permanecem privados em output.\n\nBiblioteca: \`${arte.commit}\`. Peças Morada têm seu próprio sourceCommit/sourceDigest; o acabamento creme é derivado e declarado em acabamento, sem modificar o GLB original.\n\n| ID | Origem | Metros | SHA-256 (prefixo) | Estado |\n|---|---|---|---|---|\n${linhas.join('\n')}\n`,
)
console.log(`${modelos.length} modelos, ${instancias.length} instâncias documentadas`)
