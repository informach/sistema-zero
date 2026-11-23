/**
 * As peças comuns dos roteiros do Faísca, no molde do Cadê Todo Mundo?, da Chave do Farol e da Ilha
 * do Farol (padrão levantado em 23/11/2026). Antes elas eram privadas da Ilha
 * (`ilha-do-farol-conteudo.ts` e `gerar-ilha-do-farol.ts`); agora servem também ao Jardim, ao Pinta
 * e aos quatro Poderes, para que todos os cursos falem e gravem do mesmo jeito.
 *
 * - `falaDaParte`: a fala de uma parte com as trocas da edição kids (campo `kids`).
 * - `verificar`, `conferir` e `entregar`: as frases fixas de conferir, verificar e enviar
 *   (Diretrizes, seção 6).
 * - `telaDaConferencia`, `telaDaSaida`, `telaDoEnvio` e `telaDaExperiencia`: as receitas do Na tela
 *   para a gravação automática (ESPEC-ROTEIRO, seção 9).
 * - `itensDosMateriais`: os links do bloco de materiais, sem texto para ler (materiais-sem-texto.ts).
 */
import { avatarDaAula } from './avatares-video'
import { ROTULO_DOS_LINKS } from './materiais-sem-texto'
import {
  contextoDeEdicao,
  type IntervencaoKids,
  type ParteFalado,
  semTags,
} from './roteiro-elevenlabs'

/**
 * A fala de uma parte, com as trocas da edição kids (campo `kids`): a Debinha nas aulas 1 e 3 e o
 * Dedé na aula 2 (`avatarDaAula`), como no Cadê e na Chave do Farol. Cada troca é um parágrafo
 * inteiro, com a professora antes e depois, para a edição cortar na frase e não no meio dela.
 */
export const falaDaParte = (
  t: { key: string; text: string; kids?: string[] },
  aula: number,
): ParteFalado => {
  const clipe = `video-${t.key}`
  const paragrafos = t.text.split(/ (?=\[)/)
  const intervencoes = (t.kids ?? []).map((frase, n): IntervencaoKids => {
    const p = paragrafos.findIndex((x) => semTags(x) === frase)
    if (p < 0)
      throw new Error(`${clipe}: a fala do personagem não é um parágrafo da professora: ${frase}`)
    const antes = semTags(paragrafos.slice(0, p).join(' '))
    const depois = semTags(paragrafos.slice(p + 1).join(' '))
    if (!antes || !depois)
      throw new Error(`${clipe}: falta a professora antes ou depois de ${frase}`)
    return {
      id: `${clipe}-K${n + 1}`,
      clipe,
      personagem: avatarDaAula(aula),
      falaPrincipal: frase,
      falaPersonagem: frase,
      ancoraAntes: contextoDeEdicao(antes, 'antes'),
      ancoraDepois: contextoDeEdicao(depois, 'depois'),
      ocorrencia: antes.split(frase).length,
      tags: [paragrafos[p]?.match(/^\[[^\]]+\]/)?.[0] ?? '[curious]'],
    }
  })
  return { clipe, texto: paragrafos.join('\n\n'), intervencoes }
}

/** A conferência depois do teste e a verificação, na fórmula comum (Diretrizes, seção 6). */
export const verificar = (lista: string) =>
  `[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: ${lista}. [reassuring, encouraging voice] Depois de corrigir, teste de novo. [engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. [engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.`
/** Quando o efeito não aparece no jogo (uma variável sem mostrador), a conferência é a única. */
export const conferir = (lista: string) =>
  `[reassuring, encouraging voice] Confira se ficou assim: ${lista}. [engaging, energetic, conversational voice] Agora clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. [engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Próxima parte.`
/** A conferência, a verificação e o envio da última montagem, com o reconhecimento no fim. */
export const entregar = (lista: string, pronto: string, depois: string) =>
  `[reassuring, encouraging voice] Se algo não funcionou no seu jogo, volte aos blocos e confira se ficou assim: ${lista}. [reassuring, encouraging voice] Depois de corrigir, teste de novo. [engaging, energetic, conversational voice] Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente. [engaging, energetic, conversational voice] Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. [pleased, lively voice] ${pronto} [engaging, energetic, conversational voice] ${depois}`

