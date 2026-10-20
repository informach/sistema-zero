/**
 * A versão adulta dos cursos (decisão de 20/10/2026): os mesmos jogos, aulas, seções, blocos e
 * verificações do Kids, com o texto reescrito para adultos. A estrutura vem SEMPRE dos arquivos
 * kids; o adulto guarda só o texto, em `traducoes/<curso>/<grupo>.json`, como pares
 * `{ kids, adulto }`. Um grupo é um trio de aula (conteúdo, roteiro e manifesto juntos, para a
 * mesma frase ter a mesma versão nos três) ou `_curso` (README e módulos).
 *
 * Se um texto kids mudar, o par antigo deixa de casar e o trecho volta como pendente (`adulto:
 * null`): a versão adulta nunca fica com uma frase velha sem ninguém perceber. Regras de escrita
 * em `../../DIRETRIZES-ADULTO.md`.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { CURSOS_POR_PREFIXO, PASTA_CURSOS, PASTA_CURSOS_ADULTO } from '../caminhos'

export const PASTA_TRADUCOES = resolve(import.meta.dir, 'traducoes')

/** O curso adulto é outro curso no Admin, e o slug de curso é único entre as duas plataformas. */
export const sufixoSlugAdulto = '-adulto'

export interface Trecho {
  /** O primeiro arquivo em que o trecho aparece, para dar contexto a quem escreve. */
  onde: string
  kids: string
  /** `null` = ainda sem versão adulta; `""` = o trecho sai da versão adulta. */
  adulto: string | null
}
export interface Traducao {
  curso: string
  grupo: string
  trechos: Trecho[]
  /** Pares cujo texto kids mudou ou saiu: ficam de referência para reescrever o trecho novo. */
  obsoletos?: { kids: string; adulto: string }[]
}

/** Arquivos copiados sem mudança: o jogo é o mesmo nas duas versões. */
const COPIADOS = ['blocos.json', 'projeto-final.szproject.json']
/** O Mapa da Aventura é material infantil; o Caderno do Aluno adulto ainda não existe. */
const IGNORADOS = ['mapa-da-aventura.pdf']
/**
 * O Caderno do Aluno adulto é gerado à parte, pelos geradores de `recursos/` com `--adulto`, a partir
 * da tradução `traducoes/<curso>/_caderno.json`. A geração das aulas não o apaga nem o confere.
 */
export const CADERNO_ADULTO = 'caderno-do-aluno.pdf'
export const GRUPO_DO_CADERNO = '_caderno'
const DE_OUTRO_GERADOR = [CADERNO_ADULTO]

/**
 * Os campos do manifesto que viram tela ou direção de vídeo. Projetos, regras de verificação e
 * nomes de peças das experiências ficam de fora: são o jogo, igual para os dois públicos.
 */
const CAMPOS_DE_TEXTO = new Set([
  'title',
  'objective',
  'label',
  'pedido',
  'plannedVideo',
  'text',
  'instructions',
  'hints',
  'bodyText',
  'coursePhrase',
  'introLine',
  'markdown',
  'prompt',
  'explanation',
  'summary',
])
/**
 * As outras chaves de texto dos manifestos são identificadores ou valores do motor, iguais nos
 * dois públicos. Um campo de texto fora desta lista e de `CAMPOS_DE_TEXTO` para a geração: sem
 * isso, um texto de tela novo no kids chegaria ao adulto sem tradução e sem aviso.
 */
const CHAVES_SEM_TEXTO = new Set([
  'courseSlug',
  'lessonSlug',
  'key',
  'kind',
  'pose',
  'type',
  'scene',
  'cenario',
  'purpose',
  'chain',
  'level',
  'allowedModes',
  'allowBlocks',
  'intent',
  'blockKeys',
  'blockIds',
  'workspaceKey',
  'id',
  'retireBlockKeys',
  'correctChoiceIds',
  'completion',
  'goals',
  'url',
  'externalTool',
  'pilha',
])
const RAMOS_DO_JOGO = new Set([
  'project',
  'initialProject',
  'projectExamples',
  'rule',
  'files',
  'ir',
  'blocksState',
  'preset',
  'targets',
  'cast',
])

/**
 * O que o adulto nunca lê: o vocabulário da aventura, o mascote, os avatares infantis e os nomes
 * de botão do Kids (a tela adulta diz outra coisa, ver `ADULT_LESSON_COPY`). "Fase" só vale como
 * a fase do jogo, dita assim.
 */
