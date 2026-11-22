/**
 * Projetos dos manifestos já organizados (pedido da responsável, 22/11/2026). A cada importação o projeto
 * inicial e os exemplos chegavam com as áreas umas por cima das outras: os geradores põem cada área num
 * lugar fixo, sem saber o tamanho da pilha, e ela organizava à mão no Admin, bloco por bloco de Estúdio.
 *
 * Aqui cada projeto (o `initialProject` e cada `projectExamples.examples[*]` dos blocos de Estúdio) é
 * aberto num navegador com o Blockly do Estúdio e passa pelo mesmo "Organizar blocos" do Estúdio e do
 * Admin (organize.ts). Do resultado só voltam as posições x e y das pilhas do topo; o resto do manifesto
 * fica como estava. As posições ficam num cache por conteúdo (.cache/organizar-projetos.json): gerar de
 * novo um curso que não mudou não abre o navegador.
 *
 * Uso: bun organizar-projetos.ts [--conferir] [pasta ou manifesto...]
 *   sem caminho: os cursos do Faísca (Corre, Dino!, O Jogo do Meu Jeito e a Nave vão ser refeitos no
 *   mesmo padrão e ficam de fora até lá); --conferir só diz o que mudaria (sai com 1).
 * Os geradores chamam organizarManifestos(pasta do curso) depois de gravar.
 */
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve, sep } from 'node:path'
import { PASTA_CURSOS } from './caminhos'
import { formatarJson } from './formatar-json'
import { gravarArquivo } from './gravar-arquivo'

const RAIZ = resolve(import.meta.dir, '../../..')
const CACHE = join(RAIZ, '.cache', 'organizar-projetos.json')
/** Muda quando o jeito de organizar muda (organize.ts, blocos, fontes): o cache velho deixa de valer. */
const VERSAO = 1

type Topo = { x?: number; y?: number; [k: string]: unknown }
type Projeto = {
  blocksState?: { blocks?: { blocks?: Topo[] } }
  installedExtensions?: { id: string }[]
}
type Bloco = {
  key: string
  content?: {
    kind?: string
    initialProject?: Projeto
    projectExamples?: { examples?: Record<string, Projeto> }
  }
}

function manifestosEm(caminho: string): string[] {
  if (caminho.endsWith('.manifesto.json')) return [resolve(caminho)]
  return readdirSync(caminho, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? manifestosEm(join(caminho, e.name))
      : e.name.endsWith('.manifesto.json')
        ? [resolve(caminho, e.name)]
        : [],
  )
}

/** Os projetos de um manifesto que têm blocos, com um rótulo legível. */
function projetosDe(manifesto: { blocks: Bloco[] }): { rotulo: string; projeto: Projeto }[] {
  return manifesto.blocks.flatMap((b) => {
    const c = b.content
    if (c?.kind !== 'studio') return []
    const lista: { rotulo: string; projeto: Projeto }[] = []
    if (c.initialProject) lista.push({ rotulo: `${b.key}/inicial`, projeto: c.initialProject })
    for (const [id, p] of Object.entries(c.projectExamples?.examples ?? {}))
      lista.push({ rotulo: `${b.key}/exemplo ${id}`, projeto: p })
    return lista.filter((x) => (x.projeto.blocksState?.blocks?.blocks?.length ?? 0) > 0)
  })
}

/** A chave do cache: o conteúdo dos blocos sem as posições do topo, e as extensões. */
function chaveDe(projeto: Projeto): string {
  const topo = (projeto.blocksState?.blocks?.blocks ?? []).map(
    ({ x: _x, y: _y, ...resto }) => resto,
  )
  const extensoes = (projeto.installedExtensions ?? []).map((e) => e.id).sort()
  return createHash('sha256').update(JSON.stringify({ VERSAO, topo, extensoes })).digest('hex')
}

function lerCache(): Record<string, { x: number; y: number }[]> {
  try {
    return JSON.parse(readFileSync(CACHE, 'utf8'))
  } catch {
    return {}
  }
}

