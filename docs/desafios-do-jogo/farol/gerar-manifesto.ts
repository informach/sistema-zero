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
 * final (`farol.concluido`). Os critérios usam os blocos dos três postos de blocos (Lenda, lacunas
 * de 01/11/2026): o extra é a versão 2 e o aprovado vai à revisão humana da Sala do Professor.
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
          desafioExtra: { titulo: 'Versão 2', texto: MEU_JOGO.extra },
          // Lenda (lacunas, 01/11/2026): o extra é a versão 2, e o aprovado vai à revisão humana.
          recompensa: {
            cor: false,
            atracao: 'meu-jogo-do-arquipelago',
            moedas: moedas.principal,
            moedasExtra: moedas.extra,
            extraNaVersao2: true,
            revisaoHumana: true,
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
