/**
 * Copy centralizada do Pensa, estruturada por mode ('kids' | 'adult').
 * Regras: humana e alegre, SEM travessão (—), sem jargão técnico (nunca
 * "PRD"/"MVP"); ciclos são "Versão 1, Versão 2".
 */

import type { PensaBuildEnv } from './types'
import { PensaApiError } from './types'

export type PensaCopyMode = 'kids' | 'adult'

/** Etapas de trabalho do mapa (sem o estado terminal 'done'). */
export type PensaPlanStage = 'z' | 'e' | 'r' | 'o'

export interface PensaStageCopy {
  name: string
  subtitle: string
}

export interface PensaCopy {
  stages: Record<PensaPlanStage, PensaStageCopy>
  kanban: Record<'backlog' | 'doing' | 'review' | 'done', string>
  list: {
    title: string
    subtitle: string
    create: string
    loading: string
    emptyTitle: string
    emptyBody: string
    /** CTA do estado vazio (rótulo DISTINTO do `create` do header). */
    emptyCta: string
  }
  card: {
    menuLabel: string
    rename: string
    archive: string
    open: string
  }
  newProject: {
    title: string
    nameLabel: string
    namePlaceholder: string
    submit: string
    cancel: string
    nameTooShort: string
  }
  rename: {
    title: string
    submit: string
    cancel: string
  }
  project: {
    back: string
    continue: string
    mapLabel: string
    chestLabel: string
    loading: string
    /** Convite da etapa Z no painel do mapa (a etapa já é jogável). */
    zIntro: string
    /** Convite da etapa E no painel do mapa (a etapa já é jogável). */
    eIntro: string
    /** Convite da etapa R no painel do mapa (a etapa já é jogável). */
    rIntro: string
    /** Convite da etapa O no painel do mapa (a etapa já é jogável). */
    oIntro: string
  }
  chat: {
    backToMap: string
    loading: string
    /** Boas-vindas LOCAL do Zappy quando a conversa está vazia (não vai ao servidor). */
    welcome: string
    /** Chips de partida fixos da conversa vazia. */
    starterChips: readonly string[]
    /** Chip fixo que leva o foco ao input. */
    writeChip: string
    inputLabel: string
    inputPlaceholder: string
    send: string
    thinking: string
    assistantName: string
    tracker: Record<'who' | 'problem' | 'action' | 'screens' | 'success', string>
    readyTitle: string
    readyBody: string
    readyCta: string
    viewIdeaCta: string
    generating: string
  }
  idea: {
    cardLabel: string
    confirm: string
    edit: string
    regenerate: string
    regenerateTitle: string
    regenerateBody: string
    regenerateConfirm: string
    regenerateCancel: string
  }
  stageE: {
    loading: string
    heroTitle: string
    heroBody: string
    drawCta: string
    /** Espera da geração (pode levar ~30s). */
    generating: string
    generatingHint: string
    /** Rótulos curtos da barra de progresso das 3 partes. */
    progress: Record<'flows' | 'screens' | 'identity', string>
    flowsTitle: string
    screensTitle: string
    identityTitle: string
    approve: string
    approvedBadge: string
    change: string
    /** Rótulos dos 3 quadrinhos da tirinha. */
    strip: Record<'input' | 'processing' | 'output', string>
    stripScreensLabel: string
    /** Conteúdo do spec ilegível (malformado) → oferecer redesenhar. */
    specBrokenBody: string
    redoCta: string
    allDoneTitle: string
    allDoneBody: string
    advanceCta: string
    feedback: {
      label: string
      placeholder: string
      submit: string
      cancel: string
      warning: string
      tooShort: string
    }
    identity: {
      intro: string
      steps: Record<'name' | 'palette' | 'icon', string>
      loadingSuggestions: string
      nameQuestion: string
      inventName: string
      inventNameLabel: string
      inventNamePlaceholder: string
      inventNameSubmit: string
      nameTooShort: string
      paletteQuestion: string
      paletteHint: string
      back: string
      iconQuestion: string
      loadingIcons: string
      iconAlt: string
      regenerateIcons: string
      skipIcon: string
      save: string
      saving: string
      doneTitle: string
      doneBody: string
      noIcon: string
    }
  }
  buildEnv: {
    /** Título do chooser "Onde você vai construir?". */
    title: string
    subtitle: string
    /** Badge do cartão recomendado (embedded). */
    recommended: string
    /** Os 3 cartões grandes do chooser. */
    cards: Record<PensaBuildEnv, { title: string; body: string }>
    /** Chip discreto no header da etapa R mostrando a escolha. */
    chip: Record<PensaBuildEnv, string>
    /** Botão que reabre o chooser (sem perder nada). */
    change: string
    /** Fecha o chooser reaberto mantendo a escolha atual. */
    keep: string
    /** Linha gentil da missão no env 'external' (no lugar de "Abrir o Estúdio"). */
    externalGuidance: string
  }
  stageR: {
    loading: string
    heroTitle: string
    heroBody: string
    createCta: string
    /** Espera da geração das missões (pode levar ~30s). */
    generating: string
    generatingHint: string
    /** Reload com plano salvo mas sem quadro vivo (v1 sem GET de tasks). */
    regenTitle: string
    regenBody: string
    regenCta: string
    boardLabel: string
    /** aria-label das abas de coluna no mobile. */
    columnsLabel: string
    /** Dica exibida numa coluna VAZIA (orienta a criança sobre o que vai ali). */
    emptyColumn: Record<'backlog' | 'doing' | 'review' | 'done', string>
    /** Anúncio (aria-live) quando um card muda de coluna. */
    movedTo(column: string): string
    /** Destaque da "próxima recomendada" (primeira do backlog). */
    nextUp: string
    /** Botão de estado do card, por coluna. */
    cardStart: string
    cardTest: string
    cardFinish: string
    cardDoneBadge: string
    /** Prefixo do aria-label do botão que abre a missão. */
    openMission: string
    backToBoard: string
    storyLabel: string
    stepsLabel: string
    hintToggle: string
    blocksLabel: string
    doneWhenLabel: string
    /** Ajuda quando o "Consegui!" ainda está travado pelos checks. */
    finishHint: string
    openStudio: string
    /** Ponte com o ateliê (só com adapter.onOpenPinta). */
    openPinta: string
    /** Gaveta do Modo Missão (split). */
    hideMission: string
    showMission: string
    /** Dialog da regra "1 missão em Fazendo agora". */
    swapTitle: string
    swapBody: string
    swapConfirm: string
    swapCancel: string
    allDoneTitle: string
    allDoneBody: string
    advanceCta: string
    xpToast(xp: number): string
  }
  stageO: {
    loading: string
    heroTitle: string
    heroBody: string
    prepareCta: string
    generating: string
    generatingHint: string
    /** Reload com seed salva mas sem itens vivos (o re-seed zera os checks). */
    reseedNotice: string
    optionalChip: string
    progressLabel(done: number, total: number): string
    openStudio: string
    launchCta: string
    /** Ajuda quando o "Lançar!" está travado: diz QUAIS obrigatórios faltam. */
    launchHint(missing: string[]): string
  }
  launch: {
    title: string
    /** Texto do selo carimbado na Carta da Ideia. */
    stamp(cycleNumber: number): string
    body: string
    xpChip(xp: number): string
    /** Genérico: a apresentação das badges é papel do HOST. */
    badgeUnlocked: string
    close: string
  }
  newCycle: {
    doneTitle(cycleNumber: number): string
    doneBody: string
    cta(nextNumber: number): string
    dialogTitle: string
    goalLabel: string
    goalPlaceholder: string
    /** Sugestões FIXAS de objetivo (viram o texto do campo ao clicar). */
    chips: readonly string[]
    submit: string
    cancel: string
    tooShort: string
  }
  errors: {
    title: string
    retry: string
  }
}

