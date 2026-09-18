import { describe, expect, test } from 'bun:test'
import { type InteractiveBlock, isInteractiveBlock } from '@sistemazero/core/learning'
import { Elysia, getSchemaValidator, t } from 'elysia'
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
  // ⚠️ Full review de experiência do conjunto (A1): a `layers` apresentada como o painel Camadas do Pinta.
  [
    'experimentação da layers com a pilha de camadas',
    { ...base, activity: { type: 'experimentation', scene: 'layers', pilha: 'camadas' } },
  ],
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
  [
    // ⚠️ O TERCEIRO tempo do ciclo (15/09/2026): mexer, prever e ENUNCIAR a regra. Era recusado
    // pelo domínio enquanto a sessão da cena dividia a chave `answers.checkpoint` com a
    // alternativa escolhida; hoje a sessão mora em `sceneCheckpoint` e as duas convivem.
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
    'cena com caso e missão',
    {
      ...base,
      activity: {
        type: 'experimentation',
        scene: 'stage-size',
        setup: { actions: [{ type: 'stage', width: 480, height: 270 }], goals: ['border-on'] },
      },
    },
  ],
  [
    'cena do 3D, com o caso montado no espaço',
    {
      ...base,
      activity: {
        type: 'experimentation',
        scene: 'axis-z',
        setup: { actions: [{ type: 'place3d', x: 0, y: 0, z: 80 }], goals: ['up'] },
      },
    },
  ],
  [
    'demonstração do ateliê com roteiro próprio',
    {
      ...base,
      activity: {
        type: 'demonstration',
        scene: 'shading',
        script: [
          {
            id: 'p1',
            caption: 'Com uma cor só, ela parece um adesivo.',
            actions: [{ type: 'shade', on: false }],
          },
          {
            id: 'p2',
            caption: 'Com a segunda cor, ela ganha volume.',
            actions: [
              { type: 'shade', on: true },
              { type: 'light', side: 'right' },
            ],
          },
        ],
      },
    },
  ],
  [
    // ⚠️ Lote 5 do Raio-X (G4): as ações novas do ateliê (os espelhos do Pinta, o traço pronto, o
    // quadradinho, apagar o papel) passam pela borda como passam pelo domínio.
    'demonstração do espelho com as ações do lote 5',
    {
      ...base,
      activity: {
        type: 'demonstration',
        scene: 'symmetry',
        script: [
          {
            id: 'p1',
            caption: 'O espelho lado a lado copia a asa.',
            actions: [
              { type: 'mirror-mode', mode: 'x' },
              { type: 'trace', piece: 'asa' },
              { type: 'dot', x: 3, y: 12 },
              // Os dois espelhos ligados: duas chaves no Pinta (consertos do review da onda B do lote 5).
              { type: 'mirror-mode', mode: 'xy' },
              { type: 'trace', piece: 'asa' },
              { type: 'clear-paper' },
            ],
          },
        ],
      },
    },
  ],
  [
    'experimentação da folha com a largura do recorte no caso',
    {
      ...base,
      activity: {
        type: 'experimentation',
        scene: 'sheet-vs-sprite',
        setup: { actions: [{ type: 'crop', width: 16 }], goals: ['crop-whole', 'size-apart'] },
      },
    },
  ],
  [
    // ⚠️ Lote 2 do Raio-X: a previsão ganhou `revealOn` e `shows`. ⚠️ O `Check` daqui aceita
    // propriedades a MAIS, então este caso só prova que a borda não RECUSA o bloco. Quem prova que
    // os dois campos não são APAGADOS é o teste da rota tipada, lá embaixo.
    'cena com previsão retomável',
    {
      ...base,
      prediction: {
        context: {
          label: 'O botão de teste',
          explanation:
            'Nesta experiência, vamos observar o botão de teste antes de escolher um palpite.',
        },
        prompt: 'Vai aparecer?',
        choices: [
          { id: 'sim', label: 'Sim' },
          { id: 'nao', label: 'Não', shows: 'Olhe a tela: ela ficou vazia.' },
        ],
        correctChoiceId: 'nao',
        revealOn: 'hidden',
      },
    },
  ],
  [
    // ⚠️ Raio-X, lote 3: a figura que o palco desenha. Sem ela o nome decide (o caso de hoje).
    'cena com elenco e a figura escolhida',
    {
      ...base,
      activity: {
        type: 'experimentation',
        scene: 'velocity',
        cast: {
          hero: { name: 'Zé', gender: 'm', figure: 'nave' },
          obstacle: { name: 'asteroide', gender: 'm' },
        },
      },
    },
  ],
  [
    // ⚠️ Decisão da dona (17/09/2026): a Aula 1 do Corre Dino tem quatro cenas seguidas, e a
    // pergunta do fim ficou só em duas. É a única maneira de uma aula dizer "aqui ela só mexe".
    'cena que entra sem a pergunta do fim',
    {
      ...base,
      activity: { type: 'experimentation', scene: 'stage-size' },
      semPerguntaFinal: true,
    },
  ],
  ['sem pistas', { ...base, hints: [] }],
  ['dez pistas', { ...base, hints: Array.from({ length: 10 }, (_, i) => `pista ${i}`) }],
]

