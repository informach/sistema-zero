import { describe, expect, test } from 'bun:test'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import {
  criarLojaDaConstrucao,
  LEMBRA_PARA_TRAS,
  PAINEL_DE_CONSTRUIR,
} from '../src/estado/construcao'
import { criarLoja } from '../src/estado/loja'
import { QUARTO_DE_EXEMPLO } from '../src/plataforma/falsa'
import { falaDaRecusa } from '../src/sistemas/construcao/falas'
import { LOTE_DA_CASA } from '../src/sistemas/construcao/lote'
import { esticarParede, type Recusa } from '../src/sistemas/construcao/obra'

function montar() {
  const gravados: unknown[] = []
  const salvamento = {
    ...criarSalvamentoInicial(new Date('2026-10-28T12:00:00Z')),
    casa: { portaNova: true },
  }
  const loja = criarLoja({
    salvamento,
    jornada: 2,
    quarto: QUARTO_DE_EXEMPLO,
    avatar: { modelo: null } as never,
    acesso: {
      liberado: true,
      motivo: null,
      limiteDiarioMinutos: null,
      usadoHojeSegundos: 0,
      contabilizaTempo: false,
    },
    aoMudar: (s) => gravados.push(s),
  })
  return { loja, construcao: criarLojaDaConstrucao(loja), gravados }
}

