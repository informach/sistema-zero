/**
 * A parte comum da fonte editorial dos Poderes do Construtor: o material (o Passo a passo do
 * projeto), o recado do quiz, a montagem guiada (as falas e o Na tela saem dos mesmos segmentos,
 * pelo `montagemPatrulha`) e as frases das guardas de partida e do teste no jogo.
 *
 * Os Poderes seguem o molde dos Poderes do Faísca: montagem guiada completa no vídeo, um gesto por
 * vez, com o destino à vista antes da peça, e o envio na última construção de cada aula.
 */
import type { ConstrutorTrecho } from './construtor-base-tipos'
import { type FalaPatrulha, montagemPatrulha } from './patrulha-espacial-editorial'
import type { PoderTrecho } from './poder-gerador'

export type { FalaPatrulha }

/** Um trecho de montagem, com o que o caderno precisa (passos, testes e os blocos da etapa). */
export type MontagemPoder<E extends string> = PoderTrecho<E> &
  Pick<ConstrutorTrecho, 'steps' | 'tests' | 'blockLabels' | 'blockTypes'> & { objective: string }

export function montagemPoder<E extends string>(
  m: Parameters<typeof montagemPatrulha>[0] & { etapa: E },
): MontagemPoder<E> {
  const t = montagemPatrulha(m)
  return {
    key: t.key,
    title: t.title,
    kind: t.kind as 'build' | 'delivery',
    etapa: m.etapa,
    ponte: t.ponte,
    text: t.text,
    screen: t.screen,
    ...(t.kids?.length ? { kids: t.kids } : {}),
    objective: m.objective,
    steps: m.steps,
    tests: m.tests,
    blockLabels: m.blockLabels,
    blockTypes: m.blockTypes,
  }
}

/** O material da Aula 1 (o mesmo dos Poderes do Faísca). */
export function trechoDoMaterial<E extends string>(): PoderTrecho<E> {
  return {
    key: 'material',
    title: 'O seu Passo a passo do projeto',
    kind: 'material',
    screen:
      'O material é o Passo a passo do projeto, o caderno do bloco de materiais. No "Olha, aqui está o Passo a passo do projeto", apontar o material [apontar livro]. No "Nele estão os passos", colocar o livro em tela cheia [livro tela cheia]. Enquanto a fala segue, as páginas passam uma por trecho, para mostrar mais do caderno. No "para montar o seu Poder", passar da capa para a página seguinte [livro próxima]. No "nas duas aulas", passar mais uma página [livro próxima]. No "com os blocos que você vai usar", passar mais uma página [livro próxima]. No "e o lugar de cada um", passar mais uma página [livro próxima]. No "Por isso, se você esquecer algum passo", passar mais uma página [livro próxima]. No "é só voltar aqui", passar mais uma página [livro próxima]. No "Se quiser", sair da tela cheia [livro sair da tela cheia]. No "você pode ler aqui mesmo", mostrar o livro no tamanho da aula [apontar livro]. No "também pode clicar em Baixar", clicar no botão **Baixar**, ao lado do nome do arquivo [baixar]. No "Agora clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não demonstrar a impressão nem os controles do leitor, nem simular arquivo disponível se o PDF ainda não estiver anexado.',
    ponte:
      'Este é o seu Passo a passo do projeto! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.',
    text: '[engaging, energetic, conversational voice] Olha, aqui está o Passo a passo do projeto. Nele estão os passos para montar o seu Poder nas duas aulas, com os blocos que você vai usar e o lugar de cada um. Por isso, se você esquecer algum passo, é só voltar aqui e abrir o material. [upbeat, encouraging voice] Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o material e consultar onde quiser. [confident, clear, unhurried voice] Agora clique em Próxima parte.',
  }
}

/** O recado do quiz de fechamento (as perguntas sem cena mostram Responder). */
export const RECADO_DO_QUIZ =
  'Escolha uma resposta e clique em Ver o que acontece ou, nas perguntas sem cena, em Responder. Observe a cena e a explicação. Você pode tentar de novo. Quando terminar, clique em Concluir aula.'

/** O Na tela de uma experiência dos Poderes (ESPEC 9.8): só ampliar e mostrar o Zappy. */
export const telaDaExperienciaDoPoder = (cena: string) =>
  `No "Isso você vai testar na experiência", ampliar a experiência [ampliar experiência] e deixar a cena parada, ${cena}. No "O Zappy vai te mostrando", apontar o Zappy ao lado da fala dele [apontar zappy]. No "Quando terminar", voltar ao tamanho da aula [voltar à aula]. No "clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não falar de blocos nem de código. O vídeo explica a ideia e convida, sem mostrar os controles nem a ordem dos testes.`

/** Encontrar uma área do Estúdio (a frase que todas as montagens usam). */
export const encontrar = (area: string): FalaPatrulha => [
  'instrucao',
  `Encontre a área ${area}. Se ela não estiver aparecendo, arraste um espaço vazio entre os blocos até ela aparecer.`,
  `[arrastar até "${area}"]`,
]

/** A guarda da partida do 2D: o Se com a pergunta pronta "o estado do jogo é jogando". */
export function guarda2D(destino: string): FalaPatrulha[] {
  return [
    [
      'instrucao',
      'Deixe o fazer desse relógio à vista. Abra Programação e depois Lógica e Se, e encaixe um Se dentro desse fazer.',
      `[apontar encaixe em "${destino}"] [abrir categoria Programação > Lógica & Se] [encaixar "Se" em "${destino}"]`,
    ],
    [
      'instrucao',
      'Leve a pergunta x maior que zero para a lixeira. Com o espaço da pergunta à vista, abra Jogo 2D, depois Jogo e telas e depois Telas e partida, e encaixe o estado do jogo é.',
      `[jogar na lixeira ">" em "Se dentro de ${destino}"] [abrir categoria Jogo 2D > Jogo e telas > Telas e partida] [encaixar "o estado do jogo é" em "Se dentro de ${destino}" no "Se"]`,
    ],
    [
      'instrucao',
      'Escolha jogando no estado. Assim, nada nasce antes de a partida começar.',
      `[trocar "inicio" por "jogando" em "o estado do jogo é dentro de ${destino}"]`,
    ],
  ]
}

export const TIPOS_GUARDA_2D = ['sz_js_if_else', 'sz_g2d_scene_is']
