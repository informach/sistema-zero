/** Fonte editorial completa. Os derivados são gerados; nenhuma aula é publicada por este arquivo. */
import { readFileSync } from 'node:fs'
import type { ConstrutorAula, ConstrutorTrecho } from './construtor-base-tipos'

const labs = JSON.parse(
  readFileSync(new URL('./construtor-2d-experiencias.json', import.meta.url), 'utf8'),
)
type Gesture = [text: string, gesture: string]
const human = (text: string) =>
  text
    .split(/(#[0-9a-f]{3,8}\b)/gi)
    .map((part) =>
      part.startsWith('#')
        ? part
        : part
            .replace(/([a-záàâãéêíóôõúç])(\d)/gi, '$1 $2')
            .replace(/([a-záàâãéêíóôõúç]),(?=[^\s])/gi, '$1, '),
    )
    .join('')
const A = (text: string, gesture: string): Gesture => [human(text), gesture]
const plain = (text: string) =>
  human(
    text
      .replace(/\[[^\]]+\]/g, '')
      .replace(/\s+/g, ' ')
      .trim(),
  )
const spoken = (parts: string[]) => parts.filter(Boolean).map(human).join(' ')
const direction = (items: Gesture[]) =>
  items.map(([text, gesture]) => `No "${plain(text)}", ${gesture}.`).join(' ')
const next = 'Quando terminar, clique em Próxima parte.'
const locate = (area: string) =>
  `Encontre a área ${area}. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.`
const exactCheck =
  'Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.'
const reviewBlocks: Record<string, string[]> = {
  'aparencia-inicial': ['Criar sprite nave', 'Pôr o cenário'],
  movimento: ['Mover o sprite nave com as setas'],
  limite: ['Mover o sprite nave com as setas', 'Manter o sprite nave'],
  instrucoes: ['Escrever'],
  'evento-tiro': ['Quando apertar a tecla barra de espaço'],
  'grupo-tiros': [
    'Criar grupo de sprites tiros',
    'No grupo tiros criar um sprite',
    'Desenhar o grupo tiros',
  ],
  'origem-tiro': ['No grupo tiros criar um sprite'],
  'voo-tiros': ['No grupo tiros criar um sprite', 'Mover os sprites do grupo tiros'],
  'limpeza-tiros': ['Tirar do grupo tiros'],
  'relogio-asteroides': ['Criar grupo de sprites asteroides', 'A cada 1.5 segundos'],
  asteroides: [
    'No grupo asteroides criar um sprite',
    'Mover os sprites do grupo asteroides',
    'Desenhar o grupo asteroides',
  ],
  'limpeza-asteroides': ['Tirar do grupo asteroides'],
  'colisao-tiros': ['Para cada colisão entre os grupos'],
  'efeitos-acerto': ['Para cada colisão entre os grupos'],
  placar: ['Criar variável pontos', 'Mostrar placar Acertos:'],
  pontos: ['Somar 1 em variável pontos'],
  vidas: ['Dar ao sprite nave', 'Desenhar as vidas do sprite nave'],
  'colisao-nave': ['Para cada sprite do grupo asteroides'],
  dano: ['Machucar o sprite nave'],
  'inicio-conferido': [
    'A cada quadro do jogo',
    'Quando apertar a tecla barra de espaço',
    'A cada 1.5 segundos',
  ],
  aparencias: ['No grupo tiros criar um sprite', 'No grupo asteroides criar um sprite'],
  meta: ['Criar variável meta', 'Mostrar placar Meta:', 'Barra de'],
  vitoria: ['Se valor da variável pontos'],
  derrota: ['Se as vidas do sprite nave'],
  final: ['Se as vidas do sprite nave', 'Quando apertar a tecla Enter'],
}

function experiment(
  key: string,
  title: string,
  lab: string,
  paragraphs: string[],
  invitation: string,
  question?: string,
): ConstrutorTrecho {
  const questionParts = question
    ? [
        `[curious] ${question}`,
        '[engaging, energetic, conversational voice] Antes de testar, pense na sua resposta e diga em voz alta. Depois, a experiência mostra se você acertou.',
      ]
    : []
  return {
    key,
    title,
    kind: 'experience',
    objective: invitation,
    ponte: `Sua vez! ${invitation} O Zappy te mostra o que testar, e você pode repetir quando quiser. ${next}`,
    text: spoken([
      ...paragraphs.map((text) => `[engaging, energetic, conversational voice] ${text}`),
      ...questionParts,
      `[upbeat, encouraging voice] Agora você vai explorar essa ideia na experiência. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. ${next}`,
    ]),
    screen: `A cena fica parada enquanto a edição ilustra a comparação narrada, sem mostrar controles nem resolver descobertas. No "Agora você vai explorar essa ideia na experiência", ampliar a experiência [ampliar experiência]. No "O Zappy vai te mostrando", apontar a fala do Zappy [apontar zappy]. No "Quando terminar", voltar ao tamanho da aula [voltar à aula]. No "clique em Próxima parte", avançar [próxima parte].`,
    ...(question ? { kids: [question] } : {}),
    experience: {
      ...structuredClone(labs[lab]),
      title,
      instructions: `${invitation} O Zappy te mostra o que testar, e você pode repetir quando quiser.`,
    },
    steps: [
      invitation,
      'Observe as descobertas com o Zappy. Você pode repetir os testes e comparar o que acontece.',
    ],
    tests: [],
    blockLabels: [],
    blockTypes: [],
  }
}

function practice(input: {
  key: string
  title: string
  etapa: string
  intro: Gesture[]
  actions: Gesture[]
  tests: Gesture[]
  correction: string
  labels: string[]
  types: string[]
  visible?: boolean
  delivery?: boolean
  conquest?: string
  exit?: 'Concluir aula' | 'Próxima parte'
  entryMayPass?: string
}): ConstrutorTrecho {
  const exit = input.exit ?? (input.delivery ? 'Concluir aula' : 'Próxima parte')
  const correction =
    input.visible === false
      ? `Confira se ficou assim: ${input.correction}.`
      : `Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: ${input.correction}. Depois de corrigir, teste de novo.`
  const ending = input.delivery
    ? `[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. [pleased, lively voice] ${input.conquest ?? 'Você concluiu esta parte do seu jogo!'} [engaging, energetic, conversational voice] Quando aparecer Projeto enviado!, clique em ${exit}.`
    : `[engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em ${exit}.`
  const entryMayPass =
    input.entryMayPass ??
    (input.etapa === 'aparencia-inicial'
      ? 'Escolher outra aparência é opcional. A entrada já tem nave e cenário válidos; conservar a combinação de que a criança gostou também cumpre a proposta.'
      : input.etapa === 'inicio-conferido'
        ? 'Esta parte retoma e testa as guardas que já foram aplicadas no movimento, no evento e no relógio. Não pede a construção das telas nem de uma nova regra.'
        : input.etapa === 'aparencias'
          ? 'A personalização é opcional e muda somente imagens. Os critérios preservam o funcionamento e não exigem uma imagem diferente da entrada.'
          : input.delivery && input.etapa !== 'instrucoes'
            ? 'A entrega reúne os testes da conquista já construída nas partes anteriores. A criança confere o jogo e envia a própria versão; não há uma nova regra artificial para destravar o envio.'
            : undefined)
  const review = (reviewBlocks[input.etapa] ?? ['Ao iniciar']).map((name) => `"${name}"`).join(', ')
  return {
    key: input.key,
    title: input.title,
    kind: input.delivery ? 'delivery' : 'build',
    etapa: input.etapa,
    objective: input.title,
    ponte: `${input.delivery ? 'Hora de conferir e enviar!' : 'Sua vez!'} ${input.title}. Teste no seu jogo e clique em Verificar projeto.${input.delivery ? ' Depois, envie o projeto e confirme em Enviar.' : ''} Quando aparecer ${input.delivery ? 'Projeto enviado!' : 'Objetivo cumprido!'}, clique em ${exit}.`,
    text: spoken([
      ...input.intro.map(([text]) => `[engaging, energetic, conversational voice] ${text}`),
      ...input.actions.map(([text]) => `[confident, clear, unhurried voice] ${text} [short pause]`),
      ...input.tests.map(([text]) => `[upbeat, encouraging voice] ${text}`),
      `[reassuring, encouraging voice] ${correction}`,
      `[engaging, energetic, conversational voice] ${input.visible === false ? 'Agora clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.' : exactCheck}`,
      ending,
    ]),
    screen: `A parte começa com o Estúdio expandido [expandir estúdio]. ${direction([...input.intro, ...input.actions, ...input.tests])} No "confira se ficou assim", mostrar os blocos usados nesta parte [mostrar blocos ${review}]. No "clique em Verificar projeto", verificar [verificar projeto]. ${input.delivery ? 'No "clique em Enviar meu projeto", iniciar o envio e confirmar [enviar projeto]. ' : ''}No "Quando aparecer ${input.delivery ? 'Projeto enviado!' : 'Objetivo cumprido!'}", voltar ao tamanho da aula [reduzir estúdio]. No "clique em ${exit}", sair da parte [${exit === 'Concluir aula' ? 'concluir aula' : 'próxima parte'}].`,
    steps: input.actions.map(([text]) => text),
    tests: input.tests.map(([text]) => text),
    blockLabels: input.labels.map(human),
    blockTypes: input.types,
    ...(entryMayPass ? { entryMayPass } : {}),
  }
}

function quiz(
  key: string,
  title: string,
  items: { id: string; prompt: string; options: string[]; correct: number; explanation: string }[],
): ConstrutorTrecho {
  return {
    key,
    title,
    kind: 'quiz',
    text: '',
    screen: '',
    ponte:
      'Confira o que ficou claro no seu jogo. Escolha uma resposta em cada pergunta e veja a explicação. Você pode corrigir e tentar de novo. Quando terminar, clique em Próxima parte.',
    quiz: {
      kind: 'quiz',
      passingScore: 100,
      questions: items.map((q) => ({
        id: q.id,
        prompt: human(q.prompt),
        choices: q.options.map((label, index) => ({
          id: `${q.id}-${index + 1}`,
          label: human(label),
        })),
        correctChoiceIds: [`${q.id}-${q.correct + 1}`],
        explanation: human(q.explanation),
      })),
    },
    steps: [],
    tests: [],
    blockLabels: [],
    blockTypes: [],
  }
}

const aula1: ConstrutorAula = {
  slug: 'primeira-nave',
  title: 'Prepare o voo da sua nave',
  entryStage: 'inicial',
  entry:
    'Cenário, nave, desenho, telas e fluxo de Enter preparados; ainda sem movimento, tiros, asteroides, pontos ou vidas.',
  outcome:
    'Nave e cenário escolhidos; movimento lateral funciona somente durante a partida, para ao soltar e respeita as bordas; legenda dos controles visível.',
  trechos: [
    {
      key: 'abertura',
      title: 'Jogue antes de construir',
      kind: 'intro',
      ponte:
        'Sua vez! Comece com Enter, mova a nave com as setas e toque em Espaço para disparar. Jogue o quanto quiser. Quando terminar, clique em Próxima parte.',
      text: spoken([
        '[upbeat, welcoming voice] Oi! Você vai construir Nave Contra Asteroides. Sua nave precisa abrir uma rota pelo espaço, acertando os asteroides que vêm pela frente.',
        '[curious] E qual é a missão da nave?',
        '[engaging, energetic, conversational voice] Acertar vinte asteroides antes de perder suas três vidas. Uma pedra que passa sem bater na nave não tira vida. Cada acerto vale um ponto.',
        '[interested, animated voice] Olha aqui: eu clico no jogo e pressiono Enter para começar. Segurando a seta da direita, eu levo a nave para a direita. Ao soltar, ela para. Agora eu toco uma vez em Espaço, e sai um laser.',
        '[engaging, energetic, conversational voice] Depois da vitória ou da derrota, Enter volta ao começo. Com outro Enter, você começa uma nova partida.',
        '[upbeat, encouraging voice] Agora é a sua vez de conhecer a rota. Clique no jogo, pressione Enter e experimente mover e disparar. Jogue o quanto quiser. Quando terminar, clique em Próxima parte.',
      ]),
      screen:
        'A edição apresenta o título e o objetivo sem resolver a partida. No "Olha aqui", ampliar o jogo [ampliar jogo]. No "eu clico no jogo e pressiono Enter", iniciar [tocar jogo] [tecla Enter]. No "Segurando a seta da direita", mover brevemente [segurar tecla ArrowRight por 0,4 s]. No "Ao soltar", manter a nave parada após a soltura automática do gesto anterior. No "eu toco uma vez em Espaço", disparar uma vez [tecla Space]. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "clique em Próxima parte", avançar [próxima parte].',
      kids: ['E qual é a missão da nave?'],
      steps: [
        'Clique no jogo e pressione Enter.',
        'Segure as setas esquerda e direita para mover; solte para parar.',
        'Toque em Espaço para disparar. Cada novo toque cria um laser.',
        'Depois do resultado, Enter volta ao início; outro Enter começa novamente.',
      ],
      tests: ['Experimente a versão completa. A participação basta para seguir.'],
      blockLabels: [],
      blockTypes: [],
    },
    {
      key: 'seu-caderno-do-aluno',
      title: 'Seu passo a passo do projeto',
      kind: 'material',
      ponte:
        'Este é o seu Passo a passo do projeto! Você pode consultar aqui ou baixar para guardar. Quando quiser continuar, clique em Próxima parte.',
      text: spoken([
        '[engaging, energetic, conversational voice] Olha aqui: este é o seu Passo a passo do projeto! Ele acompanha a construção da nave, com os blocos, os encaixes e os testes de cada parte. A galeria também mostra as imagens que você pode escolher.',
        '[upbeat, encouraging voice] Se esquecer um passo, você pode voltar aqui e consultar. Se quiser, leia na própria aula. E, se preferir, clique em Baixar para guardar o material e consultar onde quiser.',
        '[engaging, energetic, conversational voice] Os links do Como fazer ajudam com a plataforma. Para uma dúvida sobre o seu jogo, você também encontra Preciso de ajuda no fim da aula.',
        '[confident, clear, unhurried voice] Agora clique em Próxima parte.',
      ]),
      screen:
        'No "Olha aqui", apontar o livro [apontar livro]. No "os blocos, os encaixes e os testes", ampliar e folhear exemplos de montagem [livro tela cheia] [livro próxima]. No "A galeria", mostrar a página das doze opções [livro próxima]. No "Se quiser", sair da tela cheia [livro sair da tela cheia]. No "clique em Baixar", baixar [baixar]. No "Os links do Como fazer", apontar o link de ajuda [apontar "Como usar o Estúdio"]. No "Preciso de ajuda", apontar o rótulo sem enviar mensagem [apontar "Preciso de ajuda"]. No "Agora clique em Próxima parte", avançar [próxima parte].',
      steps: [
        'Consulte o Passo a passo do projeto quando precisar de um encaixe ou de um teste.',
        'Se quiser guardar o PDF, clique em Baixar.',
        'Os links do Como fazer ajudam a usar a plataforma; Preciso de ajuda permite pedir orientação sobre o jogo.',
      ],
      tests: [],
      blockLabels: [],
      blockTypes: [],
    },
    practice({
      key: 'escolher-nave',
      title: 'Escolha a nave e o cenário',
      etapa: 'aparencia-inicial',
      intro: [
        A(
          'Agora escolha a aparência da sua nave e do espaço. As imagens ficam na biblioteca do projeto, e você pode combinar as opções do seu jeito.',
          '[apontar prévia]',
        ),
      ],
      actions: [
        A(locate('Ao iniciar'), '[arrastar até "Ao iniciar"]'),
        A(
          'Procure o bloco que cria o sprite chamado nave. Deixe esse bloco à vista.',
          '[apontar bloco "Criar sprite"]',
        ),
        A(
          'Clique no campo da imagem, onde aparece um nome como nave-falcao-azul. Escolha a nave que você quiser entre as três imagens de nave.',
          '[abrir campo "nave-falcao-azul" em "Criar sprite nave"] [escolher "nave-exploradora-coral" em "Criar sprite nave"]',
        ),
        A(
          'Conserve a largura em56, a altura em64 e os outros números. Assim, a troca muda o desenho e mantém o espaço ocupado pela nave.',
          '[apontar bloco "Criar sprite nave"]',
        ),
        A(
          'Ainda em Ao iniciar, procure Pôr o cenário atrás de tudo.',
          '[apontar bloco "Pôr o cenário"]',
        ),
        A(
          'Clique na imagem do cenário, como cenario-aurora, e escolha o espaço que quiser. Você pode trocar só uma imagem, as duas ou manter as que gostou.',
          '[abrir campo "cenario-aurora" em "Pôr o cenário"] [escolher "cenario-orbita" em "Pôr o cenário"]',
        ),
      ],
      tests: [
        A(
          'Clique no jogo e pressione Enter. A abertura dá lugar ao espaço, com a nave que você escolheu. Ela ainda fica parada, porque o movimento será sua próxima construção.',
          '[tocar prévia 400 300] [tecla Enter] [apontar prévia]',
        ),
      ],
      correction:
        'o sprite continua chamado nave, sua caixa continua56 por64 e o bloco do cenário continua em Ao iniciar',
      labels: ['Criar sprite nave com imagem', 'Pôr o cenário atrás de tudo'],
      types: ['sz_g2d_create_image_sprite', 'sz_g2d_set_backdrop'],
    }),
    experiment(
      'seta-e-velocidade',
      'A nave em câmera lenta',
      'movimento',
      [
        'A sua nave vai se mover de um lado para o outro. Para enxergar como esse voo acontece, pense num desenho animado: uma imagem muda um pouquinho em relação à anterior, e as imagens passam uma depois da outra.',
        'Cada imagem é um quadro. No jogo, o movimento também acontece em pequenos passos, um em cada quadro. A seta que você segura indica o lado para o qual a nave deve ir.',
      ],
      'Observe os passinhos da nave com a seta pressionada e solta.',
      'E quando eu solto a seta?',
    ),
    practice({
      key: 'setas',
      title: 'Faça a nave responder às setas',
      etapa: 'movimento',
      intro: [
        A(
          'Clique no jogo, pressione Enter e segure uma seta. A nave continua parada, porque ainda falta dizer como ela se move.',
          '[tocar prévia 400 300] [tecla Enter] [segurar tecla ArrowRight por 0,3 s] ',
        ),
        A(
          'Lembra da experiência da parte anterior? O voo acontece em passinhos a cada quadro. Agora coloque esse movimento dentro da partida.',
          '[apontar bloco "A cada quadro do jogo"]',
        ),
      ],
      actions: [
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Dentro de A cada quadro do jogo, encontre o Se com a pergunta o estado do jogo é jogando. Deixe à vista o espaço vazio do então.',
          '[apontar encaixe em "Se o estado do jogo é jogando" no "então"]',
        ),
        A(
          'Abra Jogo2D, depois Movimento e depois Movimentos prontos.',
          '[abrir categoria Jogo 2D > Movimento > Movimentos prontos]',
        ),
        A(
          'Pegue Mover o sprite nave com as setas esquerda e direita e solte dentro do então desse Se.',
          '[encaixar "Mover o sprite nave com as setas" em "Se o estado do jogo é jogando" no "então"]',
        ),
        A(
          'O nome já é nave. No campo velocidade, troque6 por5.',
          '[trocar "6" por "5" em "Mover o sprite nave com as setas"]',
        ),
        A(
          'Pense na placa de aberto ou fechado de uma loja. O jogo também tem uma placa, chamada estado: na abertura ela diz início, depois do Enter ela vira jogando e, no fim, vitória ou derrota. Esse Se olha a placa e só deixa a nave andar quando ela diz jogando. É por isso que, na abertura, a nave fica quietinha.',
          '[apontar bloco "o estado do jogo é"]',
        ),
      ],
      tests: [
        A(
          'Clique no jogo e pressione Enter se a abertura estiver aparecendo. Segure a seta da direita por um instante, solte e faça o mesmo com a esquerda. A nave acompanha as setas e para quando você solta.',
          '[tocar prévia 400 300] [tecla Enter] [segurar tecla ArrowRight por 0,4 s]  [segurar tecla ArrowLeft por 0,4 s] ',
        ),
      ],
      correction:
        'o movimento está dentro do então de Se jogando, o sprite é nave e a velocidade é5',
      labels: ['Mover o sprite nave com as setas ← → (velocidade5)'],
      types: ['sz_g2d_arrows_x'],
    }),
    experiment(
      'limite-da-tela',
      'A beirada da tela',
      'borda',
      [
        'A nave precisa continuar visível para você conseguir pilotar. Pense numa janela: ela mostra só uma parte do que existe do lado de fora.',
        'A tela do jogo também tem beiradas. O passinho pode levar a nave além dessa janela. O limite confere onde ela ficou e mantém sua caixa dentro da área de jogo.',
      ],
      'Compare a nave perto da beirada com o limite ligado e desligado.',
      'Se eu continuar segurando a seta, a nave pode desaparecer?',
    ),
    practice({
      key: 'borda',
      title: 'Mantenha a nave na tela',
      etapa: 'limite',
      intro: [
        A(
          'Comece a partida e segure uma seta até chegar à beirada. A nave pode sair da área visível porque seu movimento ainda não tem limite.',
          '[tocar prévia 400 300] [tecla Enter] [segurar tecla ArrowLeft por 1,5 s] ',
        ),
        A(
          'Na experiência da parte anterior, o limite conferia a posição depois do passinho. Coloque essa conferência depois do movimento da sua nave.',
          '[apontar bloco "Mover o sprite"]',
        ),
      ],
      actions: [
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Encontre o movimento dentro de Se jogando e deixe o encaixe logo abaixo dele à vista.',
          '[apontar abaixo de "Mover o sprite nave com as setas"]',
        ),
        A(
          'Abra Jogo2D, depois Movimento e depois Bordas e rebatidas.',
          '[abrir categoria Jogo 2D > Movimento > Bordas e rebatidas]',
        ),
        A(
          'Pegue Manter o sprite dentro da tela e solte logo abaixo do movimento, ainda dentro do então.',
          '[encaixar "Manter o sprite" abaixo de "Mover o sprite nave com as setas"]',
        ),
        A(
          'O bloco chega com heroi. Clique nesse nome e escolha nave.',
          '[trocar "heroi" por "nave" em "Manter o sprite"]',
        ),
      ],
      tests: [
        A(
          'Clique no jogo e pressione Enter se estiver na abertura. Segure a seta da esquerda até a borda e depois a da direita. A nave deve permanecer inteira na tela, mesmo enquanto você segura a seta.',
          '[tocar prévia 400 300] [tecla Enter] [segurar tecla ArrowLeft por 2 s]  [segurar tecla ArrowRight por 3 s] ',
        ),
      ],
      correction:
        'o movimento vem antes do limite, os dois usam nave e os dois estão dentro de Se jogando',
      labels: ['Manter o sprite nave dentro da tela'],
      types: ['sz_g2d_clamp_to_screen'],
    }),
    practice({
      key: 'entrega',
      title: 'Mostre os controles e envie',
      etapa: 'instrucoes',
      intro: [
        A(
          'Sua nave já responde às setas e fica dentro da tela. Agora deixe uma legenda dos controles para quem for jogar.',
          '[apontar prévia]',
        ),
      ],
      actions: [
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Dentro de A cada quadro do jogo, encontre Desenhar o sprite nave. Deixe o encaixe logo abaixo dele à vista, antes das perguntas que desenham as telas.',
          '[apontar abaixo de "Desenhar o sprite nave"]',
        ),
        A(
          'Abra Jogo2D, depois Vida e placar e depois Indicadores e texto na tela. Pegue Escrever e encaixe nesse lugar.',
          '[abrir categoria Jogo 2D > Vida e placar > Indicadores e texto na tela] [encaixar "Escrever" abaixo de "Desenhar o sprite nave"]',
        ),
        A(
          'No campo do texto, troque Nave contra Asteroides por esta legenda: SETAS: mover   ESPAÇO: disparar. Deixe uns espaços entre os dois controles.',
          '[trocar "Nave contra Asteroides" por "SETAS: mover   ESPAÇO: disparar" em "Escrever"]',
        ),
        A(
          'Coloque400 no x,60 no y e15 no tamanho, e escolha o alinhamento no centro. Assim a legenda fica no alto da tela, longe da nave: 400 é o meio da largura.',
          '[trocar "12" por "400" em "Escrever"] [trocar "30" por "60" em "Escrever"] [trocar "20" por "15" em "Escrever"] [trocar "à esquerda" por "no centro" em "Escrever"]',
        ),
      ],
      tests: [
        A(
          'Comece a partida e teste as duas setas até as bordas. Confira também a legenda. O disparo ainda será construído na próxima aula; agora, o movimento já funciona.',
          '[tocar prévia 400 300] [tecla Enter] [segurar tecla ArrowLeft por 2 s]  [segurar tecla ArrowRight por 3 s]  [apontar prévia 400 60]',
        ),
      ],
      correction:
        'a nave se move, o limite vem depois do movimento e a legenda está no desenho de cada quadro',
      labels: ['Escrever texto em x/y'],
      types: ['sz_g2d_draw_label', 'sz_val_text'],
      delivery: true,
      conquest: 'Você programou o voo lateral e manteve a nave dentro da rota!',
    }),
  ],
}

