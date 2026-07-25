import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { withWorkspaceLoad } from '../loadFence'
import { ensureBlocklyInitialized } from '../setup'

/**
 * Regressão do "duplicou todos os blocos" na Ponte (25/07): o safe-delete das
 * Áreas do projeto preserva os FILHOS como rascunho ao excluir a moldura — mas
 * esse resgate NÃO pode rodar durante uma CARGA programática. O clear do
 * serializer do Blockly itera um SNAPSHOT dos top blocks; o filho desplugado
 * vira um top NOVO fora do snapshot, sobrevive à limpeza e aparecia como pilha
 * órfã duplicando o conteúdo a cada reload de workspace POVOADO (colar código
 * na Ponte, trocar estado etc.). Sob a cerca de carga, a moldura descarta
 * simples; a exclusão REAL pela criança segue preservando o rascunho.
 */
describe('safe-delete das Áreas × carga programática', () => {
  let workspace: Blockly.Workspace

  const stateWith = (text: string) => ({
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: 'sz_frame_start',
          x: 10,
          y: 10,
          inputs: {
            CHILDREN: {
              block: {
                type: 'sz_js_var_create',
                fields: { NAME: text },
                next: {
                  block: { type: 'sz_js_var_create', fields: { NAME: `${text}2` } },
                },
              },
            },
          },
        },
      ],
    },
  })

  beforeAll(() => {
    ensureBlocklyInitialized()
    workspace = new Blockly.Workspace()
  })
  afterAll(() => {
    workspace.dispose()
  })

  it('recarregar por CIMA de um workspace povoado não deixa pilha órfã', () => {
    withWorkspaceLoad(() => Blockly.serialization.workspaces.load(stateWith('primeiro'), workspace))
    expect(workspace.getTopBlocks(false)).toHaveLength(1)
    expect(workspace.getAllBlocks(false)).toHaveLength(3)

    // O reload da Ponte: novo estado por cima do canvas cheio (mesma cerca).
    withWorkspaceLoad(() => Blockly.serialization.workspaces.load(stateWith('segundo'), workspace))
    const tops = workspace.getTopBlocks(false)
    expect(tops).toHaveLength(1)
    expect(tops[0]?.type).toBe('sz_frame_start')
    // 3 blocos = a moldura + os 2 do estado NOVO; os antigos não sobrevivem.
    expect(workspace.getAllBlocks(false)).toHaveLength(3)
  })

  it('exclusão REAL da moldura (sem cerca) segue preservando os filhos como rascunho', () => {
    withWorkspaceLoad(() => Blockly.serialization.workspaces.load(stateWith('rascunho'), workspace))
    const frame = workspace.getTopBlocks(false)[0]
    expect(frame?.type).toBe('sz_frame_start')
    frame?.dispose(false)
    // A moldura morreu, mas a pilha de filhos sobreviveu SOLTA (o resgate).
    const tops = workspace.getTopBlocks(false)
    expect(tops).toHaveLength(1)
    expect(tops[0]?.type).toBe('sz_js_var_create')
    expect(workspace.getAllBlocks(false)).toHaveLength(2)
  })
})
