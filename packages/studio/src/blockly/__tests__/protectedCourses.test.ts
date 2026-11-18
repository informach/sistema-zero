import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { projetosDosCursos } from '../../../../../docs/aulas-interativas-tecnico/qa/matriz-compatibilidade'
import { generateProjectFilesWithMap } from '../../generators/project'
import { gameTwoDBlocks } from '../../official-extensions/game-2d/blocks'
import { registerExtensionBlocks } from '../blocks'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'

/**
 * Cursos protegidos (Cadê Todo Mundo? e A Chave do Farol), os dois gravados por inteiro.
 *
 * Cada projeto que as aulas carregam (o inicial de cada parte e o jogo final) passa aqui por um
 * Blockly de verdade, sem tela: carga dos blocos, leitura da IR, geração do código e nova gravação.
 * Se um bloco ensinado mudar de forma, de campo ou de código gerado, é aqui que aparece.
 */

const PROJETOS = projetosDosCursos()

/** A mesma forma de bloco, sem o que é só arranjo (posição e ids). */
function semArranjo(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(semArranjo)
  if (!valor || typeof valor !== 'object') return valor
  const saida: Record<string, unknown> = {}
  for (const [chave, item] of Object.entries(valor as Record<string, unknown>)) {
    if (chave === 'id' || chave === 'x' || chave === 'y') continue
    saida[chave] = semArranjo(item)
  }
  return saida
}

/**
 * Cada evento do Jogo 2D leva no fim uma chave interna (`}, "chave");`). Nos projetos das aulas ela
 * tem nome escrito à mão; gerada dos blocos, é o id do bloco. O programa é o mesmo.
 */
function semChaveDeEvento(codigo: string): string {
  return codigo.replace(/^(\s*\}, )"[^"\n]*"\);$/gm, '$1"<chave>");')
}

describe('cursos protegidos: os projetos das aulas num Blockly de verdade', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  it('acha os sete projetos dos dois cursos', () => {
    expect(PROJETOS.map((p) => `${p.curso}:${p.origem}`).length).toBe(7)
  })

  for (const { curso, origem, projeto } of PROJETOS) {
    const nome = `${curso} ${origem}`

    it(`${nome}: os blocos carregam inteiros e gravam de volta iguais`, () => {
      const workspace = new Blockly.Workspace()
      try {
        Blockly.serialization.workspaces.load(projeto.blocksState as object, workspace)
        const gravado = Blockly.serialization.workspaces.save(workspace)
        expect(semArranjo(gravado.blocks)).toEqual(
          semArranjo((projeto.blocksState as { blocks: unknown }).blocks),
        )
      } finally {
        workspace.dispose()
      }
    })

    it(`${nome}: o código gerado dos blocos é o guardado no projeto`, () => {
      const workspace = new Blockly.Workspace()
      try {
        Blockly.serialization.workspaces.load(projeto.blocksState as object, workspace)
        const guardado = projeto as unknown as {
          name: string
          ir: Parameters<typeof generateProjectFilesWithMap>[0]['ir']
          files: { 'index.html': string; 'style.css': string; 'script.js': string }
        }
        const dosBlocos = generateProjectFilesWithMap({
          ir: buildIRFromWorkspace(workspace),
          projectName: guardado.name,
        }).files
        const daIR = generateProjectFilesWithMap({
          ir: guardado.ir,
          projectName: guardado.name,
        }).files

        // A IR guardada gera exatamente os arquivos guardados.
        expect(daIR['script.js']).toBe(guardado.files['script.js'])
        // Os blocos geram o mesmo programa; só muda a chave interna de cada evento.
        expect(semChaveDeEvento(dosBlocos['script.js'])).toBe(
          semChaveDeEvento(guardado.files['script.js']),
        )
        expect(dosBlocos['script.js']).not.toBe('')
        expect(dosBlocos['index.html']).toBe(guardado.files['index.html'])
        expect(dosBlocos['style.css']).toBe(guardado.files['style.css'])
      } finally {
        workspace.dispose()
      }
    })
  }
})
