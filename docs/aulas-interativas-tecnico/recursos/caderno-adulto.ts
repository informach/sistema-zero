/**
 * O mesmo gerador faz o Mapa da Aventura (kids) e o Caderno do Aluno (adulto). Todo texto que o
 * caderno imprime passa por `t()`:
 *
 *   sem flag      kids: o texto como está.
 *   --coletar     anota cada texto em `qa/adulto/traducoes/<curso>/_caderno.json` (novos entram
 *                 como null, os já traduzidos continuam) e não gera o PDF.
 *   --adulto      devolve a versão adulta de cada texto e para se faltar alguma.
 *
 * A estrutura (capítulos, passos, encaixes e cores dos blocos) é a mesma nos dois; só o texto muda.
 */
import { resolve } from 'node:path'
import {
  dicionario,
  GRUPO_DO_CADERNO,
  Pendencias,
  prepararTextos,
} from '../qa/adulto/versao-adulta'
import { PASTA_CURSOS, PASTA_CURSOS_ADULTO } from '../qa/caminhos'

export type Publico = 'kids' | 'coletar' | 'adulto'

export function publicoDoCaderno(argv: string[] = process.argv): Publico {
  if (argv.includes('--coletar')) return 'coletar'
  return argv.includes('--adulto') ? 'adulto' : 'kids'
}

export interface Tradutor {
  publico: Publico
  /** Adulto: sem mascote, "Caderno do Aluno" e o PDF na pasta adulta. */
  adulto: boolean
  t(kids: string, onde?: string): string
  /** Caminho do PDF que este público grava. */
  saida: string
  /** No modo `--coletar`, grava a lista de textos; devolve `true` quando o gerador deve parar. */
  concluir(): boolean
}

const TEM_LETRA = /\p{L}/u

/**
 * Passa o texto de um HTML pronto (o caderno do Cadê é um template) por `t()`: o conteúdo inteiro
 * de cada parágrafo, título, item e legenda (com as marcações de dentro, para a frase não se
 * partir), os atributos que se leem (`alt`, `title`, `aria-label`) e, por último, qualquer texto
 * solto que sobrar, para nada passar sem versão adulta. Estilos e scripts ficam como estão.
 */
export function traduzirHtml(html: string, t: (texto: string) => string): string {
  const guardados: string[] = []
  // Marcador de uso privado: não aparece em texto de caderno nem é caractere de controle.
  const guardar = (pedaco: string) => `${guardados.push(pedaco) - 1}`
  const comEspacos = (texto: string) => {
    const miolo = texto.trim()
    return miolo && TEM_LETRA.test(miolo) ? texto.replace(miolo, t(miolo)) : texto
  }
  let s = html.replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, guardar)
  s = s.replace(/\b(alt|title|aria-label)="([^"]*)"/g, (_, nome: string, valor: string) =>
    guardar(`${nome}="${comEspacos(valor)}"`),
  )
  s = s.replace(
    /<(p|li|h[1-6]|figcaption|td|th|dt|dd|button|label|caption)(\b[^>]*)>([\s\S]*?)<\/\1>/gi,
    (_, tag: string, attrs: string, miolo: string) =>
      guardar(`<${tag}${attrs}>${comEspacos(miolo)}</${tag}>`),
  )
  s = s.replace(/>([^<>]+)</g, (_, texto: string) => `>${comEspacos(texto)}<`)
  return s.replace(/(\d+)/g, (_, i: string) => guardados[Number(i)] ?? '')
}

export function criarTradutor(pasta: string, publico: Publico = publicoDoCaderno()): Tradutor {
  const coletados: { onde: string; kids: string }[] = []
  const d = publico === 'adulto' ? dicionario(pasta, GRUPO_DO_CADERNO) : null
  return {
    publico,
    adulto: publico !== 'kids',
    saida:
      publico === 'kids'
        ? resolve(PASTA_CURSOS, pasta, 'mapa-da-aventura.pdf')
        : resolve(PASTA_CURSOS_ADULTO, pasta, 'caderno-do-aluno.pdf'),
    t(kids, onde = 'caderno') {
      if (publico === 'kids' || !kids.trim()) return kids
      if (publico === 'coletar') {
        coletados.push({ onde, kids })
        return kids
      }
      const adulto = d?.get(kids)
      if (adulto === undefined || !adulto.trim())
        throw new Pendencias(
          `${pasta}/_caderno: texto sem versão adulta (rode com --coletar): ${kids.slice(0, 80)}`,
        )
      return adulto
    },
    concluir() {
      if (publico !== 'coletar') return false
      const r = prepararTextos(pasta, GRUPO_DO_CADERNO, coletados)
      console.log(
        `${pasta}/_caderno: ${r.total} textos, ${r.pendentes} sem versão adulta, ${r.removidos} removidos.`,
      )
      return true
    },
  }
}
