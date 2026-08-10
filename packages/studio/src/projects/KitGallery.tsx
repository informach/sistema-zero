import type { JSX } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { ulid } from 'ulid'
import { buildWorkspaceStateFromIR } from '#blockly'
import { t as defaultT, type ExampleExperience, type Translator } from '#core'
import {
  type ExtensionExample,
  type ExtensionExampleDifficulty,
  loadExtensionExampleCatalogs,
} from '#extensions'
import { generateProjectFiles } from '#generators'
import type { SZIRV2 } from '#ir'
import { OFFICIAL_CATALOG } from '#official-extensions'
import { createEmptyProject, type Project, type ProjectAsset } from '../core/project'
import { normalizeSearchText } from '../core/searchText'
import { CORE_EXAMPLES } from '../examples/core'
import { persistProject } from '../state/persistence'
import { useT } from '../studio/i18n'

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
  difficulty?: ExtensionExampleDifficulty
  concepts?: readonly string[]
  genre?: string
  recommendedOrder?: number
  featured?: boolean
  /** Assets que o exemplo embute (ex.: imagem de fundo por CSS). */
  assets?: readonly ProjectAsset[]
}

export interface KitGroup {
  extensionId: string
  label: string
  entries: KitEntry[]
}

export interface KitGalleryFilters {
  query: string
  difficulty: 'all' | ExtensionExampleDifficulty
  experience: 'all' | ExampleExperience
}

const EXPERIENCE_BADGE_CLASS: Record<ExampleExperience, string> = {
  game: 'sz-kit-badge-game',
  demo: 'sz-kit-badge-demo',
  exploration: 'sz-kit-badge-exploration',
}

const DIFFICULTY_BADGE_CLASS: Record<ExtensionExampleDifficulty, string> = {
  beginner: 'sz-kit-badge-beginner',
  intermediate: 'sz-kit-badge-intermediate',
  advanced: 'sz-kit-badge-advanced',
}

export function filterKitGroups(
  groups: readonly KitGroup[],
  filters: KitGalleryFilters,
): KitGroup[] {
  const query = normalizeSearchText(filters.query.trim())
  return groups.flatMap((group) => {
    const entries = group.entries.filter((entry) => {
      if (filters.difficulty !== 'all' && entry.difficulty !== filters.difficulty) return false
      if (filters.experience !== 'all' && entry.experience !== filters.experience) return false
      if (!query) return true
      const searchable = normalizeSearchText(
        [entry.name, entry.description, entry.genre, ...(entry.concepts ?? [])]
          .filter(Boolean)
          .join(' '),
      )
      return searchable.includes(query)
    })
    return entries.length > 0 ? [{ ...group, entries }] : []
  })
}

