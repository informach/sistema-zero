// Estudo editorial: lê o catálogo e grava apenas os anexos desta auditoria.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gameTwoDBlocks, gameTwoDToolboxCategory } from '../../packages/studio/src/official-extensions/game-2d/blocks'
import { gameTwoDExamples } from '../../packages/studio/src/official-extensions/game-2d/exampleCatalog'
import { buildWorkspaceStateFromIR } from '../../packages/studio/src/blockly/workspaceState'

const sourceRoot = 'C:/Users/tocha/Documents/fluxo-criativo/meus-produtos'
const courses = [
  ['Corre Dino', `${sourceRoot}/comunidade-dos-criadores/entregas/cursos/corre-dino/blocos-corre-dino.json`],
  ['O jogo do meu jeito', `${sourceRoot}/comunidade-dos-criadores/entregas/cursos/o-jogo-do-meu-jeito/blocos-o-jogo-do-meu-jeito.json`],
  ['Desafio primeiro jogo', `${sourceRoot}/desafio-primeiro-jogo/entregas/produto/blocos-desafio-primeiro-jogo.json`],
].map(([name, path]) => ({ name, path, blocks: JSON.parse(readFileSync(path, 'utf8')).blocks as string[] }))

const paths = new Map<string, string[]>()
function visitCategory(category: typeof gameTwoDToolboxCategory, parents: string[] = []) {
  const path = [...parents, category.name]
  for (const item of category.contents) {
    if (item.kind === 'block') paths.set(item.type, [...(paths.get(item.type) ?? []), path.join(' > ')])
    else visitCategory(item, path)
  }
}
visitCategory(gameTwoDToolboxCategory)
const evidence = new Map<string, Set<string>>()
function visitValue(value: unknown, example: string) {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) { for (const v of value) visitValue(v, example); return }
  const obj = value as Record<string, unknown>
  if (typeof obj.type === 'string' && obj.type.startsWith('sz_g2d_')) {
    const names = evidence.get(obj.type) ?? new Set<string>()
    names.add(example)
    evidence.set(obj.type, names)
  }
  for (const v of Object.values(obj)) visitValue(v, example)
}
for (const example of gameTwoDExamples) visitValue(buildWorkspaceStateFromIR(example.ir), example.name)

const sourceByType = new Map<string, string>()
const catalogDir = join(import.meta.dir, '../../packages/studio/src/official-extensions/game-2d')
for (const name of readdirSync(catalogDir).filter(n => n.startsWith('blockCatalog') || n === 'blocks.ts')) {
  const contents = readFileSync(join(catalogDir, name), 'utf8')
  for (const match of contents.matchAll(/type:\s*'(sz_g2d_[^']+)'/g)) {
    const line = contents.slice(0, match.index).split('\n').length
    sourceByType.set(match[1], `packages/studio/src/official-extensions/game-2d/${name}:${line}`)
  }
}

