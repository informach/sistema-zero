import type { LearningManifest, SectionProjectCheck } from '../../../packages/core/src/learning'
import {
  blocoDaCena,
  CENARIO_DO_CURSO,
  type CenaAnterior,
  type CenaDaAula,
  intencaoDaCena,
} from './cenas-editorial'

const sourceFile = 'roteiro-aula-01-corre-dino.md'
export const lessonOneCuts = {
  sourceFile,
  status:
    'Planejamento por âncoras do roteiro; conferir o arquivo de vídeo antes de definir timecodes.',
  clips: [
    {
      key: 'video-abertura-v7',
      sourceSection: 'Abertura: o jogo que você vai construir',
      entry: 'Oi! Seja bem-vindo ao',
      exit: 'Então bora começar pelo primeiro.',
      edit: 'Reaproveitar apresentação do jogo pronto e os quatro passos. A criança só assiste ao exemplo.',
      production: 'recorte',
    },
    {
      key: 'video-iniciar-v7',
      sourceSection: 'Parte 1. Passo 1: montar a área que prepara o jogo',
      entry: 'Antes de tudo, o seu jogo precisa de um lugar pra ser montado.',
      exit: 'O segundo é preparar a tela.',
      edit: 'Preservar o gesto completo, a área vazia e a analogia do tabuleiro. Não acrescentar outra demonstração.',
      production: 'recorte',
    },
    {
      key: 'video-tela-v7',
      sourceSection: 'Parte 2. Passo 2: preparar a tela',
      entry: 'Agora a gente prepara a tela onde o jogo acontece.',
      exit: 'O terceiro é rapidinho.',
      edit: 'Manter tela sem limite visível, encaixe da borda e retângulo revelado no mesmo clipe. Manter 480 × 270 e espessura 4. Escolhas de cor ficam limitadas a céu e borda com contraste.',
      production: 'recorte',
    },
    {
      key: 'video-coordenadas-demo-v7',
      sourceSection: 'Parte 4. Passo 4: criar o dino',
      entry: 'O x diz se ele fica mais pra esquerda ou mais pra direita.',
      exit: 'A linha 150 está bem mais embaixo que a linha 1.',
      edit: 'Reaproveitar a narração sobre x e y sobre uma cartela de 480 × 270. Mover apenas um marcador: primeiro x com y fixo, depois y com x fixo. Origem no canto superior esquerdo; valores 110 e 150. Abrir com uma ponte curta: cada personagem tem um endereço. Não há arraste nem parâmetros para a criança.',
      production: 'audio-reaproveitado-e-visual-novo',
    },
    {
      key: 'video-dino-v7',
      sourceSection: 'Parte 4. Passo 4: criar o dino',
      entry: 'Chegou a hora do seu dinossauro.',
      exit: 'Quarto passo concluído.',
      edit: 'Reaproveitar criação, sprite, configuração e explicação da invisibilidade. Retirar o trecho de coordenadas usado na demonstração, de “Depois vêm” até “grande maioria dos jogos que você vai fazer”. Retomar em “O y já está em 150”. Preservar x 110, y 150 e tamanho 64. Na trilha guiada, manter o identificador dino para evitar confusão nos seletores das próximas aulas. A cor continua livre; encurtar o passeio pela paleta a uma escolha, sem desafio extra.',
      production: 'recorte',
    },
    {
      key: 'video-fecho-v7',
      sourceSection: 'Fecho',
      entry: 'Parabéns, você terminou a Aula 1!',
      exit: 'Te espero lá!',
      edit: 'Reaproveitar recapitulacão e gancho da Aula 2. Acrescentar somente uma cartela curta indicando o quiz. Não dizer que o aluno já programou o desenho do Dino.',
      production: 'recorte',
    },
  ].map((clip) => ({ ...clip, sourceFile, inSeconds: null, outSeconds: null })),
}