const aula2: ConstrutorAula = {
  slug: 'dia-1',
  title: 'Faça o laser nascer na nave',
  entryStage: 'instrucoes',
  entry: 'Nave com movimento lateral, limite e legenda; sem evento de Espaço nem grupo tiros.',
  outcome:
    'Um laser parado por toque em Espaço, criado na posição atual da nave; o voo será construído na aula seguinte.',
  trechos: [
    experiment(
      'tecla-e-repeticao',
      'Quando sai o tiro?',
      'evento',
      [
        'Você vai escolher o momento em que o laser sai da nave. Pense numa campainha: cada toque é um acontecimento ao qual ela pode responder.',
        'No jogo, tocar na tecla Espaço também é um acontecimento. Isso é diferente de repetir algo em todos os quadros enquanto o jogo está rodando.',
      ],
      'Compare o disparo ligado à tecla com a criação repetida em todo quadro.',
      'Esperar já faz sair um tiro?',
    ),
    practice({
      key: 'criar-tiro',
      title: 'Faça Espaço responder',
      etapa: 'evento-tiro',
      intro: [
        A(
          'Comece seu jogo e toque em Espaço. Ainda não há uma resposta ligada a essa tecla. Na experiência da parte anterior, o acontecimento indicava o momento da resposta; agora você vai ligar um som ao Espaço.',
          '[tocar prévia 400 300] [tecla Enter] [tecla Space]',
        ),
      ],
      actions: [
        A(locate('Quando acontecer'), '[arrastar até "Quando acontecer"]'),
        A(
          'Deixe à vista o encaixe depois do evento de Enter, fora do fazer dele. O novo evento vai ser um vizinho do Enter.',
          '[apontar abaixo de "Quando apertar a tecla Enter"]',
        ),
        A(
          'Abra Jogo2D, depois Controles e depois Teclado, ações e toque. Pegue Quando apertar a tecla e encaixe no lugar separado que você deixou à vista.',
          '[abrir categoria Jogo 2D > Controles > Teclado, ações e toque] [encaixar "Quando apertar a tecla" abaixo de "Quando apertar a tecla Enter"]',
        ),
        A(
          'Clique no campo da tecla e escolha barra de espaço.',
          '[trocar "→ seta direita" por "barra de espaço" em "Quando apertar a tecla → seta direita"]',
        ),
        A(
          'Deixe à vista o espaço fazer do evento de Espaço. Abra Programação e depois Lógica e Se. Pegue Se e solte dentro desse fazer.',
          '[apontar encaixe em "Quando apertar a tecla barra de espaço"] [abrir categoria Programação > Lógica & Se] [encaixar "Se" em "Quando apertar a tecla barra de espaço"]',
        ),
        A(
          'Retire a pergunta x maior que zero que nasceu no Se e leve só essa pergunta para a lixeira.',
          '[jogar na lixeira ">" em "Se dentro de Quando apertar a tecla barra de espaço"]',
        ),
        A(
          'Com o lugar da pergunta à vista, abra Jogo2D, depois Jogo e telas e depois Telas e partida. Pegue o estado do jogo é e encaixe no lugar vazio.',
          '[abrir categoria Jogo 2D > Jogo e telas > Telas e partida] [encaixar "o estado do jogo é" em "Se dentro de Quando apertar a tecla barra de espaço" no "Se"]',
        ),
        A(
          'No nome do estado, escolha jogando. Esse é o mesmo cuidado usado no movimento.',
          '[trocar "inicio" por "jogando" em "o estado do jogo é dentro de Quando apertar a tecla barra de espaço"]',
        ),
        A(
          'Deixe à vista o então desse Se. Abra Jogo2D, depois Som e depois Efeitos prontos. Encaixe Tocar efeito dentro do então e escolha tiro grande.',
          '[apontar encaixe em "Se o estado do jogo é jogando dentro de Quando apertar a tecla barra de espaço" no "então"] [abrir categoria Jogo 2D > Som > Efeitos prontos] [encaixar "Tocar efeito" em "Se o estado do jogo é jogando dentro de Quando apertar a tecla barra de espaço" no "então"] [trocar "moeda" por "tiro grande" em "Tocar efeito dentro de Quando apertar a tecla barra de espaço"]',
        ),
      ],
      tests: [
        A(
          'Clique em Rodar de novo. Na abertura, toque em Espaço e escute. Depois, pressione Enter e toque em Espaço novamente. O som do tiro deve responder durante a partida. Deixe o som do aparelho ligado para ouvir.',
          '[rodar de novo] [tocar prévia 400 300] [tecla Space] aguardar 1 segundo na gravação, sem novo comando [tecla Enter] [tecla Space] aguardar 1 segundo na gravação, sem novo comando',
        ),
      ],
      correction:
        'o evento usa barra de espaço, sua pergunta é jogando e o efeito tiro grande fica no então',
      labels: [
        'Quando apertar a tecla barra de espaço',
        'Se o estado do jogo é jogando',
        'Tocar efeito tiro grande',
      ],
      types: ['sz_g2d_on_key', 'sz_js_if_else', 'sz_g2d_scene_is', 'sz_g2d_play_fx'],
    }),
    experiment(
      'objetos-no-grupo',
      'Objetos que entram e saem',
      'grupos',
      [
        'Cada disparo cria um laser novo. O jogo precisa acompanhar todos eles, mesmo quando há vários ao mesmo tempo. Pense numa caixa com seus carrinhos: cada carrinho é uma coisa, e a caixa reúne a turma toda.',
        'No seu jogo, um grupo reúne os lasers que ainda participam da partida. A tela mostra só a parte do espaço que você consegue ver. Estar fora dessa janela e deixar de participar do grupo são coisas diferentes.',
      ],
      'Compare o que aparece na tela com os objetos que continuam guardados no grupo.',
      'Se eu não vejo mais o laser, ele já saiu do grupo?',
    ),
    practice({
      key: 'grupo-tiros',
      title: 'Crie e mostre os lasers',
      etapa: 'grupo-tiros',
      intro: [
        A(
          'Seu Espaço já toca o som, mas ainda falta um laser para aparecer. A experiência mostrou um grupo acompanhando os objetos da partida. Agora crie o grupo tiros, coloque cada novo laser nele e desenhe esse grupo.',
          '[tocar prévia 400 300] [tecla Enter] [tecla Space]',
        ),
      ],
      actions: [
        A(locate('Ao iniciar'), '[arrastar até "Ao iniciar"]'),
        A(
          'Deixe à vista o encaixe depois de Criar sprite painelMensagem e antes de Mudar o estado do jogo para inicio. Abra Jogo2D, depois Grupos e depois Criar e percorrer.',
          '[apontar abaixo de "Criar sprite painelMensagem"] [abrir categoria Jogo 2D > Grupos > Criar e percorrer]',
        ),
        A(
          'Pegue Criar grupo de sprites e encaixe ali. No nome que chega como asteroides, escreva tiros.',
          '[encaixar "Criar grupo de sprites" abaixo de "Criar sprite painelMensagem"] [trocar "asteroides" por "tiros" em "Criar grupo de sprites"]',
        ),
        A(locate('Quando acontecer'), '[arrastar até "Quando acontecer"]'),
        A(
          'No evento de Espaço, encontre o então de Se jogando e deixe o encaixe antes do som à vista.',
          '[apontar encaixe em "Se o estado do jogo é jogando dentro de Quando apertar a tecla barra de espaço" no "então"]',
        ),
        A(
          'Em Jogo2D, Grupos, Criar e percorrer, pegue No grupo criar um sprite com imagem. Solte antes do som, dentro do mesmo então.',
          '[abrir categoria Jogo 2D > Grupos > Criar e percorrer] [encaixar "No grupo inimigos criar um sprite" em "Se o estado do jogo é jogando dentro de Quando apertar a tecla barra de espaço" no "então"]',
        ),
        A(
          'O grupo chega como inimigos. Clique nele e escolha tiros. Deixe vazio o nome opcional depois de chamado.',
          '[trocar "inimigos" por "tiros" em "No grupo inimigos criar um sprite"] [apontar bloco "No grupo tiros criar um sprite"]',
        ),
        A(
          'Coloque395 no x e372 no y. Esses números vão deixar o primeiro laser na frente da posição inicial da nave.',
          '[trocar "100" por "395" em "No grupo tiros criar um sprite"] [trocar "100" por "372" em "No grupo tiros criar um sprite"]',
        ),
        A(
          'Coloque10 na largura e28 na altura. No campo da imagem, escolha laser-ciano. Deixe vx e vy em zero por enquanto.',
          '[trocar "32" por "10" em "No grupo tiros criar um sprite"] [trocar "32" por "28" em "No grupo tiros criar um sprite"] [trocar "inimigo" por "laser-ciano" em "No grupo tiros criar um sprite"]',
        ),
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Dentro de A cada quadro do jogo, deixe à vista o encaixe depois de Limpar a tela e antes de Desenhar o sprite nave. Esse lugar fica fora do Se jogando.',
          '[apontar abaixo de "Limpar a tela"]',
        ),
        A(
          'Abra Jogo2D, depois Grupos e depois Desenho e ordem. Pegue Desenhar o grupo, encaixe nesse lugar e troque asteroides por tiros.',
          '[abrir categoria Jogo 2D > Grupos > Desenho e ordem] [encaixar "Desenhar o grupo" abaixo de "Limpar a tela"] [trocar "asteroides" por "tiros" em "Desenhar o grupo"]',
        ),
      ],
      tests: [
        A(
          'Comece a partida e toque em Espaço. Um laser aparece na frente da posição inicial da nave, ainda parado. Mova a nave e dispare de novo: por enquanto, o laser continua nascendo no mesmo lugar.',
          '[tocar prévia 400 300] [tecla Enter] [tecla Space] [segurar tecla ArrowRight por 0,4 s]  [tecla Space]',
        ),
      ],
      correction:
        'o grupo tiros é criado em Ao iniciar, a imagem nasce no grupo tiros dentro de Espaço e o grupo é desenhado depois da limpeza',
      labels: [
        'Criar grupo de sprites tiros',
        'No grupo tiros criar um sprite com imagem',
        'Desenhar o grupo tiros',
      ],
      types: ['sz_g2d_create_group', 'sz_g2d_spawn_image_in_group', 'sz_g2d_draw_group'],
    }),
    experiment(
      'escrito-e-lido',
      'Onde o laser nasce?',
      'origem',
      [
        'A nave muda de lugar, mas o laser precisa continuar saindo dela. Imagine fotografar onde alguém está: a foto mostra um momento; olhar de novo mostra a posição de agora.',
        'Um número escrito indica sempre o mesmo lugar. Ler a posição da nave permite usar o lugar em que ela está no momento de cada disparo. A caixa da nave tem um centro e uma beirada de cima que ajudam a encontrar a saída do laser.',
      ],
      'Compare a origem dos disparos quando o lugar é fixo e quando acompanha a nave.',
      'O laser vai acompanhar a nave se eu escrever só um número?',
    ),
    practice({
      key: 'tiro-da-nave',
      title: 'Faça o laser nascer na nave',
      etapa: 'origem-tiro',
      intro: [
        A(
          'Comece o jogo, leve a nave para o lado e dispare. O laser ainda nasce no lugar antigo porque x e y são números escritos. Na experiência da parte anterior, ler a nave fazia a origem acompanhar sua posição. Agora troque esses dois números por leituras.',
          '[tocar prévia 400 300] [tecla Enter] [segurar tecla ArrowRight por 0,4 s]  [tecla Space]',
        ),
      ],
      actions: [
        A(locate('Quando acontecer'), '[arrastar até "Quando acontecer"]'),
        A(
          'Encontre o bloco que cria o laser no evento de Espaço. Deixe o número395 do x à vista.',
          '[apontar bloco "No grupo tiros criar um sprite"]',
        ),
        A(
          'Abra Programação e depois Matemática. Pegue a conta com dois números e um sinal no meio e encaixe sobre395.',
          '[abrir categoria Programação > Matemática] [soltar "0 + 0" em cima do "395" em "No grupo tiros criar um sprite"]',
        ),
        A(
          'Clique no sinal da conta e escolha menos. Deixe os dois números em zero por enquanto.',
          '[trocar "+" por "−" em "0 + 0 dentro de No grupo tiros"]',
        ),
        A(
          'Deixe o zero da esquerda da conta à vista. Abra Jogo2D, depois Movimento e depois Posição e tamanho. Pegue o centro x do sprite e encaixe sobre esse primeiro zero.',
          '[apontar bloco "0 − 0 dentro de No grupo tiros"] [abrir categoria Jogo 2D > Movimento > Posição e tamanho] [soltar "o centro x do sprite" em cima do "0" em "0 − 0 dentro de No grupo tiros"]',
        ),
        A(
          'No nome do sprite desse valor, troque jogador por nave. No zero que ficou à direita da conta, coloque5. Como o laser tem dez de largura, tirar cinco coloca o centro dele no centro da nave.',
          '[trocar "jogador" por "nave" em "o centro x do sprite"] [trocar "0" por "5" em "o centro x do sprite nave − 0 dentro de No grupo tiros"]',
        ),
        A(
          'Agora deixe o número372 do y do laser à vista. Abra Programação e depois Matemática. Encaixe outra conta sobre esse número e escolha menos.',
          '[apontar bloco "No grupo tiros criar um sprite"] [abrir categoria Programação > Matemática] [soltar "0 + 0" em cima do "372" em "No grupo tiros criar um sprite"] [trocar "+" por "−" em "0 + 0 dentro de No grupo tiros"]',
        ),
        A(
          'No zero da esquerda, encaixe a posição y do sprite, em Jogo2D, Movimento, Posição e tamanho. Troque jogador por nave. No zero que ficou à direita da conta, coloque24.',
          '[abrir categoria Jogo 2D > Movimento > Posição e tamanho] [soltar "a posição y do sprite" em cima do "0" em "0 − 0 dentro de No grupo tiros"] [trocar "jogador" por "nave" em "a posição y do sprite"] [trocar "0" por "24" em "a posição y do sprite nave − 0 dentro de No grupo tiros"]',
        ),
        A(
          'A posição y menos24 deixa a maior parte do laser acima da nave. Conserve largura10, altura28 e as velocidades zero nesta parte.',
          '[apontar bloco "No grupo tiros criar um sprite"]',
        ),
      ],
      tests: [
        A(
          'Comece o jogo e dispare com a nave no centro, depois à esquerda e depois à direita. Cada novo laser nasce na frente da nave. Eles ainda ficam parados, porque o voo será a próxima construção.',
          '[tocar prévia 400 300] [tecla Enter] [tecla Space] [segurar tecla ArrowLeft por 0,5 s]  [tecla Space] [segurar tecla ArrowRight por 1 s]  [tecla Space]',
        ),
      ],
      correction:
        'o x lê centro x da nave menos5, o y lê posição y da nave menos24 e as duas contas estão dentro da criação do laser',
      labels: ['centro x do sprite nave', 'posição y do sprite nave', 'conta de subtração'],
      types: ['sz_g2d_center_x', 'sz_g2d_sprite_y', 'sz_math_arithmetic'],
    }),
    practice({
      key: 'entrega',
      title: 'Confira e envie a origem dos lasers',
      etapa: 'origem-tiro',
      intro: [
        A(
          'Seu disparo já responde ao Espaço e acompanha o lugar da nave. Agora confira onde cada novo laser nasce antes de enviar.',
          '[apontar prévia]',
        ),
      ],
      actions: [A('Clique em Rodar de novo para começar o teste na abertura.', '[rodar de novo]')],
      tests: [
        A(
          'Antes de Enter, toque em Espaço. Nenhum laser deve aparecer. Pressione Enter e dispare uma vez no centro.',
          '[tocar prévia 400 300] [tecla Space] [tecla Enter] [tecla Space]',
        ),
        A(
          'Leve a nave para a esquerda e dispare. Depois vá para a direita e dispare novamente. Cada novo laser deve nascer na frente da nave; os anteriores continuam onde nasceram.',
          '[segurar tecla ArrowLeft por 0,5 s] [tecla Space] [segurar tecla ArrowRight por 1 s] [tecla Space]',
        ),
        A(
          'Nesta versão, os lasers ainda ficam parados. Na próxima aula você vai construir o voo deles e a retirada quando saírem da tela.',
          '[apontar prévia]',
        ),
      ],
      correction:
        'Espaço tem a guarda jogando, a origem lê a nave, os lasers entram no grupo tiros e esse grupo é desenhado; vx e vy ainda estão em zero',
      labels: [],
      types: [],
      delivery: true,
      conquest: 'Você programou um disparo que nasce no lugar atual da sua nave!',
    }),
  ],
}

