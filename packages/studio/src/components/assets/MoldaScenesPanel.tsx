import type { OrcamentoDaCena } from '@sistemazero/molda-cenarios-core/compilar'
import type { CenaDisponivelParaStudio } from '@sistemazero/molda-cenarios-core/studio'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '#ui'
import { isPythonProject } from '../../core/editableProject'
import { lerAssetDeCena3D } from '../../core/scene3d/referencias'
import { normalizeSearchText } from '../../core/searchText'
import {
  MOLDA_SCENE_RUNTIME_MESSAGE,
  scene3DRuntimeCompatible,
  scene3DRuntimeReadsRelevo,
} from '../../runtime/scene3dCompatibility'
import { captureProjectStorageScope } from '../../state/projectStorageRuntime'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { useT } from '../../studio/i18n'
import type { StudioMoldaLibraryAdapter } from '../../studio/molda-library'
import { useStudioRuntimeEnvironment } from '../../studio/runtime-environment'

type Fonte = NonNullable<StudioMoldaLibraryAdapter['cenarios']>
type Lista =
  | { estado: 'carregando' }
  | { estado: 'erro'; mensagem: string }
  | { estado: 'pronta'; cenas: CenaDisponivelParaStudio[] }

export function MoldaScenesPanel({
  fonte,
  has3D,
  onImported,
}: {
  fonte: Fonte
  has3D: boolean
  onImported?: () => void
}) {
  const t = useT(),
    store = useProjectStoreApi(),
    projeto = useProjectStore((s) => s.project),
    author = useProjectStore((s) => s.editingAccess === 'author'),
    ambiente = useStudioRuntimeEnvironment(),
    [lista, setLista] = useState<Lista>({ estado: 'carregando' }),
    [recarga, setRecarga] = useState(0),
    [busca, setBusca] = useState(''),
    [ocupado, setOcupado] = useState<string | null>(null),
    [progresso, setProgresso] = useState(''),
    [erro, setErro] = useState<string | null>(null),
    [excesso, setExcesso] = useState<{
      cena: CenaDisponivelParaStudio
      orcamento: OrcamentoDaCena
    } | null>(null),
    [sucesso, setSucesso] = useState<{
      nome: string
      avisos: string[]
      bibliotecas: string[]
      modulo?: string
    } | null>(null),
    owner = useMemo(
      () => ({
        fonte,
        store,
        projectId: projeto?.id,
        controller: new AbortController(),
        ativo: true,
        ocupado: false,
      }),
      [fonte, store, projeto?.id],
    )
  useEffect(() => {
    if (owner.controller.signal.aborted) owner.controller = new AbortController()
    owner.ativo = true
    setOcupado(null)
    setErro(null)
    setExcesso(null)
    setSucesso(null)
    return () => {
      owner.ativo = false
      owner.controller.abort()
    }
  }, [owner])
  useEffect(() => {
    void recarga
    const controle = new AbortController(),
      scope = captureProjectStorageScope(),
      signal = AbortSignal.any([
        controle.signal,
        owner.controller.signal,
        ...(scope.signal ? [scope.signal] : []),
      ])
    setLista({ estado: 'carregando' })
    fonte.listar({ signal }).then(
      (cenas) => {
        if (!signal.aborted && scope === captureProjectStorageScope())
          setLista({ estado: 'pronta', cenas })
      },
      (e: unknown) => {
        if (!signal.aborted && scope === captureProjectStorageScope())
          setLista({
            estado: 'erro',
            mensagem: e instanceof Error ? e.message : t('moldaScenes.loadError'),
          })
      },
    )
    return () => controle.abort()
  }, [fonte, owner, recarga, t])
  const compativel =
      !projeto ||
      !isPythonProject(projeto) ||
      scene3DRuntimeCompatible(projeto.runtime, ambiente?.catalog),
    instalados = useMemo(
      () =>
        new Set(
          (projeto?.assets ?? []).flatMap((a) => {
            if (a.kind !== 'scene3d') return []
            const d = lerAssetDeCena3D(a)
            return [`${d.cena.fonte.cenario}:${d.cena.fonte.revisao}`]
          }),
        ),
      [projeto?.assets],
    ),
    termo = normalizeSearchText(busca.trim()),
    cenas =
      lista.estado === 'pronta'
        ? lista.cenas.filter((c) =>
            normalizeSearchText(`${c.nome} ${c.jogo.nome} ${c.espaco.nome}`).includes(termo),
          )
        : []
  const trazer = async (cena: CenaDisponivelParaStudio, juntar = false) => {
    if (owner.ocupado || !owner.ativo || !author || !has3D || !compativel) return
    const capturado = store.getState().project,
      scope = captureProjectStorageScope(),
      lifetime = owner.controller.signal,
      signal = AbortSignal.any([
        lifetime,
        ...(scope.signal ? [scope.signal] : []),
        ...(ambiente?.signal ? [ambiente.signal] : []),
      ])
    if (!capturado) return
    const aberto = () =>
      owner.ativo &&
      !signal.aborted &&
      scope === captureProjectStorageScope() &&
      store.getState().project?.id === capturado.id
    const conferir = () => {
      signal.throwIfAborted()
      if (!aberto() || store.getState().project !== capturado)
        throw Error(t('moldaScenes.projectChanged'))
      if (store.getState().editingAccess !== 'author') throw Error(t('moldaScenes.readonly'))
    }
    owner.ocupado = true
    setOcupado(cena.id)
    setErro(null)
    setExcesso(null)
    setSucesso(null)
    setProgresso(t('moldaScenes.preparing'))
    let preparador: typeof import('../../core/scene3d/importar') | undefined
    try {
      conferir()
      const resultado = await fonte.preparar(cena.id, cena.revisao, {
        signal,
        juntar,
        // O relevo em campo (plano "Mundos de 2 km"): os motores 3D em JavaScript o leem; o
        // Python só com a versão do runtime que o declara (lote 6, `molda-scene-relevo-v1`).
        ...(!isPythonProject(capturado) ||
        scene3DRuntimeReadsRelevo(capturado.runtime, ambiente?.catalog)
          ? { relevo: 'campo' as const }
          : {}),
        progresso: (p) => {
          if (aberto())
            setProgresso(`${p.nome ?? t('moldaScenes.preparing')} · ${p.feitos}/${p.total}`)
        },
      })
      conferir()
      preparador = await import('../../core/scene3d/importar')
      conferir()
      const plano = await preparador.prepararImportacaoDeCena3D(capturado, resultado.pacote, {
        sinal: signal,
      })
      conferir()
      const falha = await store.getState().importScene3DBundle(plano, signal)
      if (falha) throw Error(falha)
      if (!aberto()) return
      const primario = plano.assets.find((a) => a.id === plano.assetId)
      setSucesso({
        nome: cena.nome,
        avisos: [...new Set([...resultado.avisos, ...(plano.avisos ?? [])])],
        bibliotecas: [
          ...new Set(
            resultado.pacote.cena.licencas.map(
              (l) => `${l.nome} · ${t(`moldaScenes.license.${l.licenca}`)}`,
            ),
          ),
        ],
        modulo: primario?.cena3dPython?.modulo,
      })
      onImported?.()
    } catch (e) {
      if (!aberto()) return
      if (preparador && e instanceof preparador.OrcamentoDeImportacaoDeCenaExcedido)
        setExcesso({ cena, orcamento: e.orcamento })
      setErro(e instanceof Error ? e.message : t('moldaScenes.importError'))
    } finally {
      if (owner.controller.signal === lifetime) {
        owner.ocupado = false
        if (owner.ativo) {
          setOcupado(null)
          setProgresso('')
        }
      }
    }
  }
  return (
    <section
      aria-label={t('moldaScenes.title')}
      className="flex min-w-0 flex-col gap-3 break-words"
    >
      <p className="text-sm text-sz-fg-soft">{t('moldaScenes.subtitle')}</p>
      {!compativel && (
        <p role="note" className="text-sm text-sz-fg-soft">
          {MOLDA_SCENE_RUNTIME_MESSAGE}
        </p>
      )}
      {!has3D && (
        <p role="note" className="text-sm text-sz-fg-soft">
          {t('moldaScenes.needs3d')}
        </p>
      )}
      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.currentTarget.value)}
        aria-label={t('moldaScenes.search')}
        placeholder={t('moldaScenes.search')}
        className="h-11 rounded-md border border-sz-border bg-sz-bg px-3 text-sm text-sz-fg"
      />
      {ocupado && (
        <p role="status" className="break-all text-sm text-sz-fg-soft">
          {progresso}
        </p>
      )}
      {erro && (
        <div role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm">
          <p>{erro}</p>
          <Button
            className="mt-2"
            variant="ghost"
            size="sm"
            disabled={ocupado !== null}
            onClick={() => {
              setErro(null)
              setExcesso(null)
              setRecarga((v) => v + 1)
            }}
          >
            {t('moldaScenes.refresh')}
          </Button>
        </div>
      )}
      {excesso?.orcamento.sugerirJuncao && (
        <section className="rounded-md border border-sz-border p-3">
          <p className="mb-2 text-sm text-sz-fg-soft">{t('moldaScenes.groupHint')}</p>
          <Button
            className="h-auto min-h-10 whitespace-normal"
            disabled={ocupado !== null}
            onClick={() => void trazer(excesso.cena, true)}
          >
            {t('moldaScenes.group')}
          </Button>
        </section>
      )}
      {sucesso && (
        <div role="status" className="rounded-md border border-emerald-500/40 p-3 text-sm">
          <p>{t('moldaScenes.imported', { name: sucesso.nome })}</p>
          <p className="mt-1 text-xs text-sz-fg-soft">{t('moldaScenes.licenses')}</p>
          {sucesso.bibliotecas.length > 0 && (
            <ul className="mt-1 list-disc pl-4 text-xs text-sz-fg-soft">
              {sucesso.bibliotecas.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
          {sucesso.modulo && (
            <p className="mt-2 break-all font-mono text-xs">
              from {sucesso.modulo.split('/').at(-1)?.slice(0, -3)} import carregar
            </p>
          )}
          {sucesso.avisos.length > 0 && (
            <details className="mt-2">
              <summary>{t('moldaScenes.notes')}</summary>
              <ul className="list-disc pl-5">
                {sucesso.avisos.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      {lista.estado === 'carregando' && (
        <p role="status" className="text-sm text-sz-fg-soft">
          {t('moldaScenes.loading')}
        </p>
      )}
      {lista.estado === 'erro' && (
        <div role="alert">
          <p className="mb-2 text-sm">{lista.mensagem}</p>
          <Button onClick={() => setRecarga((v) => v + 1)}>{t('moldaImport.retry')}</Button>
        </div>
      )}
      {lista.estado === 'pronta' && cenas.length === 0 && (
        <p className="text-sm text-sz-fg-soft">
          {t(lista.cenas.length ? 'moldaImport.noResults' : 'moldaScenes.empty')}
        </p>
      )}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cenas.map((cena) => {
          const adicionado = instalados.has(`${cena.id}:${cena.revisao}`)
          return (
            <li
              key={cena.id}
              className="flex flex-col gap-2 rounded-md border border-sz-border bg-sz-panel-soft p-3"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="relative flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-sz-bg text-3xl"
                >
                  🏝️
                  {cena.miniatura && (
                    <img
                      src={cena.miniatura}
                      alt=""
                      width={64}
                      height={48}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.hidden = true
                      }}
                    />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold" title={cena.nome}>
                    {cena.nome}
                  </p>
                  <p className="text-xs text-sz-fg-soft">
                    {cena.jogo.nome} · {t('moldaScenes.revision', { n: cena.revisao })}
                  </p>
                  <p className="text-xs text-sz-fg-soft">{cena.espaco.nome}</p>
                </div>
              </div>
              <Button
                size="sm"
                disabled={adicionado || ocupado !== null || !author || !has3D || !compativel}
                onClick={() => void trazer(cena)}
              >
                {adicionado
                  ? t('moldaImport.inProject')
                  : ocupado === cena.id
                    ? t('moldaImport.adding')
                    : t('moldaImport.add')}
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