/**
 * As cenas da aula 1, como dado. A tela abre a aula como descoberta separada da montagem; depois vêm
 * as coordenadas. Criar e desenhar é a experimentação que já existia, com dois controles separados
 * desde o lote 5 do Raio-X.
 *
 * ⚠️⚠️ A pergunta do fim fica só nas duas cenas que ensinam a ideia cobrada no quiz. As três previsões
 * continuam (são palpites antes de mexer, e não valem nota); a `stage-size` dispensa a pergunta final
 * (`semPerguntaFinal`) e `coordinates` e `world` a mantêm.
 */
export const lessonOneScenes = {
  'video-tela-v7': {
    chave: 'experiencia-tela',
    bloco: {
      required: true,
      title: 'Descubra o limite da tela',
      instructions:
        'Ligue a borda e veja o que aparece. Depois mude a largura e a altura até chegar em 480 por 270.',
      hints: [],
      activity: { type: 'experimentation', scene: 'stage-size' },
      semPerguntaFinal: true,
    },
  },
  'video-coordenadas-demo-v7': {
    chave: 'experiencia-coordenadas',
    bloco: {
      required: true,
      title: 'Descubra o endereço na tela',
      instructions:
        'Mude o x e veja para que lado o Dino vai. Depois mude só o y e compare. Por último, leve o Dino para x 0 e y 0.',
      hints: [],
      activity: { type: 'experimentation', scene: 'coordinates' },
    },
  },
} satisfies Record<string, CenaDaAula>

export const lessonOneDiscovery = {
  chave: 'descoberta',
  bloco: {
    required: false,
    title: 'Criar e mostrar são duas coisas diferentes',
    instructions:
      'Primeiro, crie o Dino nos bastidores. Depois, faça o Dino aparecer na tela do jogo.',
    hints: [
      'Olhe a ficha dos bastidores e a tela do jogo.',
      'Primeiro, crie o Dino nos bastidores.',
      'Depois, mostre o Dino na tela do jogo.',
    ],
    activity: { type: 'experimentation', scene: 'world' },
  },
} satisfies CenaDaAula

/** Clipes da aula 1 que mostram ou descrevem a experiência num estado que não existe mais. */
export const lessonOneOldScenes: Record<string, CenaAnterior> = {
  'video-coordenadas-demo-v7': {
    cena: 'coordinates',
    oQueMudou:
      'A seção deixou de ser só o vídeo: depois dele a criança abre a cena coordinates e mexe no x e no y. O marcador animado sobre a cartela e a frase de que não há arraste nem parâmetros para a criança descrevem a demonstração antiga.',
    acao: 'cortar',
  },
}

/** Chaves que existiam no candidato anterior e precisam sair quando a nova autoria for importada. */
const RETIRED_READER_BLOCK_KEYS = [
  'video-descricao-demo-v7',
  'experiencia-leitor-de-tela',
  'video-descricao-criar-v7',
  'orientacao-descricao-v7',
]

