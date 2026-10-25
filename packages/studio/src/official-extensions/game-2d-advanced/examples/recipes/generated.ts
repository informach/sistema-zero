// Gerado por scripts/gen-game-2d-advanced-recipes.ts; edite sources.ts.
import type { ExtensionExample } from '../../../../extensions/types'
import { assetsForRecipe } from './assets'

const recipes: Array<Omit<ExtensionExample, 'assets'> & { assets: string[] }> = [
  {
    name: 'Oficina de animações e som',
    description:
      'Ande com I/J/K/L. Espaço toca um aceno e um sino; 1 muda a direção, 2 liga a música, 3 para. H abre a ajuda. Troque as artes pelas suas no Pinta.',
    difficulty: 'intermediate',
    concepts: ['Pinta', 'animação', 'som de arquivo', 'telas', 'direção'],
    genre: 'oficina',
    assets: ['heroi-oficina', 'fundo-oficina', 'sino-oficina'],
    experience: 'demo',
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [
          {
            type: 'gk:setupFull',
            bg: '#d5edf0',
            accent: '#2f83b4',
          },
          {
            type: 'gk:stageBorder',
            color: '#183653',
            width: {
              type: 'num',
              value: 3,
            },
          },
          {
            type: 'gk:useFont',
            font: 'nunito',
          },
          {
            type: 'gk:setStageDescription',
            description:
              'Oficina de animações e som. I J K L movem. Espaço toca o aceno. H abre a ajuda.',
          },
          {
            type: 'gk:setScreenText',
            screen: 'menu',
            title: {
              type: 'str',
              value: 'Meu herói do Pinta',
            },
            text: {
              type: 'str',
              value:
                'I/J/K/L andam. Espaço acena e toca sino. 1 vira, 2 toca música, 3 para; H ajuda.',
            },
            button: {
              type: 'str',
              value: 'Experimentar',
            },
          },
          {
            type: 'gk:loadImage',
            name: 'heroi',
            asset: 'heroi-oficina',
          },
          {
            type: 'gk:setBackdrop',
            image: 'fundo-oficina',
          },
          {
            type: 'gk:loadSound',
            name: 'sino',
            asset: 'sino-oficina',
          },
          {
            type: 'gk:setVolume',
            sound: 'sino',
            level: {
              type: 'num',
              value: 0.3,
            },
          },
          {
            type: 'gk:createCharacter',
            varName: 'heroi',
            image: 'heroi-oficina',
            w: {
              type: 'num',
              value: 48,
            },
            h: {
              type: 'num',
              value: 48,
            },
            speed: {
              type: 'num',
              value: 200,
            },
            color: '#2f83b4',
          },
          {
            type: 'gk:setSheet',
            charVar: 'heroi',
            image: 'heroi-oficina',
            fw: {
              type: 'num',
              value: 32,
            },
            fh: {
              type: 'num',
              value: 32,
            },
          },
          {
            type: 'gk:setWalkSheet',
            charVar: 'heroi',
            image: 'heroi-oficina',
            fw: {
              type: 'num',
              value: 32,
            },
            fh: {
              type: 'num',
              value: 32,
            },
          },
          {
            type: 'gk:stateAnim',
            charVar: 'heroi',
            state: 'parado',
            from: {
              type: 'num',
              value: 0,
            },
            to: {
              type: 'num',
              value: 0,
            },
            fps: {
              type: 'num',
              value: 1,
            },
            once: false,
          },
          {
            type: 'gk:stateAnim',
            charVar: 'heroi',
            state: 'andando',
            from: {
              type: 'num',
              value: 0,
            },
            to: {
              type: 'num',
              value: 3,
            },
            fps: {
              type: 'num',
              value: 8,
            },
            once: false,
          },
          {
            type: 'gk:createScreen',
            name: 'ajuda',
            title: {
              type: 'str',
              value: 'Sua arte no jogo',
            },
            text: {
              type: 'str',
              value: 'Escolha uma imagem e uma animação do Pinta. Ande, acene e ouça o sino.',
            },
          },
          {
            type: 'gk:addButton',
            screen: 'ajuda',
            label: {
              type: 'str',
              value: 'Continuar',
            },
            body: [
              {
                type: 'gk:hideScreens',
              },
              {
                type: 'gk:resume',
              },
            ],
          },
          {
            type: 'gk:addButton',
            screen: 'ajuda',
            label: {
              type: 'str',
              value: 'Voltar ao menu',
            },
            body: [
              {
                type: 'gk:returnToMenu',
              },
            ],
          },
          {
            type: 'gk:setStageDescription',
            description:
              'Ande com I/J/K/L. Espaço toca um aceno e um sino; 1 muda a direção, 2 liga a música, 3 para. H abre a ajuda. Troque as artes pelas suas no Pinta.',
          },
        ],
        events: [],
        loops: [
          {
            type: 'gk:onUpdate',
            dtName: 'dt',
            body: [
              {
                type: 'gk:moveWithCustomKeys',
                charVar: 'heroi',
                up: 'i',
                down: 'k',
                left: 'j',
                right: 'l',
                dtVar: 'dt',
              },
              {
                type: 'gk:keepOnScreen',
                charVar: 'heroi',
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: 'Space',
                },
                then: [
                  {
                    type: 'gk:playAnimOnce',
                    charVar: 'heroi',
                    from: {
                      type: 'num',
                      value: 4,
                    },
                    to: {
                      type: 'num',
                      value: 7,
                    },
                    fps: {
                      type: 'num',
                      value: 10,
                    },
                  },
                  {
                    type: 'gk:playSound',
                    name: 'sino',
                  },
                  {
                    type: 'gk:flashScreen',
                    color: '#fff4c6',
                    times: {
                      type: 'num',
                      value: 1,
                    },
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: '1',
                },
                then: [
                  {
                    type: 'gk:setFacingDir',
                    charVar: 'heroi',
                    dir: 'up',
                  },
                  {
                    type: 'gk:fadeScreen',
                    color: '#183653',
                    seconds: {
                      type: 'num',
                      value: 0.3,
                    },
                    toDark: false,
                  },
                  {
                    type: 'gk:playAnim',
                    charVar: 'heroi',
                    from: {
                      type: 'num',
                      value: 8,
                    },
                    to: {
                      type: 'num',
                      value: 11,
                    },
                    fps: {
                      type: 'num',
                      value: 8,
                    },
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: '2',
                },
                then: [
                  {
                    type: 'gk:playMusic',
                    sound: 'sino',
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: '3',
                },
                then: [
                  {
                    type: 'gk:stopSound',
                    sound: 'sino',
                  },
                  {
                    type: 'gk:playTone',
                    freq: {
                      type: 'num',
                      value: 330,
                    },
                    ms: {
                      type: 'num',
                      value: 120,
                    },
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: 'h',
                },
                then: [
                  {
                    type: 'gk:pause',
                  },
                  {
                    type: 'gk:showScreen',
                    name: 'ajuda',
                  },
                ],
              },
            ],
          },
          {
            type: 'gk:onDraw',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawBackdrop',
                image: 'fundo-oficina',
              },
              {
                type: 'gk:drawCharacter',
                charVar: 'heroi',
              },
            ],
          },
          {
            type: 'gk:onDrawHud',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawText',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Direção: ',
                  },
                  right: {
                    type: 'gk:facingOf',
                    charVar: 'heroi',
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 30,
                },
                size: {
                  type: 'num',
                  value: 20,
                },
                color: {
                  type: 'color',
                  value: '#183653',
                },
              },
              {
                type: 'gk:drawText',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Aceno terminou: ',
                  },
                  right: {
                    type: 'gk:animEnded',
                    charVar: 'heroi',
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 60,
                },
                size: {
                  type: 'num',
                  value: 20,
                },
                color: {
                  type: 'color',
                  value: '#183653',
                },
              },
            ],
          },
        ],
      },
      extensions: [
        {
          extensionId: 'game-2d-advanced',
        },
      ],
    },
  },
  {
    name: 'Laboratório de movimento e efeitos',
    description:
      'Setas movem a nave com inércia. Segure o mouse para dar impulso. H abre os botões para mudar rumo, deslizar, apagar, reaparecer, ligar rastro e soltar onda. 8 sorteia um alvo; 9 escolhe o mais perto. Clique no alvo para acertar.',
    difficulty: 'advanced',
    concepts: ['inércia', 'atrito', 'interpolação', 'opacidade', 'caminhos', 'grupos'],
    genre: 'laboratório',
    assets: ['fundo-oficina', 'heroi-oficina'],
    experience: 'demo',
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: {
        molds: [
          {
            type: 'gk:defineMold',
            name: 'vagalume',
            w: {
              type: 'num',
              value: 18,
            },
            h: {
              type: 'num',
              value: 18,
            },
            health: {
              type: 'num',
              value: 1,
            },
            speed: {
              type: 'num',
              value: 45,
            },
            damage: {
              type: 'num',
              value: 0,
            },
            color: '#ffe7a3',
            image: '',
            look: '',
          },
          {
            type: 'gk:definePath',
            name: 'volta',
            body: [
              {
                type: 'gk:pathPoint',
                x: {
                  type: 'num',
                  value: 90,
                },
                y: {
                  type: 'num',
                  value: 140,
                },
              },
              {
                type: 'gk:pathPoint',
                x: {
                  type: 'num',
                  value: 700,
                },
                y: {
                  type: 'num',
                  value: 140,
                },
              },
              {
                type: 'gk:pathPoint',
                x: {
                  type: 'num',
                  value: 700,
                },
                y: {
                  type: 'num',
                  value: 380,
                },
              },
              {
                type: 'gk:pathPoint',
                x: {
                  type: 'num',
                  value: 90,
                },
                y: {
                  type: 'num',
                  value: 380,
                },
              },
            ],
          },
        ],
        start: [
          {
            type: 'gk:setup',
            w: {
              type: 'num',
              value: 800,
            },
            h: {
              type: 'num',
              value: 480,
            },
            bg: '#142b3c',
            accent: '#ffd166',
          },
          {
            type: 'gk:setScreenText',
            screen: 'menu',
            title: {
              type: 'str',
              value: 'Movimento e efeitos',
            },
            text: {
              type: 'str',
              value:
                'Setas: inércia. Mouse: impulso. H abre as ferramentas de movimento e efeitos. 8 escolhe alvo ao acaso; 9 escolhe o mais perto.',
            },
            button: {
              type: 'str',
              value: 'Experimentar',
            },
          },
          {
            type: 'gk:createCharacter',
            varName: 'nave',
            image: '',
            w: {
              type: 'num',
              value: 36,
            },
            h: {
              type: 'num',
              value: 24,
            },
            speed: {
              type: 'num',
              value: 180,
            },
            color: '#65d5c2',
          },
          {
            type: 'gk:createCharacter',
            varName: 'guia',
            image: '',
            w: {
              type: 'num',
              value: 16,
            },
            h: {
              type: 'num',
              value: 16,
            },
            speed: {
              type: 'num',
              value: 100,
            },
            color: '#ffd166',
          },
          {
            type: 'gk:setHitboxShape',
            charVar: 'nave',
            shape: 'circulo',
            radius: {
              type: 'num',
              value: 12,
            },
          },
          {
            type: 'gk:showHitboxes',
          },
          {
            type: 'gk:setVelocityAngle',
            charVar: 'nave',
            degrees: {
              type: 'num',
              value: 0,
            },
            force: {
              type: 'num',
              value: 120,
            },
          },
          {
            type: 'gk:setTerminalVelocity',
            charVar: 'nave',
            max: {
              type: 'num',
              value: 500,
            },
          },
          {
            type: 'gk:spawnFromMold',
            mold: 'vagalume',
            x: {
              type: 'num',
              value: 180,
            },
            y: {
              type: 'num',
              value: 260,
            },
          },
          {
            type: 'gk:spawnFromMold',
            mold: 'vagalume',
            x: {
              type: 'num',
              value: 650,
            },
            y: {
              type: 'num',
              value: 220,
            },
          },
          {
            type: 'gk:startSpawner',
            mold: 'vagalume',
            seconds: {
              type: 'num',
              value: 2,
            },
          },
          {
            type: 'gk:cameraFollow',
            charVar: 'nave',
            w: {
              type: 'num',
              value: 800,
            },
            h: {
              type: 'num',
              value: 480,
            },
          },
          {
            type: 'var',
            name: 'alvo',
            value: {
              type: 'gk:nearestActive',
              mold: 'vagalume',
              x: {
                type: 'num',
                value: 400,
              },
              y: {
                type: 'num',
                value: 240,
              },
            },
          },
          {
            type: 'gk:createScreen',
            name: 'ferramentas',
            title: {
              type: 'str',
              value: 'Movimento e efeitos',
            },
            text: {
              type: 'str',
              value: 'Escolha uma experiência. O jogo continua para mostrar o resultado.',
            },
          },
          {
            type: 'gk:addButton',
            screen: 'ferramentas',
            label: {
              type: 'str',
              value: 'Mudar o rumo',
            },
            body: [
              {
                type: 'gk:setVelocityAngle',
                charVar: 'nave',
                degrees: {
                  type: 'num',
                  value: 45,
                },
                force: {
                  type: 'num',
                  value: 220,
                },
              },
              {
                type: 'gk:cameraStop',
              },
              {
                type: 'gk:hideScreens',
              },
              {
                type: 'gk:resume',
              },
            ],
          },
          {
            type: 'gk:addButton',
            screen: 'ferramentas',
            label: {
              type: 'str',
              value: 'Deslizar ao centro',
            },
            body: [
              {
                type: 'gk:tweenTo',
                charVar: 'nave',
                x: {
                  type: 'num',
                  value: 400,
                },
                y: {
                  type: 'num',
                  value: 260,
                },
                seconds: {
                  type: 'num',
                  value: 1,
                },
              },
              {
                type: 'gk:hideScreens',
              },
              {
                type: 'gk:resume',
              },
            ],
          },
          {
            type: 'gk:addButton',
            screen: 'ferramentas',
            label: {
              type: 'str',
              value: 'Ficar transparente',
            },
            body: [
              {
                type: 'gk:fadeTo',
                charVar: 'nave',
                percent: {
                  type: 'num',
                  value: 15,
                },
                seconds: {
                  type: 'num',
                  value: 1,
                },
              },
              {
                type: 'gk:hideScreens',
              },
              {
                type: 'gk:resume',
              },
            ],
          },
          {
            type: 'gk:addButton',
            screen: 'ferramentas',
            label: {
              type: 'str',
              value: 'Reaparecer e deslizar',
            },
            body: [
              {
                type: 'gk:setOpacity',
                charVar: 'nave',
                percent: {
                  type: 'num',
                  value: 100,
                },
              },
              {
                type: 'gk:tweenProperty',
                charVar: 'nave',
                prop: 'y',
                to: {
                  type: 'num',
                  value: 200,
                },
                seconds: {
                  type: 'num',
                  value: 1,
                },
              },
              {
                type: 'gk:hideScreens',
              },
              {
                type: 'gk:resume',
              },
            ],
          },
          {
            type: 'gk:addButton',
            screen: 'ferramentas',
            label: {
              type: 'str',
              value: 'Ligar o rastro',
            },
            body: [
              {
                type: 'gk:trailOn',
                charVar: 'nave',
                color: '#65d5c2',
                size: {
                  type: 'num',
                  value: 8,
                },
                rate: {
                  type: 'num',
                  value: 20,
                },
                life: {
                  type: 'num',
                  value: 0.5,
                },
              },
              {
                type: 'gk:hideScreens',
              },
              {
                type: 'gk:resume',
              },
            ],
          },
          {
            type: 'gk:addButton',
            screen: 'ferramentas',
            label: {
              type: 'str',
              value: 'Desligar rastro e fábrica',
            },
            body: [
              {
                type: 'gk:trailOff',
                charVar: 'nave',
              },
              {
                type: 'gk:stopSpawner',
                mold: 'vagalume',
              },
              {
                type: 'gk:hideScreens',
              },
              {
                type: 'gk:resume',
              },
            ],
          },
          {
            type: 'gk:addButton',
            screen: 'ferramentas',
            label: {
              type: 'str',
              value: 'Soltar uma onda',
            },
            body: [
              {
                type: 'gk:shockwave',
                x: {
                  type: 'memberGet',
                  object: {
                    type: 'var',
                    name: 'nave',
                  },
                  name: 'x',
                },
                y: {
                  type: 'memberGet',
                  object: {
                    type: 'var',
                    name: 'nave',
                  },
                  name: 'y',
                },
                radius: {
                  type: 'num',
                  value: 120,
                },
                seconds: {
                  type: 'num',
                  value: 0.6,
                },
                color: '#ffd166',
              },
              {
                type: 'gk:sheetBurst',
                image: 'heroi-oficina',
                frames: {
                  type: 'num',
                  value: 4,
                },
                fps: {
                  type: 'num',
                  value: 12,
                },
                x: {
                  type: 'memberGet',
                  object: {
                    type: 'var',
                    name: 'nave',
                  },
                  name: 'x',
                },
                y: {
                  type: 'memberGet',
                  object: {
                    type: 'var',
                    name: 'nave',
                  },
                  name: 'y',
                },
                size: {
                  type: 'num',
                  value: 64,
                },
              },
              {
                type: 'gk:hideScreens',
              },
              {
                type: 'gk:resume',
              },
            ],
          },
          {
            type: 'gk:setStageDescription',
            description:
              'Setas movem a nave com inércia. Segure o mouse para dar impulso. H abre os botões para mudar rumo, deslizar, apagar, reaparecer, ligar rastro e soltar onda. 8 sorteia um alvo; 9 escolhe o mais perto. Clique no alvo para acertar.',
          },
        ],
        events: [],
        loops: [
          {
            type: 'gk:onUpdate',
            dtName: 'dt',
            body: [
              {
                type: 'if',
                cond: {
                  type: 'gk:keyDown',
                  key: 'ArrowLeft',
                },
                then: [
                  {
                    type: 'gk:thrust',
                    charVar: 'nave',
                    degrees: {
                      type: 'num',
                      value: 180,
                    },
                    force: {
                      type: 'num',
                      value: 30,
                    },
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyDown',
                  key: 'ArrowRight',
                },
                then: [
                  {
                    type: 'gk:thrust',
                    charVar: 'nave',
                    degrees: {
                      type: 'num',
                      value: 0,
                    },
                    force: {
                      type: 'num',
                      value: 30,
                    },
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyDown',
                  key: 'ArrowUp',
                },
                then: [
                  {
                    type: 'gk:thrust',
                    charVar: 'nave',
                    degrees: {
                      type: 'num',
                      value: 270,
                    },
                    force: {
                      type: 'num',
                      value: 30,
                    },
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyDown',
                  key: 'ArrowDown',
                },
                then: [
                  {
                    type: 'gk:thrust',
                    charVar: 'nave',
                    degrees: {
                      type: 'num',
                      value: 90,
                    },
                    force: {
                      type: 'num',
                      value: 30,
                    },
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:mouseDown',
                },
                then: [
                  {
                    type: 'gk:thrust',
                    charVar: 'nave',
                    degrees: {
                      type: 'gk:angleTo',
                      charVar: 'nave',
                      targetVar: 'guia',
                    },
                    force: {
                      type: 'num',
                      value: 20,
                    },
                  },
                ],
              },
              {
                type: 'gk:applyFriction',
                charVar: 'nave',
                factor: {
                  type: 'num',
                  value: 0.97,
                },
                dtVar: 'dt',
              },
              {
                type: 'gk:moveByVelocity',
                charVar: 'nave',
                dtVar: 'dt',
              },
              {
                type: 'gk:wrapEdges',
                charVar: 'nave',
              },
              {
                type: 'gk:followPath',
                charVar: 'guia',
                path: 'volta',
                speed: {
                  type: 'num',
                  value: 90,
                },
                dtVar: 'dt',
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: '8',
                },
                then: [
                  {
                    type: 'assign',
                    name: 'alvo',
                    value: {
                      type: 'gk:randomActive',
                      mold: 'vagalume',
                    },
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: '9',
                },
                then: [
                  {
                    type: 'assign',
                    name: 'alvo',
                    value: {
                      type: 'gk:nearestActive',
                      mold: 'vagalume',
                      x: {
                        type: 'memberGet',
                        object: {
                          type: 'var',
                          name: 'nave',
                        },
                        name: 'x',
                      },
                      y: {
                        type: 'memberGet',
                        object: {
                          type: 'var',
                          name: 'nave',
                        },
                        name: 'y',
                      },
                    },
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'logical',
                  op: '&&',
                  left: {
                    type: 'logical',
                    op: '&&',
                    left: {
                      type: 'var',
                      name: 'alvo',
                    },
                    right: {
                      type: 'gk:mouseDown',
                    },
                  },
                  right: {
                    type: 'gk:pointIn',
                    x: {
                      type: 'gk:mouseX',
                    },
                    y: {
                      type: 'gk:mouseY',
                    },
                    charVar: 'alvo',
                  },
                },
                then: [
                  {
                    type: 'gk:hurt',
                    charVar: 'alvo',
                    amount: {
                      type: 'num',
                      value: 1,
                    },
                    iframes: {
                      type: 'num',
                      value: 0.3,
                    },
                  },
                ],
              },
              {
                type: 'gk:forEachActive',
                mold: 'vagalume',
                itemName: 'item',
                body: [
                  {
                    type: 'gk:drift',
                    charVar: 'item',
                    dtVar: 'dt',
                  },
                ],
              },
              {
                type: 'gk:cullOffscreen',
                mold: 'vagalume',
                margin: {
                  type: 'num',
                  value: 60,
                },
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: 'h',
                },
                then: [
                  {
                    type: 'gk:pause',
                  },
                  {
                    type: 'gk:showScreen',
                    name: 'ferramentas',
                  },
                ],
              },
            ],
          },
          {
            type: 'gk:onDraw',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawBackground',
                color: '#142b3c',
                grid: false,
              },
              {
                type: 'gk:scrollImage',
                image: 'fundo-oficina',
                vx: {
                  type: 'num',
                  value: 8,
                },
                vy: {
                  type: 'num',
                  value: 0,
                },
              },
              {
                type: 'gk:parallaxLayer',
                image: 'fundo-oficina',
                fx: {
                  type: 'num',
                  value: 0.15,
                },
                fy: {
                  type: 'num',
                  value: 0.1,
                },
              },
              {
                type: 'gk:drawActive',
                mold: 'vagalume',
              },
              {
                type: 'gk:drawCharacter',
                charVar: 'guia',
              },
              {
                type: 'gk:drawCharacter',
                charVar: 'nave',
              },
              {
                type: 'if',
                cond: {
                  type: 'var',
                  name: 'alvo',
                },
                then: [
                  {
                    type: 'gk:drawCircle',
                    x: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'memberGet',
                        object: {
                          type: 'var',
                          name: 'alvo',
                        },
                        name: 'x',
                      },
                      right: {
                        type: 'num',
                        value: 9,
                      },
                    },
                    y: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'memberGet',
                        object: {
                          type: 'var',
                          name: 'alvo',
                        },
                        name: 'y',
                      },
                      right: {
                        type: 'num',
                        value: 9,
                      },
                    },
                    r: {
                      type: 'num',
                      value: 20,
                    },
                    color: {
                      type: 'color',
                      value: '#ffd166',
                    },
                  },
                ],
              },
            ],
          },
          {
            type: 'gk:onDrawHud',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawText',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Visibilidade: ',
                  },
                  right: {
                    type: 'gk:opacityOf',
                    charVar: 'nave',
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 30,
                },
                size: {
                  type: 'num',
                  value: 18,
                },
                color: {
                  type: 'color',
                  value: '#183653',
                },
              },
              {
                type: 'gk:drawText',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Caminho: ',
                  },
                  right: {
                    type: 'gk:pathProgress',
                    charVar: 'guia',
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 55,
                },
                size: {
                  type: 'num',
                  value: 18,
                },
                color: {
                  type: 'color',
                  value: '#183653',
                },
              },
              {
                type: 'gk:drawText',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'str',
                        value: 'Tempo: ',
                      },
                      right: {
                        type: 'gk:timeSurvived',
                      },
                    },
                    right: {
                      type: 'str',
                      value: ' Acertos: ',
                    },
                  },
                  right: {
                    type: 'gk:kills',
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 105,
                },
                size: {
                  type: 'num',
                  value: 18,
                },
                color: {
                  type: 'color',
                  value: '#183653',
                },
              },
              {
                type: 'gk:drawText',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'str',
                        value: 'Câmera: ',
                      },
                      right: {
                        type: 'gk:cameraX',
                      },
                    },
                    right: {
                      type: 'str',
                      value: ', ',
                    },
                  },
                  right: {
                    type: 'gk:cameraY',
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 80,
                },
                size: {
                  type: 'num',
                  value: 18,
                },
                color: {
                  type: 'color',
                  value: '#183653',
                },
              },
            ],
          },
        ],
      },
      extensions: [
        {
          extensionId: 'game-2d-advanced',
        },
      ],
    },
  },
  {
    name: 'Mapa do Pinta com escada e paredes',
    description:
      'Setas andam e sobem a escada; Espaço pula. Pule de novo no ar ou junto da parede. O mapa do Pinta define chão, parede e escada; a folha define o herói.',
    difficulty: 'advanced',
    concepts: ['Pinta', 'mapa de peças', 'escada', 'pulo duplo', 'parede', 'animação por estado'],
    genre: 'plataforma',
    assets: ['mapa-oficina', 'heroi-oficina'],
    experience: 'demo',
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [
          {
            type: 'gk:setup',
            w: {
              type: 'num',
              value: 640,
            },
            h: {
              type: 'num',
              value: 384,
            },
            bg: '#b9e0d0',
            accent: '#2f83b4',
          },
          {
            type: 'gk:setScreenText',
            screen: 'menu',
            title: {
              type: 'str',
              value: 'Meu mapa do Pinta',
            },
            text: {
              type: 'str',
              value:
                'Setas movem e sobem a escada. Espaço pula; pule de novo no ar ou junto da parede.',
            },
            button: {
              type: 'str',
              value: 'Explorar',
            },
          },
          {
            type: 'gk:loadTilemap',
            name: 'oficina',
            asset: 'mapa-oficina',
          },
          {
            type: 'gk:setTileSize',
            px: {
              type: 'num',
              value: 32,
            },
          },
          {
            type: 'gk:tilemapSolid',
            name: 'oficina',
          },
          {
            type: 'gk:createCharacter',
            varName: 'heroi',
            image: 'heroi-oficina',
            w: {
              type: 'num',
              value: 28,
            },
            h: {
              type: 'num',
              value: 30,
            },
            speed: {
              type: 'num',
              value: 150,
            },
            color: '#2f83b4',
          },
          {
            type: 'gk:placeCharacter',
            charVar: 'heroi',
            x: {
              type: 'num',
              value: 50,
            },
            y: {
              type: 'num',
              value: 280,
            },
          },
          {
            type: 'gk:setSheet',
            charVar: 'heroi',
            image: 'heroi-oficina',
            fw: {
              type: 'num',
              value: 32,
            },
            fh: {
              type: 'num',
              value: 32,
            },
          },
          {
            type: 'gk:platStateFrames',
            charVar: 'heroi',
            state: 'parado',
            from: {
              type: 'num',
              value: 0,
            },
            to: {
              type: 'num',
              value: 0,
            },
            fps: {
              type: 'num',
              value: 1,
            },
          },
          {
            type: 'gk:platStateFrames',
            charVar: 'heroi',
            state: 'andando',
            from: {
              type: 'num',
              value: 0,
            },
            to: {
              type: 'num',
              value: 3,
            },
            fps: {
              type: 'num',
              value: 8,
            },
          },
          {
            type: 'gk:setTerminalVelocity',
            charVar: 'heroi',
            max: {
              type: 'num',
              value: 650,
            },
          },
          {
            type: 'gk:setStageDescription',
            description:
              'Setas andam e sobem a escada; Espaço pula. Pule de novo no ar ou junto da parede. O mapa do Pinta define chão, parede e escada; a folha define o herói.',
          },
        ],
        events: [],
        loops: [
          {
            type: 'gk:onUpdate',
            dtName: 'dt',
            body: [
              {
                type: 'gk:platformerHero',
                charVar: 'heroi',
                speed: {
                  type: 'num',
                  value: 160,
                },
                force: {
                  type: 'num',
                  value: 420,
                },
                dtVar: 'dt',
              },
              {
                type: 'gk:doubleJump',
                charVar: 'heroi',
                force: {
                  type: 'num',
                  value: 420,
                },
                times: {
                  type: 'num',
                  value: 1,
                },
              },
              {
                type: 'gk:wallSlide',
                charVar: 'heroi',
                speed: {
                  type: 'num',
                  value: 90,
                },
              },
              {
                type: 'gk:wallJump',
                charVar: 'heroi',
                forceX: {
                  type: 'num',
                  value: 200,
                },
                forceY: {
                  type: 'num',
                  value: 420,
                },
              },
              {
                type: 'gk:climbLadder',
                charVar: 'heroi',
                map: 'oficina',
                tile: {
                  type: 'num',
                  value: 2,
                },
                speed: {
                  type: 'num',
                  value: 120,
                },
              },
              {
                type: 'gk:collideTilemap',
                charVar: 'heroi',
                map: 'oficina',
              },
              {
                type: 'gk:platformerAnim',
                charVar: 'heroi',
              },
              {
                type: 'gk:keepOnScreen',
                charVar: 'heroi',
              },
            ],
          },
          {
            type: 'gk:onDraw',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawBackground',
                color: '#b9e0d0',
                grid: false,
              },
              {
                type: 'gk:drawTilemap',
                name: 'oficina',
                layer: 'chão',
              },
              {
                type: 'gk:drawCharacter',
                charVar: 'heroi',
              },
              {
                type: 'gk:drawTilemap',
                name: 'oficina',
                layer: 'frente',
              },
            ],
          },
        ],
      },
      extensions: [
        {
          extensionId: 'game-2d-advanced',
        },
      ],
    },
  },
  {
    name: 'Grave e repita a aventura',
    description:
      'Use setas para andar e X para pular pelas duas fases. 1 grava, 2 termina, 3 repete. 4 guarda, 5 continua e 6 apaga o progresso guardado; N vai à segunda fase.',
    difficulty: 'advanced',
    concepts: ['campanha', 'relógio fixo', 'ações', 'progresso salvo', 'repetição'],
    genre: 'plataforma',
    assets: [],
    experience: 'demo',
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [
          {
            type: 'gk:setup',
            w: {
              type: 'num',
              value: 768,
            },
            h: {
              type: 'num',
              value: 384,
            },
            bg: '#182b45',
            accent: '#ffd166',
          },
          {
            type: 'gk:setScreenText',
            screen: 'menu',
            title: {
              type: 'str',
              value: 'Grave e repita',
            },
            text: {
              type: 'str',
              value:
                'Setas andam; X pula. 1 grava, 2 termina, 3 repete. 4 guarda, 5 continua, 6 apaga o progresso. N muda de fase.',
            },
            button: {
              type: 'str',
              value: 'Experimentar',
            },
          },
          {
            type: 'gk:fixedSetup',
            seed: {
              type: 'num',
              value: 42,
            },
          },
          {
            type: 'gk:defineCampaign',
            id: 'oficina-replay',
            version: {
              type: 'num',
              value: 1,
            },
            firstStage: 'oficina-1',
            players: {
              type: 'num',
              value: 1,
            },
            seed: {
              type: 'num',
              value: 42,
            },
            requiredGems: {
              type: 'num',
              value: 0,
            },
          },
          {
            type: 'gk:defineCampaignStage',
            stage: {
              schemaVersion: 1,
              id: 'oficina-1',
              world: 1,
              order: 1,
              theme: 'campo',
              width: 24,
              height: 12,
              tiles: [
                '........................',
                '........................',
                '........................',
                '........................',
                '........................',
                '........................',
                '........................',
                '........................',
                '........................',
                '........................',
                '........................',
                '########################',
              ],
              entities: [
                {
                  kind: 'hero',
                  id: 'inicio',
                  x: 2,
                  y: 10,
                },
                {
                  kind: 'exit',
                  id: 'saida',
                  x: 22,
                  y: 10,
                },
              ],
              triggers: [],
              nextStage: 'oficina-2',
            },
          },
          {
            type: 'gk:defineCampaignStage',
            stage: {
              schemaVersion: 1,
              id: 'oficina-2',
              world: 1,
              order: 2,
              theme: 'campo',
              width: 24,
              height: 12,
              tiles: [
                '........................',
                '........................',
                '........................',
                '........................',
                '........................',
                '........................',
                '........................',
                '........................',
                '........................',
                '........................',
                '........................',
                '########################',
              ],
              entities: [
                {
                  kind: 'hero',
                  id: 'inicio',
                  x: 2,
                  y: 10,
                },
                {
                  kind: 'exit',
                  id: 'saida',
                  x: 22,
                  y: 10,
                },
              ],
              triggers: [],
            },
          },
          {
            type: 'gk:startCampaign',
            stageId: 'oficina-1',
          },
          {
            type: 'var',
            name: 'acao',
            value: {
              type: 'str',
              value: 'parado',
            },
          },
          {
            type: 'var',
            name: 'gravacao',
            value: {
              type: 'str',
              value: 'Pronto para gravar',
            },
          },
          {
            type: 'gk:setStageDescription',
            description:
              'Use setas para andar e X para pular pelas duas fases. 1 grava, 2 termina, 3 repete. 4 guarda, 5 continua e 6 apaga o progresso guardado; N vai à segunda fase.',
          },
        ],
        events: [],
        loops: [
          {
            type: 'gk:onFixedUpdate',
            dtName: 'dt',
            tickName: 'passo',
            body: [
              {
                type: 'if',
                cond: {
                  type: 'gk:actionDown',
                  action: 'direita',
                },
                then: [
                  {
                    type: 'assign',
                    name: 'acao',
                    value: {
                      type: 'str',
                      value: 'andando à direita',
                    },
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:actionPressed',
                  action: 'pular',
                },
                then: [
                  {
                    type: 'assign',
                    name: 'acao',
                    value: {
                      type: 'str',
                      value: 'pulo começou',
                    },
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:actionReleased',
                  action: 'pular',
                },
                then: [
                  {
                    type: 'assign',
                    name: 'acao',
                    value: {
                      type: 'str',
                      value: 'pulo terminou',
                    },
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: '1',
                },
                then: [
                  {
                    type: 'gk:startReplayRecording',
                  },
                  {
                    type: 'assign',
                    name: 'gravacao',
                    value: {
                      type: 'str',
                      value: 'Gravando',
                    },
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: '2',
                },
                then: [
                  {
                    type: 'gk:stopReplayRecording',
                  },
                  {
                    type: 'assign',
                    name: 'gravacao',
                    value: {
                      type: 'str',
                      value: 'Gravação pronta',
                    },
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: '3',
                },
                then: [
                  {
                    type: 'gk:playLastReplay',
                  },
                  {
                    type: 'assign',
                    name: 'gravacao',
                    value: {
                      type: 'str',
                      value: 'Repetição iniciada',
                    },
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: '4',
                },
                then: [
                  {
                    type: 'gk:saveCampaign',
                    slot: 1,
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: '5',
                },
                then: [
                  {
                    type: 'gk:loadCampaign',
                    slot: 1,
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: '6',
                },
                then: [
                  {
                    type: 'gk:deleteCampaignSave',
                    slot: 1,
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: 'n',
                },
                then: [
                  {
                    type: 'gk:goToStage',
                    stageId: 'oficina-2',
                  },
                ],
              },
            ],
          },
          {
            type: 'gk:onDrawHud',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawText',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Fase: ',
                  },
                  right: {
                    type: 'gk:currentStage',
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 55,
                },
                size: {
                  type: 'num',
                  value: 18,
                },
                color: {
                  type: 'color',
                  value: '#183653',
                },
              },
              {
                type: 'gk:drawText',
                text: {
                  type: 'var',
                  name: 'acao',
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 80,
                },
                size: {
                  type: 'num',
                  value: 18,
                },
                color: {
                  type: 'color',
                  value: '#183653',
                },
              },
              {
                type: 'gk:drawText',
                text: {
                  type: 'var',
                  name: 'gravacao',
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 105,
                },
                size: {
                  type: 'num',
                  value: 18,
                },
                color: {
                  type: 'color',
                  value: '#183653',
                },
              },
            ],
          },
        ],
      },
      extensions: [
        {
          extensionId: 'game-2d-advanced',
        },
      ],
    },
  },
  {
    name: 'A vila que guarda sua aventura',
    description:
      'Explore com setas. 1 guarda, 2 continua. C recolhe uma chave; V usa uma chave. N visita a praia. B inicia um treino de batalha com veneno. O painel mostra mochila, nível e experiência.',
    difficulty: 'intermediate',
    concepts: ['RPG', 'mapas', 'mochila', 'progresso salvo', 'amigos'],
    genre: 'RPG',
    assets: ['heroi-oficina', 'fundo-oficina'],
    experience: 'demo',
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [
          {
            type: 'gk:setup',
            w: {
              type: 'num',
              value: 640,
            },
            h: {
              type: 'num',
              value: 384,
            },
            bg: '#b9e0d0',
            accent: '#2f83b4',
          },
          {
            type: 'gk:setScreenText',
            screen: 'menu',
            title: {
              type: 'str',
              value: 'A vila que continua',
            },
            text: {
              type: 'str',
              value:
                'Setas andam. 1 guarda; 2 continua. C pega chave, V usa chave. N visita a praia; B inicia treino de batalha.',
            },
            button: {
              type: 'str',
              value: 'Explorar',
            },
          },
          {
            type: 'gk:createCharacter',
            varName: 'heroi',
            image: 'heroi-oficina',
            w: {
              type: 'num',
              value: 28,
            },
            h: {
              type: 'num',
              value: 30,
            },
            speed: {
              type: 'num',
              value: 160,
            },
            color: '#2f83b4',
          },
          {
            type: 'gk:sceneCommand',
            method: 'sceneAnimation',
            args: [
              {
                type: 'var',
                name: 'heroi',
              },
              {
                type: 'str',
                value: 'heroi-oficina',
              },
              {
                type: 'str',
                value: 'andando',
              },
              {
                type: 'bool',
                value: false,
              },
            ],
          },
          {
            type: 'gk:rpgSetStartMap',
            map: 'vila',
          },
          {
            type: 'gk:rpgCreateMap',
            map: 'vila',
            cols: {
              type: 'num',
              value: 20,
            },
            rows: {
              type: 'num',
              value: 12,
            },
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawBackground',
                color: '#b9e0d0',
                grid: true,
              },
            ],
          },
          {
            type: 'gk:rpgCreateMap',
            map: 'praia',
            cols: {
              type: 'num',
              value: 20,
            },
            rows: {
              type: 'num',
              value: 12,
            },
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawBackground',
                color: '#d5edf0',
                grid: false,
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 0,
                },
                y: {
                  type: 'num',
                  value: 240,
                },
                w: {
                  type: 'num',
                  value: 640,
                },
                h: {
                  type: 'num',
                  value: 144,
                },
                color: {
                  type: 'color',
                  value: '#e6d293',
                },
              },
              {
                type: 'gk:drawCircle',
                x: {
                  type: 'num',
                  value: 530,
                },
                y: {
                  type: 'num',
                  value: 60,
                },
                r: {
                  type: 'num',
                  value: 30,
                },
                color: {
                  type: 'color',
                  value: '#ffe7a3',
                },
              },
            ],
          },
          {
            type: 'gk:rpgGiveItem',
            item: 'chave',
            image: '',
          },
          {
            type: 'gk:rpgBattleStats',
            hp: {
              type: 'num',
              value: 50,
            },
            str: {
              type: 'num',
              value: 10,
            },
            def: {
              type: 'num',
              value: 3,
            },
          },
          {
            type: 'gk:setStageDescription',
            description:
              'Explore com setas. 1 guarda, 2 continua. C recolhe uma chave; V usa uma chave. N visita a praia. B inicia um treino de batalha com veneno. O painel mostra mochila, nível e experiência.',
          },
        ],
        events: [
          {
            type: 'gk:rpgOnEnterMap',
            map: 'vila',
            body: [
              {
                type: 'gk:rpgCreateNpc',
                name: 'vizinha',
                cx: {
                  type: 'num',
                  value: 7,
                },
                cy: {
                  type: 'num',
                  value: 5,
                },
                image: 'heroi-oficina',
                look: '',
              },
              {
                type: 'gk:rpgNpcWander',
                npc: 'vizinha',
              },
            ],
          },
        ],
        loops: [
          {
            type: 'gk:onUpdate',
            dtName: 'dt',
            body: [
              {
                type: 'gk:rpgMoveGrid',
                charVar: 'heroi',
                cell: {
                  type: 'num',
                  value: 32,
                },
                dtVar: 'dt',
              },
              {
                type: 'gk:keepOnScreen',
                charVar: 'heroi',
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: '1',
                },
                then: [
                  {
                    type: 'gk:rpgSave',
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'logical',
                  op: '&&',
                  left: {
                    type: 'gk:keyPressed',
                    key: '2',
                  },
                  right: {
                    type: 'gk:rpgHasSave',
                  },
                },
                then: [
                  {
                    type: 'gk:rpgLoad',
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: 'b',
                },
                then: [
                  {
                    type: 'gk:rpgBattleStart',
                    name: 'Treino de turnos',
                    hp: {
                      type: 'num',
                      value: 30,
                    },
                    str: {
                      type: 'num',
                      value: 4,
                    },
                    def: {
                      type: 'num',
                      value: 1,
                    },
                  },
                  {
                    type: 'gk:rpgInflict',
                    who: 'inimigo',
                    status: 'veneno',
                    turns: {
                      type: 'num',
                      value: 3,
                    },
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: 'c',
                },
                then: [
                  {
                    type: 'gk:rpgGiveItem',
                    item: 'chave',
                    image: '',
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: 'v',
                },
                then: [
                  {
                    type: 'gk:rpgRemoveItem',
                    item: 'chave',
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: 'n',
                },
                then: [
                  {
                    type: 'gk:rpgGoMap',
                    map: 'praia',
                  },
                  {
                    type: 'gk:rpgCutscene',
                    body: [
                      {
                        type: 'gk:rpgSay',
                        text: {
                          type: 'str',
                          value: 'Chegamos à praia!',
                        },
                        speaker: {
                          type: 'str',
                          value: 'Vizinha',
                        },
                      },
                      {
                        type: 'gk:rpgWait',
                        seconds: {
                          type: 'num',
                          value: 0.5,
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'gk:onDraw',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawByDepth',
                charVar: 'heroi',
              },
            ],
          },
          {
            type: 'gk:onDrawHud',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawText',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Chaves: ',
                  },
                  right: {
                    type: 'gk:countItem',
                    name: 'chave',
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 30,
                },
                size: {
                  type: 'num',
                  value: 18,
                },
                color: {
                  type: 'color',
                  value: '#183653',
                },
              },
              {
                type: 'gk:drawText',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'str',
                        value: 'Nível: ',
                      },
                      right: {
                        type: 'gk:rpgLevel',
                      },
                    },
                    right: {
                      type: 'str',
                      value: ' XP: ',
                    },
                  },
                  right: {
                    type: 'gk:rpgXp',
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 55,
                },
                size: {
                  type: 'num',
                  value: 18,
                },
                color: {
                  type: 'color',
                  value: '#183653',
                },
              },
            ],
          },
        ],
      },
      extensions: [
        {
          extensionId: 'game-2d-advanced',
        },
      ],
    },
  },
  {
    name: 'Painel do lutador',
    description:
      'Use A/D/W ou setas no duelo e acompanhe round, vitórias, combinações, especial e defesa no painel. O soco do jogador 1 usa os quadros da folha do Pinta.',
    difficulty: 'advanced',
    concepts: ['luta', 'animação de golpe', 'rounds', 'combinações', 'painel'],
    genre: 'luta',
    assets: ['heroi-oficina'],
    experience: 'demo',
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: {
        molds: [
          {
            type: 'gk:defineLook',
            name: 'samurai',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 14,
                },
                y: {
                  type: 'num',
                  value: 4,
                },
                w: {
                  type: 'num',
                  value: 22,
                },
                h: {
                  type: 'num',
                  value: 20,
                },
                color: {
                  type: 'color',
                  value: '#e8d9b5',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 10,
                },
                y: {
                  type: 'num',
                  value: 0,
                },
                w: {
                  type: 'num',
                  value: 30,
                },
                h: {
                  type: 'num',
                  value: 8,
                },
                color: {
                  type: 'color',
                  value: '#b03a2e',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 12,
                },
                w: {
                  type: 'num',
                  value: 5,
                },
                h: {
                  type: 'num',
                  value: 5,
                },
                color: {
                  type: 'color',
                  value: '#2b2d42',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 10,
                },
                y: {
                  type: 'num',
                  value: 24,
                },
                w: {
                  type: 'num',
                  value: 30,
                },
                h: {
                  type: 'num',
                  value: 46,
                },
                color: {
                  type: 'color',
                  value: '#3a6ea5',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 10,
                },
                y: {
                  type: 'num',
                  value: 24,
                },
                w: {
                  type: 'num',
                  value: 30,
                },
                h: {
                  type: 'num',
                  value: 8,
                },
                color: {
                  type: 'color',
                  value: '#284b73',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 40,
                },
                y: {
                  type: 'num',
                  value: 18,
                },
                w: {
                  type: 'num',
                  value: 6,
                },
                h: {
                  type: 'num',
                  value: 54,
                },
                color: {
                  type: 'color',
                  value: '#c0c8d0',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 14,
                },
                y: {
                  type: 'num',
                  value: 70,
                },
                w: {
                  type: 'num',
                  value: 9,
                },
                h: {
                  type: 'num',
                  value: 40,
                },
                color: {
                  type: 'color',
                  value: '#2a2f45',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 28,
                },
                y: {
                  type: 'num',
                  value: 70,
                },
                w: {
                  type: 'num',
                  value: 9,
                },
                h: {
                  type: 'num',
                  value: 40,
                },
                color: {
                  type: 'color',
                  value: '#2a2f45',
                },
              },
            ],
            baseW: {
              type: 'num',
              value: 50,
            },
            baseH: {
              type: 'num',
              value: 110,
            },
          },
          {
            type: 'gk:defineLook',
            name: 'ninja',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 14,
                },
                y: {
                  type: 'num',
                  value: 4,
                },
                w: {
                  type: 'num',
                  value: 22,
                },
                h: {
                  type: 'num',
                  value: 20,
                },
                color: {
                  type: 'color',
                  value: '#2a2f45',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 10,
                },
                y: {
                  type: 'num',
                  value: 0,
                },
                w: {
                  type: 'num',
                  value: 30,
                },
                h: {
                  type: 'num',
                  value: 8,
                },
                color: {
                  type: 'color',
                  value: '#7b2d8e',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 12,
                },
                w: {
                  type: 'num',
                  value: 6,
                },
                h: {
                  type: 'num',
                  value: 4,
                },
                color: {
                  type: 'color',
                  value: '#ff5e5e',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 10,
                },
                y: {
                  type: 'num',
                  value: 24,
                },
                w: {
                  type: 'num',
                  value: 30,
                },
                h: {
                  type: 'num',
                  value: 46,
                },
                color: {
                  type: 'color',
                  value: '#8e44ad',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 10,
                },
                y: {
                  type: 'num',
                  value: 24,
                },
                w: {
                  type: 'num',
                  value: 30,
                },
                h: {
                  type: 'num',
                  value: 8,
                },
                color: {
                  type: 'color',
                  value: '#6c3483',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 4,
                },
                y: {
                  type: 'num',
                  value: 18,
                },
                w: {
                  type: 'num',
                  value: 6,
                },
                h: {
                  type: 'num',
                  value: 54,
                },
                color: {
                  type: 'color',
                  value: '#c0c8d0',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 14,
                },
                y: {
                  type: 'num',
                  value: 70,
                },
                w: {
                  type: 'num',
                  value: 9,
                },
                h: {
                  type: 'num',
                  value: 40,
                },
                color: {
                  type: 'color',
                  value: '#22283a',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 28,
                },
                y: {
                  type: 'num',
                  value: 70,
                },
                w: {
                  type: 'num',
                  value: 9,
                },
                h: {
                  type: 'num',
                  value: 40,
                },
                color: {
                  type: 'color',
                  value: '#22283a',
                },
              },
            ],
            baseW: {
              type: 'num',
              value: 50,
            },
            baseH: {
              type: 'num',
              value: 110,
            },
          },
          {
            type: 'gk:defineLook',
            name: 'loja',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 0,
                },
                y: {
                  type: 'num',
                  value: 40,
                },
                w: {
                  type: 'num',
                  value: 160,
                },
                h: {
                  type: 'num',
                  value: 100,
                },
                color: {
                  type: 'color',
                  value: '#5a4a7a',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 0,
                },
                y: {
                  type: 'num',
                  value: 40,
                },
                w: {
                  type: 'num',
                  value: 160,
                },
                h: {
                  type: 'num',
                  value: 14,
                },
                color: {
                  type: 'color',
                  value: '#3d3357',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 60,
                },
                y: {
                  type: 'num',
                  value: 80,
                },
                w: {
                  type: 'num',
                  value: 40,
                },
                h: {
                  type: 'num',
                  value: 60,
                },
                color: {
                  type: 'color',
                  value: '#2a2340',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 64,
                },
                w: {
                  type: 'num',
                  value: 26,
                },
                h: {
                  type: 'num',
                  value: 20,
                },
                color: {
                  type: 'color',
                  value: '#ffd166',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 114,
                },
                y: {
                  type: 'num',
                  value: 64,
                },
                w: {
                  type: 'num',
                  value: 26,
                },
                h: {
                  type: 'num',
                  value: 20,
                },
                color: {
                  type: 'color',
                  value: '#ffd166',
                },
              },
            ],
            baseW: {
              type: 'num',
              value: 160,
            },
            baseH: {
              type: 'num',
              value: 140,
            },
          },
          {
            type: 'gk:defineMold',
            name: 'chao',
            w: {
              type: 'num',
              value: 960,
            },
            h: {
              type: 'num',
              value: 60,
            },
            health: {
              type: 'num',
              value: 1,
            },
            speed: {
              type: 'num',
              value: 0,
            },
            damage: {
              type: 'num',
              value: 0,
            },
            color: '#3d2b52',
            image: '',
            look: '',
          },
        ],
        start: [
          {
            type: 'gk:setup',
            w: {
              type: 'num',
              value: 960,
            },
            h: {
              type: 'num',
              value: 540,
            },
            bg: '#241733',
            accent: '#ffd166',
          },
          {
            type: 'gk:setScreenText',
            screen: 'menu',
            title: {
              type: 'str',
              value: 'Duelo de Heróis Profissional',
            },
            text: {
              type: 'str',
              value:
                'Jogador 1: A/D anda, W pula, S agacha, F defende, G soco, H chute, J especial. Jogador 2: setas anda e pula, 0 defende, teclas 1 soco, 2 chute, 3 especial. Melhor de 3 rounds!',
            },
            button: {
              type: 'str',
              value: 'Lutar',
            },
          },
          {
            type: 'gk:createCharacter',
            varName: 'heroi1',
            image: '',
            w: {
              type: 'num',
              value: 50,
            },
            h: {
              type: 'num',
              value: 110,
            },
            speed: {
              type: 'num',
              value: 260,
            },
            color: '#4a9eff',
          },
          {
            type: 'gk:createCharacter',
            varName: 'heroi2',
            image: '',
            w: {
              type: 'num',
              value: 50,
            },
            h: {
              type: 'num',
              value: 110,
            },
            speed: {
              type: 'num',
              value: 260,
            },
            color: '#e0526a',
          },
          {
            type: 'gk:stateLook',
            charVar: 'heroi1',
            state: 'parado',
            look: 'samurai',
          },
          {
            type: 'gk:stateLook',
            charVar: 'heroi2',
            state: 'parado',
            look: 'ninja',
          },
          {
            type: 'gk:lutaMove',
            name: 'soco',
            charVar: 'heroi1',
            speed: 'rápido',
            damage: {
              type: 'num',
              value: 8,
            },
            range: {
              type: 'num',
              value: 80,
            },
            pierce: false,
            special: false,
          },
          {
            type: 'gk:lutaMove',
            name: 'chute',
            charVar: 'heroi1',
            speed: 'pesado',
            damage: {
              type: 'num',
              value: 16,
            },
            range: {
              type: 'num',
              value: 100,
            },
            pierce: false,
            special: false,
          },
          {
            type: 'gk:lutaMove',
            name: 'especial',
            charVar: 'heroi1',
            speed: 'médio',
            damage: {
              type: 'num',
              value: 26,
            },
            range: {
              type: 'num',
              value: 120,
            },
            pierce: true,
            special: true,
          },
          {
            type: 'gk:lutaMove',
            name: 'soco',
            charVar: 'heroi2',
            speed: 'rápido',
            damage: {
              type: 'num',
              value: 8,
            },
            range: {
              type: 'num',
              value: 80,
            },
            pierce: false,
            special: false,
          },
          {
            type: 'gk:lutaMove',
            name: 'chute',
            charVar: 'heroi2',
            speed: 'pesado',
            damage: {
              type: 'num',
              value: 16,
            },
            range: {
              type: 'num',
              value: 100,
            },
            pierce: false,
            special: false,
          },
          {
            type: 'gk:lutaMove',
            name: 'especial',
            charVar: 'heroi2',
            speed: 'médio',
            damage: {
              type: 'num',
              value: 26,
            },
            range: {
              type: 'num',
              value: 120,
            },
            pierce: true,
            special: true,
          },
          {
            type: 'gk:spawnFromMold',
            mold: 'chao',
            x: {
              type: 'num',
              value: 0,
            },
            y: {
              type: 'num',
              value: 480,
            },
          },
          {
            type: 'gk:placeCharacter',
            charVar: 'heroi1',
            x: {
              type: 'num',
              value: 230,
            },
            y: {
              type: 'num',
              value: 370,
            },
          },
          {
            type: 'gk:placeCharacter',
            charVar: 'heroi2',
            x: {
              type: 'num',
              value: 680,
            },
            y: {
              type: 'num',
              value: 370,
            },
          },
          {
            type: 'gk:lutaMatch',
            p1Var: 'heroi1',
            p2Var: 'heroi2',
            rounds: {
              type: 'num',
              value: 3,
            },
            seconds: {
              type: 'num',
              value: 40,
            },
          },
          {
            type: 'gk:setScreenText',
            screen: 'menu',
            title: {
              type: 'str',
              value: 'Painel do lutador',
            },
            text: {
              type: 'str',
              value:
                'P1: A/D/W, F defende, G/H/J atacam. P2: setas, 0 defende, 1/2/3 atacam. Veja os dados da luta no painel.',
            },
            button: {
              type: 'str',
              value: 'Lutar',
            },
          },
          {
            type: 'gk:setSheet',
            charVar: 'heroi1',
            image: 'heroi-oficina',
            fw: {
              type: 'num',
              value: 32,
            },
            fh: {
              type: 'num',
              value: 32,
            },
          },
          {
            type: 'gk:lutaMoveAnim',
            name: 'soco',
            charVar: 'heroi1',
            from: {
              type: 'num',
              value: 4,
            },
            to: {
              type: 'num',
              value: 7,
            },
          },
          {
            type: 'gk:setStageDescription',
            description:
              'Use A/D/W ou setas no duelo e acompanhe round, vitórias, combinações, especial e defesa no painel. O soco do jogador 1 usa os quadros da folha do Pinta.',
          },
        ],
        events: [
          {
            type: 'gk:onEvent',
            event: 'luta:acabou',
            body: [
              {
                type: 'gk:setScreenText',
                screen: 'fim',
                title: {
                  type: 'str',
                  value: 'Fim da luta!',
                },
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'str',
                      value: 'Venceu o ',
                    },
                    right: {
                      type: 'gk:lutaWinner',
                    },
                  },
                  right: {
                    type: 'str',
                    value: '. Bora de revanche?',
                  },
                },
                button: {
                  type: 'str',
                  value: 'Revanche',
                },
              },
              {
                type: 'gk:playEffect',
                fx: 'win',
              },
            ],
          },
        ],
        loops: [
          {
            type: 'gk:onUpdate',
            dtName: 'dt',
            body: [
              {
                type: 'gk:lutaFighter',
                charVar: 'heroi1',
                left: 'a',
                right: 'd',
                jump: 'w',
                crouch: 's',
                guard: 'f',
                dtVar: 'dt',
              },
              {
                type: 'gk:lutaFighter',
                charVar: 'heroi2',
                left: 'seta esquerda',
                right: 'seta direita',
                jump: 'seta para cima',
                crouch: 'seta para baixo',
                guard: '0',
                dtVar: 'dt',
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: 'g',
                },
                then: [
                  {
                    type: 'gk:lutaAttack',
                    charVar: 'heroi1',
                    move: 'soco',
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: 'h',
                },
                then: [
                  {
                    type: 'gk:lutaAttack',
                    charVar: 'heroi1',
                    move: 'chute',
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: 'j',
                },
                then: [
                  {
                    type: 'gk:lutaAttack',
                    charVar: 'heroi1',
                    move: 'especial',
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: '1',
                },
                then: [
                  {
                    type: 'gk:lutaAttack',
                    charVar: 'heroi2',
                    move: 'soco',
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: '2',
                },
                then: [
                  {
                    type: 'gk:lutaAttack',
                    charVar: 'heroi2',
                    move: 'chute',
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: '3',
                },
                then: [
                  {
                    type: 'gk:lutaAttack',
                    charVar: 'heroi2',
                    move: 'especial',
                  },
                ],
              },
              {
                type: 'gk:collideGroup',
                charVar: 'heroi1',
                mold: 'chao',
              },
              {
                type: 'gk:collideGroup',
                charVar: 'heroi2',
                mold: 'chao',
              },
            ],
          },
          {
            type: 'gk:onDraw',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawBackground',
                color: '#241733',
                grid: false,
              },
              {
                type: 'gk:drawLook',
                look: 'loja',
                x: {
                  type: 'num',
                  value: 640,
                },
                y: {
                  type: 'num',
                  value: 300,
                },
                w: {
                  type: 'num',
                  value: 160,
                },
                h: {
                  type: 'num',
                  value: 140,
                },
              },
              {
                type: 'gk:drawActive',
                mold: 'chao',
              },
              {
                type: 'gk:drawCharacter',
                charVar: 'heroi1',
              },
              {
                type: 'gk:drawCharacter',
                charVar: 'heroi2',
              },
            ],
          },
          {
            type: 'gk:onDrawHud',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:lutaDrawHud',
              },
            ],
          },
          {
            type: 'gk:onDrawHud',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawText',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'str',
                        value: 'Round ',
                      },
                      right: {
                        type: 'gk:lutaRound',
                      },
                    },
                    right: {
                      type: 'str',
                      value: ' Vitórias: ',
                    },
                  },
                  right: {
                    type: 'gk:lutaWinsOf',
                    charVar: 'heroi1',
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 130,
                },
                size: {
                  type: 'num',
                  value: 18,
                },
                color: {
                  type: 'color',
                  value: '#ffffff',
                },
              },
              {
                type: 'gk:drawText',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'binop',
                    op: '+',
                    left: {
                      type: 'binop',
                      op: '+',
                      left: {
                        type: 'str',
                        value: 'Combinação: ',
                      },
                      right: {
                        type: 'gk:lutaCombo',
                        charVar: 'heroi1',
                      },
                    },
                    right: {
                      type: 'str',
                      value: ' Especial: ',
                    },
                  },
                  right: {
                    type: 'gk:lutaSpecial',
                    charVar: 'heroi1',
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 155,
                },
                size: {
                  type: 'num',
                  value: 18,
                },
                color: {
                  type: 'color',
                  value: '#ffffff',
                },
              },
              {
                type: 'gk:drawText',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Defendendo: ',
                  },
                  right: {
                    type: 'gk:lutaIsGuarding',
                    charVar: 'heroi1',
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 180,
                },
                size: {
                  type: 'num',
                  value: 18,
                },
                color: {
                  type: 'color',
                  value: '#ffffff',
                },
              },
            ],
          },
        ],
      },
      extensions: [
        {
          extensionId: 'game-2d-advanced',
        },
      ],
    },
  },
  {
    name: 'Troque a posição das torres',
    description:
      'Use o mouse para comprar torres nos lugares marcados. Segure Shift e clique numa torre para desmontá-la, liberar o lugar e receber 25 moedas. Reorganize a defesa durante as ondas.',
    difficulty: 'advanced',
    concepts: ['defesa de torre', 'reciclagem', 'economia', 'clique', 'lugares de construção'],
    genre: 'defesa de torre',
    assets: [],
    experience: 'demo',
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: {
        molds: [
          {
            type: 'gk:defineLook',
            name: 'orc',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 6,
                },
                y: {
                  type: 'num',
                  value: 8,
                },
                w: {
                  type: 'num',
                  value: 28,
                },
                h: {
                  type: 'num',
                  value: 26,
                },
                color: {
                  type: 'color',
                  value: '#6a994e',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 6,
                },
                y: {
                  type: 'num',
                  value: 30,
                },
                w: {
                  type: 'num',
                  value: 28,
                },
                h: {
                  type: 'num',
                  value: 6,
                },
                color: {
                  type: 'color',
                  value: '#386641',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 12,
                },
                y: {
                  type: 'num',
                  value: 16,
                },
                w: {
                  type: 'num',
                  value: 6,
                },
                h: {
                  type: 'num',
                  value: 6,
                },
                color: {
                  type: 'color',
                  value: '#ffffff',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 24,
                },
                y: {
                  type: 'num',
                  value: 16,
                },
                w: {
                  type: 'num',
                  value: 6,
                },
                h: {
                  type: 'num',
                  value: 6,
                },
                color: {
                  type: 'color',
                  value: '#ffffff',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 14,
                },
                y: {
                  type: 'num',
                  value: 18,
                },
                w: {
                  type: 'num',
                  value: 3,
                },
                h: {
                  type: 'num',
                  value: 3,
                },
                color: {
                  type: 'color',
                  value: '#2b2d42',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 26,
                },
                y: {
                  type: 'num',
                  value: 18,
                },
                w: {
                  type: 'num',
                  value: 3,
                },
                h: {
                  type: 'num',
                  value: 3,
                },
                color: {
                  type: 'color',
                  value: '#2b2d42',
                },
              },
            ],
            baseW: {
              type: 'num',
              value: 40,
            },
            baseH: {
              type: 'num',
              value: 40,
            },
          },
          {
            type: 'gk:defineLook',
            name: 'torre',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 6,
                },
                y: {
                  type: 'num',
                  value: 20,
                },
                w: {
                  type: 'num',
                  value: 36,
                },
                h: {
                  type: 'num',
                  value: 24,
                },
                color: {
                  type: 'color',
                  value: '#6c757d',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 10,
                },
                y: {
                  type: 'num',
                  value: 6,
                },
                w: {
                  type: 'num',
                  value: 28,
                },
                h: {
                  type: 'num',
                  value: 18,
                },
                color: {
                  type: 'color',
                  value: '#adb5bd',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 16,
                },
                y: {
                  type: 'num',
                  value: 10,
                },
                w: {
                  type: 'num',
                  value: 16,
                },
                h: {
                  type: 'num',
                  value: 10,
                },
                color: {
                  type: 'color',
                  value: '#495057',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 0,
                },
                w: {
                  type: 'num',
                  value: 8,
                },
                h: {
                  type: 'num',
                  value: 10,
                },
                color: {
                  type: 'color',
                  value: '#ffd166',
                },
              },
            ],
            baseW: {
              type: 'num',
              value: 48,
            },
            baseH: {
              type: 'num',
              value: 48,
            },
          },
          {
            type: 'gk:defineLook',
            name: 'flecha',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawCircle',
                x: {
                  type: 'num',
                  value: 7,
                },
                y: {
                  type: 'num',
                  value: 7,
                },
                r: {
                  type: 'num',
                  value: 6,
                },
                color: {
                  type: 'color',
                  value: '#ffe066',
                },
              },
              {
                type: 'gk:drawCircle',
                x: {
                  type: 'num',
                  value: 7,
                },
                y: {
                  type: 'num',
                  value: 7,
                },
                r: {
                  type: 'num',
                  value: 3,
                },
                color: {
                  type: 'color',
                  value: '#f4a259',
                },
              },
            ],
            baseW: {
              type: 'num',
              value: 14,
            },
            baseH: {
              type: 'num',
              value: 14,
            },
          },
          {
            type: 'gk:defineMold',
            name: 'invasor',
            w: {
              type: 'num',
              value: 40,
            },
            h: {
              type: 'num',
              value: 40,
            },
            health: {
              type: 'num',
              value: 60,
            },
            speed: {
              type: 'num',
              value: 0,
            },
            damage: {
              type: 'num',
              value: 0,
            },
            color: '#6a994e',
            image: '',
            look: 'orc',
          },
          {
            type: 'gk:defineMold',
            name: 'torre',
            w: {
              type: 'num',
              value: 48,
            },
            h: {
              type: 'num',
              value: 48,
            },
            health: {
              type: 'num',
              value: 1,
            },
            speed: {
              type: 'num',
              value: 0,
            },
            damage: {
              type: 'num',
              value: 0,
            },
            color: '#6c757d',
            image: '',
            look: 'torre',
          },
          {
            type: 'gk:defineMold',
            name: 'tiro',
            w: {
              type: 'num',
              value: 14,
            },
            h: {
              type: 'num',
              value: 14,
            },
            health: {
              type: 'num',
              value: 1,
            },
            speed: {
              type: 'num',
              value: 0,
            },
            damage: {
              type: 'num',
              value: 0,
            },
            color: '#ffe066',
            image: '',
            look: 'flecha',
          },
          {
            type: 'gk:defineEffect',
            name: 'estouro',
            count: {
              type: 'num',
              value: 16,
            },
            color: '#ffd166',
            size: {
              type: 'num',
              value: 5,
            },
            life: {
              type: 'num',
              value: 0.4,
            },
            speed: {
              type: 'num',
              value: 200,
            },
            gravity: {
              type: 'num',
              value: 0,
            },
          },
          {
            type: 'gk:definePath',
            name: 'trilha',
            body: [
              {
                type: 'gk:pathPoint',
                x: {
                  type: 'num',
                  value: -60,
                },
                y: {
                  type: 'num',
                  value: 356,
                },
              },
              {
                type: 'gk:pathPoint',
                x: {
                  type: 'num',
                  value: 207,
                },
                y: {
                  type: 'num',
                  value: 354,
                },
              },
              {
                type: 'gk:pathPoint',
                x: {
                  type: 'num',
                  value: 207,
                },
                y: {
                  type: 'num',
                  value: 118,
                },
              },
              {
                type: 'gk:pathPoint',
                x: {
                  type: 'num',
                  value: 551,
                },
                y: {
                  type: 'num',
                  value: 119,
                },
              },
              {
                type: 'gk:pathPoint',
                x: {
                  type: 'num',
                  value: 551,
                },
                y: {
                  type: 'num',
                  value: 304,
                },
              },
              {
                type: 'gk:pathPoint',
                x: {
                  type: 'num',
                  value: 454,
                },
                y: {
                  type: 'num',
                  value: 305,
                },
              },
              {
                type: 'gk:pathPoint',
                x: {
                  type: 'num',
                  value: 454,
                },
                y: {
                  type: 'num',
                  value: 502,
                },
              },
              {
                type: 'gk:pathPoint',
                x: {
                  type: 'num',
                  value: 785,
                },
                y: {
                  type: 'num',
                  value: 499,
                },
              },
              {
                type: 'gk:pathPoint',
                x: {
                  type: 'num',
                  value: 787,
                },
                y: {
                  type: 'num',
                  value: 216,
                },
              },
              {
                type: 'gk:pathPoint',
                x: {
                  type: 'num',
                  value: 1020,
                },
                y: {
                  type: 'num',
                  value: 215,
                },
              },
            ],
          },
        ],
        start: [
          {
            type: 'gk:setup',
            w: {
              type: 'num',
              value: 960,
            },
            h: {
              type: 'num',
              value: 540,
            },
            bg: '#3a5a40',
            accent: '#ffd166',
          },
          {
            type: 'gk:setScreenText',
            screen: 'menu',
            title: {
              type: 'str',
              value: 'Muralha do Reino Profissional',
            },
            text: {
              type: 'str',
              value:
                'Clique nos lugares de terra para comprar torres. Elas miram sozinhas o invasor mais na frente. Segure as ondas!',
            },
            button: {
              type: 'str',
              value: 'Defender',
            },
          },
          {
            type: 'gk:setScreenText',
            screen: 'fim',
            title: {
              type: 'str',
              value: 'A muralha caiu!',
            },
            text: {
              type: 'str',
              value: 'O recorde fica guardado. Tente de novo!',
            },
            button: {
              type: 'str',
              value: 'Defender de novo',
            },
          },
          {
            type: 'var',
            name: 'vidas',
            value: {
              type: 'num',
              value: 10,
            },
          },
          {
            type: 'var',
            name: 'leva',
            value: {
              type: 'num',
              value: 3,
            },
          },
          {
            type: 'gk:tdSetCoins',
            n: {
              type: 'num',
              value: 100,
            },
          },
          {
            type: 'gk:tdSlot',
            x: {
              type: 'num',
              value: 120,
            },
            y: {
              type: 'num',
              value: 230,
            },
            size: {
              type: 'num',
              value: 60,
            },
          },
          {
            type: 'gk:tdSlot',
            x: {
              type: 'num',
              value: 320,
            },
            y: {
              type: 'num',
              value: 230,
            },
            size: {
              type: 'num',
              value: 60,
            },
          },
          {
            type: 'gk:tdSlot',
            x: {
              type: 'num',
              value: 340,
            },
            y: {
              type: 'num',
              value: 400,
            },
            size: {
              type: 'num',
              value: 60,
            },
          },
          {
            type: 'gk:tdSlot',
            x: {
              type: 'num',
              value: 620,
            },
            y: {
              type: 'num',
              value: 400,
            },
            size: {
              type: 'num',
              value: 60,
            },
          },
          {
            type: 'gk:tdSlot',
            x: {
              type: 'num',
              value: 640,
            },
            y: {
              type: 'num',
              value: 150,
            },
            size: {
              type: 'num',
              value: 60,
            },
          },
          {
            type: 'gk:tdSlot',
            x: {
              type: 'num',
              value: 880,
            },
            y: {
              type: 'num',
              value: 340,
            },
            size: {
              type: 'num',
              value: 60,
            },
          },
          {
            type: 'assign',
            name: 'vidas',
            value: {
              type: 'num',
              value: 10,
            },
          },
          {
            type: 'assign',
            name: 'leva',
            value: {
              type: 'num',
              value: 3,
            },
          },
          {
            type: 'gk:tdWave',
            path: 'trilha',
            count: {
              type: 'var',
              name: 'leva',
            },
            mold: 'invasor',
            gap: {
              type: 'num',
              value: 150,
            },
            speed: {
              type: 'num',
              value: 80,
            },
          },
          {
            type: 'gk:setScreenText',
            screen: 'menu',
            title: {
              type: 'str',
              value: 'Reorganize a defesa',
            },
            text: {
              type: 'str',
              value:
                'Clique nos lugares para comprar. Shift + clique numa torre desmonta e devolve 25 moedas. Defenda a muralha!',
            },
            button: {
              type: 'str',
              value: 'Defender',
            },
          },
          {
            type: 'gk:setStageDescription',
            description:
              'Use o mouse para comprar torres nos lugares marcados. Segure Shift e clique numa torre para desmontá-la, liberar o lugar e receber 25 moedas. Reorganize a defesa durante as ondas.',
          },
        ],
        events: [
          {
            type: 'gk:tdOnBuy',
            cost: {
              type: 'num',
              value: 50,
            },
            xName: 'lugarX',
            yName: 'lugarY',
            body: [
              {
                type: 'gk:spawnFromMold',
                mold: 'torre',
                x: {
                  type: 'binop',
                  op: '-',
                  left: {
                    type: 'var',
                    name: 'lugarX',
                  },
                  right: {
                    type: 'num',
                    value: 24,
                  },
                },
                y: {
                  type: 'binop',
                  op: '-',
                  left: {
                    type: 'var',
                    name: 'lugarY',
                  },
                  right: {
                    type: 'num',
                    value: 24,
                  },
                },
              },
              {
                type: 'gk:playEffect',
                fx: 'click',
              },
            ],
          },
          {
            type: 'gk:onEvent',
            event: 'compra:negada',
            body: [
              {
                type: 'gk:floatText',
                text: {
                  type: 'str',
                  value: 'sem moedas!',
                },
                x: {
                  type: 'gk:mouseX',
                },
                y: {
                  type: 'gk:mouseY',
                },
                color: '#ff6b6b',
                size: {
                  type: 'num',
                  value: 20,
                },
              },
            ],
          },
          {
            type: 'gk:onEvent',
            event: 'invasor:passou',
            body: [
              {
                type: 'assign',
                name: 'vidas',
                value: {
                  type: 'binop',
                  op: '-',
                  left: {
                    type: 'var',
                    name: 'vidas',
                  },
                  right: {
                    type: 'num',
                    value: 1,
                  },
                },
              },
              {
                type: 'gk:cameraShake',
                intensity: {
                  type: 'num',
                  value: 6,
                },
                seconds: {
                  type: 'num',
                  value: 0.3,
                },
              },
              {
                type: 'if',
                cond: {
                  type: 'binop',
                  op: '<=',
                  left: {
                    type: 'var',
                    name: 'vidas',
                  },
                  right: {
                    type: 'num',
                    value: 0,
                  },
                },
                then: [
                  {
                    type: 'gk:endGame',
                  },
                ],
              },
            ],
          },
          {
            type: 'gk:onEvent',
            event: 'onda:limpa',
            body: [
              {
                type: 'assign',
                name: 'leva',
                value: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'var',
                    name: 'leva',
                  },
                  right: {
                    type: 'num',
                    value: 2,
                  },
                },
              },
              {
                type: 'gk:tdAddCoins',
                n: {
                  type: 'num',
                  value: 25,
                },
              },
              {
                type: 'gk:tdWave',
                path: 'trilha',
                count: {
                  type: 'var',
                  name: 'leva',
                },
                mold: 'invasor',
                gap: {
                  type: 'num',
                  value: 150,
                },
                speed: {
                  type: 'num',
                  value: 80,
                },
              },
            ],
          },
          {
            type: 'gk:onGameClick',
            xName: 'px',
            yName: 'py',
            body: [
              {
                type: 'if',
                cond: {
                  type: 'gk:keyDown',
                  key: 'Shift',
                },
                then: [
                  {
                    type: 'var',
                    name: 'torre',
                    value: {
                      type: 'gk:nearestActive',
                      mold: 'torre',
                      x: {
                        type: 'var',
                        name: 'px',
                      },
                      y: {
                        type: 'var',
                        name: 'py',
                      },
                    },
                    kind: 'const',
                  },
                  {
                    type: 'if',
                    cond: {
                      type: 'logical',
                      op: '&&',
                      left: {
                        type: 'var',
                        name: 'torre',
                      },
                      right: {
                        type: 'gk:pointIn',
                        x: {
                          type: 'var',
                          name: 'px',
                        },
                        y: {
                          type: 'var',
                          name: 'py',
                        },
                        charVar: 'torre',
                      },
                    },
                    then: [
                      {
                        type: 'gk:tdFreeSlot',
                        x: {
                          type: 'binop',
                          op: '+',
                          left: {
                            type: 'memberGet',
                            object: {
                              type: 'var',
                              name: 'torre',
                            },
                            name: 'x',
                          },
                          right: {
                            type: 'num',
                            value: 24,
                          },
                        },
                        y: {
                          type: 'binop',
                          op: '+',
                          left: {
                            type: 'memberGet',
                            object: {
                              type: 'var',
                              name: 'torre',
                            },
                            name: 'y',
                          },
                          right: {
                            type: 'num',
                            value: 24,
                          },
                        },
                      },
                      {
                        type: 'gk:recycle',
                        charVar: 'torre',
                      },
                      {
                        type: 'gk:tdAddCoins',
                        n: {
                          type: 'num',
                          value: 25,
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        loops: [
          {
            type: 'gk:onUpdate',
            dtName: 'dt',
            body: [
              {
                type: 'gk:forEachActive',
                mold: 'torre',
                itemName: 'torre',
                body: [
                  {
                    type: 'if',
                    cond: {
                      type: 'gk:cooldownReady',
                      charVar: 'torre',
                      seconds: {
                        type: 'num',
                        value: 0.7,
                      },
                    },
                    then: [
                      {
                        type: 'var',
                        name: 'alvo',
                        value: {
                          type: 'gk:pickActive',
                          mold: 'invasor',
                          mode: 'maior',
                          prop: 'pathProgress',
                        },
                        kind: 'const',
                      },
                      {
                        type: 'if',
                        cond: {
                          type: 'var',
                          name: 'alvo',
                        },
                        then: [
                          {
                            type: 'if',
                            cond: {
                              type: 'binop',
                              op: '<',
                              left: {
                                type: 'gk:distanceBetween',
                                a: 'torre',
                                b: 'alvo',
                              },
                              right: {
                                type: 'num',
                                value: 200,
                              },
                            },
                            then: [
                              {
                                type: 'gk:spawnNamed',
                                varName: 'tiro',
                                mold: 'tiro',
                                x: {
                                  type: 'binop',
                                  op: '+',
                                  left: {
                                    type: 'gk:charX',
                                    charVar: 'torre',
                                  },
                                  right: {
                                    type: 'num',
                                    value: 17,
                                  },
                                },
                                y: {
                                  type: 'binop',
                                  op: '+',
                                  left: {
                                    type: 'gk:charY',
                                    charVar: 'torre',
                                  },
                                  right: {
                                    type: 'num',
                                    value: 4,
                                  },
                                },
                              },
                              {
                                type: 'gk:launchTowards',
                                charVar: 'tiro',
                                targetVar: 'alvo',
                                speed: {
                                  type: 'num',
                                  value: 460,
                                },
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'gk:forEachActive',
                mold: 'tiro',
                itemName: 'item',
                body: [
                  {
                    type: 'gk:moveByVelocity',
                    charVar: 'item',
                    dtVar: 'dt',
                  },
                ],
              },
              {
                type: 'gk:cullOffscreen',
                mold: 'tiro',
                margin: {
                  type: 'num',
                  value: 60,
                },
              },
              {
                type: 'gk:overlapGroups',
                aName: 't',
                moldA: 'tiro',
                bName: 'inv',
                moldB: 'invasor',
                body: [
                  {
                    type: 'gk:recycle',
                    charVar: 't',
                  },
                  {
                    type: 'gk:hurt',
                    charVar: 'inv',
                    amount: {
                      type: 'num',
                      value: 20,
                    },
                    iframes: {
                      type: 'num',
                      value: 0,
                    },
                  },
                  {
                    type: 'if',
                    cond: {
                      type: 'gk:isDead',
                      charVar: 'inv',
                    },
                    then: [
                      {
                        type: 'gk:burst',
                        effect: 'estouro',
                        x: {
                          type: 'gk:charX',
                          charVar: 'inv',
                        },
                        y: {
                          type: 'gk:charY',
                          charVar: 'inv',
                        },
                      },
                      {
                        type: 'gk:tdAddCoins',
                        n: {
                          type: 'num',
                          value: 25,
                        },
                      },
                      {
                        type: 'gk:floatText',
                        text: {
                          type: 'str',
                          value: '+25',
                        },
                        x: {
                          type: 'gk:charX',
                          charVar: 'inv',
                        },
                        y: {
                          type: 'gk:charY',
                          charVar: 'inv',
                        },
                        color: '#ffd166',
                        size: {
                          type: 'num',
                          value: 20,
                        },
                      },
                      {
                        type: 'gk:recycle',
                        charVar: 'inv',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'gk:onDraw',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawBackground',
                color: '#3a5a40',
                grid: true,
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: -60,
                },
                y: {
                  type: 'num',
                  value: 336,
                },
                w: {
                  type: 'num',
                  value: 267,
                },
                h: {
                  type: 'num',
                  value: 40,
                },
                color: {
                  type: 'color',
                  value: '#a68a64',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 187,
                },
                y: {
                  type: 'num',
                  value: 118,
                },
                w: {
                  type: 'num',
                  value: 40,
                },
                h: {
                  type: 'num',
                  value: 258,
                },
                color: {
                  type: 'color',
                  value: '#a68a64',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 187,
                },
                y: {
                  type: 'num',
                  value: 118,
                },
                w: {
                  type: 'num',
                  value: 384,
                },
                h: {
                  type: 'num',
                  value: 40,
                },
                color: {
                  type: 'color',
                  value: '#a68a64',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 531,
                },
                y: {
                  type: 'num',
                  value: 119,
                },
                w: {
                  type: 'num',
                  value: 40,
                },
                h: {
                  type: 'num',
                  value: 205,
                },
                color: {
                  type: 'color',
                  value: '#a68a64',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 434,
                },
                y: {
                  type: 'num',
                  value: 285,
                },
                w: {
                  type: 'num',
                  value: 137,
                },
                h: {
                  type: 'num',
                  value: 40,
                },
                color: {
                  type: 'color',
                  value: '#a68a64',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 434,
                },
                y: {
                  type: 'num',
                  value: 285,
                },
                w: {
                  type: 'num',
                  value: 40,
                },
                h: {
                  type: 'num',
                  value: 237,
                },
                color: {
                  type: 'color',
                  value: '#a68a64',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 434,
                },
                y: {
                  type: 'num',
                  value: 482,
                },
                w: {
                  type: 'num',
                  value: 371,
                },
                h: {
                  type: 'num',
                  value: 40,
                },
                color: {
                  type: 'color',
                  value: '#a68a64',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 765,
                },
                y: {
                  type: 'num',
                  value: 216,
                },
                w: {
                  type: 'num',
                  value: 40,
                },
                h: {
                  type: 'num',
                  value: 306,
                },
                color: {
                  type: 'color',
                  value: '#a68a64',
                },
              },
              {
                type: 'gk:drawRectangle',
                x: {
                  type: 'num',
                  value: 767,
                },
                y: {
                  type: 'num',
                  value: 216,
                },
                w: {
                  type: 'num',
                  value: 253,
                },
                h: {
                  type: 'num',
                  value: 40,
                },
                color: {
                  type: 'color',
                  value: '#a68a64',
                },
              },
              {
                type: 'gk:tdDrawSlots',
              },
              {
                type: 'gk:forEachActive',
                mold: 'torre',
                itemName: 'torre',
                body: [
                  {
                    type: 'gk:tdDrawRange',
                    charVar: 'torre',
                    radius: {
                      type: 'num',
                      value: 200,
                    },
                  },
                ],
              },
              {
                type: 'gk:drawActive',
                mold: 'torre',
              },
              {
                type: 'gk:drawActive',
                mold: 'invasor',
              },
              {
                type: 'gk:drawActive',
                mold: 'tiro',
              },
              {
                type: 'gk:forEachActive',
                mold: 'invasor',
                itemName: 'inv',
                body: [
                  {
                    type: 'gk:drawHealthBar',
                    charVar: 'inv',
                    max: {
                      type: 'num',
                      value: 0,
                    },
                  },
                ],
              },
            ],
          },
          {
            type: 'gk:onDrawHud',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawHearts',
                current: {
                  type: 'var',
                  name: 'vidas',
                },
                max: {
                  type: 'num',
                  value: 10,
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 20,
                },
              },
              {
                type: 'gk:drawText',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Moedas: ',
                  },
                  right: {
                    type: 'gk:tdCoins',
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 76,
                },
                size: {
                  type: 'num',
                  value: 24,
                },
                color: {
                  type: 'color',
                  value: '#ffd166',
                },
              },
            ],
          },
        ],
      },
      extensions: [
        {
          extensionId: 'game-2d-advanced',
        },
      ],
    },
  },
  {
    name: 'Peças e cartas na mesa',
    description:
      'Clique na grade para marcar casas. O contador mostra quantas estão preenchidas. Espaço vira a carta de cima; Enter troca essa carta por outra da pilha.',
    difficulty: 'intermediate',
    concepts: ['grade', 'contagem', 'listas', 'pilha', 'cartas'],
    genre: 'tabuleiro',
    assets: [],
    experience: 'demo',
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [
          {
            type: 'gk:setup',
            w: {
              type: 'num',
              value: 640,
            },
            h: {
              type: 'num',
              value: 400,
            },
            bg: '#183653',
            accent: '#ffd166',
          },
          {
            type: 'gk:setScreenText',
            screen: 'menu',
            title: {
              type: 'str',
              value: 'Peças e cartas',
            },
            text: {
              type: 'str',
              value: 'Clique na grade. Espaço vira a carta do topo; Enter troca a carta.',
            },
            button: {
              type: 'str',
              value: 'Experimentar',
            },
          },
          {
            type: 'gk:boardCreate',
            name: 'mesa',
            cols: {
              type: 'num',
              value: 8,
            },
            rows: {
              type: 'num',
              value: 4,
            },
            empty: {
              type: 'num',
              value: 0,
            },
          },
          {
            type: 'var',
            name: 'baralho',
            value: {
              type: 'array',
              items: [
                {
                  type: 'gk:card',
                  front: {
                    type: 'str',
                    value: 'Lua',
                  },
                  back: {
                    type: 'str',
                    value: '?',
                  },
                },
                {
                  type: 'gk:card',
                  front: {
                    type: 'str',
                    value: 'Sol',
                  },
                  back: {
                    type: 'str',
                    value: '?',
                  },
                },
                {
                  type: 'gk:card',
                  front: {
                    type: 'str',
                    value: 'Estrela',
                  },
                  back: {
                    type: 'str',
                    value: '?',
                  },
                },
              ],
            },
          },
          {
            type: 'var',
            name: 'descarte',
            value: {
              type: 'array',
              items: [],
            },
          },
          {
            type: 'gk:setStageDescription',
            description:
              'Clique na grade para marcar casas. O contador mostra quantas estão preenchidas. Espaço vira a carta de cima; Enter troca essa carta por outra da pilha.',
          },
        ],
        events: [
          {
            type: 'gk:onGameClick',
            xName: 'px',
            yName: 'py',
            body: [
              {
                type: 'var',
                name: 'coluna',
                value: {
                  type: 'mathUnary',
                  fn: 'floor',
                  arg: {
                    type: 'binop',
                    op: '/',
                    left: {
                      type: 'binop',
                      op: '-',
                      left: {
                        type: 'var',
                        name: 'px',
                      },
                      right: {
                        type: 'num',
                        value: 20,
                      },
                    },
                    right: {
                      type: 'num',
                      value: 36,
                    },
                  },
                },
                kind: 'const',
              },
              {
                type: 'var',
                name: 'linha',
                value: {
                  type: 'mathUnary',
                  fn: 'floor',
                  arg: {
                    type: 'binop',
                    op: '/',
                    left: {
                      type: 'binop',
                      op: '-',
                      left: {
                        type: 'var',
                        name: 'py',
                      },
                      right: {
                        type: 'num',
                        value: 100,
                      },
                    },
                    right: {
                      type: 'num',
                      value: 36,
                    },
                  },
                },
                kind: 'const',
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:boardIn',
                  name: 'mesa',
                  col: {
                    type: 'var',
                    name: 'coluna',
                  },
                  row: {
                    type: 'var',
                    name: 'linha',
                  },
                },
                then: [
                  {
                    type: 'gk:boardSet',
                    name: 'mesa',
                    value: {
                      type: 'var',
                      name: 'coluna',
                    },
                    col: {
                      type: 'var',
                      name: 'linha',
                    },
                    row: {
                      type: 'num',
                      value: 1,
                    },
                  },
                ],
              },
            ],
          },
        ],
        loops: [
          {
            type: 'gk:onUpdate',
            dtName: 'dt',
            body: [
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: 'Space',
                },
                then: [
                  {
                    type: 'gk:cardFlip',
                    card: {
                      type: 'gk:pileTop',
                      pileVar: 'baralho',
                    },
                  },
                ],
              },
              {
                type: 'if',
                cond: {
                  type: 'gk:keyPressed',
                  key: 'Enter',
                },
                then: [
                  {
                    type: 'gk:pileMoveTop',
                    fromVar: 'baralho',
                    toVar: 'descarte',
                  },
                  {
                    type: 'if',
                    cond: {
                      type: 'binop',
                      op: '===',
                      left: {
                        type: 'gk:pileSize',
                        pileVar: 'baralho',
                      },
                      right: {
                        type: 'num',
                        value: 0,
                      },
                    },
                    then: [
                      {
                        type: 'gk:pileShuffleFrom',
                        deckVar: 'baralho',
                        discardVar: 'descarte',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'gk:onDraw',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawBackground',
                color: '#183653',
                grid: false,
              },
              {
                type: 'forRange',
                varName: 'linha',
                from: {
                  type: 'num',
                  value: 0,
                },
                to: {
                  type: 'num',
                  value: 4,
                },
                step: {
                  type: 'num',
                  value: 1,
                },
                body: [
                  {
                    type: 'forRange',
                    varName: 'coluna',
                    from: {
                      type: 'num',
                      value: 0,
                    },
                    to: {
                      type: 'num',
                      value: 8,
                    },
                    step: {
                      type: 'num',
                      value: 1,
                    },
                    body: [
                      {
                        type: 'if',
                        cond: {
                          type: 'binop',
                          op: '===',
                          left: {
                            type: 'gk:boardGet',
                            name: 'mesa',
                            col: {
                              type: 'var',
                              name: 'coluna',
                            },
                            row: {
                              type: 'var',
                              name: 'linha',
                            },
                          },
                          right: {
                            type: 'num',
                            value: 1,
                          },
                        },
                        then: [
                          {
                            type: 'gk:drawRectangle',
                            x: {
                              type: 'binop',
                              op: '+',
                              left: {
                                type: 'num',
                                value: 20,
                              },
                              right: {
                                type: 'binop',
                                op: '*',
                                left: {
                                  type: 'var',
                                  name: 'coluna',
                                },
                                right: {
                                  type: 'num',
                                  value: 36,
                                },
                              },
                            },
                            y: {
                              type: 'binop',
                              op: '+',
                              left: {
                                type: 'num',
                                value: 100,
                              },
                              right: {
                                type: 'binop',
                                op: '*',
                                left: {
                                  type: 'var',
                                  name: 'linha',
                                },
                                right: {
                                  type: 'num',
                                  value: 36,
                                },
                              },
                            },
                            w: {
                              type: 'num',
                              value: 32,
                            },
                            h: {
                              type: 'num',
                              value: 32,
                            },
                            color: {
                              type: 'color',
                              value: '#ffd166',
                            },
                          },
                        ],
                        else: [
                          {
                            type: 'gk:drawRectangle',
                            x: {
                              type: 'binop',
                              op: '+',
                              left: {
                                type: 'num',
                                value: 20,
                              },
                              right: {
                                type: 'binop',
                                op: '*',
                                left: {
                                  type: 'var',
                                  name: 'coluna',
                                },
                                right: {
                                  type: 'num',
                                  value: 36,
                                },
                              },
                            },
                            y: {
                              type: 'binop',
                              op: '+',
                              left: {
                                type: 'num',
                                value: 100,
                              },
                              right: {
                                type: 'binop',
                                op: '*',
                                left: {
                                  type: 'var',
                                  name: 'linha',
                                },
                                right: {
                                  type: 'num',
                                  value: 36,
                                },
                              },
                            },
                            w: {
                              type: 'num',
                              value: 32,
                            },
                            h: {
                              type: 'num',
                              value: 32,
                            },
                            color: {
                              type: 'color',
                              value: '#436f70',
                            },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'gk:handDraw',
                pileVar: 'baralho',
                x: {
                  type: 'num',
                  value: 380,
                },
                y: {
                  type: 'num',
                  value: 120,
                },
                fan: false,
              },
            ],
          },
          {
            type: 'gk:onDrawHud',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawText',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Casas marcadas: ',
                  },
                  right: {
                    type: 'gk:boardCount',
                    name: 'mesa',
                    value: {
                      type: 'num',
                      value: 1,
                    },
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 35,
                },
                size: {
                  type: 'num',
                  value: 20,
                },
                color: {
                  type: 'color',
                  value: '#ffffff',
                },
              },
              {
                type: 'gk:drawText',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Topo: ',
                  },
                  right: {
                    type: 'gk:cardFace',
                    card: {
                      type: 'gk:pileTop',
                      pileVar: 'baralho',
                    },
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 65,
                },
                size: {
                  type: 'num',
                  value: 20,
                },
                color: {
                  type: 'color',
                  value: '#ffffff',
                },
              },
            ],
          },
        ],
      },
      extensions: [
        {
          extensionId: 'game-2d-advanced',
        },
      ],
    },
  },
  {
    name: 'O gramado das criaturas',
    description:
      'Explore com setas e encontre criaturas na grama. O painel mostra seu time e nível. Veja as cartas do seu time durante a exploração.',
    difficulty: 'advanced',
    concepts: ['mapa do Pinta', 'criaturas', 'encontros', 'nível'],
    genre: 'RPG',
    assets: ['mapa-oficina', 'heroi-oficina'],
    experience: 'demo',
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: {
        molds: [
          {
            type: 'gk:pkmCreature',
            name: 'Folhinha',
            creatureType: 'planta',
            hp: {
              type: 'num',
              value: 32,
            },
            str: {
              type: 'num',
              value: 8,
            },
            def: {
              type: 'num',
              value: 4,
            },
            spd: {
              type: 'num',
              value: 8,
            },
            image: '',
            look: '',
          },
          {
            type: 'gk:pkmCreature',
            name: 'Gotinha',
            creatureType: 'água',
            hp: {
              type: 'num',
              value: 30,
            },
            str: {
              type: 'num',
              value: 7,
            },
            def: {
              type: 'num',
              value: 4,
            },
            spd: {
              type: 'num',
              value: 9,
            },
            image: '',
            look: '',
          },
          {
            type: 'gk:pkmMove',
            move: 'Investida',
            creature: 'Folhinha',
            moveType: 'planta',
            dmg: {
              type: 'num',
              value: 10,
            },
            acc: {
              type: 'num',
              value: 100,
            },
            fx: 'investida',
            color: '#65d5c2',
          },
          {
            type: 'gk:pkmMove',
            move: 'Onda',
            creature: 'Gotinha',
            moveType: 'água',
            dmg: {
              type: 'num',
              value: 10,
            },
            acc: {
              type: 'num',
              value: 100,
            },
            fx: 'onda',
            color: '#2f83b4',
          },
        ],
        start: [
          {
            type: 'gk:setup',
            w: {
              type: 'num',
              value: 640,
            },
            h: {
              type: 'num',
              value: 384,
            },
            bg: '#b9e0d0',
            accent: '#2f83b4',
          },
          {
            type: 'gk:setScreenText',
            screen: 'menu',
            title: {
              type: 'str',
              value: 'O gramado das criaturas',
            },
            text: {
              type: 'str',
              value:
                'Setas exploram. Ande na grama para encontrar um bichinho. O painel mostra seu time e o nível.',
            },
            button: {
              type: 'str',
              value: 'Explorar',
            },
          },
          {
            type: 'gk:loadTilemap',
            name: 'gramado',
            asset: 'mapa-oficina',
          },
          {
            type: 'gk:setTileSize',
            px: {
              type: 'num',
              value: 32,
            },
          },
          {
            type: 'gk:createCharacter',
            varName: 'heroi',
            image: 'heroi-oficina',
            w: {
              type: 'num',
              value: 28,
            },
            h: {
              type: 'num',
              value: 30,
            },
            speed: {
              type: 'num',
              value: 120,
            },
            color: '#2f83b4',
          },
          {
            type: 'gk:sceneCommand',
            method: 'sceneAnimation',
            args: [
              {
                type: 'var',
                name: 'heroi',
              },
              {
                type: 'str',
                value: 'heroi-oficina',
              },
              {
                type: 'str',
                value: 'andando',
              },
              {
                type: 'bool',
                value: false,
              },
            ],
          },
          {
            type: 'gk:placeCharacter',
            charVar: 'heroi',
            x: {
              type: 'num',
              value: 64,
            },
            y: {
              type: 'num',
              value: 320,
            },
          },
          {
            type: 'gk:rpgSetStartMap',
            map: 'gramado',
          },
          {
            type: 'gk:rpgCreateMap',
            map: 'gramado',
            cols: {
              type: 'num',
              value: 20,
            },
            rows: {
              type: 'num',
              value: 12,
            },
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawBackground',
                color: '#b9e0d0',
                grid: false,
              },
              {
                type: 'gk:drawTilemap',
                name: 'gramado',
                layer: 'chão',
              },
            ],
          },
          {
            type: 'gk:pkmGive',
            creature: 'Folhinha',
            level: {
              type: 'num',
              value: 2,
            },
          },
          {
            type: 'gk:pkmGiveBall',
            count: {
              type: 'num',
              value: 5,
            },
            power: {
              type: 'num',
              value: 80,
            },
          },
          {
            type: 'gk:pkmGrassTiles',
            index: {
              type: 'num',
              value: 3,
            },
            map: 'gramado',
          },
          {
            type: 'gk:pkmWild',
            creature: 'Gotinha',
            min: {
              type: 'num',
              value: 1,
            },
            max: {
              type: 'num',
              value: 2,
            },
          },
          {
            type: 'gk:pkmEncounterRate',
            percent: {
              type: 'num',
              value: 35,
            },
          },
          {
            type: 'gk:setStageDescription',
            description:
              'Explore com setas e encontre criaturas na grama. O painel mostra seu time e nível. Veja as cartas do seu time durante a exploração.',
          },
        ],
        events: [],
        loops: [
          {
            type: 'gk:onUpdate',
            dtName: 'dt',
            body: [
              {
                type: 'gk:rpgMoveGrid',
                charVar: 'heroi',
                cell: {
                  type: 'num',
                  value: 32,
                },
                dtVar: 'dt',
              },
            ],
          },
          {
            type: 'gk:onDraw',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawCharacter',
                charVar: 'heroi',
              },
            ],
          },
          {
            type: 'gk:onDrawHud',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:pkmDrawTeam',
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 25,
                },
              },
              {
                type: 'gk:drawText',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Folhinha está no time: ',
                  },
                  right: {
                    type: 'gk:pkmHas',
                    creature: 'Folhinha',
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 60,
                },
                size: {
                  type: 'num',
                  value: 18,
                },
                color: {
                  type: 'color',
                  value: '#183653',
                },
              },
              {
                type: 'gk:drawText',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Nível: ',
                  },
                  right: {
                    type: 'gk:pkmLevelOf',
                    creature: 'Folhinha',
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 85,
                },
                size: {
                  type: 'num',
                  value: 18,
                },
                color: {
                  type: 'color',
                  value: '#183653',
                },
              },
            ],
          },
        ],
      },
      extensions: [
        {
          extensionId: 'game-2d-advanced',
        },
      ],
    },
  },
  {
    name: 'Uma pista de cópias em movimento',
    description:
      'Use setas ou arraste para coletar os objetos do molde. As cópias se movem lateralmente pela pista; o encontro identifica e retira somente a cópia coletada.',
    difficulty: 'advanced',
    concepts: ['perspectiva', 'moldes', 'cópias', 'encontros', 'movimento por segundo'],
    genre: 'corrida',
    assets: ['fundo-oficina', 'heroi-oficina'],
    experience: 'demo',
    ir: {
      version: 2,
      html: [],
      css: [],
      behavior: {
        molds: [
          {
            type: 'gk:defineMold',
            name: 'estrela',
            w: {
              type: 'num',
              value: 24,
            },
            h: {
              type: 'num',
              value: 24,
            },
            health: {
              type: 'num',
              value: 1,
            },
            speed: {
              type: 'num',
              value: 0,
            },
            damage: {
              type: 'num',
              value: 0,
            },
            color: '#ffd166',
            image: '',
            look: '',
          },
        ],
        start: [
          {
            type: 'gk:setup',
            w: {
              type: 'num',
              value: 640,
            },
            h: {
              type: 'num',
              value: 480,
            },
            bg: '#183653',
            accent: '#ffd166',
          },
          {
            type: 'gk:setScreenText',
            screen: 'menu',
            title: {
              type: 'str',
              value: 'Pista de cópias',
            },
            text: {
              type: 'str',
              value:
                'Setas ou arraste para coletar. As cópias deslizam de lado e cada encontro identifica o objeto certo.',
            },
            button: {
              type: 'str',
              value: 'Correr',
            },
          },
          {
            type: 'gk:sceneCommand',
            method: 'addSceneBackdrop',
            args: [
              {
                type: 'str',
                value: 'ceu',
              },
              {
                type: 'str',
                value: 'fundo-oficina',
              },
              {
                type: 'str',
                value: 'far',
              },
            ],
          },
          {
            type: 'gk:sceneCommand',
            method: 'sceneBackdropFit',
            args: [
              {
                type: 'str',
                value: 'ceu',
              },
              {
                type: 'str',
                value: 'cover',
              },
            ],
          },
          {
            type: 'gk:sceneCommand',
            method: 'createSpriteTrack',
            args: [
              {
                type: 'str',
                value: 'pista',
              },
            ],
          },
          {
            type: 'gk:createCharacter',
            varName: 'heroi',
            image: 'heroi-oficina',
            w: {
              type: 'num',
              value: 28,
            },
            h: {
              type: 'num',
              value: 32,
            },
            speed: {
              type: 'num',
              value: 0,
            },
            color: '#2f83b4',
          },
          {
            type: 'gk:spawnNamed',
            varName: 'estrela',
            mold: 'estrela',
            x: {
              type: 'num',
              value: 0,
            },
            y: {
              type: 'num',
              value: 0,
            },
          },
          {
            type: 'gk:sceneCommand',
            method: 'sceneAnimation',
            args: [
              {
                type: 'var',
                name: 'heroi',
              },
              {
                type: 'str',
                value: 'heroi-oficina',
              },
              {
                type: 'str',
                value: 'andando',
              },
              {
                type: 'bool',
                value: false,
              },
            ],
          },
          {
            type: 'gk:sceneCommand',
            method: 'trackFollow',
            args: [
              {
                type: 'str',
                value: 'pista',
              },
              {
                type: 'var',
                name: 'heroi',
              },
            ],
          },
          {
            type: 'gk:sceneCommand',
            method: 'trackInput',
            args: [
              {
                type: 'str',
                value: 'pista',
              },
              {
                type: 'str',
                value: 'both',
              },
              {
                type: 'num',
                value: 120,
              },
            ],
          },
          {
            type: 'gk:sceneCommand',
            method: 'trackLimit',
            args: [
              {
                type: 'str',
                value: 'pista',
              },
              {
                type: 'num',
                value: 120,
              },
              {
                type: 'num',
                value: 120,
              },
            ],
          },
          {
            type: 'gk:sceneCommand',
            method: 'trackSpeed',
            args: [
              {
                type: 'str',
                value: 'pista',
              },
              {
                type: 'num',
                value: 150,
              },
            ],
          },
          {
            type: 'gk:sceneCommand',
            method: 'trackFinishLine',
            args: [
              {
                type: 'str',
                value: 'pista',
              },
              {
                type: 'num',
                value: 3000,
              },
            ],
          },
          {
            type: 'gk:sceneCommand',
            method: 'putTrackSprite',
            args: [
              {
                type: 'str',
                value: 'pista',
              },
              {
                type: 'var',
                name: 'estrela',
              },
              {
                type: 'num',
                value: -70,
              },
              {
                type: 'num',
                value: 400,
              },
            ],
          },
          {
            type: 'gk:sceneCommand',
            method: 'repeatTrackSprite',
            args: [
              {
                type: 'str',
                value: 'pista',
              },
              {
                type: 'var',
                name: 'estrela',
              },
              {
                type: 'num',
                value: 8,
              },
              {
                type: 'num',
                value: 280,
              },
              {
                type: 'str',
                value: 'alternate',
              },
            ],
          },
          {
            type: 'var',
            name: 'pontos',
            value: {
              type: 'num',
              value: 0,
            },
          },
          {
            type: 'gk:setStageDescription',
            description:
              'Use setas ou arraste para coletar os objetos do molde. As cópias se movem lateralmente pela pista; o encontro identifica e retira somente a cópia coletada.',
          },
        ],
        events: [
          {
            type: 'gk:sceneEvent',
            method: 'onTrackMoldEncounter',
            args: [
              {
                type: 'str',
                value: 'pista',
              },
              {
                type: 'str',
                value: 'estrela',
              },
            ],
            body: [
              {
                type: 'assign',
                name: 'pontos',
                value: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'var',
                    name: 'pontos',
                  },
                  right: {
                    type: 'num',
                    value: 1,
                  },
                },
              },
              {
                type: 'gk:recycle',
                charVar: 'coletada',
              },
            ],
            parameter: 'coletada',
          },
        ],
        loops: [
          {
            type: 'gk:onUpdate',
            dtName: 'dt',
            body: [
              {
                type: 'gk:sceneEach',
                method: 'forEachTrackSprite',
                args: [
                  {
                    type: 'var',
                    name: 'estrela',
                  },
                ],
                body: [
                  {
                    type: 'gk:sceneCommand',
                    method: 'trackSpriteVelocity',
                    args: [
                      {
                        type: 'var',
                        name: 'copia',
                      },
                      {
                        type: 'num',
                        value: 7,
                      },
                      {
                        type: 'num',
                        value: 0,
                      },
                    ],
                  },
                ],
                parameter: 'copia',
              },
            ],
          },
          {
            type: 'gk:onDrawHud',
            ctxName: 'ctx',
            body: [
              {
                type: 'gk:drawText',
                text: {
                  type: 'binop',
                  op: '+',
                  left: {
                    type: 'str',
                    value: 'Coletadas: ',
                  },
                  right: {
                    type: 'var',
                    name: 'pontos',
                  },
                },
                x: {
                  type: 'num',
                  value: 20,
                },
                y: {
                  type: 'num',
                  value: 35,
                },
                size: {
                  type: 'num',
                  value: 24,
                },
                color: {
                  type: 'color',
                  value: '#183653',
                },
              },
            ],
          },
        ],
      },
      extensions: [
        {
          extensionId: 'game-2d-advanced',
        },
      ],
    },
  },
]

export const advancedRecipeExamples: ExtensionExample[] = recipes.map(({ assets, ...example }) => ({
  ...example,
  assets: assetsForRecipe(assets),
}))
