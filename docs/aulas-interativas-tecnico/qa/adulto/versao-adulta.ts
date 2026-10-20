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
}

/** Arquivos copiados sem mudança: o jogo é o mesmo nas duas versões. */
const COPIADOS = ['blocos.json', 'projeto-final.szproject.json']
/** O Mapa da Aventura é material infantil; o Caderno do Aluno adulto ainda não existe. */
const IGNORADOS = ['mapa-da-aventura.pdf']

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
const PALAVRAS_DO_KIDS: [RegExp, string][] = [
  [/\baventuras?\b/i, 'aventura (use curso)'],
  [/\bfases?\b(?! do jogo)/i, 'fase (use aula; para o nível do jogo, escreva "fase do jogo")'],
  [/\bZappy\b/, 'Zappy (na plataforma adulta o recado não tem personagem)'],
  // `\b` do JavaScript não vê "é" como letra: "Dedé" escaparia da régua.
  [/(?<!\p{L})(?:Debinha|Dedé)(?!\p{L})/u, 'avatar infantil'],
  [/\bcrian(?:ça|ças|cinha)\b/i, 'criança'],
  [/\bum adulto\b/i, 'ajuda de um adulto'],
  [/Próxima parte/, 'Próxima seção'],
  [/Partes da fase/, 'Índice da aula'],
  [/Verificar esta parte/, 'Verificar esta etapa'],
  [/Objetivos desta parte/, 'Objetivos desta etapa'],
  [/Objetivo cumprido!/, 'Objetivo da etapa cumprido!'],
  [/Enviar meu (?:projeto|desenho)/, 'Enviar para o professor'],
  [/Enviar de novo/, 'Reenviar ao professor'],
  [/Projeto enviado!/, 'Projeto enviado ao professor'],
  [/Pegar meu certificado/, 'Emitir meu certificado'],
  [/Responder!|Tentar de novo!/, 'botão do quiz do Kids (use Enviar quiz)'],
  [/Copiar link de jogar/, 'Copiar link'],
  [/Enviar para a equipe/, 'Enviar ao professor'],
  [/Parte concluída/, 'Etapa concluída!'],
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
    .sort((a, b) => a.localeCompare(b) || ordem(a) - ordem(b))
  for (const nome of nomes) {
    const grupo = grupoDoArquivo(nome, prefixo)
    if (!grupo) throw new Error(`${pasta}/${nome}: arquivo sem regra na versão adulta`)
    grupos.set(grupo, [...(grupos.get(grupo) ?? []), nome])
  }
  for (const nomes of grupos.values())
    nomes.sort((a, b) => ordem(a) - ordem(b) || a.localeCompare(b))
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
  const antiga = lerTraducao(pasta, grupo)
  const feitas = new Map(antiga?.trechos.map((t) => [t.kids, t.adulto]) ?? [])
  const trechos: Trecho[] = []
  const vistos = new Set<string>()
  for (const nome of nomes) {
    for (const kids of textosDoArquivo(pasta, nome)) {
      if (vistos.has(kids)) continue
      vistos.add(kids)
      trechos.push({ onde: nome, kids, adulto: feitas.get(kids) ?? null })
    }
  }
  const removidos = (antiga?.trechos ?? []).filter((t) => !vistos.has(t.kids)).length
  const traducao: Traducao = { curso: pasta, grupo, trechos }
  mkdirSync(resolve(PASTA_TRADUCOES, pasta), { recursive: true })
  writeFileSync(caminhoTraducao(pasta, grupo), `${JSON.stringify(traducao, null, 2)}\n`)
  return {
    total: trechos.length,
    pendentes: trechos.filter((t) => t.adulto === null).length,
    removidos,
  }
}

class Pendencias extends Error {}

function dicionario(pasta: string, grupo: string): Map<string, string> {
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

export function manifestoAdulto(manifesto: unknown, d: Map<string, string>, onde: string): unknown {
  const walk = (v: unknown, caminho: string[]): unknown => {
    if (typeof v === 'string' && caminho.at(-1) === 'url') return linkAdulto(v, onde)
    if (typeof v === 'string')
      return v.trim() && ehTextoDoManifesto(caminho) ? traduzir(d, v, onde) : v
    if (Array.isArray(v)) return v.map((x) => walk(x, caminho))
    if (v && typeof v === 'object')
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, [...caminho, k])]))
    return v
  }
  const adulto = walk(manifesto, []) as Record<string, unknown>
  if (typeof adulto.courseSlug === 'string') adulto.courseSlug += sufixoSlugAdulto
  return adulto
}

export function markdownAdulto(texto: string, d: Map<string, string>, onde: string): string {
  const trechos = trechosMarkdown(texto)
    .map((t) => traduzir(d, t, onde).trim())
    .filter(Boolean)
  return `${trechos.join('\n\n')}\n`
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
          : markdownAdulto(texto, d, onde),
      )
    }
  }
  return saida
}

export function gravarCurso(prefixo: string, pasta: string) {
  const saida = gerarCurso(prefixo, pasta)
  const destino = resolve(PASTA_CURSOS_ADULTO, pasta)
  mkdirSync(destino, { recursive: true })
  for (const [nome, texto] of saida) writeFileSync(resolve(destino, nome), texto)
  for (const nome of COPIADOS)
    copyFileSync(resolve(PASTA_CURSOS, pasta, nome), resolve(destino, nome))
  return saida.size + COPIADOS.length
}

/** Os arquivos adultos gravados que não batem com o que a geração produziria agora. */
export function divergencias(prefixo: string, pasta: string): string[] {
  const destino = resolve(PASTA_CURSOS_ADULTO, pasta)
  const lidos = (nome: string) =>
    existsSync(resolve(destino, nome)) ? lf(readFileSync(resolve(destino, nome), 'utf8')) : null
  const erradas: string[] = []
  for (const [nome, texto] of gerarCurso(prefixo, pasta))
    if (lidos(nome) !== texto) erradas.push(`${pasta}/${nome}`)
  for (const nome of COPIADOS)
    if (lidos(nome) !== lf(readFileSync(resolve(PASTA_CURSOS, pasta, nome), 'utf8')))
      erradas.push(`${pasta}/${nome}`)
  return erradas
}

export { Pendencias }
