import { describe, expect, test } from 'bun:test'
import { SCENE_FIGURES, type SceneFigure, sceneCenario } from './cast'
import {
  CENARIO_DA_FIGURA,
  cenarioEscuro,
  cenarioTemChao,
  fundoDoCenario,
  isSceneCenario,
  SCENE_CENARIO_IDS,
  SCENE_CENARIOS,
} from './cenario'

describe('o registro de cenários', () => {
  test('os seis mundos que os cursos ensinam estão lá', () => {
    expect([...SCENE_CENARIO_IDS].sort()).toEqual([
      'corre-dino',
      'farol',
      'gorilas',
      'jardim',
      'meu-jeito',
      'nave',
    ])
  })

  test('toda figura de todo cenário existe em SCENE_FIGURES', () => {
    // Sem isto, um cenário poderia pedir um desenho que o palco não sabe fazer — e o sintoma
    // seria uma figura faltando na tela, sem erro nenhum.
    const conhecidas = new Set<string>(SCENE_FIGURES)
    for (const id of SCENE_CENARIO_IDS)
      for (const [papel, figura] of Object.entries(SCENE_CENARIOS[id].figuras))
        expect({ id, papel, conhecida: conhecidas.has(figura) }).toEqual({
          id,
          papel,
          conhecida: true,
        })
  })

  test('todo cenário declara os três papéis', () => {
    for (const id of SCENE_CENARIO_IDS)
      expect({ id, papeis: Object.keys(SCENE_CENARIOS[id].figuras).sort() }).toEqual({
        id,
        papeis: ['hero', 'obstacle', 'scenery'],
      })
  })

  test('⚠️ quem não tem chão é quem mora no espaço, e só', () => {
    // O `temChao` decide se a figura pisa na linha ou flutua acima dela — e só isso. `gorilas` tem
    // chão (o telhado do prédio) apesar do céu escuro; quem responde pela COR é o `cenarioEscuro`,
    // no teste logo abaixo.
    expect(cenarioTemChao('corre-dino')).toBe(true)
    expect(cenarioTemChao('gorilas')).toBe(true)
    expect(cenarioTemChao('jardim')).toBe(true)
    expect(cenarioTemChao('farol')).toBe(true)
    expect(cenarioTemChao('nave')).toBe(false)
    expect(cenarioTemChao('meu-jeito')).toBe(false)
  })

  test('⚠️⚠️ ter chão e ter fundo escuro são perguntas DIFERENTES', () => {
    // Enquanto o palco só conhecia terra e espaço as duas andavam juntas, e a folha de estilo
    // escolhia a paleta escura da cena por "não tem chão". A `gorilas` quebra esse par: telhado de
    // prédio para pisar, céu noturno atrás. Com a pergunta antiga, a tinta escura da cena ficaria
    // sobre a cidade à noite.
    expect({ chao: cenarioTemChao('gorilas'), escuro: cenarioEscuro('gorilas') }).toEqual({
      chao: true,
      escuro: true,
    })
    expect({ chao: cenarioTemChao('corre-dino'), escuro: cenarioEscuro('corre-dino') }).toEqual({
      chao: true,
      escuro: false,
    })
    expect({ chao: cenarioTemChao('nave'), escuro: cenarioEscuro('nave') }).toEqual({
      chao: false,
      escuro: true,
    })
    // Ausente = o Corre Dino de fábrica: tem chão e é claro.
    expect({ chao: cenarioTemChao(undefined), escuro: cenarioEscuro(undefined) }).toEqual({
      chao: true,
      escuro: false,
    })
  })

  test('todo cenário de fundo ESCURO usa um fundo escuro de verdade', () => {
    // Anti-vácuo do par acima: a marca precisa casar com o desenho, senão ela vira um booleano que
    // alguém esqueceu de virar quando o fundo mudou.
    const escuros = new Set(['estrelas', 'cidade'])
    for (const id of SCENE_CENARIO_IDS)
      expect({ id, coerente: cenarioEscuro(id) === escuros.has(fundoDoCenario(id)) }).toEqual({
        id,
        coerente: true,
      })
  })

  test('cada cenário aponta um fundo do seu jogo', () => {
    expect(fundoDoCenario('corre-dino')).toBe('floresta')
    expect(fundoDoCenario('nave')).toBe('estrelas')
    expect(fundoDoCenario('gorilas')).toBe('cidade')
    expect(fundoDoCenario('jardim')).toBe('jardim')
    expect(fundoDoCenario('farol')).toBe('farol')
    // ⚠️ `meu-jeito` divide o céu com o Desafio de propósito: nos cursos a pedra e a chama SÃO o
    // asteroide e o fogo dele. O que separa os dois cursos é o elenco, não o fundo.
    expect(fundoDoCenario('meu-jeito')).toBe('estrelas')
  })

  test('o guard recusa id desconhecido, e não cai no padrão', () => {
    expect(isSceneCenario('corre-dino')).toBe(true)
    expect(isSceneCenario('terra')).toBe(false)
    expect(isSceneCenario('espaco')).toBe(false)
    expect(isSceneCenario(undefined)).toBe(false)
    // ⚠️ Herdado do protótipo: um objeto literal devolveria a função no lugar do cenário.
    expect(isSceneCenario('constructor')).toBe(false)
    expect(isSceneCenario('toString')).toBe(false)
  })

  test('⭐ a tabela figura → cenário é DERIVADA do registro, não uma lista à parte', () => {
    // Era um par de listas soltas que precisava ser mantido em sincronia à mão. Se alguém
    // acrescentar uma figura a um cenário, esta tabela acompanha sozinha.
    for (const id of SCENE_CENARIO_IDS)
      for (const figura of Object.values(SCENE_CENARIOS[id].figuras)) {
        const dono = CENARIO_DA_FIGURA[figura as SceneFigure]
        expect({ figura, temDono: dono !== undefined }).toEqual({ figura, temDono: true })
      }
    expect(CENARIO_DA_FIGURA.dino).toBe('corre-dino')
    expect(CENARIO_DA_FIGURA.nave).toBe('nave')
    expect(CENARIO_DA_FIGURA.gorila).toBe('gorilas')
    expect(CENARIO_DA_FIGURA.pedra).toBe('meu-jeito')
    expect(CENARIO_DA_FIGURA.coelho).toBe('jardim')
    expect(CENARIO_DA_FIGURA['personagem-farol']).toBe('farol')
  })

  test('⚠️⚠️ o cenário declarado precisa de um palco possível para TODA cena', () => {
    // Um cenário que só funcionasse em algumas cenas deixaria a autoria com uma armadilha:
    // declarar e não ver diferença. A resolução responde para qualquer par cena × cenário.
    for (const id of SCENE_CENARIO_IDS) {
      expect(sceneCenario(undefined, 'coordinates', id)).toBe(id)
      expect(sceneCenario(undefined, 'shading', id)).toBe(id)
    }
  })

  test('a experiência própria do jardim não vira outro jogo por troca de elenco', () => {
    expect(sceneCenario(undefined, 'touch-response')).toBe('jardim')
    expect(sceneCenario({ hero: { name: 'nave', gender: 'f' } }, 'touch-response', 'nave')).toBe(
      'jardim',
    )
  })

  test('a experiência da porta mantém o mundo do farol', () => {
    expect(sceneCenario(undefined, 'lighthouse-key')).toBe('farol')
    expect(sceneCenario({ hero: { name: 'nave', gender: 'f' } }, 'lighthouse-key', 'nave')).toBe(
      'farol',
    )
  })
})
