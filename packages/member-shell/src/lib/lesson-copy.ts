import type { SectionPendingItem } from '@sistemazero/core/learning'
import { CODIGO_SEM_ENVELOPE, FRASE_SEM_ENVELOPE } from './api'

/**
 * Copy comum das aulas nas comunidades adulta e infantojuvenil.
 * Curso, aula, parte, equipe e Passo a passo do projeto têm o mesmo nome.
 * Os aliases adulto/kids preservam imports existentes e apontam para o mesmo objeto.
 */
export interface LessonCopy {
  /** Navegação entre as seções e o pedido de ajuda (`LessonSections`). */
  secoes: {
    proxima: string
    indice: string
    lista: string
    pendente: string
    perfilMudou: string
    erroAoAbrir: string
    semRequisitos: string
    enviarAjuda: string
    /** O rótulo do campo do pedido de ajuda ("Em que ponto desta seção…"). */
    duvida: string
    /** O link de um recado de ajuda de volta à seção em que a dúvida nasceu. */
    voltarParaSecao: string
    /** A mensagem de AUTORIA fora do ensaio: o aluno lê esta, nunca a do professor. */
    preparando: string
    /** A faixa do rodapé com a seção pronta; `prontaUltima` na última (ao lado de "Concluir"). */
    pronta: string
    prontaUltima: string
    /** Avançar foi recusado porque a parte ainda tem algo a fazer (o envio mudou, por exemplo). */
    confiraAntes: string
  }
  /**
   * O texto de um item da faixa "o que falta para seguir". O members manda as frases da voz
   * adulta (`lessonCompletionRequirements`); o Kids troca pelo `kind`.
   */
  itemPendente: (item: SectionPendingItem) => string
  /**
   * A frase de um erro que veio do servidor, com a frase padrão do componente para quando não
   * houver uma. Na comunidade adulta vale a do servidor; o Kids troca pelo `code` e, se a frase
   * do servidor falar a língua da escola ("Conclua a seção anterior"), usa a `padrao`. Erro SEM
   * `code` não é do servidor (`TypeError: Failed to fetch`, um `Error` do cliente) e cai na
   * `padrao` nos dois apps.
   */
  erroDoServidor: (erro: unknown, padrao: string) => string
  /** "Verificar projeto" dos objetivos de projeto da seção. */
  verificacao: {
    botao: string
    objetivos: string
    progresso: (cumpridos: number, total: number) => string
    cumprido: string
    faltou: string
    /** O projeto passou do limite da rota (413 `PAYLOAD_TOO_LARGE`, 2 MB) ao ser conferido. */
    grandeDemais: string
    /** Os obrigatórios passaram e ainda há desafio extra por cumprir. */
    cumpridoComExtra: string
    /** O título da lista dos extras (não trancam a parte; dão XP uma vez). */
    extras: string
    /** Parte sem objetivo obrigatório, com desafio extra ainda aberto. */
    soExtras: string
    extrasNota: string
    dica: string
    /** O projeto mudou depois da última verificação: o resultado mostrado é de antes. */
    mudou: string
    verificando: string
    /** O botão ocupado quando algum objetivo RODA o jogo (leva alguns segundos). */
    testando: string
    erro: string
    xp: (pontos: number) => string
    /** O estado de cada objetivo para o leitor de tela (a tela mostra o ícone e a cor). */
    estadoCumprido: string
    estadoFalta: string
    estadoNaoVerificado: string
  }
  acaoDePlataforma: {
    concluida: string
    previa: string
  }
  cena: {
    /**
     * A resposta veio de uma pergunta que não existe mais. O core devolve a frase adulta
     * (`PERGUNTA_MUDOU`, contrato com o members, que o player reconhece por igualdade) e a tela
     * desenha esta.
     */
    perguntaMudou: string
  }
  estudio: {
    titulo: string
    enviar: string
    reenviar: string
    confirmarEnviar: string
    confirmarReenviar: string
    vaiReceber: string
    vaiReceberDeNovo: string
    avisoProjetoInicial: string
    recado: string
    recadoExemplo: string
    /**
     * A linha de "já foi" sob o editor, com a data do envio quando ela existe. É função porque a
     * pontuação depende da voz: o adulto lê "Projeto enviado ao professor em <data>." e a criança
     * "Projeto enviado!", e emendar a data num texto que já fecha com "!" saía "enviado! em…".
     */
    enviado: (quando: string | null) => string
    conferido: string
    paraConcluir: string
    continueConstruindo: string
    compartilharDepois: string
    semEnvio: string
    trazerExplica: string
    recomecarExplica: string
    erroAoAbrir: string
    /** O desenho da vaga de arte não chegou (leitura ou conversão falhou): o jogo abre sem ele. */
    desenhoNaoVeio: string
  }
  pinta: {
    enviar: string
    /** O título da confirmação do envio (o botão dela é sempre "Enviar"). */
    confirmarEnviar: string
    confirmarReenviar: string
    /** Mesma regra do `estudio.enviado`: a data entra pela voz de cada app. */
    enviado: (quando: string | null) => string
    visto: string
    paraConcluir: string
    continueDesenhando: string
    vaiVer: string
    vaiVerDeNovo: string
  }
  /**
   * O rascunho do Estúdio e do Pinta da fase guardado na conta (10/10/2026): a pílula do bloco, o
   * aviso de que o projeto mudou depois do envio e a troca pela "outra versão" (a que ficou
   * guardada neste aparelho quando dois computadores mexeram ao mesmo tempo).
   */
  rascunho: {
    guardando: string
    guardado: string
    offline: string
    erro: string
    mudouProjeto: string
    mudouDesenho: string
    outraVersao: string
    outraVersaoTitulo: string
    outraVersaoExplica: string
    trazer: string
    outraVersaoFalhou: string
    /** A conta já tinha um trabalho que este aparelho não conhecia: ele abriu por cima. */
    trouxeDaConta: string
    /** A versão da conta é de um editor mais novo que esta página: só a página nova junta as duas. */
    paginaDesatualizada: string
    atualizarPagina: string
  }
  /** Entrega pela galeria do Pinta ou do Estúdio completo. */
  galeria: {
    instrucaoPinta: string
    instrucaoEstudio: string
    recebido: string
    janela: (ferramenta: string) => string
    guardados: string
    vazio: (ferramenta: string) => string
    maisItens: string
    enviar: (quantos: number) => string
    recado: string
    erro: string
  }
  material: {
    tituloDoLivro: string
    previaDoLivro: string
    paraConcluir: string
    caderno: string
    livroNaAulaPublicada: string
    cadernoIndisponivel: string
    vincularPdf: string
    baixaNaAula: string
  }
  certificado: {
    locked: string
    eligibleDesc: string
    eligibleBtn: string
    issuedDesc: string
    issuedBtn: string
    notEligible: string
  }
  video: {
    titulo: string
    mover: string
    erroAoCarregar: string
  }
  /** O botão que desfaz a ampliação do jogo pronto e da experiência. */
  voltarDaAmpliacao: string
}