const KIDS_COPY: PensaCopy = {
  stages: {
    z: { name: 'Zerar a Bagunça', subtitle: 'Vamos organizar todas as suas ideias' },
    e: { name: 'Enxergar o Jogo', subtitle: 'Hora de imaginar como o jogo vai ser' },
    r: { name: 'Rodar as Missões', subtitle: 'Mãos à obra, uma missão de cada vez' },
    o: { name: 'O Grande Lançamento', subtitle: 'Deixe tudo pronto para mostrar ao mundo' },
  },
  kanban: {
    backlog: 'Missões',
    doing: 'Fazendo agora',
    review: 'Hora de testar',
    done: 'Prontas',
  },
  list: {
    title: 'Meus planos de jogo',
    subtitle: 'Toda grande ideia começa com um plano. Qual vamos criar hoje?',
    create: 'Criar um jogo novo',
    loading: 'Buscando seus planos...',
    emptyTitle: 'Nenhum plano por aqui ainda',
    emptyBody:
      'Todo jogo incrível nasce de um plano! Nessas quatro etapas, o Zappy ajuda você a transformar a sua ideia em missões para construir de verdade.',
    emptyCta: 'Planejar meu primeiro jogo',
  },
  card: {
    menuLabel: 'Mais opções do projeto',
    rename: 'Renomear',
    archive: 'Arquivar',
    open: 'Abrir projeto',
  },
  newProject: {
    title: 'Como vai se chamar seu jogo?',
    nameLabel: 'Nome do jogo',
    namePlaceholder: 'Ex.: Aventura do Dino Espacial',
    submit: 'Criar e começar',
    cancel: 'Agora não',
    nameTooShort: 'O nome precisa ter pelo menos 2 letras. Capricha!',
  },
  rename: {
    title: 'Qual vai ser o novo nome?',
    submit: 'Salvar nome',
    cancel: 'Deixa como está',
  },
  project: {
    back: 'Voltar para meus planos',
    continue: 'Continuar',
    mapLabel: 'Mapa da criação',
    chestLabel: 'Baú do lançamento',
    loading: 'Abrindo seu plano...',
    zIntro:
      'O Zappy quer conhecer sua ideia! Vocês vão conversar e deixar tudo organizado para começar.',
    eIntro:
      'Hora de enxergar seu jogo! O Zappy vai desenhar como ele funciona, as telas e a cara dele.',
    rIntro:
      'Mãos à obra! O Zappy vai dividir seu jogo em missões pequenas para você construir no Estúdio.',
    oIntro: 'Falta pouco! Vamos conferir os últimos passos e lançar seu jogo para o mundo.',
  },
  chat: {
    backToMap: 'Voltar ao mapa',
    loading: 'Chamando o Zappy...',
    welcome: 'Oi! Eu sou o Zappy. Me conta: que jogo você quer criar?',
    starterChips: [
      'Um jogo de desviar',
      'Um jogo de pegar coisas',
      'Um jogo de nave',
      'Ainda não sei, me ajuda',
    ],
    writeChip: 'Quero escrever',
    inputLabel: 'Sua mensagem para o Zappy',
    inputPlaceholder: 'Escreva aqui sua resposta...',
    send: 'Enviar',
    thinking: 'Zappy está pensando...',
    assistantName: 'Zappy',
    tracker: {
      who: 'Quem?',
      problem: 'Diversão',
      action: 'Ação',
      screens: 'Telas',
      success: 'Ficou bom',
    },
    readyTitle: 'Uhuu! Você respondeu tudo!',
    readyBody: 'Sua ideia está prontinha. Vamos transformar ela numa carta especial?',
    readyCta: 'Criar a Carta da Ideia',
    viewIdeaCta: 'Ver a Carta da Ideia',
    generating: 'Escrevendo a carta...',
  },
  idea: {
    cardLabel: 'Carta da Ideia',
    confirm: 'É isso!',
    edit: 'Quero mudar uma coisa',
    regenerate: 'Refazer a Carta',
    regenerateTitle: 'Refazer a Carta da Ideia?',
    regenerateBody:
      'O Zappy vai escrever uma carta novinha com tudo o que vocês conversaram. A carta de agora será trocada pela nova.',
    regenerateConfirm: 'Sim, refazer',
    regenerateCancel: 'Deixa essa mesmo',
  },
  stageE: {
    loading: 'Abrindo os desenhos do seu jogo...',
    heroTitle: 'Bora enxergar seu jogo?',
    heroBody:
      'O Zappy vai transformar sua ideia em desenhos: como o jogo funciona, as telas e a cara dele!',
    drawCta: 'Desenhar meu jogo',
    generating: 'O Zappy está desenhando seu jogo...',
    generatingHint: 'Isso pode levar um tempinho. Respira fundo que já vem coisa boa!',
    progress: { flows: 'Funciona', screens: 'Telas', identity: 'Cara' },
    flowsTitle: 'Como o jogo funciona',
    screensTitle: 'As telas do jogo',
    identityTitle: 'A cara do jogo',
    approve: 'Tá certo!',
    approvedBadge: 'Aprovado!',
    change: 'Mudar',
    strip: {
      input: 'Quando o jogador...',
      processing: '...o jogo...',
      output: '...e aparece na tela...',
    },
    stripScreensLabel: 'Telas desta parte:',
    specBrokenBody: 'O desenho veio embaralhado. Vamos pedir um novinho para o Zappy?',
    redoCta: 'Desenhar de novo',
    allDoneTitle: 'Uau, ficou pronto!',
    allDoneBody: 'Seu jogo já tem desenho, telas e uma cara linda. Agora é construir!',
    advanceCta: 'Tudo certo! Rodar as missões',
    feedback: {
      label: 'O que você quer mudar?',
      placeholder: 'Ex.: quero uma tela de recorde',
      submit: 'Pedir a mudança',
      cancel: 'Deixa assim',
      warning: 'O Zappy vai refazer o desenho inteiro com a sua mudança.',
      tooShort: 'Escreve um pouquinho mais para o Zappy entender direitinho.',
    },
    identity: {
      intro: 'Hora de escolher o nome, as cores e o símbolo do seu jogo!',
      steps: { name: 'Nome', palette: 'Cores', icon: 'Símbolo' },
      loadingSuggestions: 'O Zappy está pensando em nomes e cores...',
      nameQuestion: 'Como seu jogo vai se chamar?',
      inventName: 'Quero inventar o meu',
      inventNameLabel: 'Nome inventado por você',
      inventNamePlaceholder: 'Escreva o nome do jogo',
      inventNameSubmit: 'Usar esse nome',
      nameTooShort: 'O nome precisa ter pelo menos 2 letras. Capricha!',
      paletteQuestion: 'Quais cores são a cara do jogo?',
      paletteHint: 'Olha as telinhas ali em cima mudando de cor na hora!',
      back: 'Voltar um passo',
      iconQuestion: 'Qual símbolo combina com o jogo?',
      loadingIcons: 'Desenhando símbolos especiais...',
      iconAlt: 'Símbolo',
      regenerateIcons: 'Gerar outros',
      skipIcon: 'Ficar sem ícone por enquanto',
      save: 'Salvar a cara do jogo',
      saving: 'Guardando tudo...',
      doneTitle: 'A cara do jogo ficou assim',
      doneBody: 'Que capricho! Seu jogo vai aparecer assim para todo mundo:',
      noIcon: 'Sem símbolo por enquanto',
    },
  },
  buildEnv: {
    title: 'Onde você vai construir?',
    subtitle: 'Escolha o seu jeito favorito de criar. Dá pra trocar quando quiser!',
    recommended: 'Recomendado',
    cards: {
      embedded: {
        title: 'Aqui, junto da missão',
        body: 'O Estúdio abre do ladinho da missão. Você lê o passo e já constrói, tudo junto!',
      },
      studio: {
        title: 'No Estúdio Completo',
        body: 'Você constrói no Estúdio em tela grande e volta aqui para marcar as missões.',
      },
      external: {
        title: 'No meu computador',
        body: 'Você constrói com as suas ferramentas e volta aqui para marcar o que ficou pronto.',
      },
    },
    chip: {
      embedded: 'Construindo aqui',
      studio: 'Construindo no Estúdio',
      external: 'Construindo no meu computador',
    },
    change: 'Trocar',
    keep: 'Deixa como está',
    externalGuidance: 'Siga os passos no seu computador e volte pra marcar o que ficou pronto!',
  },
  stageR: {
    loading: 'Abrindo o quadro de missões...',
    heroTitle: 'Bora construir de verdade?',
    heroBody:
      'O Zappy vai transformar seu plano em missões pequenas. Uma de cada vez, você constrói o jogo inteiro!',
    createCta: 'Criar as missões',
    generating: 'O Zappy está preparando suas missões...',
    generatingHint: 'Isso pode levar um tempinho. Já já a aventura começa!',
    regenTitle: 'Suas missões estão guardadas!',
    regenBody:
      'Para abrir o quadro de novo, o Zappy recria as missões do zero. O progresso do quadro recomeça, tá bem?',
    regenCta: 'Recriar as missões',
    boardLabel: 'Quadro de missões',
    columnsLabel: 'Colunas do quadro',
    emptyColumn: {
      backlog: 'Nenhuma missão esperando. Tudo em andamento!',
      doing: 'Toque em Começar numa missão para trazer ela pra cá!',
      review: 'Quando uma missão funcionar, ela vem pra cá pra você testar.',
      done: 'As missões que você terminar aparecem aqui. Bora!',
    },
    movedTo: (column) => `Missão foi para ${column}!`,
    nextUp: 'Próxima!',
    cardStart: 'Começar',
    cardTest: 'Já funciona? Teste!',
    cardFinish: 'Consegui!',
    cardDoneBadge: 'Feita!',
    openMission: 'Ver a missão',
    backToBoard: 'Voltar às missões',
    storyLabel: 'A história',
    stepsLabel: 'Passo a passo',
    hintToggle: 'Dica do Zappy',
    blocksLabel: 'Blocos que ajudam',
    doneWhenLabel: 'Ficou pronto quando...',
    finishHint: 'Marque tudo o que ficou pronto para concluir a missão!',
    openStudio: 'Abrir o Estúdio',
    openPinta: 'Desenhar no Pinta',
    hideMission: 'Esconder a missão',
    showMission: 'Mostrar a missão',
    swapTitle: 'Trocar de missão?',
    swapBody:
      'Você já tem uma missão em andamento. Quer trocar? A de agora volta para a fila de missões.',
    swapConfirm: 'Sim, trocar',
    swapCancel: 'Continuar na atual',
    allDoneTitle: 'Todas as missões prontas!',
    allDoneBody: 'Seu jogo está construído! Agora só falta preparar o grande lançamento.',
    advanceCta: 'Missões prontas! Hora do lançamento',
    xpToast: (xp) => `+${xp} XP! Você mandou muito bem!`,
  },
  stageO: {
    loading: 'Abrindo o checklist do lançamento...',
    heroTitle: 'Chegou o grande dia!',
    heroBody: 'Antes de mostrar seu jogo para o mundo, vamos conferir uns últimos passos juntos.',
    prepareCta: 'Preparar o lançamento',
    generating: 'Preparando o checklist...',
    generatingHint: 'Um segundinho, já estamos quase lá!',
    reseedNotice: 'Seu checklist recomeça do zero, mas é rapidinho marcar tudo de novo!',
    optionalChip: 'opcional',
    progressLabel: (done, total) => `${done} de ${total} passos obrigatórios prontos`,
    openStudio: 'Abrir o Estúdio',
    launchCta: 'Lançar!',
    launchHint: (missing) =>
      missing.length > 0
        ? `Falta pouco! Ainda: ${missing.join(', ')}.`
        : 'Complete os passos obrigatórios para lançar.',
  },
  launch: {
    title: 'Você lançou seu jogo!',
    stamp: (cycleNumber) => `Versão ${cycleNumber} lançada`,
    body: 'Sua ideia virou um jogo de verdade. Que orgulho de você!',
    xpChip: (xp) => `+${xp} XP`,
    badgeUnlocked: 'Nova conquista desbloqueada!',
    close: 'Ver meu projeto',
  },
  newCycle: {
    doneTitle: (cycleNumber) => `Você ZEROU a Versão ${cycleNumber}!`,
    doneBody: 'Seu jogo está no mundo! Que tal deixar ele ainda mais incrível numa nova versão?',
    cta: (nextNumber) => `Criar a Versão ${nextNumber}`,
    dialogTitle: 'O que vem na próxima versão?',
    goalLabel: 'O que vamos adicionar?',
    goalPlaceholder: 'Ex.: uma fase nova bem difícil',
    chips: ['Mais fases', 'Sons novos', 'Recorde salvo'],
    submit: 'Começar a nova versão',
    cancel: 'Agora não',
    tooShort: 'Escreve um pouquinho mais para o Zappy entender o plano!',
  },
  errors: {
    title: 'Ops, algo não deu certo',
    retry: 'Tentar de novo',
  },
}

