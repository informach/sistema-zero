import {
  type GiftAudience,
  giftDurationLabel,
  type ReferralGiftOfferView,
  type ReferralGiftView,
} from '@sistemazero/core/referrals'
import type { EstadoPresente, EstadosPresente } from './presente'
import { PRESENTE_KIDS } from './presente'
import { PRESENTE_ADULTO } from './presente-adulto'
import { cursoDoPresente } from './presente-resgate'

/**
 * A página enxuta do presente quando o curso NÃO é o Cadê Todo Mundo (15/11/2026). O texto vem
 * da oferta do presente (nome do curso, prazo e Mural); não há seções editoriais de um curso
 * específico. Duas variantes:
 * - `pais`: curso PARA PAIS (`learner: 'parents'`), um presente para o pai ou a mãe, sem Mural,
 *   sem perfil do filho; depois do cadastro, o curso fica em Cursos para pais;
 * - `curso`: outro curso de criança (Kids) ou adulto, com o nome e o prazo.
 * `PresenteCursoOferta.astro` renderiza todo texto visível a partir daqui.
 */
export interface PresenteCursoCopy {
  seoTitle: string
  description: string
  origem: { pessoal: string; evento: string; campanha: string }
  hero: {
    titulo: { antes: string; destaque: string }
    texto: string
    beneficios: string[]
    cta: string
  }
  condicoes: {
    etiqueta: string
    titulo: string
    cartoes: { titulo: string; texto: string }[]
    cta: string
  }
  resgatar: { etiqueta: string; titulo: string; texto: string }
  barra: { titulo: string; texto: string; cta: string }
  estados: EstadosPresente
}

const SEM_CARTAO = 'Presente gratuito, sem cartão e sem assinatura automática'