const destinationByCategory: Record<string, string> = {
  '🎮 Sprites': 'Sprites > Criar e trocar aparência',
  '📐 Posição & tamanho': 'Movimento > Posição e tamanho',
  '💨 Velocidade': 'Movimento > Velocidade',
  '📦 Muitos': 'Grupos > Criar e percorrer',
  '😈 Inimigos': 'Inimigos > Tipos e comportamentos',
  '🕹️ Movimento': 'Movimento > Movimentos prontos',
  '🎛️ Controles': 'Controles > Teclado, ações e toque',
  '💥 Colisões': 'Colisões > Encostar e bloquear',
  '⏱️ Tempo e repetição': 'Tempo > Quadros e intervalos',
  '🎯 Mira e contas': 'Sorteios > Números e posições',
  '❤️ Vida': 'Vida e placar > Vida',
  '✨ Aparência': 'Desenho e efeitos > Efeitos',
  '🎬 Animação': 'Sprites > Animação',
  '🎨 Desenho': 'Desenho e efeitos > Figuras',
  '🔊 Som': 'Som > Efeitos, melodias e arquivos',
  '🏆 Placar e HUD': 'Vida e placar > Indicadores e texto na tela',
  '📺 Telas e cenas': 'Jogo e telas > Telas e partida',
  '🗺️ Mapas': 'Cenários > Mapas',
  '🌍 Mundos': 'Cenários > Mundos e câmera',
  '🚩 Fases': 'Cenários > Fases e campanha',
  '🚀 Kit espaço': 'Kits prontos > Espaço',
  '🦕 Kit dino': 'Kits prontos > Dino',
  '🦍 Kit gorilas': 'Kits prontos > Gorilas',
  '🤸 Kit equilibrista': 'Kits prontos > Equilibrista',
  '🎈 Kit balão': 'Kits prontos > Balão',
}
type Assessment = { decision?: string; destination?: string; rationale: string; replacement?: string; priority?: string }
const assessed = new Map<string, Assessment>()
function assess(ids: string, value: Assessment) { for (const id of ids.split(' ')) assessed.set(`sz_g2d_${id}`, value) }
assess('collides', { decision: 'RETIRAR DA OFERTA NOVA', rationale: 'Redundância pedagógica: atribuição de variável mais pergunta touches; manter declaração, escopo e avaliação única nos projetos antigos.', replacement: 'sz_g2d_touches + variável', priority: 'P1' })
assess('circle_collides', { decision: 'RETIRAR APÓS SUBSTITUTO', rationale: 'A geometria circular é útil; retirar somente a forma que obriga guardar numa variável, após oferecer pergunta circular e codec equivalente.', replacement: 'nova pergunta de colisão circular + variável', priority: 'P1' })
assess('score', { decision: 'RETIRAR DA OFERTA NOVA', rationale: 'Cria variável; a linguagem já oferece variáveis e incremento. Preservar IR e API anteriores.', replacement: 'sz_js_var_create + sz_js_var_increment', priority: 'P1' })
assess('play_shoot play_explosion play_jump play_dino_hurt play_collect play_whistle play_boom', { decision: 'CONSOLIDAR EM PRESET', destination: 'Som > Efeitos prontos', rationale: 'playFx já despacha os mesmos helpers; kits podem oferecer o mesmo bloco com opção preenchida. IDs e parsers antigos continuam aceitos.', replacement: 'sz_g2d_play_fx (opção equivalente)', priority: 'P1' })
assess('stop_music', { decision: 'RETIRAR DA OFERTA NOVA', rationale: 'Para somente a melodia sintetizada; stop_track para ambas. Não converter automaticamente código antigo: o alcance é diferente.', replacement: 'sz_g2d_stop_track para autoria nova', priority: 'P1' })
assess('game_over', { decision: 'AJUSTAR', rationale: 'Somente desenha mensagem e anuncia; não encerra a simulação. Nome proposto: Escrever mensagem de fim de jogo. Oferecer receita de vitória/derrota.', priority: 'P0' })
assess('set_opacity', { decision: 'AJUSTAR', destination: 'Sprites > Aparência', rationale: 'Valor 100 significa opaco, embora o rótulo diga transparência. Nome proposto: Deixar o sprite ... % visível; preservar os valores históricos.', priority: 'P0' })
assess('set_size scale_sprite', { decision: 'AJUSTAR', destination: 'Movimento > Posição e tamanho', rationale: 'Tamanho absoluto e multiplicação acumulativa são diferentes; explicitar que multiplicar repetidamente faz crescer a cada quadro.', priority: 'P1' })
assess('set_position', { destination: 'Movimento > Posição e tamanho', rationale: 'Colocar leitura e alteração da posição juntas; preservar coordenadas e origem.' })
assess('set_velocity apply_velocity apply_gravity set_gravity', { decision: 'AJUSTAR', destination: 'Movimento > Velocidade e gravidade', rationale: 'Definir valor, alterar velocidade e mover posição são efeitos distintos. Expor unidades, ordem e frequência sem inserir gravidade implícita.', priority: 'P0' })
assess('bounce_edges bounce_edge_pair paddle_bounce', { destination: 'Movimento > Bordas e rebatidas', rationale: 'Manter variantes: quatro bordas, par de bordas e raquete têm física e objetivos diferentes.' })
assess('clamp_to_screen wrap_edges', { destination: 'Movimento > Bordas e rebatidas', rationale: 'Conter e atravessar para o outro lado produzem resultados diferentes.' })
assess('aim_at move_toward angle_to distance rotate_sprite point_sprite thrust apply_friction sprite_angle', { destination: 'Movimento > Direção e distância', rationale: 'Agrupar o alvo e as medidas do movimento; manter operações distintas.' })
assess('stage_width stage_height setup_stage setup_full fit_screen stage_border', { decision: 'AJUSTAR', destination: 'Jogo e telas > Preparar a área do jogo', rationale: 'Separar resolução lógica e ocupação da janela; preservar coordenadas e padrões. Preparação não pertence à aparência de um sprite.', priority: 'P0' })
assess('set_scene scene_is show_screen show_image_screen', { decision: 'AJUSTAR', rationale: 'Separar estado atual da partida e desenho da interface; set_scene não pausa automaticamente simulação, temporizadores ou entradas.', priority: 'P0' })
assess('update_group apply_gravity_group', { decision: 'AJUSTAR', destination: 'Grupos > Movimento', rationale: 'update_group move usando velocidade; gravidade permanece explícita. Nomear a ação, não Atualizar genericamente.', priority: 'P0' })
assess('prune_old prune_offscreen clear_group remove_from_group add_to_group', { decision: 'AJUSTAR', destination: 'Grupos > Participação e limpeza', rationale: 'Remover vínculo com grupo não equivale a destruir um sprite; distinguir prazo, saída da tela e limpeza imediata.', priority: 'P1' })
assess('draw_group draw_group_by_y bring_to_front send_to_back', { destination: 'Grupos > Desenho e ordem', rationale: 'Ordem de desenho e pertencimento são conceitos distintos; preservar ordenação por base e suas implicações no clique.' })
assess('on_overlap touches on_group_overlap on_sprite_group_overlap', { decision: 'AJUSTAR', rationale: 'Distinguir evento ao começar, pergunta sobre agora e varredura a cada quadro; preservar ordem dos callbacks e remoção durante iteração.', priority: 'P0' })
assess('draw_hitbox set_hitbox_scale', { decision: 'AJUSTAR', destination: 'Colisões > Área de contato', rationale: 'Mostrar visualização junto da configuração; escala afeta detecção, não toda resolução física.', priority: 'P1' })
assess('cooldown_ready', { decision: 'AJUSTAR', rationale: 'A consulta já consome a recarga; não é pergunta pura. Preservar bloco antigo e propor comando com corpo que executa no máximo uma vez por intervalo, com chave por ação.', priority: 'P0' })
assess('banana_hit_city banana_hit_thrower', { decision: 'AJUSTAR', rationale: 'Perguntas consomem a banana; cidade também abre cratera e retorna verdadeiro ao sair da tela. Preservar legado; nova autoria precisa resolução explícita e resultado legível.', priority: 'P0' })
assess('create_text_sprite spawn_text_in_group set_sprite_text sprite_text set_text_style set_text_box set_sprite_data sprite_data on_sprite_click on_group_click', { rationale: 'Manter: criação dinâmica, aparência, dados e clique são capacidades distintas já disponíveis. Não acrescentar um bloco separado para números.' })
assess('set_text_style set_text_box sprite_text set_sprite_text', { destination: 'Sprites > Texto e números', rationale: 'Texto exibido separado dos dados; caixa controla quebra de linha, fundo e área de clique.' })
assess('set_sprite_data sprite_data', { destination: 'Sprites > Dados', rationale: 'Manter dados tipados separados do texto; as operações servem a qualquer sprite.' })
assess('flip_sprite', { destination: 'Sprites > Aparência', rationale: 'Espelhar aparência e direção visual não é girar o ângulo.' })
assess('create_shape_sprite set_shape', { destination: 'Sprites > Criar e trocar aparência', rationale: 'Criação de sprite com figura e troca de figura ficam junto das imagens; definir a figura continua em desenho.' })
assess('use_font', { destination: 'Jogo e telas > Fonte do jogo', rationale: 'Configuração global de fonte, não propriedade isolada de um sprite.' })
assess('set_backdrop draw_backdrop forest starfield', { destination: 'Cenários > Fundos', rationale: 'Fundos devem ser descobertos pelo propósito; kits mantêm atalhos. Configurar fundo e desenhá-lo são operações distintas.' })
assess('explode', { destination: 'Desenho e efeitos > Partículas', rationale: 'Explosão é efeito genérico usado também no Corre Dino; o kit Espaço pode oferecer atalho.' })
assess('draw_particles emit_particles flash shake draw_fade', { decision: 'AJUSTAR', destination: 'Desenho e efeitos > Efeitos', rationale: 'Explicitar geração, avanço e desenho de efeitos. draw_particles também avança partículas; fade desenha cobertura, não troca tela.', priority: 'P1' })
assess('show_fps', { destination: 'Desenho e efeitos > Inspecionar', rationale: 'Diagnóstico útil para aprender desempenho, em subseção secundária.' })
assess('platformer platformer_terrain classic_platformer jump_on_ground jump_terrain', { decision: 'AJUSTAR', destination: 'Movimento > Plataforma', rationale: 'Manter chão na borda, terreno confirmado e controlador clássico com gravidade própria separados; oferecer receitas de combinações válidas.', priority: 'P0' })
assess('top_down fly_free swim flap steer_thrust', { decision: 'AJUSTAR', rationale: 'Comportamentos diferentes: movimento direto, inércia, água, impulso e nave. Nomear o efeito físico e controles; não fundir por semelhança visual.', priority: 'P1' })
assess('define_enemy_type define_enemy_smart', { decision: 'AJUSTAR', rationale: 'Dez campos e fontes visuais simultâneas. Priorizar escolha de comportamento e aparência; defaults e opções adicionais explícitos. Não alterar forma serializada sem migração.', priority: 'P1' })
assess('update_enemy_type update_enemy_shells', { decision: 'AJUSTAR', rationale: 'Explicar quais comportamentos cada passo avança; casco tem atualização própria e não pode ser fundido sem prova de equivalência.', priority: 'P1' })
assess('animate_sprite animate_once load_spritesheet', { decision: 'AJUSTAR', rationale: 'A animação nomeada já preenche quadros. Explorar apresentação compacta, preservando números personalizados, entradas conectadas e repetição/execução única.', priority: 'P1' })
assess('draw_pixel_text draw_pixel_score', { decision: 'AJUSTAR', rationale: 'Estilo pixel não justifica automaticamente duplicação: texto pixel atualmente literal e placar computado têm contratos diferentes. Consolidar somente após expressão e layout equivalentes.', priority: 'P2' })
assess('play_music play_track play_clip load_sound set_volume stop_track', { decision: 'AJUSTAR', rationale: 'Nomear música pronta, arquivo e efeito; volume atual só afeta arquivos. Não prometer volume geral sem novo contrato.', priority: 'P0' })

