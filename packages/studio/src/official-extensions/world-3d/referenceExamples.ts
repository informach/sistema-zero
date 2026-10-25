import type { ExtensionExample } from '#extensions'

export const folioProceduralExample: ExtensionExample = {
  name: 'Passeio das Letras',
  experience: 'exploration',
  description:
    'Um mundo de passeio a pé e de jipe: letras empurráveis, objetos que voam com a física, caminhos tortinhos e um bairro criativo. Tudo desenhado com formas simples, sem nenhum arquivo.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'world-3d' }],
    version: 2,
    behavior: {
      start: [
        {
          type: 'w3d:setup',
          style: 'floresta',
          world: {
            type: 'num',
            value: 240,
          },
        },
        {
          type: 'w3d:quality',
          mode: 'automatica',
        },
        {
          type: 'w3d:terrain',
          h: {
            type: 'num',
            value: 5,
          },
          s: {
            type: 'num',
            value: 7,
          },
        },
        {
          type: 'w3d:roadGrid',
          layout: 'organica',
          x: {
            type: 'num',
            value: 0,
          },
          z: {
            type: 'num',
            value: 0,
          },
          size: {
            type: 'num',
            value: 150,
          },
          width: {
            type: 'num',
            value: 7,
          },
        },
        {
          type: 'w3d:district',
          kind: 'turistico',
          x: {
            type: 'num',
            value: 45,
          },
          z: {
            type: 'num',
            value: -30,
          },
          size: {
            type: 'num',
            value: 42,
          },
        },
        {
          type: 'w3d:houseRow',
          n: {
            type: 'num',
            value: 8,
          },
          x1: {
            type: 'num',
            value: -55,
          },
          z1: {
            type: 'num',
            value: 25,
          },
          x2: {
            type: 'num',
            value: 10,
          },
          z2: {
            type: 'num',
            value: 45,
          },
          style: 'coloridas',
        },
        {
          type: 'w3d:clearArea',
          x: {
            type: 'num',
            value: 0,
          },
          z: {
            type: 'num',
            value: 0,
          },
          r: {
            type: 'num',
            value: 38,
          },
        },
        {
          type: 'w3d:scatter',
          n: {
            type: 'num',
            value: 260,
          },
          thing: 'arvores',
        },
        {
          type: 'w3d:scatter',
          n: {
            type: 'num',
            value: 80,
          },
          thing: 'pedras',
        },
        {
          type: 'w3d:person',
          color: '#f97316',
          hat: 'bone',
        },
        {
          type: 'w3d:personAccessory',
          acc: 'botas',
        },
        {
          type: 'w3d:car',
          style: 'jipe',
          color: '#ef4444',
        },
        {
          type: 'w3d:letters',
          word: 'CRIAR',
          x: {
            type: 'num',
            value: 0,
          },
          z: {
            type: 'num',
            value: 14,
          },
          s: {
            type: 'num',
            value: 1.4,
          },
        },
        {
          type: 'w3d:pushScatter',
          n: {
            type: 'num',
            value: 18,
          },
          x: {
            type: 'num',
            value: 22,
          },
          z: {
            type: 'num',
            value: 8,
          },
          r: {
            type: 'num',
            value: 12,
          },
        },
        {
          type: 'w3d:explosive',
          x: {
            type: 'num',
            value: 28,
          },
          z: {
            type: 'num',
            value: 8,
          },
        },
        {
          type: 'w3d:totemText',
          x: {
            type: 'num',
            value: 0,
          },
          z: {
            type: 'num',
            value: 7,
          },
          title: 'Passeio das Letras',
          body: 'Explore, dirija, empurre as letras e encontre a cidade criativa.',
        },
      ],
      events: [],
      loops: [],
    },
  },
}

export const coastalProceduralExample: ExtensionExample = {
  name: 'Costa das Ilhas',
  experience: 'exploration',
  description:
    'Um arquipélago para explorar com personagem, jetpack, barco, pontes, farol, palmeiras, moedas e missão. Uma costa inteira feita só com formas simples.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'world-3d' }],
    version: 2,
    behavior: {
      start: [
        {
          type: 'w3d:setup',
          style: 'praia',
          world: {
            type: 'num',
            value: 260,
          },
        },
        {
          type: 'w3d:quality',
          mode: 'automatica',
        },
        {
          type: 'w3d:islands',
          n: {
            type: 'num',
            value: 5,
          },
          y: {
            type: 'num',
            value: 0,
          },
        },
        {
          type: 'w3d:person',
          color: '#0ea5e9',
          hat: 'palha',
        },
        {
          type: 'w3d:personAccessory',
          acc: 'jetpack',
        },
        {
          type: 'w3d:boat',
          color: '#f8fafc',
        },
        {
          type: 'w3d:bridge',
          x1: {
            type: 'num',
            value: 0,
          },
          z1: {
            type: 'num',
            value: 22,
          },
          x2: {
            type: 'num',
            value: 42,
          },
          z2: {
            type: 'num',
            value: 18,
          },
          w: {
            type: 'num',
            value: 4,
          },
        },
        {
          type: 'w3d:bridge',
          x1: {
            type: 'num',
            value: 42,
          },
          z1: {
            type: 'num',
            value: 18,
          },
          x2: {
            type: 'num',
            value: 72,
          },
          z2: {
            type: 'num',
            value: -24,
          },
          w: {
            type: 'num',
            value: 4,
          },
        },
        {
          type: 'w3d:lighthouse',
          x: {
            type: 'num',
            value: 76,
          },
          z: {
            type: 'num',
            value: -28,
          },
        },
        {
          type: 'w3d:scatter',
          n: {
            type: 'num',
            value: 180,
          },
          thing: 'palmeiras',
        },
        {
          type: 'w3d:coinsLine',
          n: {
            type: 'num',
            value: 18,
          },
          x1: {
            type: 'num',
            value: 0,
          },
          z1: {
            type: 'num',
            value: 12,
          },
          x2: {
            type: 'num',
            value: 72,
          },
          z2: {
            type: 'num',
            value: -24,
          },
        },
        {
          type: 'w3d:quest',
          name: 'Explorador da costa',
          desc: 'Atravesse as ilhas e chegue ao farol.',
        },
        {
          type: 'w3d:totemText',
          x: {
            type: 'num',
            value: 0,
          },
          z: {
            type: 'num',
            value: 8,
          },
          title: 'Costa das Ilhas',
          body: 'Use o barco, as pontes ou o jetpack para explorar o arquipélago.',
        },
        {
          type: 'w3d:ambience',
          kind: 'mar',
        },
      ],
      events: [],
      loops: [],
    },
  },
}