const aula3: ConstrutorAula = {
  slug: 'dia-2',
  title: 'Faça os lasers voar e sair do jogo',
  entryStage: 'origem-tiro',
  entry:
    'Cada toque em Espaço cria um laser na posição atual da nave; os lasers são desenhados, mas ainda ficam parados.',
  outcome:
    'Lasers sobem e são retirados quando saem da tela, preservando um disparo por toque e a origem na nave.',
  trechos: [
    experiment(
      'direcao-do-tiro',
      'Para que lado o laser anda?',
      'velocidade',
      [
        'Seu laser precisa seguir para cima. Num elevador, subir e descer são sentidos diferentes, mesmo quando o tamanho de cada passo é parecido.',
        'Na tela2D, o y cresce de cima para baixo. A velocidade vertical diz quanto esse y muda em cada passinho. O sinal do número participa dessa direção.',
      ],
      'Compare o sentido do laser com velocidades verticais positivas e negativas.',
      'Um número negativo deixa o laser mais fraco?',
    ),
    practice({
      key: 'tiros-voam',
      title: 'Faça os lasers voar',
      etapa: 'voo-tiros',
      intro: [
        A(
          'Comece o jogo e dispare. O laser aparece, mas continua parado. A experiência da parte anterior mostrou o sinal que faz o y diminuir. Agora dê essa velocidade aos lasers e faça o grupo se mover em cada quadro.',
          '[tocar prévia 400 300] [tecla Enter] [tecla Space]',
        ),
      ],
      actions: [
        A(locate('Quando acontecer'), '[arrastar até "Quando acontecer"]'),
        A(
          'No bloco que cria o laser, encontre o último número, logo depois de vy. Troque esse zero por menos7. Deixe vx em zero, porque o laser não deve andar para os lados.',
          'aproximar o fim de No grupo tiros criar um sprite; editar somente o zero depois do rótulo vy para -7 e confirmar, em captura manual deste campo [apontar bloco "No grupo tiros criar um sprite"]',
        ),
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Dentro de A cada quadro do jogo, encontre Se jogando e deixe o encaixe depois do limite da nave à vista.',
          '[apontar abaixo de "Manter o sprite nave"]',
        ),
        A(
          'Abra Jogo2D, depois Grupos e depois Movimento. Pegue Mover os sprites do grupo usando suas velocidades e encaixe nesse lugar.',
          '[abrir categoria Jogo 2D > Grupos > Movimento] [encaixar "Mover os sprites do grupo" abaixo de "Manter o sprite nave"]',
        ),
        A(
          'O grupo chega como asteroides. Clique nesse nome e escolha tiros.',
          '[trocar "asteroides" por "tiros" em "Mover os sprites do grupo"]',
        ),
      ],
      tests: [
        A(
          'Comece o jogo e toque em Espaço. O laser deve subir. Segure Espaço por um instante: esse toque cria um laser, sem uma rajada automática. Solte e toque novamente para criar outro.',
          '[tocar prévia 400 300] [tecla Enter] [segurar tecla Space por 0,6 s]  [tecla Space]',
        ),
      ],
      correction:
        'o laser tem vx zero e vy menos7, o movimento do grupo usa tiros e fica dentro de Se jogando',
      labels: ['Mover os sprites do grupo tiros usando suas velocidades', 'vy −7 no laser'],
      types: ['sz_g2d_update_group'],
    }),
    practice({
      key: 'faxina',
      title: 'Retire os lasers que saíram',
      etapa: 'limpeza-tiros',
      intro: [
        A(
          'Os lasers já atravessam a tela. Lembra da experiência Objetos que entram e saem? Sumir da janela não retirava um objeto do grupo. Agora acrescente a retirada de quem terminou o caminho.',
          '[apontar prévia]',
        ),
      ],
      actions: [
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Dentro de Se jogando, deixe à vista o encaixe depois de Mover os sprites do grupo tiros.',
          '[apontar abaixo de "Mover os sprites do grupo tiros"]',
        ),
        A(
          'Abra Jogo2D, depois Grupos e depois Participação e limpeza. Pegue Tirar do grupo quem sair da tela e encaixe nesse lugar.',
          '[abrir categoria Jogo 2D > Grupos > Participação e limpeza] [encaixar "Tirar do grupo asteroides quem sair da tela" abaixo de "Mover os sprites do grupo tiros"]',
        ),
        A(
          'Troque o grupo asteroides por tiros. No nome depois de chamado, escreva foraDaTela.',
          '[trocar "asteroides" por "tiros" em "Tirar do grupo"] [trocar "sprite" por "foraDaTela" em "Tirar do grupo tiros"]',
        ),
        A(
          'Deixe o fazer desse bloco vazio. Retirar já é a ação do bloco; não há outra resposta para executar quando um laser sai.',
          '[apontar encaixe em "Tirar do grupo tiros"]',
        ),
      ],
      tests: [
        A(
          'Comece o jogo, dispare alguns lasers e espere eles atravessarem a tela. O voo continua igual. A retirada do grupo acontece nos bastidores e será conferida em Verificar projeto.',
          '[tocar prévia 400 300] [tecla Enter] [tecla Space] aguardar 0,2 segundos na gravação, sem novo comando [tecla Space] aguardar 3 segundos na gravação, sem novo comando',
        ),
      ],
      correction:
        'a retirada usa o grupo tiros, está depois de mover esse grupo e tem o fazer vazio',
      labels: ['Tirar do grupo tiros quem sair da tela'],
      types: ['sz_g2d_prune_offscreen'],
    }),
    practice({
      key: 'entrega',
      title: 'Teste e envie os lasers',
      etapa: 'limpeza-tiros',
      intro: [
        A(
          'Seu disparo já tem momento, origem e caminho. Faça uma sequência curta para conferir essas três coisas juntas.',
          '[apontar prévia]',
        ),
      ],
      actions: [A('Clique em Rodar de novo para começar o teste na abertura.', '[rodar de novo]')],
      tests: [
        A(
          'Antes de Enter, toque em Espaço. Nenhum laser deve nascer. Pressione Enter e dispare uma vez no centro.',
          '[tocar prévia 400 300] [tecla Space] [tecla Enter] [tecla Space]',
        ),
        A(
          'Mova para a esquerda e dispare. Depois vá para a direita e dispare novamente. Os novos lasers devem sair da nave e subir.',
          '[segurar tecla ArrowLeft por 0,5 s]  [tecla Space] [segurar tecla ArrowRight por 1 s]  [tecla Space]',
        ),
        A(
          'Espere os lasers saírem da tela e confira o bloco que os retira do grupo. A verificação também vai acompanhar essa retirada.',
          'aguardar 4 segundos na gravação, sem novo comando [apontar bloco "Tirar do grupo tiros"]',
        ),
      ],
      correction:
        'Espaço tem a guarda jogando, a origem lê a nave, vy é negativo, o grupo é movido, desenhado e tem retirada fora da tela',
      labels: [],
      types: [],
      delivery: true,
      conquest:
        'Você programou lasers que saem da sua nave, voam e deixam a partida ao terminar o caminho!',
    }),
  ],
}