/** Organiza os manifestos (pastas ou arquivos). Devolve os que mudaram (ou mudariam, em conferir). */
export function organizarManifestos(
  caminhos: string[],
  opcoes: { conferir?: boolean } = {},
): string[] {
  const arquivos = [...new Set(caminhos.flatMap(manifestosEm))]
  const lidos = arquivos.map((arquivo) => {
    const texto = readFileSync(arquivo, 'utf8')
    const manifesto = JSON.parse(texto)
    // O manifesto volta no estilo em que estava: o do Biome ou, num arquivo maior que o files.maxSize do
    // Biome (2 MB, como Moedas no caminho), o JSON.stringify puro, que o Biome não reformata.
    const puro = texto === `${JSON.stringify(manifesto, null, 2)}\n`
    return { arquivo, manifesto, puro }
  })
  const cache = lerCache()
  const faltam = new Map<string, Projeto>()
  for (const { manifesto } of lidos)
    for (const { projeto } of projetosDe(manifesto)) {
      const chave = chaveDe(projeto)
      if (!cache[chave]) faltam.set(chave, projeto)
    }
  if (faltam.size) {
    const pasta = join(tmpdir(), `sz-organizar-${process.pid}-${Date.now()}`)
    mkdirSync(pasta, { recursive: true })
    try {
      const pedido = [...faltam].map(([chave, p]) => ({
        chave,
        blocksState: p.blocksState,
        extensoes: (p.installedExtensions ?? []).map((e) => e.id),
      }))
      writeFileSync(join(pasta, 'pedido.json'), JSON.stringify(pedido))
      const r = Bun.spawnSync({
        cmd: [
          'node',
          join(import.meta.dir, 'organizar-projetos-navegador.mjs'),
          join(pasta, 'pedido.json'),
          join(pasta, 'resposta.json'),
        ],
        cwd: RAIZ,
        stdout: 'pipe',
        stderr: 'pipe',
      })
      if (r.exitCode !== 0)
        throw new Error(
          `O navegador não organizou os projetos: ${r.stderr.toString().slice(-2000)}`,
        )
      Object.assign(cache, JSON.parse(readFileSync(join(pasta, 'resposta.json'), 'utf8')))
      mkdirSync(join(RAIZ, '.cache'), { recursive: true })
      writeFileSync(CACHE, JSON.stringify(cache))
    } finally {
      rmSync(pasta, { recursive: true, force: true })
    }
  }
  const mudaram: string[] = []
  for (const { arquivo, manifesto, puro } of lidos) {
    let mudou = false
    for (const { projeto } of projetosDe(manifesto)) {
      const posicoes = cache[chaveDe(projeto)]
      const topo = projeto.blocksState?.blocks?.blocks ?? []
      if (!posicoes || posicoes.length !== topo.length)
        throw new Error(`${arquivo}: posições sem as pilhas do projeto`)
      topo.forEach((b, i) => {
        const { x, y } = posicoes[i] as { x: number; y: number }
        if (b.x !== x || b.y !== y) {
          b.x = x
          b.y = y
          mudou = true
        }
      })
    }
    if (!mudou) continue
    mudaram.push(arquivo)
    if (!opcoes.conferir)
      gravarArquivo(
        arquivo,
        puro ? `${JSON.stringify(manifesto, null, 2)}\n` : formatarJson(manifesto),
      )
  }
  return mudaram
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const conferir = args.includes('--conferir')
  const caminhos = args.filter((a) => !a.startsWith('--'))
  const alvos = caminhos.length ? caminhos : [join(PASTA_CURSOS, 'faisca')]
  const mudaram = organizarManifestos(
    alvos.filter((a) => existsSync(a) && (statSync(a).isDirectory() || a.endsWith('.json'))),
    { conferir },
  )
  for (const m of mudaram)
    console.log(
      `${conferir ? 'desorganizado' : 'organizado'}: ${relative(PASTA_CURSOS, m).split(sep).join('/')}`,
    )
  console.log(`${mudaram.length} manifesto(s) ${conferir ? 'por organizar' : 'organizados agora'}.`)
  if (conferir && mudaram.length) process.exit(1)
}
