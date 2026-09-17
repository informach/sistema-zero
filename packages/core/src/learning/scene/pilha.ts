import type { SceneId } from './actions'

/**
 * Como a pilha da `layers` se APRESENTA: a lista de blocos do Estúdio ou o painel Camadas do Pinta.
 *
 * ⭐⭐ Full review de experiência do conjunto (16/09/2026, A1). A mesma bancada servia às duas
 * ferramentas, e as duas leem a pilha AO CONTRÁRIO:
 * - no Estúdio a lista de blocos é desenhada de CIMA PARA BAIXO, e quem está embaixo é desenhado por
 *   último (fica na frente). É o Corre Dino Aula 2, e ali a pilha de sempre está certa;
 * - no Pinta o painel Camadas lista a forma da FRENTE em CIMA (`LayerPanel` e `VectorLayerPanel`
 *   invertem a lista "como a criança vê o desenho"), e o gesto é "Uma camada para trás".
 * No Meu Jeito Aula 5 a cena ensinava "para a chama ir para trás, SUBA a chama", e dois minutos
 * depois o Pinta fazia a chama DESCER. Com `camadas` a pilha desenha a da frente em cima e fala com os
 * nomes dos botões do Pinta (`pinta/src/core/copy.ts`).
 *
 * ⚠️⚠️ É SÓ APRESENTAÇÃO: as ações (`layer`), as metas e o motor são os mesmos. O que muda são os textos
 * que falam da LISTA (a faixa, os pedidos das metas, a escada de pistas e a bancada), porque são eles
 * que dizem para que lado mexer.
 * ⚠️ Ausente = `blocos`: todo bloco que já existe continua como estava.
 */
export type ScenePilha = 'blocos' | 'camadas'

export const SCENE_PILHAS: readonly ScenePilha[] = ['blocos', 'camadas']

/** A pilha vale nesta cena? Só a `layers` tem ordem de desenhar. */
export function scenePilhaAceita(scene: SceneId): boolean {
  return scene === 'layers'
}

/** A apresentação em uso: `camadas` só na `layers` e só quando declarada. */
export function emCamadas(scene: SceneId, pilha?: ScenePilha): boolean {
  return scene === 'layers' && pilha === 'camadas'
}

/**
 * Os textos da `layers` que falam da LISTA, no vocabulário do painel Camadas do Pinta.
 *
 * ⚠️ Mesmas regras dos textos do catálogo: o pedido é um GESTO com o nome que o botão tem ("Uma camada
 * para trás"), nunca o resultado; tudo sobrevive ao elenco ("o Dino"/"a floresta" viram "a pedra"/"a
 * chama"). ⚠️ "Mande X uma camada para trás" é o gesto da criança no Pinta: selecionar a forma e
 * apertar o botão.
 */
export const LAYERS_CAMADAS = {
  /** A escada de pistas (a mesma meta por degrau que a de blocos: `PISTA_DA_META`). */
  hints: [
    'Onde está o resto do Dino?',
    'Olhe a lista Camadas. A de cima fica na frente.',
    'Mande a floresta uma camada para trás.',
  ],
  /** O pedido de cada meta. */
  pedidos: {
    front: 'Mande a floresta uma camada para trás.',
    covered: 'Com o Dino em cima da lista Camadas, mande a floresta uma camada para a frente.',
    'back-in-front': 'Mande a floresta uma camada para trás de novo.',
  } as Readonly<Record<string, string>>,
  /** Os atalhos da escada quando a primeira missão já caiu (ver `degrau`). */
  depoisDaFrente: [
    'Agora esconda o Dino de novo, só mudando as camadas.',
    'Com o Dino em cima da lista, mande a floresta uma camada para a frente.',
  ],
} as const