const aula4: ConstrutorAula = {
  slug: 'chuva-de-asteroides',
  title: 'Faça os asteroides cair',
  entryStage: 'limpeza-tiros',
  entry: 'Nave e disparo completos; ainda sem grupo de asteroides nem relógio.',
  outcome:
    'Asteroides nascem a cada1,5 segundos em posições sorteadas, caem e são retirados quando escapam; tiros ainda os atravessam.',
  trechos: [
    experiment(
      'intervalo-das-pedras',
      'Quando nasce outro asteroide?',
      'intervalo',
      [
        'Os asteroides vão chegar um depois do outro. Pense em soltar bolhas de sabão: o espaço de tempo entre os sopros muda a distância entre as bolhas.',
        'No jogo, o intervalo também separa o nascimento dos asteroides. Ele indica quanto tempo esperar antes de criar outro, enquanto os que já nasceram continuam seu caminho.',
      ],
      'Compare os nascimentos sem intervalo e com uma espera. Depois, compare quantos nascem em quatro segundos com intervalos de um e de dois segundos.',
      'E se nascer um asteroide em todo quadro?',
    ),
    practice({
      key: 'relogio',
      title: 'Prepare o grupo e o relógio',
      etapa: 'relogio-asteroides',
      intro: [
        A(
          'Seu jogo já dispara, mas ainda não cria asteroides. Na experiência da parte anterior, uma espera separava os nascimentos. Prepare o grupo que vai reunir as pedras e um relógio de um segundo e meio.',
          '[apontar prévia]',
        ),
      ],
      actions: [
        A(locate('Ao iniciar'), '[arrastar até "Ao iniciar"]'),
        A(
          'Deixe à vista o encaixe depois de Criar grupo de sprites tiros. Abra Jogo2D, depois Grupos e depois Criar e percorrer.',
          '[apontar abaixo de "Criar grupo de sprites tiros"] [abrir categoria Jogo 2D > Grupos > Criar e percorrer]',
        ),
        A(
          'Pegue outro Criar grupo de sprites e encaixe depois do grupo tiros. O nome já é asteroides; conserve esse nome.',
          '[encaixar "Criar grupo de sprites" abaixo de "Criar grupo de sprites tiros"] [apontar bloco "Criar grupo de sprites asteroides"]',
        ),
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Encontre A cada quadro do jogo e siga até o fim desse bloco. Deixe o encaixe de baixo à vista, fora do fazer. O relógio vai ficar depois dele, como outro bloco da área.',
          '[arrastar até "A cada quadro do jogo"] [apontar abaixo de "A cada quadro do jogo"]',
        ),
        A(
          'Abra Jogo2D, depois Tempo e depois Quadros e intervalos. Pegue A cada segundos e encaixe fora do laço de quadros, nesse lugar.',
          '[abrir categoria Jogo 2D > Tempo > Quadros e intervalos] [encaixar "A cada 2 segundos" abaixo de "A cada quadro do jogo"]',
        ),
        A(
          'Troque o2 pelo valor1.5, com ponto entre o um e o cinco. Isso significa um segundo e meio.',
          '[trocar "2" por "1.5" em "A cada 2 segundos"]',
        ),
        A(
          'Deixe o fazer do relógio à vista. Abra Programação e depois Lógica e Se. Encaixe um Se dentro desse fazer.',
          '[apontar encaixe em "A cada 1.5 segundos"] [abrir categoria Programação > Lógica & Se] [encaixar "Se" em "A cada 1.5 segundos"]',
        ),
        A(
          'Leve a pergunta x maior que zero do Se para a lixeira. Com o espaço da pergunta à vista, abra Jogo2D, Jogo e telas, Telas e partida, e encaixe o estado do jogo é.',
          '[jogar na lixeira ">" em "Se dentro de A cada 1.5 segundos"] [abrir categoria Jogo 2D > Jogo e telas > Telas e partida] [encaixar "o estado do jogo é" em "Se dentro de A cada 1.5 segundos" no "Se"]',
        ),
        A(
          'Escolha jogando no estado e deixe o então vazio por enquanto. Assim, os futuros nascimentos também vão esperar a partida começar.',
          '[trocar "inicio" por "jogando" em "o estado do jogo é dentro de A cada 1.5 segundos"] [apontar encaixe em "Se o estado do jogo é jogando dentro de A cada 1.5 segundos" no "então"]',
        ),
      ],
      tests: [],
      visible: false,
      correction:
        'há um grupo asteroides em Ao iniciar, o relógio usa1.5 segundos, fica fora de A cada quadro e contém Se jogando',
      labels: [
        'Criar grupo de sprites asteroides',
        'A cada1,5 segundos',
        'Se o estado do jogo é jogando',
      ],
      types: ['sz_g2d_create_group', 'sz_g2d_every_seconds', 'sz_js_if_else', 'sz_g2d_scene_is'],
    }),
    experiment(
      'posicao-sorteada',
      'Onde nasce cada asteroide?',
      'sorteio',
      [
        'Se todos os asteroides chegassem pelo mesmo lugar, bastaria deixar a nave apontada para aquela coluna. O sorteio permite variar o lugar de cada nova pedra.',
        'É como tirar um número de um saquinho. Você escolhe quais números podem participar, mas não escolhe antecipadamente qual deles vai sair em cada vez. Na tela, o número sorteado vai indicar a posição horizontal do novo asteroide.',
        'A pedra também pode nascer um pouco acima da parte visível e entrar caindo. Isso deixa a chegada acontecer pela beirada, em vez de aparecer no meio do caminho.',
      ],
      'Observe onde cada sorteio coloca a pedra e como ela entra na tela.',
      'O sorteio precisa dar um lugar diferente todas as vezes?',
    ),
    practice({
      key: 'asteroide',
      title: 'Crie os asteroides caindo',
      etapa: 'asteroides',
      intro: [
        A(
          'O relógio já espera um segundo e meio, mas seu então ainda está vazio. A experiência mostrou que um sorteio pode escolher o lugar de cada nova pedra. Agora coloque a criação dentro do relógio e faça o grupo cair e aparecer.',
          '[apontar encaixe em "Se o estado do jogo é jogando dentro de A cada 1.5 segundos" no "então"]',
        ),
      ],
      actions: [
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Encontre A cada1.5 segundos. Dentro dele, deixe o então de Se jogando à vista.',
          '[apontar encaixe em "Se o estado do jogo é jogando dentro de A cada 1.5 segundos" no "então"]',
        ),
        A(
          'Abra Jogo2D, depois Grupos e depois Criar e percorrer. Pegue No grupo criar um sprite com imagem e encaixe nesse então.',
          '[abrir categoria Jogo 2D > Grupos > Criar e percorrer] [encaixar "No grupo inimigos criar um sprite" em "Se o estado do jogo é jogando dentro de A cada 1.5 segundos" no "então"]',
        ),
        A(
          'Troque o grupo inimigos por asteroides. Deixe vazio o nome opcional depois de chamado.',
          '[trocar "inimigos" por "asteroides" em "No grupo inimigos criar um sprite"] [apontar bloco "No grupo asteroides criar um sprite"]',
        ),
        A(
          'Deixe o número do x à vista. Abra Programação e depois Valores. Pegue número aleatório de até e solte sobre esse número.',
          '[apontar bloco "No grupo asteroides criar um sprite"] [abrir categoria Programação > Valores] [soltar "número aleatório de" em cima do "100" em "No grupo asteroides criar um sprite"]',
        ),
        A(
          'No sorteio, coloque24 no primeiro número e728 no segundo. Essa faixa deixa espaço para a largura do asteroide, nas duas beiradas.',
          '[trocar "0" por "24" em "número aleatório de"] [trocar "100" por "728" em "número aleatório de"]',
        ),
        A(
          'No y da criação, coloque menos52. Na largura e na altura, coloque48.',
          '[trocar "100" por "-52" em "No grupo asteroides criar um sprite"] [trocar "32" por "48" em "No grupo asteroides criar um sprite"] [trocar "32" por "48" em "No grupo asteroides criar um sprite"]',
        ),
        A(
          'Escolha a imagem asteroide-rocha-lunar. Deixe vx em zero. No último número, logo depois de vy, coloque2, para a pedra seguir para baixo.',
          '[trocar "inimigo" por "asteroide-rocha-lunar" em "No grupo asteroides criar um sprite"] aproximar o fim do bloco; editar somente o zero depois do rótulo vy para 2 e confirmar, em captura manual deste campo [apontar bloco "No grupo asteroides criar um sprite"]',
        ),
        A(
          'Agora encontre A cada quadro do jogo. Dentro de Se jogando, deixe à vista o encaixe depois de Mover os sprites do grupo tiros e antes da retirada dos tiros.',
          '[apontar abaixo de "Mover os sprites do grupo tiros"]',
        ),
        A(
          'Abra Jogo2D, depois Grupos e depois Movimento. Encaixe Mover os sprites do grupo usando suas velocidades nesse lugar. O grupo já é asteroides; conserve.',
          '[abrir categoria Jogo 2D > Grupos > Movimento] [encaixar "Mover os sprites do grupo" abaixo de "Mover os sprites do grupo tiros"] [apontar bloco "Mover os sprites do grupo asteroides"]',
        ),
        A(
          'Mais abaixo no laço de quadros, deixe à vista o encaixe depois de Limpar a tela e antes de Desenhar o grupo tiros, fora do Se.',
          '[apontar abaixo de "Limpar a tela"]',
        ),
        A(
          'Abra Jogo2D, depois Grupos e depois Desenho e ordem. Encaixe Desenhar o grupo nesse lugar e conserve o nome asteroides.',
          '[abrir categoria Jogo 2D > Grupos > Desenho e ordem] [encaixar "Desenhar o grupo" abaixo de "Limpar a tela"] [apontar bloco "Desenhar o grupo asteroides"]',
        ),
      ],
      tests: [
        A(
          'Clique no jogo e pressione Enter. Espere alguns segundos: novas pedras entram por cima, em lugares sorteados, e caem. Dispare também. Por enquanto, os lasers atravessam os asteroides, porque o acerto ainda será programado.',
          '[tocar prévia 400 300] [tecla Enter] aguardar 5 segundos na gravação, sem novo comando [tecla Space]',
        ),
      ],
      correction:
        'a criação está no relógio com a guarda jogando, usa asteroides, sorteia o x, começa acima e tem vy positivo; o mesmo grupo é movido e desenhado no laço de quadros',
      labels: [
        'No grupo asteroides criar um sprite com imagem',
        'número aleatório de24 até728',
        'Mover os sprites do grupo asteroides',
        'Desenhar o grupo asteroides',
      ],
      types: [
        'sz_g2d_spawn_image_in_group',
        'sz_val_random',
        'sz_g2d_update_group',
        'sz_g2d_draw_group',
      ],
    }),
    practice({
      key: 'retirada',
      title: 'Retire os asteroides que escapam',
      etapa: 'limpeza-asteroides',
      intro: [
        A(
          'As pedras já entram e atravessam a tela. Você usou a retirada nos lasers para encerrar o caminho deles; agora faça o mesmo com os asteroides que passam por baixo.',
          '[apontar prévia]',
        ),
      ],
      actions: [
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Dentro de A cada quadro do jogo e de Se jogando, deixe à vista o encaixe depois de Tirar do grupo tiros quem sair da tela.',
          '[apontar abaixo de "Tirar do grupo tiros"]',
        ),
        A(
          'Abra Jogo2D, depois Grupos e depois Participação e limpeza. Encaixe outro Tirar do grupo quem sair da tela nesse lugar.',
          '[abrir categoria Jogo 2D > Grupos > Participação e limpeza] [encaixar "Tirar do grupo asteroides quem sair da tela" abaixo de "Tirar do grupo tiros"]',
        ),
        A(
          'O grupo já é asteroides. Conserve esse nome e escreva foraDaTela no nome depois de chamado.',
          '[apontar bloco "Tirar do grupo asteroides"] [trocar "sprite" por "foraDaTela" em "Tirar do grupo asteroides"]',
        ),
        A(
          'Deixe o fazer vazio. Neste jogo, um asteroide que escapa não tira vida e não dá ponto.',
          '[apontar encaixe em "Tirar do grupo asteroides"]',
        ),
      ],
      tests: [
        A(
          'Comece a partida e deixe algumas pedras atravessarem a tela. Elas continuam entrando por cima e saindo por baixo. A retirada é conferida nos blocos; ver uma pedra desaparecer da janela não mostra sozinho o que ficou no grupo.',
          '[tocar prévia 400 300] [tecla Enter] aguardar 6 segundos na gravação, sem novo comando [apontar bloco "Tirar do grupo asteroides"]',
        ),
      ],
      correction:
        'a retirada usa asteroides, vem depois do movimento dos grupos, está dentro de Se jogando e tem o fazer vazio',
      labels: ['Tirar do grupo asteroides quem sair da tela'],
      types: ['sz_g2d_prune_offscreen'],
    }),
    quiz('quiz-final', 'Confira tiros e asteroides', [
      {
        id: 'momento',
        prompt: 'Você quer um laser por toque em Espaço. Onde a criação deve acontecer?',
        options: [
          'Em todo quadro, mesmo sem tocar na tecla.',
          'No acontecimento de tocar em Espaço, durante a partida.',
          'Só quando o jogo abre pela primeira vez.',
        ],
        correct: 1,
        explanation:
          'O evento recebe cada novo toque. A repetição por quadro criaria lasers sem depender desse novo acontecimento.',
      },
      {
        id: 'origem',
        prompt:
          'A nave foi para a direita, mas o laser nasceu no antigo lugar do meio. O que falta conferir?',
        options: [
          'Se a origem lê a posição atual da nave.',
          'Se o cenário tem mais estrelas.',
          'Se o laser tem outro desenho.',
        ],
        correct: 0,
        explanation:
          'Uma posição escrita fica igual. Ler centro x e posição y da nave faz cada novo laser acompanhar o lugar atual dela.',
      },
      {
        id: 'fora',
        prompt: 'Um laser já não aparece na tela. Isso comprova que saiu do grupo?',
        options: [
          'Sim, tudo que fica invisível deixa de existir.',
          'Só se a imagem for azul.',
          'Não. A retirada do grupo precisa acontecer também.',
        ],
        correct: 2,
        explanation:
          'A tela é uma janela. Um sprite pode continuar no grupo fora dela; a retirada encerra a participação dele no jogo.',
      },
      {
        id: 'intervalo',
        prompt: 'Em quatro segundos de jogo, qual espera faz nascer mais asteroides?',
        options: [
          'Nascer a cada dois segundos.',
          'Nascer a cada um segundo.',
          'As duas esperas sempre criam a mesma quantidade.',
        ],
        correct: 1,
        explanation:
          'Com uma espera menor, cabem mais nascimentos no mesmo tempo. O intervalo muda quando uma pedra nova nasce; não é a velocidade de queda das que já estão na tela.',
      },
    ]),
    practice({
      key: 'entrega',
      title: 'Teste e envie a chuva de asteroides',
      etapa: 'limpeza-asteroides',
      intro: [
        A(
          'Sua rota agora recebe asteroides. Confira como eles chegam antes de enviar esta versão.',
          '[apontar prévia]',
        ),
      ],
      actions: [
        A(
          'Clique em Rodar de novo e observe a abertura por alguns segundos.',
          '[rodar de novo] aguardar 3 segundos na gravação, sem novo comando',
        ),
      ],
      tests: [
        A(
          'Nenhuma pedra deve nascer na abertura. Clique no jogo, pressione Enter e espere a chegada dos asteroides.',
          '[tocar prévia 400 300] [tecla Enter] aguardar 4 segundos na gravação, sem novo comando',
        ),
        A(
          'Observe o espaço de tempo entre os nascimentos e os lugares de entrada. O sorteio pode repetir um lugar; ele não precisa alternar entre esquerda e direita.',
          '[apontar prévia] aguardar 4 segundos na gravação, sem novo comando',
        ),
        A(
          'Dispare e acompanhe uma pedra até ela sair por baixo. Nesta versão, o tiro ainda atravessa a pedra, e a saída da tela não tem outra reação.',
          '[tecla Space] aguardar 5 segundos na gravação, sem novo comando',
        ),
      ],
      correction:
        'o grupo e o relógio estão nos lugares certos, as pedras nascem somente em jogando, descem e têm a retirada fora da tela',
      labels: [],
      types: [],
      delivery: true,
      conquest: 'Você construiu a chegada dos asteroides, com ritmo e posições sorteadas!',
    }),
  ],
}

