import { describe, expect, test } from 'bun:test'
import { type InteractiveBlock, isInteractiveBlock } from '@sistemazero/core/learning'
import { SCENE_MODELS, type SceneStep } from '@sistemazero/core/learning/scene'
import {
  roteiroAoTrocarCena,
  textoAoTrocarCena,
  trocarCena,
  trocarTipo,
} from '../src/lib/scene-authoring-rules'

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

describe('⚠️ o que NÃO pode atravessar uma troca de tipo', () => {
  const pergunta: InteractiveBlock = {
    kind: 'interactive',
    title: 'Antes de testar',
    instructions: 'Escolha',
    hints: [],
    required: false,
    activity: { type: 'question' },
    checkpoint: {
      prompt: 'O que acontece?',
      choices: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      correctChoiceId: 'a',
      explanation: 'Porque sim.',
    },
  }

  test('a pergunta de verificação sai ao virar cena, e o professor é avisado', () => {
    // Ela travava o bloco PARA SEMPRE: `isInteractiveBlock` recusa cena com pergunta anexa, e a
    // caixa de desmarcar só aparece nos tipos que não são cena — sumia junto com a saída.
    const { bloco, aviso } = trocarTipo(pergunta, 'experimentation')
    expect(bloco.checkpoint).toBeUndefined()
    expect(isInteractiveBlock(bloco)).toBe(true)
    expect(aviso).toContain('pergunta de verificação')
  })

  test('o impulso inicial não vai parar numa cena que não o tem', () => {
    const salto: InteractiveBlock = {
      ...pergunta,
      activity: { type: 'experimentation', scene: 'impulse', initialImpulse: 14 },
      checkpoint: undefined,
    }
    expect(isInteractiveBlock(salto)).toBe(true)
    const { bloco, aviso } = trocarCena(salto, 'world')
    expect(isInteractiveBlock(bloco)).toBe(true)
    expect(aviso).toContain('impulso inicial')
    const { bloco: viaTipo } = trocarTipo(
      { ...salto, activity: { type: 'experimentation', scene: 'world', initialImpulse: 14 } },
      'experimentation',
    )
    expect(isInteractiveBlock(viaTipo)).toBe(true)
  })

  test('⚠️ sair da demonstração com roteiro seu AVISA, em vez de sumir', () => {
    const comRoteiro: InteractiveBlock = {
      ...pergunta,
      checkpoint: undefined,
      activity: {
        type: 'demonstration',
        scene: 'world',
        script: [{ id: 'x', caption: 'Veja.', actions: [{ type: 'create' }] }],
      },
    }
    const { aviso } = trocarTipo(comRoteiro, 'experimentation')
    expect(aviso).toContain('roteiro')
  })

  test('o áudio da instrução acompanha entre as duas irmãs', () => {
    // Ele existe nos dois tipos e sumia calado na ida e volta — perda pura, sem motivo.
    const comAudio: InteractiveBlock = {
      ...pergunta,
      checkpoint: undefined,
      activity: {
        type: 'demonstration',
        scene: 'layers',
        instructionAudioUrl: 'https://exemplo.test/a.mp3',
      },
    }
    const { bloco } = trocarTipo(comAudio, 'experimentation')
    if (bloco.activity.type !== 'experimentation') throw new Error('tipo errado')
    expect(bloco.activity.instructionAudioUrl).toBe('https://exemplo.test/a.mp3')
    expect(bloco.activity.scene).toBe('layers')
  })

  test('as pistas DA CENA não seguem para uma múltipla escolha', () => {
    // "Olhe os bastidores: o Dino já existe?" oferecida numa pergunta é ajuda para outra coisa.
    const cena: InteractiveBlock = {
      ...pergunta,
      checkpoint: undefined,
      activity: { type: 'experimentation', scene: 'world' },
      hints: [...SCENE_MODELS.world.hints],
    }
    expect(trocarTipo(cena, 'question').bloco.hints).toEqual([])
    // Mas a pista que o PROFESSOR escreveu fica.
    expect(trocarTipo({ ...cena, hints: ['minha pista'] }, 'question').bloco.hints).toEqual([
      'minha pista',
    ])
  })
})
