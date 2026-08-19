/**
 * Catálogo ÚNICO dos atalhos de AÇÃO do editor (08/2026, pedido dela: "os atalhos
 * dos programas profissionais, o Ctrl+G do Illustrator, o X do Aseprite").
 *
 * As LETRAS de ferramenta (P lápis, V selecionar…) continuam nos catálogos de
 * cada caixa (`useToolShortcuts`); aqui moram as combinações de AÇÃO — e é
 * daqui que saem tanto o listener (`useActionShortcuts`, pelo `combo`) quanto a
 * janela "Atalhos" (pelo `label`/`section`/`editors`). Um id, uma tecla, um
 * texto: mudar o atalho aqui muda a ajuda junto.
 *
 * ⚠️ Combos que já existem em listeners próprios (Ctrl+Z/Y, Ctrl+C/X/V/D/A,
 * Delete, setas, Espaço) NÃO são religados por aqui: entram no catálogo só para
 * a ajuda LISTAR (`bound: false`) — o listener deles é o de sempre.
 */
import { COPY } from './copy'
import { isToolAllowed } from './toolCuration'

export type ShortcutEditor = 'pixel' | 'vector' | 'tilemap'
export type ShortcutSection = 'edit' | 'select' | 'arrange' | 'view' | 'frames' | 'layers' | 'help'

export interface ShortcutEntry {
  id: string
  /** "Ctrl+Shift+G", "Shift+H", "X", "?", "F3", "Ctrl+]"… (Cmd = Ctrl no Mac). */
  combo: string
  label: string
  section: ShortcutSection
  editors: readonly ShortcutEditor[]
  /** `false` = só aparece na ajuda (o listener é o histórico, fora deste catálogo). */
  bound?: false
  /**
   * Combinação MOSTRADA (e válida) no Mac quando a padrão é reservada lá: Cmd+Shift+[ e
   * Cmd+Shift+] trocam de aba no Chrome e no Safari (não dá para prevenir). O listener
   * já aceita o Ctrl físico no Mac (`ctrlKey || metaKey`), então "Control+Shift+]" casa
   * sem código a mais — só a ajuda precisa mostrar a tecla certa.
   */
  macCombo?: string
  /**
   * Id da CURADORIA da caixa (`allowTools` das aulas) que governa esta ação: quando a
   * professora esconde a ferramenta/botão, o atalho some da ajuda e o listener não roda.
   */
  curationId?: string
}

const ALL: readonly ShortcutEditor[] = ['pixel', 'vector', 'tilemap']
const PIXEL: readonly ShortcutEditor[] = ['pixel']
const VECTOR: readonly ShortcutEditor[] = ['vector']
const PIXEL_VECTOR: readonly ShortcutEditor[] = ['pixel', 'vector']

const S = COPY.shortcuts.labels

/** Ordem das seções na janela de ajuda. */
export const SHORTCUT_SECTIONS: ReadonlyArray<{ id: ShortcutSection; title: string }> = [
  { id: 'edit', title: COPY.shortcuts.sections.edit },
  { id: 'select', title: COPY.shortcuts.sections.select },
  { id: 'arrange', title: COPY.shortcuts.sections.arrange },
  { id: 'view', title: COPY.shortcuts.sections.view },
  { id: 'frames', title: COPY.shortcuts.sections.frames },
  { id: 'layers', title: COPY.shortcuts.sections.layers },
  { id: 'help', title: COPY.shortcuts.sections.help },
]