const aula5: ConstrutorAula = {
  slug: 'dia-3',
  title: 'Faça o tiro acertar o asteroide',
  entryStage: 'limpeza-asteroides',
  entry:
    'Lasers e asteroides são criados, movidos, desenhados e retirados fora da tela; ainda atravessam uns aos outros.',
  outcome: 'Cada acerto retira apenas o tiro e o asteroide envolvidos e produz explosão e som.',
  trechos: [
    experiment(
      'trombada',
      'Quem sai do jogo no acerto?',
      'colisao',
      [
        'Um laser pode encontrar um asteroide enquanto outros continuam voando. Pense numa brincadeira com bolas: quando duas se encostam, aquele encontro pertence às duas, não a todas as bolas que estão por perto.',
        'No seu jogo, cada encontro também forma um par: um tiro e um asteroide. Para responder ao acerto, o jogo precisa distinguir esse par dos outros sprites dos grupos.',
      ],
      'Compare retirar o grupo inteiro com retirar só os dois objetos do encontro.',
      'Um acerto deve fazer todos os asteroides sumirem?',
    ),
    practice({
      key: 'colisao',
      title: 'Retire o par que se encontrou',
      etapa: 'colisao-tiros',
      intro: [
        A(
          'Comece o jogo e acerte uma pedra com um laser. Eles ainda se atravessam porque o encontro não tem resposta. Na experiência da parte anterior, só o par envolvido precisava sair. Agora programe essa reação.',
          '[tocar prévia 400 300] [tecla Enter] jogar com as setas até alinhar a nave sob uma pedra; a gravação acompanha a pedra que nasceu [tecla Space]',
        ),
      ],
      actions: [
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Dentro de A cada quadro do jogo, encontre Se jogando. Deixe à vista o encaixe depois da retirada dos asteroides.',
          '[apontar abaixo de "Tirar do grupo asteroides"]',
        ),
        A(
          'Abra Jogo2D, depois Colisões e depois Encostar e bloquear. Pegue Para cada colisão entre os grupos e encaixe nesse lugar.',
          '[abrir categoria Jogo 2D > Colisões > Encostar e bloquear] [encaixar "Para cada colisão entre os grupos" abaixo de "Tirar do grupo asteroides"]',
        ),
        A(
          'Os grupos já são tiros e asteroides. Os nomes do par já são tiro e asteroide. Conserve esses quatro nomes.',
          '[apontar bloco "Para cada colisão entre os grupos tiros e asteroides"]',
        ),
        A(
          'Deixe o fazer desse encontro à vista. Abra Jogo2D, depois Grupos e depois Participação e limpeza. Pegue Tirar o sprite do grupo e solte dentro do fazer.',
          '[apontar encaixe em "Para cada colisão entre os grupos"] [abrir categoria Jogo 2D > Grupos > Participação e limpeza] [encaixar "Tirar o sprite" em "Para cada colisão entre os grupos"]',
        ),
        A(
          'No sprite que chega como asteroide, escolha tiro. No grupo, escolha tiros. Essa instrução retira o laser que participou do encontro.',
          '[trocar "asteroide" por "tiro" em "Tirar o sprite"] [trocar "asteroides" por "tiros" em "Tirar o sprite tiro"]',
        ),
        A(
          'Deixe o encaixe abaixo dessa retirada à vista. Pegue outro Tirar o sprite do grupo na mesma gaveta e solte ali, ainda dentro do encontro.',
          '[apontar abaixo de "Tirar o sprite tiro"] [abrir categoria Jogo 2D > Grupos > Participação e limpeza] [encaixar "Tirar o sprite" abaixo de "Tirar o sprite tiro"]',
        ),
        A(
          'Nesse segundo bloco, conserve o sprite asteroide e o grupo asteroides. Ele retira somente a pedra do par.',
          '[apontar bloco "Tirar o sprite asteroide"]',
        ),
      ],
      tests: [
        A(
          'Comece o jogo e alinhe a nave com uma pedra. Dispare: o laser e a pedra devem sumir no acerto. Observe outra pedra que estava longe desse encontro; ela continua caindo.',
          '[tocar prévia 400 300] [tecla Enter] jogar com as setas até alinhar a nave sob uma pedra; a gravação acompanha a pedra que nasceu [tecla Space] acompanhar outra pedra que permanece na tela [apontar prévia 400 180]',
        ),
      ],
      correction:
        'o encontro compara tiros e asteroides, usa os nomes tiro e asteroide e contém uma retirada para cada um, com seu grupo correspondente',
      labels: [
        'Para cada colisão entre os grupos tiros e asteroides',
        'Tirar o sprite tiro do grupo tiros',
        'Tirar o sprite asteroide do grupo asteroides',
      ],
      types: ['sz_g2d_on_group_overlap', 'sz_g2d_remove_from_group'],
    }),
    practice({
      key: 'efeitos',
      title: 'Mostre o acerto',
      etapa: 'efeitos-acerto',
      intro: [
        A(
          'O acerto já retira o par. Agora acrescente um brilho e um som nesse mesmo momento, para quem joga perceber a reação com mais facilidade.',
          '[apontar prévia]',
        ),
      ],
      actions: [
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Encontre o encontro entre tiros e asteroides. Dentro do fazer, deixe à vista o encaixe depois das duas retiradas.',
          '[apontar abaixo de "Tirar o sprite asteroide"]',
        ),
        A(
          'Abra Jogo2D, depois Desenho e efeitos e depois Partículas. Pegue Soltar explosão no sprite e encaixe nesse lugar.',
          '[abrir categoria Jogo 2D > Desenho e efeitos > Partículas] [encaixar "Soltar explosão no sprite" abaixo de "Tirar o sprite asteroide"]',
        ),
        A(
          'Conserve o nome asteroide. Se quiser, clique no quadradinho de cor desse bloco e escolha a cor da explosão na paleta. A cor é escolha sua: ela não muda o jogo.',
          '[apontar bloco "Soltar explosão no sprite asteroide"]',
        ),
        A(
          'Deixe o encaixe logo abaixo da explosão à vista. Abra Jogo2D, depois Som e depois Efeitos prontos. Encaixe Tocar efeito e escolha explosão.',
          '[apontar abaixo de "Soltar explosão no sprite asteroide"] [abrir categoria Jogo 2D > Som > Efeitos prontos] [encaixar "Tocar efeito" abaixo de "Soltar explosão no sprite asteroide"] [trocar "moeda" por "explosão" em "Tocar efeito dentro de Para cada colisão"]',
        ),
      ],
      tests: [
        A(
          'Comece o jogo e acerte uma pedra. Veja o brilho no lugar dela e escute o som. Depois dispare sem acertar: o efeito do acerto deve esperar um encontro.',
          '[tocar prévia 400 300] [tecla Enter] jogar com as setas até alinhar a nave sob uma pedra; a gravação acompanha a pedra que nasceu [tecla Space] aguardar 1 segundo na gravação, sem novo comando usar uma seta para levar a nave a uma coluna sem pedra; a captura acompanha as pedras desta rodada [tecla Space]',
        ),
      ],
      correction:
        'a explosão usa o asteroide do par e os dois efeitos estão dentro do mesmo encontro, depois das retiradas',
      labels: ['Soltar explosão no sprite asteroide', 'Tocar efeito explosão'],
      types: ['sz_g2d_explode', 'sz_g2d_play_fx'],
    }),
    practice({
      key: 'entrega',
      title: 'Teste e envie os acertos',
      etapa: 'efeitos-acerto',
      intro: [
        A(
          'Seu laser já muda o que acontece com as pedras. Compare um acerto com um disparo que passa longe antes de enviar.',
          '[apontar prévia]',
        ),
      ],
      actions: [
        A(
          'Clique em Rodar de novo e comece com Enter.',
          '[rodar de novo] [tocar prévia 400 300] [tecla Enter]',
        ),
      ],
      tests: [
        A(
          'Alinhe um disparo com um asteroide. Confira a retirada do par, o brilho e o som. Os outros asteroides devem continuar na tela.',
          'jogar com as setas até alinhar a nave sob uma pedra; a gravação acompanha a pedra que nasceu [tecla Space] acompanhar outra pedra que permanece na tela [apontar prévia 400 180]',
        ),
        A(
          'Dispare por uma coluna vazia. O laser atravessa a tela sem provocar uma explosão de acerto. Ainda não há placar nesta versão.',
          'usar uma seta para levar a nave a uma coluna sem pedra; a captura acompanha as pedras desta rodada [tecla Space] aguardar 3 segundos na gravação, sem novo comando',
        ),
      ],
      correction:
        'cada encontro retira só o tiro e a pedra envolvidos e os efeitos estão dentro desse encontro',
      labels: [],
      types: [],
      delivery: true,
      conquest:
        'Você programou o acerto entre um laser e um asteroide, preservando o resto da partida!',
    }),
  ],
}

