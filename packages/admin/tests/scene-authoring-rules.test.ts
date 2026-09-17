import { describe, expect, test } from 'bun:test'
import { type InteractiveBlock, isInteractiveBlock } from '@sistemazero/core/learning'
import { SCENE_MODELS, type SceneStep } from '@sistemazero/core/learning/scene'
import {
  casoAoTrocarCena,
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

const escolhas = () => [
  { id: 'a', label: 'Uma coisa' },
  { id: 'b', label: 'Outra coisa' },
]

describe('⚠️⚠️ o CASO da atividade nas duas trocas', () => {
  const base: InteractiveBlock = {
    kind: 'interactive',
    title: 'A cena',
    instructions: 'Mexa',
    hints: [],
    required: false,
    activity: { type: 'question' },
    checkpoint: undefined,
  }
  const caso = (scene: 'velocity' | 'variable') =>
    ({
      ...base,
      activity: {
        type: 'experimentation' as const,
        scene,
        setup:
          scene === 'velocity'
            ? { actions: [{ type: 'velocity' as const, vx: 5, vy: 0 }], goals: ['moves'] }
            : { actions: [{ type: 'store' as const, value: 10 }], goals: ['stored'] },
      },
    }) satisfies InteractiveBlock

  test('⚠️⚠️ caso de outra cena é APARADO, e o professor é avisado', () => {
    // Sem isto o bloco fica recusado para sempre com o recado genérico de "complete os
    // campos": as ações são da cena antiga e o editor do caso só desenha caixa para as metas
    // da cena NOVA — nenhuma aparece marcada, e o id estranho não tem como sair.
    const { bloco, aviso } = trocarCena(caso('velocity'), 'variable')
    expect(isInteractiveBlock(bloco)).toBe(true)
    expect(aviso).toContain('é de outra cena')
    const a = bloco.activity
    if (a.type !== 'experimentation') throw new Error('tipo errado')
    expect(a.setup).toBeUndefined()
  })

  test('caso que ainda vale na cena nova SOBREVIVE inteiro, sem aviso', () => {
    const relogio = {
      actions: [{ type: 'advance' as const, seconds: 1 }],
    }
    expect(casoAoTrocarCena(relogio, 'velocity', { metas: true })).toEqual({
      setup: relogio,
      descartado: 'nada',
    })
  })

  test('⚠️ a MISSÃO sai ao virar demonstração, mas o caso de partida fica', () => {
    // O alvo é da experimentação (a demonstração não cobra meta nenhuma, e o guard do domínio
    // recusa o campo); o mundo de partida serve às duas.
    const { setup, descartado } = casoAoTrocarCena(
      { actions: [{ type: 'velocity', vx: 5, vy: 0 }], goals: ['moves'] },
      'velocity',
      { metas: false },
    )
    expect(setup).toEqual({ actions: [{ type: 'velocity', vx: 5, vy: 0 }] })
    // ⚠️ `missao`, não `tudo`: o recado tem que falar da perda que ACONTECEU, senão o professor
    // vai procurar o que consertar nas ações, que estão intactas.
    expect(descartado).toBe('missao')
  })

  test('⚠️ o caso ACOMPANHA a ida e volta entre as duas irmãs', () => {
    // É o trabalho mais caro da autoria, e o grupo de rádio dos quatro cartões atravessa os
    // outros dois SOZINHO quando o professor usa a seta do teclado.
    const memoria = { scene: 'velocity' as const }
    const { bloco: demo } = trocarTipo(caso('velocity'), 'demonstration', memoria)
    const d = demo.activity
    if (d.type !== 'demonstration') throw new Error('tipo errado')
    expect(d.setup).toEqual({ actions: [{ type: 'velocity', vx: 5, vy: 0 }] })
    expect(isInteractiveBlock(demo)).toBe(true)
  })

  test('⚠️ a missão avisa que fica guardada ao sair da experimentação', () => {
    const { aviso } = trocarTipo(caso('velocity'), 'demonstration')
    expect(aviso).toContain('missão')
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

  test('⭐ a pergunta de verificação SOBREVIVE ao virar cena', () => {
    // Ela era apagada porque `isInteractiveBlock` recusava cena com pergunta anexa. Desde
    // 15/09/2026 a cena a aceita — é o terceiro tempo do ciclo (mexer, prever, enunciar) — e
    // apagar o que o professor escreveu ao trocar de tipo voltou a ser perda de trabalho.
    const { bloco } = trocarTipo(pergunta, 'experimentation')
    expect(bloco.checkpoint?.prompt).toBe('O que acontece?')
    expect(isInteractiveBlock(bloco)).toBe(true)
  })

  test('⚠️⚠️ a previsão sai ao deixar a cena, e o professor é avisado', () => {
    // Achado do full review: a caixa da previsão só existe nos dois tipos de CENA, e o player só
    // a desenha no palco. Saindo para pergunta curta ou HTML ela ficava no bloco INVISÍVEL — o
    // professor não tinha como apagá-la e, com a pergunta em branco (o estado em que a caixa
    // nasce), o bloco parava de publicar com o recado genérico de "complete os campos".
    const comPrevisao: InteractiveBlock = {
      ...pergunta,
      activity: { type: 'experimentation', scene: 'world' },
      checkpoint: undefined,
      prediction: { prompt: '', choices: escolhas() },
    }
    // A prova de que o defeito era real: em branco, ela REPROVA o bloco.
    expect(isInteractiveBlock(comPrevisao)).toBe(false)
    const { bloco, aviso } = trocarTipo(comPrevisao, 'question')
    expect(bloco.prediction).toBeUndefined()
    expect(aviso).toContain('previsão')
    // ⚠️ A validade é conferida na Experiência em HTML, e não na Pergunta curta: esta última
    // cria de propósito uma pergunta EM BRANCO, que também reprova o bloco — só que ela está na
    // tela, com os campos à vista. O que a previsão fazia era reprovar SEM aparecer.
    const paraHtml = trocarTipo(comPrevisao, 'html')
    expect(paraHtml.bloco.prediction).toBeUndefined()
    expect(isInteractiveBlock(paraHtml.bloco)).toBe(true)
    // E ela ATRAVESSA entre as duas irmãs, que são o mesmo assunto com o mesmo palco.
    const escrita: InteractiveBlock = {
      ...comPrevisao,
      prediction: { prompt: 'O que vai acontecer?', choices: escolhas() },
    }
    expect(trocarTipo(escrita, 'demonstration').bloco.prediction?.prompt).toBe(
      'O que vai acontecer?',
    )
    expect(trocarCena(escrita, 'layers').bloco.prediction?.prompt).toBe('O que vai acontecer?')
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

describe('⚠️⚠️ a previsão própria na troca de cena (review do lote 2 do Raio-X)', () => {
  const mundo: InteractiveBlock = {
    kind: 'interactive',
    title: 'Faça o Dino aparecer',
    instructions: 'Crie o Dino e ligue o desenho.',
    hints: [],
    required: false,
    activity: { type: 'experimentation', scene: 'world' },
    // É o que "Escrever a minha previsão" copia da cena: o `revealOn` vem junto, sem campo na tela.
    prediction: {
      prompt: 'O que aparece?',
      choices: [
        { id: 'dino', label: 'O Dino', shows: 'Olhe a tela.' },
        { id: 'nada', label: 'Nada' },
      ],
      correctChoiceId: 'nada',
      revealOn: 'hidden',
    },
  }

  test('o `revealOn` de outra cena sai, com aviso, e o bloco continua válido', () => {
    expect(isInteractiveBlock(mundo)).toBe(true)
    // O defeito: o `revealOn` da `world` ficava na `layers`, o bloco virava inválido e nada na tela
    // dizia por quê (o editor não tem campo para ele).
    for (const cena of ['layers', 'gravity', 'coordinates'] as const) {
      const { bloco, aviso } = trocarCena(mundo, cena)
      expect(isInteractiveBlock(bloco), cena).toBe(true)
      expect(bloco.prediction?.revealOn, cena).toBeUndefined()
      // O que o professor escreveu fica: só a meta que não existe nesta cena sai.
      expect(bloco.prediction?.prompt).toBe('O que aparece?')
      expect(bloco.prediction?.choices[0]?.shows).toBe('Olhe a tela.')
      expect(aviso, cena).toContain('previsão')
    }
    // Voltar para a MESMA cena não perde nada, e não avisa nada.
    const mesma = trocarCena(mundo, 'world')
    expect(mesma.bloco.prediction?.revealOn).toBe('hidden')
    expect(mesma.aviso).not.toContain('previsão')
    // Entre as irmãs (mesma cena) o `revealOn` atravessa.
    expect(trocarTipo(mundo, 'demonstration').bloco.prediction?.revealOn).toBe('hidden')
  })
})

describe('“esta cena entra sem a pergunta do fim” na troca de tipo', () => {
  const semPergunta: InteractiveBlock = {
    kind: 'interactive',
    title: 'Descubra o limite da tela',
    instructions: 'Ligue a borda.',
    hints: [],
    required: true,
    activity: { type: 'experimentation', scene: 'stage-size' },
    semPerguntaFinal: true,
  }

  test('⚠️⚠️ ela NÃO atravessa para os outros três tipos', () => {
    // A caixa só existe na experimentação (é a única que herda pergunta do modelo) e some junto
    // com o tipo. Carregada para fora, deixaria o bloco recusado para sempre sem caminho de
    // volta na tela — o mesmo defeito que já tirou daqui a pergunta anexa e o impulso inicial.
    for (const tipo of ['demonstration', 'question', 'html'] as const) {
      const { bloco } = trocarTipo(semPergunta, tipo)
      expect(bloco.semPerguntaFinal, tipo).toBeUndefined()
    }
    // ⚠️ E o bloco continua PUBLICÁVEL na irmã. Os outros dois ficam de fora porque já nascem
    // pedindo trabalho por regras ANTERIORES a este campo: a "Pergunta curta" fabrica a pergunta
    // em branco (o convite a escrevê-la) e o HTML essencial exige uma pergunta corrigida no
    // servidor. Os dois recusariam igual sem o `semPerguntaFinal` na história.
    expect(isInteractiveBlock(trocarTipo(semPergunta, 'demonstration').bloco)).toBe(true)
  })

  test('ficar na experimentação (trocando de cena) preserva a escolha', () => {
    const { bloco } = trocarTipo(semPergunta, 'experimentation')
    expect(bloco.semPerguntaFinal).toBe(true)
    expect(isInteractiveBlock(bloco)).toBe(true)
    const trocada = trocarCena(semPergunta, 'screen-reader')
    expect(trocada.bloco.semPerguntaFinal).toBe(true)
    expect(isInteractiveBlock(trocada.bloco)).toBe(true)
  })
})