export const SHORTCUT_CATALOG = [
  // ── Editar (os históricos, listados; os novos, ligados) ────────────────
  { id: 'undo', combo: 'Ctrl+Z', label: S.undo, section: 'edit', editors: ALL, bound: false },
  { id: 'redo', combo: 'Ctrl+Y', label: S.redo, section: 'edit', editors: ALL, bound: false },
  {
    id: 'copy',
    combo: 'Ctrl+C',
    label: S.copy,
    section: 'edit',
    editors: PIXEL_VECTOR,
    bound: false,
    curationId: 'select',
  },
  {
    id: 'cut',
    combo: 'Ctrl+X',
    label: S.cut,
    section: 'edit',
    editors: PIXEL,
    bound: false,
    curationId: 'select',
  },
  {
    id: 'paste',
    combo: 'Ctrl+V',
    label: S.paste,
    section: 'edit',
    editors: PIXEL_VECTOR,
    bound: false,
    curationId: 'select',
  },
  {
    id: 'duplicate',
    combo: 'Ctrl+D',
    label: S.duplicate,
    section: 'edit',
    editors: PIXEL,
    bound: false,
    curationId: 'select',
  },
  {
    id: 'duplicateShapes',
    combo: 'Ctrl+D',
    label: S.duplicateShapes,
    section: 'edit',
    editors: VECTOR,
  },
  { id: 'delete', combo: 'Delete', label: S.delete, section: 'edit', editors: ALL, bound: false },
  { id: 'swapColors', combo: 'X', label: S.swapColors, section: 'edit', editors: PIXEL },
  {
    id: 'swapFillStroke',
    combo: 'Shift+X',
    label: S.swapFillStroke,
    section: 'edit',
    editors: VECTOR,
  },
  {
    id: 'flipFrameH',
    combo: 'Shift+H',
    label: S.flipFrameH,
    section: 'edit',
    editors: PIXEL,
    curationId: 'flipH',
  },
  {
    id: 'flipFrameV',
    combo: 'Shift+V',
    label: S.flipFrameV,
    section: 'edit',
    editors: PIXEL,
    curationId: 'flipV',
  },
  {
    id: 'rotateFrame',
    combo: 'Shift+R',
    label: S.rotateFrame,
    section: 'edit',
    editors: PIXEL,
    curationId: 'rotate',
  },
  { id: 'flipShapesH', combo: 'Shift+H', label: S.flipShapesH, section: 'edit', editors: VECTOR },
  { id: 'flipShapesV', combo: 'Shift+V', label: S.flipShapesV, section: 'edit', editors: VECTOR },
  // ── Selecionar ─────────────────────────────────────────────────────────
  {
    id: 'selectAll',
    combo: 'Ctrl+A',
    label: S.selectAll,
    section: 'select',
    editors: PIXEL_VECTOR,
    bound: false,
    curationId: 'select',
  },
  {
    id: 'deselect',
    combo: 'Ctrl+Shift+A',
    label: S.deselect,
    section: 'select',
    editors: PIXEL_VECTOR,
    bound: false,
    curationId: 'select',
  },
  {
    id: 'deselectShapes',
    combo: 'Esc',
    label: S.deselectShapes,
    section: 'select',
    editors: VECTOR,
  },
  { id: 'nudge', combo: 'Setas', label: S.nudge, section: 'select', editors: VECTOR, bound: false },
  {
    id: 'nudgeFar',
    combo: 'Shift+Setas',
    label: S.nudgeFar,
    section: 'select',
    editors: VECTOR,
    bound: false,
  },
  // ── Organizar (vetor) ──────────────────────────────────────────────────
  { id: 'group', combo: 'Ctrl+G', label: S.group, section: 'arrange', editors: VECTOR },
  { id: 'ungroup', combo: 'Ctrl+Shift+G', label: S.ungroup, section: 'arrange', editors: VECTOR },
  { id: 'forward', combo: 'Ctrl+]', label: S.forward, section: 'arrange', editors: VECTOR },
  { id: 'backward', combo: 'Ctrl+[', label: S.backward, section: 'arrange', editors: VECTOR },
  {
    id: 'toFront',
    combo: 'Ctrl+Shift+]',
    macCombo: 'Ctrl+Shift+]',
    label: S.toFront,
    section: 'arrange',
    editors: VECTOR,
  },
  {
    id: 'toBack',
    combo: 'Ctrl+Shift+[',
    macCombo: 'Ctrl+Shift+[',
    label: S.toBack,
    section: 'arrange',
    editors: VECTOR,
  },
  // Trancar/esconder no idioma do Figma (Ctrl+Shift+L / Ctrl+Shift+H), não do Illustrator
  // (Ctrl+2/Ctrl+3 são troca de aba no navegador) nem Ctrl+H/Ctrl+L: no Mac "Cmd no lugar
  // de Ctrl" faria Cmd+H ESCONDER O NAVEGADOR (é do sistema) e Cmd+L pular para a barra de
  // endereço. A MESMA tecla faz o inverso sem seleção (destrancar tudo / mostrar tudo):
  // nada de Alt+Shift+letra — no Windows com dois teclados instalados (ABNT2 + americano,
  // comum em casa de quem programa) Alt+Shift TROCA O IDIOMA do teclado junto, e a criança
  // perde o ç e os acentos sem entender por quê.
  { id: 'lock', combo: 'Ctrl+Shift+L', label: S.lock, section: 'arrange', editors: VECTOR },
  { id: 'hide', combo: 'Ctrl+Shift+H', label: S.hide, section: 'arrange', editors: VECTOR },
  // ── Ver ────────────────────────────────────────────────────────────────
  { id: 'zoomIn', combo: 'Ctrl+=', label: S.zoomIn, section: 'view', editors: ALL },
  { id: 'zoomOut', combo: 'Ctrl+-', label: S.zoomOut, section: 'view', editors: ALL },
  {
    id: 'zoomReset',
    combo: 'Ctrl+0',
    label: S.zoomReset,
    section: 'view',
    editors: ['pixel', 'tilemap'],
  },
  { id: 'zoomFit', combo: 'Ctrl+0', label: S.zoomFit, section: 'view', editors: VECTOR },
  {
    id: 'grid',
    combo: "Ctrl+'",
    label: S.grid,
    section: 'view',
    editors: PIXEL_VECTOR,
    curationId: 'grid',
  },
  {
    id: 'mirrorH',
    combo: 'Alt+M',
    label: S.mirrorH,
    section: 'view',
    editors: PIXEL,
    curationId: 'mirror',
  },
  // Alt+W: o M de cabeça para baixo (e sem Alt+Shift, ver acima).
  {
    id: 'mirrorV',
    combo: 'Alt+W',
    label: S.mirrorV,
    section: 'view',
    editors: PIXEL,
    curationId: 'mirrorV',
  },
  { id: 'onion', combo: 'F3', label: S.onion, section: 'view', editors: PIXEL_VECTOR },
  // Segurar Espaço = Mão só existe no palco VETORIAL (o mapa não tem esse gesto).
  { id: 'pan', combo: 'Espaço', label: S.pan, section: 'view', editors: VECTOR, bound: false },
  // ── Quadros (personagem animado, pixel e vetor) ────────────────────────
  { id: 'nextFrame', combo: '.', label: S.nextFrame, section: 'frames', editors: PIXEL_VECTOR },
  { id: 'prevFrame', combo: ',', label: S.prevFrame, section: 'frames', editors: PIXEL_VECTOR },
  { id: 'addFrame', combo: 'Alt+N', label: S.addFrame, section: 'frames', editors: PIXEL_VECTOR },
  {
    id: 'duplicateFrame',
    combo: 'Alt+C',
    label: S.duplicateFrame,
    section: 'frames',
    editors: PIXEL_VECTOR,
  },
  { id: 'playPause', combo: 'Enter', label: S.playPause, section: 'frames', editors: PIXEL_VECTOR },
  // ── Camadas (pixel) ────────────────────────────────────────────────────
  { id: 'addLayer', combo: 'Shift+N', label: S.addLayer, section: 'layers', editors: PIXEL },
  // ── Ajuda ──────────────────────────────────────────────────────────────
  { id: 'help', combo: '?', label: S.help, section: 'help', editors: ALL },
] as const satisfies readonly ShortcutEntry[]