const aula6: ConstrutorAula = {
  slug: 'pontos',
  title: 'Conte os acertos',
  entryStage: 'efeitos-acerto',
  entry: 'Cada acerto retira o par e produz efeitos; ainda sem variável de pontos nem placar.',
  outcome: 'Pontos começam em zero, somam1 apenas no acerto e aparecem na tela.',
  trechos: [
    experiment(
      'caixa-de-pontos',
      'Guardar e mostrar um número',
      'pontos',
      [
        'Você já consegue acertar os asteroides. Agora o jogo precisa lembrar quantos acertos aconteceram. Pense no placar de uma partida: ele guarda a contagem para ninguém depender só da memória.',
        'No seu jogo, os pontos também podem ser guardados. Mudar a contagem e mostrar essa contagem na tela são coisas diferentes, como anotar um resultado e levantar uma placa para todo mundo enxergar.',
      ],
      'Compare o número guardado com o número mostrado na tela.',
      'Se o número mudou nos bastidores, ele aparece sozinho no placar?',
    ),
    practice({
      key: 'placar',
      title: 'Prepare o placar',
      etapa: 'placar',
      intro: [
        A(
          'Seu jogo já reconhece acertos, mas ainda não guarda uma contagem. Na experiência da parte anterior, guardar e mostrar eram ações diferentes. Faça as duas, começando com zero.',
          '[apontar prévia]',
        ),
      ],
      actions: [
        A(locate('Ao iniciar'), '[arrastar até "Ao iniciar"]'),
        A(
          'Deixe à vista o encaixe depois dos dois grupos, antes de Mudar o estado do jogo para inicio.',
          '[apontar abaixo de "Criar grupo de sprites asteroides"]',
        ),
        A(
          'Abra Programação e depois Variáveis. Pegue Criar variável com valor e encaixe nesse lugar.',
          '[abrir categoria Programação > Variáveis] [encaixar "Criar variável contador com valor" abaixo de "Criar grupo de sprites asteroides"]',
        ),
        A(
          'Troque o nome contador por pontos. O valor já é zero; deixe assim.',
          '[trocar "contador" por "pontos" em "Criar variável contador"] [apontar bloco "Criar variável pontos"]',
        ),
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Dentro de A cada quadro do jogo, encontre Desenhar o sprite nave. Deixe o encaixe depois dele à vista, antes da legenda e das telas.',
          '[apontar abaixo de "Desenhar o sprite nave"]',
        ),
        A(
          'Abra Jogo2D, depois Vida e placar e depois Indicadores e texto na tela. Pegue Mostrar placar e encaixe nesse lugar.',
          '[abrir categoria Jogo 2D > Vida e placar > Indicadores e texto na tela] [encaixar "Mostrar placar" abaixo de "Desenhar o sprite nave"]',
        ),
        A(
          'No rótulo que chega como Pontos:, escreva Acertos: com dois-pontos no fim. Coloque22 no x,32 no y e23 no tamanho.',
          '[trocar "Pontos:" por "Acertos:" em "Mostrar placar"] [trocar "12" por "22" em "Mostrar placar Acertos:"] [trocar "30" por "32" em "Mostrar placar Acertos:"] [trocar "24" por "23" em "Mostrar placar Acertos:"]',
        ),
        A(
          'O placar chega branco, que aparece bem no espaço. Se quiser outra cor clara, escolha no quadradinho de cor. Agora deixe o número do valor do placar à vista.',
          '[apontar bloco "Mostrar placar Acertos:"]',
        ),
        A(
          'Abra Programação e depois Valores. Pegue o valor de variável, que chega com x, e encaixe sobre o número do placar. Clique nesse x e escolha pontos.',
          '[abrir categoria Programação > Valores] [soltar "valor da variável" em cima do "0" em "Mostrar placar Acertos:"] [trocar "x" por "pontos" em "valor da variável dentro de Mostrar placar Acertos:"]',
        ),
      ],
      tests: [
        A(
          'Comece a partida e olhe o canto superior esquerdo. Acertos deve mostrar zero. Mesmo acertando uma pedra, o zero ainda fica, porque a soma será construída na próxima parte.',
          '[tocar prévia 400 300] [tecla Enter] [apontar prévia 85 25] jogar com as setas até alinhar a nave sob uma pedra; a gravação acompanha a pedra que nasceu [tecla Space]',
        ),
      ],
      correction:
        'pontos começa em zero em Ao iniciar e o valor do placar lê pontos dentro do desenho de cada quadro',
      labels: [
        'Criar variável pontos com valor0',
        'Mostrar placar Acertos: valor pontos',
        'valor da variável pontos',
      ],
      types: ['sz_js_var_create', 'sz_g2d_draw_score', 'sz_val_variable'],
    }),
    practice({
      key: 'somar-acerto',
      title: 'Some no lugar do acerto',
      etapa: 'pontos',
      intro: [
        A(
          'Comece o jogo e acerte uma pedra. O par some, mas Acertos continua em zero. A contagem já tem onde ficar e onde aparecer; agora ligue a soma ao mesmo encontro do acerto.',
          '[tocar prévia 400 300] [tecla Enter] jogar com as setas até alinhar a nave sob uma pedra; a gravação acompanha a pedra que nasceu [tecla Space] [apontar prévia 85 25]',
        ),
      ],
      actions: [
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Dentro de Se jogando, encontre o encontro entre tiros e asteroides. Deixe à vista o encaixe no fim do fazer, depois do som da explosão.',
          '[apontar abaixo de "Tocar efeito explosão"]',
        ),
        A(
          'Abra Programação e depois Variáveis. Pegue Somar1 em variável e encaixe nesse lugar.',
          '[abrir categoria Programação > Variáveis] [encaixar "Somar 1 em variável" abaixo de "Tocar efeito explosão"]',
        ),
        A(
          'Deixe o número em1. Clique no nome que chega como contador e escolha pontos.',
          '[trocar "contador" por "pontos" em "Somar 1 em variável"]',
        ),
      ],
      tests: [
        A(
          'Comece o jogo e acerte uma pedra. Acertos passa de zero para um. Acerte outra: passa para dois.',
          '[tocar prévia 400 300] [tecla Enter] jogar com as setas até alinhar a nave sob uma pedra; a gravação acompanha a pedra que nasceu [tecla Space] [apontar prévia 85 25] registrar o próximo acerto real de laser na mesma partida',
        ),
        A(
          'Dispare sem alvo e deixe uma pedra passar sem acertar. A contagem deve ficar igual nesses dois casos.',
          'usar uma seta para levar a nave a uma coluna sem pedra; a captura acompanha as pedras desta rodada [tecla Space] deixar uma pedra atravessar a tela sem atirar nela [apontar prévia 85 25]',
        ),
      ],
      correction:
        'Somar1 usa pontos e fica dentro do encontro de tiros e asteroides, junto da retirada do par',
      labels: ['Somar1 em variável pontos'],
      types: ['sz_js_var_increment'],
    }),
    quiz('quiz-final', 'Confira a contagem', [
      {
        id: 'inicio',
        prompt:
          'O jogo já marcou cinco acertos. Você começa uma nova partida. Como a nova contagem deve começar?',
        options: [
          'Em cinco, porque a partida anterior acertou cinco.',
          'Em zero, pronta para contar os acertos da nova partida.',
          'Em vinte, porque essa será a meta.',
        ],
        correct: 1,
        explanation:
          'Cada partida tem seus próprios acertos. Preparar pontos com zero em Ao iniciar permite começar uma contagem nova.',
      },
      {
        id: 'lugar',
        prompt:
          'Você quer contar somente os asteroides acertados pelo laser. Em qual acontecimento a soma pertence?',
        options: [
          'Em cada nascimento de asteroide.',
          'Em cada quadro do jogo.',
          'No encontro entre um tiro e um asteroide.',
        ],
        correct: 2,
        explanation:
          'O encontro é o acerto que se quer contar. Nascer ou apenas deixar o tempo passar não prova que um asteroide foi acertado.',
      },
      {
        id: 'mostrar',
        prompt:
          'Pontos muda nos bastidores, mas o placar mostra sempre zero. O que precisa ler a contagem?',
        options: [
          'O valor de Mostrar placar precisa ler pontos.',
          'A imagem do asteroide precisa ser trocada.',
          'O som precisa ser repetido a cada quadro.',
        ],
        correct: 0,
        explanation:
          'O placar precisa mostrar o valor guardado em pontos. Um zero escrito no desenho continuaria sendo zero, mesmo com a variável mudando.',
      },
    ]),
    practice({
      key: 'entrega',
      title: 'Teste e envie seu placar',
      etapa: 'pontos',
      intro: [
        A(
          'Agora o placar acompanha seus acertos. Confira o que conta e o que mantém o número antes de enviar.',
          '[apontar prévia 85 25]',
        ),
      ],
      actions: [
        A(
          'Clique em Rodar de novo e comece a partida com Enter. Confira Acertos em zero.',
          '[rodar de novo] [tocar prévia 400 300] [tecla Enter] [apontar prévia 85 25]',
        ),
      ],
      tests: [
        A(
          'Acerte dois asteroides, um de cada vez, e acompanhe o placar. Ele deve somar um em cada acerto.',
          'jogar até o primeiro acerto desta rodada [apontar prévia 85 25] jogar até o segundo acerto desta rodada [apontar prévia 85 25]',
        ),
        A(
          'Deixe um laser passar sem alvo e uma pedra escapar. O número deve continuar igual. Quando o par já saiu, esperar mais alguns quadros também não soma outro ponto pelo mesmo acerto.',
          'disparar uma vez em uma coluna sem pedra [tecla Space] deixar uma pedra atravessar a tela sem atirar nela [apontar prévia 85 25]',
        ),
      ],
      correction:
        'pontos começa em zero, o placar lê pontos e a soma de1 pertence ao encontro que retira o par',
      labels: [],
      types: [],
      delivery: true,
      conquest: 'Você fez o seu jogo lembrar e mostrar cada acerto!',
    }),
  ],
}

const aula7: ConstrutorAula = {
  slug: 'dia-4',
  title: 'Dê três vidas à nave',
  entryStage: 'pontos',
  entry:
    'Acertos retiram o par, produzem efeitos e somam pontos; a nave ainda não tem vidas nem reação à batida.',
  outcome:
    'Nave começa com três vidas; cada batida retira a pedra, produz efeitos e pode tirar uma vida, com proteção de sessenta quadros, mais ou menos um segundo.',
  trechos: [
    experiment(
      'vidas-no-comeco',
      'Três chances para pilotar',
      'vidas',
      [
        'Agora a nave vai ganhar três vidas. Pense em três fichas que você recebe antes de começar uma brincadeira. Quando perde uma ficha, ela fica gasta até a próxima rodada.',
        'No jogo, você também precisa escolher a hora de preparar essas chances. Pode ser uma vez, quando a rodada começa, ou uma preparação que se repete enquanto ela acontece. Observe como cada jeito se relaciona com as batidas.',
      ],
      'Compare preparar as vidas uma vez com preparar de novo a cada quadro.',
      'O que muda quando eu preparo as vidas enquanto a partida já está acontecendo?',
    ),
    practice({
      key: 'vidas',
      title: 'Prepare e mostre as três vidas',
      etapa: 'vidas',
      intro: [
        A(
          'Prepare as vidas junto com o começo da partida. Depois, acrescente os corações ao desenho do jogo.',
          '[apontar bloco "Ao iniciar"]',
        ),
      ],
      actions: [
        A(locate('Ao iniciar'), '[arrastar até "Ao iniciar"]'),
        A(
          'Deixe à vista o encaixe depois de Criar variável pontos e antes de Mudar o estado do jogo para inicio.',
          '[apontar abaixo de "Criar variável pontos"]',
        ),
        A(
          'Abra Jogo2D, depois Vida e placar e depois Vida.',
          '[abrir categoria Jogo 2D > Vida e placar > Vida]',
        ),
        A(
          'Pegue Dar ao sprite jogador3 de vida e solte depois da criação de pontos. Troque jogador por nave e conserve3 de vida.',
          '[encaixar "Dar ao sprite" abaixo de "Criar variável pontos"] [trocar "jogador" por "nave" em "Dar ao sprite"]',
        ),
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Dentro de A cada quadro do jogo, encontre o placar Acertos. Deixe à vista o encaixe depois dele e antes da legenda dos controles.',
          '[apontar abaixo de "Mostrar placar Acertos:"]',
        ),
        A(
          'Na mesma categoria Vida, pegue Desenhar as vidas do sprite e solte nesse encaixe.',
          '[abrir categoria Jogo 2D > Vida e placar > Vida] [encaixar "Desenhar as vidas do sprite" abaixo de "Mostrar placar Acertos:"]',
        ),
        A(
          'Troque jogador por nave. Conserve a opção corações. No tamanho, coloque21; no x,22; e no y,52.',
          '[trocar "jogador" por "nave" em "Desenhar as vidas do sprite"] [trocar "22" por "21" em "Desenhar as vidas do sprite"] [trocar "12" por "22" em "Desenhar as vidas do sprite"] [trocar "48" por "52" em "Desenhar as vidas do sprite"]',
        ),
        A(
          'Clique no quadradinho de cor e escolha na paleta a cor que você quiser para os corações.',
          '[apontar bloco "Desenhar as vidas do sprite"]',
        ),
      ],
      tests: [
        A(
          'Clique no jogo e pressione Enter. Confira os três corações. Por enquanto, os asteroides ainda atravessam a nave sem tirar vida: você preparou as chances, e a batida vem na próxima parte.',
          '[tocar prévia 400 300] [tecla Enter] [apontar prévia 60 62]',
        ),
      ],
      correction:
        'Dar ao sprite nave3 de vida está em Ao iniciar, e Desenhar as vidas da nave está no desenho de cada quadro',
      labels: ['Dar ao sprite nave3 de vida', 'Desenhar as vidas do sprite nave como corações'],
      types: ['sz_g2d_set_health', 'sz_g2d_draw_sprite_health'],
    }),
    practice({
      key: 'batida',
      title: 'Encontre a pedra que bateu na nave',
      etapa: 'colisao-nave',
      intro: [
        A(
          'O encontro entre o tiro e o asteroide já está funcionando. Agora você vai conferir outro encontro: uma pedra do grupo asteroides encostando na nave.',
          '[apontar bloco "Para cada colisão"]',
        ),
      ],
      actions: [
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Dentro de A cada quadro do jogo, encontre o então de Se jogando. Deixe à vista o encaixe depois do bloco inteiro que confere tiros com asteroides.',
          '[apontar abaixo de "Para cada colisão"]',
        ),
        A(
          'Abra Jogo2D, depois Colisões e depois Encostar e bloquear. Pegue Para cada sprite do grupo que colidir com o sprite e solte nesse encaixe.',
          '[abrir categoria Jogo 2D > Colisões > Encostar e bloquear] [encaixar "Para cada sprite do grupo" abaixo de "Para cada colisão"]',
        ),
        A(
          'Conserve grupo asteroides e sprite nave. Em chamar o sprite de, troque inimigo por atingiuNave, tudo junto, com N maiúsculo.',
          '[trocar "inimigo" por "atingiuNave" em "Para cada sprite do grupo"]',
        ),
        A(
          'Deixe o fazer dessa nova colisão à vista. Abra Jogo2D, depois Grupos e depois Participação e limpeza. Pegue Tirar o sprite do grupo e solte dentro desse fazer.',
          '[apontar encaixe em "Para cada sprite do grupo"] [abrir categoria Jogo 2D > Grupos > Participação e limpeza] [encaixar "Tirar o sprite" em "Para cada sprite do grupo"]',
        ),
        A(
          'No nome do sprite, troque asteroide por atingiuNave. O grupo continua asteroides. Esse nome indica só a pedra dessa batida.',
          '[trocar "asteroide" por "atingiuNave" em "Tirar o sprite dentro de Para cada sprite do grupo"]',
        ),
        A(
          'Abra Jogo2D, depois Desenho e efeitos e depois Partículas. Pegue Soltar explosão no sprite e solte depois da retirada, dentro da mesma colisão. Escolha atingiuNave no nome do sprite.',
          '[abrir categoria Jogo 2D > Desenho e efeitos > Partículas] [encaixar "Soltar explosão no sprite" abaixo de "Tirar o sprite atingiuNave"] [trocar "asteroide" por "atingiuNave" em "Soltar explosão no sprite dentro de Para cada sprite do grupo"]',
        ),
        A(
          'Se quiser, clique no quadradinho de cor da explosão e escolha outra cor na paleta. Uma cor diferente da explosão do tiro ajuda a perceber que a nave foi atingida.',
          '[apontar bloco "Soltar explosão no sprite dentro de Para cada sprite do grupo"]',
        ),
        A(
          'Abra Jogo2D, depois Som e depois Efeitos prontos. Pegue Tocar efeito e solte depois da explosão, dentro dessa colisão. Escolha o efeito batida.',
          '[abrir categoria Jogo 2D > Som > Efeitos prontos] [encaixar "Tocar efeito" abaixo de "Soltar explosão no sprite atingiuNave"] [trocar "moeda" por "batida" em "Tocar efeito dentro de Para cada sprite do grupo"]',
        ),
      ],
      tests: [
        A(
          'Comece a partida e deixe uma pedra encostar na nave. Só essa pedra desaparece, com explosão e som. Os três corações continuam iguais, porque o dano será sua próxima construção.',
          '[tocar prévia 400 300] [tecla Enter] [apontar prévia 400 420]',
        ),
      ],
      correction:
        'a nova colisão confere asteroides com nave, chama a pedra de atingiuNave e usa esse nome na retirada e na explosão',
      labels: [
        'Para cada sprite do grupo asteroides que colidir com o sprite nave',
        'Tirar o sprite atingiuNave do grupo asteroides',
        'Soltar explosão no sprite atingiuNave',
        'Tocar efeito batida',
      ],
      types: [
        'sz_g2d_on_sprite_group_overlap',
        'sz_g2d_remove_from_group',
        'sz_g2d_explode',
        'sz_g2d_play_fx',
      ],
    }),
    experiment(
      'respiro',
      'Um respiro depois da batida',
      'protecao',
      [
        'Uma batida pode acontecer muito perto da próxima. Pense num pega-pega em que, depois de ser pego, você ganha um pequeno tempo para se afastar antes de poder ser pego de novo.',
        'A nave também pode ganhar esse respiro. Durante a proteção, outro contato não tira uma nova vida. Quando esse tempo acaba, ela pode perder outra vida numa nova batida.',
      ],
      'Compare contatos próximos com e sem o tempo de proteção.',
      'Como eu consigo perceber quando esse respiro começou e terminou?',
    ),
    practice({
      key: 'dano',
      title: 'Tire uma vida e dê um respiro',
      etapa: 'dano',
      intro: [
        A(
          'A batida já encontra e retira a pedra certa. Agora coloque a perda de uma vida dentro desse mesmo encontro.',
          '[apontar bloco "Para cada sprite do grupo"]',
        ),
      ],
      actions: [
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Encontre Para cada sprite do grupo asteroides que colidir com o sprite nave. Dentro dele, deixe à vista o encaixe depois da explosão e antes do som de batida.',
          '[apontar abaixo de "Soltar explosão no sprite atingiuNave"]',
        ),
        A(
          'Abra Jogo2D, depois Vida e placar e depois Vida. Pegue Machucar o sprite e deixá-lo invencível e solte nesse encaixe.',
          '[abrir categoria Jogo 2D > Vida e placar > Vida] [encaixar "Machucar o sprite" abaixo de "Soltar explosão no sprite atingiuNave"]',
        ),
        A(
          'Troque jogador por nave. Conserve o dano em1. No tempo de proteção, troque45 por60 quadros. O jogo desenha uns sessenta quadros por segundo, então são mais ou menos um segundo de proteção.',
          '[trocar "jogador" por "nave" em "Machucar o sprite"] [trocar "45" por "60" em "Machucar o sprite"]',
        ),
      ],
      tests: [
        A(
          'Clique no jogo, comece a partida e deixe uma pedra bater na nave. Um coração deve desaparecer. Afaste-se e espere um pouco; numa batida depois da proteção, outra vida pode ser perdida. Ao chegar a zero, o jogo ainda continua: a regra de terminar virá na última aula.',
          '[tocar prévia 400 300] [tecla Enter] [apontar prévia 60 62]',
        ),
      ],
      correction:
        'Machucar o sprite nave fica dentro da colisão da nave, com dano1 e proteção de60 quadros; as três vidas continuam preparadas somente em Ao iniciar',
      labels: ['Machucar o sprite nave em1 e deixá-lo invencível por60 quadros'],
      types: ['sz_g2d_damage_sprite'],
    }),
    practice({
      key: 'entrega',
      title: 'Confira as chances da nave e envie',
      etapa: 'dano',
      intro: [
        A(
          'Sua nave ganhou três chances e um respiro entre os danos. Confira o conjunto antes de enviar.',
          '[apontar prévia 60 62]',
        ),
      ],
      actions: [
        A('Clique em Rodar de novo para conferir a preparação desde o começo.', '[rodar de novo]'),
      ],
      tests: [
        A(
          'Pressione Enter. Confira três corações, deixe uma pedra bater e observe a vida perdida. Desvie de outra pedra: uma pedra que passa sem encostar não tira vida.',
          '[tecla Enter] [apontar prévia 60 62]',
        ),
        A(
          'Espere a proteção acabar e teste outra batida. Confira também um acerto de laser: ele deve continuar somando ponto, sem tirar vida da nave.',
          '[apontar prévia 60 32]',
        ),
      ],
      correction:
        'as vidas começam em3, a pedra atingiuNave é retirada na batida e o dano de1 tem proteção de60 quadros',
      labels: [],
      types: [],
      delivery: true,
      conquest: 'Você deu chances à nave e cuidou do ritmo das batidas!',
    }),
  ],
}

