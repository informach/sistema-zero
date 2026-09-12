import type { LearningManifest, SectionProjectCheck } from '../../../packages/core/src/learning'

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
      key: 'video-descricao-demo-v7',
      sourceSection: 'Parte 3. Passo 3: contar o que é o seu jogo',
      entry: 'Tem gente que joga videogame sem enxergar a tela.',
      exit: 'e esse alguém é você.',
      edit: 'Reutilizar a introdução. Acrescentar uma captura curta com leitor de tela real lendo a descrição de um exemplo pronto, texto visível e legendas. Não mostrar a montagem nem sugerir que o bloco liga uma voz sozinho.',
      production: 'recorte-e-complemento',
    },
    {
      key: 'video-descricao-criar-v7',
      sourceSection: 'Parte 3. Passo 3: contar o que é o seu jogo',
      entry: 'Na categoria Jogo 2D, subcategoria',
      exit: 'Numa frase, a gente coloca o que é o jogo e como se joga.',
      edit: 'Começar no caminho Telas e cenas e terminar após explicar objetivo e controles. Substituir a promessa de tornar o jogo acessível com um bloco por uma conclusão precisa: agora sua descrição informa objetivo e controles. Preservar a frase canônica, sem ponto final no campo.',
      production: 'recorte-e-complemento',
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

export function reviseLessonOne(source: LearningManifest): LearningManifest {
  if (source.courseSlug !== 'corre-dino' || source.lessonSlug !== 'aula-01')
    throw new Error('A revisão editorial é específica da aula 1 do Corre Dino.')
  const manifest = structuredClone(source)
  const workspace = manifest.blocks.find((block) => block.key === 'projeto')
  const discovery = manifest.blocks.find((block) => block.key === 'descoberta')
  const quiz = manifest.blocks.find((block) => block.key === 'quiz-final')
  if (!workspace || !discovery || !quiz || !('content' in quiz) || quiz.content.kind !== 'quiz')
    throw new Error('A aula 1 precisa preservar projeto, experimentação e quiz.')
  if ('content' in discovery && discovery.content.kind === 'interactive') {
    discovery.content.title = 'Criar e mostrar são a mesma coisa?'
    discovery.content.instructions =
      'Neste exemplo, crie um Dino nos bastidores. Observe a tela vazia. Depois ligue o desenho e compare.'
  }
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
    ...lessonOneCuts.clips.map((clip) => ({
      key: clip.key,
      plannedVideo: `Fonte: ${sourceFile}, ${clip.sourceSection}. Entrada: “${clip.entry}”. Saída: “${clip.exit}”. Montagem: ${clip.edit} Timecodes dependem da conferência do vídeo gravado.`,
    })),
    dialogue(
      'orientacao-iniciar-v7',
      'Em Áreas do projeto, coloque Ao iniciar no espaço de montar. Nesta etapa ele fica vazio. Confira seu projeto para continuar.',
    ),
    dialogue(
      'orientacao-tela-v7',
      'Dentro de Ao iniciar, prepare a tela de 480 × 270. Logo abaixo, coloque Mostrar a borda da tela, com espessura 4. Escolha uma borda que apareça sobre o céu.',
    ),
    dialogue(
      'orientacao-descricao-v7',
      'Dentro de Ao iniciar, encaixe Descrever o jogo para leitor de tela. Escreva: Corra com o dino e pule os cactos apertando espaço',
    ),
    dialogue(
      'orientacao-dino-v7',
      'Em Jogo 2D, Kit dino, encaixe Criar dinossauro em Ao iniciar. Use nome dino, x 110, y 150 e tamanho 64. Você pode escolher a cor. Ele ainda não aparece nesta aula.',
    ),
    discovery,
    dialogue(
      'orientacao-descoberta-v7',
      'Esta é uma experiência separada do seu projeto. Vamos descobrir por que criar não basta para aparecer. No seu jogo, o desenho será montado na próxima aula.',
    ),
    dialogue(
      'orientacao-entrega-v7',
      'Confira a tela com borda, a descrição e o bloco que cria seu Dino. O Dino ainda invisível é o resultado esperado. Teste e envie seu projeto ao professor.',
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
    description: {
      id: 'descricao-v7',
      label: 'Descreva o objetivo e o controle do Corre Dino em Ao iniciar.',
      rule: {
        type: 'usesBlock',
        blockType: 'sz_g2d_set_stage_description',
        area: 'start',
        fields: { DESCRIPTION: 'Corra com o dino e pule os cactos apertando espaço' },
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
      blockIds: projectChecks ? [] : blockKeys.filter((key) => !key.startsWith('orientacao-')),
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
      'tela-v7',
      'Prepare a tela e veja seus limites',
      'application',
      'Preparar o palco de 480 × 270 e tornar sua borda visível.',
      ['video-tela-v7', 'orientacao-tela-v7'],
      [checks.stage, checks.border],
    ),
    section(
      'descricao-demonstracao-v7',
      'Ouça o que a descrição informa',
      'demonstration',
      'Observar uma descrição sendo lida e reconhecer que ela informa objetivo e controles.',
      ['video-descricao-demo-v7'],
    ),
    section(
      'descricao-criar-v7',
      'Conte o que é o seu jogo',
      'application',
      'Configurar a descrição do Corre Dino no projeto.',
      ['video-descricao-criar-v7', 'orientacao-descricao-v7'],
      [checks.description],
    ),
    section(
      'coordenadas-demonstracao-v7',
      'Veja como funciona o endereço na tela',
      'demonstration',
      'Observar x crescendo para a direita e y crescendo para baixo, uma direção por vez.',
      ['video-coordenadas-demo-v7'],
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
      'Criar e mostrar são a mesma coisa?',
      'exploration',
      'No exemplo, observar o mesmo Dino criado sem aparecer e depois desenhado na tela.',
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
    ...new Set([...(source.retireBlockKeys ?? []), ...source.blocks.map((block) => block.key)]),
  ].filter((key) => !retained.has(key))
  return manifest
}
