import { expect, test } from 'bun:test'
import {
  CAMPOS_DO_ARQUIPELAGO,
  chavesDoGrupoDoArquipelago,
  GRUPOS_DO_ARQUIPELAGO,
  gravarCamposDoArquipelago,
  lerCamposDoArquipelago,
  PropriedadesSchema,
  TIPOS_DE_FISICA_DO_ARQUIPELAGO,
  validarCamposDoArquipelago,
} from '../src/v2'

test('a lista de campos cobre os cinco grupos, com chaves únicas e gravações válidas', () => {
  const chaves = CAMPOS_DO_ARQUIPELAGO.map((c) => c.chave)
  expect(new Set(chaves).size).toBe(chaves.length)
  expect(chaves.every((c) => c.startsWith('arquipelago.'))).toBe(true)
  expect(new Set(CAMPOS_DO_ARQUIPELAGO.map((c) => c.grupo))).toEqual(
    new Set(GRUPOS_DO_ARQUIPELAGO.map((g) => g.id)),
  )
  expect(chavesDoGrupoDoArquipelago('fundacao')).toHaveLength(6)
  expect(chavesDoGrupoDoArquipelago('placa')).toEqual([
    'arquipelago.sinal.texto',
    'arquipelago.sinal.destino',
    'arquipelago.sinal.via.x',
    'arquipelago.sinal.via.z',
  ])
  const fisica = CAMPOS_DO_ARQUIPELAGO.find((c) => c.chave === 'arquipelago.fisica')
  expect(fisica?.tipo === 'escolha' && fisica.valores.map((v) => v.valor)).toEqual([
    ...TIPOS_DE_FISICA_DO_ARQUIPELAGO,
  ])
  for (const c of CAMPOS_DO_ARQUIPELAGO) expect(c.rotulo).not.toContain('—')
})

test('gravar e ler devolvem os mesmos valores, sem mexer na entrada nem nas outras chaves', () => {
  const antes = { 'outra.ferramenta': 'fica', 'arquipelago.fundacao.sobra': 1 }
  const copia = structuredClone(antes)
  const tudo = gravarCamposDoArquipelago(antes, {
    fisica: { tipo: 'tronco', raioDoTronco: 0.4 },
    enterrada: 0.28,
    fundacao: { min: { x: -2, y: -1, z: -3 }, max: { x: 2, y: 0, z: 3 } },
    placa: { texto: 'Praia', destino: 'praia', via: { x: 20, z: 153 } },
    ator: 'iris',
  })
  expect(antes).toEqual(copia)
  expect(PropriedadesSchema.safeParse(tudo).success).toBe(true)
  expect(tudo['outra.ferramenta']).toBe('fica')
  // Regravar a fundação leva também a chave solta que o jogo contaria como fundação.
  expect(tudo['arquipelago.fundacao.sobra']).toBeUndefined()
  expect(lerCamposDoArquipelago(tudo)).toEqual({
    fisica: { tipo: 'tronco', raioDoTronco: 0.4 },
    enterrada: 0.28,
    fundacao: { min: { x: -2, y: -1, z: -3 }, max: { x: 2, y: 0, z: 3 } },
    placa: { texto: 'Praia', destino: 'praia', via: { x: 20, z: 153 } },
    ator: 'iris',
  })
  expect(validarCamposDoArquipelago(tudo)).toEqual([])

  // Tirar um grupo tira todas as chaves dele; os outros ficam.
  const semPlaca = gravarCamposDoArquipelago(tudo, { placa: null, fisica: { tipo: 'caixa' } })
  expect(Object.keys(semPlaca).filter((c) => c.includes('sinal'))).toEqual([])
  expect(semPlaca['arquipelago.raioDoTronco']).toBeUndefined()
  expect(lerCamposDoArquipelago(semPlaca).fisica).toEqual({ tipo: 'caixa' })
  expect(lerCamposDoArquipelago(semPlaca).ator).toBe('iris')
  const vazio = gravarCamposDoArquipelago(semPlaca, {
    fisica: null,
    enterrada: null,
    fundacao: null,
    ator: null,
  })
  expect(vazio).toEqual({ 'outra.ferramenta': 'fica' })
  expect(lerCamposDoArquipelago(vazio)).toEqual({})
})

test('validar segue os limites do leitor do jogo, nas bordas', () => {
  const tipos = (p: Record<string, string | number | boolean>) =>
    validarCamposDoArquipelago(p).map((a) => `${a.tipo}:${a.regra}`)
  const placa = (texto: string, destino = 'praia') => ({
    'arquipelago.sinal.texto': texto,
    'arquipelago.sinal.destino': destino,
    'arquipelago.sinal.via.x': 0,
    'arquipelago.sinal.via.z': 0,
  })
  expect(tipos(placa('x'.repeat(24)))).toEqual([])
  expect(tipos(placa('x'.repeat(25)))).toEqual(['placa-incompleta:perfil'])
  expect(tipos(placa('   '))).toEqual(['placa-incompleta:perfil'])
  expect(tipos(placa('Praia', 'd'.repeat(240)))).toEqual([])
  expect(tipos(placa('Praia', 'd'.repeat(241)))).toEqual(['placa-incompleta:perfil'])
  expect(tipos({ ...placa('Praia'), 'arquipelago.sinal.via.x': '3' })).toEqual([
    'placa-incompleta:perfil',
  ])
  expect(tipos({ 'arquipelago.raioDoTronco': 100 })).toEqual([])
  expect(tipos({ 'arquipelago.raioDoTronco': 100.001 })).toEqual(['raio-do-tronco-invalido:perfil'])
  expect(tipos({ 'arquipelago.raioDoTronco': 0 })).toEqual(['raio-do-tronco-invalido:perfil'])
  expect(tipos({ 'arquipelago.enterrada': 0 })).toEqual([])
  expect(tipos({ 'arquipelago.enterrada': 1 })).toEqual([])
  expect(tipos({ 'arquipelago.enterrada': 1.01 })).toEqual(['enterrada-invalida:perfil'])
  expect(tipos({ 'arquipelago.enterrada': true })).toEqual(['enterrada-invalida:perfil'])
  expect(tipos({ 'arquipelago.fisica': 'Caixa' })).toEqual(['fisica-invalida:perfil'])
  expect(tipos({ 'arquipelago.ator': 'Iris' })).toEqual(['ator-invalido:perfil'])
  expect(tipos({ 'arquipelago.fundacao.min.x': 0 })).toHaveLength(5)
  const fundacao = gravarCamposDoArquipelago(
    {},
    { fundacao: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 0, z: 1 } } },
  )
  expect(tipos(fundacao)).toEqual(['fundacao-invalida:fisica-nativa'])
  // O perfil aceita a fundação achatada; ela continua sendo lida.
  expect(lerCamposDoArquipelago(fundacao).fundacao?.max.y).toBe(0)
  for (const a of validarCamposDoArquipelago({
    ...placa(''),
    'arquipelago.fisica': 'x',
    'arquipelago.ator': 1,
  }))
    expect(a.mensagem).not.toContain('—')
})