const aula8: ConstrutorAula = {
  slug: 'comecar-partida',
  title: 'Confira o início e escolha o visual',
  entryStage: 'dano',
  entry:
    'Movimento, tiros, asteroides, colisões, pontos e vidas construídos; início, telas e Enter continuam preparados.',
  outcome:
    'Guardas de jogando testadas; aparência de nave, cenário, asteroide e laser escolhida sem mudar as regras.',
  trechos: [
    experiment(
      'estado-do-jogo',
      'A hora de jogar',
      'estado',
      [
        'Lembra da placa de aberto ou fechado da primeira aula? A porta da loja pode ser a mesma, mas a placa informa se já é hora de entrar.',
        'No jogo, essa placa é o estado. A abertura é um momento, e a partida em andamento é outro. Cada regra nova que você montou ganhou um Se jogando, que confere a placa antes de liberar movimento, tiros e novas pedras.',
      ],
      'Compare as ações antes e depois de a partida começar.',
      'O jogo pode desenhar a nave mesmo quando ela ainda não pode se mover?',
    ),
    practice({
      key: 'teste-inicio',
      title: 'Investigue: e se o laser não esperasse a partida?',
      etapa: 'inicio-conferido',
      intro: [
        A(
          'Agora você vai fazer uma investigação de verdade: tirar uma guarda, ver o que quebra e consertar.',
          '[apontar bloco "Quando apertar a tecla barra de espaço"]',
        ),
      ],
      actions: [
        A(locate('Quando acontecer'), '[arrastar até "Quando acontecer"]'),
        A(
          'Encontre o evento de Espaço. Dentro dele, o Se jogando guarda a criação do laser e o som.',
          '[mostrar blocos "Quando apertar a tecla barra de espaço", "o estado do jogo é jogando dentro de Quando apertar a tecla barra de espaço"]',
        ),
        A(
          'Arraste No grupo tiros criar um sprite para fora do então e solte logo abaixo do Se, ainda dentro do evento. O som vem junto, grudado embaixo.',
          '[encaixar "No grupo tiros criar um sprite" abaixo de "Se o estado do jogo é jogando dentro de Quando apertar a tecla barra de espaço"]',
        ),
        A(
          'Clique em Rodar de novo. Na abertura, antes do Enter, aperte Espaço algumas vezes. O que aconteceu? O laser sai mesmo com a placa dizendo início: sem a guarda, a regra não espera a partida.',
          '[rodar de novo] [tocar prévia 400 300] [tecla Space] [tecla Space] [apontar prévia 400 300]',
        ),
        A(
          'Agora conserte. Arraste No grupo tiros criar um sprite de volta para dentro do então do Se jogando.',
          '[encaixar "No grupo tiros criar um sprite" em "Se o estado do jogo é jogando dentro de Quando apertar a tecla barra de espaço" no "então"]',
        ),
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Confira também as outras duas guardas: o Se jogando de A cada quadro do jogo, com o movimento e as colisões, e o Se jogando do relógio A cada1,5 segundos, com o asteroide.',
          '[mostrar blocos "A cada quadro do jogo", "o estado do jogo é jogando"] [mostrar blocos "A cada 1.5 segundos", "o estado do jogo é jogando dentro de A cada"]',
        ),
        A('Clique em Rodar de novo para voltar à abertura.', '[rodar de novo]'),
      ],
      tests: [
        A(
          'Antes de pressionar Enter, segure uma seta, toque em Espaço e espere um pouco. Agora a abertura espera de verdade: a nave não anda, não sai laser e não nasce pedra.',
          '[tocar prévia 400 300] [segurar tecla ArrowRight por 0,4 s] [tecla Space] [apontar prévia 400 240]',
        ),
        A(
          'Agora pressione Enter. Confira que as setas, o laser e as pedras funcionam durante a partida.',
          '[tecla Enter] [segurar tecla ArrowRight por 0,4 s] [tecla Space] [apontar prévia 400 240]',
        ),
      ],
      correction:
        'cada grupo de ações está dentro do seu Se jogando: o dos quadros, o do Espaço e o do relógio',
      labels: ['o estado do jogo é jogando', 'Se ... então'],
      types: ['sz_g2d_scene_is', 'sz_js_if_else'],
    }),
    practice({
      key: 'aparencias',
      title: 'Escolha a aparência das pedras e dos lasers',
      etapa: 'aparencias',
      intro: [
        A(
          'Agora a combinação visual pode ficar toda do seu jeito. As três imagens de cada elemento ocupam a mesma caixa; escolha o desenho que você gosta e conserve os números da partida.',
          '[apontar prévia 400 240]',
        ),
      ],
      actions: [
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'No relógio de um segundo e meio, encontre o bloco que cria um sprite no grupo asteroides. Clique na imagem, como asteroide-rocha-lunar, e escolha rocha lunar, gelo azul ou cristal violeta. Você também pode manter a imagem atual.',
          '[abrir campo "asteroide-rocha-lunar" em "No grupo asteroides criar um sprite"] [escolher "asteroide-cristal-violeta" em "No grupo asteroides criar um sprite"]',
        ),
        A(
          'Conserve largura48, altura48, o sorteio da posição, a velocidade e o intervalo. A sua escolha muda só a aparência.',
          '[apontar bloco "No grupo asteroides criar um sprite"]',
        ),
        A(locate('Quando acontecer'), '[arrastar até "Quando acontecer"]'),
        A(
          'No evento de Espaço, encontre o bloco que cria o sprite no grupo tiros. Clique na imagem, como laser-ciano, e escolha a aparência que quiser entre os três lasers. Manter o atual também vale.',
          '[abrir campo "laser-ciano" em "No grupo tiros criar um sprite"] [escolher "laser-dourado" em "No grupo tiros criar um sprite"]',
        ),
        A(
          'Conserve largura10, altura28, a origem lida da nave e as velocidades. Se quiser rever nave e cenário, os dois campos de imagem continuam em Ao iniciar.',
          '[apontar bloco "No grupo tiros criar um sprite"] [arrastar até "Ao iniciar"]',
        ),
      ],
      tests: [
        A(
          'Comece a partida e confira sua combinação. Mova, dispare e acerte uma pedra. O jogo continua com as mesmas regras, enquanto os desenhos mostram suas escolhas.',
          '[tocar prévia 400 300] [tecla Enter] [segurar tecla ArrowRight por 0,4 s] [tecla Space] [apontar prévia 400 240]',
        ),
      ],
      correction:
        'as trocas ficaram nos campos das imagens, e os nomes, tamanhos, posições, velocidades e intervalo continuam como você construiu',
      labels: [
        'No grupo asteroides criar um sprite com imagem',
        'No grupo tiros criar um sprite com imagem',
      ],
      types: ['sz_g2d_spawn_image_in_group'],
    }),
    practice({
      key: 'entrega',
      title: 'Confira o começo e envie seu visual',
      etapa: 'aparencias',
      intro: [
        A(
          'Sua partida espera a hora certa e ganhou a combinação de imagens que você escolheu. Confira e envie esta versão.',
          '[apontar prévia 400 240]',
        ),
      ],
      actions: [
        A(
          'Clique em Rodar de novo. Confira a abertura e pressione Enter para entrar na partida.',
          '[rodar de novo] [tecla Enter]',
        ),
      ],
      tests: [
        A(
          'Confira as imagens da nave, do cenário, das pedras e dos lasers. Teste movimento, um acerto que soma ponto e uma batida que tira vida. As regras continuam funcionando juntas.',
          '[apontar prévia 400 240] [tecla Space]',
        ),
      ],
      correction:
        'os três lugares de ação continuam protegidos por Se jogando e a personalização ficou nas imagens',
      labels: [],
      types: [],
      delivery: true,
      conquest: 'Você conferiu o início e deu sua identidade visual à partida!',
    }),
  ],
}

