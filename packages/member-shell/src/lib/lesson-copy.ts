import type { SectionPendingItem } from '@sistemazero/core/learning'

/**
 * As palavras das telas de aula que os dois apps dividem.
 *
 * Na comunidade adulta a aula fala de curso, aula, seção e professor. No Kids, desde 06/10/2026,
 * fala de aventura, fase, parte e guia: a dona não quer que a área da criança pareça uma extensão
 * da escola (Diretrizes Pedagógicas, seção 6). O Kids passa a versão dele pelo
 * `LessonCopyProvider`; sem provedor, vale esta, a adulta.
 *
 * ⚠️ Texto de tela compartilhada que diga curso, aula, seção, etapa, caderno, professor ou aluno
 * entra AQUI, e não solto no componente: o guarda `copy-vocabulario` do Kids varre o
 * `member-shell` e só deixa passar este arquivo.
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
    /** O link de um recado de ajuda de volta à seção em que a dúvida nasceu. */
    voltarParaSecao: string
  }
  /**
   * O texto de um item da faixa "o que falta para seguir". O members manda as frases da voz
   * adulta (`lessonCompletionRequirements`); o Kids troca pelo `kind`.
   */
  itemPendente: (item: SectionPendingItem) => string
  /**
   * A frase de um erro que veio do servidor, com a frase padrão do componente para quando não
   * houver uma. Na comunidade adulta vale a do servidor; o Kids troca pelo `code` e, se a frase
   * do servidor falar a língua da escola ("Conclua a seção anterior"), usa a `padrao`.
   */
  erroDoServidor: (erro: unknown, padrao: string) => string
  /** "Verificar esta etapa" dos objetivos de projeto da seção. */
  verificacao: {
    botao: string
    objetivos: string
    cumprido: string
    faltou: string
  }
  acaoDePlataforma: {
    concluida: string
    previa: string
  }
  estudio: {
    titulo: string
    enviar: string
    reenviar: string
    confirmarEnviar: string
    confirmarReenviar: string
    vaiReceber: string
    vaiReceberDeNovo: string
    dicaVerificar: string
    avisoProjetoInicial: string
    recado: string
    recadoExemplo: string
    enviado: string
    conferido: string
    paraConcluir: string
    paraConcluirComMeta: string
    continueConstruindo: string
    compartilharDepois: string
    semEnvio: string
    trazerExplica: string
    recomecarExplica: string
    erroAoAbrir: string
    pontuacao: (score: number) => string
    metaAlcancada: string
    precisaDe: (pontos: number) => string
  }
  pinta: {
    enviar: string
    enviado: string
    visto: string
    paraConcluir: string
    continueDesenhando: string
    vaiVer: string
    vaiVerDeNovo: string
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
    nomeDoArquivo: string
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

/** O `code` de um erro da API (`{ code, message }`), quando houver. */
export function codigoDoErro(erro: unknown): string | undefined {
  return typeof erro === 'object' &&
    erro !== null &&
    'code' in erro &&
    typeof erro.code === 'string'
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

export const ADULT_LESSON_COPY: LessonCopy = {
  secoes: {
    proxima: 'Próxima seção',
    indice: 'Índice da aula',
    lista: 'Seções da aula',
    pendente: 'Atividade pendente',
    perfilMudou: 'O perfil mudou. Abra a aula de novo.',
    erroAoAbrir:
      'Não foi possível abrir esta seção. Suas respostas foram mantidas. Tente novamente.',
    semRequisitos: 'Explore o conteúdo e conclua a aula quando terminar.',
    enviarAjuda: 'Enviar ao professor',
    voltarParaSecao: 'Voltar à seção',
  },
  itemPendente: (item) => item.text,
  erroDoServidor: (erro, padrao) => mensagemDoErro(erro) ?? padrao,
  verificacao: {
    botao: 'Verificar esta etapa',
    objetivos: 'Objetivos desta etapa',
    cumprido: 'Objetivo da etapa cumprido!',
    faltou: 'Confira os blocos pedidos nesta etapa e tente novamente.',
  },
  acaoDePlataforma: {
    concluida: 'Etapa concluída!',
    previa: 'Prévia: a verificação real acontece na conta do aluno.',
  },
  estudio: {
    titulo: 'Atividade no Estúdio',
    enviar: 'Enviar para o professor',
    reenviar: 'Reenviar ao professor',
    confirmarEnviar: 'Enviar ao professor?',
    confirmarReenviar: 'Reenviar ao professor?',
    vaiReceber: 'O professor vai receber o seu projeto do jeitinho que está agora.',
    vaiReceberDeNovo:
      'O professor vai receber a versão atual do seu projeto, no lugar da anterior.',
    dicaVerificar: ' Dica: clique em "Verificar" no editor antes, para ver se já atingiu a nota.',
    avisoProjetoInicial:
      'Atenção: você está enviando o projeto inicial da aula por cima do que você já entregou. Se terminou em outro computador, use o menu ⋯ e escolha Trazer o que eu enviei antes.',
    recado: 'Recado para o professor',
    recadoExemplo: 'Quer contar algo pro professor sobre o seu projeto? (não é obrigatório)',
    enviado: 'Projeto enviado ao professor',
    conferido: 'O professor já conferiu sua entrega.',
    paraConcluir: 'Envie seu projeto ao professor para poder concluir a aula.',
    paraConcluirComMeta:
      'Use "Verificar" no editor e envie ao professor. Atinja a nota mínima para concluir a aula.',
    continueConstruindo: 'Continue construindo. A entrega do projeto fica no fechamento.',
    compartilharDepois: 'Envie o projeto para o professor primeiro para poder compartilhar.',
    semEnvio: 'Você ainda não enviou nenhum projeto para o professor.',
    trazerExplica:
      'Isto substitui o que você está editando aqui pelo último projeto que você enviou ao professor. Use se você terminou em outro computador.',
    recomecarExplica:
      'O Estúdio vai abrir o projeto inicial mais recente desta aula. O que você mudou neste aparelho será substituído. Se já enviou um projeto ao professor, o envio continuará salvo.',
    erroAoAbrir: 'Não conseguimos abrir sua atividade. Seu trabalho não foi substituído.',
    pontuacao: (score) => `Sua nota: ${score}/100`,
    metaAlcancada: '· você atingiu a nota mínima',
    precisaDe: (pontos) => `· precisa de ${pontos} para concluir`,
  },
  pinta: {
    enviar: 'Enviar para o professor',
    enviado: 'Desenho enviado ao professor',
    visto: 'O professor já viu o seu desenho.',
    paraConcluir: 'Envie o seu desenho ao professor para poder concluir a aula.',
    continueDesenhando: 'Continue desenhando. A entrega fica no fechamento.',
    vaiVer: 'O professor vai ver o seu desenho do jeito que ele está agora.',
    vaiVerDeNovo: 'O professor vai ver esta versão no lugar da anterior.',
  },
  galeria: {
    instrucaoPinta: 'Escolha os desenhos que você fez para esta missão e envie ao professor.',
    instrucaoEstudio: 'Escolha o projeto desta missão na sua galeria e envie ao professor.',
    recebido: 'Trabalho recebido pelo professor.',
    janela: (ferramenta) => `Meus trabalhos do ${ferramenta}`,
    guardados: 'Trabalhos guardados na sua conta.',
    vazio: (ferramenta) =>
      `Faça seu trabalho no ${ferramenta}, guarde na sua conta e volte para atualizar a galeria.`,
    maisItens: 'Mostrar mais trabalhos',
    enviar: (quantos) => `Enviar ao professor${quantos ? ` (${quantos})` : ''}`,
    recado: 'Recado para o professor (opcional)',
    erro: 'Não foi possível carregar seus trabalhos. Tente novamente.',
  },
  material: {
    tituloDoLivro: 'Material do curso',
    previaDoLivro:
      'Prévia do material. O livro 3D e o download do PDF ficam disponíveis na aula publicada.',
    paraConcluir: 'Abra o livro ou baixe o PDF para concluir esta etapa.',
    caderno: 'Caderno do Aluno',
    livroNaAulaPublicada: 'O livro fica disponível na aula publicada.',
    cadernoIndisponivel: 'O caderno ainda não está disponível nesta aula. Você pode continuar.',
    vincularPdf: 'Vincule um PDF a este bloco de materiais para mostrar o caderno aqui.',
    baixaNaAula: 'baixa na aula',
    nomeDoArquivo: 'Material da aula',
  },
  certificado: {
    locked: 'Conclua as aulas anteriores ao certificado para liberar a emissão.',
    eligibleDesc: 'Você concluiu as aulas necessárias. Emita seu certificado de conclusão.',
    eligibleBtn: 'Emitir meu certificado',
    issuedDesc: 'Seu certificado está pronto. Baixe quantas vezes quiser, é sempre o mesmo.',
    issuedBtn: 'Baixar certificado (PDF)',
    notEligible: 'Conclua as aulas anteriores ao certificado para emitir.',
  },
  video: {
    titulo: 'Vídeo da aula',
    mover: 'Vídeo da aula: mover para outro canto',
    erroAoCarregar:
      'Não foi possível carregar o vídeo. Confira sua conexão e reabra a aula para continuar.',
  },
  voltarDaAmpliacao: 'Voltar à aula',
}