export function presenteCursoCopy(
  audience: GiftAudience,
  gift: ReferralGiftOfferView,
  variante: 'pais' | 'curso',
): PresenteCursoCopy {
  const curso = cursoDoPresente(gift)
  const dias = gift.accessDays === null ? null : giftDurationLabel(gift.accessDays)
  const adulto = audience === 'adult'
  const pais = variante === 'pais' && !adulto
  const mural = gift.includesMural && !pais
  const nomeMural = adulto ? 'Mural adulto' : 'Mural'
  const acesso = `ao curso${mural ? ` e ao ${nomeMural}` : ''}`
  const linhaDoAcesso = dias ? `${dias} de acesso ${acesso}` : `Acesso ${acesso}, sem prazo`
  const prazoNoCadastro = dias ? ` O prazo de ${dias} começa quando o cadastro é aceito.` : ''
  const base = adulto ? PRESENTE_ADULTO.estados : PRESENTE_KIDS.estados
  const valePor = dias
    ? `O presente vale ${dias} contados do cadastro`
    : 'O curso do presente não tem prazo'
  const estado = (de: EstadoPresente, texto: string): EstadoPresente => ({ ...de, texto })
  const estados: EstadosPresente = {
    ...base,
    preparing: estado(
      base.preparing,
      `Guarde esta página e volte em alguns dias. ${valePor}, então nada se perde enquanto isso.`,
    ),
    scheduled: estado(
      base.scheduled,
      `Guarde esta página e volte a partir dessa data. ${valePor}.`,
    ),
    ended: estado(
      base.ended,
      `Quem começou o cadastro antes pode retomar com o mesmo e-mail. Quem recebeu o presente dentro do período mantém ${dias ? `os ${dias} contados do cadastro` : 'o acesso ao curso'}.`,
    ),
  }
  const gratuito = {
    titulo: 'Gratuito, sem cartão',
    texto: dias
      ? 'Quando o prazo termina, nenhuma assinatura ou cobrança começa.'
      : 'Nenhuma assinatura ou cobrança começa por causa deste presente.',
  }
  const cartaoDoCurso = {
    titulo: dias ? `O curso por ${dias}` : 'O curso, sem prazo',
    texto: dias
      ? `${curso}, com o acesso contado a partir do cadastro aceito para resgatar o presente.`
      : `${curso}, na sua conta, sem data para terminar.`,
  }
  const barra = {
    titulo: dias ? `Presente de ${dias}` : 'Presente sem prazo',
    texto: 'Sem cartão',
    cta: pais ? 'Quero o meu curso' : 'Quero o presente',
  }

  if (pais)
    return {
      seoTitle: `Presente para pais: ${curso} | Sistema Zero`,
      description: `O curso ${curso} de presente para você, pai ou mãe, ${dias ? `por ${dias}` : 'sem prazo'}, sem cartão e sem assinatura.`,
      origem: {
        pessoal: 'Um presente de {{nome}} para você',
        evento: '{{nome}}',
        campanha: '{{nome}}',
      },
      hero: {
        titulo: { antes: `${curso}: `, destaque: 'um curso para você, pai ou mãe.' },
        texto:
          'Este presente é seu. O curso fica na área dos pais do Sistema Zero Kids, com aulas gravadas para você assistir quando puder.',
        beneficios: ['Um curso para você, pai ou mãe', linhaDoAcesso, SEM_CARTAO],
        cta: 'Quero o meu curso',
      },
      condicoes: {
        etiqueta: 'O que o presente inclui',
        titulo: `O curso ${curso}, de presente para você`,
        cartoes: [
          cartaoDoCurso,
          {
            titulo: 'Na área dos pais',
            texto:
              'Depois do cadastro, entre na área dos pais e abra o curso em Cursos para pais. Você assiste pelo navegador.',
          },
          gratuito,
        ],
        cta: 'Quero o meu curso',
      },
      resgatar: {
        etiqueta: 'Seu cadastro',
        titulo: 'Resgate o seu curso',
        texto: `Cadastre a conta com os seus dados. Depois, entre na área dos pais e abra o curso em Cursos para pais.${prazoNoCadastro}`,
      },
      barra,
      estados,
    }

  if (adulto)
    return {
      seoTitle: `Presente: ${curso} | Sistema Zero`,
      description: `O curso ${curso} de presente para você, ${dias ? `por ${dias}` : 'sem prazo'}, sem cartão e sem assinatura. Para quem tem 18 anos ou mais.`,
      origem: {
        pessoal: 'PRESENTE DE {{nome}}',
        evento: '{{nome}}',
        campanha: '{{nome}}',
      },
      hero: {
        titulo: { antes: `${curso}, `, destaque: 'de presente para você.' },
        texto: `Você recebe o curso ${curso} na Comunidade dos Criadores, com aulas gravadas e orientação, para fazer no seu tempo.`,
        beneficios: ['Para quem tem 18 anos ou mais', linhaDoAcesso, SEM_CARTAO],
        cta: 'Quero o meu presente',
      },
      condicoes: {
        etiqueta: 'O SEU PRESENTE',
        titulo: 'O que o presente inclui',
        cartoes: [
          cartaoDoCurso,
          ...(mural
            ? [
                {
                  titulo: 'Mural adulto',
                  texto: dias
                    ? `Durante os ${dias}, você publica, comenta e reage no Mural adulto.`
                    : 'Você publica, comenta e reage no Mural adulto.',
                },
              ]
            : []),
          gratuito,
        ],
        cta: 'Liberar o meu presente',
      },
      resgatar: {
        etiqueta: 'SEU CADASTRO',
        titulo: 'Resgate o seu presente',
        texto: `Cadastre-se com os seus dados e abra o curso no navegador.${prazoNoCadastro}`,
      },
      barra,
      estados,
    }

  return {
    seoTitle: `Presente: ${curso} | Sistema Zero`,
    description: `O curso ${curso} de presente para o seu filho, ${dias ? `por ${dias}` : 'sem prazo'}, sem cartão e sem assinatura.`,
    origem: PRESENTE_KIDS.origem,
    hero: {
      titulo: { antes: `${curso}, `, destaque: 'de presente para o seu filho.' },
      texto: `Seu filho recebe o curso ${curso} na plataforma do Sistema Zero Kids, com aulas gravadas e orientação. Você faz o cadastro com os seus dados e, depois, cria o perfil dele na plataforma.`,
      beneficios: [
        'Pensado para crianças de 5 a 17 anos; abaixo de 9 anos, precisa de acompanhante',
        linhaDoAcesso,
        SEM_CARTAO,
      ],
      cta: 'Quero o presente para meu filho',
    },
    condicoes: {
      etiqueta: 'O que o presente inclui',
      titulo: `O curso ${curso}, de presente`,
      cartoes: [
        cartaoDoCurso,
        ...(mural
          ? [
              {
                titulo: 'Mural para compartilhar',
                texto: dias
                  ? `Durante os ${dias}, seu filho pode publicar, comentar e reagir no Mural dos Criadores.`
                  : 'Seu filho pode publicar, comentar e reagir no Mural dos Criadores.',
              },
            ]
          : []),
        gratuito,
      ],
      cta: 'Quero o presente para meu filho',
    },
    resgatar: {
      etiqueta: 'O primeiro passo é do responsável',
      titulo: 'Resgate o presente para o seu filho',
      texto: `Cadastre a conta com os seus dados. Depois, na plataforma, crie o perfil do seu filho e abra o curso.${prazoNoCadastro}`,
    },
    barra,
    estados,
  }
}

/**
 * O selo de quem dá o presente na página da oferta no modo presente (25/11/2026): a mesma frase
 * do topo da página do presente ("Um presente de Mariana para você", ou o título da campanha).
 */
export function origemDoPresente(
  gift: ReferralGiftView & { gift: ReferralGiftOfferView },
  variante: 'pais' | 'curso',
): string {
  const audience = gift.audience === 'adult' ? 'adult' : 'kids'
  const P = presenteCursoCopy(audience, gift.gift, variante)
  const origem =
    gift.source.kind !== 'campaign'
      ? P.origem.pessoal
      : gift.source.context === 'event'
        ? P.origem.evento
        : P.origem.campanha
  return origem.replace('{{nome}}', gift.source.name)
}