const rows = gameTwoDBlocks.map(block => {
  const currentPaths = paths.get(block.type) ?? []
  const category = currentPaths[0]?.split(' > ').at(-1) ?? ''
  const assessment = assessed.get(block.type)
  const reason = assessment?.rationale ?? (block.hidden
    ? 'Compatibilidade já existente; conservar registro, codec e comportamento para projetos históricos.'
    : 'Manter a capacidade; reorganizar na família proposta. Ausência nos cursos ou exemplos não prova desuso.')
  const destination = block.hidden ? 'Compatibilidade > Blocos históricos' : assessment?.destination ?? destinationByCategory[category]
  if (!destination) throw new Error(`Destino ausente: ${block.type} / ${category}`)
  return {
    type: block.type, label: block.message0 ?? '', hidden: !!block.hidden,
    current_path: currentPaths.join(' || '), proposed_path: destination,
    decision: block.hidden ? 'MANTER COMPATIBILIDADE' : assessment?.decision ?? 'MANTER / REORGANIZAR',
    priority: assessment?.priority ?? 'P1', rationale: reason, replacement: assessment?.replacement ?? '',
    courses: courses.filter(c => c.blocks.includes(block.type)).map(c => c.name),
    local_examples: [...(evidence.get(block.type) ?? [])],
    evidence_scope: assessment ? 'catálogo e inspeção direcionada; uso externo não medido' : 'triagem editorial do catálogo; uso externo não medido',
    placement: block.placement ?? (block.output ? 'expression' : ''),
    source: sourceByType.get(block.type) ?? '',
    tooltip: block.tooltip ?? '',
  }
})
if (rows.length !== new Set(rows.map(r => r.type)).size) throw new Error('Tipos duplicados')
if (rows.some(r => !r.hidden && !r.current_path)) throw new Error('Bloco visível sem caminho')
const countBy = (field: keyof typeof rows[number]) => Object.fromEntries([...new Set(rows.map(r => String(r[field])))].map(key => [key, rows.filter(r => String(r[field]) === key).length]))
const summary = {
  definitions: rows.length, visible: rows.filter(r => !r.hidden).length, hidden: rows.filter(r => r.hidden).length,
  course_union_g2d: rows.filter(r => r.courses.length).length,
  course_union_all: new Set(courses.flatMap(c => c.blocks)).size,
  courses: courses.map(c => ({name:c.name,path:c.path,total:c.blocks.length,g2d:c.blocks.filter(b => b.startsWith('sz_g2d_')).length})),
  local_examples: gameTwoDExamples.length,
  types_in_local_examples: rows.filter(r => r.local_examples.length).length,
  types_without_local_examples: rows.filter(r => !r.local_examples.length).length,
  decisions: countBy('decision'),
  proposed_families: Object.fromEntries([...new Set(rows.filter(r => !r.hidden).map(r => r.proposed_path.split(' > ')[0]))].map(key => [key, rows.filter(r => !r.hidden && r.proposed_path.startsWith(`${key} > `)).length])),
  current_categories: gameTwoDToolboxCategory.contents.map(c => ({name:c.kind === 'category' ? c.name : c.type,count:c.kind === 'category' ? c.contents.length : 1})),
}
const csvHeaders = ['type','label','hidden','current_path','proposed_path','decision','priority','rationale','replacement','courses','local_examples','evidence_scope','placement','source'] as const
const quote = (v: unknown) => `"${String(Array.isArray(v) ? v.join(' | ') : v).replaceAll('"', '""')}"`
writeFileSync(join(import.meta.dir, 'inventory.csv'), '\uFEFF' + [csvHeaders.map(quote).join(','), ...rows.map(r => csvHeaders.map(k => quote(r[k])).join(','))].join('\r\n') + '\r\n')
writeFileSync(join(import.meta.dir, 'inventory.json'), JSON.stringify({summary, blocks:rows}, null, 2) + '\n')
console.log(JSON.stringify(summary, null, 2))