/** Emoji decorativo por nome de exemplo (novo/renomeado cai no controle 🎮). */
const KIT_EMOJI: Record<string, string> = {
  'Pegue a moeda': '💰',
  Pong: '🏓',
  'Pong Profissional': '🎾',
  'Pong (na mão)': '🥎',
  'Mundo Pirata': '🏴‍☠️',
  'Mundo Pirata Profissional': '⚓',
  'Mundo Pirata (na mão)': '🦜',
  'Safári de Monstros': '🥾',
  'Safári de Monstros Profissional': '🫎',
  'Safári de Monstros (na mão)': '🪤',
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
  'Batalha de Monstrinhos': '🔥',
  'Batalha de Monstrinhos Profissional': '🐾',
  'Batalha de Monstrinhos (na mão)': '🧪',
  'Aventura do Herói': '🗡️',
  'Aventura do Herói Profissional': '🌲',
  'Aventura do Herói (na mão)': '🧭',
  'Labirinto dos Robôs': '🦾',
  'Labirinto dos Robôs Profissional': '🔦',
  'Labirinto dos Robôs (na mão)': '👻',
  'Mundo de Blocos': '⛏️',
  'Mundo de Blocos Profissional': '🏗️',
  'Mundo de Blocos (na mão)': '🪵',
  'Chuva de Meteoros': '🌠',
  'Chuva de Meteoros Profissional': '💫',
  'Chuva de Meteoros (na mão)': '🌌',
  Sobrevivente: '🧛',
  'Sobrevivente Profissional': '🩸',
  'Sobrevivente (na mão)': '⚰️',
  'Fazenda Feliz': '🌱',
  'Fazenda Feliz Profissional': '🚿',
  'Fazenda Feliz (na mão)': '🥕',
  'Herói que Evolui': '⬆️',
  'Herói que Evolui Profissional': '📈',
  'Herói que Evolui (na mão)': '🧮',
  'Patrulha Espacial': '🛰️',
  'Patrulha Espacial Profissional': '💥',
  'Atravesse a Rua Profissional': '🐤',
  'Patrulha Espacial (na mão)': '🔭',
  'Muralha do Reino': '🏯',
  'Muralha do Reino Profissional': '🏹',
  'Muralha do Reino (na mão)': '🧌',
  'Escalada do Guerreiro': '🧗',
  'Escalada do Guerreiro Profissional': '🪜',
  'Escalada do Guerreiro (na mão)': '⛰️',
  'Duelo de Heróis': '🤺',
  'Duelo de Heróis Profissional': '🥋',
  'Duelo de Heróis (na mão)': '👊',
  'Portas do Castelo': '🚪',
  'Portas do Castelo Profissional': '🤴',
  'Portas do Castelo (na mão)': '🗝️',
  'Vale Ensolarado': '🌻',
  'Vale Ensolarado Profissional': '☀️',
  'Vale Ensolarado (na mão)': '💎',
  'Vila Ninja': '🗾',
  'Vila Ninja Profissional': '🍃',
  'Vila Ninja (na mão)': '🏘️',
  'Treinador de Criaturas': '🥚',
  'Treinador de Criaturas Profissional': '🦎',
  'Treinador de Criaturas (na mão)': '🔴',
  'Guerra de Gorilas': '🦍',
  'Guerra de Gorilas vs Robô': '🤖',
  Equilibrista: '🌉',
  Balão: '🎈',
  'Aventura com câmera': '🎥',
  'Caça-moedas profissional': '🪙',
  'Arena dos Goblins': '👹',
  'Defesa da Torre': '🏰',
  'Defesa da Torre Profissional': '🧙',
  'Defesa da Torre (na mão)': '⚡',
  'Reunir o Rebanho': '🐑',
  'Reunir o Rebanho Profissional': '🐕',
  'Reunir o Rebanho (na mão)': '🌾',
  'A Lenda do Herói': '🗡️',
  'A Lenda do Herói Profissional': '🐉',
  'A Lenda do Herói (na mão)': '⚔️',
  'Caça Estelar': '🚀',
  'Caça Estelar Profissional': '🛸',
  'Caça Estelar (na mão)': '💫',
  'Cerco na Base': '🔫',
  'Cerco na Base Profissional': '👾',
  'Cerco na Base (na mão)': '💥',
  'Mina de Cristais': '💎',
  'Mina de Cristais Profissional': '⚒️',
  'Mina de Cristais (na mão)': '🪨',
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
  'Reino Aberto': '🗺️',
  'Batalha em Equipe': '⚔️',
  'Meu primeiro jogo': '🕹️',
  Cobrinha: '🐍',
  'Quebra-blocos': '🧨',
  'O Chefao': '😈',
  'O Chefao da Ficha': '🐲',
  'Corrida de Tabuleiro': '🎲',
  'Jogo da Memoria': '🎴',
  'Duelo de Cartas': '🃏',
  'Boneco de formas': '🪆',
  'Noite enevoada': '🌙',
  'Enxame que gira': '🐝',
  'Torre maluca': '🗼',
  'Corrida Maluca': '🏎️',
  'Atravesse a Rua': '🐔',
  'Desvie dos blocos': '🚧',
  'Cubo girando': '🧊',
  'Passeio 3D (na mão)': '🚗',
  'Atravesse a Rua (na mão)': '🐣',
  'Corrida Maluca (na mão)': '🚙',
  'Meu Mundo': '🌍',
  'Corrida do Por do Sol': '🏁',
  'Corrida Maluca Profissional': '🚦',
  'Boliche na Praca': '🎳',
  'Inverno Magico': '❄️',
  'Ilha dos Criadores': '🏝️',
  'Parque dos Brinquedos': '🎠',
  'Vila das Vocacoes': '🏙️',
  'Base da Lua': '🌕',
  Fazendinha: '🚜',
}

function toEntry(
  prefix: string,
  name: string,
  description: string,
  experience: ExampleExperience,
  ir: SZIRV2,
  assets?: readonly ProjectAsset[],
  metadata?: Pick<
    ExtensionExample,
    'difficulty' | 'concepts' | 'genre' | 'recommendedOrder' | 'featured'
  >,
): KitEntry {
  return {
    key: `${prefix}:${name}`,
    name,
    description,
    experience,
    ir,
    emoji: KIT_EMOJI[name] ?? '🎮',
    assets,
    difficulty: metadata?.difficulty,
    concepts: metadata?.concepts,
    genre: metadata?.genre,
    recommendedOrder: metadata?.recommendedOrder,
    featured: metadata?.featured,
  }
}

