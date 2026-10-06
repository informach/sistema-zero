import type { SectionPendingItem } from '@sistemazero/core/learning'
import { CODIGO_SEM_ENVELOPE, FRASE_SEM_ENVELOPE } from './api'

/**
 * As palavras das telas de aula que os dois apps dividem.
 *
 * Na comunidade adulta a aula fala de curso, aula, seção e professor. No Kids, desde 06/10/2026,
 * fala de aventura, fase, parte e equipe: a dona não quer que a área da criança pareça uma extensão
 * da escola (Diretrizes Pedagógicas, seção 6). O Kids passa a versão dele pelo
 * `LessonCopyProvider`; sem provedor, vale esta, a adulta.
 *
 * O vocabulário da criança mora ao lado, em `lesson-copy-kids.ts` (o Kids o usa na área logada e
 * o Admin na prévia e no ensaio de uma aula de curso kids).
 *
 * ⚠️ Texto de tela compartilhada que diga curso, aula, seção, etapa, caderno, professor ou aluno
 * entra AQUI, e não solto no componente: o guarda `copy-vocabulario` do Kids varre o código que a
 * criança vê (o `src/` do Kids; `components`, `lib`, `routes` e `server` do member-shell;
 * `core/src`; `studio/src`; `pinta/src`; `molda/src`; `ui/src`) e deixa passar este arquivo
 * inteiro, mais uma lista de exceções com o motivo de cada uma.
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
  /** "Verificar esta etapa" dos objetivos de projeto da seção. */
  verificacao: {
    botao: string
    objetivos: string
    cumprido: string
    faltou: string
    /** O projeto passou do limite da rota (413 `PAYLOAD_TOO_LARGE`, 2 MB) ao ser conferido. */
    grandeDemais: string
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
    dicaVerificar: string
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
 * É a régua ÚNICA dos dois vocabulários (`ADULT_LESSON_COPY` e `KIDS_LESSON_COPY`).
 */
export function fraseDoServidor(erro: unknown): string | undefined {
  if (!codigoDoErro(erro)) return undefined
  const frase = mensagemDoErro(erro)
  return frase === FRASE_SEM_ENVELOPE ? undefined : frase
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
    duvida: 'Em que ponto desta seção você ficou com dúvida?',
    voltarParaSecao: 'Voltar à seção',
    preparando: 'Esta seção ainda está sendo preparada',
    pronta: 'Tudo pronto nesta seção. Pode seguir!',
    prontaUltima: 'Tudo pronto nesta seção!',
  },
  itemPendente: (item) => item.text,
  erroDoServidor: (erro, padrao) => fraseDoServidor(erro) ?? padrao,
  verificacao: {
    botao: 'Verificar esta etapa',
    objetivos: 'Objetivos desta etapa',
    cumprido: 'Objetivo da etapa cumprido!',
    faltou: 'Confira os blocos pedidos nesta etapa e tente novamente.',
    grandeDemais:
      'O projeto ficou grande demais para conferir. Remova algumas imagens ou sons e tente novamente.',
  },
  acaoDePlataforma: {
    concluida: 'Etapa concluída!',
    previa: 'Prévia: a verificação real acontece na conta do aluno.',
  },
  cena: {
    perguntaMudou: 'Esta pergunta mudou. Abra a aula de novo.',
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
    enviado: (quando) => `Projeto enviado ao professor${quando ? ` em ${quando}` : ''}.`,
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
    confirmarEnviar: 'Enviar o desenho?',
    confirmarReenviar: 'Enviar o desenho de novo?',
    enviado: (quando) => `Desenho enviado ao professor${quando ? ` em ${quando}` : ''}.`,
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