/** Blocos que o domínio RECUSA. A borda pode aceitar (o serviço aperta depois), mas queremos
 *  saber QUAIS — uma divergência nova aqui precisa ser uma decisão, não um acidente. */
const invalidos: Array<[string, unknown]> = [
  ['pistas repetidas', { ...base, hints: ['igual', 'igual'] }],
  [
    'previsão sem o contexto que apresenta o assunto',
    {
      ...base,
      prediction: {
        prompt: 'Vai aparecer?',
        choices: [
          { id: 'sim', label: 'Sim' },
          { id: 'nao', label: 'Não' },
        ],
      },
    },
  ],
  // A pilha só existe na `layers`: só o core sabe qual cena tem ordem de desenhar.
  [
    'pilha fora da layers',
    { ...base, activity: { type: 'experimentation', scene: 'world', pilha: 'camadas' } },
  ],
  [
    'pilha que não existe',
    { ...base, activity: { type: 'experimentation', scene: 'layers', pilha: 'lista' } },
  ],
  // ⚠️⚠️ A demonstração não cobra meta nenhuma. Enquanto o schema dela declarava só `actions`,
  // o `normalize` do Elysia APAGAVA o `goals` em vez de deixá-lo chegar — o payload passava com
  // o campo sumido e o guard do domínio, que é quem tem a régua e a mensagem certa, nunca o via.
  [
    'demonstração com missão',
    {
      ...base,
      activity: {
        type: 'demonstration',
        scene: 'shading',
        setup: { actions: [{ type: 'shade', on: true }], goals: ['volume'] },
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
  [
    // ⚠️ Recusado dos DOIS lados (a borda tem a lista fechada), então não entra nos frouxos.
    'elenco com uma figura que o palco não sabe desenhar',
    {
      ...base,
      activity: {
        type: 'experimentation',
        scene: 'world',
        cast: { hero: { name: 'dragão', gender: 'm', figure: 'dragao' } },
      },
    },
  ],
  [
    'previsão que se revela numa meta de outra cena',
    {
      ...base,
      prediction: {
        context: {
          label: 'Bastidores e tela do jogo',
          explanation: 'Nesta experiência, vamos comparar o que existe nos bastidores e na tela.',
        },
        prompt: 'Vai aparecer?',
        choices: [
          { id: 'sim', label: 'Sim' },
          { id: 'nao', label: 'Não' },
        ],
        revealOn: 'meta-que-nao-existe',
      },
    },
  ],
  // ⚠️⚠️ "Sem a pergunta do fim" só tem efeito na EXPERIMENTAÇÃO (a demonstração não herda
  // pergunta nenhuma) e não convive com a pergunta escrita no bloco: são duas ordens contrárias.
  // A borda só sabe a forma do campo; quem conhece as duas regras é o core.
  [
    'sem a pergunta do fim numa demonstração',
    {
      ...base,
      activity: { type: 'demonstration', scene: 'world' },
      semPerguntaFinal: true,
    },
  ],
  [
    'sem a pergunta do fim com a pergunta escrita no bloco',
    {
      ...base,
      semPerguntaFinal: true,
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
  // A borda tem a forma fechada (`t.Literal(true)`), então este é recusado dos DOIS lados.
  ['sem a pergunta do fim com `false`', { ...base, semPerguntaFinal: false }],
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
        'demonstração com missão',
        'impulso fora das cenas de salto',
        'pistas repetidas',
        'roteiro com ação de outra cena',
        'roteiro que promete uma descoberta que não acontece',
        'título só com espaço',
        'áudio sem https',
        'pilha fora da layers',
        // A meta é do CATÁLOGO da cena: só o core sabe quais existem.
        'previsão que se revela numa meta de outra cena',
        // "Sem a pergunta do fim" tem forma fechada na borda e DUAS regras no core: só na
        // experimentação, e nunca junto da pergunta escrita no bloco.
        'sem a pergunta do fim numa demonstração',
        'sem a pergunta do fim com a pergunta escrita no bloco',
      ].sort(),
    )
    for (const [nome, bloco] of invalidos) expect(isInteractiveBlock(bloco), nome).toBe(false)
  })
})