describe('o modo Construir', () => {
  test('operações não colocam no salvamento uma obra que o contrato recusaria', () => {
    const { loja, construcao, gravados } = montar()
    construcao.getState().abrir()
    const antes = loja.getState().salvamento
    const quantidadeAntes = gravados.length
    const paredes = Array.from({ length: 201 }, (_, i) => ({
      eixo: 'x' as const,
      x: (i % 20) * 2 - 20,
      z: Math.floor(i / 20),
      n: 1,
    }))
    expect(
      construcao.getState().aplicar({ ok: true, obra: { ...LOTE_DA_CASA.obraInicial, paredes } }),
    ).toBe(false)
    expect(loja.getState().salvamento).toBe(antes)
    expect(gravados.length).toBe(quantidadeAntes)
    expect(construcao.getState().antes).toEqual([])
  })

  test('somente leitura não abre obra nem registra uma aplicação que não foi salva', () => {
    const { loja, construcao, gravados } = montar()
    loja.setState({ acesso: { ...loja.getState().acesso, somenteLeitura: true } })
    construcao.getState().abrir()
    expect(loja.getState().painelAberto).toBeNull()
    expect(construcao.getState().aplicar({ ok: true, obra: LOTE_DA_CASA.obraInicial })).toBe(false)
    expect(construcao.getState().antes).toEqual([])
    expect(gravados).toEqual([])
  })

  test('salvamento em conflito impede reabrir a obra por baixo da decisão', () => {
    const { loja, construcao } = montar()
    construcao.getState().abrir()
    loja.getState().definirSituacaoSalvamento('conflito')
    construcao.getState().abrir()
    expect(loja.getState().painelAberto).toBeNull()
  })

  test('desfazer não substitui uma obra adotada de outra versão do salvamento', () => {
    const { loja, construcao } = montar()
    construcao.getState().abrir()
    construcao.getState().aplicar({
      ok: true,
      obra: { ...LOTE_DA_CASA.obraInicial, caminhos: [{ x: -12, z: 6, tipo: 'pedra' }] },
    })
    const remoto = {
      ...loja.getState().salvamento,
      construcao: {
        ...loja.getState().salvamento.construcao,
        casa: { ...LOTE_DA_CASA.obraInicial, caminhos: [{ x: -11, z: 6, tipo: 'pedra' as const }] },
      },
    }
    loja.getState().adotar({ revisao: 2, salvamento: remoto, atualizadoEm: remoto.criadoEm })
    construcao.getState().desfazer()
    expect(loja.getState().salvamento).toBe(remoto)
    expect(construcao.getState().antes).toEqual([])
  })

  test('limite de tempo impede abrir e aplicar construção', () => {
    const { loja, construcao, gravados } = montar()
    loja.getState().registrarTempo(3600, true)
    construcao.getState().abrir()
    expect(loja.getState().painelAberto).toBeNull()
    expect(construcao.getState().aplicar({ ok: true, obra: LOTE_DA_CASA.obraInicial })).toBe(false)
    expect(gravados).toEqual([])
  })

  test('abrir na primeira vez troca a casa de antes pela obra inicial e para o personagem', () => {
    const { loja, construcao } = montar()
    expect(loja.getState().salvamento.construcao.casa).toBeNull()
    construcao.getState().abrir()
    expect(loja.getState().salvamento.construcao.casa).toEqual(LOTE_DA_CASA.obraInicial)
    expect(loja.getState().painelAberto).toBe(PAINEL_DE_CONSTRUIR)
    // A câmera de obra abre sempre de frente para a casa.
    expect(construcao.getState().camera.giro).toBe(0)
    construcao.getState().fechar()
    expect(loja.getState().painelAberto).toBeNull()
  })

  test('aplicar grava a obra e lembra a de antes; desfazer volta', () => {
    const { loja, construcao, gravados } = montar()
    construcao.getState().abrir()
    const antes = loja.getState().salvamento.construcao.casa
    const obra = antes ?? LOTE_DA_CASA.obraInicial
    expect(
      construcao
        .getState()
        .aplicar(esticarParede(obra, LOTE_DA_CASA, { x: -6, z: 0 }, { x: -6, z: 3 })),
    ).toBe(true)
    expect(loja.getState().salvamento.construcao.casa?.paredes).not.toEqual(antes?.paredes)
    expect(gravados.length).toBeGreaterThan(1)
    construcao.getState().desfazer()
    expect(loja.getState().salvamento.construcao.casa).toEqual(antes)
    expect(construcao.getState().antes).toEqual([])
  })

  test('recusa não grava nada e o Zappy explica', () => {
    const { loja, construcao } = montar()
    construcao.getState().abrir()
    const obra = loja.getState().salvamento.construcao.casa ?? LOTE_DA_CASA.obraInicial
    expect(
      construcao
        .getState()
        .aplicar(esticarParede(obra, LOTE_DA_CASA, { x: 0, z: 1 }, { x: 4, z: 1 })),
    ).toBe(false)
    expect(loja.getState().dica?.texto).toBe('Ali já tem a varanda. Escolha outro lugar.')
    expect(construcao.getState().antes).toEqual([])
  })

  test('o desfazer lembra no máximo as últimas obras', () => {
    const { loja, construcao } = montar()
    // O caminho é do quintal: a chave dele (N11) vem antes.
    loja.getState().mudar((s) => ({ ...s, chaves: 8 }))
    construcao.getState().abrir()
    for (let i = 0; i < LEMBRA_PARA_TRAS + 5; i++) {
      const obra = loja.getState().salvamento.construcao.casa ?? LOTE_DA_CASA.obraInicial
      const x = -12 + (i % 2)
      construcao
        .getState()
        .aplicar({ ok: true, obra: { ...obra, caminhos: [{ x, z: 6, tipo: 'pedra' }] } })
    }
    expect(construcao.getState().antes).toHaveLength(LEMBRA_PARA_TRAS)
  })

  test('cada recusa tem uma fala sem exclamação, travessão nem pergunta', () => {
    const recusas: Recusa[] = [
      { motivo: 'fora-do-lote' },
      { motivo: 'ocupado', nome: 'a horta' },
      { motivo: 'dentro-do-quarto' },
      { motivo: 'fecha-ocupado', nome: 'a horta' },
      { motivo: 'parede-do-quarto' },
      { motivo: 'sem-parede' },
      { motivo: 'parede-fixa' },
      { motivo: 'encontro-de-paredes' },
      { motivo: 'ja-tem-abertura' },
      { motivo: 'fora-de-comodo' },
      { motivo: 'no-quarto' },
      { motivo: 'limite' },
    ]
    for (const r of recusas) {
      const fala = falaDaRecusa(r)
      expect(fala).toBeTruthy()
      expect(fala).not.toMatch(/[!?—…]/)
    }
    expect(falaDaRecusa({ motivo: 'nada' })).toBeNull()
  })
})
