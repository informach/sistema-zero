import { expect, test } from 'bun:test'
import {
  ConflitoDeCenario,
  type DocumentoDeCenario,
  executarLote,
  type RevisaoDeCenario,
} from '@sistemazero/molda-cenarios-core'
import { criarController } from '../src/controller'
import type { CenariosHostAdapter } from '../src/portas'

function preparar() {
  const documento: DocumentoDeCenario = {
    formato: 'molda-cenario',
    versao: 1,
    id: '00000000-0000-4000-8000-000000000001',
    nome: 'Faísca',
    unidade: 'metro',
    eixoVertical: 'y',
    base: { id: 'faisca-v2', versao: '1' },
    catalogo: { id: 'catalogo', digest: 'a'.repeat(64) },
    grupos: [],
    instancias: [],
    caminhos: [],
    aguas: [],
    relevo: [],
    marcos: [],
    iluminacao: { noite: false },
  }
  let atual: RevisaoDeCenario = {
      projetoId: documento.id,
      revisao: 0,
      documento,
      autorId: '00000000-0000-4000-8000-000000000002',
      criadoEm: '2026-11-16T00:00:00.000Z',
      operacaoId: '00000000-0000-4000-8000-000000000003',
      impressao: 'a'.repeat(64),
    },
    rede = true
  const historico = new Map([[0, structuredClone(atual)]]),
    recuperacao = new Map<string, { base: number; documento: DocumentoDeCenario }>()
  const host: CenariosHostAdapter = {
    urlDaArte: (m) => `/arte/${m.digest}.glb`,
    tema: 'light',
    listar: async () => [
      {
        id: atual.projetoId,
        nome: atual.documento.nome,
        revisao: atual.revisao,
        revisaoAplicada: null,
        atualizadoEm: atual.criadoEm,
        autorId: atual.autorId,
      },
    ],
    abrir: async (id) => {
      if (id !== atual.projetoId) throw Error('Projeto ausente')
      return structuredClone(atual)
    },
    criar: async () => {
      throw Error('Não usado neste teste')
    },
    editar: async (id, revisaoEsperada, comandos, operacaoId) => {
      if (!rede) throw Error('Rede indisponível')
      if (id !== atual.projetoId) throw Error('Projeto ausente')
      const n = executarLote(atual, { revisaoEsperada, comandos })
      atual = { ...atual, ...n, operacaoId }
      historico.set(atual.revisao, structuredClone(atual))
      return structuredClone(atual)
    },
    restaurar: async (id, revisaoEsperada, origem, operacaoId) => {
      if (id !== atual.projetoId) throw Error('Projeto ausente')
      if (atual.revisao !== revisaoEsperada) throw new ConflitoDeCenario(atual.revisao)
      const antes = historico.get(origem)
      if (!antes) throw Error('Revisão ausente')
      atual = {
        ...atual,
        documento: structuredClone(antes.documento),
        revisao: atual.revisao + 1,
        operacaoId,
      }
      historico.set(atual.revisao, structuredClone(atual))
      return structuredClone(atual)
    },
    catalogo: async () => [],
    aplicar: async () => {},
    runtime: {
      montar: async () => {
        throw Error('O renderer não participa dos testes de estado')
      },
    },
    miniatura: async () => null,
    recuperar: async (id) => structuredClone(recuperacao.get(id) ?? null),
    guardarRecuperacao: async (id, v) => {
      if (v) recuperacao.set(id, structuredClone(v))
      else recuperacao.delete(id)
    },
  }
  return {
    editor: criarController(host),
    id: atual.projetoId,
    recuperacao,
    rede: (v: boolean) => {
      rede = v
    },
  }
}
test('mesmos comandos alimentam autoria, desfazer e refazer sem retroceder a revisão', async () => {
  const { editor, id } = preparar()
  await editor.abrir(id)
  await editor.executar([{ tipo: 'iluminacao.definir', noite: true }])
  expect(editor.getState().projeto!.documento.iluminacao.noite).toBe(true)
  await editor.historico('desfazer')
  expect(editor.getState().projeto!.documento.iluminacao.noite).toBe(false)
  expect(editor.getState().projeto!.revisao).toBe(2)
  await editor.historico('refazer')
  expect(editor.getState().projeto!.documento.iluminacao.noite).toBe(true)
  expect(editor.getState().projeto!.revisao).toBe(3)
})
test('falha da rede preserva a composição proposta na recuperação local', async () => {
  const { editor, id, rede, recuperacao } = preparar()
  await editor.abrir(id)
  rede(false)
  await expect(editor.executar([{ tipo: 'iluminacao.definir', noite: true }])).rejects.toThrow(
    /Rede/,
  )
  expect(editor.getState().projeto!.revisao).toBe(0)
  expect(recuperacao.get(id)!.documento.iluminacao.noite).toBe(true)
  expect(editor.getState().ocupado).toBe(false)
  await editor.abrir(id)
  expect(editor.getState().recuperacao!.documento.iluminacao.noite).toBe(true)
})
test('gesto manual impede comandos concorrentes e teste preserva a autoria', async () => {
  const { editor, id } = preparar()
  await editor.abrir(id)
  editor.gesto(true)
  await expect(editor.executar([{ tipo: 'iluminacao.definir', noite: true }])).rejects.toThrow(
    /Aguarde/,
  )
  editor.gesto(false)
  await editor.teste(true, async () => {})
  await expect(editor.executar([{ tipo: 'iluminacao.definir', noite: true }])).rejects.toThrow(
    /edição/,
  )
  await editor.teste(false, async () => {})
  expect(editor.getState().projeto!.revisao).toBe(0)
  expect(editor.getState().projeto!.documento.iluminacao.noite).toBe(false)
})
test('atualização de outra sessão limpa histórico local e não substitui um teste ativo', async () => {
  const { editor, id } = preparar()
  await editor.abrir(id)
  await editor.executar([{ tipo: 'iluminacao.definir', noite: true }])
  const remoto = { ...editor.getState().projeto!, revisao: 3 }
  await editor.teste(true, async () => {})
  expect(editor.receber(remoto)).toBe(false)
  await editor.teste(false, async () => {})
  expect(editor.receber(remoto)).toBe(true)
  expect(editor.getState().podeDesfazer).toBe(false)
})
