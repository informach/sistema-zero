import type { Ilha } from '@sistemazero/arquipelago-contracts'
import type { VozDoJogo } from '../interface/voz'
import { POSICAO_DO_MOLDA } from '../sistemas/construcao/projeto-azul'

/**
 * A voz do jogo na comunidade adulta: o mesmo formato da `VOZ_KIDS`, na voz do community
 * (sem travessão, sem exclamação, sem "IA" solta). A jornada adulta tem etapas com nomes que a
 * equipe publica no Members; o jogo só sabe a POSIÇÃO (`Plataforma.lerJornada`), então fala da
 * etapa pelo número, na mesma posição em que o posto abre a ilha no Kids (`ilhas.ts`).
 */
function falaDaLuneta(ilha: Ilha): string {
  if (ilha.id === 'farol') return 'Lá está o Farol, ao lado da sua casa.'
  const artigo = ilha.id === 'vila-doce' || ilha.id === 'nuvens' ? 'a' : 'o'
  return `Lá é ${artigo} ${ilha.nome}. A ponte abre quando você chegar à etapa ${ilha.posicao} da sua jornada.`
}

export const VOZ_ADULTA: VozDoJogo = {
  carregando: {
    titulo: 'Acendendo o Arquipélago',
    texto: 'Trazendo a sua casa e o seu avatar.',
  },
  bloqueado: {
    titulo: 'Ainda não abriu para você',
    motivos: {
      desligado: 'O Arquipélago Vagalume ainda não abriu. A equipe avisa quando chegar a sua vez.',
      'fora-da-lista':
        'O Arquipélago Vagalume está abrindo aos poucos. A equipe avisa quando chegar a sua vez.',
      'publico-desligado': 'O Arquipélago Vagalume ainda não chegou à comunidade adulta.',
    },
  },
  // A comunidade adulta não tem limite diário (o serviço manda `null`); a tela existe pelo
  // formato e nunca aparece enquanto essa regra valer.
  descanso: {
    titulo: 'O tempo de hoje acabou',
    texto: 'A sua casa e a sua horta continuam aqui amanhã.',
  },
  erro: {
    titulo: 'O Arquipélago não abriu agora',
    texto: 'Não foi possível carregar o jogo. Tente de novo daqui a pouco.',
  },
  voltar: 'Voltar para a comunidade',
  falaDaLuneta,
  placaDaPonte: (ilha) => ({ antes: 'A ponte abre na', marco: `etapa ${ilha.posicao} da jornada` }),
  recadoDaIris: (ilha) =>
    `Tem mais para descobrir. A ponte abre na etapa ${ilha.posicao} da sua jornada. Íris.`,
  moldaFechado: `Abre na etapa ${POSICAO_DO_MOLDA} da sua jornada`,
  compraSomenteLeitura: 'No acesso de suporte o jogo só mostra. A compra fica com a pessoa.',
}
