import { type StudioProTemplateMetadata, studioProTemplate } from './pro-templates'

export interface StudioProRecipeReference {
  path: string
  exportName: string
  /** A real exported symbol's TypeScript type, relative to a source module in src/. */
  typeReference: string
}

export interface StudioProLearningRecipe {
  label: string
  references: StudioProRecipeReference[]
  preconditions: readonly string[]
  steps: readonly string[]
  lifecycle: string
  limits: string
  checks: readonly string[]
}

/** Curated engineering patterns from GameDev. Never send the downloaded skill corpus. */
const guides: Record<string, readonly string[]> = {
  'canvas-grid-arena': [
    'arena-config.ts define grade, obstáculos, alvos, pavio e alcance; arena-model.ts é a regra pura em ticks de 1/60 s. Pare antes de paredes; caixas recebem o pulso e param a propagação. Encadeie cada carga uma só vez; derrota prevalece se o último alvo e o jogador forem atingidos juntos.',
    'Antes de colocar um pulso, preserve uma rota de fuga cujo tempo seja menor que o pavio. Seed nova ao Começar, mesma seed ao Reiniciar. Limite entidades, não acelere a simulação para recuperar tempo de aba oculta. Teste cantos, bloqueio, cadeia, saída e fim da partida.',
  ],
  'phaser-tactics': [
    'tactics-model.ts e tactics-config.ts definem regras e cenário; phaser-tactics.ts só desenha e converte toque em célula. BFS considera água e ocupação. Cada unidade move uma vez e age uma vez por turno; recrutamento cobra moedas e a unidade espera o próximo turno.',
    'Separe água, sombra, chão/elevação, overlays e unidades. A grade lógica não muda com o tamanho do sprite. Desenhe por mudança de revisão/viewport; não recrie texturas ou textos por frame. Preserve seleção por teclado, toque e botões de turno.',
  ],
  'three-tactics': [
    'Regras e cenário são os mesmos de tactics-model.ts/config; three-tactics.ts desenha com câmera ortográfica e raycast nas casas. Não use posição visual interpolada como ocupação. Bloqueie ações da equipe durante o turno rival, pausa, menu e carregamento.',
    'O pool visual tem capacidade fixa, geometrias/materiais compartilhados e descarte único. Desenho ocorre por mudança, não continuamente. Perda do contexto WebGL pausa e impede continuar até restaurar. Teste picking, teclado, recrutamento e geometria estável após reinícios.',
  ],
  'canvas-survival': [
    'Guardiões da arena: config.ts configura regras; model.ts e rules/ simulam ticks de 1/60 s com seed explícita; game.ts controla fase, carregamento e descarte; render/ desenha sem decidir combate. Preserve o máximo de três ticks por frame e registre tempo descartado.',
    'Pulso é uma ação de borda consumida no tick. Resolva pulso, contatos e objetivos nessa ordem; derrota tem precedência se os objetivos coincidirem. Use swept AABB, movimento normalizado e pools limitados a 64 inimigos e 256 efeitos.',
    'characters.ts vincula papéis aos IDs de Materiais. O pack original tem idle, walk, hurt e death. Imagem estática é válida; sprites precisam dos nomes de animação. Corpo fixo é padrão; collision sprite usa hitbox normalizada (ausente significa quadro inteiro), incluindo flip.',
    'O loader valida PNG, dimensões, hash e metadados; aguarde ready antes de iniciar. Retry e saída cancelam a geração anterior e fecham bitmaps. Nunca carregue material pela posição no array ou por nome editável.',
    'Teste carregamento falho e retry, seed repetida, pausa/aba oculta, troca de imagem e hitbox, encerramento, exportação npm ci/typecheck/build. O recorde é local e só confirma após ACK; não promete restaurar uma partida.',
  ],
  'canvas-puzzle': [
    'Tabuleiro independente do desenho: valide limites e colisões antes de mover ou girar; remova linhas completas em uma única etapa e só então gere a próxima peça.',
    'Use sacola embaralhada para distribuir peças; mantenha regra de fim e vitória separada da renderização. Teste giro na borda, duas linhas simultâneas e tabuleiro cheio.',
  ],
  'phaser-arcade': [
    'Ondas têm contagem finita, progressão configurável e condição de conclusão. Não crie novos projéteis a cada frame: reutilize o grupo limitado e desative corpo, visibilidade e atividade juntos.',
    'Phaser.Scene já possui lights, input, events e time; escolha nomes próprios para sistemas do jogo. Pausa precisa parar a física e reinício deve zerar score, cooldown e grupos.',
  ],
  'phaser-platformer': [
    'Hitbox segue os pés do personagem, não todo o tamanho da imagem. Corpos estáticos precisam refreshBody após mudança de tamanho. Salto só começa quando apoiado.',
    'Camadas distantes usam scrollFactor menor; chão e colisões permanecem no mundo. Compare alcance do salto e tamanho das lacunas; teste reinício depois de cair e a coleta de todas as sementes.',
  ],
  'three-exploration': [
    'Separe movimento, objetivos e câmera. Normalize vetor de movimento para a diagonal não ficar mais rápida. Use delta em segundos com teto após retorno de aba.',
    'Modelo do Molda: caminho local dos Materiais, eixo Y para cima do glTF, escala a partir de bounds reais e base no chão. SkeletonUtils.clone preserva atores animados; mixer por ator, cache de promises por URL.',
  ],
  'three-action': [
    'Projéteis têm pool fixo, tempo de vida e direção capturada no disparo. Ao acertar, desative o projétil e o alvo uma vez. Para velocidades altas, use segmento varrido em vez de testar só a posição final.',
    'Geometria e material podem ser compartilhados por alvos. Descarte cada recurso compartilhado uma vez ao encerrar; atores clonados têm mixers e skeletons próprios. Não aumente DPR sem medir GPU.',
  ],
}

