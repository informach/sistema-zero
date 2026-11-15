/** Exportação local da seleção do piloto. Lê objetos Git, nunca a pasta de trabalho da arte. */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

const repo = process.env.ARQUIPELAGO_ARTE_REPO ?? resolve(import.meta.dir, '../../../../artes-3d')
const pedido = process.argv[2] ?? '7816a7aca0ba6f7d93a90fe4c15f40638b01525f'
const destino = resolve(import.meta.dir, '../../../output/faisca-arte')
function git(...args: string[]) {
  const r = spawnSync('git', ['-C', repo, ...args], { maxBuffer: 32 * 1024 * 1024 })
  if (r.status !== 0) throw Error(r.stderr.toString())
  return r.stdout
}
const commit = git('rev-parse', `${pedido}^{commit}`).toString().trim()
const ler = (p: string) => git('show', `${commit}:biblioteca_aventura/${p}`)
const escolhas: Record<string, string[]> = {
  'reino/natureza': [
    'arvore_redonda_01',
    'arvore_redonda_02',
    'arvore_duas_copas',
    'arbusto_redondo_02',
    'flor_margarida_branca',
    'tufo_grama',
    'rocha_pequena',
    'rocha_seta',
    'toco',
  ],
  'reino/objetos': [
    'caixote_pequeno',
    'caixote_medio',
    'barril_em_pe',
    'placa_seta',
    'cerca_tabuas_3_5m',
  ],
  'reino/terreno': ['canteiro_horta', 'caminho_terra_reto', 'caminho_terra_curvo'],
  'reino/castelo': ['poco_manivela_baixa'],
  'reino/personagens': ['coelho'],
  decoracao: ['farol_01_pacote', 'moinho_01_pacote', 'moinho_pas_01_pacote'],
  construcao: ['ponte_04_pacote', 'lampiao_01_pacote', 'cerca_02_pacote'],
  plataformas: ['casa_01_pacote', 'casa_02_pacote'],
  vegetacao: ['arvore_04_pacote', 'arbusto_04_pacote', 'folhagem_01_pacote'],
  tesouros: ['barril_01_pacote'],
}
const ensaio = new Set([
  'caminho_terra_reto',
  'caminho_terra_curvo',
  'cerca_02_pacote',
  'casa_02_pacote',
  'arvore_04_pacote',
  'arbusto_04_pacote',
  'folhagem_01_pacote',
  'barril_01_pacote',
])
interface Item {
  id: string
  arquivo: string
  origem: string
  pacote: boolean
  rotulo: string
  dims: number[]
  tris: number
  colisao: { min: number[]; max: number[] }[]
  animacoes?: { id: string; duracao_s: number; velocidade_m_s?: number }[]
  encaixe?: { grade_m: number; raio_m?: number; pontos: { nome: string; posicao: number[] }[] }
}
const pecas: Record<string, unknown> = {},
  arquivos: { nome: string; dados: Buffer }[] = []
for (const [categoria, ids] of Object.entries(escolhas)) {
  const itens = (JSON.parse(ler(`${categoria}/catalogo.json`).toString()) as { itens: Item[] })
    .itens
  for (const id of ids) {
    const item = itens.find((i) => i.id === id)
    if (!item?.dims.every((v) => Number.isFinite(v) && v > 0)) throw Error(`Item inválido: ${id}`)
    const caminho = `${categoria}/${item.arquivo}`,
      dados = ler(caminho)
    if (dados.toString('utf8', 0, 4) !== 'glTF' || dados.readUInt32LE(8) !== dados.length)
      throw Error(`GLB inválido: ${id}`)
    const json = JSON.parse(dados.toString('utf8', 20, 20 + dados.readUInt32LE(12)).trim())
    const bin = 20 + dados.readUInt32LE(12) + 8
    const imagens = (json.images ?? []).map((img: { bufferView?: number }) => {
      if (img.bufferView === undefined) throw Error(`Textura externa em ${id}`)
      const v = json.bufferViews[img.bufferView]
      return createHash('sha256')
        .update(dados.subarray(bin + (v.byteOffset ?? 0), bin + (v.byteOffset ?? 0) + v.byteLength))
        .digest('hex')
    })
    const digest = createHash('sha256').update(dados).digest('hex')
    const nome = `${id}.${digest.slice(0, 12)}.glb`
    pecas[id] = {
      id,
      ensaio: ensaio.has(id),
      rotulo: item.rotulo,
      origem: item.origem,
      pacote: item.pacote,
      caminho,
      digest,
      arquivo: nome,
      dims: item.dims,
      tris: item.tris,
      bytes: dados.length,
      colisao: item.colisao,
      clipes: item.animacoes?.map((a) => ({
        id: a.id,
        duracao: a.duracao_s,
        velocidade: a.velocidade_m_s,
      })),
      imagens,
      encaixe: item.encaixe ?? null,
    }
    arquivos.push({ nome, dados })
  }
}
for (const a of arquivos) await Bun.write(resolve(destino, a.nome), a.dados)
const manifesto = { commit, referencia: pedido, pecas }
const arquivoDoManifesto = resolve(import.meta.dir, '../src/mundo/faisca/arte.generated.ts')
await Bun.write(
  arquivoDoManifesto,
  `// Gerado por scripts/exportar-arte-faisca.ts. Binários privados em output/faisca-arte.\nexport const ARTE_DA_FAISCA = ${JSON.stringify(manifesto, null, 2)} as const\n`,
)
const formato = Bun.spawnSync(
  [process.execPath, 'x', 'biome', 'format', '--write', arquivoDoManifesto],
  { cwd: resolve(import.meta.dir, '..') },
)
if (formato.exitCode !== 0) throw Error(formato.stderr.toString())
console.log(
  `${arquivos.length} modelos do commit ${commit}; ${(arquivos.reduce((s, a) => s + a.dados.length, 0) / 1048576).toFixed(2)} MB em ${destino}`,
)