/**
 * O `code` de um erro da API (`{ code, message }`), quando houver um de VERDADE. O
 * `CODIGO_SEM_ENVELOPE` (o `'ERROR'` que o `apiSend` inventa quando o gateway cai e a resposta
 * vem sem envelope) conta como ausência: não foi o servidor que o escreveu.
 */
export function codigoDoErro(erro: unknown): string | undefined {
  return typeof erro === 'object' &&
    erro !== null &&
    'code' in erro &&
    typeof erro.code === 'string' &&
    erro.code !== CODIGO_SEM_ENVELOPE
    ? erro.code
    : undefined
}

/** A frase de um erro da API ou de um `Error`, quando houver uma não vazia. */
export function mensagemDoErro(erro: unknown): string | undefined {
  return typeof erro === 'object' &&
    erro !== null &&
    'message' in erro &&
    typeof erro.message === 'string' &&
    erro.message.trim()
    ? erro.message
    : undefined
}

/**
 * A frase que o SERVIDOR escreveu, ou nada. Só existe com um `code` de verdade
 * (`codigoDoErro`): o `TypeError: Failed to fetch` da rede (em inglês) e um `Error` do próprio
 * cliente não têm, e o "Algo deu errado." que o `apiSend` inventa sem envelope também não conta.
 * É a régua comum para os erros dos dois públicos.
 */
export function fraseDoServidor(erro: unknown): string | undefined {
  if (!codigoDoErro(erro)) return undefined
  const frase = mensagemDoErro(erro)
  return frase === FRASE_SEM_ENVELOPE ? undefined : frase
}

