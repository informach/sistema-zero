import 'server-only'
import { type ProjetoGravado, projetoAntes } from '~/lib/projeto-gravado'

/**
 * O que cada parte gravada montou no Estúdio, por aula e bloco, para a parte seguinte abrir com
 * isso (cada parte é gravada numa tomada própria). Na memória do processo, no `globalThis` pelo
 * mesmo motivo de `lessons.ts`; o palco reiniciado esquece, e a parte cai nos exemplos da aula.
 */
const shared = globalThis as { __palcoProjetos?: Map<string, Map<number, ProjetoGravado>> }
shared.__palcoProjetos ??= new Map()
const gravados = shared.__palcoProjetos
const LIMIT = 50

const chave = (lessonId: string, blockId: string) => `${lessonId}:${blockId}`

export function guardarProjeto(
  lessonId: string,
  blockId: string,
  parte: number,
  project: unknown,
): void {
  const key = chave(lessonId, blockId)
  const partes = gravados.get(key) ?? new Map<number, ProjetoGravado>()
  partes.set(parte, { parte, at: Date.now(), project })
  gravados.delete(key)
  gravados.set(key, partes)
  if (gravados.size > LIMIT) {
    const oldest = gravados.keys().next().value
    if (oldest !== undefined) gravados.delete(oldest)
  }
}

export function projetoGravadoAntes(lessonId: string, blockId: string, numero: number): unknown {
  return projetoAntes([...(gravados.get(chave(lessonId, blockId))?.values() ?? [])], numero)
}
