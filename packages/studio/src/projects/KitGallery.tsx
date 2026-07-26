import type { JSX } from 'react'
import { useMemo, useState } from 'react'
import { ulid } from 'ulid'
import { buildWorkspaceStateFromIR } from '#blockly'
import { type ExampleExperience, t } from '#core'
import { generateProjectFiles } from '#generators'
import type { SZIRV2 } from '#ir'
import { OFFICIAL_CATALOG } from '#official-extensions'
import { createEmptyProject, type Project, type ProjectAsset } from '../core/project'
import { CORE_EXAMPLES } from '../examples/core'
import { persistProject } from '../state/persistence'

/**
 * Vitrine "Que jogo você quer criar?" (07/2026): a descoberta de kit deixou de
 * exigir abrir o modal técnico de Extensões — cards visuais dos EXEMPLOS das
 * extensões oficiais (+ clássicos) que criam um projeto NOVO já com o jogo
 * montado em blocos e o abrem no editor. Monta o `Project` direto sobre a
 * persistência (`createEmptyProject` + IR do exemplo + `persistProject`),
 * espelhando o `handleLoadExample` do ExtensionsPanel sem tocar o projectStore;
 * o StudioCore re-registra os blocos da extensão no load.
 */
export interface KitEntry {
  key: string
  name: string
  description: string
  ir: SZIRV2
  emoji: string
  experience: ExampleExperience
  /** Assets que o exemplo embute (ex.: imagem de fundo por CSS). */
  assets?: readonly ProjectAsset[]
}

const EXPERIENCE_BADGE_CLASS: Record<ExampleExperience, string> = {
  game: 'bg-sz-accent/15 text-sz-accent',
  demo: 'bg-sz-warn/15 text-sz-warn',
  exploration: 'bg-sz-cyan/15 text-sz-cyan',
}

/** Emoji decorativo por nome de exemplo (novo/renomeado cai no controle 🎮). */
const KIT_EMOJI: Record<string, string> = {
  'Pegue a moeda': '💰',
  'Pong simples': '🏓',
  'Herói que anda': '🏃',
  'Mini plataforma': '🦘',
  'Sala com paredes': '🧱',
  'Nave contra Asteroides': '🚀',
  'Asteroides clássico': '☄️',
  'Dino Run': '🦕',
  'Dino Corredor': '🌵',
  'Dino Corredor Profissional': '🦖',
  'Dino Corredor (na mão)': '🦴',
  'Corrida Infinita 3D': '🛣️',
  'Corrida Infinita Profissional': '👟',
  'Corrida Infinita (na mão)': '🛤️',
  'Guerra de Gorilas': '🦍',
  'Guerra de Gorilas vs Robô': '🤖',
  Equilibrista: '🌉',
  Balão: '🎈',
  'Aventura com câmera': '🎥',
  'Caça-moedas profissional': '🪙',
  'Arena dos Goblins': '👹',
  'Defesa da Torre': '🏰',
  'Salto nas Nuvens': '☁️',
  'Parkour do Vulcão': '🌋',
  'Quadra Maluca': '🏀',
  'Guardião do Portal': '🌀',
  'Tiro ao Alvo': '🎯',
  'O Chefão das Sombras': '🌑',
  'Vila do Dragão': '👑',
  'Floresta Ninja': '🥷',
  'Salto na Floresta': '🌳',
  'Bichinhos do Quintal': '👾',
  'Invasão dos Óvnis': '🛸',
  'Duelo dos Bonecos': '🥊',
  'Defesa do Reino': '🛡️',
  'Reino Aberto': '🌍',
  'Batalha em Equipe': '⚔️',
  'Meu primeiro jogo': '🕹️',
  Cobrinha: '🐍',
  'Quebra-blocos': '🧱',
  'O Chefao': '👑',
  'O Chefao da Ficha': '🐲',
  'Corrida de Tabuleiro': '🎲',
  'Jogo da Memoria': '🃏',
  'Duelo de Cartas': '🃏',
  'Boneco de formas': '🪆',
  'Noite enevoada': '🌙',
  'Enxame que gira': '🐝',
  'Torre maluca': '🗼',
  'Corrida maluca': '🏎️',
  'Atravesse a rua': '🐔',
  'Desvie dos blocos': '🎯',
  'Cubo girando': '🧊',
  'Plataforma Vertical (na mão)': '🧗',
  'Portas do Castelo (na mão)': '🚪',
  'Defesa da Torre (na mão)': '🏹',
  'Duelo (na mão)': '🥊',
  'Passeio 3D (na mão)': '🚗',
  'Meu Mundo': '🌍',
  'Corrida do Por do Sol': '🏁',
  'Boliche na Praca': '🎳',
  'Inverno Magico': '❄️',
  'Ilha dos Criadores': '🏝️',
  'Parque dos Brinquedos': '🎠',
  'Vila das Vocacoes': '🏙️',
  'Base da Lua': '🚀',
  Fazendinha: '🚜',
}

