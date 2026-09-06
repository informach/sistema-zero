/**
 * Copy do Molda, 100% em português e centralizada. Sem travessão, sem jargão
 * ("etapa", "curso-base" são varridos pelos testes do kids). Texto de UI vive
 * AQUI (os componentes só referenciam), para revisão de tom num lugar só.
 */

import type { SkyPresetChoice } from '../sky/params'
import type { MoldaTemplateId } from '../templates/types'
import type { MoldaAssetKind, ShapeId } from './model'

export const COPY = {
  appName: 'Molda',
  gallery: {
    title: 'Minhas criações 3D',
    subtitle: 'Modelos, texturas e céus para os seus jogos 3D.',
    create: 'Criar novo',
    empty: 'Nada por aqui ainda. Toque em "Criar novo" para montar a sua primeira criação!',
    emptyCta: 'Começar minha primeira criação',
    loading: 'Abrindo a sua galeria...',
    loadError: 'Não consegui abrir a sua galeria. Tente de novo daqui a pouco.',
    retry: 'Tentar de novo',
    open: 'Abrir',
    creationGone: 'Essa criação não está mais aqui.',
    rename: 'Renomear',
    duplicate: 'Duplicar',
    remove: 'Apagar',
    removeConfirmTitle: 'Apagar esta criação?',
    removeConfirmBody: 'Ela vai sumir da galeria. Não dá para desfazer.',
    removeConfirm: 'Apagar',
    cancel: 'Cancelar',
    storageBudget:
      'Sua galeria chegou ao limite de 96 MB. Apague uma criação grande para continuar salvando.',
    downloadAll: 'Baixar tudo',
    downloadPreparing: 'Preparando o seu pacote... Os céus demoram um pouquinho.',
    downloadCancelled: 'Parei de preparar o pacote.',
    downloadReady: 'Baixei a sua galeria! Procure o .zip na pasta de downloads.',
    downloadFailed: 'Não consegui montar o pacote agora. Tente de novo daqui a pouco.',
    importJson: 'Trazer de volta',
    importHint: 'Escolha o .zip ou o .molda.json que você baixou antes.',
    imported: (count: number) =>
      count === 1 ? 'Trouxe 1 criação de volta!' : `Trouxe ${count} criações de volta!`,
    importedNone: 'Esse arquivo não tinha nenhuma criação que eu conseguisse ler.',
    importFailed:
      'Não consegui ler esse arquivo. Ele veio do "Baixar tudo" do Molda (.zip ou .molda.json)?',
    restoreTooLarge: 'Esse backup é grande demais. Escolha um arquivo de até 32 MB.',
    restoreZipMissing: 'Esse .zip não tem a galeria do Molda.',
    restoreZipDuplicate:
      'Esse .zip tem mais de uma galeria do Molda e não é seguro trazê-lo de volta.',
    /** O LEIA-ME.txt de dentro do "Baixar tudo". */
    readme: {
      intro: [
        'Suas criações 3D do Molda! 🧊',
        '',
        'Cada pasta tem um tipo de criação, pronta para o Estúdio ou para qualquer editor 3D:',
        '  modelos/   arquivos .glb  → no Jogo 3D, o bloco "Criar o objeto ... com o modelo"',
        '  texturas/  arquivos .png  → o bloco "Vestir ... com a imagem"',
        '  ceus/      arquivos .hdr  → o bloco "Usar o céu 360°"',
        '',
        'No Estúdio, o jeito mais fácil continua sendo o botão "Trazer do Molda" do painel de imagens.',
        'Para voltar com tudo para o Molda, use o botão "Trazer de volta" e escolha este .zip.',
        'O arquivo galeria.molda.json é o backup completo: não apague.',
      ],
      model: (name: string, file: string, parts: number, triangles: number) =>
        `• Modelo "${name}": modelos/${file}.glb (${parts === 1 ? '1 peça' : `${parts} peças`}, ${triangles} triângulos)`,
      texture: (name: string, file: string, size: number) =>
        `• Textura "${name}": texturas/${file}.png (${size} × ${size} pixels)`,
      sky: (name: string, file: string, width: number, height: number) =>
        `• Céu "${name}": ceus/${file}.hdr (360°, ${width} × ${height})`,
      skipped: (kindTitle: string, name: string) =>
        `• ${kindTitle} "${name}" ficou fora dos arquivos prontos (sem peças ou grande demais para o Estúdio), mas está no backup.`,
    },
    search: 'Buscar criação',
    searchPlaceholder: 'Buscar por nome ou tipo',
    searchClear: 'Limpar busca',
    searchClearAll: 'Limpar busca e filtros',
    searchEmpty: 'Nenhuma criação combina com essa busca.',
    syncing: 'Buscando na sua conta as criações que ainda não chegaram...',
    filterKind: 'Tipo',
    filterAll: 'Todos',
    filterAria: {
      all: 'Mostrar todos os tipos',
      model: 'Mostrar só modelos',
      texture: 'Mostrar só texturas',
      sky: 'Mostrar só céus',
    },
    resultCount: (count: number, total: number) =>
      count === total ? (count === 1 ? '1 criação' : `${count} criações`) : `${count} de ${total}`,
    openStudio: 'Abrir o Estúdio',
    studioHint: 'No Estúdio, procure "Trazer do Molda" no painel de imagens.',
    cardMenu: (name: string) => `Mais opções de ${name}`,
    updated: 'Mexido',
  },
  kinds: {
    model: {
      title: 'Modelo',
      plural: 'Modelos',
      description: 'Monte peças e pinte a pele direto no modelo.',
      emoji: '🧊',
      file: '.glb',
    },
    texture: {
      title: 'Textura',
      plural: 'Texturas',
      description: 'Uma folha de pixels para vestir cubos e bolas.',
      emoji: '🧱',
      file: '.png',
    },
    sky: {
      title: 'Céu',
      plural: 'Céus',
      description: 'Um céu 360° que ilumina a cena inteira.',
      emoji: '🌤️',
      file: '.hdr',
    },
  } satisfies Record<
    MoldaAssetKind,
    { title: string; plural: string; description: string; emoji: string; file: string }
  >,
  shapes: {
    box: 'Caixa',
    wedge: 'Rampa',
    cylinder: 'Cilindro',
    sphere: 'Bola',
    mesh: 'Malha',
  } satisfies Record<ShapeId, string>,
  skyPresets: {
    dia: 'Dia',
    entardecer: 'Entardecer',
    noite: 'Noite',
    nublado: 'Nublado',
    alienigena: 'Alienígena',
    custom: 'Do seu jeito',
  } satisfies Record<SkyPresetChoice, string>,
  newAsset: {
    title: 'Criar novo',
    stepKind: 'O que você quer criar?',
    stepOptions: 'Como vai ser?',
    stepName: 'Que nome vai ter?',
    progress: (current: number, total: number) => `Passo ${current} de ${total}`,
    texelsLabel: 'Texels por bloco',
    texelsHint: 'Quantos pontinhos de tinta cabem em cada bloco da grade. Dá para mudar depois.',
    texelsOptions: {
      2: 'Poucos',
      4: 'Normal',
      8: 'Muitos',
    } as Record<number, string>,
    sizeLabel: 'Tamanho da folha',
    sizeHint: 'Em pixels. 32 é um bom começo.',
    presetLabel: 'Comece com',
    presetHint: 'Você ajusta o sol, as cores e as nuvens depois.',
    nameLabel: 'Nome',
    namePlaceholder: 'ex: nave, casa, grama',
    nameHint: 'Só letras, números e hífen. É o nome que o Estúdio vai usar.',
    nameInvalid: 'Use só letras, números e hífen.',
    nameTaken: 'Já existe uma criação com esse nome.',
    back: 'Voltar',
    next: 'Continuar',
    create: 'Criar',
    cancel: 'Cancelar',
  },
  /** "Modelos prontos": o 4º cartão do Criar novo e a grade de escolha. */
  templates: {
    card: {
      emoji: '✨',
      title: 'Modelos prontos',
      description: 'Comece de um modelo pronto e mude do seu jeito.',
    },
    stepTitle: 'Escolha um modelo para começar',
    items: {
      personagem: {
        title: 'Personagem',
        description: 'Um boneco de blocos com o rosto já pintado.',
      },
      carro: { title: 'Carro', description: 'Rodas, vidros e faróis. Pinte do seu jeito.' },
      arvore: { title: 'Árvore', description: 'Tronco, copa de bolas e frutinhas.' },
      casa: { title: 'Casa', description: 'Paredes, telhado de duas águas, porta e janelas.' },
      nave: { title: 'Nave espacial', description: 'Asas, motores e uma cabine de vidro.' },
      cristal: {
        title: 'Cristais',
        description: 'Três cristais de malha numa pedra: pontas, arestas e faces para mexer.',
      },
    } satisfies Record<MoldaTemplateId, { title: string; description: string }>,
  },
  rename: {
    title: 'Renomear',
    label: 'Novo nome',
    save: 'Salvar',
    cancel: 'Cancelar',
    open: 'Feche a criação antes de renomear.',
  },
  editor: {
    back: 'Voltar',
    backToGallery: 'Voltar para a galeria',
    undo: 'Desfazer',
    redo: 'Refazer',
    saved: 'Salvo',
    saving: 'Salvando...',
    dirty: 'Mudanças por salvar',
    saveError: 'Não consegui salvar. Sua galeria pode ter chegado ao limite.',
    studioSyncFailed:
      'Salvei no Molda, mas não consegui atualizar no Estúdio. Tente salvar de novo.',
    download: 'Baixar',
    modelSummary: (parts: number) => (parts === 1 ? '1 peça' : `${parts} peças`),
    textureSummary: (size: number) => `${size} × ${size} pixels`,
    skyPresetLabel: 'Tipo de céu',
    /** A bancada do MODELO (Montar). */
    model: {
      mode: { build: 'Montar', paint: 'Pintar' },
      toolbox: 'Ferramentas',
      addGroup: 'Adicionar',
      add: {
        box: 'Caixa',
        wedge: 'Rampa',
        cylinder: 'Cilindro',
        sphere: 'Bola',
        mesh: 'Malha',
      } satisfies Record<ShapeId, string>,
      tools: { move: 'Mover', rotate: 'Girar', scale: 'Tamanho', snap: 'Grudar' },
      duplicate: 'Duplicar',
      remove: 'Apagar',
      mirror: 'Espelhar no X',
      snapHalf: 'Encaixe de meio bloco',
      parts: 'Peças',
      partsCount: (count: number, max: number) => `${count}/${max}`,
      partsEmpty: 'Nenhuma peça. Adicione uma caixa para começar.',
      twinTag: 'espelho',
      partsFull: 'Chegou ao limite de peças. Apague alguma para adicionar outra.',
      trianglesFull:
        'O modelo chegou ao limite de triângulos. Simplifique alguma malha antes de duplicar.',
      placeHint: 'Agora toque no chão ou numa peça para colocar a forma.',
      snap: {
        source: 'Toque no ponto da peça que vai grudar.',
        target: 'Agora toque no ponto de outra peça.',
        selectPart: 'Escolha uma peça antes de usar Grudar.',
        locked: 'Destranque todas as peças escolhidas antes de usar Grudar.',
        hidden: 'Mostre a peça principal antes de usar Grudar.',
        unavailable: 'Não encontrei um ponto para grudar nessa peça.',
        errors: {
          'invalid-source': 'A peça de origem mudou. Comece o Grudar de novo.',
          'locked-source': 'Uma das peças escolhidas está trancada. Destranque e tente de novo.',
          'invalid-target': 'Toque em um ponto de outra peça visível.',
          'stale-anchor': 'Uma das peças mudou. Comece o Grudar de novo.',
          'outside-grid': 'Esse encaixe levaria a peça para fora da grade.',
          'mirror-failure': 'Não há espaço para mover a peça e o espelho juntos.',
          'no-move': 'Esses pontos já estão juntos.',
        },
      },
      colors: 'Cores',
      addColor: 'Nova cor',
      addColorSelectPart: 'Toque numa peça primeiro para dar uma cor nova a ela.',
      paletteLabel: 'Paleta',
      colorsFull: 'A paleta já tem o máximo de cores extras.',
      properties: 'Propriedades',
      noSelection: 'Toque numa peça para ver as propriedades.',
      twinSelected: 'Esta peça é o espelho de outra: mexa na peça original.',
      name: 'Nome',
      shape: 'Forma',
      position: 'Posição',
      size: 'Tamanho',
      rotation: 'Giro',
      axis: { x: 'X', y: 'Y', z: 'Z' },
      dims: { w: 'Largura', h: 'Altura', d: 'Fundo' },
      views: {
        front: 'Frente',
        back: 'Trás',
        left: 'Esquerda',
        right: 'Direita',
        top: 'Cima',
        frame: 'Enquadrar',
      },
      grid: 'Grade',
      edges: 'Ver arestas',
      /** Trancar/esconder uma peça (lista de peças). */
      lock: 'Trancar',
      unlock: 'Destrancar',
      hide: 'Esconder',
      show: 'Mostrar',
      lockedTag: 'trancada',
      hiddenTag: 'escondida',
      lockedHint: 'Essa peça está trancada. Destranque na lista de peças para mexer nela.',
      /** O pivô (o ponto em volta do qual a peça gira). */
      pivot: 'Pivô',
      pivotCenter: 'Pivô no centro',
      /** Seleção múltipla de peças. */
      partsAdditive: 'Somar à seleção',
      selectedParts: (count: number) => `${count} peças escolhidas`,
      arrange: {
        title: 'Arrumar',
        floor: 'Pôr no chão',
        center: 'Centralizar no palco',
        align: 'Alinhar pelo centro',
        alignAxis: (axis: 'X' | 'Y' | 'Z') => `Alinhar no ${axis}`,
        alignSelection: 'Escolha pelo menos duas peças para alinhar.',
        repeat: 'Repetir em linha',
        direction: 'Direção',
        repeatDirection: (direction: string) => `Repetir em linha: ${direction}`,
        directions: {
          '+x': 'Para a direita',
          '-x': 'Para a esquerda',
          '+y': 'Para cima',
          '-y': 'Para baixo',
          '+z': 'Para a frente',
          '-z': 'Para trás',
        },
        count: 'Quantidade de cópias',
        gap: 'Espaço em encaixes',
        errors: {
          'invalid-selection': 'Escolha uma ou mais peças para arrumar.',
          'invalid-repeat': 'Escolha de 1 a 8 cópias e um espaço de 0 a 16.',
          locked: 'Destranque todas as peças escolhidas antes de arrumar.',
          'outside-grid': 'Esse arranjo levaria uma peça para fora da grade.',
          'parts-full': 'Não cabem todas essas cópias no limite de peças.',
          'triangles-full': 'Não cabem todas essas cópias no limite de triângulos.',
        },
      },
      help: {
        button: 'Ajuda desta tela',
        title: 'Ajuda desta tela',
        actions: 'Ações disponíveis',
        shortcut: 'Atalho',
        unavailable: (reason: string) => `Agora não: ${reason}`,
        contexts: {
          build: 'Montar',
          paint: 'Pintar',
          'mesh-vertex': 'Editar pontos',
          'mesh-edge': 'Editar arestas',
          'mesh-face': 'Editar faces',
          'face-paint': 'Pintar de perto',
        },
        gestures: {
          build:
            'Toque numa peça para escolher. Use Somar à seleção ou segure Shift para escolher várias; arraste as alças para transformar.',
          paint:
            'Escolha uma ferramenta e toque numa face. Pintar de perto amplia somente a face que você tocar.',
          'mesh-vertex':
            'Toque nos pontos. Use Somar à seleção ou segure Shift para manter os pontos já escolhidos.',
          'mesh-edge':
            'Toque nas arestas. Use Somar à seleção ou segure Shift para manter as arestas já escolhidas.',
          'mesh-face':
            'Toque nas faces. Use Somar à seleção ou segure Shift para manter as faces já escolhidas.',
          'face-paint': 'Pinte dentro da área da face ampliada; a área cinza fica protegida.',
        },
      },
      status: (parts: number, max: number, triangles: number) =>
        `${parts}/${max} peças · ${triangles} triângulos`,
      unsupported:
        'Não consegui abrir o 3D neste navegador. Tente no Chrome ou no Edge mais recentes.',
      panelsToggle: 'Peças e propriedades',
      thumbPending: 'Preparando a miniatura...',
      statusAtlas: (size: number) => `atlas ${size}×${size}`,
      statusTriangles: (triangles: number, max: number) => `${triangles}/${max} triângulos`,
      /** O sub-modo EDITAR MALHA (pontos, arestas e faces de uma peça de malha). */
      mesh: {
        edit: 'Editar malha',
        convert: 'Transformar em malha',
        open: 'Editar ou transformar em malha',
        converted: 'Virou malha: agora dá para mexer nos pontos, nas arestas e nas faces.',
        convertedLostSkins: (count: number) =>
          count === 1
            ? 'Virou malha. A pintura de 1 face não coube na forma nova e saiu.'
            : `Virou malha. A pintura de ${count} faces não coube na forma nova e saiu.`,
        toolbox: 'Editar malha',
        modes: { vertex: 'Pontos', edge: 'Arestas', face: 'Faces' },
        additive: 'Somar à seleção',
        deleteSelection: 'Apagar seleção',
        done: 'Pronto',
        hint: 'Toque num ponto, numa aresta ou numa face. Arraste a alça para mover.',
        counts: (vertices: number, faces: number, triangles: number) =>
          `${vertices} pontos · ${faces} faces · ${triangles} triângulos`,
        selected: (count: number, mode: 'vertex' | 'edge' | 'face') => {
          const noun =
            mode === 'vertex'
              ? count === 1
                ? 'ponto'
                : 'pontos'
              : mode === 'edge'
                ? count === 1
                  ? 'aresta'
                  : 'arestas'
                : count === 1
                  ? 'face'
                  : 'faces'
          return `${count} ${noun}`
        },
        nothingSelected: 'Nada escolhido.',
        emptied: 'A malha ficou sem faces: a peça foi apagada.',
        cannotMove: 'Não dá para mover para fora da grade.',
        tools: {
          extrude: 'Puxar',
          loopCut: 'Cortar no meio',
          merge: 'Juntar pontos',
          createFace: 'Fechar face',
          connect: 'Conectar pontos',
          inset: 'Encolher dentro',
          flip: 'Virar face',
          split: 'Dividir em triângulos',
        },
        toolHints: {
          extrude: 'Escolha faces (ou arestas) e toque em Puxar.',
          extrudeEdges: 'Escolha uma ou mais arestas para puxar.',
          extrudeFaces: 'Escolha uma ou mais faces para puxar.',
          loopCut: 'Escolha UMA aresta e toque em Cortar no meio.',
          merge: 'Escolha dois pontos ou mais para juntar.',
          createFace: 'Escolha 3 ou 4 pontos para fechar uma face.',
          connect: 'Escolha dois pontos opostos da mesma face de 4 pontos.',
          inset: 'Escolha uma face reta para encolher dentro.',
          flip: 'Escolha faces para virar.',
          split: 'Escolha faces de 4 pontos para dividir em triângulos.',
          loopCutQuad: 'Cortar no meio só atravessa faces de 4 pontos.',
          faceExists: 'Essa face já existe.',
        },
        cutOffGrid: 'O corte caiu fora do encaixe: os pontos novos não estão na grade.',
        toolsLegend: 'Ferramentas de malha',
        modeHints: {
          vertex: 'Escolha pontos para juntar, fechar ou conectar.',
          edge: 'Escolha arestas para puxar ou cortar.',
          face: 'Escolha faces para puxar, encolher, virar ou dividir.',
        },
        selectAll: 'Escolher todos os pontos',
        adjust: 'Ajustar',
        distance: 'Distância',
        insetAmount: 'Quanto encolher, em porcentagem',
        tooMany: 'A malha ficou grande demais: apague alguma coisa antes.',
        snapHalfOn: 'O corte caiu no meio de um bloco: liguei o encaixe de meio bloco.',
        issues: {
          overlap: 'Dois pontos ficaram no mesmo lugar.',
          'non-planar': 'Uma face ficou torta.',
          concave: 'Uma face ficou com um buraco para dentro.',
          flipped: 'Uma face ficou virada para dentro.',
        },
        fixes: {
          merge: 'Juntar',
          split: 'Dividir',
          flip: 'Virar',
          undo: 'Desfazer',
          keep: 'Deixar',
          stale: 'O modelo mudou depois do aviso. Nada foi mexido.',
        },
      },
      /** O modo PINTAR. */
      paint: {
        tools: {
          pencil: 'Lápis',
          eraser: 'Borracha',
          fillFace: 'Balde na face',
          fillPart: 'Balde na peça',
          picker: 'Conta-gotas',
          rotateSkin: 'Girar a pele',
          faceEditor: 'Pintar de perto',
        },
        faceEditor: {
          title: 'Pintar de perto',
          hint: 'Toque na face que você quer ampliar.',
          stage: 'Face ampliada para pintar',
          outside: 'A área cinza fica fora da face e não recebe tinta.',
          done: 'Pronto',
          stale: 'Essa face mudou ou foi apagada. Escolha outra para pintar.',
        },
        mirror: 'Espelho de pintura',
        sizeLabel: 'Tamanho do lápis',
        sizes: { 1: 'Fino', 2: 'Médio', 3: 'Grosso' } as Record<number, string>,
        texelsLabel: 'Texels por bloco',
        texelsHint: 'Trocar re-desenha as peles no tamanho novo.',
        atlasFull:
          'Modelo grande demais para pintar tudo. Diminua os texels por bloco ou tire peças.',
        activeColor: 'Cor do lápis',
        removeColor: 'Apagar esta cor',
        removeColorBase:
          'As 16 cores da paleta são fixas. Só as cores que você adicionou podem ser apagadas.',
        removedColor: 'Cor apagada.',
        /** "Vestir a peça com uma textura" da galeria. */
        apply: {
          button: 'Vestir com textura',
          title: 'Vestir a peça com uma textura',
          pick: 'Suas texturas',
          empty: 'Você ainda não tem texturas. Crie uma na galeria e volte aqui.',
          modeLabel: 'Como vestir',
          modeTile: 'Repetir',
          modeStretch: 'Esticar',
          apply: 'Vestir',
          applied: 'Peça vestida!',
          selectPart: 'Toque numa peça primeiro.',
        },
      },
      download: {
        glb: 'Baixar .glb',
        ready: 'Baixei o modelo! Procure na pasta de downloads.',
        tooBig:
          'O modelo ficou grande demais para o Estúdio. Diminua os texels por bloco ou tire peças.',
        empty: 'Adicione uma peça antes de baixar.',
        failed: 'Não consegui preparar o arquivo agora.',
      },
    },
    /** O editor da TEXTURA. */
    texture: {
      stage: 'Folha de pixels',
      tiled: 'Repetida 3×3',
      preview3d: 'Prévia 3D',
      tools: { pencil: 'Lápis', eraser: 'Borracha', fill: 'Balde', picker: 'Conta-gotas' },
      seamless: 'Sem emenda',
      shiftHalf: 'Deslocar meio',
      transparentHint: 'A borracha deixa o pixel transparente. No jogo, transparente vira preto.',
      unsupported: 'Sem prévia 3D neste navegador.',
      download: {
        png: 'Baixar .png',
        ready: 'Baixei a textura! Procure na pasta de downloads.',
        tooBig: 'A textura ficou grande demais para o Estúdio.',
        failed: 'Não consegui preparar o arquivo agora.',
      },
    },
    /** O editor do CÉU. */
    sky: {
      preview: 'Prévia do céu',
      controls: 'Controles do céu',
      presetsPanel: 'Céu de partida',
      sun: 'Sol',
      elevation: 'Altura do sol',
      azimuth: 'Direção do sol',
      size: 'Tamanho do sol',
      intensity: 'Brilho do sol',
      colors: 'Cores',
      top: 'Topo',
      horizon: 'Horizonte',
      ground: 'Chão',
      clouds: 'Nuvens',
      amount: 'Quantidade',
      softness: 'Suavidade',
      shuffle: 'Sortear nuvens',
      stars: 'Estrelas',
      exposure: 'Exposição',
      degrees: (value: number) => `${value}°`,
      percent: (value: number) => `${Math.round(value * 100)}%`,
      unsupported:
        'Não consegui abrir a prévia 3D neste navegador. O céu continua sendo salvo e baixado normalmente.',
      download: {
        hdr: 'Baixar .hdr',
        preparing: 'Preparando o céu...',
        ready: 'Baixei o céu! Procure na pasta de downloads.',
        tooBig: 'O céu ficou grande demais para o Estúdio.',
        failed: 'Não consegui preparar o arquivo agora.',
      },
    },
    comingSoon: {
      model: 'A bancada de montar e pintar chega no próximo passo do Molda.',
      texture: 'A folha de pintar chega no próximo passo do Molda.',
      sky: 'Os controles do sol, das cores e das nuvens chegam no próximo passo do Molda.',
    } satisfies Record<MoldaAssetKind, string>,
    notFound: 'Essa criação não está mais aqui. Escolha outra na sua galeria.',
  },
  toast: {
    created: (name: string) => `"${name}" criado!`,
    renamed: 'Renomeado!',
    duplicated: 'Duplicado!',
    removed: 'Apagado.',
    saveFailed: 'Não consegui salvar a criação.',
  },
  a11y: {
    galleryGrid: 'Suas criações',
    assetCard: (name: string, kind: string) => `${kind} ${name}`,
    closeDialog: 'Fechar',
    kindFilter: 'Filtrar por tipo',
    newAssetKind: (kind: string) => `Criar ${kind.toLowerCase()}`,
    openTemplates: 'Escolher um modelo pronto',
    templateCard: (title: string) => `Modelo pronto ${title}`,
    skyThumb: (preset: string) => `Céu ${preset.toLowerCase()}`,
    textureThumb: 'Prévia da textura',
    modelThumb: 'Prévia do modelo',
    editorStatus: 'Estado do salvamento',
    viewport: 'Palco 3D',
    partItem: (name: string, shape: string) => `${name}, ${shape.toLowerCase()}`,
    /** Rótulo FIXO (o estado vai no `aria-pressed`, senão o leitor lê "Destrancar, pressionado"). */
    partLock: (name: string) => `Trancar ${name}`,
    partHide: (name: string) => `Esconder ${name}`,
    colorSwatch: (index: number, hex: string) => `Cor ${index} ${hex}`,
    decrease: (label: string) => `Diminuir ${label.toLowerCase()}`,
    increase: (label: string) => `Aumentar ${label.toLowerCase()}`,
    paletteSelect: 'Escolher a paleta',
  },
} as const

export type MoldaCopy = typeof COPY
