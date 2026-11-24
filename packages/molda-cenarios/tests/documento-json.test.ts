import { expect, test } from 'bun:test'
import { criarDocumentoVazio } from '@sistemazero/molda-cenarios-core/v2'
import {
  lerDocumentoParaAbrir,
  nomeDoArquivoDoDocumento,
  textoDoDocumento,
} from '../src/oficina/documento-json'

const ID = '11111111-1111-4111-8111-111111111111'
const OUTRO = '22222222-2222-4222-8222-222222222222'

test('baixar e abrir de novo devolve o mesmo documento, agora deste cenário', () => {
  const documento = { ...criarDocumentoVazio(OUTRO, 'Praça dos Criadores') }
  const lido = lerDocumentoParaAbrir(textoDoDocumento(documento), ID)
  expect(lido.ok).toBe(true)
  if (!lido.ok) return
  expect(lido.documento.id).toBe(ID)
  expect({ ...lido.documento, id: OUTRO }).toEqual(documento)
  expect(lido.nome).toBe('Praça dos Criadores')
  expect(lido.objetos).toBe(0)
})

test('arquivo que não é documento de cenário é recusado com o motivo', () => {
  expect(lerDocumentoParaAbrir('isso não é json', ID)).toEqual({
    ok: false,
    motivo: 'Este arquivo não é um JSON.',
  })
  expect(lerDocumentoParaAbrir('{"formato":"outro"}', ID)).toEqual({
    ok: false,
    motivo: 'Este arquivo não é um documento de cenário.',
  })
  expect(lerDocumentoParaAbrir('{"formato":"molda-cenario","versao":1}', ID)).toEqual({
    ok: false,
    motivo: 'Este documento é de uma versão antiga da oficina.',
  })
  const quebrado = { ...criarDocumentoVazio(OUTRO, 'x'), instancias: [{ id: 'sem-modelo' }] }
  const r = lerDocumentoParaAbrir(JSON.stringify(quebrado), ID)
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.motivo).toStartWith('O documento tem um problema:')
})

test('o nome do arquivo sai sem acento nem símbolo, com a versão', () => {
  expect(nomeDoArquivoDoDocumento('Faísca · conversão do código', 12)).toBe(
    'faisca-conversao-do-codigo-versao-12.json',
  )
  expect(nomeDoArquivoDoDocumento('???', 0)).toBe('cenario-versao-0.json')
})