// `\b` do JavaScript não vê letra acentuada como letra ("Dedé", "criançada"): palavras com
// acento usam as bordas `\p{L}`.
const PALAVRAS_DO_KIDS: [RegExp, string][] = [
  [/\baventuras?\b/i, 'aventura (use curso)'],
  // "O jogo da fase" e "Cor da nave na fase" são rótulos da experiência copy-vs-original, iguais
  // nos dois públicos: a fala cita o que está na tela.
  [
    /(?<!jogo da |nave na )\bfases?\b(?! do jogo)/i,
    'fase (use aula; para o nível do jogo, escreva "fase do jogo")',
  ],
  [/\bzappy\b/i, 'Zappy (na plataforma adulta o recado não tem personagem)'],
  [/(?<!\p{L})(?:Debinha|Dedé)(?!\p{L})/u, 'avatar infantil'],
  [/(?<!\p{L})crian(?:ça|ças|cinha|çada)(?!\p{L})/iu, 'criança'],
  [/\bum adulto\b/i, 'ajuda de um adulto'],
  [/Próxima parte/i, 'Próxima seção'],
  [/Partes da (?:fase|aula)/i, 'Índice da aula'],
  [/Verificar esta parte/i, 'Verificar esta etapa'],
  [/Objetivos desta parte/i, 'Objetivos desta etapa'],
  [/Objetivo cumprido!/i, 'Objetivo da etapa cumprido!'],
  [/Ainda falta um objetivo\b(?! desta)/i, 'Ainda falta cumprir um objetivo desta etapa'],
  [/Enviar meu (?:projeto|desenho)/i, 'Enviar para o professor'],
  [/Enviar de novo/i, 'Reenviar ao professor'],
  [/Projeto enviado!/i, 'Projeto enviado ao professor'],
  [/Pegar meu certificado/i, 'Emitir meu certificado'],
  [/Responder!|Tentar de novo!/i, 'botão do quiz do Kids (use Enviar quiz)'],
  [/Copiar link de jogar/i, 'Copiar link'],
  [/Enviar para a equipe/i, 'Enviar ao professor'],
  [/Parte concluída/i, 'Etapa concluída!'],
  [/Seu projeto no Estúdio/i, 'Atividade no Estúdio (cabeçalho do bloco no adulto)'],
  [/Recado \(opcional\)/i, 'Recado para o professor'],
  [/Mostrar menu/i, 'Mostrar menu (só existe no Kids)'],
  [/\/como-fazer\/(?:plataforma-|como-fazer\b)/, 'link do Como fazer do Kids'],
  [/Que conquista|arrasou|\bUhu\b/i, 'comemoração infantil'],
]

export function palavrasDoKids(texto: string): string[] {
  return PALAVRAS_DO_KIDS.filter(([regra]) => regra.test(texto)).map(([, nome]) => nome)
}

export function cursos(): { prefixo: string; pasta: string }[] {
  return Object.entries(CURSOS_POR_PREFIXO).map(([prefixo, pasta]) => ({ prefixo, pasta }))
}

const lf = (texto: string) => texto.replaceAll('\r\n', '\n')

/** Markdown em trechos separados por linha em branco; um bloco de fala com `>` fica inteiro. */
export function trechosMarkdown(texto: string): string[] {
  return lf(texto)
    .split(/\n{2,}/)
    .map((t) => t.trim())
    .filter(Boolean)
}

function ehTextoDoManifesto(caminho: string[]): boolean {
  const campo = caminho.at(-1)
  return !!campo && CAMPOS_DE_TEXTO.has(campo) && !caminho.some((p) => RAMOS_DO_JOGO.has(p))
}

/** Cada texto de tela do manifesto, na ordem do arquivo. */
export function textosManifesto(manifesto: unknown): string[] {
  const textos: string[] = []
  const walk = (v: unknown, caminho: string[]) => {
    if (typeof v === 'string') {
      if (v.trim() && ehTextoDoManifesto(caminho)) textos.push(v)
    } else if (Array.isArray(v)) {
      for (const x of v) walk(x, caminho)
    } else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) walk(x, [...caminho, k])
    }
  }
  walk(manifesto, [])
  return textos
}

/** O grupo de um arquivo do curso: o trio da aula, `_curso`, ou nada (copiado ou ignorado). */
export function grupoDoArquivo(nome: string, prefixo: string): string | null {
  if (!nome.startsWith(`${prefixo}-`)) return nome.endsWith('.md') ? '_curso' : null
  return nome.replace(/(?:\.manifesto\.json|\.roteiro\.md|\.md)$/, '')
}