function toEntry(
  prefix: string,
  name: string,
  description: string,
  experience: ExampleExperience,
  ir: SZIRV2,
  assets?: readonly ProjectAsset[],
): KitEntry {
  return {
    key: `${prefix}:${name}`,
    name,
    description,
    experience,
    ir,
    emoji: KIT_EMOJI[name] ?? '🎮',
    assets,
  }
}

export function buildKitGroups(): Array<{ label: string; entries: KitEntry[] }> {
  const groups: Array<{ label: string; entries: KitEntry[] }> = []
  for (const ext of OFFICIAL_CATALOG) {
    const label =
      ext.manifest.id === 'game-2d'
        ? t('kits.group.game2d')
        : ext.manifest.id === 'game-3d'
          ? t('kits.group.game3d')
          : ext.manifest.name
    groups.push({
      label,
      entries: ext.manifest.examples.map((example) =>
        toEntry(
          ext.manifest.id,
          example.name,
          example.description ?? '',
          example.experience,
          example.ir,
          example.assets,
        ),
      ),
    })
  }
  if (CORE_EXAMPLES.length > 0) {
    groups.push({
      label: t('kits.group.classic'),
      entries: CORE_EXAMPLES.map((example) =>
        toEntry(
          'core',
          example.name,
          example.description,
          example.experience,
          example.ir,
          example.assets,
        ),
      ),
    })
  }
  return groups
}

/** Projeto novo persistido a partir da IR do exemplo (registro independente). */
/**
 * Monta o projeto pelo mesmo caminho usado pelo clique da galeria. Exportado
 * apenas deste módulo para a auditoria interna; não integra a API pública.
 */
export function buildProjectFromKitEntry(entry: KitEntry): Project {
  const { name, ir, assets } = entry
  const project: Project = {
    ...createEmptyProject(ulid(), name),
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: name }),
    // Assets embutidos do exemplo (ex.: fundo por CSS) já nascem no projeto.
    ...(assets && assets.length > 0 ? { assets: [...assets] } : {}),
    installedExtensions: ir.extensions.map((ext) => ({
      id: ext.extensionId,
      version:
        OFFICIAL_CATALOG.find((c) => c.manifest.id === ext.extensionId)?.manifest.version ??
        '0.0.0',
      installedAt: Date.now(),
    })),
  }
  return project
}

/** Persiste um projeto montado pelo caminho único da galeria. */
async function createProjectFromExample(entry: KitEntry): Promise<Project> {
  const project = buildProjectFromKitEntry(entry)
  await persistProject(project)
  return project
}

export function KitGallery({
  onOpenProject,
}: {
  onOpenProject: (projectId: string) => void
}): JSX.Element {
  const [creating, setCreating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const groups = useMemo(buildKitGroups, [])

  async function handlePick(entry: KitEntry): Promise<void> {
    if (creating) return
    setCreating(entry.key)
    setError(null)
    try {
      const project = await createProjectFromExample(entry)
      onOpenProject(project.id)
    } catch {
      setError(t('kits.error'))
      setCreating(null)
    }
  }

  return (
    <section aria-label={t('kits.title')} className="flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold text-sz-fg">{t('kits.title')}</h3>
        <p className="text-xs text-sz-fg-soft">{t('kits.subtitle')}</p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-sz-error">
          {error}
        </p>
      ) : null}
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-sz-fg-soft">
            {group.label}
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {group.entries.map((entry) => (
              <button
                key={entry.key}
                type="button"
                disabled={creating !== null}
                onClick={() => void handlePick(entry)}
                className="flex min-h-24 flex-col items-start gap-1 rounded-lg border border-sz-border bg-sz-panel p-3 text-left transition-colors hover:border-sz-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex w-full items-start justify-between gap-2">
                  <span aria-hidden className="text-2xl">
                    {entry.emoji}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${EXPERIENCE_BADGE_CLASS[entry.experience]}`}
                  >
                    {t(`kits.experience.${entry.experience}`)}
                  </span>
                </span>
                <span className="text-sm font-semibold text-sz-fg">
                  {creating === entry.key ? t('kits.creating') : entry.name}
                </span>
                {entry.description ? (
                  <span className="line-clamp-2 text-xs text-sz-fg-soft">{entry.description}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
