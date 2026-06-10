import type { JSX } from 'react'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useShallow } from 'zustand/react/shallow'
import { buildWorkspaceStateFromIR, isBlocksStateEmpty, layoutFromBlocksState } from '#blockly'
import { type InstalledExtension, t } from '#core'
import type { GeneratedFiles } from '#generators'
import { buildCssSourceMapFromText, generateProjectFilesWithMap } from '#generators'
import { deepEqualIR, irBlockStructureEqual } from '#ir'
import type { ParseProjectDiagnostic } from '#parsers'
import { extractInlineAssets } from '#parsers'
import { PREVIEW_MESSAGE_SOURCE } from '#preview'
import { BlocklyPanel } from '../components/blocks/BlocklyPanel'
import { FontSizeControls } from '../components/code/FontSizeControls'
import { MonacoTabs } from '../components/code/LazyMonacoTabs'
import { EditorSkeleton } from '../components/layout/LoadingViews'
import { ModeLimitationsNotice } from '../components/layout/ModeLimitationsNotice'
import { PreviewIframe } from '../components/preview/PreviewIframe'
import { useCrossHighlight } from '../hooks/useCrossHighlight'
import { useDebounced } from '../hooks/useDebounced'
import { useHighlightStore } from '../state/highlightStore'
import { useLogsStore } from '../state/logsStore'
import { useProjectStore, useProjectStoreApi } from '../state/projectStore'
import { CODE_FONT_SIZE_DEFAULT, useSettingsStore } from '../state/settingsStore'
import { useSourcemapStore } from '../state/sourcemapStore'
import { useUIStore } from '../state/uiStore'
import { useStudioTheme } from '../studio/theme'
import { BRIDGE_JS_HEADER, type BridgeReverseParseWorkerResponse } from './bridgeReverseParse'

const EMPTY_INSTALLED_EXTENSIONS: InstalledExtension[] = []
const MAX_BRIDGE_REVERSE_PARSE_CHARS = 500_000

/**
 * Modo Ponte: blocos à esquerda, Monaco à direita, preview à direita-direita
 * (opcional). Mudanças no Monaco fazem parse e atualizam IR/workspace sem
 * sobrescrever os arquivos digitados. Mudanças nos blocos seguem o fluxo
 * padrão (BlocklyPanel já atualiza files+IR).
 */
