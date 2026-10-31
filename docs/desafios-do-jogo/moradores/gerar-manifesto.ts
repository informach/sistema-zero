import {
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { gravarManifesto } from '../gravar-manifesto'
import { objetivosDoPedido, PEDIDO_DO_NICO, projetoDoPedido } from './projetos'

/**
 * Os pedidos dos moradores no Estúdio (§6.28, A23), começando pelo Nico, na sua ilha: um pedido
 * curto, como a proposta diz ("uma placa que acende à noite"). Não pinta (a sua ilha já tem cor);
 * feito, a placa do Nico acende à noite no jogo. Publica: só blocos da trilha do Faísca.
 */
const textos: Record<PublicoDoDesafio, { enunciado: string; dicas: string[]; extra: string }> = {
  kids: {
    enunciado:
      'O Nico pendurou uma placa na praia, mas à noite ninguém consegue ler. Programe a barra de espaço para acender a placa: dentro do evento, guarde verdadeiro em acesa. O Se que desenha a placa acesa ou apagada já está pronto.',
    dicas: [
      'O evento da barra de espaço já está no espaço de blocos. Dentro dele vai uma ação só.',
      'A informação acesa começa falsa. O Se olha para ela a cada quadro.',
    ],
    extra: 'Faça o Enter apagar a placa de novo, guardando falso em acesa.',
  },
  adulto: {
    enunciado:
      'A placa do Nico precisa acender à noite. O cenário e a decisão que desenha a placa acesa ou apagada estão prontos. No evento da barra de espaço, atribua verdadeiro à variável acesa.',
    dicas: [
      'O evento da barra de espaço já existe; falta a ação dentro dele.',
      'A variável acesa começa falsa e é lida pela decisão a cada quadro.',
    ],
    extra: 'O Enter apaga a placa: atribua falso à variável acesa.',
  },
}

export function criarManifesto(publico: PublicoDoDesafio = 'kids') {
  const moedas = MOEDAS_PADRAO_POR_TIPO['pedido-de-morador']
  const t = textos[publico]
  return ManifestoDeDesafiosSchema.parse({
    formato: 'arquipelago-desafios',
    versao: 1,
    escopo: 'ilha',
    desafios: [
      {
        slug: `nico-${PEDIDO_DO_NICO.slug}${publico === 'adulto' ? '-adulto' : ''}`,
        publico,
        ilha: 'sua-ilha',
        tipo: 'pedido-de-morador',
        quadro: null,
        ordem: 80,
        publicar: true,
        conteudo: {
          versao: 1,
          titulo: PEDIDO_DO_NICO.titulo,
          enunciado: t.enunciado,
          dicas: t.dicas,
          projetoInicial: projetoDoPedido(false),
          gabarito: projetoDoPedido(true),
          objetivos: objetivosDoPedido(),
          desafioExtra: {
            titulo: publico === 'kids' ? 'Mais um desafio' : 'Extra',
            texto: t.extra,
          },
          recompensa: { cor: false, moedas: moedas.principal, moedasExtra: moedas.extra },
          blocosManuais: { acrescentar: [], retirar: [] },
        },
      },
    ],
  })
}

if (import.meta.main)
  for (const publico of ['kids', 'adulto'] as const)
    await gravarManifesto(
      new URL(
        `./sua-ilha-moradores${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`,
        import.meta.url,
      ),
      criarManifesto(publico),
    )