/** Os arquivos kids do curso que têm texto, agrupados, na ordem conteúdo → roteiro → manifesto. */
export function arquivosPorGrupo(prefixo: string, pasta: string): Map<string, string[]> {
  const ordem = (n: string) =>
    n.endsWith('.manifesto.json') ? 2 : n.endsWith('.roteiro.md') ? 1 : 0
  const grupos = new Map<string, string[]>()
  const nomes = readdirSync(resolve(PASTA_CURSOS, pasta))
    .filter((n) => !COPIADOS.includes(n) && !IGNORADOS.includes(n))
    .sort()
  for (const nome of nomes) {
    const grupo = grupoDoArquivo(nome, prefixo)
    if (!grupo) throw new Error(`${pasta}/${nome}: arquivo sem regra na versão adulta`)
    grupos.set(grupo, [...(grupos.get(grupo) ?? []), nome])
  }
  for (const nomes of grupos.values()) nomes.sort((a, b) => ordem(a) - ordem(b) || (a < b ? -1 : 1))
  return grupos
}

function textosDoArquivo(pasta: string, nome: string): string[] {
  const texto = readFileSync(resolve(PASTA_CURSOS, pasta, nome), 'utf8')
  return nome.endsWith('.json') ? textosManifesto(JSON.parse(texto)) : trechosMarkdown(texto)
}

export function caminhoTraducao(pasta: string, grupo: string): string {
  return resolve(PASTA_TRADUCOES, pasta, `${grupo}.json`)
}

export function lerTraducao(pasta: string, grupo: string): Traducao | null {
  const caminho = caminhoTraducao(pasta, grupo)
  return existsSync(caminho) ? (JSON.parse(readFileSync(caminho, 'utf8')) as Traducao) : null
}

/**
 * Refaz a lista de trechos a partir dos arquivos kids de agora. O que já tem versão adulta
 * continua; o que é novo entra como `null`; o que saiu do kids sai da lista.
 */
export function prepararGrupo(pasta: string, grupo: string, nomes: string[]) {
  return prepararTextos(
    pasta,
    grupo,
    nomes.flatMap((nome) => textosDoArquivo(pasta, nome).map((kids) => ({ onde: nome, kids }))),
  )
}

/** O mesmo preparo para qualquer lista de textos kids (o caderno usa este, com `_caderno`). */
export function prepararTextos(
  pasta: string,
  grupo: string,
  textos: { onde: string; kids: string }[],
) {
  const antiga = lerTraducao(pasta, grupo)
  const feitas = new Map(antiga?.trechos.map((t) => [t.kids, t.adulto]) ?? [])
  const trechos: Trecho[] = []
  const vistos = new Set<string>()
  for (const { onde, kids } of textos) {
    if (vistos.has(kids)) continue
    vistos.add(kids)
    trechos.push({ onde, kids, adulto: feitas.get(kids) ?? null })
  }
  const saiu = (antiga?.trechos ?? []).filter((t) => !vistos.has(t.kids))
  const obsoletos = [
    ...saiu.flatMap((t) => (t.adulto ? [{ kids: t.kids, adulto: t.adulto }] : [])),
    ...(antiga?.obsoletos ?? []).filter((t) => !vistos.has(t.kids)),
  ].filter((t, i, todos) => todos.findIndex((o) => o.kids === t.kids) === i)
  const traducao: Traducao = {
    curso: pasta,
    grupo,
    trechos,
    ...(obsoletos.length ? { obsoletos } : {}),
  }
  mkdirSync(resolve(PASTA_TRADUCOES, pasta), { recursive: true })
  writeFileSync(caminhoTraducao(pasta, grupo), `${JSON.stringify(traducao, null, 2)}\n`)
  return {
    total: trechos.length,
    pendentes: trechos.filter((t) => t.adulto === null).length,
    removidos: saiu.length,
  }
}

class Pendencias extends Error {}

export function dicionario(pasta: string, grupo: string): Map<string, string> {
  const traducao = lerTraducao(pasta, grupo)
  if (!traducao) throw new Pendencias(`${pasta}/${grupo}: sem tradução. Rode com --preparar.`)
  const pendentes = traducao.trechos.filter((t) => t.adulto === null).length
  if (pendentes) throw new Pendencias(`${pasta}/${grupo}: ${pendentes} trecho(s) sem versão adulta`)
  return new Map(traducao.trechos.map((t) => [t.kids, t.adulto as string]))
}

function traduzir(d: Map<string, string>, kids: string, onde: string): string {
  const adulto = d.get(kids)
  if (adulto === undefined)
    throw new Pendencias(`${onde}: trecho novo no kids, rode com --preparar: ${kids.slice(0, 80)}`)
  return adulto
}

/**
 * O endereço de um tutorial não é texto para reescrever: a biblioteca adulta tem outros slugs
 * (`docs/como-fazer-adulto/como-fazer.json`). Tabela espelhada em DIRETRIZES-ADULTO.md.
 */