const taskGuides = [
  {
    id: 'sprite',
    label: 'Personagem e sprites',
    steps: [
      'Escolha um material do projeto e confira quadros/animações.',
      'Localize o vínculo ou a textura atual; troque só a apresentação.',
      'Compare desenho e corpo de colisão antes de ajustar as regras.',
    ],
    preconditions: ['Importe a imagem pelo painel Materiais e use o ID/caminho do projeto.'],
    lifecycle: 'Aguarde carregamento, trate falha e descarte a imagem ao encerrar.',
    limits:
      'Trocar arte não deve alterar colisão por acidente. Phaser procedural exige integração explícita da textura.',
    checks: [
      'Mover e virar para os dois lados; conferir cada animação.',
      'Falha de imagem, pausa e reinício preservam os controles.',
    ],
    terms: /sprite|imagem|personagem|anima|pinta|atlas|textura|arte|isom[eé]tric/i,
    source: 'ai-game-spritesheets; vibe-isometric-sprites; generated-raster-asset-pipeline',
    advice:
      'Defina paleta, perspectiva, escala de exibição, frames, pivô e hitbox antes de gerar. Reuse IDs do manifesto; gere pelo Pinta existente, com revisão do usuário. Alpha deve ser real; mantenha tamanho dos quadros e base alinhados. Confira animações, flip e colisão no jogo. Não copie assets sem licença nem execute scripts/providers baixados.',
  },
  {
    id: 'model',
    label: 'Personagem 3D e animação',
    steps: [
      'Confira bounds e nomes dos clips do material.',
      'Configure caminho, altura e animação na configuração.',
      'Use o ator clonado da ModelLibrary; mantenha sua atualização no loop.',
    ],
    preconditions: ['Importe um GLB pelo Molda/Materiais; confirme orientação e escala no jogo.'],
    lifecycle:
      'Descarte ator e mixer antes da biblioteca; resultados tardios precisam ser liberados.',
    limits: 'Não invente clips; clones compartilham recursos GPU que pertencem à biblioteca.',
    checks: [
      'Modelo apoiado no chão, escala e clip corretos.',
      'Sair durante carga e reiniciar não duplicam atores.',
    ],
    terms: /modelo|molda|glb|gltf|esqueleto|personagem|anima|3d|clip/i,
    source: 'threejs-builder; Forest Census; catálogo glTF',
    advice:
      'Use bounds e clips reais do manifesto, glTF Y-up e base no chão. Não invente orientação frontal ou nome de animação. Cache por URL/hash, SkeletonUtils.clone e mixer por ator; descarte esqueletos próprios e recursos compartilhados pelo dono. Meça draw calls/texturas e valide importação, animação, cancelamento e export.',
  },
  {
    id: 'audio',
    label: 'Sons de coleta e acerto',
    steps: [
      'Crie um banco com createSoundBank(ui) e registre um caminho local em define.',
      'Chame effect no evento confirmado, uma vez; use music para a trilha.',
      'Guarde o banco no controlador e chame dispose ao encerrar.',
    ],
    preconditions: ['Tenha um áudio local dos Materiais e um evento de jogo identificado.'],
    lifecycle:
      'O banco acompanha pausa/resultado e gesto de ativação; dispose remove vozes e assinaturas.',
    limits: 'Até 16 IDs, 4 efeitos simultâneos e uma música; volume entre 0 e 1.',
    checks: [
      'Som inicia desligado; ativar, silenciar e pausar funcionam.',
      'Arquivo ausente avisa; sair libera as vozes.',
    ],
    terms: /[aá]udio|m[uú]sica|som|sons|volume|efeito sonoro/i,
    source: 'audio-implementation; PirateInvaders',
    advice:
      'Mapeie eventos para música/efeitos, com canais e volume separados, mute inicial e gesto explícito para ativar. Limite vozes e arquivos em memória; pare/retome música e elimine efeitos ao pausar. Falha de carregamento deve ser visível e não impedir jogar. Pistas críticas também precisam de texto/forma. Use caminhos de Materiais; nunca autoplay externo.',
  },
  {
    id: 'hud',
    label: 'HUD e energia',
    steps: [
      'Escolha um valor que a regra já possui: energia, pontos ou objetivo.',
      'Encontre a atualização do HUD no controlador e altere a mensagem.',
      'Se precisar de uma regra nova, implemente-a no modelo antes de exibi-la.',
    ],
    preconditions: ['Defina o que o número significa e de onde vem; o desenho não decide dano.'],
    lifecycle:
      'Atualize quando o valor mudar e reinicie junto com a partida; remova listeners na saída.',
    limits: 'Evite anúncio a cada frame e não dependa somente de cor ou animação.',
    checks: [
      'Valor acompanha a regra e zera/restaura no reinício.',
      'Texto legível em 360 px; estado final anunciado uma vez.',
    ],
    terms: /hud|energia|vida|pontua|menu|interface|bot[aã]o|[ií]cone|painel|nine.?slice/i,
    source: 'tinyswords-tilemap; ui-animation-pipeline',
    advice:
      'Mantenha HUD legível em 360 px e paisagem, alvos de toque de 44 px, foco visível e área segura. Ações precisam de nomes, estados e teclado; mensagens de turno/erro devem ser textuais. Nine-slice usa bordas explícitas sem esticar cantos. Feedback curto, cancelável e sem movimento obrigatório; redesenhe texto apenas quando mudar.',
  },
  {
    id: 'accessibility',
    label: 'Controles e acessibilidade',
    steps: [
      'Identifique a ação lógica e os caminhos de teclado/toque.',
      'Mantenha rótulo, foco visível e alternativas visuais ao som.',
      'Confira as transições de pausa, resultado e retorno à aba.',
    ],
    preconditions: ['Teste sem mouse e escolha uma ação por vez.'],
    lifecycle: 'Limpe ações pendentes nas transições e descarte listeners junto com o input.',
    limits: 'Respeite movimento reduzido; uma tecla mantida na pausa exige nova ação.',
    checks: [
      'Navegar e jogar por teclado; testar toque.',
      'Foco, contraste e pausa; sem anúncio repetido por frame.',
    ],
    terms: /acess|contraste|dalt[oô]n|toque|teclado|controle|movimento reduzido/i,
    source: 'accessibility-design; onboarding; input abstraction',
    advice:
      'Não dependa só de cor, som ou precisão de mouse. Ofereça ações equivalentes por teclado/toque, forma e texto, pausa e som desligável. Respeite reduced-motion e foco. Limite repetições durante fases bloqueadas; uma tecla mantida na pausa precisa ser solta antes de agir. Registre limitações de acessibilidade sem afirmar conformidade por uma captura.',
  },
  {
    id: 'level',
    label: 'Fase, mapa e caminhos',
    steps: [
      'Localize o cenário e anote início, percurso e objetivo.',
      'Altere uma posição ou região e confira ocupação/colisão.',
      'Jogue do início ao fim antes de aumentar o cenário.',
    ],
    preconditions: ['Preserve uma rota possível com as regras e controles atuais.'],
    lifecycle: 'Reconstrua o cenário no reinício sem deixar objetos da partida anterior.',
    limits: 'Distância visual não prova alcance de salto, movimento ou ataque.',
    checks: [
      'Cantos, bloqueios, caminho de vitória e derrota.',
      'Reinício restaura o mapa; câmera mantém o objetivo visível.',
    ],
    terms: /n[ií]vel|fase|mapa|terreno|labirinto|plataforma|arena|caminho/i,
    source: 'level-design; PocketBomber; Oakwoods',
    advice:
      'Desenhe início, percurso, oportunidade de aprender, pressão, descanso e objetivo. Valide caminhos com ocupação/regras reais, não só distância em linha reta. Compare salto e lacunas, alcance e rota de fuga, câmera e marcos. Use seeds repetíveis e provas de vitória/derrota/reinício antes de aumentar o mapa.',
  },
  {
    id: 'balance',
    label: 'Ondas e dificuldade',
    steps: [
      'Escolha uma medida: duração, dano, velocidade ou número de adversários.',
      'Altere um parâmetro existente da configuração, mantendo seus limites.',
      'Compare partidas repetíveis e registre o efeito observado.',
    ],
    preconditions: [
      'Confira quais parâmetros existem neste kit; nem todo kit possui ondas ou energia.',
    ],
    lifecycle: 'Parâmetros valem na nova partida; não duplique recompensas ao atingir o resultado.',
    limits: 'Preserve pools e limites validados; não compense atraso acelerando a simulação.',
    checks: [
      'Extremos configuráveis, vitória, derrota e reinício.',
      'Sem travamento nem entidade/recompensa ilimitada.',
    ],
    terms:
      /balance|dif[ií]cil|dificuldade|f[aá]cil|moeda|recompensa|progress[aã]o|dano|vida|ondas/i,
    source: 'progression-design; economy-balancing; combat patterns',
    advice:
      'Escolha uma hipótese mensurável: tempo até vencer, dano, erros recuperáveis ou moedas por turno. Parametrize limites e altere uma variável por revisão. Recompensas não se repetem após morte/resultado; recrutamento não cria loop infinito. Moedas são fictícias do jogo, sem compras/ads. Teste extremos, softlocks e partida sem recursos antes de aprovar.',
  },
  {
    id: 'narrative',
    label: 'Missão e objetivo',
    steps: [
      'Escreva um objetivo curto com uma condição observável.',
      'Localize a regra de resultado e alinhe as instruções exibidas.',
      'Se adicionar diálogo, defina quando abre, fecha e bloqueia ações.',
    ],
    preconditions: ['Use a missão escolhida pelo aluno; não invente conclusão no Pensa.'],
    lifecycle: 'Diálogo e resultado precisam de saída, reinício e limpeza de eventos.',
    limits: 'Texto de vitória não comprova regra implementada; confirme no modelo/controlador.',
    checks: [
      'Objetivo pode ser alcançado; derrota não anuncia vitória.',
      'Fechar/pular diálogo tem a mesma transição e devolve foco.',
    ],
    terms: /hist[oó]ria|miss[aã]o|di[aá]logo|narrativa|quest|pensa/i,
    source: 'narrative-design; Threejs Tactics phase/input gating',
    advice:
      'Traduza a missão autorizada do Pensa em objetivo curto, regra observável e texto adequado à idade. Diálogo usa fase explícita e bloqueia ações do jogo; pular/fechar tem a mesma transição de início. Preserve localização, foco e pausa; não invente conclusão ou progresso no Pensa a partir de uma captura.',
  },
  {
    id: 'camera',
    label: 'Câmera e enquadramento',
    terms: /c[aâ]mera|enquadramento|zoom|perspectiva/i,
    source: 'three-exploration; three-tactics; phaser-platformer',
    advice:
      'Leia a câmera real do controlador: perspectiva no jardim, ortográfica na tática e câmera da Scene no Phaser. Redimensionamento deve atualizar projeção e picking; preserve foco e movimento reduzido.',
    steps: [
      'Localize a criação e atualização da câmera no controlador.',
      'Ajuste posição/enquadramento com os limites reais do cenário.',
      'Atualize projeção no resize e confira seleção/toque.',
    ],
    preconditions: [
      'Confirme o tipo de câmera deste kit; não troque projeção sem ajustar picking.',
    ],
    lifecycle: 'Mantenha resize e invalidação existentes; desconecte observers ao encerrar.',
    limits: 'Evite movimento obrigatório e enquadramento que esconda objetivos.',
    checks: [
      'Redimensionar e alternar orientação sem distorção.',
      'Personagem, objetivo e casas selecionadas continuam visíveis.',
    ],
  },
  {
    id: 'lighting',
    label: 'Luz e materiais 3D',
    terms: /ilumina|material|sombra|brilho|luz|luzes/i,
    source: 'three-exploration; three-tactics',
    advice:
      'Os kits Three usam luz hemisférica e direcional com materiais compartilhados. Ajuste cores/intensidade existentes antes de criar novas luzes; projéteis de luz são objetos visuais, não luzes GPU. Preserve descarte e perfil reduzido.',
    steps: [
      'Localize luzes e materiais criados no controlador.',
      'Altere uma cor ou intensidade e compare a legibilidade.',
      'Preserve compartilhamento e o descarte de cada recurso.',
    ],
    preconditions: [
      'Use a cena Three atual; confira materiais recebidos do Molda antes de substituí-los.',
    ],
    lifecycle: 'Reutilize geometrias/materiais e descarte recursos pelo dono uma só vez.',
    limits: 'Não adicione sombras ou luz por projétil sem medir custo gráfico.',
    checks: [
      'Objetos e objetivos legíveis no perfil reduzido.',
      'Reinícios não aumentam geometria/material em memória.',
    ],
  },
] as const