describe('⚠️⚠️ a figura do elenco ATRAVESSA uma rota com o corpo tipado', () => {
  test('o `normalize` do Elysia não apaga `figure`, e recusa a que não existe', async () => {
    // Raio-X, lote 3 (16/09/2026). O `Check` aceita propriedade a mais, então só uma rota tipada
    // prova que a figura escolhida no admin chega inteira (mesmo molde do teste da previsão).
    const app = new Elysia().post('/', ({ body }) => body, {
      body: t.Object({ content: InteractiveBlockSchema }),
    })
    const bloco: InteractiveBlock = {
      ...base,
      activity: {
        type: 'experimentation',
        scene: 'world',
        cast: { hero: { name: 'Zé', gender: 'm', figure: 'nave' } },
      },
    }
    const enviar = (content: unknown) =>
      app.handle(
        new Request('http://members.test/', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ content }),
        }),
      )
    const resposta = await enviar(bloco)
    expect(resposta.status).toBe(200)
    const devolvido = (await resposta.json()) as { content: InteractiveBlock }
    const atividade = devolvido.content.activity
    expect(atividade.type === 'experimentation' ? atividade.cast?.hero?.figure : null).toBe('nave')
    // Anti-vácuo: fora da lista, a borda recusa (é a mesma lista fechada do core).
    const invalido = await enviar({
      ...bloco,
      activity: {
        ...bloco.activity,
        cast: { hero: { name: 'Zé', gender: 'm', figure: 'dragao' } },
      },
    })
    expect(invalido.status).not.toBe(200)
  })
})

describe('⚠️⚠️ a previsão retomável ATRAVESSA uma rota com o corpo tipado', () => {
  test('o `normalize` do Elysia não apaga contexto, `revealOn` nem `shows`', async () => {
    /**
     * Review do lote 2 do Raio-X (16/09/2026). O caso "cena com previsão retomável" acima usa o
     * `Check`, que aceita propriedade a mais: ele passava igual com o DTO ANTIGO, sem os dois
     * campos, e não provava o que o comentário dele afirmava. O que apaga campo não declarado é o
     * `normalize` de uma rota com o corpo TIPADO, então é por uma rota assim que se mede.
     * ⚠️ Hoje nenhuma rota do members tipa o corpo com este schema (a importação é `t.Unknown()`, o
     * rascunho aceita propriedade a mais e a publicação passa por `safeParse`): o risco é o dia em
     * que uma passar a tipar, e é esse dia que este teste guarda.
     */
    const app = new Elysia().post('/', ({ body }) => body, {
      body: t.Object({ content: InteractiveBlockSchema }),
    })
    const bloco: InteractiveBlock = {
      ...base,
      prediction: {
        context: {
          label: 'Bastidores e tela do jogo',
          explanation: 'Nesta experiência, vamos comparar o que existe nos bastidores e na tela.',
        },
        prompt: 'Vai aparecer?',
        choices: [
          { id: 'sim', label: 'Sim' },
          { id: 'nao', label: 'Não', shows: 'Olhe a tela: ela ficou vazia.' },
        ],
        correctChoiceId: 'nao',
        revealOn: 'hidden',
      },
    }
    const resposta = await app.handle(
      new Request('http://members.test/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: bloco }),
      }),
    )
    expect(resposta.status).toBe(200)
    const devolvido = (await resposta.json()) as { content: InteractiveBlock }
    expect(devolvido.content.prediction?.context).toEqual(bloco.prediction?.context)
    expect(devolvido.content.prediction?.revealOn).toBe('hidden')
    expect(devolvido.content.prediction?.choices[1]?.shows).toBe('Olhe a tela: ela ficou vazia.')
    // Anti-vácuo: a mesma rota APAGA o que não está declarado, senão o teste aprovaria qualquer DTO.
    const comExtra = await app.handle(
      new Request('http://members.test/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: { ...bloco, campoQueNaoExiste: 'x' } }),
      }),
    )
    expect(
      ((await comExtra.json()) as { content: Record<string, unknown> }).content,
    ).not.toHaveProperty('campoQueNaoExiste')
  })
})