export interface KitGroupsResult {
  groups: KitGroup[]
  failedExtensionIds: string[]
}

export async function buildKitGroupsResult(t: Translator = defaultT): Promise<KitGroupsResult> {
  const catalogs = await loadExtensionExampleCatalogs(OFFICIAL_CATALOG)
  const groups = catalogs.loaded.flatMap(([extensionId, examples]) => {
    const ext = OFFICIAL_CATALOG.find((candidate) => candidate.manifest.id === extensionId)
    if (!ext) return []
    const label =
      ext.manifest.id === 'game-2d'
        ? t('kits.group.game2d')
        : ext.manifest.id === 'game-3d'
          ? t('kits.group.game3d')
          : ext.manifest.name
    return [
      {
        extensionId,
        label,
        entries: examples.map((example) =>
          toEntry(
            ext.manifest.id,
            example.name,
            example.description ?? '',
            example.experience,
            example.ir,
            example.assets,
            example,
          ),
        ),
      },
    ]
  })
  if (CORE_EXAMPLES.length > 0) {
    groups.push({
      extensionId: 'core',
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
  return { groups, failedExtensionIds: catalogs.failed.map((failure) => failure.extensionId) }
}

export async function buildKitGroups(t: Translator = defaultT): Promise<KitGroup[]> {
  return (await buildKitGroupsResult(t)).groups
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

function KitCard({
  entry,
  creating,
  step,
  onPick,
}: {
  entry: KitEntry
  creating: string | null
  step?: number
  onPick: (entry: KitEntry) => void
}): JSX.Element {
  const t = useT()
  return (
    <button
      type="button"
      disabled={creating !== null}
      onClick={() => onPick(entry)}
      className="flex h-full min-h-28 w-full flex-col items-start gap-1 rounded-lg border border-sz-border bg-sz-panel p-3 text-left transition-colors hover:border-sz-accent disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex w-full items-start justify-between gap-2">
        <span className="flex items-center gap-2">
          {step !== undefined ? (
            <span className="grid size-6 place-items-center rounded-full bg-sz-accent text-xs font-bold text-white">
              {step}
            </span>
          ) : null}
          <span aria-hidden className="text-2xl">
            {entry.emoji}
          </span>
        </span>
        <span className="flex flex-wrap justify-end gap-1">
          {entry.difficulty ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${DIFFICULTY_BADGE_CLASS[entry.difficulty]}`}
            >
              {t(`kits.difficulty.${entry.difficulty}`)}
            </span>
          ) : null}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${EXPERIENCE_BADGE_CLASS[entry.experience]}`}
          >
            {t(`kits.experience.${entry.experience}`)}
          </span>
        </span>
      </span>
      <span className="text-sm font-semibold text-sz-fg">
        {creating === entry.key ? t('kits.creating') : entry.name}
      </span>
      {entry.description ? (
        <span className="line-clamp-2 text-xs text-sz-fg-soft">{entry.description}</span>
      ) : null}
      {entry.genre || entry.concepts?.length ? (
        <span className="mt-auto flex flex-wrap gap-1 pt-1 text-[10px] text-sz-fg-soft">
          {entry.genre ? <span className="font-semibold">{entry.genre}</span> : null}
          {(entry.concepts ?? []).slice(0, 2).map((concept) => (
            <span key={concept} className="rounded bg-sz-bg px-1.5 py-0.5">
              {concept}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  )
}

export function KitGallery({
  onOpenProject,
}: {
  onOpenProject: (projectId: string) => void
}): JSX.Element {
  const t = useT()
  const [creating, setCreating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [groups, setGroups] = useState<KitGroup[] | null>(null)
  const [catalogError, setCatalogError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState<'all' | ExtensionExampleDifficulty>('all')
  const [experience, setExperience] = useState<'all' | ExampleExperience>('all')
  const [showAllGameTwoD, setShowAllGameTwoD] = useState(false)

  useEffect(() => {
    // A tentativa é um nonce explícito: cada incremento refaz apenas este carregamento.
    void loadAttempt
    let active = true
    setCatalogError(false)
    void buildKitGroupsResult(t).then(({ groups: nextGroups, failedExtensionIds }) => {
      if (!active) return
      setGroups(nextGroups)
      setCatalogError(failedExtensionIds.length > 0)
    })
    return () => {
      active = false
    }
  }, [loadAttempt, t])

  const hasActiveFilters = query.trim() !== '' || difficulty !== 'all' || experience !== 'all'
  const featuredEntries = useMemo(
    () =>
      (groups ?? [])
        .find((group) => group.extensionId === 'game-2d')
        ?.entries.filter((entry) => entry.featured)
        .sort(
          (left, right) =>
            (left.recommendedOrder ?? Number.MAX_SAFE_INTEGER) -
            (right.recommendedOrder ?? Number.MAX_SAFE_INTEGER),
        ) ?? [],
    [groups],
  )
  const filteredGroups = useMemo(
    () => filterKitGroups(groups ?? [], { query, difficulty, experience }),
    [groups, query, difficulty, experience],
  )
  const visibleGroups = useMemo(
    () =>
      filteredGroups.filter(
        (group) => group.extensionId !== 'game-2d' || hasActiveFilters || showAllGameTwoD,
      ),
    [filteredGroups, hasActiveFilters, showAllGameTwoD],
  )

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
      {groups === null && !catalogError ? (
        <p role="status" aria-live="polite" className="text-sm text-sz-fg-soft">
          {t('kits.loading')}
        </p>
      ) : null}
      {catalogError ? (
        <div role="alert" className="flex items-center gap-3 text-sm text-sz-error">
          <span>{t('kits.loadError')}</span>
          <button
            type="button"
            className="sz-touch-target font-semibold text-sz-accent hover:underline"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
          >
            {t('kits.retry')}
          </button>
        </div>
      ) : null}
      {groups !== null ? (
        <div className="grid gap-3 rounded-lg border border-sz-border bg-sz-panel/50 p-3 sm:grid-cols-[minmax(12rem,1fr)_auto_auto] sm:items-end">
          <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-sz-fg-soft">
            {t('kits.search.label')}
            <input
              type="search"
              name="kit-search"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={t('kits.search.placeholder')}
              className="sz-touch-target h-9 min-w-0 rounded-md border border-sz-border bg-sz-bg px-3 text-sm font-normal text-sz-fg outline-none focus:border-sz-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-sz-fg-soft">
            {t('kits.filter.difficulty')}
            <select
              name="kit-difficulty"
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.currentTarget.value as 'all' | ExtensionExampleDifficulty)
              }
              className="sz-touch-target h-9 rounded-md border border-sz-border bg-sz-bg px-2 text-sm font-normal text-sz-fg"
            >
              <option value="all">{t('kits.filter.all')}</option>
              <option value="beginner">{t('kits.difficulty.beginner')}</option>
              <option value="intermediate">{t('kits.difficulty.intermediate')}</option>
              <option value="advanced">{t('kits.difficulty.advanced')}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-sz-fg-soft">
            {t('kits.filter.experience')}
            <select
              name="kit-experience"
              value={experience}
              onChange={(event) =>
                setExperience(event.currentTarget.value as 'all' | ExampleExperience)
              }
              className="sz-touch-target h-9 rounded-md border border-sz-border bg-sz-bg px-2 text-sm font-normal text-sz-fg"
            >
              <option value="all">{t('kits.filter.all')}</option>
              <option value="game">{t('kits.experience.game')}</option>
              <option value="demo">{t('kits.experience.demo')}</option>
              <option value="exploration">{t('kits.experience.exploration')}</option>
            </select>
          </label>
        </div>
      ) : null}
      {!hasActiveFilters && featuredEntries.length > 0 ? (
        <div className="sz-kit-content-group flex flex-col gap-2 rounded-xl border border-sz-accent/40 bg-sz-accent/5 p-3">
          <div>
            <h4 className="text-sm font-semibold text-sz-fg">{t('kits.path.title')}</h4>
            <p className="text-xs text-sz-fg-soft">{t('kits.path.subtitle')}</p>
          </div>
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featuredEntries.map((entry, index) => (
              <li key={entry.key} className="h-full">
                <KitCard
                  entry={entry}
                  creating={creating}
                  step={index + 1}
                  onPick={(picked) => void handlePick(picked)}
                />
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="sz-touch-target self-start text-xs font-semibold text-sz-accent hover:underline"
            aria-expanded={showAllGameTwoD}
            onClick={() => setShowAllGameTwoD((showAll) => !showAll)}
          >
            {showAllGameTwoD ? t('kits.path.hideAll') : t('kits.path.showAll')}
          </button>
        </div>
      ) : null}
      {groups !== null && hasActiveFilters && visibleGroups.length === 0 ? (
        <p role="status" className="text-sm text-sz-fg-soft">
          {t('kits.noResults')}
        </p>
      ) : null}
      {visibleGroups.map((group) => (
        <div key={group.label} className="sz-kit-content-group flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-sz-fg-soft">
            {group.label}
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {group.entries.map((entry) => (
              <KitCard
                key={entry.key}
                entry={entry}
                creating={creating}
                onPick={(picked) => void handlePick(picked)}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
