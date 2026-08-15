import type { StudentLevelSlug } from './types'

export interface CareerRewardInfo {
  title: string
  description: string
}

/**
 * O que cada POSTO da carreira abre, do jeito que a criança lê.
 *
 * ⚠️ **Desde a reforma do currículo (08/2026), o posto NÃO libera mais blocos.** Quem põe
 * ferramenta na caixa é o CURSO (`studioUnlockBlocks`): bônus entrega ao concluir; curso com
 * posição entrega ao concluir e publicar. O posto decide só o MODO do editor
 * (livre → Ponte → Pro) e quais PRODUTOS abrem. Anunciar kit por nível aqui
 * ("Jogo 2D Essencial", "Jogo 3D Iniciante") virou promessa falsa: a criança sobe de posto e a
 * caixa não muda.
 *
 * Por isso três postos do meio (Explorador(a), Mestre, Arquiteto(a)) não anunciam ferramenta
 * nenhuma — porque não abrem nenhuma. O que eles dão de verdade é o posto e a trilha nova, e é
 * isso que a copy diz. `tests/career-rewards-conformance.test.ts` trava as promessas contra o
 * core e contra as constantes dos portões.
 */
export const CAREER_REWARD_INFO: Record<StudentLevelSlug, CareerRewardInfo> = {
  noob: {
    title: 'O Estúdio nas aulas',
    description: 'Você já cria dentro das aulas, com as peças que o curso ensina.',
  },
  coder: {
    title: 'Estúdio livre + Pinta',
    description:
      'Você cria os seus jogos quando quiser, com as ferramentas dos cursos que terminou, e desenha os seus personagens no Pinta.',
  },
  hacker: {
    title: 'Pensa + Zappy',
    description:
      'O Pensa te ajuda a planejar a ideia do jogo, e o Zappy fica do seu lado dentro do Estúdio.',
  },
  explorer: {
    title: 'Um posto novo no mapa',
    description: 'Uma trilha nova se abre, com jogos que levam você para mundos maiores.',
  },
  elite: {
    title: 'Um posto novo no mapa',
    description: 'Uma trilha nova, com jogos bem mais caprichados.',
  },
  architect: {
    title: 'Um posto novo no mapa',
    description: 'Uma trilha nova, para construir cenários inteiros.',
  },
  champion: {
    title: 'Modo Ponte',
    description: 'Veja os blocos e o código lado a lado, trabalhando juntos.',
  },
  god: {
    title: 'Modo Pro',
    description: 'Escreva o jogo direto no código, como os criadores profissionais fazem.',
  },
}

export function careerRewardInfo(slug: string | undefined): CareerRewardInfo {
  return CAREER_REWARD_INFO[slug as StudentLevelSlug] ?? CAREER_REWARD_INFO.noob
}