describe('⚠️⚠️ a pilha de camadas ATRAVESSA uma rota com o corpo tipado', () => {
  test('o `normalize` do Elysia não apaga `pilha` (full review de experiência do conjunto, A1)', async () => {
    const app = new Elysia().post('/', ({ body }) => body, {
      body: t.Object({ content: InteractiveBlockSchema }),
    })
    const bloco: InteractiveBlock = {
      ...base,
      activity: { type: 'experimentation', scene: 'layers', pilha: 'camadas' },
    }
    const resposta = await app.handle(
      new Request('http://members.test/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: bloco }),
      }),
    )
    expect(resposta.status).toBe(200)
    const devolvido = (await resposta.json()) as { content: InteractiveBlock }
    const atividade = devolvido.content.activity
    expect(atividade.type === 'experimentation' ? atividade.pilha : null).toBe('camadas')
  })

  /**
   * ⚠⚠ A voz do Zappy é um `Record` de chaves ARBITRÁRIAS (a chave é o texto falado), que é
   * justamente a forma que o `normalize` do Elysia costuma podar. Sem esta prova, a publicação
   * gravaria o bloco sem o dicionário — aceita, sem erro nenhum — e a cena voltaria à voz do
   * navegador sem ninguém saber por quê. É a armadilha que este arquivo já documentou três vezes.
   */
  test('o `normalize` do Elysia não apaga `vozes` (chaves arbitrárias sobrevivem)', async () => {
    const app = new Elysia().post('/', ({ body }) => body, {
      body: t.Object({ content: InteractiveBlockSchema }),
    })
    const vozes = {
      'Crie o Dino e ligue o desenho.': 'https://cdn.test/aulas/voz/abc.mp3',
      'Antes de mexer. Onde fica o Dino? Pode ser: Nos bastidores.': '/aulas/voz/def.mp3',
    }
    const bloco: InteractiveBlock = {
      ...base,
      activity: { type: 'experimentation', scene: 'world', vozes },
    }
    const resposta = await app.handle(
      new Request('http://members.test/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: bloco }),
      }),
    )
    expect(resposta.status).toBe(200)
    const devolvido = (await resposta.json()) as { content: InteractiveBlock }
    const atividade = devolvido.content.activity
    expect(atividade.type === 'experimentation' ? atividade.vozes : null).toEqual(vozes)
    // E o domínio aceita o mesmo bloco: borda e guarda concordam.
    expect(isInteractiveBlock(bloco)).toBe(true)
  })
})

describe('⚠️⚠️ "sem a pergunta do fim" ATRAVESSA uma rota com o corpo tipado', () => {
  test('o `normalize` do Elysia não apaga `semPerguntaFinal`, e recusa qualquer valor fora de `true`', async () => {
    /**
     * ⚠️⚠️ Campo no nível do BLOCO é recusado alto (400) quando não está declarado — diferente de
     * um campo dentro de `activity`, que o rascunho grava tal e qual. Sem a declaração no DTO, a
     * escolha da professora derrubaria a gravação inteira do bloco; com ela mal declarada, o
     * `normalize` de uma rota tipada a apagaria em silêncio e a pergunta voltaria à tela da criança.
     */
    const app = new Elysia().post('/', ({ body }) => body, {
      body: t.Object({ content: InteractiveBlockSchema }),
    })
    const enviar = (content: unknown) =>
      app.handle(
        new Request('http://members.test/', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ content }),
        }),
      )
    const bloco: InteractiveBlock = {
      ...base,
      activity: { type: 'experimentation', scene: 'stage-size' },
      semPerguntaFinal: true,
    }
    const resposta = await enviar(bloco)
    expect(resposta.status).toBe(200)
    const devolvido = (await resposta.json()) as { content: InteractiveBlock }
    expect(devolvido.content.semPerguntaFinal).toBe(true)
    // Anti-vácuo: `false` seria um segundo jeito de dizer "com pergunta", e a borda o recusa.
    expect((await enviar({ ...bloco, semPerguntaFinal: false })).status).not.toBe(200)
  })
})