const ADULT_COPY: PensaCopy = {
  stages: {
    z: { name: 'Zerar a Confusão', subtitle: 'Organize as ideias antes de tudo' },
    e: { name: 'Esboçar o Sistema', subtitle: 'Desenhe como o projeto vai funcionar' },
    r: { name: 'Rodar por Partes', subtitle: 'Construa em etapas pequenas e testáveis' },
    o: { name: 'Operar de Verdade', subtitle: 'Prepare o projeto para o mundo real' },
  },
  kanban: {
    backlog: 'A fazer',
    doing: 'Fazendo',
    review: 'Em revisão',
    done: 'Concluídas',
  },
  list: {
    title: 'Meus projetos',
    subtitle: 'Todo bom projeto começa com um plano claro.',
    create: 'Criar projeto novo',
    loading: 'Carregando seus projetos...',
    emptyTitle: 'Nenhum projeto ainda',
    emptyBody:
      'Todo bom projeto nasce de um plano. Nessas quatro etapas você transforma a ideia em missões executáveis.',
    emptyCta: 'Planejar o primeiro projeto',
  },
  card: {
    menuLabel: 'Mais opções do projeto',
    rename: 'Renomear',
    archive: 'Arquivar',
    open: 'Abrir projeto',
  },
  newProject: {
    title: 'Como o projeto vai se chamar?',
    nameLabel: 'Nome do projeto',
    namePlaceholder: 'Ex.: Meu primeiro jogo',
    submit: 'Criar e começar',
    cancel: 'Cancelar',
    nameTooShort: 'O nome precisa ter pelo menos 2 caracteres.',
  },
  rename: {
    title: 'Novo nome do projeto',
    submit: 'Salvar nome',
    cancel: 'Cancelar',
  },
  project: {
    back: 'Voltar para meus projetos',
    continue: 'Continuar',
    mapLabel: 'Mapa da criação',
    chestLabel: 'Lançamento',
    loading: 'Abrindo o projeto...',
    zIntro: 'Converse com o Zappy para organizar sua ideia antes de construir.',
    eIntro: 'O Zappy desenha o esboço do projeto com você: funcionamento, telas e identidade.',
    rIntro: 'O Zappy divide o projeto em missões pequenas para você construir no Estúdio.',
    oIntro: 'Confira os últimos passos do checklist e lance o projeto.',
  },
  chat: {
    backToMap: 'Voltar ao mapa',
    loading: 'Abrindo a conversa...',
    welcome: 'Olá! Eu sou o Zappy. Me conta: o que você quer criar?',
    starterChips: [
      'Um jogo de desviar',
      'Um jogo de coletar itens',
      'Um jogo de nave',
      'Ainda não sei, me ajuda',
    ],
    writeChip: 'Quero escrever',
    inputLabel: 'Sua mensagem para o Zappy',
    inputPlaceholder: 'Escreva sua resposta...',
    send: 'Enviar',
    thinking: 'Zappy está pensando...',
    assistantName: 'Zappy',
    tracker: {
      who: 'Quem?',
      problem: 'Diversão',
      action: 'Ação',
      screens: 'Telas',
      success: 'Ficou bom',
    },
    readyTitle: 'Tudo respondido!',
    readyBody: 'Sua ideia está clara. Vamos registrar tudo numa carta?',
    readyCta: 'Criar a Carta da Ideia',
    viewIdeaCta: 'Ver a Carta da Ideia',
    generating: 'Escrevendo a carta...',
  },
  idea: {
    cardLabel: 'Carta da Ideia',
    confirm: 'É isso!',
    edit: 'Quero mudar uma coisa',
    regenerate: 'Refazer a Carta',
    regenerateTitle: 'Refazer a Carta da Ideia?',
    regenerateBody:
      'Uma carta nova será escrita com base na conversa. A carta atual será substituída.',
    regenerateConfirm: 'Sim, refazer',
    regenerateCancel: 'Manter esta',
  },
  stageE: {
    loading: 'Abrindo o esboço do projeto...',
    heroTitle: 'Vamos esboçar o sistema?',
    heroBody:
      'O Zappy transforma sua ideia em um esboço: como o projeto funciona, as telas e a identidade.',
    drawCta: 'Desenhar meu projeto',
    generating: 'O Zappy está desenhando seu projeto...',
    generatingHint: 'Isso pode levar alguns segundos. Já estamos quase lá.',
    progress: { flows: 'Funcionamento', screens: 'Telas', identity: 'Identidade' },
    flowsTitle: 'Como o projeto funciona',
    screensTitle: 'As telas do projeto',
    identityTitle: 'A identidade do projeto',
    approve: 'Está certo',
    approvedBadge: 'Aprovado',
    change: 'Mudar',
    strip: {
      input: 'Quando o usuário...',
      processing: '...o sistema...',
      output: '...e aparece na tela...',
    },
    stripScreensLabel: 'Telas envolvidas:',
    specBrokenBody: 'O esboço veio ilegível. Vamos gerar um novo?',
    redoCta: 'Desenhar de novo',
    allDoneTitle: 'Tudo pronto!',
    allDoneBody: 'O projeto já tem esboço, telas e identidade. Hora de construir!',
    advanceCta: 'Tudo certo! Rodar por partes',
    feedback: {
      label: 'O que você quer mudar?',
      placeholder: 'Ex.: quero uma tela de placar',
      submit: 'Pedir a mudança',
      cancel: 'Deixar assim',
      warning: 'O esboço inteiro será refeito com a sua mudança.',
      tooShort: 'Escreva um pouco mais para o Zappy entender.',
    },
    identity: {
      intro: 'Escolha o nome, as cores e o símbolo do projeto.',
      steps: { name: 'Nome', palette: 'Cores', icon: 'Símbolo' },
      loadingSuggestions: 'O Zappy está pensando em nomes e cores...',
      nameQuestion: 'Como o projeto vai se chamar?',
      inventName: 'Quero escrever o meu',
      inventNameLabel: 'Nome escrito por você',
      inventNamePlaceholder: 'Escreva o nome do projeto',
      inventNameSubmit: 'Usar esse nome',
      nameTooShort: 'O nome precisa ter pelo menos 2 caracteres.',
      paletteQuestion: 'Quais cores combinam com o projeto?',
      paletteHint: 'As telas acima mudam de cor na hora.',
      back: 'Voltar um passo',
      iconQuestion: 'Qual símbolo combina com o projeto?',
      loadingIcons: 'Desenhando símbolos...',
      iconAlt: 'Símbolo',
      regenerateIcons: 'Gerar outros',
      skipIcon: 'Ficar sem ícone por enquanto',
      save: 'Salvar identidade',
      saving: 'Salvando...',
      doneTitle: 'A identidade ficou assim',
      doneBody: 'O projeto vai aparecer assim:',
      noIcon: 'Sem símbolo por enquanto',
    },
  },
  buildEnv: {
    title: 'Onde você vai construir?',
    subtitle: 'Escolha como prefere trabalhar. Dá para trocar quando quiser.',
    recommended: 'Recomendado',
    cards: {
      embedded: {
        title: 'Aqui, junto da missão',
        body: 'O Estúdio abre ao lado da missão. Você lê o passo e já constrói, no mesmo lugar.',
      },
      studio: {
        title: 'No Estúdio Completo',
        body: 'Você constrói no Estúdio em tela cheia e volta aqui para marcar as missões.',
      },
      external: {
        title: 'No meu computador',
        body: 'Você constrói com as suas ferramentas e volta aqui para marcar o que ficou pronto.',
      },
    },
    chip: {
      embedded: 'Construindo aqui',
      studio: 'Construindo no Estúdio',
      external: 'Construindo no meu computador',
    },
    change: 'Trocar',
    keep: 'Deixar como está',
    externalGuidance: 'Siga os passos no seu computador e volte para marcar o que ficou pronto.',
  },
  stageR: {
    loading: 'Abrindo o quadro de missões...',
    heroTitle: 'Vamos construir por partes?',
    heroBody:
      'O Zappy transforma o plano em missões pequenas e testáveis. Uma de cada vez, o projeto sai do papel.',
    createCta: 'Criar as missões',
    generating: 'O Zappy está preparando as missões...',
    generatingHint: 'Isso pode levar alguns segundos. Já estamos quase lá.',
    regenTitle: 'As missões estão guardadas',
    regenBody:
      'Para reabrir o quadro, o Zappy recria as missões do zero. O progresso do quadro recomeça.',
    regenCta: 'Recriar as missões',
    boardLabel: 'Quadro de missões',
    columnsLabel: 'Colunas do quadro',
    emptyColumn: {
      backlog: 'Nenhuma missão na fila.',
      doing: 'Use o botão Começar numa missão para trazê-la para cá.',
      review: 'Missões funcionando chegam aqui para o teste.',
      done: 'As missões concluídas aparecem aqui.',
    },
    movedTo: (column) => `Missão movida para ${column}.`,
    nextUp: 'Próxima',
    cardStart: 'Começar',
    cardTest: 'Funciona? Teste!',
    cardFinish: 'Concluída!',
    cardDoneBadge: 'Concluída',
    openMission: 'Ver a missão',
    backToBoard: 'Voltar às missões',
    storyLabel: 'O contexto',
    stepsLabel: 'Passo a passo',
    hintToggle: 'Dica do Zappy',
    blocksLabel: 'Blocos que ajudam',
    doneWhenLabel: 'Pronto quando...',
    finishHint: 'Marque os critérios prontos para concluir a missão.',
    openStudio: 'Abrir o Estúdio',
    openPinta: 'Desenhar no Pinta',
    hideMission: 'Esconder a missão',
    showMission: 'Mostrar a missão',
    swapTitle: 'Trocar de missão?',
    swapBody: 'Já existe uma missão em andamento. Ao trocar, a atual volta para a fila.',
    swapConfirm: 'Sim, trocar',
    swapCancel: 'Continuar na atual',
    allDoneTitle: 'Todas as missões concluídas!',
    allDoneBody: 'O projeto está construído. Agora é preparar o lançamento.',
    advanceCta: 'Missões prontas! Hora do lançamento',
    xpToast: (xp) => `+${xp} XP! Muito bem!`,
  },
  stageO: {
    loading: 'Abrindo o checklist do lançamento...',
    heroTitle: 'Hora de operar de verdade',
    heroBody: 'Antes de publicar, vamos conferir os últimos passos do lançamento.',
    prepareCta: 'Preparar o lançamento',
    generating: 'Preparando o checklist...',
    generatingHint: 'Um instante, já estamos quase lá.',
    reseedNotice: 'O checklist recomeça do zero. É rápido marcar tudo de novo.',
    optionalChip: 'opcional',
    progressLabel: (done, total) => `${done} de ${total} passos obrigatórios prontos`,
    openStudio: 'Abrir o Estúdio',
    launchCta: 'Lançar!',
    launchHint: (missing) =>
      missing.length > 0
        ? `Ainda faltam: ${missing.join(', ')}.`
        : 'Complete os passos obrigatórios para lançar.',
  },
  launch: {
    title: 'Projeto lançado!',
    stamp: (cycleNumber) => `Versão ${cycleNumber} lançada`,
    body: 'A ideia virou um projeto de verdade. Parabéns!',
    xpChip: (xp) => `+${xp} XP`,
    badgeUnlocked: 'Nova conquista desbloqueada!',
    close: 'Ver meu projeto',
  },
  newCycle: {
    doneTitle: (cycleNumber) => `Você ZEROU a Versão ${cycleNumber}!`,
    doneBody: 'O projeto está no mundo. Que tal evoluir para uma nova versão?',
    cta: (nextNumber) => `Criar a Versão ${nextNumber}`,
    dialogTitle: 'O que vem na próxima versão?',
    goalLabel: 'O que vamos adicionar?',
    goalPlaceholder: 'Ex.: uma tela de recordes',
    chips: ['Mais fases', 'Sons novos', 'Recorde salvo'],
    submit: 'Começar a nova versão',
    cancel: 'Agora não',
    tooShort: 'Escreva um pouco mais para o Zappy entender o plano.',
  },
  errors: {
    title: 'Algo não deu certo',
    retry: 'Tentar de novo',
  },
}