/** Linguagem comum das aulas, decisão de 21/10/2026. Sem tabelas por público. */
function itemPendente(item: SectionPendingItem): string {
  switch (item.kind) {
    case 'QUIZ_GATE_NOT_PASSED': {
      const meta = /(\d+)\s*%/.exec(item.text)?.[1]
      return meta ? `Passe no quiz (meta: ${meta}% de acertos)` : 'Passe no quiz'
    }
    case 'STUDIO_GATE_NOT_SUBMITTED':
      return 'Envie o seu projeto'
    case 'PINTA_GATE_NOT_SUBMITTED':
      return 'Envie o seu desenho'
    // "Envio em dia": o rótulo do botão no Kids é "Enviar de novo" (Estúdio e Pinta).
    case 'submission-outdated':
      return /desenho/i.test(item.text)
        ? 'Você mudou o desenho depois de enviar. Clique em Enviar de novo'
        : 'Você mudou o projeto depois de enviar. Clique em Enviar de novo'
    case 'LESSON_COMING_SOON':
      return 'Espere a aula ficar pronta'
    case 'locked':
      return 'Conclua a parte anterior'
    default:
      return item.text
  }
}

export const PALAVRAS_DA_ESCOLA =
  /Concluir fase|(?:^|clique (?:em|na) )Próxima (?:fase|seção|etapa)|Mapa da Aventura|Enviar para o professor/i

const ERRO_DO_SERVIDOR: Record<string, string> = {
  // O rascunho de uma parte com "envio em dia" não chegou à conta (`LessonDraftSaveError`).
  LESSON_DRAFT_NOT_SAVED:
    'Não consegui guardar suas últimas mudanças na conta. Tente de novo, ou clique em Enviar de novo para a equipe receber a versão nova.',
  VIEWER_CHANGED: 'O perfil mudou. Abra a aula de novo.',
  PAGE_OUTDATED:
    'Esta página ficou desatualizada. Clique em Atualizar, no aviso do Estúdio ou do Pinta, ou clique em Enviar de novo para a equipe receber a versão nova. Nada se perde.',
  // As recusas de concluir a aula.
  SECTION_GATE_INCOMPLETE: 'Termine todas as partes desta aula para concluir.',
  LEARNING_GATE_INCOMPLETE: 'Termine as experiências desta aula para concluir.',
  QUIZ_GATE_NOT_PASSED: 'Passe no quiz desta aula para concluir.',
  STUDIO_GATE_NOT_SUBMITTED: 'Envie o seu projeto para concluir a aula.',
  PINTA_GATE_NOT_SUBMITTED: 'Envie o seu desenho para concluir a aula.',
  CERTIFICATE_GATE_NOT_ISSUED: 'Baixe o seu certificado para concluir a aula.',
  LESSON_COMING_SOON: 'Esta aula ainda está sendo preparada.',
  LESSON_LOCKED: 'Esta aula abre quando a anterior for concluída.',
  // O resto do que a aula pode ouvir do servidor.
  SECTION_LOCKED: 'Conclua a parte anterior para continuar.',
  LEARNING_CONFLICT: 'Esta aula foi atualizada. Abra a aula de novo para continuar.',
  GALLERY_DELIVERY_FAILED:
    'Não foi possível enviar. Suas criações continuam na galeria. Tente de novo.',
  // Serve para guardar E para conferir: o 400 da validação chega dos dois caminhos.
  VALIDATION_ERROR: 'Não deu certo agora. Confira e tente de novo.',
  PAYLOAD_TOO_LARGE: 'Ficou grande demais para guardar.',
  // Quem vê é a equipe, numa sessão de suporte; o botão do banner se chama "Ativar edição".
  IMPERSONATION_READONLY: 'Sessão de suporte é só leitura. Ative o modo de edição no banner.',
}

function erroDoServidor(erro: unknown, padrao: string): string {
  const code = codigoDoErro(erro)
  if (!code) return padrao
  if (ERRO_DO_SERVIDOR[code]) return ERRO_DO_SERVIDOR[code]
  const frase = fraseDoServidor(erro)
  return frase && !PALAVRAS_DA_ESCOLA.test(frase) ? frase : padrao
}

export function conclusaoRecusada(erro: unknown): string {
  return erroDoServidor(erro, 'Não foi possível concluir a aula. Tente novamente.')
}

