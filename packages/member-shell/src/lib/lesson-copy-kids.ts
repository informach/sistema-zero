import type { SectionPendingItem } from '@sistemazero/core/learning'
import { codigoDoErro, fraseDoServidor, type LessonCopy } from './lesson-copy'

/**
 * O vocabulário das telas de aula do KIDS (decisão de 06/10/2026). A dona não quer que a área
 * da criança pareça uma extensão da escola: o que a criança lê é aventura (curso), fase (aula),
 * parte (seção) e Mapa da Aventura (caderno). Por dentro tudo continua com os nomes de sempre:
 * endereços, identificadores, Admin.
 *
 * ⭐ Quem lê o que a criança manda é **a equipe** (decisão da dona, 06/10/2026, no mesmo dia: o
 * "guia" saiu da tela da criança). E os botões de envio dizem O QUE vai, sem destinatário: "Enviar
 * meu projeto", "Enviar meu desenho", "Enviar (2)". "Guia" sobrou só no "Guia do Pensa", que é o
 * painel das tarefas, e não uma pessoa.
 *
 * Mora no member-shell (e não no Kids) porque DOIS apps o usam: o Kids, pelo `KidsLessonCopy` em
 * volta da área logada, e o Admin, na prévia e no ensaio de uma aula de curso kids (senão o
 * professor conferia a aula infantil com "Próxima seção" e "Índice da aula"). Os textos que o
 * members gera (o que falta para seguir, as recusas) chegam na voz adulta e são trocados aqui
 * pelo `kind` ou pelo `code`.
 */
function itemPendente(item: SectionPendingItem): string {
  switch (item.kind) {
    case 'QUIZ_GATE_NOT_PASSED': {
      const meta = /(\d+)\s*%/.exec(item.text)?.[1]
      return meta ? `Passe no quiz (meta: ${meta}% de acertos)` : 'Passe no quiz'
    }
    case 'STUDIO_GATE_NOT_SUBMITTED':
      return 'Envie o seu projeto'
    case 'STUDIO_GATE_NOT_PASSED':
      return 'Alcance a meta do projeto'
    case 'PINTA_GATE_NOT_SUBMITTED':
      return 'Envie o seu desenho'
    case 'LESSON_COMING_SOON':
      return 'Espere a fase ficar pronta'
    case 'locked':
      return 'Conclua a parte anterior'
    default:
      return item.text
  }
}

/**
 * As palavras da escola que a criança não lê (e as que lembram a escola: atividade, entrega,
 * trabalho, devolutiva, lição, formatura, diploma, estudar). É a régua do guarda
 * `tests/copy-vocabulario.test.ts` do Kids e da troca das frases do servidor abaixo.
 *
 * ⚠️ Cobre tudo o que a régua dos roteiros e manifestos cobre
 * (`docs/aulas-interativas/qa/palavras-da-escola.ts`): uma palavra que o roteiro não pode dizer
 * também não pode aparecer na tela. "Estudar" entra pelas formas do verbo e de "estudo", e não
 * por prefixo, para não pegar "Estúdio" escrito sem acento.
 */
export const PALAVRAS_DA_ESCOLA =
  /\b(?:aulas?|cursos?|professor(?:a|as|es)?|alun[oa]s?|seç(?:ão|ões)|cadernos?|etapas?|unidades?|atividades?|entregas?|entreg(?:ar|ue|ues|ou)|trabalhos?|devolutivas?|liç(?:ão|ões)|formaturas?|diplomas?|estud(?:ar|ando|ou|e|os?)|nota m[ií]nima)\b/i

/**
 * Os erros do servidor que a criança pode encontrar numa fase, na voz da aventura. O members
 * fala na voz adulta ("Conclua o quiz da aula com a nota mínima…", "Conclua a seção anterior"),
 * então o código conhecido escolhe a frase daqui.
 */
