import {
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { objetivos } from './objetivos'
import { montarProjeto, VARIACOES, type Variacao } from './projetos'
import { desafiosIniciaisDasNuvens } from './quadros-iniciais'

const textos: Record<Variacao, { titulo: string; enunciado: string; dicas: string[] }> = {
  jardim: {
    titulo: 'Jardim que floresce',
    enunciado:
      'O jardim do céu da Iriê cresce com água, sol e tempo. Complete as teclas e a simulação. Espaço (A no toque) guarda três de água e a seta para cima guarda três de sol. A cada segundo, o tempo aumenta um; se houver água e sol, a flor cresce dez e gasta um de água e um de sol. Quando o crescimento chegar a cem, marque o jardim como florido uma vez só e troque o recado. Sem água ou sem sol, a flor espera, sem perder nada.',
    dicas: [
      'O cenário, a flor e o placar estão prontos. A flor já troca de desenho conforme o crescimento.',
      'Use as variáveis agua, sol, tempo e crescimento. Some e tire um com o bloco de mudar variável.',
      'Dentro de a cada 1 segundo, confira as duas condições, um se dentro do outro: agua maior que zero e sol maior que zero.',
    ],
  },
  'rega-forte': {
    titulo: 'Jardim que floresce: rega forte',
    enunciado:
      'O jardim já funciona. Mude apenas a rega na tecla Espaço: ela passa a guardar cinco de água de uma vez, em vez de três. O sol, o tempo e o crescimento continuam iguais. Regue e veja quanta água sobra depois que o sol acaba.',
    dicas: [
      'Procure o evento da tecla Espaço.',
      'Troque só o número somado em agua.',
      'Com três de sol, a flor gasta três de água: dos cinco, sobram dois.',
    ],
  },
  'sol-forte': {
    titulo: 'Jardim que floresce: sol forte',
    enunciado:
      'O jardim já funciona. Mude apenas o crescimento: quando o sol estiver forte, com seis ou mais, a flor cresce vinte em vez de dez. Com menos sol, ela continua crescendo dez. A água e o sol gastos continuam os mesmos.',
    dicas: [
      'O crescimento fica dentro de a cada 1 segundo.',
      'Use um se e senão: se sol maior ou igual a seis, some vinte; senão, some dez.',
      'Confira o sol antes de tirar um dele.',
    ],
  },
  chuva: {
    titulo: 'Jardim que floresce: chuva',
    enunciado:
      'O jardim já funciona. Faça chover: a cada segundo, antes de a flor crescer, cai um de água no jardim. Com sol, a flor cresce mesmo sem regar. A rega pela tecla Espaço continua igual.',
    dicas: [
      'A chuva entra em a cada 1 segundo, antes da condição da água e do sol.',
      'Some um em agua a cada passo.',
      'Sem regar, observe o crescimento parar quando o sol acaba.',
    ],
  },
}

export function criarManifesto(publico: PublicoDoDesafio = 'kids') {
  return ManifestoDeDesafiosSchema.parse({
    formato: 'arquipelago-desafios',
    versao: 1,
    escopo: 'ilha',
    desafios: [
      ...desafiosIniciaisDasNuvens(publico),
      ...VARIACOES.map((variacao, index) => {
        const tipo = 'desafio-do-dia' as const
        const moedas = MOEDAS_PADRAO_POR_TIPO[tipo]
        return {
          slug: `nuvens-jardim-que-floresce${variacao === 'jardim' ? '' : `-${variacao}`}${publico === 'adulto' ? '-adulto' : ''}`,
          publico,
          ilha: 'nuvens',
          tipo,
          quadro: null,
          ordem: 60 + index,
          // §6.28 A2: o sexto quadro é o desafio na linguagem do posto; o minijogo em blocos
          // continua como desafio do dia (nunca pinta). A1: publica, todas as fontes na trilha.
          publicar: true,
          conteudo: {
            versao: 1,
            ...textos[variacao],
            projetoInicial: montarProjeto(variacao, false),
            gabarito: montarProjeto(variacao, true),
            objetivos: objetivos[variacao],
            desafioExtra: {
              titulo: 'Mais um desafio',
              texto:
                'Faça a tecla Enter recomeçar o jardim: água, tempo e crescimento voltam a zero, o sol volta a três e o jardim deixa de estar florido.',
            },
            recompensa: {
              cor: false,
              atracao: 'jardim-que-floresce',
              moedas: moedas.principal,
              moedasExtra: moedas.extra,
            },
            blocosManuais: { acrescentar: [], retirar: [] },
          },
        }
      }),
    ],
  })
}
if (import.meta.main) {
  for (const publico of ['kids', 'adulto'] as const)
    await Bun.write(
      new URL(
        publico === 'kids' ? './nuvens.manifesto.json' : './nuvens-adulto.manifesto.json',
        import.meta.url,
      ),
      `${JSON.stringify(criarManifesto(publico), null, 2)}\n`,
    )
}
