import {
  DesafioDoManifestoSchema,
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { MEU_JOGO, objetivosDoMeuJogo, projetoDoMeuJogo } from './projetos'

/**
 * O projeto autoral do Farol (C03b): um quadro só, opcional, que não pinta nada (`cor: false`) e
 * entrega o jogo da pessoa ao fliperama. O cavalete aparece ao lado da porta do Farol depois do
 * final (`farol.concluido`). Pede publicação: os critérios usam só blocos da trilha do Faísca.
 */
export function criarManifesto(publico: PublicoDoDesafio = 'kids') {
  const moedas = MOEDAS_PADRAO_POR_TIPO['quadro-das-cores']
  return ManifestoDeDesafiosSchema.parse({
    formato: 'arquipelago-desafios',
    versao: 1,
    escopo: 'ilha',
    desafios: [
      DesafioDoManifestoSchema.parse({
        slug: `farol-${MEU_JOGO.slug}${publico === 'adulto' ? '-adulto' : ''}`,
        publico,
        ilha: 'farol',
        tipo: 'quadro-das-cores',
        quadro: 1,
        ordem: 10,
        publicar: true,
        conteudo: {
          versao: 1,
          titulo: MEU_JOGO.titulo,
          enunciado: MEU_JOGO.texto,
          dicas: [...MEU_JOGO.dicas],
          projetoInicial: projetoDoMeuJogo(false),
          gabarito: projetoDoMeuJogo(true),
          objetivos: objetivosDoMeuJogo(),
          desafioExtra: { titulo: 'Mais um desafio', texto: MEU_JOGO.extra },
          recompensa: {
            cor: false,
            atracao: 'meu-jogo-do-arquipelago',
            moedas: moedas.principal,
            moedasExtra: moedas.extra,
          },
          blocosManuais: { acrescentar: [], retirar: [] },
        },
      }),
    ],
  })
}

if (import.meta.main) {
  for (const publico of ['kids', 'adulto'] as const)
    await Bun.write(
      new URL(`./farol${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`, import.meta.url),
      `${JSON.stringify(criarManifesto(publico), null, 2)}\n`,
    )
}
