import type { SectionPendingItem } from '@sistemazero/core/learning'
import {
  codigoDoErro,
  type LessonCopy,
  mensagemDoErro,
} from '@sistemazero/member-shell/lib/lesson-copy'

/**
 * O vocabulário das telas de aula que o Kids divide com a comunidade adulta (decisão de
 * 06/10/2026). A dona não quer que a área da criança pareça uma extensão da escola: o que a
 * criança lê é aventura (curso), fase (aula), parte (seção), Mapa da Aventura (caderno) e guia
 * (professor). Por dentro tudo continua com os nomes de sempre: endereços, identificadores, Admin.
 *
 * Entra no member-shell pelo `KidsLessonCopy`, em volta da área logada. Os textos que o members
 * gera (o que falta para seguir) chegam na voz adulta e são trocados aqui pelo `kind`.
 */
function itemPendente(item: SectionPendingItem): string {
  switch (item.kind) {
    case 'QUIZ_GATE_NOT_PASSED': {
      const meta = /(\d+)\s*%/.exec(item.text)?.[1]
      return meta ? `Passe no quiz (meta: ${meta}% de acertos)` : 'Passe no quiz'
    }
    case 'STUDIO_GATE_NOT_SUBMITTED':
      return 'Envie seu projeto para o guia'
    case 'STUDIO_GATE_NOT_PASSED':
      return 'Alcance a meta do projeto'
    case 'PINTA_GATE_NOT_SUBMITTED':
      return 'Envie seu desenho para o guia'
    case 'LESSON_COMING_SOON':
      return 'Espere a fase ficar pronta'
    case 'locked':
      return 'Conclua a parte anterior'
    default:
      return item.text
  }
}

/**
 * O toast de quando o members RECUSA concluir a fase. A frase do servidor é a da voz adulta
 * ("Conclua o quiz da aula com a nota mínima…"), então o Kids escolhe a dele pelo `code`. Código
 * desconhecido cai numa frase neutra: nunca a mensagem crua do servidor.
 */
const CONCLUSAO_RECUSADA: Record<string, string> = {
  SECTION_GATE_INCOMPLETE: 'Termine todas as partes desta fase para concluir.',
  LEARNING_GATE_INCOMPLETE: 'Termine as experiências desta fase para concluir.',
  QUIZ_GATE_NOT_PASSED: 'Passe no quiz desta fase para concluir.',
  STUDIO_GATE_NOT_SUBMITTED: 'Envie seu projeto para o guia para concluir a fase.',
  STUDIO_GATE_NOT_PASSED: 'Alcance a meta do projeto para concluir a fase.',
  PINTA_GATE_NOT_SUBMITTED: 'Envie seu desenho para o guia para concluir a fase.',
  CERTIFICATE_GATE_NOT_ISSUED: 'Pegue o seu certificado para concluir a fase.',
  LESSON_COMING_SOON: 'Esta fase ainda está sendo preparada.',
  LESSON_LOCKED: 'Esta fase abre quando a anterior for concluída.',
}

export function conclusaoRecusada(code: string | undefined): string {
  return (code && CONCLUSAO_RECUSADA[code]) || 'Não foi possível concluir a fase. Tente novamente.'
}

/**
 * As palavras da escola que a criança não lê (e as que lembram a escola: atividade, entrega,
 * trabalho). É a mesma régua do guarda `tests/copy-vocabulario.test.ts`.
 */
export const PALAVRAS_DA_ESCOLA =
  /\b(?:aulas?|cursos?|professor(?:a|as|es)?|alun[oa]s?|seç(?:ão|ões)|cadernos?|etapas?|atividades?|entregas?|trabalhos?|nota m[ií]nima)\b/i

/** Os erros do servidor que a criança pode encontrar numa fase, na voz da aventura. */
const ERRO_DO_SERVIDOR: Record<string, string> = {
  ...CONCLUSAO_RECUSADA,
  SECTION_LOCKED: 'Conclua a parte anterior para continuar.',
  LEARNING_CONFLICT: 'Esta fase foi atualizada. Abra a fase de novo para continuar.',
}

/**
 * O members fala na voz adulta ("Conclua a seção anterior"): o código conhecido vira a frase da
 * aventura, e uma frase do servidor com palavra da escola dá lugar à frase padrão do componente.
 */
function erroDoServidor(erro: unknown, padrao: string): string {
  const code = codigoDoErro(erro)
  if (code && ERRO_DO_SERVIDOR[code]) return ERRO_DO_SERVIDOR[code]
  const frase = mensagemDoErro(erro)
  return frase && !PALAVRAS_DA_ESCOLA.test(frase) ? frase : padrao
}

