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
import { useStudioConfig } from '../studio/config'
import { useStudioTheme } from '../studio/theme'
import { BRIDGE_JS_HEADER, type BridgeReverseParseWorkerResponse } from './bridgeReverseParse'

const EMPTY_INSTALLED_EXTENSIONS: InstalledExtension[] = []
const MAX_BRIDGE_REVERSE_PARSE_CHARS = 500_000

/**
 * Decide se um resultado código->blocos do worker está OBSOLETO. Além do
 * `requestId` (que só avança quando o efeito do lado-código posta um novo
 * pedido), comparamos um `stateEpoch` monotônico que avança a CADA mudança de
 * `ir`/`blocksState` no store — venha do lado-código OU do lado-blocos. Sem o
 * epoch, uma edição de BLOCO em voo (BlocklyPanel.regenerateFromBlocks atualiza
 * o IR sem mexer no `requestId`) seria sobrescrita por um resultado de reparse
 * mais antigo que ainda estava no worker. Pura para ser testável isoladamente.
 */
export function isReverseParseResultStale(args: {
  resultRequestId: number
  currentRequestSeq: number
  epochAtPost: number
  currentStateEpoch: number
}): boolean {
  if (args.resultRequestId !== args.currentRequestSeq) return true
  // O epoch avançou desde que o pedido foi postado => o store (ir/blocksState)
  // mudou por OUTRA fonte (tipicamente uma edição de bloco) e tem precedência.
  return args.currentStateEpoch !== args.epochAtPost
}

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
  const studioConfig = useStudioConfig()
  const showPreview = useUIStore((s) => s.showPreview) && studioConfig.preview
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
  // Epoch monotônico do estado relevante para os blocos (`ir`/`blocksState`).
  // Avança em QUALQUER mudança dessas duas chaves no store — lado-código
  // (reverse-parse aplica novo IR) E lado-blocos (regenerateFromBlocks). O
  // pedido de reparse memoriza o epoch vigente no momento do post; o handler
  // dropa o resultado se o epoch avançou (edição de bloco concorrente venceu).
  const stateEpoch = useRef(0)
  const epochAtPost = useRef(0)
  const syntaxError = parseDiagnostics.find((diagnostic) => diagnostic.kind === 'syntaxError')

  // Inscreve no store e avança o `stateEpoch` sempre que `ir` OU `blocksState`
  // mudarem de referência, independentemente da fonte. `setFiles` (edição de
  // código) NÃO mexe nessas chaves, então não conta — só mudanças que os blocos
  // representam invalidam um reparse em voo.
  useEffect(() => {
    let prev = projectStoreApi.getState().project
    const unsubscribe = projectStoreApi.subscribe((state) => {
      const next = state.project
      if (next?.ir !== prev?.ir || next?.blocksState !== prev?.blocksState) {
        stateEpoch.current += 1
      }
      prev = next
    })
    return unsubscribe
  }, [projectStoreApi])

  // Refs com os valores mais recentes lidos pelo handler PERSISTENTE do worker.
  // O handler é instalado UMA vez (efeito de criação do worker abaixo) e não pode
  // depender de closures: ele lê `ir`/`blocksState` FRESCOS via store getState() e
  // as funções estáveis via refs, evitando dropar o resultado de um reparse quando
  // uma edição de bloco re-renderiza o componente no meio do parse.
  const applyProjectStateRef = useRef(applyProjectState)
  const pushLogRef = useRef(pushLog)
  useEffect(() => {
    applyProjectStateRef.current = applyProjectState
    pushLogRef.current = pushLog
  }, [applyProjectState, pushLog])

  useEffect(() => {
    const worker = new Worker(new URL('./bridgeReverseParseWorker.ts', import.meta.url), {
      type: 'module',
    })
    reverseParseWorkerRef.current = worker
    // Handler PERSISTENTE instalado uma única vez. Despacha por `requestId`
    // contra o seq atual e lê o estado FRESCO do store — nunca via closure.
    worker.onmessage = (event: MessageEvent<BridgeReverseParseWorkerResponse>) => {
      const message = event.data
      // Dropa resultados obsoletos: por `requestId` (lado-código postou outro
      // pedido) E por `stateEpoch` (uma edição de BLOCO mudou o ir/blocksState
      // desde o post — ela tem precedência e não pode ser clobberada por um
      // reparse mais antigo que ainda estava no worker).
      if (
        isReverseParseResultStale({
          resultRequestId: message.requestId,
          currentRequestSeq: reverseParseRequestSeq.current,
          epochAtPost: epochAtPost.current,
          currentStateEpoch: stateEpoch.current,
        })
      ) {
        return
      }
      if ('error' in message) {
        pushLogRef.current({
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
      // Lê o `ir`/`blocksState` FRESCOS do store (closure obsoleta dropava o
      // resultado quando uma edição de bloco mudava o `ir` durante o parse).
      const currentProject = projectStoreApi.getState().project
      const currentIR = currentProject?.ir ?? null
      if (deepEqualIR(result.ir, currentIR)) {
        return
      }
      // Mudança só na casca (head/doctype) ou nos ids — os blocos não representam
      // isso. Atualiza a casca SEM reconstruir o workspace, preservando o layout
      // do aluno (ex.: colunas separadas de JS) em edições cosméticas no código.
      if (currentIR && irBlockStructureEqual(result.ir, currentIR)) {
        applyProjectStateRef.current({ ir: { ...currentIR, htmlShell: result.ir.htmlShell } })
        return
      }
      // Preserva o layout das colunas (várias pilhas do mesmo tipo) derivando-o
      // do blocksState atual (lido fresco do store, evitando closure obsoleta) e
      // re-aplicando ao workspace reconstruído.
      const layout = layoutFromBlocksState(currentProject?.blocksState ?? null)
      if (!layout) {
        // Sem layout, `buildWorkspaceStateFromIR` aplica defaults (x = 32, 452, 872).
        // Avisar aqui torna visível quando o reverse-parse é a causa do "layout
        // volta às colunas" — útil pra distinguir do drop pelo sanitizer.
        console.warn('[sz] reverse-parse rebuild sem layout — posições serão resetadas.')
      }
      applyProjectStateRef.current({
        ir: result.ir,
        blocksState: buildWorkspaceStateFromIR(result.ir, { layout }),
      })
    }
    worker.onerror = (event) => {
      pushLogRef.current({
        source: PREVIEW_MESSAGE_SOURCE,
        kind: 'error',
        parts: [`Erro no worker de sincronização: ${event.message}`],
        timestamp: Date.now(),
      })
    }
    return () => {
      reverseParseRequestSeq.current += 1
      reverseParseWorkerRef.current = null
      worker.onmessage = null
      worker.onerror = null
      worker.terminate()
    }
  }, [projectStoreApi])

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
      // Zera o snapshot: ao voltar para baixo do limite, a PRIMEIRA edição
      // sub-limite deve sempre reparsear (sem isso, um snapshot velho idêntico
      // ao texto reduzido faria o atalho abaixo pular o reparse).
      lastSnapshot.current = null
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
    // O HTML é parseado AQUI, na main thread, porque depende do `DOMParser`
    // nativo — que não existe em `WorkerGlobalScope`. `extractInlineAssets`
    // também resolve de onde vêm CSS/JS (arquivo externo vs. `<style>`/`<script>`
    // inline) e grava o `placement` na casca. O resultado (objetos planos)
    // viaja serializável ao worker, que faz o trabalho pesado (Babel/CSS).
    let assets: ReturnType<typeof extractInlineAssets>
    try {
      assets = extractInlineAssets(debouncedHtml, debouncedCss, debouncedJs)
    } catch (err) {
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

    // Só marca como processado DEPOIS de `extractInlineAssets` ter dado certo e
    // imediatamente antes de postar: um snapshot que lança não pode ser lembrado
    // como já processado (senão uma edição idêntica posterior seria pulada).
    lastSnapshot.current = currentFiles
    const requestId = reverseParseRequestSeq.current + 1
    reverseParseRequestSeq.current = requestId
    // Memoriza o epoch vigente: o handler dropa o resultado se uma edição de
    // bloco avançar o epoch enquanto este reparse está no worker.
    epochAtPost.current = stateEpoch.current
    // O handler (onmessage/onerror) é PERSISTENTE — instalado uma vez na criação
    // do worker — e despacha por `requestId`. Aqui só postamos o pedido.
    worker.postMessage({
      requestId,
      files: currentFiles,
      html: assets.html,
      htmlShell: assets.htmlShell,
      cssSource: assets.cssSource,
      jsSource: assets.jsSource,
      ir: projectStoreApi.getState().project?.ir ?? null,
      projectName,
      installedExtensionIds: installedExtensions.map((extension) => extension.id),
    })
  }, [
    debouncedHtml,
    debouncedCss,
    debouncedJs,
    hasProject,
    installedExtensions,
    projectName,
    projectStoreApi,
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
