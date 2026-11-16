/** Registra instâncias e procedência, sem distribuir os binários privados do acervo. */
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { ARTE_DA_FAISCA as arte } from '../src/mundo/faisca/arte.generated'
import { assentamentoDaPeca } from '../src/sistemas/assentamento-da-faisca'
import { ESCADAS_DA_COLINA, RECORTE_DA_COLINA } from '../src/sistemas/colina-da-faisca'
import { COMPOSICAO_DA_FAISCA as colecao } from '../src/sistemas/composicao-faisca'
import { LAGO_DA_FAISCA } from '../src/sistemas/lago-da-faisca'
import { passeiosDaFaisca } from '../src/sistemas/passeios-da-faisca'

const saida = resolve(
  process.argv[2] ?? resolve(import.meta.dirname, '../../../docs/qa/2026-11-15-faisca-concepts'),
)
mkdirSync(saida, { recursive: true })
const apoios = new Map(colecao.map((p) => [p.id, assentamentoDaPeca(p)]))
for (const p of colecao)
  if (p.apoio) apoios.get(p.id)!.y = apoios.get(p.apoio)!.y + (p.deslocamentoY ?? 0)
const instancias = colecao.map((p) => ({
  ...p,
  y: apoios.get(p.id)!.y,
  fundacao: apoios.get(p.id)!.fundacao,
  contato: arte.pecas[p.peca as keyof typeof arte.pecas].colisao[0],
  colisores:
    p.solida === 'caixa'
      ? arte.pecas[p.peca as keyof typeof arte.pecas].colisao
      : p.solida === 'tronco'
        ? { forma: 'cilindro', raio: (p.raioDoTronco ?? 0.23) * p.escala, altura: 1.8 * p.escala }
        : p.solida
          ? { forma: 'trimesh do GLB na mesma transformação visual' }
          : null,
  estado: 'integrado ao ensaio; aceite artístico pendente',
}))
const modelos = Object.values(arte.pecas).map((p) => ({
  ...p,
  sourceCommit: 'sourceCommit' in p ? p.sourceCommit : arte.commit,
  acabamentoNoCenario:
    p.id === 'praca_terra_14x14'
      ? 'Terra cultivada por luminância, atlas e UV preservados'
      : p.id === 'lago_nadavel'
        ? 'Tom verde das margens harmonizado; materiais animados da água compartilhados com a nascente'
        : null,
  estado: colecao.some((c) => c.peca === p.id)
    ? 'integrado ao ensaio'
    : p.id === 'lago_nadavel'
      ? 'lago integrado'
      : p.id === 'coelho'
        ? 'NPC de estudo'
        : p.id.startsWith('caminho_') || p.id.startsWith('trilha_')
          ? 'rede de passeio / comparação T1-T3'
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
        referencias: 'docs/plans/2026-11-15-faisca-concepts-curadoria.md',
      },
      modelos,
      instancias,
      lago: LAGO_DA_FAISCA,
      colina: { lances: ESCADAS_DA_COLINA, recorte: RECORTE_DA_COLINA },
      nascente: {
        tipo: 'superfície de ligação derivada',
        materiais: 'água e espuma do lago_nadavel',
        apoio: '41 amostras por raio nas rochas reais, com borda e nível do lago',
        fonte: 'src/mundo/faisca/queda-do-lago.tsx',
      },
      passeios: {
        tipo: 'templo',
        regra:
          'mesma malha recortada/assentada no desenho e Rapier; UV nativas; juntas sem faces sobrepostas',
        modulos: passeiosDaFaisca('templo').map((p) => ({
          ...p,
          escala: 1,
          colisor: 'trimesh da geometria final, agrupada por material',
          apoio:
            'triângulos do setor, incluindo recortes; perfil nativo e referência superior + 0,025 m',
        })),
      },
    },
    null,
    2,
  )}\n`,
)
const linhas = modelos.map(
  (p) =>
    `| ${p.id} | ${p.origem} | ${p.dims.map((n) => n.toFixed(2)).join(' × ')} | ${p.digest.slice(0, 12)} | ${p.estado} |`,
)
await Bun.write(
  resolve(saida, 'arte.md'),
  [
    '# Arte utilizada na composição pelas imagens',
    '',
    'Fontes, SHA-256 completos, transformações e colisores: [registro JSON](./arte-instancias.json). Medidas em largura × profundidade × altura. Binários privados permanecem em output.',
    '',
    `Biblioteca: ${arte.commit}. Peças da Morada têm sourceCommit/sourceDigest próprios. Acabamentos de reboco, madeira e vidro estão declarados por parte. A ponte preserva geometria/UV, separando suas faces por acabamento. Tom de solo e margens aplicado no cenário está declarado à parte. Nenhuma adaptação modifica o arquivo fonte.`,
    '',
    '| ID | Origem | Metros | SHA-256 (prefixo) | Estado |',
    '|---|---|---|---|---|',
    ...linhas,
    '',
  ].join('\n'),
)
console.log(
  `${modelos.length} modelos preparados, ${instancias.length} instâncias documentadas em ${saida}`,
)
