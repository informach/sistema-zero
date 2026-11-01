import { expect, test } from 'bun:test'
import {
  ConteudoDoDesafioV1Schema,
  DesafioAbertoSchema,
  ImagemDoDesafioSchema,
  LIMITES_DO_DESAFIO,
  resumoDoDesafio,
} from '../src/desafios'

test('resumoDoDesafio: a linha escrita vence; sem ela, a primeira frase do enunciado', () => {
  expect(resumoDoDesafio({ resumo: 'Faça o guia andar.', enunciado: 'Longo. Mais.' })).toBe(
    'Faça o guia andar.',
  )
  expect(
    resumoDoDesafio({ enunciado: 'O Nico quer mostrar a praia. Ele quer que as setas andem.' }),
  ).toBe('O Nico quer mostrar a praia.')
  expect(resumoDoDesafio({ enunciado: 'Sem ponto final' })).toBe('Sem ponto final')
})

test('a imagem "Como fica" só aceita PNG, JPEG ou WebP embutido, dentro do teto', () => {
  expect(ImagemDoDesafioSchema.safeParse('data:image/webp;base64,AAAA').success).toBe(true)
  expect(ImagemDoDesafioSchema.safeParse('https://exemplo.com/a.png').success).toBe(false)
  expect(ImagemDoDesafioSchema.safeParse('data:image/svg+xml;base64,AAAA').success).toBe(false)
  const grande = `data:image/png;base64,${'A'.repeat(LIMITES_DO_DESAFIO.imagemCaracteres)}`
  expect(ImagemDoDesafioSchema.safeParse(grande).success).toBe(false)
})

test('resumo e imagem são opcionais: o conteúdo e a abertura de antes continuam válidos', () => {
  const aberto = {
    id: '6b0f6a6e-2f0c-4f5b-9a55-1e0b9b8f0a11',
    jogadorId: '6b0f6a6e-2f0c-4f5b-9a55-1e0b9b8f0a12',
    blocosPermitidos: null,
    revisao: 1,
    titulo: 'A',
    enunciado: 'B',
    dicas: [],
    desafioExtra: null,
    objetivos: [],
    projetoInicial: {},
    ultimosResultados: [],
    concluido: false,
  }
  expect(DesafioAbertoSchema.safeParse(aberto).success).toBe(true)
  expect(
    DesafioAbertoSchema.safeParse({ ...aberto, imagem: 'data:image/webp;base64,AAAA' }).success,
  ).toBe(true)
  expect(ConteudoDoDesafioV1Schema.shape.resumo.safeParse(undefined).success).toBe(true)
  expect(ConteudoDoDesafioV1Schema.shape.resumo.safeParse('x'.repeat(61)).success).toBe(false)
})