export const KIDS_LESSON_COPY: LessonCopy = {
  secoes: {
    proxima: 'Próxima parte',
    indice: 'Partes da fase',
    lista: 'Partes da fase',
    pendente: 'Falta terminar',
    perfilMudou: 'O perfil mudou. Abra a fase de novo.',
    erroAoAbrir:
      'Não foi possível abrir esta parte. Suas respostas foram mantidas. Tente novamente.',
    semRequisitos: 'Explore o conteúdo e conclua a fase quando terminar.',
    enviarAjuda: 'Enviar para o guia',
    voltarParaSecao: 'Voltar à parte',
  },
  itemPendente,
  erroDoServidor,
  verificacao: {
    botao: 'Verificar esta parte',
    objetivos: 'Objetivos desta parte',
    cumprido: 'Objetivo cumprido!',
    faltou: 'Confira os blocos pedidos nesta parte e tente novamente.',
  },
  acaoDePlataforma: {
    concluida: 'Parte concluída!',
    previa: 'Prévia: a verificação de verdade acontece no perfil de quem faz a fase.',
  },
  estudio: {
    titulo: 'Seu projeto no Estúdio',
    enviar: 'Enviar para o guia',
    reenviar: 'Reenviar para o guia',
    confirmarEnviar: 'Enviar para o guia?',
    confirmarReenviar: 'Reenviar para o guia?',
    vaiReceber: 'O seu guia vai receber o seu projeto do jeitinho que está agora.',
    vaiReceberDeNovo: 'O seu guia vai receber a versão atual do seu projeto, no lugar da anterior.',
    dicaVerificar: ' Dica: clique em "Verificar" no editor antes, para ver se já alcançou a meta.',
    avisoProjetoInicial:
      'Atenção: você está enviando o projeto inicial da fase por cima do que você já enviou. Se terminou em outro computador, use o menu ⋯ e escolha Trazer o que eu enviei antes.',
    recado: 'Recado para o guia',
    recadoExemplo: 'Se quiser, conte algo para o seu guia sobre o seu projeto.',
    enviado: 'Projeto enviado para o guia',
    conferido: 'O seu guia já viu o seu projeto.',
    paraConcluir: 'Envie seu projeto para o guia para poder concluir a fase.',
    paraConcluirComMeta:
      'Use "Verificar" no editor e envie para o guia. Alcance a meta para concluir a fase.',
    continueConstruindo: 'Continue construindo. Você envia o projeto no fim da fase.',
    compartilharDepois: 'Envie o projeto para o guia primeiro para poder compartilhar.',
    semEnvio: 'Você ainda não enviou nenhum projeto para o guia.',
    trazerExplica:
      'Isto substitui o que você está editando aqui pelo último projeto que você enviou para o guia. Use se você terminou em outro computador.',
    recomecarExplica:
      'O Estúdio vai abrir o projeto inicial mais recente desta fase. O que você mudou neste aparelho será substituído. Se você já enviou um projeto para o guia, o envio continua guardado.',
    erroAoAbrir: 'Não conseguimos abrir o seu projeto. O que você fez não foi substituído.',
    pontuacao: (score) => `Sua pontuação: ${score}/100`,
    metaAlcancada: '· você alcançou a meta',
    precisaDe: (pontos) => `· a meta é ${pontos} para concluir`,
  },
  pinta: {
    enviar: 'Enviar para o guia',
    enviado: 'Desenho enviado para o guia',
    visto: 'O seu guia já viu o seu desenho.',
    paraConcluir: 'Envie o seu desenho para o guia para poder concluir a fase.',
    continueDesenhando: 'Continue desenhando. Você envia o desenho no fim da fase.',
    vaiVer: 'O seu guia vai ver o seu desenho do jeito que ele está agora.',
    vaiVerDeNovo: 'O seu guia vai ver esta versão no lugar da anterior.',
  },
  galeria: {
    instrucaoPinta: 'Escolha os desenhos que você fez nesta fase e envie para o guia.',
    instrucaoEstudio: 'Escolha o projeto desta fase na sua galeria e envie para o guia.',
    recebido: 'Recebido pelo seu guia.',
    janela: (ferramenta) => `Minhas criações do ${ferramenta}`,
    guardados: 'Criações guardadas na sua conta.',
    vazio: (ferramenta) =>
      `Crie no ${ferramenta}, guarde na sua conta e volte para atualizar a galeria.`,
    maisItens: 'Mostrar mais criações',
    enviar: (quantos) => `Enviar para o guia${quantos ? ` (${quantos})` : ''}`,
    recado: 'Recado para o guia (opcional)',
    erro: 'Não foi possível carregar suas criações. Tente novamente.',
  },
  material: {
    tituloDoLivro: 'Material da aventura',
    previaDoLivro: 'Prévia do material. O livro 3D e o download do PDF aparecem na fase publicada.',
    paraConcluir: 'Abra o livro ou baixe o PDF para concluir esta parte.',
    caderno: 'Mapa da Aventura',
    livroNaAulaPublicada: 'O livro aparece na fase publicada.',
    cadernoIndisponivel:
      'O Mapa da Aventura ainda não está disponível nesta fase. Você pode continuar.',
    vincularPdf: 'Vincule um PDF a este bloco de materiais para mostrar o Mapa da Aventura aqui.',
    baixaNaAula: 'baixa na fase',
    nomeDoArquivo: 'Material da fase',
  },
  certificado: {
    locked: 'Conclua as fases de antes e seu certificado aparece aqui!',
    eligibleDesc: 'Você arrasou! Toque no botão para pegar o seu certificado.',
    eligibleBtn: 'Pegar meu certificado',
    issuedDesc: 'Seu certificado está pronto! Pode baixar quantas vezes quiser.',
    issuedBtn: 'Baixar certificado (PDF)',
    notEligible: 'Conclua as fases de antes para pegar o seu certificado.',
  },
  video: {
    titulo: 'Vídeo da fase',
    mover: 'Vídeo da fase: mover para outro canto',
    erroAoCarregar:
      'Não foi possível carregar o vídeo. Confira sua conexão e abra a fase de novo para continuar.',
  },
  voltarDaAmpliacao: 'Voltar à fase',
}