export function BridgeMode(): JSX.Element {
  const { hasProject, projectId, projectName, files, ir, blocksState, installedExtensions } =
    useProjectStore(
      useShallow((s) => ({
        hasProject: Boolean(s.project),
        projectId: s.project?.id,
        projectName: s.project?.name ?? 'Projeto',
        files: s.project?.files,
        ir: s.project?.ir ?? null,
        blocksState: s.project?.blocksState ?? null,
        installedExtensions: s.project?.installedExtensions ?? EMPTY_INSTALLED_EXTENSIONS,
      })),
    )
  const applyProjectState = useProjectStore((s) => s.applyProjectState)
  const projectStoreApi = useProjectStoreApi()
  const setFiles = useProjectStore((s) => s.setFiles)
  const showPreview = useUIStore((s) => s.showPreview)
  const setSourceMap = useSourcemapStore((s) => s.setMap)
  const pushLog = useLogsStore((s) => s.push)
  const codeFontSize = useSettingsStore((s) => s.codeFontSize)
  const studioTheme = useStudioTheme()
  const [parseDiagnostics, setParseDiagnostics] = useState<ParseProjectDiagnostic[]>([])

  // Source mapping cruzado bloco ↔ linha.
  const cross = useCrossHighlight()
  const selectedBlockId = useHighlightStore((s) => s.selectedBlockId)
  const selectionNonce = useHighlightStore((s) => s.selectionNonce)
  const highlightSource = useHighlightStore((s) => s.source)
  const monacoHighlight = useMemo(() => {
    if (highlightSource !== 'blocks' || !selectedBlockId) return null
    const entry = cross.lookupBlock(selectedBlockId)
    if (!entry) return null
    return {
      file: entry.file,
      startLine: entry.startLine,
      endLine: entry.endLine,
      startColumn: entry.startColumn,
      endColumn: entry.endColumn,
      nonce: selectionNonce,
    }
  }, [highlightSource, selectedBlockId, selectionNonce, cross])

  // O efeito que monta o sourcemap vive ABAIXO (depende de `debouncedCss`, que
  // é declarado mais adiante) — ver "Source map (HTML/JS canônico + CSS posicional)".

  const filesArray = useMemo(
    () =>
      files
        ? [
            { name: 'index.html', value: files['index.html'] },
            { name: 'style.css', value: files['style.css'] },
            { name: 'script.js', value: files['script.js'] },
          ]
        : [],
    [files],
  )
  const debouncedHtml = useDebounced(files?.['index.html'] ?? '', 900)
  const debouncedCss = useDebounced(files?.['style.css'] ?? '', 900)
  const debouncedJs = useDebounced(files?.['script.js'] ?? '', 900)

  // Source map (HTML/JS canônico + CSS posicional). HTML/JS continuam derivados
  // do `ir` (gerador canônico). Já as entradas de CSS são reconstruídas a partir
  // do TEXTO EXIBIDO (`style.css` do aluno), não do CSS canônico: assim o realce
  // bloco↔código cai na linha EXATA mesmo quando a formatação do aluno difere da
  // canônica (seletor multilinha como `html,\nbody {`, linhas em branco,
  // comentários, indentação). Sem isso, "código é sagrado" + geração canônica
  // divergiam e a seleção pulava de linha (clicar `margin` realçava `width`).
  // Depende de `debouncedCss` para recalcular quando só o texto muda (o IR pode
  // ficar igual pelo atalho deepEqualIR). Mescla `{ ...canônico, ...posicional }`:
  // o posicional sobrepõe só os ids que conseguiu resolver no texto; @media/raw e
  // ids não encontrados mantêm o canônico (nunca realça linha errada nos demais).
  useEffect(() => {
    if (!ir) {
      setSourceMap({})
      return
    }
    try {
      const { sourceMap } = generateProjectFilesWithMap({
        ir,
        projectName,
        jsHeader: BRIDGE_JS_HEADER,
      })
      if (debouncedCss.trim()) {
        const positionalCss = buildCssSourceMapFromText(debouncedCss, ir.css, 'style.css')
        setSourceMap({ ...sourceMap, ...positionalCss })
      } else {
        setSourceMap(sourceMap)
      }
    } catch {
      // Geração best-effort; em caso de erro mantém o sourcemap anterior.
    }
  }, [ir, projectName, debouncedCss, setSourceMap])

  const lastSnapshot = useRef<GeneratedFiles | null>(null)
  const lastReportedSyntaxError = useRef<string | null>(null)
  const lastReportedLargeProject = useRef(false)
  const reverseParseWorkerRef = useRef<Worker | null>(null)
  const reverseParseRequestSeq = useRef(0)
  const syntaxError = parseDiagnostics.find((diagnostic) => diagnostic.kind === 'syntaxError')

  useEffect(() => {
    const worker = new Worker(new URL('./bridgeReverseParseWorker.ts', import.meta.url), {
      type: 'module',
    })
    reverseParseWorkerRef.current = worker
    return () => {
      reverseParseRequestSeq.current += 1
      reverseParseWorkerRef.current = null
      worker.terminate()
    }
  }, [])

  // Ao entrar num projeto que TEM IR mas ainda não tem `blocksState` — ou tem
  // um `blocksState` VAZIO (sobra de um ciclo anterior em que o sanitizer
  // descartava o estado salvo) — deriva os blocos do IR. Sem isso, o
  // reverse-parse cairia no atalho "generated-match" (o IR já bate com os
  // arquivos) e nunca construiria os blocos: o aluno via o código mas não os
  // blocos até recortar/colar. Quando não há IR, o reverse-parse cuida.
  useEffect(() => {
    if (!hasProject || !ir) return
    if (!isBlocksStateEmpty(blocksState)) return
    if (ir.html.length === 0 && ir.css.length === 0 && ir.js.length === 0) return
    applyProjectState({ blocksState: buildWorkspaceStateFromIR(ir) })
  }, [hasProject, blocksState, ir, applyProjectState])

  // Centraliza erros de sintaxe no Console — evitamos painel próprio para
  // que todo aviso/erro da IDE viva num só lugar.
  useEffect(() => {
    const message = syntaxError?.message ?? null
    if (message === lastReportedSyntaxError.current) return
    lastReportedSyntaxError.current = message
    if (!message) return
    pushLog({
      source: PREVIEW_MESSAGE_SOURCE,
      kind: 'error',
      parts: [`Erro de sintaxe: ${message}`],
      timestamp: Date.now(),
    })
  }, [syntaxError, pushLog])

  // Reverso: ao mudar arquivos, reparse → atualiza IR (que regenera arquivos
  // no próximo ciclo? Não — em modo Ponte, o blocosToFiles vem dos blocos,
  // então só atualizamos IR. UI/Blocks reagirão à mudança do IR via load.
  useEffect(() => {
    if (!hasProject) return
    const reverseParseChars = debouncedHtml.length + debouncedCss.length + debouncedJs.length
    if (reverseParseChars > MAX_BRIDGE_REVERSE_PARSE_CHARS) {
      setParseDiagnostics([])
      if (!lastReportedLargeProject.current) {
        pushLog({
          source: PREVIEW_MESSAGE_SOURCE,
          kind: 'warn',
          parts: [
            'Projeto muito grande: sincronização código -> blocos pausada para manter a interface responsiva.',
          ],
          timestamp: Date.now(),
        })
        lastReportedLargeProject.current = true
      }
      return
    }
    lastReportedLargeProject.current = false

    const worker = reverseParseWorkerRef.current
    if (!worker) return

    const last = lastSnapshot.current
    if (
      last &&
      last['index.html'] === debouncedHtml &&
      last['style.css'] === debouncedCss &&
      last['script.js'] === debouncedJs
    ) {
      return
    }
    const currentFiles: GeneratedFiles = {
      'index.html': debouncedHtml,
      'style.css': debouncedCss,
      'script.js': debouncedJs,
    }
    lastSnapshot.current = currentFiles
    const requestId = reverseParseRequestSeq.current + 1
    reverseParseRequestSeq.current = requestId
    worker.onmessage = (event: MessageEvent<BridgeReverseParseWorkerResponse>) => {
      const message = event.data
      if (message.requestId !== reverseParseRequestSeq.current) return
      if ('error' in message) {
        pushLog({
          source: PREVIEW_MESSAGE_SOURCE,
          kind: 'error',
          parts: [`Erro ao sincronizar código -> blocos: ${message.error}`],
          timestamp: Date.now(),
        })
        return
      }

      const result = message.result
      setParseDiagnostics(result.diagnostics)
      // O sourcemap é responsabilidade do efeito acima (derivado do `ir` do
      // store): quando este handler adota um novo `ir`, o efeito regenera o
      // sourcemap com as chaves certas. Nos atalhos abaixo o `ir` exibido não
      // muda, então o sourcemap atual continua válido.
      if (result.kind !== 'parsed' || !result.ir) {
        return
      }
      if (deepEqualIR(result.ir, ir)) {
        return
      }
      // Mudança só na casca (head/doctype) ou nos ids — os blocos não representam
      // isso. Atualiza a casca SEM reconstruir o workspace, preservando o layout
      // do aluno (ex.: colunas separadas de JS) em edições cosméticas no código.
      if (ir && irBlockStructureEqual(result.ir, ir)) {
        applyProjectState({ ir: { ...ir, htmlShell: result.ir.htmlShell } })
        return
      }
      // Preserva o layout das colunas (várias pilhas do mesmo tipo) derivando-o
      // do blocksState atual (lido fresco do store, evitando closure obsoleta) e
      // re-aplicando ao workspace reconstruído.
      const layout = layoutFromBlocksState(projectStoreApi.getState().project?.blocksState ?? null)
      if (!layout) {
        // Sem layout, `buildWorkspaceStateFromIR` aplica defaults (x = 32, 452, 872).
        // Avisar aqui torna visível quando o reverse-parse é a causa do "layout
        // volta às colunas" — útil pra distinguir do drop pelo sanitizer.
        console.warn('[sz] reverse-parse rebuild sem layout — posições serão resetadas.')
      }
      applyProjectState({
        ir: result.ir,
        blocksState: buildWorkspaceStateFromIR(result.ir, { layout }),
      })
    }
    worker.onerror = (event) => {
      if (requestId !== reverseParseRequestSeq.current) return
      pushLog({
        source: PREVIEW_MESSAGE_SOURCE,
        kind: 'error',
        parts: [`Erro no worker de sincronização: ${event.message}`],
        timestamp: Date.now(),
      })
    }
    // O HTML é parseado AQUI, na main thread, porque depende do `DOMParser`
    // nativo — que não existe em `WorkerGlobalScope`. `extractInlineAssets`
    // também resolve de onde vêm CSS/JS (arquivo externo vs. `<style>`/`<script>`
    // inline) e grava o `placement` na casca. O resultado (objetos planos)
    // viaja serializável ao worker, que faz o trabalho pesado (Babel/CSS).
    let assets: ReturnType<typeof extractInlineAssets>
    try {
      assets = extractInlineAssets(debouncedHtml, debouncedCss, debouncedJs)
    } catch (err) {
      worker.onmessage = null
      worker.onerror = null
      pushLog({
        source: PREVIEW_MESSAGE_SOURCE,
        kind: 'error',
        parts: [
          `Erro ao sincronizar código -> blocos: ${err instanceof Error ? err.message : String(err)}`,
        ],
        timestamp: Date.now(),
      })
      return
    }

    worker.postMessage({
      requestId,
      files: currentFiles,
      html: assets.html,
      htmlShell: assets.htmlShell,
      cssSource: assets.cssSource,
      jsSource: assets.jsSource,
      ir,
      projectName,
      installedExtensionIds: installedExtensions.map((extension) => extension.id),
    })

    return () => {
      if (requestId !== reverseParseRequestSeq.current) return
      worker.onmessage = null
      worker.onerror = null
    }
  }, [
    applyProjectState,
    debouncedHtml,
    debouncedCss,
    debouncedJs,
    hasProject,
    installedExtensions,
    ir,
    projectName,
    pushLog,
  ])

  if (!hasProject) return <div />

  return (
    <div className="flex h-full w-full min-h-0 flex-col">
      <ModeLimitationsNotice />
      <PanelGroup direction="horizontal" className="min-h-0 w-full flex-1">
        <Panel defaultSize={35} minSize={20}>
          <BlocklyPanel />
        </Panel>
        <PanelResizeHandle className="sz-resize-handle sz-resize-handle--vertical" />
        <Panel defaultSize={showPreview ? 35 : 65} minSize={20}>
          <Suspense fallback={<EditorSkeleton message="Carregando editor de código…" />}>
            <MonacoTabs
              files={filesArray}
              modelPathPrefix={projectId}
              theme={studioTheme === 'light' ? 'light' : 'vs-dark'}
              fontSize={codeFontSize || CODE_FONT_SIZE_DEFAULT}
              formatLabel={t('editor.format')}
              tabsRightSlot={<FontSizeControls />}
              onChange={(name, value) => {
                if (
                  files &&
                  (name === 'index.html' || name === 'style.css' || name === 'script.js')
                ) {
                  setFiles({ ...files, [name]: value })
                }
              }}
              highlight={monacoHighlight}
              // Sincronização só no sentido bloco→código: selecionar/editar o
              // texto NÃO seleciona blocos (decisão de UX — evita o canvas pular
              // e o acoplamento atrapalhar a edição). Por isso não passamos
              // `onCursorChange` (que publicaria o cursor como fonte 'editor').
            />
          </Suspense>
        </Panel>
        {showPreview && (
          <>
            <PanelResizeHandle className="sz-resize-handle sz-resize-handle--vertical" />
            <Panel defaultSize={30} minSize={15}>
              <PreviewIframe />
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  )
}