export const vocationProceduralExample: ExtensionExample = {
  name: 'Cidade das Carreiras',
  experience: 'exploration',
  description:
    'Uma cidade para conhecer profissões: ruas em círculo, bairros de educação, saúde e comércio, casas modernas, moradores, portas que contam histórias, mochila e missão.',
  ir: {
    html: [],
    css: [],
    extensions: [{ extensionId: 'world-3d' }],
    version: 2,
    behavior: {
      start: [
        {
          type: 'w3d:setup',
          style: 'primavera',
          world: {
            type: 'num',
            value: 260,
          },
        },
        {
          type: 'w3d:quality',
          mode: 'automatica',
        },
        {
          type: 'w3d:terrain',
          h: {
            type: 'num',
            value: 2,
          },
          s: {
            type: 'num',
            value: 10,
          },
        },
        {
          type: 'w3d:roadGrid',
          layout: 'radial',
          x: {
            type: 'num',
            value: 0,
          },
          z: {
            type: 'num',
            value: 0,
          },
          size: {
            type: 'num',
            value: 180,
          },
          width: {
            type: 'num',
            value: 7,
          },
        },
        {
          type: 'w3d:district',
          kind: 'educacao',
          x: {
            type: 'num',
            value: -48,
          },
          z: {
            type: 'num',
            value: 30,
          },
          size: {
            type: 'num',
            value: 38,
          },
        },
        {
          type: 'w3d:district',
          kind: 'saude',
          x: {
            type: 'num',
            value: 48,
          },
          z: {
            type: 'num',
            value: 30,
          },
          size: {
            type: 'num',
            value: 38,
          },
        },
        {
          type: 'w3d:district',
          kind: 'comercial',
          x: {
            type: 'num',
            value: 0,
          },
          z: {
            type: 'num',
            value: -52,
          },
          size: {
            type: 'num',
            value: 42,
          },
        },
        {
          type: 'w3d:houseRow',
          n: {
            type: 'num',
            value: 10,
          },
          x1: {
            type: 'num',
            value: -55,
          },
          z1: {
            type: 'num',
            value: -12,
          },
          x2: {
            type: 'num',
            value: 55,
          },
          z2: {
            type: 'num',
            value: -12,
          },
          style: 'modernas',
        },
        {
          type: 'w3d:person',
          color: '#8b5cf6',
          hat: 'bone',
        },
        {
          type: 'w3d:npc',
          name: 'Lia',
          x: {
            type: 'num',
            value: -18,
          },
          z: {
            type: 'num',
            value: 8,
          },
          color: '#f97316',
          hat: 'bone',
        },
        {
          type: 'w3d:npc',
          name: 'Caio',
          x: {
            type: 'num',
            value: 18,
          },
          z: {
            type: 'num',
            value: 8,
          },
          color: '#22c55e',
          hat: 'nenhum',
        },
        {
          type: 'w3d:door',
          x: {
            type: 'num',
            value: -48,
          },
          z: {
            type: 'num',
            value: 30,
          },
          deg: {
            type: 'num',
            value: 0,
          },
          title: 'Escola Criativa',
          body: 'Descubra carreiras em tecnologia, arte e ciência.',
          image: '',
        },
        {
          type: 'w3d:door',
          x: {
            type: 'num',
            value: 48,
          },
          z: {
            type: 'num',
            value: 30,
          },
          deg: {
            type: 'num',
            value: 0,
          },
          title: 'Centro de Saúde',
          body: 'Conheça quem cuida das pessoas e da comunidade.',
          image: '',
        },
        {
          type: 'w3d:inventoryGive',
          item: 'mapa de carreiras',
          n: {
            type: 'num',
            value: 1,
          },
        },
        {
          type: 'w3d:quest',
          name: 'Minha vocação',
          desc: 'Visite os três distritos e converse com os moradores.',
        },
        {
          type: 'w3d:minimap',
          mode: 'ver',
        },
      ],
      events: [],
      loops: [],
    },
  },
}
