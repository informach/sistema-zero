import { expect, test } from 'bun:test'
import {
  aplicarTexturaAosObjetos,
  criarDocumentoVazio,
  executarLote,
  inverterLote,
  validarDocumento,
} from '../src/v2'

test('hora continua válida e os overrides de ambiente são guardados e desfeitos juntos', () => {
  const d = criarDocumentoVazio('d', 'Luz')
  const iluminacao = {
    hora: 18,
    sol: { direcao: { x: 1, y: 2, z: 1 }, cor: '#ffe4ba', intensidade: 2, sombra: true },
    ambiente: { ceu: '#d4eaff', chao: '#61734c', intensidade: 1.2 },
    ceu: { tipo: 'cor' as const, cor: '#b4ddf2' },
    nevoa: { tipo: 'linear' as const, cor: '#cce4ec', perto: 10, longe: 200 },
    sombras: { resolucao: 1024 as const, alcance: 100 },
  }
  const novo = validarDocumento({ ...d, iluminacao })
  expect(novo.iluminacao).toEqual(iluminacao)
  const depois = executarLote(
    { documento: d, revisao: 0 },
    { revisaoEsperada: 0, comandos: [{ tipo: 'iluminacao.definir', iluminacao: novo.iluminacao }] },
  ).documento
  expect(depois).toEqual(novo)
  expect(
    executarLote(
      { documento: depois, revisao: 1 },
      { revisaoEsperada: 1, comandos: inverterLote(d, depois) },
    ).documento,
  ).toEqual(d)
})

test('sol sem direção, névoa invertida e céu sem referência autorizada são recusados', () => {
  const d = criarDocumentoVazio('d', 'Céu')
  for (const extra of [
    { sol: { direcao: { x: 0, y: 0, z: 0 }, cor: '#ffffff', intensidade: 1, sombra: true } },
    { nevoa: { tipo: 'linear', cor: '#ffffff', perto: 10, longe: 5 } },
    { ceu: { tipo: 'panorama', textura: 'ausente', giro: 0, intensidade: 1 } },
    { ceu: { tipo: 'cor', cor: 'url(arquivo)' } },
  ])
    expect(() => validarDocumento({ ...d, iluminacao: { hora: 12, ...extra } })).toThrow()
  d.texturas = [{ id: 'ceu', textura: 'imagem', biblioteca: 'b', digest: 'a'.repeat(64) }]
  const iluminacao = {
    hora: 12,
    ceu: { tipo: 'panorama' as const, textura: 'ceu', giro: 0.5, intensidade: 1 },
  }
  expect(validarDocumento({ ...d, iluminacao }).iluminacao).toEqual(iluminacao)
})

test('panorama e textura são publicados e desfeitos na ordem de suas referências', () => {
  const d = criarDocumentoVazio('d', 'Céu'),
    textura = { id: 'ceu', textura: 'imagem', biblioteca: 'b', digest: 'a'.repeat(64) }
  const depois = executarLote(
    { documento: d, revisao: 0 },
    {
      revisaoEsperada: 0,
      comandos: [
        { tipo: 'textura.definir', textura },
        {
          tipo: 'iluminacao.definir',
          iluminacao: {
            hora: 12,
            ceu: { tipo: 'panorama', textura: 'ceu', giro: 0, intensidade: 1 },
          },
        },
      ],
    },
  ).documento
  expect(() =>
    executarLote(
      { documento: depois, revisao: 1 },
      { revisaoEsperada: 1, comandos: [{ tipo: 'textura.remover', id: 'ceu' }] },
    ),
  ).toThrow('Textura em uso')
  expect(
    executarLote(
      { documento: depois, revisao: 1 },
      { revisaoEsperada: 1, comandos: inverterLote(d, depois) },
    ).documento,
  ).toEqual(d)
})

test('restaurar acabamento do objeto não elimina a textura compartilhada com o céu', () => {
  const d = criarDocumentoVazio('d', 'Compartilhada')
  d.formas = [{ id: 'f', nome: 'Caixa', tipo: 'caixa', largura: 1, altura: 1, comprimento: 1 }]
  d.texturas = [{ id: 'ceu', textura: 'imagem', biblioteca: 'b', digest: 'a'.repeat(64) }]
  d.iluminacao = { hora: 12, ceu: { tipo: 'panorama', textura: 'ceu', giro: 0, intensidade: 1 } }
  d.instancias = [
    {
      id: 'o',
      nome: 'Peça',
      modelo: 'f',
      grupo: null,
      oculto: false,
      bloqueado: false,
      colisao: 'caixa',
      apoio: { tipo: 'absoluto' },
      aparencia: { textura: { id: 'ceu', repeticaoMetros: 2 } },
      transformacao: {
        posicao: { x: 0, y: 0, z: 0 },
        rotacao: { x: 0, y: 0, z: 0 },
        escala: { x: 1, y: 1, z: 1 },
      },
    },
  ]
  const depois = executarLote(
    { documento: d, revisao: 0 },
    { revisaoEsperada: 0, comandos: aplicarTexturaAosObjetos(d, ['o'], null) },
  ).documento
  expect(depois.texturas).toEqual(d.texturas)
  expect(depois.instancias[0]!.aparencia?.textura).toBeUndefined()
})