export const COMMON_LESSON_COPY: LessonCopy = {
  secoes: {
    proxima: 'Próxima parte',
    indice: 'Partes da aula',
    // ⚠️ Nome diferente do `indice`: os dois são rótulos de navegação na mesma tela, e o leitor
    // de tela não distingue dois marcos com o mesmo nome.
    lista: 'Escolha uma parte da aula',
    pendente: 'Falta terminar',
    perfilMudou: 'O perfil mudou. Abra a aula de novo.',
    erroAoAbrir:
      'Não foi possível abrir esta parte. Suas respostas foram mantidas. Tente novamente.',
    semRequisitos: 'Explore o conteúdo e conclua a aula quando terminar.',
    enviarAjuda: 'Enviar para a equipe',
    duvida: 'Em que ponto desta parte você ficou com dúvida?',
    voltarParaSecao: 'Voltar à parte',
    preparando: 'Esta parte ainda está sendo preparada',
    pronta: 'Tudo pronto nesta parte. Pode seguir!',
    prontaUltima: 'Tudo pronto nesta parte!',
    confiraAntes: 'Antes de seguir, confira o que falta nesta parte.',
  },
  itemPendente,
  erroDoServidor,
  verificacao: {
    botao: 'Verificar projeto',
    objetivos: 'Objetivos do projeto',
    progresso: (cumpridos, total) => `${cumpridos} de ${total} cumpridos`,
    cumprido: 'Objetivo cumprido!',
    faltou: 'Ainda falta um objetivo. Veja a lista e tente de novo.',
    grandeDemais:
      'Seu projeto ficou grande demais para conferir. Tire algumas imagens ou sons e tente de novo.',
    cumpridoComExtra: 'Objetivos cumpridos! Ainda tem um desafio extra, se você quiser.',
    extras: 'Desafio extra',
    soExtras: 'Aqui só tem desafio extra: cumpra se você quiser. Vale XP!',
    extrasNota: 'Não precisa para seguir. Vale XP!',
    dica: 'Dica',
    mudou: 'Você mexeu no projeto depois de verificar. Verifique de novo!',
    verificando: 'Verificando…',
    testando: 'Testando o seu jogo… isso leva alguns segundos.',
    erro: 'Não deu para verificar agora. Seu projeto continua aqui. Tente de novo.',
    xp: (pontos) => `+${pontos} XP`,
    estadoCumprido: 'cumprido',
    estadoFalta: 'ainda não',
    estadoNaoVerificado: 'ainda não verificado',
  },
  acaoDePlataforma: {
    concluida: 'Parte concluída!',
    previa: 'Prévia: a verificação de verdade acontece no perfil de quem faz a aula.',
  },
  cena: {
    perguntaMudou: 'Esta pergunta mudou. Abra a aula de novo.',
  },
  estudio: {
    titulo: 'Seu projeto no Estúdio',
    enviar: 'Enviar meu projeto',
    reenviar: 'Enviar de novo',
    confirmarEnviar: 'Enviar o seu projeto?',
    confirmarReenviar: 'Enviar o seu projeto de novo?',
    vaiReceber: 'A equipe vai receber o seu projeto do jeito que está agora.',
    vaiReceberDeNovo: 'A equipe vai receber a versão atual do seu projeto, no lugar da anterior.',
    avisoProjetoInicial:
      'Atenção: você está enviando o projeto inicial da aula por cima do que você já enviou. Se terminou em outro computador, use o menu ⋯ e escolha Trazer o que eu enviei antes.',
    // O componente completa com "(opcional)": na tela fica "Recado (opcional)".
    recado: 'Recado',
    recadoExemplo: 'Se quiser, conte algo para a equipe sobre o seu projeto.',
    enviado: (quando) => (quando ? `Projeto enviado! Foi em ${quando}.` : 'Projeto enviado!'),
    conferido: 'A equipe já viu o seu projeto.',
    paraConcluir: 'Envie o seu projeto para concluir a aula.',
    continueConstruindo: 'Continue construindo. Você envia o projeto no fim da aula.',
    compartilharDepois: 'Envie o seu projeto primeiro para poder compartilhar.',
    semEnvio: 'Você ainda não enviou nenhum projeto.',
    trazerExplica:
      'Isto substitui o que você está editando aqui pelo último projeto que você enviou. Use se você terminou em outro computador.',
    recomecarExplica:
      'O Estúdio vai abrir o projeto inicial mais recente desta aula. O que você mudou neste aparelho será substituído. Se você já enviou um projeto, o envio continua guardado.',
    erroAoAbrir: 'Não conseguimos abrir o seu projeto. O que você fez não foi substituído.',
    desenhoNaoVeio:
      'Não consegui trazer o seu desenho agora. O jogo abriu com as imagens dele. Abra a aula de novo daqui a pouco.',
  },
  pinta: {
    enviar: 'Enviar meu desenho',
    confirmarEnviar: 'Enviar o seu desenho?',
    confirmarReenviar: 'Enviar o seu desenho de novo?',
    enviado: (quando) => (quando ? `Desenho enviado! Foi em ${quando}.` : 'Desenho enviado!'),
    visto: 'A equipe já viu o seu desenho.',
    paraConcluir: 'Envie o seu desenho para concluir a aula.',
    continueDesenhando: 'Continue desenhando. Você envia o desenho no fim da aula.',
    vaiVer: 'A equipe vai ver o seu desenho do jeito que ele está agora.',
    vaiVerDeNovo: 'A equipe vai ver esta versão no lugar da anterior.',
  },
  rascunho: {
    guardando: 'Salvando na sua conta…',
    guardado: 'Guardado na sua conta',
    offline: 'Sem internet. Está guardado neste aparelho',
    erro: 'Não deu para guardar na conta agora',
    mudouProjeto:
      'Você mudou o projeto depois de enviar. Clique em Enviar de novo para a equipe ver a versão nova.',
    mudouDesenho:
      'Você mudou o desenho depois de enviar. Clique em Enviar de novo para a equipe ver a versão nova.',
    outraVersao: 'Outra versão',
    outraVersaoTitulo: 'Trazer a outra versão?',
    outraVersaoExplica:
      'Este computador guardou a outra versão, a que não abriu agora. Trazer troca as duas de lugar: a de agora fica guardada aqui, e você pode voltar para ela do mesmo jeito.',
    trazer: 'Trazer',
    outraVersaoFalhou: 'Não consegui trazer a outra versão agora. Tente de novo.',
    trouxeDaConta: 'Abri a versão guardada na sua conta. A deste computador ficou em Outra versão.',
    paginaDesatualizada:
      'A versão da sua conta é mais nova que esta página. Clique em Atualizar. Nada se perde.',
    atualizarPagina: 'Atualizar',
  },
  galeria: {
    instrucaoPinta: 'Escolha os desenhos que você fez nesta aula e envie.',
    instrucaoEstudio: 'Escolha o projeto desta aula na sua galeria e envie.',
    recebido: 'Recebido!',
    janela: (ferramenta) => `Minhas criações do ${ferramenta}`,
    guardados: 'Criações guardadas na sua conta.',
    vazio: (ferramenta) =>
      `Crie no ${ferramenta}, guarde na sua conta e volte para atualizar a galeria.`,
    maisItens: 'Mostrar mais criações',
    enviar: (quantos) => `Enviar${quantos ? ` (${quantos})` : ''}`,
    recado: 'Recado (opcional)',
    erro: 'Não foi possível carregar suas criações. Tente novamente.',
  },
  material: {
    tituloDoLivro: 'Material do curso',
    previaDoLivro: 'Prévia do material. O livro 3D aparece na aula publicada.',
    paraConcluir: 'Abra o livro para concluir esta parte.',
    caderno: 'Passo a passo do projeto',
    livroNaAulaPublicada: 'O livro aparece na aula publicada.',
    cadernoIndisponivel:
      'O Passo a passo do projeto ainda não está disponível nesta aula. Você pode continuar.',
    vincularPdf:
      'Vincule um PDF a este bloco de materiais para mostrar o Passo a passo do projeto aqui.',
    baixaNaAula: 'baixa na aula',
  },
  certificado: {
    locked: 'Conclua as aulas de antes e seu certificado aparece aqui!',
    eligibleDesc: 'Seu curso está concluído. Clique no botão para baixar o seu certificado.',
    eligibleBtn: 'Baixar meu certificado',
    issuedDesc: 'Seu certificado está pronto! Pode baixar quantas vezes quiser.',
    issuedBtn: 'Baixar certificado (PDF)',
    notEligible: 'Conclua as aulas de antes para pegar o seu certificado.',
  },
  video: {
    titulo: 'Vídeo da aula',
    mover: 'Vídeo da aula: mover para outro canto',
    erroAoCarregar:
      'Não foi possível carregar o vídeo. Confira sua conexão e abra a aula de novo para continuar.',
  },
  voltarDaAmpliacao: 'Voltar à aula',
}

/** Nome público anterior; aponta para o mesmo objeto, sem tradução ou cópia. */
export const ADULT_LESSON_COPY = COMMON_LESSON_COPY