/** Receita "Conferir os blocos" (ESPEC 9.8) e a saída de uma montagem. */
export const telaDaConferencia = (mostrar: string, apontes: [string, string][]) =>
  `No "volte aos blocos e confira se ficou assim", deixar bem à vista os blocos conferidos [mostrar blocos ${mostrar}]. ${apontes
    .map(([citacao, bloco]) => `No "${citacao}", apontar o bloco [apontar bloco "${bloco}"].`)
    .join(' ')} No "Depois de corrigir, teste de novo", voltar a mão para o jogo [apontar prévia].`
export const telaDaSaida =
  'No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido", voltar ao tamanho da aula [reduzir estúdio]. No "clique em Próxima parte", clicar em **Próxima parte** [próxima parte].'
export const telaDoEnvio = (reconhecimento: string, saida: 'Concluir aula' | 'Próxima parte') =>
  `No "Clique em Verificar projeto", verificar [verificar projeto]. No "Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto", clicar em **Enviar meu projeto** [clicar "Enviar meu projeto"]. No "e confirme em Enviar", confirmar em **Enviar**, na janela que abriu [clicar "Enviar"]. No "${reconhecimento}", voltar ao tamanho da aula [reduzir estúdio]. No "Quando aparecer Projeto enviado!, clique em ${saida}", clicar em **${saida}** [${saida === 'Concluir aula' ? 'concluir aula' : 'próxima parte'}].`
/** Receita da experiência (ESPEC 9.8): só ampliar e mostrar o Zappy, sem tocar nos controles. */
export const telaDaExperiencia = (cena: string) =>
  `No "Isso você vai testar na experiência", ampliar a experiência [ampliar experiência] e deixar a cena parada, ${cena}. No "O Zappy vai te mostrando", apontar o Zappy ao lado da fala dele [apontar zappy]. No "Quando terminar", voltar ao tamanho da aula [voltar à aula]. No "clique em Próxima parte", clicar em **Próxima parte** [próxima parte].`
export const MOLDE_DA_EXPERIENCIA =
  'Não falar de blocos nem de código. O vídeo explica a ideia e convida, sem mostrar os controles nem a ordem dos testes (molde do Cadê, 02/11/2026).'

/**
 * Os itens do bloco de materiais (Aula 1, Parte 2): o rótulo dos links e os passo a passo do Como
 * fazer, sem texto para ler (materiais-sem-texto.ts). O livro é o PDF anexado na publicação.
 */
export const itensDosMateriais = () => [
  ROTULO_DOS_LINKS,
  {
    id: 'como-estudio',
    kind: 'link',
    label: 'Como usar o Estúdio',
    url: '/como-fazer/estudio-achar-e-organizar-blocos',
  },
  ...[
    ['plataforma-baixar-materiais', 'Como abrir o Passo a passo do projeto e os materiais'],
    ['plataforma-abrir-uma-aula', 'Como abrir uma aula e trocar de parte'],
    ['plataforma-ampliar-a-atividade', 'Como dar mais espaço ao jogo e à experiência'],
    ['plataforma-pedir-ajuda', 'Como pedir ajuda à equipe'],
  ].map(([slug, label]) => ({ id: slug, kind: 'link', label, url: `/como-fazer/${slug}` })),
]

/** O molde de produção do vídeo de uma parte, com as trocas kids quando a parte tem. */
export const videoPlanejado = (titulo: string, roteiro: string, parte: ParteFalado) =>
  `Título: ${titulo}\n\nMaster integral da professora. Roteiro: ${roteiro}, clipe ${parte.clipe}. ${parte.intervencoes.length ? `Substituições kids: ${JSON.stringify(parte.intervencoes)}. ` : ''}Gravação pendente.`