export const COMO_FAZER_ADULTO: Record<string, string> = {
  '/como-fazer/plataforma-abrir-uma-aula': '/como-fazer/aula-abrir-e-passar-de-secao',
  '/como-fazer/plataforma-ampliar-a-atividade': '/como-fazer/estudio-usar-na-aula',
  '/como-fazer/plataforma-baixar-materiais': '/como-fazer/aula-baixar-materiais',
  '/como-fazer/plataforma-mostrar-o-menu': '/como-fazer/primeiros-menu-do-alto',
  '/como-fazer/plataforma-pedir-ajuda': '/como-fazer/aula-pedir-ajuda',
  '/como-fazer/plataforma-publicar-no-mural': '/como-fazer/comunidade-publicar-no-mural',
  '/como-fazer/plataforma-voltar-para-a-aula': '/como-fazer/primeiros-continuar-o-curso',
  '/como-fazer/como-fazer': '/como-fazer/primeiros-achar-um-passo-a-passo',
}

function linkAdulto(url: string, onde: string): string {
  if (!url.startsWith('/como-fazer/')) return url
  const adulto = COMO_FAZER_ADULTO[url]
  if (!adulto) throw new Pendencias(`${onde}: link do Como fazer sem par adulto: ${url}`)
  return adulto
}

function textoDoManifestoAdulto(
  v: string,
  caminho: string[],
  d: Map<string, string>,
  onde: string,
): string {
  const campo = caminho.at(-1) ?? ''
  if (campo === 'url') return linkAdulto(v, onde)
  if (!v.trim() || caminho.some((p) => RAMOS_DO_JOGO.has(p))) return v
  if (CAMPOS_DE_TEXTO.has(campo)) {
    const adulto = traduzir(d, v, onde)
    // Num campo de tela, vazio não é "tirar o trecho": viraria um título ou recado em branco.
    if (!adulto.trim())
      throw new Pendencias(
        `${onde}: o campo ${campo} ficou vazio na versão adulta: ${v.slice(0, 80)}`,
      )
    return adulto
  }
  if (!CHAVES_SEM_TEXTO.has(campo))
    throw new Pendencias(`${onde}: campo novo ${caminho.join('.')} sem regra na versão adulta`)
  return v
}

export function manifestoAdulto(manifesto: unknown, d: Map<string, string>, onde: string): unknown {
  const walk = (v: unknown, caminho: string[]): unknown => {
    if (typeof v === 'string') return textoDoManifestoAdulto(v, caminho, d, onde)
    if (Array.isArray(v)) return v.map((x) => walk(x, caminho))
    if (v && typeof v === 'object')
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, [...caminho, k])]))
    return v
  }
  const adulto = walk(manifesto, []) as Record<string, unknown>
  if (typeof adulto.courseSlug === 'string') adulto.courseSlug += sufixoSlugAdulto
  return adulto
}

const ROTULO_DA_PROFESSORA = '**Professora:**'

/**
 * Sem o avatar no meio, duas falas da professora ficariam seguidas, cada uma com o próprio rótulo.
 * Elas viram uma fala só: o rótulo repetido sai e as duas citações se juntam por uma linha `>`.
 */
function juntarFalasDaProfessora(trechos: string[]): string[] {
  const saida: string[] = []
  let juntar = false
  for (const trecho of trechos) {
    const anterior = saida.at(-1)
    if (trecho === ROTULO_DA_PROFESSORA && anterior?.startsWith('>')) {
      juntar = true
      continue
    }
    if (juntar && anterior && trecho.startsWith('>')) {
      saida[saida.length - 1] =
        `${anterior.replace(/[”"]\s*$/, '')}\n>\n${trecho.replace(/^>\s*[“"]/, '> ')}`
      juntar = false
      continue
    }
    if (juntar) saida.push(ROTULO_DA_PROFESSORA)
    juntar = false
    saida.push(trecho)
  }
  if (juntar) saida.push(ROTULO_DA_PROFESSORA)
  return saida
}

/** Primeira linha de todo Markdown adulto: de onde ele vem e onde se edita. */
export function procedencia(pasta: string, nome: string, grupo: string): string {
  return `<!-- Versão adulta gerada por docs/aulas-interativas-tecnico/qa/adulto/gerar-adulto.ts a partir de kids/${pasta}/${nome} e de qa/adulto/traducoes/${pasta}/${grupo}.json. Não edite este arquivo: edite a tradução e gere de novo. -->`
}

