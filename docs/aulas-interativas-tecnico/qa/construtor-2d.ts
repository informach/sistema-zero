import { resolve } from 'node:path'
import { aulas2D } from './construtor-2d-conteudo'
import { criterios2D } from './construtor-2d-criterios'
import { etapas2D, projeto2D } from './construtor-2d-projetos'
import type { ConstrutorBaseConfig } from './construtor-base-tipos'

export const config2D: ConstrutorBaseConfig = {
  curso: 'nave-contra-asteroides',
  pasta: resolve(import.meta.dir, '../../aulas-interativas/construtor/nave-contra-asteroides'),
  prefixo: 'nave-contra-asteroides',
  nome: 'Nave Contra Asteroides',
  dimensao: '2d',
  chain: 'nave-contra-asteroides',
  etapas: etapas2D,
  etapaFinal: 'final',
  montarProjeto: projeto2D,
  checks: criterios2D,
  aulas: aulas2D,
  jogoPronto: {
    title: 'Experimente Nave Contra Asteroides',
    instrucoes:
      'Clique no jogo e pressione Enter para começar. Use as setas esquerda e direita para mover a nave e toque em Espaço para disparar. Acerte 20 asteroides antes de perder três vidas. Depois do resultado, Enter volta ao início e outro Enter começa novamente. Jogue o quanto quiser; quando terminar, clique em Próxima parte.',
    palco: { width: 800, height: 480 },
  },
  introducaoPassoAPasso:
    'Construa as regras de Nave Contra Asteroides: faça a nave se mover, crie lasers e asteroides, programe os acertos, conte pontos e cuide das vidas. Depois, use as condições de vitória e derrota para fechar a partida e teste o reinício. As escolhas de nave, espaço, asteroide e laser mudam a aparência. Você pode consultar cada parte quando precisar de um passo.',
}
