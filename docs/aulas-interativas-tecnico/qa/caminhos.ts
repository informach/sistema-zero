import { readdirSync } from 'node:fs'
import { basename, resolve } from 'node:path'

export const PASTA_CURSOS = resolve(import.meta.dir, '../../aulas-interativas/kids')
/** A versão adulta dos mesmos cursos, gerada por `adulto/gerar-adulto.ts`. */
export const PASTA_CURSOS_ADULTO = resolve(import.meta.dir, '../../aulas-interativas/adulto')

export const CURSOS_POR_PREFIXO = {
  'cade-todo-mundo': 'cade-todo-mundo',
  desafio: 'desafio-primeiro-jogo',
  'nave-contra-asteroides': 'nave-contra-asteroides',
  'corre-dino': 'corre-dino',
  'meu-jeito': 'o-jogo-do-meu-jeito',
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
