import { COMUNIDADE_VISUALS } from '../comunidade-dos-criadores/oferta/visuals'

const base = '/img/desafio-primeiro-jogo'
const community = '/img/comunidade-dos-criadores'
type Frame = {
  src: string
  large: string
  alt: string
  width: number
  height: number
  label: string
}
const real = (file: string, label: string, alt: string, height: number, width = 1280): Frame => ({
  src: `${base}/${file}`,
  large: `${base}/${file}`,
  alt,
  label,
  width,
  height,
})
const shared = (key: string): Frame[] =>
  (COMUNIDADE_VISUALS[key]?.frames ?? []).map((frame) => ({
    src: `${community}/${frame.file}`,
    large: `${community}/${frame.retina}`,
    ...frame,
  }))
export const DESAFIO_VISUALS: Record<string, { frames: Frame[]; caption: string }> = {
  farol: {
    frames: [
      real(
        'farol-jogo.png',
        'A Chave do Farol',
        'O personagem, a chave e o farol no projeto real do Desafio.',
        960,
      ),
    ],
    caption:
      'A Chave do Farol em execução: o personagem precisa encontrar a chave para acender a luz.',
  },
  regra: {
    frames: [
      real(
        'farol-blocos.png',
        'Uma regra do Farol',
        'Esquema do caderno do Farol: condição que muda a resposta da porta.',
        1360,
        1364,
      ),
    ],
    caption:
      'Esquema do Caderno do Aluno, com as cores dos blocos do Estúdio. A informação da chave muda a resposta da porta.',
  },
  aula: {
    frames: shared('aula-estudio'),
    caption:
      'Exemplo da mesma interface, no curso Cadê Todo Mundo: explicação e Estúdio lado a lado. No Desafio, a montagem é a do Farol.',
  },
  ajuda: {
    frames: shared('recados'),
    caption:
      'Exemplo do caminho de ajuda na plataforma: a dúvida parte da aula e a conversa continua nos Recados. A resposta acontece por mensagem.',
  },
  mural: {
    frames: shared('publicacao').slice(-1),
    caption:
      'Exemplo da interface de publicação. No Desafio, seu filho aprende a publicar o Farol que construiu; a participação completa dura os 30 dias de acesso.',
  },
  caderno: {
    frames: [
      real(
        'farol-caderno.png',
        'Caderno do Aluno',
        'Página do caderno do Farol com os testes com e sem a chave.',
        2246,
        1588,
      ),
    ],
    caption:
      'Página do Caderno do Aluno do Farol. Os passos acompanham as aulas e podem ser consultados na tela.',
  },
}
