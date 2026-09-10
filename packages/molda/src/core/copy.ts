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
  scene: {
    title: 'Minha oficina 3D',
    skinWeights: {
      title: 'Força dos ossos nestes pontos',
      choosePoints: 'Escolha pontos, linhas ou faces da peça para ajustar seus pesos.',
      mixed:
        'Estes pontos usam misturas diferentes. Escolha uma nova mistura somente se quiser usá-la em todos os pontos selecionados.',
      same: 'Estes pontos usam a mesma mistura. Cada força diz quanto o ponto acompanha aquele osso.',
      displayHint:
        'Os números aparecem arredondados para facilitar a leitura. Abrir ou confirmar sem editar não arredonda os pesos guardados.',
      chooseJoints: 'Ossos desta mistura',
      limit: 'Escolha até quatro ossos. Desmarcar um remove sua força desta mistura.',
      percent: (name: string) => `Força de ${name} (%)`,
      normalize: 'Ajustar o total para 100%',
      equal: 'Dividir a força por igual',
      review: 'Revisar mistura',
      reviewing: 'Confira antes de aplicar',
      impact: (count: number) =>
        `Esta mistura será usada em ${count.toLocaleString('pt-BR')} ${count === 1 ? 'ponto' : 'pontos'}. Os outros pontos não mudam.`,
      acceptMixed: 'Quero usar a mesma mistura em todos estes pontos.',
      apply: 'Aplicar mistura',
      cancel: 'Cancelar revisão',
      reset: 'Voltar aos pesos guardados',
      undo: 'A mudança pode ser desfeita de uma vez na oficina.',
      invalid: 'Preencha uma força entre 0 e 100 para cada osso.',
      total: 'As forças precisam somar 100%. Edite os valores ou escolha ajustar o total.',
      precision:
        'Uma força é pequena demais para o desenho. Ajuste o valor ou remova esse osso da mistura.',
      changed: 'Os pontos ou a criação mudaram. Escolha novamente antes de ajustar os pesos.',
      interrupted:
        'O rascunho foi descartado ao interromper a edição. Os pesos guardados não mudaram.',
      failed: 'Não foi possível aplicar os pesos. Confira a seleção e tente novamente.',
    },
    weightMap: {
      title: 'Ver força de um osso',
      off: 'Não mostrar forças',
      zero: '0%: não acompanha',
      full: '100%: acompanha por inteiro',
      hint: 'As cores dos pontos mostram os pesos guardados deste osso. O rascunho só muda o desenho depois de aplicar. O contorno azul continua marcando sua seleção.',
      exact:
        'Para ler ou ajustar os valores, escolha os pontos e abra Força dos ossos nestes pontos.',
    },
    skinPaint: {
      title: 'Pincel de forças',
      off: 'Só observar',
      add: 'Dar força',
      subtract: 'Tirar força',
      radius: 'Alcance (blocos)',
      strength: 'Intensidade (%)',
      radiusInvalid: 'Use um alcance maior que zero.',
      hint: 'Arraste sobre a peça. Soltar aplica um traço; Escape cancela. Desfazer retira o traço inteiro.',
      previewHint:
        'Durante o traço, as cores mostram uma prévia. Os pesos só são guardados ao soltar. A pintura não muda as cores da sua criação.',
      reachHint:
        'O círculo é uma referência do alcance em blocos. A força segue as faces ligadas, mesmo nas dobras; as cores mostram os pontos afetados. Repassar no mesmo traço não acumula força.',
      through: 'Ver pontos atrás da peça',
      cancelled: 'Traço cancelado. Os pesos guardados não mudaram.',
      applied: (count: number) =>
        count
          ? `Forças ajustadas em ${count.toLocaleString('pt-BR')} ${count === 1 ? 'ponto' : 'pontos'}. Você pode desfazer.`
          : 'Este traço não mudou os pesos.',
      painting: (count: number) =>
        `Prévia: ${count.toLocaleString('pt-BR')} ${count === 1 ? 'ponto mudou' : 'pontos mudaram'}.`,
      refusals: {
        'influence-limit': (count: number) =>
          `${count.toLocaleString('pt-BR')} pontos já usam quatro ossos. Ajuste a mistura pelos números para trocar um osso.`,
        'no-recipient': (count: number) =>
          `${count.toLocaleString('pt-BR')} pontos precisam de outro osso com força para dividir a mistura.`,
        precision: (count: number) =>
          `${count.toLocaleString('pt-BR')} pontos foram preservados para não perder uma força muito pequena. Ajuste a mistura pelos números.`,
      },
    },
    skinBinding: {
      addJoint: 'Adicionar osso ao vínculo',
      removeJoint: 'Retirar osso do vínculo',
      chooseNewJoint: 'Apoio para adicionar',
      chooseNewJointPlaceholder: 'Escolha um apoio',
      noNewJoints: 'Todos os apoios da criação já estão neste vínculo.',
      addJointHint:
        'A posição atual deste apoio será sua posição inicial no vínculo. Os pesos e ossos antigos não mudam. Depois, ajuste os pesos dos pontos para o novo osso começar a movê-los.',
      removeJointHint:
        'O osso sai só deste vínculo. Seu apoio, filhos e animações continuam na criação. Forças iguais a zero deste osso serão retiradas; os outros pesos não mudam.',
      jointInUse: (count: number) =>
        `Este osso move ${count.toLocaleString('pt-BR')} ${count === 1 ? 'ponto' : 'pontos'}. Ajuste seus pesos antes de retirá-lo.`,
      jointUnused: 'Não move nenhum ponto desta peça.',
      removeJointNamed: (name: string) => `Retirar ${name} do vínculo`,
      confirmAddJoint: 'Confirmar novo osso',
      confirmRemoveJoint: 'Confirmar retirada do osso',
      open: 'Ossos desta peça',
      title: 'Fazer a peça acompanhar os ossos',
      bindingName: 'Vínculo da peça',
      intro:
        'Um osso puxa os pontos da peça. Use os grupos e pontos de apoio da sua criação para escolher onde ela vai dobrar.',
      choose: '1. Escolha os ossos',
      jointLimit: (maximum: number) =>
        `Você chegou ao limite de ${maximum} ossos. Desmarque um para escolher outro.`,
      chooseHint:
        'Só os itens marcados participam. Para dobrar entre dois apoios, organize um dentro do outro na lista da oficina.',
      noJoints:
        'Ainda não há grupos ou pontos de apoio. Volte à oficina e crie os apoios antes de vincular a peça.',
      method: '2. Como a peça acompanha',
      methods: {
        segments: 'Dobrar entre apoios',
        rigid: 'Seguir um apoio por ponto',
      },
      methodHints: {
        segments:
          'Divide a força entre as pontas do segmento mais próximo. É um começo geométrico, que pode precisar de ajustes.',
        rigid:
          'Cada ponto segue somente o apoio mais próximo. Bom para movimentos sem mistura de forças.',
      },
      group: 'Grupo',
      locator: 'Ponto de apoio',
      prepare: 'Sugerir pesos',
      busy: 'Calculando como os pontos acompanham os ossos…',
      large:
        'Esta peça tem muitos pontos. Preparar e receber a sugestão pode pausar a interface por um momento.',
      review: '3. Confira a sugestão',
      summary: (vertices: number, joints: number, influences: number) =>
        `${vertices.toLocaleString('pt-BR')} pontos · ${joints} ossos · até ${influences} ${influences === 1 ? 'osso' : 'ossos'} por ponto`,
      noSegments:
        'Os apoios escolhidos não formam segmentos com comprimento. Nesta sugestão, cada ponto segue o apoio mais próximo.',
      confirmHint:
        'A posição atual dos apoios será o começo do movimento. Nada muda até confirmar. Depois, mova os apoios na oficina para experimentar a dobra.',
      apply: 'Usar esses pesos',
      linked: 'Esta peça já acompanha seus ossos.',
      linkedHint:
        'Mover os apoios muda a dobra. Editar forma-base muda o desenho da peça sem apagar seus pesos.',
      joints: 'Ossos do vínculo',
      rebind: 'Redefinir posição inicial',
      rebindHint:
        'A peça volta a mostrar sua forma-base na posição atual dos apoios. Os pesos e movimentos ficam guardados, mas a forma como a peça acompanha esses movimentos pode mudar.',
      confirmRebind: 'Usar esta posição inicial',
      remove: 'Desvincular a peça',
      removeHint:
        'A peça volta à forma-base. Os pesos deste vínculo serão removidos. Os apoios, a pintura e os movimentos continuam na criação.',
      confirmRemove: 'Confirmar desvinculação',
      undoHint: 'Você pode desfazer esta mudança na oficina.',
      cancel: 'Cancelar revisão',
      cancelWork: 'Cancelar cálculo',
      close: 'Voltar à oficina',
      cancelled: 'Cancelado. A peça continua como estava.',
      changed: 'A criação mudou. Confira a peça novamente antes de confirmar.',
      interrupted:
        'A revisão foi interrompida ao sair desta janela. Prepare de novo quando quiser.',
      failed:
        'Não foi possível preparar o vínculo. Tente de novo. Seu projeto continua como estava.',
      locked: 'Destrave a peça ou o grupo que a contém para mudar seu vínculo.',
      exportHint:
        'O GLB pode levar os ossos e os pesos. Confira as mudanças na exportação antes de baixar a cópia. Seu projeto original não muda.',
    },
    glbExport: {
      open: 'Exportar GLB',
      pendingPose:
        'Antes de exportar, escolha Gravar pose ajustada ou Cancelar pose. Sua prévia continua no modelo.',
      title: 'Levar minha criação',
      intro:
        'O GLB é uma cópia 3D com as peças, a pintura e os movimentos. Vamos conferir o que muda nessa cópia antes de baixar.',
      original:
        'Seu projeto no Molda não muda. Para guardar tudo e continuar editando depois, use também Baixar projeto na oficina.',
      prepare: 'Preparar GLB',
      validating: 'Conferindo a criação…',
      encoding: 'Preparando peças, pintura e movimentos…',
      ready: 'Sua cópia está pronta para conferir.',
      noChanges: 'Nenhuma conversão com aviso foi necessária.',
      clipsTitle: 'Movimentos nesta cópia',
      clipsHint:
        'Estes são os nomes para usar nos blocos de animação do Jogo 3D Avançado. No jogo, o bloco escolhe se o movimento repete ou toca uma vez.',
      clipSummary: (duration: number, fps: number, loop: boolean) =>
        `${duration.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} s · ${fps} quadros por segundo · no Molda: ${loop ? 'repetir' : 'uma vez'}`,
      changes: 'O que muda nesta cópia',
      accept: 'Li as mudanças e quero baixar esta cópia.',
      download: 'Baixar GLB',
      downloaded: 'Download iniciado. Seu projeto continua aqui.',
      cancel: 'Cancelar preparação',
      close: 'Voltar à oficina',
      cancelled: 'Preparação cancelada. Você pode tentar de novo.',
      changed: 'A criação mudou. Prepare uma nova cópia para levar a versão atual.',
      interrupted:
        'A preparação foi interrompida ao sair desta janela. Prepare de novo quando quiser.',
      failed: 'Não foi possível preparar a cópia. Tente de novo ou guarde o projeto original.',
      downloadFailed: 'Não foi possível iniciar o download. Tente novamente.',
      summary: (parts: number, clips: number, bytes: number) =>
        `${parts} ${parts === 1 ? 'peça' : 'peças'} · ${clips} ${clips === 1 ? 'movimento' : 'movimentos'} · ${(bytes / (bytes < 1_048_576 ? 1024 : 1_048_576)).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${bytes < 1_048_576 ? 'KB' : 'MB'}`,
      studio: {
        title: 'Conferir para o Estúdio',
        needsChanges: 'Estúdio: esta cópia precisa de ajustes',
        fits: 'Uma cópia cabe nos limites de modelos do Estúdio.',
        empty: 'Esta cópia não tem peças visíveis para usar no jogo.',
        tooComplex:
          'Esta cópia ultrapassa os limites de modelos do Estúdio. Você ainda pode baixar o GLB para outros programas.',
        animated:
          'Para tocar os movimentos, use o Jogo 3D Avançado e seus blocos de animação. No Jogo 3D básico, o modelo fica parado.',
        static: 'Esta cópia não contém movimentos.',
        skinned:
          'Para usar peças com ossos, escolha o Jogo 3D Avançado, mesmo se a cópia não tiver movimentos.',
        scope:
          'Isso confere os limites de uma cópia, não a velocidade do jogo inteiro. Outras cópias, modelos e efeitos também têm custo.',
        manual:
          'Baixar o GLB não envia nada ao Estúdio. Esta oficina ainda não está ligada ao botão Trazer do Molda.',
        limits: {
          bytes: (actual: number, maximum: number) =>
            `Arquivo: ${(actual / 1_048_576).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} MB; limite aproximado de ${(maximum / 1_048_576).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} MB. Reduza a resolução da pintura ou a quantidade de chaves de movimento numa cópia do projeto.`,
          meshes: (actual: number, maximum: number) =>
            `O arquivo vira ${actual} malhas no jogo; o limite é ${maximum}. Peças, espelhos e materiais diferentes podem virar malhas separadas.`,
          bones: (actual: number, maximum: number) =>
            `A cópia usa ${actual} ossos; o limite é ${maximum}. Os espelhos também precisam de ossos. Reduza os espelhos ou a quantidade de ossos numa cópia do projeto.`,
          triangles: (actual: number, maximum: number) =>
            `Detalhes das formas: ${actual} triângulos; o limite é ${maximum}.`,
          materials: (actual: number, maximum: number) =>
            `Acabamentos: ${actual} materiais; o limite é ${maximum}. Reutilize acabamentos iguais.`,
          drawCalls: (actual: number, maximum: number) =>
            `O jogo precisa desenhar ${actual} grupos separados; o limite por modelo é ${maximum}.`,
        },
      },
      issues: {
        'hidden-node': (count: number) =>
          `${count} ${count === 1 ? 'item escondido fica' : 'itens escondidos ficam'} fora da cópia.`,
        'skin-dependency': (count: number) =>
          `${count} ${count === 1 ? 'item escondido continua' : 'itens escondidos continuam'} como apoio dos ossos. Suas formas não aparecem na cópia.`,
        'skin-precision': (count: number) =>
          `Os números de ${count} ${count === 1 ? 'vínculo são arredondados' : 'vínculos são arredondados'} para a precisão do GLB. O movimento pode ter pequenas diferenças. Os pesos e as poses do original não mudam.`,
        'skin-zero-slots': (count: number) =>
          `Em ${count} ${count === 1 ? 'vínculo' : 'vínculos'}, referências a ossos com força de 0% são simplificadas na cópia. Nenhuma força positiva é retirada.`,
        'skin-render-space': (count: number) =>
          `${count} ${count === 1 ? 'peça articulada leva' : 'peças articuladas levam'} apoios para conservar espelhos e iluminação no Estúdio. Outros programas podem desenhar o brilho e os lados dessas peças de forma diferente.`,
        'bend-limit-omitted': (count: number) =>
          `${count} ${count === 1 ? 'apoio perde' : 'apoios perdem'} a regra editável de limite de dobra na cópia. As poses já gravadas continuam; a regra fica guardada no projeto Molda.`,
        'face-omitted': (count: number) =>
          `${count} ${count === 1 ? 'face não pode ser desenhada e fica' : 'faces não podem ser desenhadas e ficam'} fora da cópia.`,
        'loose-geometry': (count: number) =>
          `${count} ${count === 1 ? 'forma tem' : 'formas têm'} linhas ou pontos soltos que não aparecem no GLB.`,
        'flipbook-first-frame': (count: number) =>
          `${count} ${count === 1 ? 'pintura animada fica parada' : 'pinturas animadas ficam paradas'} no primeiro quadro.`,
        'runtime-tangent-space': (count: number) =>
          `O relevo de ${count} ${count === 1 ? 'material pode' : 'materiais pode'} parecer diferente, dependendo do programa que abrir a cópia.`,
        'animation-resampled': (count: number) =>
          `${count} ${count === 1 ? 'trajeto de movimento é aproximado' : 'trajetos de movimento são aproximados'} por mais poses. Curvas e mudanças instantâneas podem ter pequenas diferenças.`,
        'clip-omitted': (count: number) =>
          `${count} ${count === 1 ? 'movimento vazio ou só com itens escondidos fica' : 'movimentos vazios ou só com itens escondidos ficam'} fora da cópia.`,
        'clip-renamed': (count: number) =>
          `${count} ${count === 1 ? 'movimento com nome repetido ganha' : 'movimentos com nomes repetidos ganham'} um número no nome desta cópia. Confira a lista de movimentos. Os nomes no projeto original não mudam.`,
      },
    },
    modelMode: 'Modelar',
    animationMode: 'Animar',
    animationModes: 'O que você quer fazer?',
    animationTitle: 'Movimentos da criação',
    animationEmpty:
      'Crie um movimento. Depois, escolha uma peça e guarde poses em momentos diferentes.',
    animationName: 'Nome do movimento',
    animationNewName: 'Meu movimento',
    animationCreate: 'Criar movimento',
    animationChoose: 'Movimento escolhido',
    animationDuplicate: 'Copiar movimento',
    animationDelete: 'Excluir movimento',
    animationRename: 'Renomear movimento',
    animationCopyName: (name: string) => `${name.slice(0, 40)} (cópia)`,
    animationTimeline: 'Linha do tempo',
    animationStrip: (channel: string, count: number) => `${channel}: ${count} momentos com chaves`,
    animationStripHint:
      'Toque numa faixa para ir à chave mais próxima. No teclado, use as setas; Home e End vão à primeira e à última chave.',
    animationKeyTools: 'Ajustar várias chaves',
    animationKeyToolsHint:
      'Escolha um intervalo nas peças selecionadas. Mover ou copiar nunca apaga uma chave que já está no destino.',
    animationRangeStart: 'Do tempo (segundos)',
    animationRangeEnd: 'Até o tempo (segundos)',
    animationRangeChannel: 'Tipos de chave',
    animationAllChannels: 'Todos os tipos',
    animationOffset: 'Deslocar quantos segundos?',
    animationOffsetHint:
      'Um valor positivo leva as chaves para depois. Um valor negativo leva para antes.',
    animationRangeCount: (count: number) =>
      `${count} ${count === 1 ? 'chave escolhida' : 'chaves escolhidas'}`,
    animationRangeInvalid: 'Confira o começo e o final do intervalo.',
    animationKeysMove: 'Mover chaves',
    animationKeysCopy: 'Copiar chaves',
    animationKeysRemove: 'Excluir chaves escolhidas',
    animationPlay: 'Reproduzir movimento',
    animationPause: 'Pausar movimento',
    animationStart: 'Ir ao começo',
    animationEnd: 'Ir ao final',
    animationPrevious: 'Chave anterior',
    animationNext: 'Próxima chave',
    animationTime: 'Tempo do movimento',
    animationSeconds: 'Ir para o tempo (segundos)',
    animationSeek: 'Ir para esse momento',
    animationTimeValue: (time: number, duration: number) =>
      `${time.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} de ${duration.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} segundos`,
    animationViewportHint:
      'Pause, escolha uma peça e use Mover, Girar ou Mudar tamanho para experimentar uma pose.',
    animationHint:
      'A forma original fica guardada. Grave chaves ou poses para guardar o movimento neste momento.',
    animationPoseFailed: 'Não foi possível ajustar essa pose. Tente novamente ou use os campos.',
    animationPoseAdjust: 'Ajuste da pose',
    animationPoseRecord: 'Gravar pose ajustada',
    animationPoseCancel: 'Cancelar ajuste da pose',
    animationPoseAutoKey: 'Gravar ao soltar as alças',
    animationPoseAutoKeyHint: 'Opcional: cada arrasto guarda uma pose e pode ser desfeito.',
    animationPosePending:
      'Pose em prévia. Grave ou cancele antes de mudar o tempo, a peça ou o movimento. Esc cancela.',
    animationPoseFieldsHint: 'Grave ou cancele a pose em prévia para voltar aos campos.',
    bendLimit: {
      title: 'Até onde pode dobrar?',
      hint: '0° é esticado. 90° faz uma quina. 180° dobra de volta sobre si.',
      min: 'Menor dobra (graus)',
      max: 'Maior dobra (graus)',
      saved: (min: number, max: number) => `Faixa guardada: ${min}° a ${max}°.`,
      unlimited: 'Sem faixa escolhida: a assistência pode usar de 0° a 180°.',
      scope:
        'Vale para Dobrar pela ponta neste apoio. Não muda poses já gravadas nem limita as alças de giro.',
      save: 'Guardar faixa de dobra',
      remove: 'Retirar faixa de dobra',
      cancel: 'Manter faixa guardada',
      dirty: 'Guarde ou descarte estas mudanças antes de experimentar outra pose.',
    },
    twoBone: {
      title: 'Dobrar pela ponta',
      drag: 'Escolha Mover e arraste as setas no destino. Soltar mantém a prévia; Gravar pose ajustada guarda o resultado.',
      pick: 'Escolha uma ponta com dois apoios acima dela: um para a dobra e outro para o começo.',
      hint: 'Leve a ponta para outro lugar. O começo fica parado e os dois apoios giram para formar a dobra.',
      chain: 'Apoios desta articulação',
      roles: ['Começo', 'Dobra', 'Ponta'],
      target: 'Destino da ponta',
      step: 'Passo em blocos',
      nudge: (axis: number, direction: -1 | 1) =>
        `${direction < 0 ? 'Diminuir' : 'Aumentar'} ${['lado X', 'altura Y', 'profundidade Z'][axis]} da ponta`,
      axis: (label: string, axis: number) => `${label} ${['X', 'Y', 'Z'][axis]}`,
      world: 'Os passos seguem os eixos da oficina, mesmo quando você gira a câmera.',
      guide:
        'As linhas ligam os três apoios. O quadrado maior é o destino; quando fica separado da ponta, mostra o que falta alcançar.',
      exact: 'Escolher um destino exato',
      useHint: 'Indicar para onde dobrar',
      bend: 'Indicação da dobra',
      bendHint:
        'A indicação orienta a dobra, mas não prende o apoio nesse ponto. Sem ela, usamos a pose atual ou um lado estável.',
      preview: 'Experimentar dobra',
      record:
        'Confira no modelo e use Gravar pose ajustada para guardar. Você pode cancelar ou desfazer depois.',
      precision: 'Esse passo é pequeno demais para a posição atual. Experimente outro valor.',
      reach: {
        'bend-limit':
          'O limite de dobra escolhido impede chegar ao destino. A prévia respeita essa faixa.',
        reached: 'A ponta chegou ao destino.',
        'too-far': 'O destino está longe demais. A prévia mostra até onde a ponta alcança.',
        'too-close':
          'O destino está perto demais para esses comprimentos. A prévia mostra a dobra possível.',
      },
      bends: {
        hint: 'Usamos sua indicação para orientar a dobra.',
        pose: 'Usamos o lado da pose original.',
        axis: 'Como os apoios estavam alinhados, escolhemos um lado estável para dobrar.',
      },
    },
    animationChanged: 'A criação mudou. Confira a pose e tente gravar novamente.',
    animationScaleHint: '1 mantém o tamanho. 2 dobra. Valores negativos viram a peça.',
    animationRotationHint: 'Para uma volta completa, guarde também poses no meio do movimento.',
    animationPauseHint: 'Pause para ajustar uma chave. Esc também pausa o movimento.',
    animationPickHint: 'Escolha uma única peça ou grupo para guardar seu movimento.',
    animationLocked:
      'Essa peça ou uma peça dentro do grupo está travada. Volte a Modelar para destravar.',
    animationLocalHint: 'Este movimento importado usa posições locais absolutas.',
    animationAffineHint:
      'Essa peça precisa de uma transformação local compatível para entrar neste movimento importado.',
    animationChannel: 'O que muda nesta chave?',
    animationChannels: { translation: 'Mover', rotation: 'Girar', scale: 'Mudar tamanho' },
    animationAxes: {
      translation: ['Lado (X)', 'Altura (Y)', 'Profundidade (Z)'],
      rotation: ['Giro X (graus)', 'Giro Y (graus)', 'Giro Z (graus)'],
      scale: ['Tamanho X', 'Tamanho Y', 'Tamanho Z'],
    },
    animationCurve: 'Como chegar à próxima chave?',
    animationCurves: {
      step: 'De uma vez',
      linear: 'Em ritmo constante',
      smooth: 'Começar e terminar devagar',
    },
    animationRecord: 'Gravar chave',
    animationRemoveKey: 'Excluir chave deste momento',
    animationKeyPresent: 'Já existe uma chave deste tipo aqui. Gravar substitui essa chave.',
    animationKeyNew: 'Gravar cria uma chave deste tipo no momento escolhido.',
    animationSettings: 'Ajustar o movimento',
    animationDuration: 'Duração em segundos',
    animationFps: 'Quadros por segundo da grade',
    animationLoop: 'Repetir o movimento',
    animationRetime: 'Ajustar os tempos das chaves junto com a duração',
    animationApply: 'Aplicar ajustes',
    animationReverse: 'Inverter a ordem das poses',
    animationReverseHint:
      'Troca começo e final. Nos saltos “De uma vez”, a pose continua parada até a próxima chave.',
    animationPoseTitle: 'Reutilizar uma pose',
    poseSet: {
      title: 'Reutilizar várias poses juntas',
      copy: 'Copiar poses da seleção',
      hint: 'Escolha todos os apoios ou peças que quer copiar, inclusive as dobras. Cada item escolhido guarda sua própria pose neste momento.',
      empty: 'Ainda não há um conjunto copiado.',
      count: (count: number) => `${count} poses copiadas.`,
      mapping:
        'Escolha uma linha para mudar seu destino. Começamos nos mesmos apoios; escolha outros para levar a pose a outro lado.',
      label: (name: string, id: string, duplicate = false) =>
        duplicate ? `${name} (${id})` : name,
      pair: (source: string, target: string) => `${source} → ${target}`,
      target: (name: string) => `Destino da pose de ${name}`,
      missing: 'Escolha um destino',
      duplicate: 'Duas poses estão no mesmo destino. Escolha um destino diferente para cada uma.',
      chooseAll: 'Escolha um destino existente para cada pose antes de ver a prévia.',
      axis: 'Como levar estas poses?',
      unchanged: 'Sem espelho',
      mirror: (axis: string) => `Espelhar no eixo local ${axis}`,
      preview: 'Ver conjunto no modelo',
      review:
        'Confira o conjunto no modelo. Gravar pose ajustada guarda todas as poses com um só desfazer. Cancelar pose retira a prévia.',
      same: 'Estas poses já estão gravadas neste momento. Você pode cancelar a prévia ou escolher outros destinos.',
    },
    animationPoseCopy: 'Copiar pose desta peça',
    animationPosePaste: 'Colar pose nas peças escolhidas',
    animationPoseMirror: 'Colar pose espelhada',
    animationPoseCopied: (name: string) => `Pose copiada de ${name}.`,
    animationPoseClipboardEmpty: 'Escolha uma peça e copie sua pose neste momento.',
    animationPosePasteHint:
      'Colar grava posição, giro e tamanho no momento atual. Substitui as três chaves que já existirem aqui. Grupos escolhidos levam suas peças junto.',
    animationPoseMirrorHint:
      'O espelho usa os eixos locais de cada peça, não os lados do personagem inteiro. A pose copiada fica guardada sem mudar.',
    animationPoseAxis: 'Eixo local do espelho',
    animationPoseAxes: { x: 'Lado (X)', y: 'Altura (Y)', z: 'Profundidade (Z)' },
    animationPoseIncompatible:
      'A pose copiada usa outro tipo de posição local. Escolha um movimento compatível.',
    animationPresetTitle: 'Experimentar um movimento pronto',
    animationPresetKind: 'Qual movimento?',
    animationPresetNames: { bounce: 'Pular', sway: 'Balançar', spin: 'Girar uma volta' },
    animationPresetHints: {
      bounce: 'Vai até a altura escolhida e volta. Usa o eixo local da peça ou do grupo.',
      sway: 'Inclina para um lado e para o outro, voltando à pose original. O pivô da peça define onde ela gira.',
      spin: 'Faz voltas completas, com chaves intermediárias para manter o sentido do giro.',
    },
    animationPresetDistance: 'Distância do pulo',
    animationPresetAngle: 'Inclinação em graus',
    animationPresetTurns: 'Número de voltas',
    animationPresetAxis: 'Eixo local do movimento',
    animationPresetPrepare: 'Preparar prévia',
    animationPresetConfirm: 'Guardar este movimento',
    animationPresetCancel: 'Cancelar prévia',
    animationPresetReady:
      'Prévia pronta. Use Reproduzir movimento para experimentar. Nada foi salvo ainda.',
    animationPresetEditingHint:
      'Você está experimentando um movimento pronto. Guarde ou cancele a prévia antes de editar chaves.',
    animationPresetHint:
      'Escolha as peças ou um grupo. A prévia não altera a criação; guardar cria um movimento que você pode editar e desfazer.',
    hierarchy: 'Peças e grupos',
    empty: 'Comece com uma forma. Depois, junte as peças do seu jeito.',
    choose: 'Escolha uma peça no modelo ou na lista para ajustar.',
    selection: (count: number) => (count === 1 ? '1 item escolhido' : `${count} itens escolhidos`),
    select: (name: string) => `Escolher ${name}`,
    group: 'Agrupar',
    ungroup: 'Separar grupo',
    groupName: 'Grupo',
    duplicate: 'Duplicar',
    convertMesh: 'Transformar em malha',
    convertMeshHint:
      'Troque a forma por uma malha de pontos e faces. Desfazer traz a forma de volta.',
    meshCounts: (vertices: number, faces: number) => `${vertices} pontos e ${faces} faces`,
    editFaces: 'Editar malha',
    editSkinBase: 'Editar forma-base',
    supportGuides: 'Ver apoios',
    supportGuidesHint:
      'Os pontos mostram os grupos e apoios originais, mesmo atrás das peças. Toque num ponto para escolher. Use a lista da oficina para escolher pelo nome.',
    skinBaseHint:
      'Você está editando a forma-base, sem a dobra dos ossos. Ao terminar, a peça volta a mostrar a deformação. Os pesos continuam guardados.',
    componentModes: { vertex: 'Pontos', edge: 'Linhas', face: 'Faces' },
    componentModeLabel: 'O que você quer ajustar?',
    componentModeHint: 'Trocar de tipo limpa a seleção, mas mantém sua criação.',
    componentAreaHint:
      'Envolva os pontos com o contorno. Linhas e faces entram quando todos os seus pontos estão dentro.',
    componentThrough: 'Alcançar partes atrás',
    componentTitles: { vertex: 'Pontos da peça', edge: 'Linhas da peça', face: 'Faces da peça' },
    componentPickHints: {
      vertex: 'Toque num ponto. Escolher várias junta pontos à seleção. Esc volta às peças.',
      edge: 'Toque numa linha da malha. Escolher várias junta linhas à seleção. Esc volta às peças.',
    },
    componentViewport: 'Modelo 3D. Arraste para olhar. Toque para escolher uma parte da malha.',
    componentTransformHint:
      'Use Mover, Girar ou Mudar tamanho na seleção. Pontos ligados também ajustam as faces vizinhas, sem mover a peça inteira. Esc cancela o arrasto.',
    componentCounts: {
      vertex: (count: number) => (count === 1 ? '1 ponto escolhido' : `${count} pontos escolhidos`),
      edge: (count: number) => (count === 1 ? '1 linha escolhida' : `${count} linhas escolhidas`),
    },
    componentAll: { vertex: 'Escolher todos os pontos', edge: 'Escolher todas as linhas' },
    componentNone: 'Limpar partes escolhidas',
    componentConnected: 'Escolher partes ligadas',
    componentMoreSelection: 'Mais jeitos de escolher',
    uvTitle: 'Encaixar a pintura (UV)',
    uvCanvasControl: 'Escolher ou ajustar no mapa da pintura',
    uvCorners: 'Cantos e bordas da pintura',
    uvCornerHint:
      'Cada canto pertence a uma face. Mover um canto muda o encaixe da pintura e pode abrir uma costura com a vizinha. Os pixels e a forma da peça não mudam.',
    uvCornerEnable: 'Mover cantos no mapa',
    uvCornerChoose: 'Canto da face principal',
    uvCornerNumber: (number: number) => `Canto ${number}`,
    uvCornerStep: 'Passo das setas em U e V',
    uvCornerAxis: (axis: 'U' | 'V') => `${axis} do canto`,
    uvCornerApply: 'Aplicar posição do canto',
    uvCornerKeyboard:
      'Arraste um canto pelo número. No teclado: espaço começa, setas movem pelo passo escolhido e espaço ou Enter confirma. Escape cancela. O contorno é uma prévia; a pintura 3D muda ao confirmar.',
    uvStitch: 'Alinhar a borda da face vizinha',
    uvStitchHint:
      'A borda vai deste canto até o próximo. Escolha também a face vizinha: alinhar copia as duas posições desta borda para ela, sem mover o restante da ilha. Isso pode esticar a pintura da vizinha. Você pode desfazer.',
    uvLoading: 'Abrindo o mapa da pintura...',
    uvHint:
      'Este mapa mostra como a pintura encaixa nas faces. A escolha aqui acompanha a peça em 3D. O quadrado marca uma imagem inteira.',
    uvCanvas: 'Mapa 2D do encaixe da pintura nas faces',
    uvCanvasHint:
      'Toque para escolher. Toque de novo para alternar faces sobrepostas. Você também pode usar a lista abaixo.',
    uvFace: 'Face no mapa',
    uvChooseFace: 'Escolha uma face',
    uvFaceNumber: (number: number) => `Face ${number}`,
    uvIslands: (islands: number, seams: number) =>
      `${islands} ilhas de pintura, ${seams} linhas de contorno ou costura.`,
    uvSelectIslands: 'Escolher ilhas inteiras',
    uvTransform: 'Ajustar o encaixe escolhido',
    uvFields: {
      u: 'Mover de lado (U)',
      v: 'Mover para cima (V)',
      sizeU: 'Largura ×',
      sizeV: 'Altura ×',
      angle: 'Girar em graus',
    },
    uvTransformHint:
      'Uma unidade equivale à imagem inteira. O giro e o tamanho usam o centro da seleção. A peça não muda de forma; só o encaixe da pintura.',
    uvApplyTransform: 'Aplicar encaixe',
    uvFlip: { u: 'Espelhar de lado', v: 'Espelhar de cima' },
    uvReorganize: 'Projetar e organizar ilhas',
    uvReorganizeHint:
      'Isso muda onde a pintura aparece nas faces. Os pixels não são redesenhados nem apagados. Desfazer restaura o encaixe anterior.',
    uvProjection: 'Olhar as faces de qual lado?',
    uvProjections: {
      xy: 'De frente (XY)',
      xz: 'De cima (XZ)',
      yz: 'Do lado (YZ)',
      face: 'Cada face plana separada',
    },
    uvProject: 'Projetar faces escolhidas',
    uvMargin: 'Espaço entre ilhas (0 a 0,25)',
    uvPackHint:
      'Organiza ilhas inteiras dentro do quadrado, mantendo suas proporções. Use uma margem menor se faltar espaço. Ilhas não escolhidas ficam no lugar e podem se sobrepor às novas posições.',
    uvPack: 'Organizar ilhas escolhidas',
    appearanceTitle: 'Materiais e camadas',
    atlasTitle: 'Juntar pinturas desta peça',
    atlasHint:
      'Organiza duas ou mais imagens em uma pintura compartilhada, sem reduzir pixels. Só esta peça muda; as imagens originais ficam guardadas.',
    atlasPrepare: 'Preparar imagem compartilhada',
    atlasBusy: 'Organizando as pinturas… Você pode cancelar.',
    atlasPreview: 'Prévia da imagem compartilhada',
    atlasSummary: (count: number, width: number, height: number) =>
      `${count} imagens → uma pintura de ${width} × ${height} pixels`,
    atlasConfirmHint:
      'As camadas visíveis e as cores de base viram uma camada de cores livres. Ela não acompanha futuras mudanças da paleta. Os acabamentos continuam separados. Confirme para ajustar os UVs; um desfazer recupera tudo.',
    atlasConfirm: 'Usar pintura compartilhada',
    atlasCancel: 'Descartar imagem compartilhada',
    atlasFailed: 'Não consegui juntar essas pinturas. Tente novamente.',
    appearanceLoading: 'Abrindo materiais e pintura...',
    materialChoose: 'Material desta peça',
    materialEntry: (name: string, position: number) => `${position}. ${name}`,
    materialShared: (pieces: number, images: number) =>
      `Este material atende ${pieces} peças. A imagem atende ${images} peças. Editar um recurso compartilhado atualiza todas elas, incluindo seus espelhos.`,
    materialLocked:
      'Há uma peça travada usando este recurso. Você pode fazer uma cópia só para a peça atual, se ela estiver destravada.',
    materialCopy: 'Copiar material e pintura só para esta peça',
    materialFinish: 'Jeito da superfície',
    materialFinishHint:
      'O acabamento muda como a luz aparece. A pintura e suas cores continuam guardadas.',
    materialPresets: { matte: 'Fosco', shiny: 'Brilhante', metal: 'Metal' },
    materialMask: 'Recortar transparência',
    materialMaskHint:
      'Crie espaços vazados, como entre as folhas de uma árvore. As partes abaixo do limite desaparecem; as outras ficam opacas. A pintura continua guardada.',
    materialMaskCutoff: 'Limite do recorte',
    materialMaskOpacity: 'Força da opacidade (0 a 1)',
    materialMaskRangeHint:
      'Comece com limite 0,5 e força 1. Limite 0 mostra tudo; acima de 1 esconde tudo.',
    materialMaskApply: 'Aplicar recorte',
    materialMaskRemove: 'Voltar à transparência suave',
    materialName: 'Nome do material',
    materialFields: { roughness: 'Fosco (0 a 1)', metalness: 'Metálico (0 a 1)' },
    materialImageKind: 'O que você quer pintar?',
    materialImageKinds: {
      color: 'Cor',
      normal: 'Relevo na luz',
      roughness: 'Partes foscas',
      metalness: 'Partes de metal',
    },
    materialMapImage: 'Imagem deste efeito',
    materialMapHints: {
      normal:
        'Este mapa muda como a luz encontra a superfície, sem mover os pontos da peça. Use uma imagem de normais azulada. Apagar revela o fundo liso; não cria buracos.',
      roughness:
        'Pinte em cinza: branco deixa a região mais fosca, preto mais brilhante. O mapa usa o canal verde; apagar revela branco. O ajuste Fosco acima limita a força do efeito.',
      metalness:
        'Pinte em cinza: branco permite metal, preto não. O mapa usa o canal azul; apagar revela branco. Para aparecer, o ajuste Metálico acima precisa ser maior que zero.',
    },
    materialMapRgba:
      'Mapas usam cores livres. A camada começa transparente e revela o fundo neutro do efeito, sem mudar a paleta.',
    materialMapImport: (name: string) =>
      `Esta imagem será usada em “${name}”, não como pintura de cor. Confira os canais do mapa; o leitor do navegador pode alterar perfis de cor do arquivo.`,
    materialMapFactor: (value: number) =>
      `Força máxima definida no acabamento: ${value}. O mapa multiplica esse valor, não o substitui.`,
    materialNormalStrength: 'Força do relevo na luz (0 a 4)',
    materialNormalFlipY: 'Inverter relevo vertical (mapas DirectX)',
    materialNormalApply: 'Aplicar relevo na luz',
    materialDoubleSided: 'Mostrar os dois lados das faces',
    materialApply: 'Aplicar acabamento',
    materialBase: 'Cor por baixo da pintura',
    materialKeepColor: 'Manter a cor atual',
    materialColor: (index: number, hex: string) => `${index}: ${hex}`,
    materialBaseHint:
      'A cor de base aparece onde a pintura deixa transparência. Escolher uma cor da paleta cria um vínculo: mudanças nessa cor acompanham o material.',
    materialApplyColor: 'Aplicar cor de base',
    materialImage: 'Imagem de pintura',
    materialNoImage: 'Só a cor de base',
    imageCreate: 'Criar imagem em branco',
    imageCreateHint:
      'Liga uma imagem nova a este material. A imagem anterior continua guardada na lista; você pode escolhê-la de novo ou usar Desfazer.',
    imageName: 'Nome da imagem',
    imageDefaultName: 'Minha pintura',
    imageDimensions: { width: 'Largura em pixels', height: 'Altura em pixels' },
    imageEncoding: 'Como guardar as cores?',
    imageEncodings: { indexed: 'Cores ligadas à paleta', rgba: 'Cores livres com transparência' },
    imageCreateApply: 'Criar e ligar imagem',
    imageLayers: 'Camadas da pintura',
    imagePreview: 'Prévia das camadas com a cor de base do material',
    flipbookTitle: 'Pintura que se mexe',
    uvAutoTitle: 'Abrir faces para pintar',
    uvAutoMethod: 'Como abrir o mapa?',
    uvAutoFaces: 'Cada face separada',
    uvAutoConnected: 'Desdobrar faces vizinhas',
    uvUnfoldHint:
      'Faces planas vizinhas do mesmo material podem ficar juntas, como uma caixa de papel aberta. Cortes extras evitam sobreposição. Uma superfície pode precisar de vários grupos.',
    uvPreserveCuts: 'Manter os cortes que já existem',
    uvPreserveCutsHint:
      'Mantém separadas as bordas que já eram cortes no mapa. Desmarque para tentar unir mais faces. Os cortes fora da escolha ficam como estão.',
    uvCutTitle: 'Escolher onde separar',
    uvCutHint:
      'Escolha uma face no mapa e depois uma borda entre dois cantos. Marcar um corte não muda a criação: ele será usado ao preparar e confirmar o novo mapa.',
    uvCutCanvas: 'Mapa para escolher bordas de corte',
    uvCutCanvasControl: 'Escolher uma face para marcar cortes',
    uvCutFace: 'Face dentro da escolha',
    uvCutFaceHint: (count: number) =>
      `Use um número de 1 a ${count} ou toque no mapa. Toques repetidos alternam faces sobrepostas. A escolha no 3D continua igual.`,
    uvCutEdge: 'Borda para separar',
    uvCutEdgeNumber: (a: number, b: number) => `Entre os cantos ${a} e ${b}`,
    uvCutToggle: 'Separar nesta borda',
    uvCutClear: 'Limpar cortes marcados',
    uvCutCount: (count: number) =>
      `${count} cortes marcados para esta abertura. Eles só valem para a escolha atual.`,
    uvAutoHint:
      'Cada face plana ganha seu espaço, sem ficar por cima das outras escolhidas. Faces maiores recebem mais espaço de pintura. As faces que você não escolheu ficam no lugar.',
    uvAutoMargin: 'Espaço entre os grupos',
    uvAutoPrepare: 'Preparar novo mapa',
    uvAutoBusy: 'Organizando as faces… Você pode cancelar.',
    uvAutoPreview: 'Prévia do novo mapa de pintura',
    uvAutoConfirmHint: (count: number) =>
      `${count} faces serão reorganizadas. A malha e os pixels ficam guardados, mas a pintura muda de lugar no modelo. As faces fora da escolha não mudam e ainda podem ficar sobrepostas ao novo mapa.`,
    uvAutoConfirm: 'Usar este mapa',
    uvAutoCancel: 'Descartar novo mapa',
    uvAutoFailed: 'Não consegui preparar esse mapa. Tente um grupo menor de faces.',
    flipbookHint:
      'Desenhe os quadros lado a lado ou importe uma folha pronta. Cada quadro aparece inteiro no modelo, sem mudar seus pixels ou UV.',
    flipbookSettings: 'Organizar os quadros',
    flipbookWidth: 'Largura de cada quadro',
    flipbookHeight: 'Altura de cada quadro',
    flipbookSequence: 'Ordem dos quadros',
    flipbookSequenceHint:
      'Conte a partir de 1, da esquerda para a direita e de cima para baixo. Exemplo: 1, 2, 2, 3. Deixe vazio para usar todos em ordem.',
    flipbookFps: 'Quadros por segundo',
    flipbookLoop: 'Repetir a sequência',
    flipbookApply: 'Aplicar sequência',
    flipbookRemove: 'Voltar à imagem parada',
    flipbookRemoveHint:
      'A folha e seus desenhos ficam guardados. Só a organização da animação é removida.',
    flipbookPreview: 'Prévia da pintura animada',
    flipbookPlay: 'Reproduzir pintura',
    flipbookPause: 'Pausar pintura',
    flipbookPrevious: 'Passo anterior',
    flipbookNext: 'Próximo passo',
    flipbookChoose: 'Passo da sequência',
    flipbookStep: (step: number, total: number, frame: number) =>
      `Passo ${step} de ${total} · quadro ${frame}`,
    flipbookOption: (step: number, frame: number) => `${step} · quadro ${frame}`,
    flipbookMotionHint:
      'A prévia só se move quando você pede. Sair da janela, editar ou fechar os controles pausa a reprodução.',
    flipbookPaintHint:
      'No modelo 3D, você pinta só o quadro escolhido. A folha 2D abaixo continua mostrando todos os quadros.',
    imageInfo: (width: number, height: number, layers: number, indexed: boolean) =>
      `${width} × ${height} pixels, ${layers} camadas. ${indexed ? 'Cores ligadas à paleta.' : 'Cores livres com transparência.'} A lista começa pela camada de cima.`,
    imageLayerChoose: 'Camada escolhida',
    imageLayerName: 'Nome da camada',
    imageOpacity: 'Quanto a camada aparece (0 a 1)',
    imageLayerVisible: 'Mostrar esta camada',
    imageLayerApply: 'Aplicar ajustes da camada',
    imageLayerDown: 'Descer camada',
    imageLayerUp: 'Subir camada',
    imageNewLayer: 'Nova camada',
    imageLayerAdd: 'Adicionar camada transparente',
    imageLayerDuplicate: 'Duplicar camada',
    imageLayerRemove: 'Apagar camada (pode desfazer)',
    imageRgba: 'Liberar cores desta imagem',
    imageImportTitle: 'Usar uma imagem do computador',
    imageImportHint:
      'PNG ou JPEG, até 1024 × 1024 pixels. A imagem mantém seu tamanho e suas cores livres; não é reduzida à paleta. O arquivo é lido neste dispositivo.',
    imageImportChoose: 'Escolher PNG ou JPEG',
    imageImportBusy: 'Lendo a imagem…',
    imageImportPreview: 'Prévia da imagem escolhida',
    imageImportConfirmHint:
      'Aplicar cria uma nova imagem e a vincula a este material, incluindo as peças que o compartilham. A imagem anterior fica na biblioteca. Os UVs não mudam. Você pode desfazer.',
    imageImportConfirm: 'Aplicar esta imagem ao material',
    imageImportCancel: 'Descartar importação',
    imageImportStale: 'A criação mudou. Escolha a imagem novamente para conferir onde aplicá-la.',
    imageImportErrors: {
      size: 'A imagem é grande demais. Escolha um arquivo de até 4 MiB e 1024 pixels em cada lado.',
      format: 'Escolha um PNG ou JPEG válido. Outros formatos ainda não são aceitos.',
      animated: 'Esta imagem tem animação. Escolha uma imagem parada para pintar.',
      decode: 'Não foi possível ler os pixels dessa imagem. Tente outro PNG ou JPEG.',
    },
    imageRgbaHint:
      'Conserva as cores atuais e a transparência de cada camada, mas desliga esta imagem da paleta. Depois, mudar a paleta não muda estes pixels. Desfazer restaura o vínculo.',
    paintLayer: 'Pintar nesta camada',
    paintTitle: 'Pintar a peça',
    paintFailed: 'Não consegui aplicar esse traço. Tente novamente.',
    paintTargetChanged:
      'A camada, sua visibilidade ou seu vínculo mudou. Escolha onde pintar novamente.',
    paintCanvas: 'Pintar na imagem da camada',
    paintCanvasHint:
      'Arraste para pintar. No teclado, use as setas para escolher um pixel e Espaço para pintar. Esc cancela o traço. A linha de baixo da imagem é a linha 1.',
    paintCursor: (x: number, y: number) => `Pixel escolhido: coluna ${x}, linha ${y}.`,
    paintPencil: 'Lápis',
    paintEraser: 'Borracha',
    paintPicker: 'Conta-gotas',
    paintPickerHint:
      'Toque em um pixel para copiar sua cor nesta camada e voltar ao lápis. A cor não inclui as outras camadas nem a opacidade do material. Um pixel vazio da paleta escolhe a borracha.',
    paintBrush: 'Largura do traço',
    paintBrushSize: (size: number) => `${size} ${size === 1 ? 'pixel' : 'pixels'}`,
    paintColor: 'Cor do traço',
    paintAlpha: 'Quanto a cor aparece (0 a 255)',
    paintFill: 'Balde',
    paintFillHint:
      'Toque para preencher a área conectada da mesma cor nesta camada. O balde pode alcançar outras faces que usam essa área da imagem.',
    paintTolerance: 'Aceitar cores parecidas (0 a 255)',
    imageTaskBusy: 'Ajustando a imagem… você pode cancelar.',
    imageTaskCancel: 'Cancelar ajuste da imagem',
    imageTaskFailed: 'Não consegui ajustar essa imagem. Sua pintura anterior foi mantida.',
    paintShapes: 'Formas e área de pintura',
    paintShapeTools: {
      line: 'Linha reta',
      rectangle: 'Retângulo',
      ellipse: 'Elipse',
      select: 'Escolher área',
      gradient: 'Gradiente',
      stamp: 'Carimbo',
    },
    paintShapeFilled: 'Preencher a forma',
    paintGradientNeedsRgba:
      'Gradientes e carimbos precisam de cores livres. Converta a imagem para RGBA; você pode desfazer a conversão.',
    paintGradientHint:
      'Arraste do começo até o fim da mistura. O gradiente preenche a área selecionada, ou a imagem toda quando não há seleção.',
    paintGradientEndColor: 'Cor no fim do gradiente',
    paintGradientEndAlpha: 'Quanto a cor final aparece (0 a 255)',
    paintStampMissing: 'Escolha uma imagem ou copie a área selecionada antes de carimbar.',
    paintStampHint:
      'Posicione pelo contorno e solte para carimbar uma vez. No teclado, espaço começa, setas movem e espaço confirma. O carimbo mistura sua transparência com a camada e respeita a área selecionada. Fora da imagem não pinta.',
    paintStampCapture: 'Copiar a área selecionada como carimbo',
    paintStampCaptureHint:
      'A cópia usa só esta camada. Para carimbar em outro lugar, escolha “Pintar na imagem toda” após copiar.',
    paintStampPreview: 'Prévia do carimbo com giro e espelhamento',
    paintStampScale: 'Tamanho do carimbo',
    paintStampRotation: 'Girar o carimbo para a direita',
    paintStampFlips: {
      flipX: 'Espelhar da esquerda para a direita',
      flipY: 'Espelhar de cima para baixo',
    },
    paintStampClear: 'Remover carimbo da ferramenta',
    paintShapeHint:
      'Arraste para ver o contorno no quadro de pintura; solte para aplicar. Sair do quadro ou cruzar uma costura cancela o desenho.',
    paintShapeKeyboard:
      'Use as setas. Espaço ou Enter marca o começo; mova até o fim e confirme novamente. Escape cancela.',
    paintClearSelection: 'Pintar na imagem toda',
    paintSelectedArea: 'A pintura está limitada à área marcada. Isso não recorta a imagem.',
    paintFinish: 'Voltar aos materiais',
    paintHint:
      'A imagem e a peça usam a mesma pintura. Um traço tem um único desfazer. A borracha revela as camadas de baixo ou a cor de base.',
    paintOnModel: 'Pintar no modelo',
    paintLook: 'Olhar o modelo',
    paintModelHint:
      'Arraste nas faces da peça que usam esta imagem. O traço não atravessa outras peças. Para mudar o olhar com os dedos, escolha Olhar o modelo.',
    paintLookHint:
      'Arraste para olhar e use dois dedos para aproximar ou afastar. Depois, escolha Pintar no modelo para continuar o traço.',
    softMovement: 'Mover vizinhos suavemente',
    softMovementReach: 'Alcance na oficina',
    softMovementHint:
      'Use Mover. Os pontos próximos acompanham menos o arrasto; o alcance segue as linhas da peça e é medido na oficina. Partes sem ligação ficam no lugar. Desligue para girar ou mudar o tamanho.',
    softMovementInvalid: 'Use um alcance maior que zero.',
    componentSelectionActions: {
      grow: 'Pegar uma fileira a mais',
      shrink: 'Tirar uma fileira da seleção',
      invert: 'Trocar pelas partes não escolhidas',
      ring: 'Seguir lados opostos',
      loop: 'Seguir caminho de linhas',
    },
    componentSelectionHints: {
      grow: 'Acrescenta as partes vizinhas uma vez. Você pode repetir para alcançar mais longe.',
      shrink: 'Retira as partes que tocam vizinhas não escolhidas. Não apaga nada do modelo.',
      invert: 'Escolhe o que ficou de fora e solta o que estava escolhido.',
      ring: 'Passa para o lado oposto de cada face de quatro pontos. Para nas bordas e nas ligações ambíguas.',
      loop: 'Segue a continuação das linhas, sem virar nas ligações com muitos caminhos. Para em triângulos e bordas.',
    },
    componentRemove: {
      vertex: 'Apagar pontos e faces ligadas',
      edge: 'Apagar linhas e faces ligadas',
    },
    componentRemovalImpact: (faces: number, looseEdges: number) =>
      `Retira também ${faces === 1 ? '1 face ligada' : `${faces} faces ligadas`} e ${looseEdges === 1 ? '1 linha solta' : `${looseEdges} linhas soltas`}. Desfazer restaura tudo.`,
    splitEdges: 'Criar pontos no meio das linhas',
    cutRing: 'Cortar uma faixa ao meio',
    cutRingHint:
      'Escolha uma linha. O corte segue pelo meio dos lados opostos das faces de quatro pontos. Para em outras formas. Desfazer traz a faixa inteira de volta.',
    splitEdgesHint:
      'Divide cada linha escolhida em duas. Mantém as faces ligadas e a pintura. Desfazer traz as linhas de volta.',
    dissolveEdges: 'Tirar linhas sem abrir buracos',
    dissolveEdgesHint:
      'Junta as faces planas dos dois lados das linhas escolhidas. A pintura precisa continuar igual entre elas. Os pontos ficam no lugar.',
    connectPoints: { cut: 'Cortar face entre os pontos', line: 'Ligar pontos com linha solta' },
    weldPoints: 'Juntar pontos sobrepostos',
    weldPointsHint:
      'Junta apenas os pontos escolhidos que estão exatamente no mesmo lugar. Não aproxima pontos nem muda a pintura.',
    weldImpact: (points: number, groups: number, faces: number, lines: number) =>
      `${points} pontos a menos em ${groups} grupos. Atualiza ${faces} faces e retira ${lines} linhas soltas repetidas ou sem comprimento. Desfazer restaura tudo.`,
    weldEmpty: 'Não há pontos escolhidos no mesmo lugar para juntar.',
    connectPointsHints: {
      cut: 'Escolha dois pontos de lados diferentes de uma face. Uma linha reta divide a face sem mudar sua pintura.',
      line: 'Escolha dois pontos para ligar. A linha ajuda a construir, mas não cria uma superfície nem muda a pintura.',
    },
    finishFaces: 'Voltar às peças',
    facesTitle: 'Faces da peça',
    faceHint: 'Toque numa face. Shift escolhe várias. Esc volta às peças.',
    faceTransformHint:
      'Use Mover, Girar ou Mudar tamanho nas faces escolhidas. Os pontos ligados também ajustam as faces vizinhas. Esc cancela o arrasto.',
    faceViewport: 'Modelo 3D. Arraste para olhar. Toque para escolher uma face.',
    faceCount: (count: number) => (count === 1 ? '1 face escolhida' : `${count} faces escolhidas`),
    faceAll: 'Escolher todas as faces',
    faceNone: 'Limpar faces escolhidas',
    faceConnected: 'Escolher faces ligadas',
    faceActions: {
      merge: 'Juntar faces escolhidas',
      remove: 'Apagar faces',
      triangulate: 'Dividir em triângulos',
      flip: 'Virar faces',
      detach: 'Soltar faces',
    },
    faceActionHints: {
      merge:
        'Tira as linhas entre faces planas ligadas. Mantém a pintura, os pontos e os buracos. Se a pintura mudar na ligação, as faces ficam separadas.',
      remove: 'Abre um buraco sem apagar a peça. Desfazer traz as faces de volta.',
      triangulate: 'Divide cada face em triângulos, mantendo sua pintura.',
      flip: 'Troca o lado de fora pelo lado de dentro. O lado de dentro aparece avermelhado.',
      detach: 'Solta os pontos de ligação sem mover nem criar outra peça.',
    },
    facePreview: {
      thickness: 'Dar espessura',
      extrude: 'Puxar faces',
      inset: 'Criar borda',
      subdivide: 'Dividir faces em partes',
    },
    facePreviewHints: {
      thickness:
        'Transforma uma superfície plana solta em uma peça com espessura. Mantém os buracos e a pintura; as laterais novas repetem o material. A medida é da peça, antes da escala.',
      subdivide:
        'Cria pontos no meio dos lados e no centro. Mantém a forma e a pintura, ajustando também os lados ligados. Zero volta ao início.',
      extrude:
        'Puxa cada região plana para fora. Valores negativos empurram para dentro. A medida é da peça, antes da escala. Não recorta outras partes; as laterais novas repetem a pintura.',
      inset:
        'Cria uma borda em cada face escolhida. A porcentagem aproxima os pontos do centro, sem mudar a pintura.',
    },
    extrudeAmount: 'Quanto puxar',
    thicknessAmount: 'Espessura da peça',
    insetAmount: 'Borda em porcentagem',
    subdivideAmount: 'Quantidade de divisões',
    previewHint: 'Veja no modelo. Só confirme quando gostar do resultado.',
    previewConfirm: 'Confirmar ajuste',
    previewCancel: 'Cancelar ajuste',
    previewChanged: 'A criação mudou durante o ajuste. Escolha as faces novamente.',
    surfaceWorking: 'Calculando o ajuste. Você pode mudar o valor ou cancelar.',
    surfaceWorkerFailed:
      'Não consegui abrir o cálculo separado. Sua criação foi mantida. Tente o ajuste novamente.',
    remove: 'Apagar seleção',
    addSelection: 'Escolher várias',
    clearSelection: 'Limpar seleção',
    nodeName: 'Nome da peça ou grupo',
    rename: 'Guardar nome',
    visible: 'Mostrar no modelo',
    locked: 'Travar mudanças',
    move: 'Mover',
    rotate: 'Girar',
    scale: 'Mudar tamanho',
    pivot: 'Ponto de giro',
    axesHint: 'X: lados. Y: altura. Z: frente e trás.',
    pivotHint: 'Mude o ponto de giro sem mover a peça. Os valores são relativos à peça.',
    scaleHint: '1 mantém o tamanho. 2 dobra. 0,5 deixa pela metade.',
    apply: 'Aplicar ajuste',
    invalidNumber: 'Preencha os três valores com números válidos.',
    positiveScale: 'Use um tamanho maior que zero. Para inverter, use Espelhar.',
    organize: 'Colocar dentro de um grupo',
    root: 'Fora dos grupos',
    noGroups: 'Agrupe algumas peças para organizar aqui.',
    mirror: 'Espelhar no X',
    show: (name: string) => `Mostrar filhos de ${name}`,
    hide: (name: string) => `Recolher ${name}`,
    nodeKind: { mesh: 'Peça', group: 'Grupo', locator: 'Ponto' },
    hiddenHint: 'Oculto',
    lockedHint: 'Travado',
    viewport: 'Modelo 3D. Arraste para olhar. Toque para escolher uma peça.',
    loading3d: 'Abrindo o modelo 3D...',
    failed3d:
      'Não consegui mostrar o 3D. Suas peças continuam na oficina. Tente abrir o 3D de novo.',
    lost3d: 'O desenho 3D foi interrompido. Aguardando a recuperação sem alterar suas peças.',
    retry3d: 'Abrir o 3D de novo',
    drawIssues: (count: number) =>
      `${count} faces precisam de ajuste para desenhar. Seus pontos e pinturas continuam no arquivo.`,
    commandFailed: 'Não consegui fazer essa mudança. Sua criação não foi alterada.',
    cycle: 'Esse grupo já está dentro da seleção. Escolha outro lugar.',
    save: 'Guardar agora',
    backup: 'Baixar projeto',
    conflict:
      'Outra aba mudou esta criação. Baixe uma cópia das suas mudanças antes de abrir de novo.',
    storage: {
      deleted:
        'Esta criação foi removida em outra aba. Suas mudanças continuam aqui. Use “Baixar projeto” para guardar uma cópia.',
      unreadable:
        'Não consegui conferir a criação guardada. Suas mudanças continuam aqui. Use “Baixar projeto” para guardar uma cópia.',
      unavailable:
        'Os avisos de outras abas estão indisponíveis. Ao guardar, ainda conferimos se outra aba mudou a criação.',
      check: 'Conferir de novo',
    },
    restore: {
      open: 'Trazer uma cópia do Molda',
      title: 'Retomar uma cópia',
      hint: 'Escolha o arquivo .molda.json que você baixou desta oficina. Esta tela não abre ZIPs nem cópias da galeria antiga.',
      file: 'Arquivo da cópia',
      reading: 'Conferindo sua cópia…',
      source: (name: string) => `Arquivo escolhido: ${name}`,
      newIdentity:
        'Ao confirmar, será guardada uma nova criação. As peças, pinturas e movimentos serão mantidos. Nenhum projeto existente será substituído; a miniatura antiga não será usada.',
      confirm: 'Guardar como nova criação',
      saving: 'Guardando sua nova criação…',
      cancel: 'Voltar aos meus projetos',
      readError:
        'Não consegui preparar a cópia agora. Tente novamente ou peça ajuda a um adulto. Seu arquivo não foi alterado.',
      saveError:
        'Não consegui guardar esta cópia. Sua revisão continua aqui para tentar novamente.',
    },
    start: {
      title: 'O que vamos construir?',
      intro:
        'Monte suas ideias com peças, pinte e dê movimento. Você pode mudar tudo do seu jeito.',
      newTitle: 'Comece uma criação',
      empty: 'Começar do zero',
      emptyHint: 'A bancada começa vazia. Você escolhe as primeiras peças.',
      nameTitle: 'Dê um nome à sua ideia',
      name: 'Nome da criação',
      nameError: (maximum: number) => `Escreva um nome de até ${maximum} caracteres.`,
      create: 'Criar e abrir a oficina',
      creating: 'Guardando sua nova criação...',
      createError:
        'Não consegui criar o projeto. Seu nome e sua escolha continuam aqui. Tente de novo.',
      chooseAgain: 'Escolher outro começo',
      recent: 'Continue de onde parou',
      localOnly:
        'Projetos desta oficina, guardados neste navegador. Os mais recentes vêm primeiro.',
      refresh: 'Atualizar projetos',
      loading: 'Procurando seus projetos...',
      noProjects: 'Sua primeira criação vai aparecer aqui depois que você começar.',
      listError: 'Não consegui atualizar a lista. Tente “Atualizar projetos” de novo.',
      listIssues: (count: number) =>
        `${count} ${count === 1 ? 'projeto precisa' : 'projetos precisam'} de conferência para aparecer aqui. Nenhum arquivo foi alterado.`,
      open: (name: string) => `Continuar ${name}`,
      unknownDate: 'Data indisponível',
      pages: 'Páginas dos projetos',
      previous: 'Anteriores',
      next: 'Próximos',
      page: (page: number, pages: number) => `Página ${page} de ${pages}`,
    },
    exit: {
      open: 'Meus projetos',
      title: 'Voltar aos projetos?',
      hint: 'As mudanças aplicadas serão guardadas. Ajustes em prévia e poses que você ainda não gravou serão cancelados.',
      stay: 'Ficar na oficina',
      save: 'Guardar e voltar',
      saving: 'Guardando antes de sair...',
      failed: 'Não consegui guardar. Você pode ficar na oficina ou baixar uma cópia antes de sair.',
      discard: 'Sair sem guardar',
    },
    development:
      'Oficina em desenvolvimento. A sincronização com o Estúdio ainda não está ligada aqui.',
    starting: 'Abrindo a oficina...',
    openError: 'Não consegui abrir essa criação. O arquivo original continua guardado.',
    createBox: 'Adicionar caixa',
    boxName: 'Caixa',
    add: 'Adicionar forma ou ponto',
    selectTool: 'Escolher',
    selectBox: 'Caixa de seleção',
    selectLasso: 'Laço',
    selectThrough: 'Alcançar peças atrás',
    areaHint: 'Cerque os pontos de giro das peças. Esc cancela.',
    gizmoHint: 'Arraste uma alça. Esc cancela o ajuste.',
    addLocator: 'Ponto de apoio',
    locatorName: 'Apoio',
    dimensions: 'Medidas da forma',
    curveDetail: 'Detalhes da curva',
    planeCut: 'Cortar a peça por um plano',
    bevel: 'Chanfrar uma quina',
    pathCreate: 'Criar tubo pelo caminho',
    pathCreateTitle: 'Tubo a partir das linhas',
    pathCreateHint:
      'Escolha linhas ligadas, sem bifurcações e com começo e fim separados. Elas serão copiadas para um tubo novo; a peça original continua igual.',
    pathName: 'Tubo',
    meshCheck: 'Conferir a malha',
    meshCheckHint:
      'São observações, não ordens: uma borda aberta ou um ponto solto pode fazer parte da sua ideia. Escolha a região para olhar. Reparos mostram uma prévia e só entram no histórico ao confirmar.',
    meshCheckRun: 'Conferir agora',
    meshCheckBusy: 'Conferindo a malha...',
    meshCheckClear:
      'Não encontrei esses problemas. Isso não garante que a peça esteja pronta para todos os jogos.',
    meshCheckFailed: 'Não consegui conferir essa malha. Tente novamente.',
    meshCheckChanged: 'A peça mudou durante a conferência. Confira novamente antes de reparar.',
    meshCheckPreview: (count: number) =>
      `Prévia do reparo de ${count} itens. Confira o resultado antes de confirmar. Cancelar restaura a peça.`,
    meshCheckSelect: (name: string) => `Escolher: ${name}`,
    meshCheckKinds: {
      'invalid-faces': 'Faces que não podem ser desenhadas',
      'duplicate-faces': 'Faces repetidas com a mesma pintura',
      'prepare-faces': 'Faces que precisam de preparo para algumas ferramentas',
      'conflicting-winding': 'Lados com orientação diferente',
      'ambiguous-edges': 'Linhas com mais de duas faces',
      'open-edges': 'Bordas abertas',
      'overlapping-points': 'Pontos no mesmo lugar',
      'unused-points': 'Pontos sem ligações',
      'empty-lines': 'Linhas sem comprimento',
      'duplicate-lines': 'Linhas soltas repetidas',
    },
    meshCheckHints: {
      'invalid-faces':
        'Essas faces se cruzam ou não têm área. Você pode ajustar seus pontos ou retirar só as faces; os pontos ficam guardados.',
      'duplicate-faces':
        'Há cópias com os mesmos pontos, orientação, UV e material. Retirar as cópias mantém a primeira face de cada conjunto.',
      'prepare-faces':
        'Estas faces precisam ser divididas para alguns ajustes manterem a pintura no lugar. A divisão usa os mesmos triângulos que você já vê.',
      'conflicting-winding':
        'Os dois lados percorrem a linha na mesma direção. Confira as faces antes de decidir qual virar; não vou escolher por você.',
      'ambiguous-edges':
        'Mais de duas faces usam a mesma linha. Isso pode ser intencional. Escolha a ligação para decidir quais faces manter.',
      'open-edges':
        'Só uma face usa cada uma destas linhas. Superfícies e tubos abertos podem estar certos assim.',
      'overlapping-points':
        'Estes pontos têm exatamente a mesma posição. Escolha-os para examinar a opção de unir pontos; não aproximo pontos diferentes.',
      'unused-points':
        'Nenhuma face ou linha usa estes pontos. Você pode guardá-los para construir depois ou retirar só eles.',
      'empty-lines':
        'As pontas destas linhas soltas estão no mesmo lugar. Retirar as linhas não apaga pontos nem faces.',
      'duplicate-lines':
        'Estas linhas soltas repetem o mesmo par de pontos. O reparo mantém a primeira de cada conjunto, sem alterar faces.',
    },
    meshCheckFixes: {
      'invalid-faces': 'Prévia: retirar essas faces',
      'duplicate-faces': 'Prévia: retirar cópias de faces',
      'prepare-faces': 'Prévia: dividir para preparar',
      'unused-points': 'Prévia: retirar pontos sem ligações',
      'empty-lines': 'Prévia: retirar linhas sem comprimento',
      'duplicate-lines': 'Prévia: retirar cópias de linhas',
    },
    pathSettings: 'Caminho e formato do tubo',
    pathSettingsHint:
      'O raio mede do centro até a borda. Use de 3 a 64 lados; menos lados deixam seu jogo mais leve. Curvas muito apertadas podem fazer o tubo se atravessar.',
    pathRadius: 'Raio do tubo',
    pathAround: 'Lados do tubo',
    pathCaps: 'Fechar as pontas',
    applyPathSettings: 'Aplicar formato do tubo',
    pathPoint: 'Ponto do caminho',
    pathPointName: (number: number) => `Ponto ${number}`,
    pathPointPosition: 'Posição do ponto',
    pathPointHint:
      'Posição local do centro do tubo nesse ponto. O tubo acompanha o caminho; os ajustes só entram ao aplicar.',
    bevelHint:
      'Escolha uma linha na quina de uma peça fechada. O chanfro apara esse canto com uma face plana, sem alcançar outros cantos. A nova face usa o material de um dos lados. Linhas soltas são mantidas.',
    bevelDepth: 'Profundidade do chanfro na peça',
    applyBevel: 'Aplicar chanfro',
    planeCutHint:
      'Cria linhas de corte na peça inteira, sem apagar nenhum lado. A posição usa as medidas locais da peça, antes de girar ou mudar sua escala. Desfazer volta tudo de uma vez.',
    planeCutAxis: 'Direção do corte',
    planeCutAxes: ['Largura', 'Altura', 'Profundidade'],
    planeCutPosition: 'Posição do corte na peça',
    applyPlaneCut: 'Aplicar corte na peça',
    curveDetailHint:
      'Mais divisões deixam a curva mais redonda. Menos divisões deixam seu jogo mais leve. A pintura continua na mesma superfície.',
    curveDetailFields: { around: 'Lados da curva', down: 'Faixas da esfera' },
    curveDetailInvalid: 'Use de 3 a 64 lados e, na esfera, de 2 a 32 faixas. Só números inteiros.',
    curveDetailCost: (count: number) =>
      `Esta peça terá ${count} triângulos. Cada espelho desenha outra cópia.`,
    applyCurveDetail: 'Aplicar detalhes',
    dimensionsHint:
      'Largura X, altura Y e profundidade Z da forma, antes de girar ou mudar sua escala.',
    mirrors: 'Espelhos',
    mirrorHint: 'O espelho acompanha sua peça. Escolha X, Y ou Z e onde o espelho fica na oficina.',
    mirrorOffset: 'Posição do espelho',
    addMirror: 'Criar espelho',
    removeMirror: (axis: string, offset: number) => `Retirar espelho ${axis} em ${offset}`,
    demoName: 'Minha construção',
    backupError: 'Não consegui baixar o projeto. Tente novamente antes de fechar a oficina.',
  },
  gallery: {
    recoveryTitle: 'Estas criações continuam guardadas',
    recoveryHint:
      'Atualize o Molda para tentar abrir. Você também pode baixar uma cópia de segurança.',
    recoveryNewer: 'Feita em uma versão mais nova do Molda.',
    recoveryInvalid: 'Não consegui abrir este arquivo. Não alterei o original.',
    recoveryDownload: 'Baixar cópia de segurança',
    recoveryDownloading: 'Preparando cópia...',
    recoveryDownloadAria: (name: string) => `Baixar cópia de segurança de ${name}`,
    recoveryFailed:
      'Não consegui preparar a cópia. O original continua guardado; atualize o Molda e tente de novo.',
    title: 'Minhas criações 3D',
    subtitle: 'Modelos, texturas e céus para os seus jogos 3D.',
    create: 'Criar novo',
    empty: 'Nada por aqui ainda. Toque em "Criar novo" para montar a sua primeira criação!',
    emptyCta: 'Começar minha primeira criação',
    loading: 'Abrindo a sua galeria...',
    loadError: 'Não consegui abrir a sua galeria. Tente de novo daqui a pouco.',
    retry: 'Tentar de novo',
    open: 'Abrir',
    preview: (name: string) => `Prévia de ${name}`,
    previewUnavailable: 'Abra a criação para ver de perto.',
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
    loadMore: 'Mostrar mais',
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
    changed: 'A criação mudou em outra janela. Confira e tente renomear de novo.',
  },
  editor: {
    loading: 'Preparando a sua oficina...',
    loadError:
      'Não consegui carregar as ferramentas. Sua criação continua guardada. Tente de novo; se continuar, atualize a página.',
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
        'O modelo chegou ao limite de triângulos. Simplifique alguma malha para continuar.',
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
        free: 'Livre',
        front: 'Frente',
        back: 'Trás',
        left: 'Esquerda',
        right: 'Direita',
        top: 'Cima',
        frame: 'Enquadrar',
        selection: 'Enquadrar seleção',
      },
      viewControls: 'Olhar o modelo',
      isolation: {
        toggle: 'Isolar seleção',
        active: 'Mostrando só a seleção',
        showAll: 'Mostrar tudo',
      },
      inspector: {
        title: 'Peças e propriedades',
        open: 'Peças e cores',
        close: 'Recolher peças e propriedades',
      },
      viewHint: {
        free: 'Arraste para girar. Use dois dedos para mover ou aproximar.',
        flat: 'Vista reta, sem perspectiva. Arraste para mover; aproxime com dois dedos.',
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
      reference: {
        title: 'Imagem de apoio',
        choose: 'Escolher imagem',
        replace: 'Trocar imagem',
        hint: 'Use um desenho ou foto como guia. A imagem fica presa à tela, não faz parte do modelo e sai quando você fecha a criação.',
        formats: 'PNG ou JPG sem animação, até 4 MB e 4 milhões de pixels.',
        loading: 'Preparando a imagem...',
        view: 'Mostrar nesta vista',
        opacity: 'Visibilidade',
        scale: 'Tamanho',
        x: 'Mover para os lados',
        y: 'Mover para cima ou para baixo',
        flip: 'Espelhar imagem',
        visible: 'Mostrar imagem',
        reset: 'Centralizar imagem',
        remove: 'Tirar imagem',
        done: 'Voltar ao modelo',
        failures: {
          size: 'Essa imagem é grande demais. Escolha uma menor, de até 4 MB e 4 milhões de pixels.',
          format:
            'Escolha um arquivo PNG ou JPG. Este arquivo não pode ser usado como imagem de apoio.',
          animated: 'Escolha uma imagem parada. Imagens animadas não servem como apoio.',
          decode: 'Não consegui abrir essa imagem. Tente outro arquivo PNG ou JPG.',
        },
      },
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
        selection: {
          title: 'Escolher mais',
          hint: 'Estas ações só mudam o que está escolhido. Seu modelo continua igual.',
          labels: {
            all: 'Escolher tudo',
            none: 'Limpar seleção',
            connected: 'Escolher conectados',
            grow: 'Expandir seleção',
            shrink: 'Reduzir seleção',
            invert: 'Inverter seleção',
            ring: 'Anel de arestas',
            loop: 'Caminho de arestas',
          },
          help: {
            all: 'Escolhe todos os itens do tipo atual: pontos, arestas ou faces.',
            none: 'Solta a seleção sem apagar nada.',
            connected: 'Segue as ligações da malha a partir do que você escolheu.',
            grow: 'Acrescenta os vizinhos de quem está escolhido.',
            shrink: 'Retira os vizinhos da borda da seleção.',
            invert: 'Escolhe quem ficou de fora e solta quem estava escolhido.',
            ring: 'Segue os lados opostos das faces de quatro pontos. Para nas bordas e nas bifurcações.',
            loop: 'Segue um caminho contínuo de arestas. Para onde houver uma borda, triângulo ou bifurcação.',
          },
        },
        deleteSelection: 'Apagar seleção',
        done: 'Pronto',
        hint: 'Toque num ponto, numa aresta ou numa face. Arraste a alça para mover.',
        counts: (vertices: number, faces: number, triangles: number, looseEdges = 0) =>
          `${vertices} pontos · ${faces} faces${looseEdges > 0 ? ` · ${looseEdges} arestas soltas` : ''} · ${triangles} triângulos`,
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
          loopCut: 'Loop cut',
          merge: 'Juntar pontos',
          createFace: 'Criar face ou aresta',
          inset: 'Encolher dentro',
          flip: 'Virar face',
          split: 'Dividir em triângulos',
        },
        toolHints: {
          extrude: 'Escolha faces (ou arestas) e toque em Puxar.',
          extrudeEdges: 'Escolha uma ou mais arestas para puxar.',
          extrudeFaces: 'Escolha uma ou mais faces para puxar.',
          loopCut: 'Escolha UMA aresta e toque em Loop cut.',
          merge: 'Escolha dois pontos ou mais para juntar.',
          createFace: 'Escolha de 2 a 4 pontos para criar uma aresta, dividir ou fechar uma face.',
          inset: 'Escolha uma face reta para encolher dentro.',
          flip: 'Escolha faces para virar.',
          split: 'Escolha faces de 4 pontos para dividir em triângulos.',
          loopCutQuad: 'Loop cut precisa de uma aresta solta ou de uma faixa de faces de 4 pontos.',
          faceExists: 'Essa face ou aresta já existe.',
        },
        cutOffGrid: 'O corte caiu fora do encaixe: os pontos novos não estão na grade.',
        toolsLegend: 'Ferramentas de malha',
        modeHints: {
          vertex: 'Escolha de 2 a 4 pontos e use Criar face ou aresta.',
          edge: 'Escolha uma aresta para usar Loop cut ou Puxar.',
          face: 'Escolha faces para puxar, encolher, virar ou dividir.',
        },
        selectAll: 'Escolher todos os pontos',
        adjust: 'Ajustar',
        distance: 'Distância',
        cuts: 'Quantidade de cortes',
        cutPosition: 'Posição do corte, em porcentagem',
        direction: 'Direção',
        directions: {
          auto: 'Auto',
          x: '+X',
          '-x': '−X',
          y: '+Y',
          '-y': '−Y',
          z: '+Z',
          '-z': '−Z',
        },
        closeAdjust: 'Fechar ajustes',
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
          loadFailed: 'Não consegui abrir essa textura. Tente de novo ou escolha outra.',
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
      tools: {
        pencil: 'Lápis',
        eraser: 'Borracha',
        fill: 'Balde',
        picker: 'Conta-gotas',
        line: 'Linha',
        rectangle: 'Retângulo',
        ellipse: 'Elipse',
      },
      fillShape: 'Preencher forma',
      shapeHint:
        'Arraste para desenhar. Solte para guardar ou aperte Esc para cancelar. Com Sem emenda, o traço segue o caminho curto pela borda.',
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
        encoding: 'Montando o arquivo do céu...',
        cancel: 'Cancelar download',
        cancelled: 'Parei o download. Seu céu continua aqui.',
        changed: 'O céu mudou. Toque em Baixar para preparar a nova versão.',
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
