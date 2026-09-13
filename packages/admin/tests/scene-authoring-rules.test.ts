import { describe, expect, test } from 'bun:test'
import { SCENE_MODELS, type SceneStep } from '@sistemazero/core/learning/scene'
import { roteiroAoTrocarCena, textoAoTrocarCena } from '../src/lib/scene-authoring-rules'

const doModelo = (cena: 'world' | 'layers') => ({
  title: SCENE_MODELS[cena].title,
  instructions: SCENE_MODELS[cena].instruction,
  hints: [...SCENE_MODELS[cena].hints],
})

describe('o texto ao trocar de cena', () => {
  test('bloco em branco recebe o texto do modelo', () => {
    const r = textoAoTrocarCena({ title: '', instructions: '', hints: [] }, null, 'layers')
    expect(r).toEqual(doModelo('layers'))
  })

  test('quem nunca encostou no texto continua acompanhando a cena escolhida', () => {
    // É o gesto de passear pelas cenas para decidir: o texto tem que seguir junto, senão o
    // professor fica lendo a descrição da cena anterior enquanto olha outra.
    const r = textoAoTrocarCena(doModelo('world'), 'world', 'layers')
    expect(r).toEqual(doModelo('layers'))
  })

  test('⚠️ o que o professor ESCREVEU não é sobrescrito', () => {
    // O editor jogava fora título, instrução e pistas a cada troca de cena e de tipo. Quem
    // escreveu a própria instrução perdia tudo ao trocar de cena para conferir outra, sem aviso.
    const meu = {
      title: 'O Dino sumiu!',
      instructions: 'Descubra por que ele não aparece.',
      hints: ['Olhe o fio do desenho.'],
    }
    expect(textoAoTrocarCena(meu, 'world', 'layers')).toEqual(meu)
  })

  test('campo por campo: o que ele mexeu fica, o que ele não mexeu acompanha', () => {
    const misto = {
      title: 'O Dino sumiu!',
      instructions: SCENE_MODELS.world.instruction,
      hints: [],
    }
    const r = textoAoTrocarCena(misto, 'world', 'layers')
    expect(r.title).toBe('O Dino sumiu!')
    expect(r.instructions).toBe(SCENE_MODELS.layers.instruction)
    expect(r.hints).toEqual([...SCENE_MODELS.layers.hints])
  })

  test('sem cena anterior conhecida, texto escrito é preservado', () => {
    // Trocar de "pergunta" para "cena" não tem cena anterior com que comparar: na dúvida, o
    // texto é dele.
    const meu = { title: 'Meu título', instructions: 'Minha instrução', hints: ['minha pista'] }
    expect(textoAoTrocarCena(meu, null, 'world')).toEqual(meu)
  })
})

describe('o roteiro ao trocar de cena', () => {
  test('sem roteiro autoral não há nada a descartar', () => {
    expect(roteiroAoTrocarCena(undefined, 'layers')).toEqual({
      script: undefined,
      descartado: false,
    })
  })

  test('⚠️ roteiro que NÃO vale na cena nova é descartado COM aviso', () => {
    // Sumir calado é o defeito: a professora escreve seis etapas, troca a cena para conferir
    // outra, volta, e o trabalho não está mais lá.
    const doWorld = [...SCENE_MODELS.world.script] as SceneStep[]
    const r = roteiroAoTrocarCena(doWorld, 'hitbox')
    expect(r.script).toBeUndefined()
    expect(r.descartado).toBe(true)
  })

  // Entre cenas IRMÃS o roteiro costuma valer nas duas: `gravity` e `impulse` aceitam as
  // mesmas ações de salto, e é justamente entre elas que o professor vai e volta comparando.
  const saltoSimples: SceneStep[] = [
    {
      id: 'unico',
      caption: 'Veja o salto.',
      actions: [
        { type: 'jump', input: 'tap' },
        { type: 'advance', seconds: 1 },
      ],
    },
  ]

  test('roteiro que ainda vale na cena nova SOBREVIVE, sem aviso', () => {
    // Descartá-lo seria perder trabalho que não precisava ser perdido.
    const r = roteiroAoTrocarCena(saltoSimples, 'impulse')
    expect(r.descartado).toBe(false)
    expect(r.script).toEqual(saltoSimples)
  })

  test('o roteiro devolvido é uma CÓPIA: mexer nele não mexe no original', () => {
    const r = roteiroAoTrocarCena(saltoSimples, 'impulse')
    r.script?.push({ id: 'outro', caption: 'x', actions: [{ type: 'advance', seconds: 1 }] })
    expect(saltoSimples).toHaveLength(1)
  })
})