const ERRO_DO_SERVIDOR: Record<string, string> = {
  // As recusas de concluir a fase.
  SECTION_GATE_INCOMPLETE: 'Termine todas as partes desta fase para concluir.',
  LEARNING_GATE_INCOMPLETE: 'Termine as experiências desta fase para concluir.',
  QUIZ_GATE_NOT_PASSED: 'Passe no quiz desta fase para concluir.',
  STUDIO_GATE_NOT_SUBMITTED: 'Envie o seu projeto para concluir a fase.',
  STUDIO_GATE_NOT_PASSED: 'Alcance a meta do projeto para concluir a fase.',
  PINTA_GATE_NOT_SUBMITTED: 'Envie o seu desenho para concluir a fase.',
  CERTIFICATE_GATE_NOT_ISSUED: 'Pegue o seu certificado para concluir a fase.',
  LESSON_COMING_SOON: 'Esta fase ainda está sendo preparada.',
  LESSON_LOCKED: 'Esta fase abre quando a anterior for concluída.',
  // O resto do que a fase pode ouvir do servidor.
  SECTION_LOCKED: 'Conclua a parte anterior para continuar.',
  LEARNING_CONFLICT: 'Esta fase foi atualizada. Abra a fase de novo para continuar.',
  GALLERY_DELIVERY_FAILED:
    'Não foi possível enviar. Suas criações continuam na galeria. Tente de novo.',
  // Serve para guardar E para conferir: o 400 da validação chega dos dois caminhos.
  VALIDATION_ERROR: 'Não deu certo agora. Confira e tente de novo.',
  PAYLOAD_TOO_LARGE: 'Ficou grande demais para guardar.',
  // Quem vê é a equipe, numa sessão de suporte; o botão do banner se chama "Ativar edição".
  IMPERSONATION_READONLY: 'Sessão de suporte é só leitura. Ative o modo de edição no banner.',
}

/**
 * Código conhecido vira a frase da aventura. Código desconhecido usa a frase do servidor, se ela
 * não falar a língua da escola; senão, a frase padrão do componente. Erro SEM código de verdade
 * (o `TypeError: Failed to fetch` de uma queda de rede, um `Error` do próprio cliente, o
 * `'ERROR'`/"Algo deu errado." que o `apiSend` inventa quando o gateway cai) nunca mostra frase
 * nenhuma dele: a régua é a `fraseDoServidor`, a mesma do adulto.
 */
function erroDoServidor(erro: unknown, padrao: string): string {
  const code = codigoDoErro(erro)
  if (!code) return padrao
  if (ERRO_DO_SERVIDOR[code]) return ERRO_DO_SERVIDOR[code]
  const frase = fraseDoServidor(erro)
  return frase && !PALAVRAS_DA_ESCOLA.test(frase) ? frase : padrao
}

/**
 * O toast de quando o members RECUSA concluir a fase. Mesma troca do `erroDoServidor`: a recusa
 * conhecida tem a frase da aventura, e uma desconhecida só mostra a do servidor se ela não falar
 * de aula, curso ou seção. Antes um código FORA da lista caía na frase padrão sem olhar a frase
 * do servidor, e a sessão de suporte somente leitura (`IMPERSONATION_READONLY`, que não estava na
 * lista) virava um "Tente novamente" que não ia funcionar nunca.
 */
export function conclusaoRecusada(erro: unknown): string {
  return erroDoServidor(erro, 'Não foi possível concluir a fase. Tente novamente.')
}