export function markdownAdulto(
  texto: string,
  d: Map<string, string>,
  onde: string,
  cabecalho?: string,
): string {
  const trechos = trechosMarkdown(texto)
    .map((t) => traduzir(d, t, onde).trim())
    .filter(Boolean)
  const corpo = juntarFalasDaProfessora(trechos)
  return `${(cabecalho ? [cabecalho, ...corpo] : corpo).join('\n\n')}\n`
}

/** O conteúdo adulto de cada arquivo do curso, sem gravar. Falha se faltar alguma versão. */
export function gerarCurso(prefixo: string, pasta: string): Map<string, string> {
  const saida = new Map<string, string>()
  for (const [grupo, nomes] of arquivosPorGrupo(prefixo, pasta)) {
    const d = dicionario(pasta, grupo)
    for (const nome of nomes) {
      const texto = readFileSync(resolve(PASTA_CURSOS, pasta, nome), 'utf8')
      const onde = `${pasta}/${nome}`
      saida.set(
        nome,
        nome.endsWith('.json')
          ? `${JSON.stringify(manifestoAdulto(JSON.parse(texto), d, onde), null, 2)}\n`
          : markdownAdulto(texto, d, onde, procedencia(pasta, nome, grupo)),
      )
    }
  }
  return saida
}

export function gravarCurso(prefixo: string, pasta: string) {
  const saida = gerarCurso(prefixo, pasta)
  const destino = resolve(PASTA_CURSOS_ADULTO, pasta)
  mkdirSync(destino, { recursive: true })
  // Aula que saiu do kids não pode deixar um manifesto adulto velho, importável, para trás.
  for (const nome of readdirSync(destino))
    if (!saida.has(nome) && !COPIADOS.includes(nome) && !DE_OUTRO_GERADOR.includes(nome))
      rmSync(resolve(destino, nome))
  for (const [nome, texto] of saida) writeFileSync(resolve(destino, nome), texto)
  for (const nome of COPIADOS)
    copyFileSync(resolve(PASTA_CURSOS, pasta, nome), resolve(destino, nome))
  // Mesmo formato que a CI confere (biome ci), como nos geradores kids.
  const manifestos = [...saida.keys()]
    .filter((nome) => nome.endsWith('.json'))
    .map((nome) => resolve(destino, nome))
  const formatado = Bun.spawnSync({
    cmd: [process.execPath, 'x', 'biome', 'format', '--write', ...manifestos],
    cwd: resolve(import.meta.dir, '../../../..'),
    stdout: 'pipe',
    stderr: 'pipe',
  })
  if (formatado.exitCode !== 0) throw new Error(`biome format falhou: ${formatado.stderr}`)
  return saida.size + COPIADOS.length
}

/**
 * Os arquivos adultos que não batem com o que a geração produziria agora, os que sobraram de uma
 * aula que saiu do kids e as traduções sem aula. Manifesto compara pelo conteúdo, porque o biome
 * reformata o JSON gravado.
 */
export function divergencias(prefixo: string, pasta: string): string[] {
  const destino = resolve(PASTA_CURSOS_ADULTO, pasta)
  const lidos = (nome: string) =>
    existsSync(resolve(destino, nome)) ? lf(readFileSync(resolve(destino, nome), 'utf8')) : null
  const iguais = (nome: string, gravado: string | null, esperado: string) =>
    gravado !== null &&
    (nome.endsWith('.json')
      ? Bun.deepEquals(JSON.parse(gravado), JSON.parse(esperado))
      : gravado === esperado)
  const erradas: string[] = []
  const saida = gerarCurso(prefixo, pasta)
  for (const [nome, texto] of saida)
    if (!iguais(nome, lidos(nome), texto)) erradas.push(`${pasta}/${nome}`)
  for (const nome of COPIADOS)
    if (lidos(nome) !== lf(readFileSync(resolve(PASTA_CURSOS, pasta, nome), 'utf8')))
      erradas.push(`${pasta}/${nome}`)
  if (existsSync(destino))
    for (const nome of readdirSync(destino))
      if (!saida.has(nome) && !COPIADOS.includes(nome) && !DE_OUTRO_GERADOR.includes(nome))
        erradas.push(`${pasta}/${nome} (sobrou)`)
  const grupos = arquivosPorGrupo(prefixo, pasta)
  if (existsSync(resolve(PASTA_TRADUCOES, pasta)))
    for (const nome of readdirSync(resolve(PASTA_TRADUCOES, pasta)))
      if (!grupos.has(nome.replace(/\.json$/, '')) && nome !== `${GRUPO_DO_CADERNO}.json`)
        erradas.push(`traducoes/${pasta}/${nome} (sem aula)`)
  return erradas
}

export { Pendencias }
