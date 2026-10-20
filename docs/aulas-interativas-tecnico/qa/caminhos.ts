import { readdirSync } from 'node:fs'
import { basename, resolve } from 'node:path'

export const PASTA_CURSOS = resolve(import.meta.dir, '../../aulas-interativas/kids')

const cursosPorPrefixo = {
  'cade-todo-mundo': 'cade-todo-mundo',
  desafio: 'desafio-primeiro-jogo',
  'nave-contra-asteroides': 'nave-contra-asteroides',
  'corre-dino': 'corre-dino',
  'meu-jeito': 'o-jogo-do-meu-jeito',
} as const

/** Resolve os nomes editoriais preservados para a pasta do respectivo curso. */
export function caminhoAula(nome: string): string {
  if (basename(nome) !== nome) throw new Error(`Nome de aula inválido: ${nome}`)
  const curso = Object.entries(cursosPorPrefixo).find(([prefixo]) =>
    nome.startsWith(`${prefixo}-`),
  )?.[1]
  if (!curso) throw new Error(`Curso desconhecido para a aula: ${nome}`)
  return resolve(PASTA_CURSOS, curso, nome)
}

/** Só os trios de autoria; índices, projetos e mapas não são aulas. */
export function listarArquivosAulas(): string[] {
  return Object.entries(cursosPorPrefixo)
    .flatMap(([prefixo, curso]) =>
      readdirSync(resolve(PASTA_CURSOS, curso)).filter(
        (nome) => nome.startsWith(`${prefixo}-`) && /\.(?:md|manifesto\.json)$/.test(nome),
      ),
    )
    .sort()
}