export function getCopy(mode: PensaCopyMode): PensaCopy {
  return mode === 'kids' ? KIDS_COPY : ADULT_COPY
}

/** Rótulo de ciclo: "Versão 1", "Versão 2"... (nunca "MVP"). */
export function versionLabel(cycleNumber: number): string {
  return `Versão ${cycleNumber}`
}

/**
 * Extrai o código de domínio de um erro do transport. Aceita tanto a CLASSE
 * `PensaApiError` quanto um erro duck-typed `{ status: number, code: string }`
 * (hosts que carregam o pacote por dynamic import lançam o shape, não a
 * classe — ver o transport do community-kids).
 */
function domainCode(error: unknown): string | null {
  if (error instanceof PensaApiError) return error.code
  if (typeof error === 'object' && error !== null && 'code' in error && 'status' in error) {
    const { code, status } = error as { code: unknown; status: unknown }
    if (typeof code === 'string' && typeof status === 'number') return code
  }
  return null
}

/**
 * Mensagem gentil (kids-friendly, serve nos dois modes) para um erro vindo do
 * transport. Cobre os códigos de domínio mais prováveis na Fase 0 e cai num
 * texto genérico de "tentar de novo" para o resto.
 */
export function friendlyErrorMessage(error: unknown): string {
  switch (domainCode(error)) {
    case 'PENSA_QUOTA_EXCEEDED':
      return 'Você já tem muitos projetos ativos. Arquive um deles para abrir espaço!'
    case 'PENSA_NOT_FOUND':
      return 'Não encontramos esse projeto. Ele pode ter sido arquivado.'
    case 'ACCESS_DENIED':
      return 'Parece que você ainda não tem acesso ao Pensa. Peça ajuda a um adulto!'
    case 'VALIDATION_ERROR':
      return 'Alguma coisa não ficou certa no que foi enviado. Confira e tente de novo!'
    case 'PENSA_AI_UNAVAILABLE':
      return 'O Zappy foi tomar um lanchinho. Tenta de novo em instantes!'
    case 'PENSA_NOT_READY':
      return 'Ainda faltam algumas respostas antes de criar a carta. Continue a conversa!'
    case 'PENSA_GATE_NOT_READY':
      return 'Falta só um passinho para avançar. Confira a Carta da Ideia e tente de novo!'
    case 'PENSA_STAGE_MISMATCH':
      return 'Essa etapa já mudou de lugar. Volte ao mapa para ver onde você está!'
    case 'PENSA_CYCLE_NOT_DONE':
      return 'A versão de agora ainda não terminou. Complete o lançamento antes de criar a próxima!'
    default:
      return 'A internet soluçou por aqui. Vamos tentar de novo?'
  }
}
