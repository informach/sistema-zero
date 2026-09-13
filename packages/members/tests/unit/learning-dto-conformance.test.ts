import { describe, expect, test } from 'bun:test'
import { type InteractiveBlock, isInteractiveBlock } from '@sistemazero/core/learning'
import { getSchemaValidator } from 'elysia'
import { InteractiveBlockSchema } from '../../src/interfaces/http/learning.dtos'

// ⚠️ O MESMO validador que a borda usa (o `getSchemaValidator` do Elysia), e não um checador
// de TypeBox montado à parte: o que importa é o que o servidor de verdade aceita.
const validador = getSchemaValidator(InteractiveBlockSchema)

/**
 * O TypeBox da borda × o guarda do domínio.
 *
 * ⚠️ São duas descrições do MESMO contrato, escritas em linguagens diferentes, e este
 * repositório já se queimou com isso: a regra de legalidade das ações de cena existiu em três
 * cópias (motor, editor e DTO) e elas divergiram em silêncio — o `interval` do servidor não
 * tinha teto e o do editor ia de 0,5 a 2.
 *
 * O TypeBox pode ser MAIS FROUXO de propósito (quem aperta depois é o `assertBlockCoherent` do
 * serviço), mas nunca MAIS ESTRITO: um bloco que o domínio aceita e a borda recusa é uma aula
 * válida que não salva. Este teste mede as duas direções e falha na que não pode acontecer.
 */

const base: InteractiveBlock = {
  kind: 'interactive',
  title: 'Faça o Dino aparecer',
  instructions: 'Crie o Dino e ligue o desenho.',
  hints: ['Olhe os bastidores.'],
  required: false,
  activity: { type: 'experimentation', scene: 'world' },
}

/** Blocos que o DOMÍNIO aceita. Nenhum deles pode ser recusado na borda. */
const validos: Array<[string, InteractiveBlock]> = [
  ['experimentação simples', base],
  [
    'experimentação com impulso e áudio',
    {
      ...base,
      activity: {
        type: 'experimentation',
        scene: 'impulse',
        initialImpulse: 14,
        instructionAudioUrl: 'https://exemplo.test/a.mp3',
      },
    },
  ],
  ['demonstração do modelo', { ...base, activity: { type: 'demonstration', scene: 'layers' } }],
  [
    'demonstração com roteiro autoral',
    {
      ...base,
      activity: {
        type: 'demonstration',
        scene: 'world',
        script: [{ id: 'unico', caption: 'Veja.', actions: [{ type: 'create' }] }],
      },
    },
  ],
  [
    'pergunta curta',
    {
      ...base,
      activity: { type: 'question' },
      checkpoint: {
        prompt: 'E agora?',
        choices: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
        correctChoiceId: 'a',
        explanation: 'Porque sim.',
      },
    },
  ],
  ['html', { ...base, activity: { type: 'html', html: '<p>oi</p>' } }],
  ['sem pistas', { ...base, hints: [] }],
  ['dez pistas', { ...base, hints: Array.from({ length: 10 }, (_, i) => `pista ${i}`) }],
]

/** Blocos que o domínio RECUSA. A borda pode aceitar (o serviço aperta depois), mas queremos
 *  saber QUAIS — uma divergência nova aqui precisa ser uma decisão, não um acidente. */
const invalidos: Array<[string, unknown]> = [
  ['pistas repetidas', { ...base, hints: ['igual', 'igual'] }],
  [
    'cena com pergunta anexa',
    {
      ...base,
      checkpoint: {
        prompt: 'p',
        choices: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
        correctChoiceId: 'a',
        explanation: 'e',
      },
    },
  ],
  [
    'impulso fora das cenas de salto',
    { ...base, activity: { type: 'experimentation', scene: 'world', initialImpulse: 9 } },
  ],
  [
    'áudio sem https',
    {
      ...base,
      activity: {
        type: 'experimentation',
        scene: 'world',
        instructionAudioUrl: 'http://exemplo.test/a.mp3',
      },
    },
  ],
  [
    'roteiro que promete uma descoberta que não acontece',
    {
      ...base,
      activity: {
        type: 'demonstration',
        scene: 'world',
        script: [
          { id: 'x', caption: 'Veja.', actions: [{ type: 'create' }], waitFor: 'nunca-acontece' },
        ],
      },
    },
  ],
  [
    'roteiro com ação de outra cena',
    {
      ...base,
      activity: {
        type: 'demonstration',
        scene: 'world',
        script: [{ id: 'x', caption: 'Veja.', actions: [{ type: 'impulse', force: 9 }] }],
      },
    },
  ],
  ['título só com espaço', { ...base, title: '   ' }],
]

describe('o DTO da borda e o guarda do domínio', () => {
  for (const [nome, bloco] of validos)
    test(`⚠️ ${nome}: o domínio aceita, então a borda TEM de aceitar`, () => {
      expect(isInteractiveBlock(bloco), nome).toBe(true)
      expect(validador.Check(bloco), nome).toBe(true)
    })

  test('o que o domínio recusa e a borda deixa passar está listado, e o serviço aperta depois', () => {
    const frouxos = invalidos
      .filter(([, b]) => !isInteractiveBlock(b) && validador.Check(b))
      .map(([nome]) => nome)
    // ⚠️ A lista é o CONTRATO: cada item aqui é um caso em que só o `assertBlockCoherent` do
    // serviço segura. Item novo aparecendo sem alguém mexer neste arquivo é divergência que
    // entrou por acidente.
    expect(frouxos.sort()).toEqual(
      [
        'cena com pergunta anexa',
        'impulso fora das cenas de salto',
        'pistas repetidas',
        'roteiro com ação de outra cena',
        'roteiro que promete uma descoberta que não acontece',
        'título só com espaço',
        'áudio sem https',
      ].sort(),
    )
    for (const [nome, bloco] of invalidos) expect(isInteractiveBlock(bloco), nome).toBe(false)
  })
})