const aula9: ConstrutorAula = {
  slug: 'dia-5',
  title: 'Termine e recomece a partida',
  entryStage: 'aparencias',
  entry:
    'Jogo com todas as regras de voo, encontro, contagem e vidas; ainda sem condição que chame vitória ou derrota.',
  outcome:
    'Meta de vinte acertos, resultado único, partida parada depois do resultado e novo começo limpo com Enter; projeto final testado e enviado.',
  trechos: [
    experiment(
      'meta-do-jogo',
      'O acerto que completa a missão',
      'meta',
      [
        'Sua missão é abrir a rota acertando vinte asteroides. Pense numa coleção que fica completa quando você reúne a quantidade combinada. A contagem pode crescer, enquanto a quantidade necessária continua a mesma.',
        'No jogo, a contagem guarda quantos acertos você já fez. A meta informa os vinte que você quer alcançar. A pergunta de vitória compara esses dois valores, para reconhecer que a missão foi completada.',
      ],
      'Compare os acertos com a meta de vinte e descubra quando a missão está completa.',
      'Se a contagem passar de vinte, a missão deixa de estar completa?',
    ),
    practice({
      key: 'meta',
      title: 'Prepare a meta e mostre o progresso',
      etapa: 'meta',
      intro: [
        A(
          'Seu placar já conta os acertos. Agora prepare a meta de vinte e mostre quanto falta para a missão.',
          '[apontar prévia 60 32]',
        ),
      ],
      actions: [
        A(locate('Ao iniciar'), '[arrastar até "Ao iniciar"]'),
        A(
          'Encontre Criar variável pontos. Deixe à vista o encaixe depois dela e antes de dar vidas à nave.',
          '[apontar abaixo de "Criar variável pontos"]',
        ),
        A(
          'Abra Programação e depois Variáveis. Pegue Criar variável e solte nesse encaixe. Troque contador por meta e o valor0 por20.',
          '[abrir categoria Programação > Variáveis] [encaixar "Criar variável" abaixo de "Criar variável pontos"] [trocar "contador" por "meta" em "Criar variável contador"] [trocar "0" por "20" em "Criar variável meta"]',
        ),
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Encontre o placar Acertos. Deixe o encaixe depois dele à vista. Abra Jogo2D, depois Vida e placar e depois Indicadores e texto na tela.',
          '[apontar abaixo de "Mostrar placar Acertos:"] [abrir categoria Jogo 2D > Vida e placar > Indicadores e texto na tela]',
        ),
        A(
          'Pegue Mostrar placar e solte depois de Acertos, antes dos corações. Troque Pontos: por Meta:. No x, coloque650; no y,32; e no tamanho,21.',
          '[encaixar "Mostrar placar" abaixo de "Mostrar placar Acertos:"] [trocar "Pontos:" por "Meta:" em "Mostrar placar Pontos:"] [trocar "12" por "650" em "Mostrar placar Meta:"] [trocar "30" por "32" em "Mostrar placar Meta:"] [trocar "24" por "21" em "Mostrar placar Meta:"]',
        ),
        A(
          'Abra Programação e depois Valores. Pegue valor da variável e solte em cima do número do placar Meta. Troque x por meta nesse bloco de valor.',
          '[abrir categoria Programação > Valores] [soltar "valor da variável" em cima do "0" em "Mostrar placar Meta:"] [trocar "x" por "meta" em "valor da variável dentro de Mostrar placar Meta:"]',
        ),
        A(
          'Deixe à vista o encaixe depois de Desenhar as vidas e antes da legenda. Volte a Jogo2D, Vida e placar, Indicadores e texto na tela. Pegue Barra de e solte nesse encaixe.',
          '[apontar abaixo de "Desenhar as vidas"] [abrir categoria Jogo 2D > Vida e placar > Indicadores e texto na tela] [encaixar "Barra de" abaixo de "Desenhar as vidas"]',
        ),
        A(
          'Na barra, coloque x280, y23, largura240 e altura11.',
          '[trocar "12" por "280" em "Barra de"] [trocar "48" por "23" em "Barra de"] [trocar "160" por "240" em "Barra de"] [trocar "14" por "11" em "Barra de"]',
        ),
        A(
          'Clique no quadradinho de cor da barra e escolha na paleta uma cor bem viva: é ela que vai encher conforme você acerta.',
          '[apontar bloco "Barra de"]',
        ),
        A(
          'Abra Programação, Valores. Encaixe valor da variável no valor da barra e escolha pontos. Encaixe outro valor da variável no total e escolha meta. A barra vai comparar o que você já conseguiu com a missão completa.',
          '[abrir categoria Programação > Valores] [soltar "valor da variável" em cima do "0" em "Barra de"] [trocar "x" por "pontos" em "valor da variável dentro de Barra de"] [soltar "valor da variável" em cima do "100" em "Barra de"] [trocar "x" por "meta" em "valor da variável dentro de Barra de"]',
        ),
      ],
      tests: [
        A(
          'Comece e acerte algumas pedras. Acertos aumenta, a barra vai preenchendo e Meta continua em20. Ainda falta construir a pergunta que termina a partida.',
          '[tocar prévia 400 300] [tecla Enter] [tecla Space] [apontar prévia 680 32]',
        ),
      ],
      correction:
        'meta começa em20, o novo placar lê meta e a barra lê pontos como valor e meta como total',
      labels: [
        'Criar variável meta com valor20',
        'Mostrar placar Meta:',
        'valor da variável meta',
        'Barra de',
      ],
      types: ['sz_js_var_create', 'sz_g2d_draw_score', 'sz_val_variable', 'sz_g2d_draw_bar'],
    }),
    practice({
      key: 'finais',
      title: 'Chame a vitória ao completar a meta',
      etapa: 'vitoria',
      intro: [
        A(
          'A tela de vitória já está preparada. Sua construção agora é decidir quando o jogo deve chegar nela.',
          '[apontar bloco "o estado do jogo é vitoria"]',
        ),
      ],
      actions: [
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Dentro de A cada quadro do jogo, encontre o então de Se jogando. Deixe à vista o encaixe depois do bloco inteiro da colisão da nave.',
          '[apontar abaixo de "Para cada sprite do grupo"]',
        ),
        A(
          'Abra Programação e depois Lógica & Se. Pegue Se e solte depois da colisão, ainda dentro de Se jogando.',
          '[abrir categoria Programação > Lógica & Se] [encaixar "Se" abaixo de "Para cada sprite do grupo"]',
        ),
        A(
          'Na pergunta que chegou com x maior que0, clique no sinal de maior e escolha maior ou igual. Abra Programação, Valores, e encaixe valor da variável no lugar de x. Escolha pontos.',
          '[trocar ">" por "≥" em "Se abaixo de Para cada sprite do grupo"] [abrir categoria Programação > Valores] [soltar "valor da variável" em cima do "x" em "Se abaixo de Para cada sprite do grupo"] [trocar "x" por "pontos" em "valor da variável dentro de Se abaixo de Para cada sprite do grupo"]',
        ),
        A(
          'Encaixe outro valor da variável no lugar do0 do lado direito e escolha meta. A pergunta fica: pontos é maior ou igual a meta?',
          '[soltar "valor da variável" em cima do "0" em "Se abaixo de Para cada sprite do grupo"] [trocar "x" por "meta" em "valor da variável dentro de Se abaixo de Para cada sprite do grupo"]',
        ),
        A(
          'Deixe o então desse novo Se à vista. Abra Jogo2D, depois Jogo e telas e depois Telas e partida. Pegue Mudar o estado do jogo e solte dentro desse então.',
          '[apontar encaixe em "Se valor da variável pontos" no "então"] [abrir categoria Jogo 2D > Jogo e telas > Telas e partida] [encaixar "Mudar o estado do jogo" em "Se valor da variável pontos" no "então"]',
        ),
        A(
          'Troque inicio por vitoria, sem acento, nesse bloco. A regra seleciona a tela pronta quando você completa a missão.',
          '[trocar "inicio" por "vitoria" em "Mudar o estado do jogo dentro de Se valor da variável pontos"]',
        ),
      ],
      tests: [
        A(
          'Comece a partida e acerte vinte asteroides. Quando a contagem alcançar a meta, aparece Rota aberta!. Depois da vitória, setas e Espaço não continuam a partida. Pressione Enter para voltar ao início. A derrota será acrescentada na próxima parte.',
          '[tocar prévia 400 300] [tecla Enter] [apontar prévia 400 240]',
        ),
      ],
      correction:
        'a pergunta pontos maior ou igual a meta fica depois das colisões, dentro de Se jogando, e seu então muda o estado para vitoria',
      labels: [
        'Se ... então',
        'valor da variável pontos',
        '≥',
        'valor da variável meta',
        'Mudar o estado do jogo para vitoria',
      ],
      types: ['sz_js_if_else', 'sz_val_compare', 'sz_val_variable', 'sz_g2d_set_scene'],
    }),
    practice({
      key: 'derrota',
      title: 'Escolha um único resultado',
      etapa: 'derrota',
      intro: [
        A(
          'Se as vidas acabarem, a missão termina com a tela de nova tentativa. Agora imagine: no mesmo instante em que o seu laser faz o vigésimo acerto, outra pedra bate na nave e leva o último coração. Qual tela aparece? Sem uma ordem, o jogo poderia tentar mostrar as duas. Por isso a regra será: primeiro conferir as vidas; só se ainda houver vida, conferir a vitória.',
          '[apontar bloco "Se valor da variável pontos"]',
        ),
      ],
      actions: [
        A(locate('Enquanto estiver rodando'), '[arrastar até "Enquanto estiver rodando"]'),
        A(
          'Dentro de Se jogando, encontre a pergunta de vitória que você acabou de construir. Deixe à vista o encaixe antes dela, logo depois da colisão da nave.',
          '[apontar abaixo de "Para cada sprite do grupo"]',
        ),
        A(
          'Abra Programação, Lógica & Se. Pegue outro Se e solte entre a colisão da nave e a pergunta de vitória.',
          '[abrir categoria Programação > Lógica & Se] [encaixar "Se" abaixo de "Para cada sprite do grupo"]',
        ),
        A(
          'Esse novo Se chega com x maior que0. Pegue essa pergunta pelo sinal de maior e leve à lixeira. Conserve o Se.',
          '[jogar na lixeira ">" em "Se abaixo de Para cada sprite do grupo"]',
        ),
        A(
          'Abra Jogo2D, Vida e placar, Vida. Pegue as vidas do sprite acabaram? e solte no espaço da pergunta vazia. Troque jogador por nave.',
          '[abrir categoria Jogo 2D > Vida e placar > Vida] [encaixar "as vidas do sprite" em "Se abaixo de Para cada sprite do grupo" no "se"] [trocar "jogador" por "nave" em "as vidas do sprite"]',
        ),
        A(
          'Deixe o então desse Se à vista. Abra Jogo2D, Jogo e telas, Telas e partida. Pegue Mudar o estado do jogo e solte no então. Troque inicio por derrota.',
          '[apontar encaixe em "Se as vidas do sprite" no "então"] [abrir categoria Jogo 2D > Jogo e telas > Telas e partida] [encaixar "Mudar o estado do jogo" em "Se as vidas do sprite" no "então"] [trocar "inicio" por "derrota" em "Mudar o estado do jogo dentro de Se as vidas do sprite"]',
        ),
        A(
          'No Se das vidas, encontre os dois sinais de mais. Clique no segundo mais, o que fica antes da palavra senão. Isso abre o espaço que será usado quando as vidas ainda não acabaram.',
          '[apontar mais de "senão" em "Se as vidas do sprite"] [abrir "senão" em "Se as vidas do sprite"]',
        ),
        A(
          'Pegue a pergunta de vitória inteira pela palavra Se. Leve esse bloco, com o Mudar para vitoria que está dentro, para o espaço do senão do Se das vidas.',
          '[mover "Se valor da variável pontos" para "Se as vidas do sprite" no "senão"]',
        ),
      ],
      tests: [
        A(
          'Comece uma partida e deixe a nave perder as três vidas, esperando a proteção entre as batidas. Aparece a tela Tente outra rota. Setas e Espaço devem parar de agir.',
          '[tocar prévia 400 300] [tecla Enter] [apontar prévia 400 240]',
        ),
        A(
          'Pressione Enter para voltar à abertura e Enter outra vez para começar. Confira a vitória numa partida em que você completa vinte acertos com vida. Só um resultado deve aparecer.',
          '[tecla Enter] [tecla Enter] [apontar prévia 400 240]',
        ),
      ],
      correction:
        'o primeiro Se pergunta se as vidas da nave acabaram e chama derrota; o Se da vitória ficou inteiro dentro do senão desse primeiro Se',
      labels: [
        'Se ... então ... senão',
        'as vidas do sprite nave acabaram?',
        'Mudar o estado do jogo para derrota',
      ],
      types: ['sz_js_if_else', 'sz_g2d_health_depleted', 'sz_g2d_set_scene'],
    }),
    experiment(
      'reiniciar',
      'Uma partida de verdade começa de novo',
      'reinicio',
      [
        'Quando uma rodada de jogo de tabuleiro acaba, você pode olhar para a placa do começo e para as peças que ficaram na mesa. A placa diz que uma rodada vai começar; as peças mostram como a mesa está preparada.',
        'No seu jogo, também há a imagem da abertura e as coisas que pertencem à partida: nave, pedras, lasers, pontos e vidas. O reinício já está preparado. Agora você vai investigar a diferença entre mudar só a imagem e preparar a rodada inteira.',
      ],
      'Compare voltar só à tela inicial com preparar uma nova partida.',
      'Se eu voltar ao começo com pontos antigos, será mesmo uma nova partida?',
    ),
    quiz('quiz-final', 'Confira as regras da missão', [
      {
        id: 'meta',
        prompt:
          'A contagem chegou a20 ou passou disso. Qual pergunta reconhece que a meta foi alcançada?',
        options: [
          'pontos é maior ou igual a meta.',
          'pontos é menor que zero.',
          'meta é diferente de20.',
        ],
        correct: 0,
        explanation:
          'Maior ou igual reconhece a meta alcançada e continua verdadeira se a contagem passar dela.',
      },
      {
        id: 'resultado',
        prompt: 'Como o seu jogo escolhe só um resultado?',
        options: [
          'Abre as duas telas ao mesmo tempo.',
          'Confere as vidas; no senão, confere a vitória.',
          'Muda de tela a cada tiro.',
        ],
        correct: 1,
        explanation:
          'A derrota é conferida primeiro. A vitória só é conferida no senão, quando as vidas não acabaram.',
      },
      {
        id: 'reinicio',
        prompt: 'Depois do resultado, o que você espera ao usar Enter para recomeçar?',
        options: [
          'Só a abertura muda; os dados antigos ficam.',
          'A meta muda a cada rodada.',
          'A abertura volta com pontos zerados, três vidas e grupos vazios.',
        ],
        correct: 2,
        explanation:
          'O reinício preparado recomeça os dados da partida. Depois, outro Enter libera a nova rodada.',
      },
    ]),
    practice({
      key: 'entrega',
      title: 'Teste a missão completa e envie',
      etapa: 'final',
      exit: 'Próxima parte',
      intro: [
        A(
          'A missão está completa. Falta atualizar a descrição do jogo e conferir uma rodada nova, os dois resultados e o reinício.',
          '[apontar prévia 400 240]',
        ),
      ],
      actions: [
        A(locate('Ao iniciar'), '[arrastar até "Ao iniciar"]'),
        A(
          'Encontre o bloco que descreve o jogo para quem usa leitor de tela. No texto, escreva: Nave Contra Asteroides. Enter começa. Setas esquerda e direita movem a nave. Cada aperto de Espaço dispara um laser. Acerte 20 asteroides antes de perder as três vidas. Asteroides que passam sem bater não tiram vida. Enter, depois do resultado, volta ao início.',
          '[trocar "Projeto inicial de Nave Contra Asteroides. Enter começa. Cenário, nave, telas e reinício preparados; movimento e regras serão construídos nas aulas." por "Nave Contra Asteroides. Enter começa. Setas esquerda e direita movem a nave. Cada aperto de Espaço dispara um laser. Acerte 20 asteroides antes de perder as três vidas. Asteroides que passam sem bater não tiram vida. Enter, depois do resultado, volta ao início." em "Descrever o jogo"]',
        ),
        A('Clique em Rodar de novo para testar desde a abertura.', '[rodar de novo]'),
      ],
      tests: [
        A(
          'Antes de Enter, confira que setas e Espaço aguardam. Comece. Teste as duas direções, um laser por aperto, acertos somando pontos e batidas tirando vida com proteção.',
          '[tocar prévia 400 300] [segurar tecla ArrowRight por 0,3 s] [tecla Space] [tecla Enter] [segurar tecla ArrowLeft por 0,4 s] [tecla Space]',
        ),
        A(
          'Teste uma partida com vitória e outra com derrota. Depois de cada resultado, confira que a nave não continua a se mover, atirar ou receber novas pedras.',
          '[apontar prévia 400 240]',
        ),
        A(
          'Depois do resultado, pressione Enter. A abertura volta. Pressione Enter outra vez. Confira zero acertos, três vidas e uma partida sem tiros ou pedras da rodada anterior. Sua combinação de imagens continua a mesma.',
          '[tecla Enter] [tecla Enter] [apontar prévia 60 32] [apontar prévia 60 62]',
        ),
      ],
      correction:
        'as regras de resultado estão depois das colisões, dentro de Se jogando; a vitória está no senão das vidas, e os blocos preparados de Enter e reinício continuam no projeto',
      labels: ['Descrever o jogo para leitor de tela'],
      types: ['sz_g2d_set_stage_description'],
      delivery: true,
      conquest:
        'Você construiu a missão da nave: movimento, lasers, asteroides, acertos, vidas e o resultado da partida!',
    }),
    {
      key: 'compartilhar',
      title: 'Mostre sua rota espacial',
      kind: 'fecho',
      ponte:
        'Seu projeto já foi enviado! Se quiser, compartilhe o jogo no Mural e copie o link para mostrar à sua família. Você também pode concluir a aula sem publicar. Quando terminar, clique em Concluir aula.',
      text: spoken([
        '[pleased, lively voice] Olha quanta coisa você construiu! A nave responde, os lasers saem dela, as pedras chegam, os acertos contam e a partida sabe quando terminar. Agora alguém pode conhecer a rota que você preparou.',
        '[engaging, energetic, conversational voice] Seu projeto já foi enviado na parte anterior. Se quiser compartilhar, clique em Compartilhar no Estúdio. Confira o título e a descrição que aparecem. Clique em Gerar capa e veja se a imagem representa o seu jogo.',
        '[confident, clear, unhurried voice] Quando estiver pronto, clique em Publicar. Espere aparecer Seu jogo está no Mural!. Clique em Copiar link de jogar. Você pode pedir ajuda a um adulto para mostrar esse link à sua família.',
        '[reassuring, encouraging voice] Compartilhar é uma escolha sua. Se preferir, você pode guardar o projeto sem publicar agora.',
        '[upbeat, encouraging voice] Feche a janela quando terminar e clique em Concluir aula. A sua nave já tem uma missão para jogar de novo!',
      ]),
      screen:
        'A parte começa com o Estúdio à vista. No "clique em Compartilhar", abrir a revisão [compartilhar]. No "Confira o título e a descrição", apontar a revisão sem editar dados da criança. No "Clique em Gerar capa", gerar a capa de exemplo [tocar "Gerar capa"]. No "clique em Publicar", mostrar a publicação simulada do palco [tocar "Publicar"]. No "Clique em Copiar link de jogar", copiar o link de demonstração [tocar "Copiar link de jogar"]. No "Feche a janela", fechar [tocar "Fechar"]. No "clique em Concluir aula", concluir [concluir aula].',
      steps: [
        'Opcional: clique em Compartilhar, confira título e descrição, gere e confira a capa.',
        'Se quiser publicar, clique em Publicar e espere a confirmação.',
        'Copie o link de jogar para mostrar a quem você escolher; peça ajuda a um adulto se precisar.',
        'Você também pode concluir sem publicar. Feche a janela e clique em Concluir aula.',
      ],
      tests: [
        'O projeto já foi enviado na parte anterior; compartilhar não é uma nova entrega nem uma condição para concluir.',
      ],
      blockLabels: [],
      blockTypes: [],
    },
  ],
}

export const aulas2D: ConstrutorAula[] = [
  aula1,
  aula2,
  aula3,
  aula4,
  aula5,
  aula6,
  aula7,
  aula8,
  aula9,
].map((aula) => ({ ...aula, entry: human(aula.entry), outcome: human(aula.outcome) }))
