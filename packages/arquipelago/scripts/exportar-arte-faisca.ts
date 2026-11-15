/** Exportação local da seleção do piloto. Lê objetos Git, nunca a pasta de trabalho da arte. */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'

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
    'caixote_aberto',
  ],
  'reino/terreno': ['canteiro_horta', 'caminho_terra_reto', 'caminho_terra_curvo', 'lago_nadavel'],
  'faroeste/terreno': ['trilha_terra_reta', 'trilha_terra_curva'],
  'templo/terreno': ['caminho_lajes_reto', 'caminho_lajes_curvo'],
  'reino/castelo': ['poco_manivela_baixa'],
  'reino/personagens': ['coelho'],
  decoracao: ['farol_01_pacote', 'moinho_01_pacote', 'moinho_pas_01_pacote'],
  construcao: [
    'ponte_04_pacote',
    'lampiao_01_pacote',
    'cerca_02_pacote',
    'mesa_01_pacote',
    'mesa_02_pacote',
    'andaime_bambu_01_pacote',
    'plataforma_bambu_01_pacote',
  ],
  plataformas: ['casa_01_pacote', 'casa_02_pacote'],
  vegetacao: ['arvore_04_pacote', 'arbusto_04_pacote', 'folhagem_01_pacote'],
  tesouros: ['barril_01_pacote'],
  terreno: ['agua_ilha_pacote'],
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
  'lago_nadavel',
  'trilha_terra_reta',
  'trilha_terra_curva',
  'caminho_lajes_reto',
  'caminho_lajes_curvo',
  'mesa_01_pacote',
  'mesa_02_pacote',
  'andaime_bambu_01_pacote',
  'agua_ilha_pacote',
  'caixote_aberto',
  'plataforma_bambu_01_pacote',
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
    if (
      !item?.dims.every((v) => Number.isFinite(v) && v >= 0) ||
      item.dims.filter((v) => v > 0).length < 2
    )
      throw Error(`Item inválido: ${id}`)
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
    let lago = null
    if (id === 'lago_nadavel') {
      const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(dados)
      const pontos = new Map<string, number[]>()
      const arestas = new Map<string, number>()
      for (const node of doc.getRoot().listNodes())
        for (const prim of node.getMesh()?.listPrimitives() ?? []) {
          if (prim.getMaterial()?.getName() !== 'agua') continue
          const pos = prim.getAttribute('POSITION')!,
            idx = prim.getIndices()!,
            m = node.getWorldMatrix()
          const chave = (i: number) => {
            const p = pos.getElement(i, []),
              x = p[0]!,
              y = p[1]!,
              z = p[2]!
            const v = [
              m[0]! * x + m[4]! * y + m[8]! * z + m[12]!,
              m[1]! * x + m[5]! * y + m[9]! * z + m[13]!,
              m[2]! * x + m[6]! * y + m[10]! * z + m[14]!,
            ]
            const k = v.map((n) => n.toFixed(5)).join(',')
            pontos.set(k, v)
            return k
          }
          for (let i = 0; i < idx.getCount(); i += 3) {
            const ks = [0, 1, 2].map((j) => chave(idx.getScalar(i + j)))
            for (let j = 0; j < 3; j++) {
              const k = [ks[j]!, ks[(j + 1) % 3]!].sort().join('|')
              arestas.set(k, (arestas.get(k) ?? 0) + 1)
            }
          }
        }
      const borda = [
        ...new Set([...arestas].filter(([, n]) => n === 1).flatMap(([k]) => k.split('|'))),
      ].map((k) => pontos.get(k)!)
      if (borda.length < 16) throw Error('Contorno de água insuficiente')
      borda.sort((a, b) => Math.atan2(a[2]!, a[0]!) - Math.atan2(b[2]!, b[0]!))
      const e = item.encaixe as unknown as {
        borda_m: number
        agua_m: number
        contorno_furo: number[][]
      }
      lago = {
        borda: e.borda_m,
        nivel: e.agua_m,
        furo: e.contorno_furo.map((p) => [p[0], p[2]]),
        agua: borda.map((p) => [p[0], p[2]]),
      }
    }
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
      lago,
    }
    arquivos.push({ nome, dados })
  }
}
for (const a of arquivos) await Bun.write(resolve(destino, a.nome), a.dados)
const manifesto = { commit, referencia: pedido, pecas }
const arquivoDoManifesto = resolve(import.meta.dir, '../src/mundo/faisca/arte.generated.ts')
await Bun.write(
  arquivoDoManifesto,
  `// Gerado por scripts/exportar-arte-faisca.ts. Binários privados em output/faisca-arte.\n// biome-ignore-all lint/suspicious/noApproximativeNumericConstant: Coordenadas do catálogo, não constantes matemáticas.\nexport const ARTE_DA_FAISCA = ${JSON.stringify(manifesto, null, 2)} as const\n`,
)
const formato = Bun.spawnSync(
  [process.execPath, 'x', 'biome', 'format', '--write', arquivoDoManifesto],
  { cwd: resolve(import.meta.dir, '..') },
)
if (formato.exitCode !== 0) throw Error(formato.stderr.toString())
console.log(
  `${arquivos.length} modelos do commit ${commit}; ${(arquivos.reduce((s, a) => s + a.dados.length, 0) / 1048576).toFixed(2)} MB em ${destino}`,
)