type GuideId = (typeof taskGuides)[number]['id']

function recipeReferences(
  id: GuideId,
  template: StudioProTemplateMetadata,
): StudioProRecipeReference[] {
  const reference = (path: string, exportName: string): StudioProRecipeReference => ({
    path,
    exportName,
    typeReference: `typeof import('./${path.replace(/^src\//, '').replace(/\.ts$/, '')}').${exportName}`,
  })
  const config = reference(
    template.id === 'canvas-grid-arena'
      ? 'src/arena-config.ts'
      : template.id.endsWith('-tactics')
        ? 'src/tactics-config.ts'
        : 'src/config.ts',
    'config',
  )
  const game = reference(
    template.id === 'canvas-grid-arena'
      ? 'src/arena-game.ts'
      : template.id.endsWith('-tactics')
        ? `src/${template.id}.ts`
        : 'src/game.ts',
    'createGame',
  )
  const ui = reference('src/ui.ts', 'createUI')
  if (id === 'audio') return [reference('src/sound.ts', 'createSoundBank'), ui]
  if (id === 'accessibility') return [reference('src/input.ts', 'createInput'), ui]
  if (id === 'model') return [reference('src/assets.ts', 'ModelLibrary'), config, game]
  if (id === 'sprite' && template.id === 'canvas-survival')
    return [
      reference('src/characters.ts', 'characters'),
      reference('src/assets.ts', 'loadArenaAssets'),
      reference('src/render/canvas.ts', 'createCanvasRenderer'),
    ]
  if (id === 'hud' || id === 'narrative') return [ui, config, game]
  return [config, game]
}

