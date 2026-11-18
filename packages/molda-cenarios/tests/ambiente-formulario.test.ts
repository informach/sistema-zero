import { expect, test } from 'bun:test'
import {
  criarDocumentoVazio,
  executarLote,
  inverterLote,
} from '@sistemazero/molda-cenarios-core/v2'
import { comandosDoAmbiente } from '../src/oficina/ambiente-formulario'

test('guardar céu inclui só a referência escolhida e um lote reversível de iluminação', () => {
  const doc = criarDocumentoVazio('d', 'Céu'),
    ref = { id: 'ceu', biblioteca: 'b', textura: 't', digest: 'a'.repeat(64) },
    rascunho = {
      iluminacao: {
        hora: 20,
        ceu: { tipo: 'panorama' as const, textura: ref.id, giro: 1, intensidade: 0.8 },
      },
      texturas: [ref, { ...ref, id: 'descartada', digest: 'b'.repeat(64) }],
    },
    comandos = comandosDoAmbiente(doc, rascunho),
    fim = executarLote({ documento: doc, revisao: 0 }, { revisaoEsperada: 0, comandos })
  expect(fim.documento.texturas).toEqual([ref])
  expect(fim.documento.iluminacao).toEqual(rascunho.iluminacao)
  expect(
    executarLote(fim, { revisaoEsperada: 1, comandos: inverterLote(doc, fim.documento) }).documento,
  ).toEqual(doc)
  expect(comandosDoAmbiente(fim.documento, rascunho)).toEqual([])
})
test('cor e horário não fixam texturas abandonadas nem perdem ajustes de luz e névoa', () => {
  const doc = criarDocumentoVazio('d', 'Luz'),
    iluminacao = {
      hora: 20,
      ceu: { tipo: 'cor' as const, cor: '#557799' },
      nevoa: { tipo: 'nenhuma' as const },
      ambiente: { ceu: '#ffffff', chao: '#334422', intensidade: 1.2 },
    },
    comandos = comandosDoAmbiente(doc, {
      iluminacao,
      texturas: [{ id: 'abandonada', biblioteca: 'b', textura: 't', digest: 'a'.repeat(64) }],
    })
  expect(comandos).toEqual([{ tipo: 'iluminacao.definir', iluminacao }])
})
