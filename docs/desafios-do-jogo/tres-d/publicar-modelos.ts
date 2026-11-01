/**
 * Publica na biblioteca de modelos dos cursos (`packages/studio/src/core/course-models/`) os
 * modelos dos desafios 3D das ilhas: o chão de cada ilha (`arte/chaos.py`), o morador e o item do
 * jogo. O projeto do desafio leva só a referência (`modelo-curso:<sha>`), como a Ilha do Farol e
 * o Jardim: embutidos, os modelos passavam do teto do manifesto. Grava `modelos.json` com o sha e
 * as animações de cada um; o gerador lê esse arquivo.
 *
 * Rodar: bun docs/desafios-do-jogo/tres-d/publicar-modelos.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import {
  publishCourseModel,
  writeCourseModelRegistry,
} from '../../../packages/studio/scripts/course-models'
import { DESAFIOS_3D } from './projetos'

const JOGO = new URL('../../../packages/arquipelago/src/assets/', import.meta.url)

function animacoes(bytes: Uint8Array): string[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const tamanho = view.getUint32(12, true)
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + tamanho))) as {
    animations?: { name?: string }[]
  }
  return (json.animations ?? []).map((a) => a.name).filter((n): n is string => Boolean(n))
}

const modelos: Record<string, { sha: string; clips: string[] }> = {}
function publicar(nome: string, arquivo: URL) {
  const bytes = new Uint8Array(readFileSync(arquivo))
  modelos[nome] = { sha: publishCourseModel(bytes), clips: animacoes(bytes) }
}
for (const d of DESAFIOS_3D) {
  publicar(`chao-${d.ilha}`, new URL(`./modelos/chao-${d.ilha}.glb`, import.meta.url))
  publicar(d.morador.asset, new URL(d.morador.arquivo, JOGO))
  publicar(d.item.asset, new URL(d.item.arquivo, JOGO))
}
writeCourseModelRegistry()
writeFileSync(new URL('./modelos.json', import.meta.url), `${JSON.stringify(modelos, null, 2)}\n`)
console.log(Object.keys(modelos).length, 'modelos')