export const KIDS_LESSON_COPY: LessonCopy = {
  secoes: {
    proxima: 'Próxima parte',
    indice: 'Partes da fase',
    // ⚠️ Nome diferente do `indice`: os dois são rótulos de navegação na mesma tela, e o leitor
    // de tela não distingue dois marcos com o mesmo nome.
    lista: 'Escolha uma parte da fase',
    pendente: 'Falta terminar',
    perfilMudou: 'O perfil mudou. Abra a fase de novo.',
    erroAoAbrir:
      'Não foi possível abrir esta parte. Suas respostas foram mantidas. Tente novamente.',
    semRequisitos: 'Explore o conteúdo e conclua a fase quando terminar.',
    enviarAjuda: 'Enviar para a equipe',
    duvida: 'Em que ponto desta parte você ficou com dúvida?',
    voltarParaSecao: 'Voltar à parte',
    preparando: 'Esta parte ainda está sendo preparada',
    pronta: 'Tudo pronto nesta parte. Pode seguir!',
    prontaUltima: 'Tudo pronto nesta parte!',
  },
  itemPendente,
  erroDoServidor,
  verificacao: {
    botao: 'Verificar esta parte',
    objetivos: 'Objetivos desta parte',
    cumprido: 'Objetivo cumprido!',
    faltou: 'Confira os blocos pedidos nesta parte e tente novamente.',
    grandeDemais:
      'Seu projeto ficou grande demais para conferir. Tire algumas imagens ou sons e tente de novo.',
  },
  acaoDePlataforma: {
    concluida: 'Parte concluída!',
    previa: 'Prévia: a verificação de verdade acontece no perfil de quem faz a fase.',
  },
  cena: {
    perguntaMudou: 'Esta pergunta mudou. Abra a fase de novo.',
  },
  estudio: {
    titulo: 'Seu projeto no Estúdio',
    enviar: 'Enviar meu projeto',
    reenviar: 'Enviar de novo',
    confirmarEnviar: 'Enviar o seu projeto?',
    confirmarReenviar: 'Enviar o seu projeto de novo?',
    vaiReceber: 'A equipe vai receber o seu projeto do jeitinho que está agora.',
    vaiReceberDeNovo: 'A equipe vai receber a versão atual do seu projeto, no lugar da anterior.',
    dicaVerificar: ' Dica: clique em "Verificar" no editor antes, para ver se já alcançou a meta.',
    avisoProjetoInicial:
      'Atenção: você está enviando o projeto inicial da fase por cima do que você já enviou. Se terminou em outro computador, use o menu ⋯ e escolha Trazer o que eu enviei antes.',
    // O componente completa com "(opcional)": na tela fica "Recado (opcional)".
    recado: 'Recado',
    recadoExemplo: 'Se quiser, conte algo para a equipe sobre o seu projeto.',
    enviado: (quando) => (quando ? `Projeto enviado! Foi em ${quando}.` : 'Projeto enviado!'),
    conferido: 'A equipe já viu o seu projeto.',
    paraConcluir: 'Envie o seu projeto para concluir a fase.',
    paraConcluirComMeta:
      'Use "Verificar" no editor e envie o seu projeto. Alcance a meta para concluir a fase.',
    continueConstruindo: 'Continue construindo. Você envia o projeto no fim da fase.',
    compartilharDepois: 'Envie o seu projeto primeiro para poder compartilhar.',
    semEnvio: 'Você ainda não enviou nenhum projeto.',
    trazerExplica:
      'Isto substitui o que você está editando aqui pelo último projeto que você enviou. Use se você terminou em outro computador.',
    recomecarExplica:
      'O Estúdio vai abrir o projeto inicial mais recente desta fase. O que você mudou neste aparelho será substituído. Se você já enviou um projeto, o envio continua guardado.',
    erroAoAbrir: 'Não conseguimos abrir o seu projeto. O que você fez não foi substituído.',
    pontuacao: (score) => `Sua pontuação: ${score}/100`,
    metaAlcancada: '· você alcançou a meta',
    precisaDe: (pontos) => `· a meta é ${pontos} para concluir`,
  },
  pinta: {
    enviar: 'Enviar meu desenho',
    confirmarEnviar: 'Enviar o seu desenho?',
    confirmarReenviar: 'Enviar o seu desenho de novo?',
    enviado: (quando) => (quando ? `Desenho enviado! Foi em ${quando}.` : 'Desenho enviado!'),
    visto: 'A equipe já viu o seu desenho.',
    paraConcluir: 'Envie o seu desenho para concluir a fase.',
    continueDesenhando: 'Continue desenhando. Você envia o desenho no fim da fase.',
    vaiVer: 'A equipe vai ver o seu desenho do jeito que ele está agora.',
    vaiVerDeNovo: 'A equipe vai ver esta versão no lugar da anterior.',
  },
  galeria: {
    instrucaoPinta: 'Escolha os desenhos que você fez nesta fase e envie.',
    instrucaoEstudio: 'Escolha o projeto desta fase na sua galeria e envie.',
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
    eligibleDesc: 'Você arrasou! Clique no botão para pegar o seu certificado.',
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