export type ShortcutId = (typeof SHORTCUT_CATALOG)[number]['id']

/** `combo` por id — o que os listeners ligam (nunca escrever a tecla à mão). */
export function shortcut(id: ShortcutId): string {
  const entry = SHORTCUT_CATALOG.find((s) => s.id === id)
  // O tipo garante que existe; o fallback é só para o TS.
  return entry?.combo ?? ''
}

/**
 * As entradas que valem para o editor aberto, na ordem do catálogo — e, com a
 * curadoria das aulas (`allowTools`), só as das ferramentas que a professora deixou.
 */
export function shortcutsFor(
  editor: ShortcutEditor,
  allowTools?: readonly string[],
): ShortcutEntry[] {
  // `as const` deixa cada `editors` como tupla literal; alargar para a união é o
  // que permite o `includes` com um `ShortcutEditor` qualquer.
  return SHORTCUT_CATALOG.filter((s) => {
    if (!(s.editors as readonly ShortcutEditor[]).includes(editor)) return false
    const curationId = (s as ShortcutEntry).curationId
    return curationId === undefined || isToolAllowed(allowTools, curationId)
  })
}

/**
 * Traduz "Ctrl+Shift+G" numa lista de teclas para exibir ("Ctrl", "Shift",
 * "G"). No Mac o Ctrl é mostrado como Cmd e o Alt como Option (o listener
 * aceita os dois), e Delete/Backspace são o mesmo ⌫. `keepCtrl` mostra o
 * Control FÍSICO do Mac (para as combinações em que o Cmd é reservado).
 */
export function comboKeys(combo: string, mac = false, opts: { keepCtrl?: boolean } = {}): string[] {
  return combo.split('+').map((part) => {
    if (!mac) return part
    if (part === 'Ctrl') return opts.keepCtrl ? 'Control' : 'Cmd'
    if (part === 'Alt') return 'Option'
    if (part === 'Delete') return '⌫'
    return part
  })
}

/** As teclas a MOSTRAR para uma entrada: no Mac, a alternativa (`macCombo`) quando houver. */
export function entryKeys(
  entry: Pick<ShortcutEntry, 'combo' | 'macCombo'>,
  mac: boolean,
): string[] {
  if (mac && entry.macCombo) return comboKeys(entry.macCombo, true, { keepCtrl: true })
  return comboKeys(entry.combo, mac)
}