export function reviseLessonOne(source: LearningManifest): LearningManifest {
  if (source.courseSlug !== 'corre-dino' || source.lessonSlug !== 'aula-01')
    throw new Error('A revisão editorial é específica da aula 1 do Corre Dino.')
  const manifest = structuredClone(source)
  const workspace = manifest.blocks.find((block) => block.key === 'projeto')
  const discovery = manifest.blocks.find((block) => block.key === 'descoberta')
  const quiz = manifest.blocks.find((block) => block.key === 'quiz-final')
  if (!workspace || !discovery || !quiz || !('content' in quiz) || quiz.content.kind !== 'quiz')
    throw new Error('A aula 1 precisa preservar projeto, experimentação e quiz.')
  quiz.content.questions = quiz.content.questions.filter(
    (question) => question.id !== 'q3-coordenadas',
  )
  quiz.content.questions.push({
    id: 'q3-coordenadas',
    prompt: 'O x continua igual e o y aumenta. Para onde vai o personagem?',
    choices: [
      { id: 'baixo', label: 'Mais para baixo.' },
      { id: 'direita', label: 'Mais para a direita.' },
    ],
    correctChoiceIds: ['baixo'],
    explanation:
      'Na tela do jogo, o y aumenta de cima para baixo. O x indica a posição na horizontal.',
  })
  const dialogue = (key: string, text: string): LearningManifest['blocks'][number] => ({
    key,
    content: { kind: 'dialogue', pose: 'speaking', text },
  })
  manifest.blocks = [
    ...lessonOneCuts.clips.flatMap((clip) => {
      const video = {
        key: clip.key,
        plannedVideo: `Fonte: ${sourceFile}, ${clip.sourceSection}. Entrada: “${clip.entry}”. Saída: “${clip.exit}”. Montagem: ${clip.edit} Timecodes dependem da conferência do vídeo gravado.`,
      }
      const cena = lessonOneScenes[clip.key as keyof typeof lessonOneScenes]
      return cena
        ? [
            video,
            blocoDaCena(
              cena,
              cena.chave === 'experiencia-tela' ? undefined : CENARIO_DO_CURSO['corre-dino'],
            ),
          ]
        : [video]
    }),
    dialogue(
      'orientacao-iniciar-v7',
      'Em Áreas do projeto, coloque Ao iniciar no espaço de montar. Nesta etapa ele fica vazio. Confira seu projeto para continuar.',
    ),
    dialogue(
      'orientacao-tela-v7',
      'Dentro de Ao iniciar, prepare a tela de 480 × 270. Logo abaixo, coloque Mostrar a borda da tela, com espessura 4. Escolha uma borda que apareça sobre o céu.',
    ),
    dialogue(
      'orientacao-experiencia-tela-v8',
      'Antes de montar no seu jogo, descubra onde a tela do jogo termina. A borda é o que mostra esse limite.',
    ),
    dialogue(
      'orientacao-dino-v7',
      'Em Jogo 2D, Kits prontos, Dino, encaixe Criar dinossauro em Ao iniciar. Use nome dino, x 110, y 150 e tamanho 64. Você pode escolher a cor. Ele ainda não aparece nesta aula.',
    ),
    blocoDaCena(lessonOneDiscovery),
    dialogue(
      'orientacao-descoberta-v7',
      'Esta é uma experiência separada do seu projeto. No seu jogo, o desenho vem na próxima aula.',
    ),
    dialogue(
      'orientacao-entrega-v7',
      'Confira a tela com borda e o bloco que cria seu Dino. O Dino ainda invisível é o resultado esperado. Teste e envie seu projeto ao professor.',
    ),
    workspace,
    quiz,
  ]
  const checks = {
    start: {
      id: 'area-iniciar-v7',
      label: 'Coloque a área Ao iniciar no projeto.',
      rule: { type: 'usesBlock', blockType: 'sz_frame_start', area: 'start' },
    },
    stage: {
      id: 'g2d-setup-stage',
      label: 'Prepare a tela de 480 × 270 em Ao iniciar.',
      rule: {
        type: 'usesBlock',
        blockType: 'sz_g2d_setup_stage',
        area: 'start',
        inputs: { W: 480, H: 270 },
      },
    },
    border: {
      id: 'borda-v7',
      label: 'Coloque Mostrar a borda da tela em Ao iniciar, com espessura 4.',
      rule: {
        type: 'usesBlock',
        blockType: 'sz_g2d_stage_border',
        area: 'start',
        inputs: { WIDTH: 4 },
      },
    },
    dino: {
      id: 'dino-v7',
      label: 'Crie o dinossauro dino em Ao iniciar: x 110, y 150 e tamanho 64.',
      rule: {
        type: 'usesBlock',
        blockType: 'sz_g2d_create_dino',
        area: 'start',
        fields: { NAME: 'dino' },
        inputs: { X: 110, Y: 150, SIZE: 64 },
      },
    },
  } satisfies Record<string, SectionProjectCheck>
  type Section = LearningManifest['sections'][number]
  const section = (
    key: string,
    title: string,
    intent: Section['intent'],
    objective: string,
    blockKeys: string[],
    projectChecks?: SectionProjectCheck[],
    concluiCom?: string[],
  ): Section => ({
    key,
    title,
    intent,
    objective,
    blockKeys,
    workspaceKey: projectChecks ? 'projeto' : null,
    externalTool: null,
    pendingMedia: [],
    completion: {
      version: 1,
      blockIds:
        concluiCom ??
        (projectChecks ? [] : blockKeys.filter((key) => !key.startsWith('orientacao-'))),
      ...(projectChecks ? { projectChecks } : {}),
    },
  })
  manifest.sections = [
    section(
      'apresentacao-v7',
      'Conheça o jogo que vamos criar',
      'presentation',
      'Reconhecer o jogo final e os quatro passos de hoje. Nesta aula o Dino será criado, ainda sem aparecer.',
      ['video-abertura-v7'],
    ),
    section(
      'iniciar-v7',
      'Um lugar para começar',
      'application',
      'Colocar Ao iniciar no projeto e entender que esta área prepara a partida.',
      ['video-iniciar-v7', 'orientacao-iniciar-v7'],
      [checks.start],
    ),
    section(
      'tela-experiencia-v8',
      'Descubra o limite da tela',
      intencaoDaCena(lessonOneScenes['video-tela-v7']),
      'Perceber que a borda mostra onde a tela do jogo termina e que o tamanho dela pode mudar.',
      ['orientacao-experiencia-tela-v8', lessonOneScenes['video-tela-v7'].chave],
      undefined,
      [lessonOneScenes['video-tela-v7'].chave],
    ),
    section(
      'tela-criar-v8',
      'Prepare a tela no seu projeto',
      'application',
      'Preparar o palco de 480 × 270 e tornar sua borda visível.',
      ['video-tela-v7', 'orientacao-tela-v7'],
      [checks.stage, checks.border],
    ),
    section(
      'coordenadas-demonstracao-v7',
      'Descubra o endereço na tela',
      intencaoDaCena(lessonOneScenes['video-coordenadas-demo-v7']),
      'Observar x crescendo para a direita e y crescendo para baixo, uma direção por vez.',
      ['video-coordenadas-demo-v7', lessonOneScenes['video-coordenadas-demo-v7'].chave],
      undefined,
      [lessonOneScenes['video-coordenadas-demo-v7'].chave],
    ),
    section(
      'dino-v7',
      'Crie o seu dinossauro',
      'application',
      'Criar e posicionar um sprite, reconhecendo que ele pode existir sem estar desenhado.',
      ['video-dino-v7', 'orientacao-dino-v7'],
      [checks.dino],
    ),
    section(
      'comeco',
      'Criar e mostrar são duas coisas diferentes',
      'exploration',
      'Observar o Dino criado nos bastidores, aparecer na tela e voltar aos bastidores sem ser apagado.',
      ['orientacao-descoberta-v7', 'descoberta'],
    ),
    {
      ...section(
        'entrega-v7',
        'Confira e guarde sua construção',
        'delivery',
        'Conferir o projeto, testá-lo e enviar ao professor com o Dino ainda invisível.',
        ['orientacao-entrega-v7', 'projeto'],
        Object.values(checks),
      ),
      completion: { version: 1, blockIds: ['projeto'], projectChecks: Object.values(checks) },
    },
    section(
      'fechamento',
      'Relembre o que você construiu',
      'closing',
      'Retomar os quatro passos e preparar a continuidade na aula 2.',
      ['video-fecho-v7'],
    ),
    section(
      'revisao',
      'O que você entendeu?',
      'closing',
      'Retomar Ao iniciar, criação e desenho, e direção das coordenadas.',
      ['quiz-final'],
    ),
  ]
  const retained = new Set(manifest.blocks.map((block) => block.key))
  manifest.retireBlockKeys = [
    ...new Set([
      ...(source.retireBlockKeys ?? []),
      ...source.blocks.map((block) => block.key),
      ...RETIRED_READER_BLOCK_KEYS,
    ]),
  ].filter((key) => !retained.has(key))
  return manifest
}
