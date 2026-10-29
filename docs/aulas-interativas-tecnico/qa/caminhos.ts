import { readdirSync } from 'node:fs'
import { basename, resolve } from 'node:path'

export const PASTA_CURSOS = resolve(import.meta.dirname, '../../aulas-interativas')
export const CURSOS_POR_PREFIXO = {
  aula: 'faisca/o-jardim-secreto',
  'cade-todo-mundo': 'faisca/cade-todo-mundo',
  desafio: 'faisca/desafio-primeiro-jogo',
  ilha: 'faisca/a-ilha-do-farol',
  moedas: 'faisca/poder-moedas-no-caminho',
  cabana: 'faisca/poder-o-segredo-da-cabana',
  ponte: 'faisca/poder-a-ponte-apressada',
  'nave-contra-asteroides': 'construtor/nave-contra-asteroides',
  'corre-dino': 'inventor/corre-dino',
  'meu-jeito': 'construtor/o-jogo-do-meu-jeito',
} as const

/** Resolve os nomes editoriais preservados para a pasta do respectivo curso. */
export function caminhoAula(nome: string, pasta: string = PASTA_CURSOS): string {
  if (basename(nome) !== nome) throw new Error(`Nome de aula inválido: ${nome}`)
  const curso = Object.entries(CURSOS_POR_PREFIXO).find(([prefixo]) =>
    nome.startsWith(`${prefixo}-`),
  )?.[1]
  if (!curso) throw new Error(`Curso desconhecido para a aula: ${nome}`)
  return resolve(pasta, curso, nome)
}

/** Só os trios de autoria; índices, projetos e mapas não são aulas. */
export function listarArquivosAulas(pasta: string = PASTA_CURSOS): string[] {
  return Object.entries(CURSOS_POR_PREFIXO)
    .flatMap(([prefixo, curso]) =>
      readdirSync(resolve(pasta, curso)).filter(
        (nome) => nome.startsWith(`${prefixo}-`) && /\.(?:md|manifesto\.json)$/.test(nome),
      ),
    )
    .sort()
}