function appliesTo(id: GuideId, template: StudioProTemplateMetadata): boolean {
  if (id === 'model') return template.id === 'three-exploration' || template.id === 'three-action'
  if (id === 'sprite')
    return ['canvas-survival', 'phaser-platformer', 'phaser-arcade'].includes(template.id)
  if (id === 'camera') return template.engine === 'three' || template.id === 'phaser-platformer'
  if (id === 'lighting') return template.engine === 'three'
  return true
}

/** One selector for tutor, builder and manual learning. Browse mode never expands prompt budgets. */
export function studioProTaskGuides(
  task: string,
  templateId?: unknown,
  mode: 'request' | 'browse' = 'request',
) {
  const template = studioProTemplate(templateId)
  if (templateId !== undefined && !template?.kitVersion) return []
  const bounded = task.slice(0, 4000)
  return taskGuides
    .filter(
      (guide) =>
        (!template || appliesTo(guide.id, template)) &&
        ((mode === 'browse' && !bounded.trim()) || guide.terms.test(bounded)),
    )
    .slice(0, mode === 'browse' ? taskGuides.length : 3)
    .map(({ id, source, advice, label, steps, preconditions, lifecycle, limits, checks }) => ({
      id,
      source,
      advice,
      ...(template
        ? {
            recipe: {
              label,
              steps,
              preconditions,
              lifecycle,
              limits,
              checks,
              references: recipeReferences(id, template),
            } satisfies StudioProLearningRecipe,
          }
        : {}),
    }))
}

export function studioProGameGuide(id: unknown, task = '') {
  const template = studioProTemplate(id)
  if (!template?.kitVersion) return undefined
  return {
    template: template.id,
    engine: template.engine,
    version: template.kitVersion,
    applicability:
      'O ID informa a origem do projeto; arquivos podem ter sido alterados. Confirme no código enviado antes de indicar funções ou linhas.',
    patterns: guides[template.id] ?? [],
    taskGuides: studioProTaskGuides(task, template.id).map(({ id, source, advice, recipe }) => ({
      id,
      source,
      advice,
      ...(recipe
        ? {
            references: recipe.references,
            preconditions: recipe.preconditions,
            lifecycle: recipe.lifecycle,
            limits: recipe.limits,
            checks: recipe.checks,
          }
        : {}),
    })),
    checks: [
      'npm run typecheck',
      'npm run build',
      'Iniciar, pausar, reiniciar, vencer/perder e retornar de outra aba; teclado e toque.',
    ],
    materials:
      'Pinta cria imagens e sprites; Molda cria modelos 3D; Pensa organiza objetivos. Use os adapters e caminhos do painel Materiais. Não invente arquivos, animações ou bibliotecas instaladas.',
  }
}
