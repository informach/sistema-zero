import {
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { objetivos } from './objetivos'
import { montarProjeto, VARIACOES, type Variacao } from './projetos'
import { desafiosIniciaisDoVale } from './quadros-iniciais'

const textos: Record<Variacao, { titulo: string; enunciado: string; dicas: string[] }> = {
  ninhos: {
    titulo: 'Proteja os ninhos',
    enunciado:
      'A cinza do vulcão chega em ondas. Complete três regras: tocar num ninho põe uma cobertura de folhas; Próxima onda começa uma passagem da cinza; quando ela passa, percorra a lista de ninhos e conte os protegidos e os que receberam cinza. Cada proteção vale um ponto e dura uma onda. Cada ninho conta uma vez por onda. Durante a passagem, não mude coberturas nem comece outra onda. A rodada tem três ondas. Recomeçar já está pronto.',
    dicas: [
      'Cenário, lista de ninhos, desenho e reinício já estão montados. Complete os espaços dos eventos e do laço.',
      'Guarde protegido no ninho tocado. Use emOnda para impedir novos cliques durante a passagem.',
      'Em Para cada ninho no grupo ninhos, confira protegido. Some nas contagens certas e tire a marca para a próxima onda.',
    ],
  },
  ondas: {
    titulo: 'Proteja os ninhos: mais uma onda',
    enunciado:
      'O jogo já funciona com três ondas. Mude somente totalDeOndas para quatro. A quarta onda também precisa passar pela lista inteira. Depois dela, Próxima onda não começa outra passagem.',
    dicas: [
      'Procure totalDeOndas em Ao iniciar.',
      'As regras do botão e do fim da rodada já consultam essa variável.',
      'Teste quatro passagens e tente começar uma quinta.',
    ],
  },
  pontos: {
    titulo: 'Proteja os ninhos: dois pontos',
    enunciado:
      'O jogo já funciona. Mude apenas os pontos por proteção para dois. Continue contando um ninho protegido por vez. Ninhos sem cobertura não dão pontos.',
    dicas: [
      'Procure a soma dos pontos dentro da passagem pela lista.',
      'Mude o valor dos pontos, sem mudar as contagens de ninhos.',
      'Cubra um ninho e deixe os outros sem cobertura para comparar.',
    ],
  },
  lista: {
    titulo: 'Proteja os ninhos: mais um ninho',
    enunciado:
      'O jogo já funciona e ninho4 já aparece. Ele ainda está fora da lista ninhos. Inclua esse ninho no grupo ao iniciar. As mesmas regras da lista devem cuidar dos quatro, sem copiar o laço.',
    dicas: [
      'Procure os blocos que acrescentam ninho1, ninho2 e ninho3 ao grupo ninhos.',
      'Acrescente ninho4 à mesma lista. Ele já tem imagem e marca de proteção.',
      'Teste a passagem da cinza e o toque no novo ninho.',
    ],
  },
}
export function criarManifesto(publico: PublicoDoDesafio = 'kids') {
  return ManifestoDeDesafiosSchema.parse({
    formato: 'arquipelago-desafios',
    versao: 1,
    escopo: 'ilha',
    desafios: [
      ...desafiosIniciaisDoVale(publico),
      ...VARIACOES.map((variacao, i) => {
        const tipo = i === 0 ? 'quadro-das-cores' : 'desafio-do-dia'
        const moedas = MOEDAS_PADRAO_POR_TIPO[tipo]
        return {
          slug: `vale-proteja-os-ninhos${i === 0 ? '' : `-${variacao}`}${publico === 'adulto' ? '-adulto' : ''}`,
          publico,
          ilha: 'vale-dos-dinos',
          tipo,
          quadro: i === 0 ? 6 : null,
          ordem: 60 + i,
          publicar: false,
          conteudo: {
            versao: 1,
            ...textos[variacao],
            projetoInicial: montarProjeto(variacao, false),
            gabarito: montarProjeto(variacao, true),
            objetivos: objetivos[variacao],
            desafioExtra: {
              titulo: 'Mais um desafio',
              texto:
                'Faça Enter recomeçar como o botão: limpe ondas, pontos, contagens e coberturas e permita uma nova rodada.',
            },
            recompensa: {
              cor: i === 0,
              atracao: 'proteja-os-ninhos',
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
        publico === 'kids' ? './vale.manifesto.json' : './vale-adulto.manifesto.json',
        import.meta.url,
      ),
      `${JSON.stringify(criarManifesto(publico), null, 2)}\n`,
    )
}
