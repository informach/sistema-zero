import { resolve } from 'node:path'
import type { ConstrutorBaseConfig } from './construtor-base-tipos'
import { patrulhaAula1 } from './patrulha-espacial-aula-1'
import { patrulhaAula2 } from './patrulha-espacial-aula-2'
import { patrulhaAula3 } from './patrulha-espacial-aula-3'
import { patrulhaAula4 } from './patrulha-espacial-aula-4'
import { patrulhaAula5 } from './patrulha-espacial-aula-5'
import { patrulhaAssetsPortateis } from './patrulha-espacial-assets'
import { patrulhaChecks } from './patrulha-espacial-criterios'
import { montarProjetoPatrulha, PATRULHA_CURSO, PATRULHA_ETAPAS } from './patrulha-espacial-projeto'

export const config3D: ConstrutorBaseConfig = {
  curso: PATRULHA_CURSO,
  pasta: resolve(import.meta.dirname, '../../aulas-interativas/construtor/patrulha-espacial'),
  prefixo: 'patrulha-espacial',
  nome: 'Patrulha Espacial',
  dimensao: '3d',
  chain: 'construtor-patrulha-espacial',
  etapas: PATRULHA_ETAPAS,
  etapaFinal: 'completo',
  montarProjeto: montarProjetoPatrulha,
  portatil: (projeto) => ({ ...projeto, assets: patrulhaAssetsPortateis() }),
  checks: patrulhaChecks,
  aulas: [patrulhaAula1, patrulhaAula2, patrulhaAula3, patrulhaAula4, patrulhaAula5],
  jogoPronto: {
    title: 'Experimente a Patrulha Espacial',
    instrucoes:
      'Clique no jogo e pressione Enter. Mova a nave com as setas esquerda e direita; cada aperto de Espaço dispara um laser. Acerte 20 asteroides antes de perder as três vidas. Asteroides que passam sem bater não tiram vida. Depois de um resultado, clique em Voltar ao início; Enter começa outra partida. Experimente o quanto quiser. Não é preciso vencer para seguir.',
  },
  introducaoPassoAPasso:
    'Depois de Nave Contra Asteroides, você vai levar a mesma ideia para uma rota com profundidade. Monte os disparos, o surgimento dos asteroides, os limites, os acertos, os pontos, as vidas e as decisões de resultado. As investigações da Ilha vão ajudar a entender as três direções e o contato de verdade. Este guia mostra onde procurar os blocos, onde encaixar e como testar cada conquista. Consulte a parte que precisar e volte ao seu jogo.',
}
