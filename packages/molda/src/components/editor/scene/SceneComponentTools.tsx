import { lazy, type ReactNode, Suspense, useLayoutEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { useMoldaToolAccess } from '../../toolAccess'
import {
  ArrowUpFromLine,
  Check,
  ChevronRight,
  Copy,
  FlipHorizontal2,
  Grid3x3,
  Info,
  Layers,
  Lightbulb,
  Merge,
  Paintbrush,
  RotateCw,
  Scan,
  Scissors,
  Shapes,
  Square,
  Trash2,
  Triangle,
  Ungroup,
} from '../../ui/icons'
import { SceneComponentAdvanced } from './SceneComponentAdvanced'
import { SceneComponentCut } from './SceneComponentCut'
import { SceneComponentMirror } from './SceneComponentMirror'
import { SceneComponentOperation } from './SceneComponentOperation'
import { ComponentButton, ComponentEntry, ComponentPage } from './SceneComponentPanel'
import { SceneFacePreview } from './SceneFacePreview'
import { SceneMeshCheck } from './SceneMeshCheck'
import { SceneSkinWeightTools } from './SceneSkinWeightTools'
import type { useSceneComponents } from './useSceneComponents'

const SceneUvEditor = lazy(() =>
  import('./SceneUvEditor').then((module) => ({ default: module.SceneUvEditor })),
)

export type SceneComponentToolsProps = Pick<
  ReturnType<typeof useSceneComponents>,
  | 'selection'
  | 'empty'
  | 'choose'
  | 'apply'
  | 'preview'
  | 'beginPreview'
  | 'transform'
  | 'setMode'
  | 'open'
  | 'close'
  | 'splitEdges'
  | 'cutRing'
  | 'cutPlane'
  | 'bevel'
  | 'createPath'
  | 'pathPointCount'
  | 'blocked'
  | 'check'
  | 'uv'
  | 'dissolveEdges'
  | 'connectPoints'
  | 'weld'
  | 'weldPoints'
  | 'softMovement'
  | 'remove'
  | 'removal'
  | 'weights'
  | 'operation'
  | 'symmetry'
  | 'stopSymmetry'
> & {
  visualCut?: ReactNode
  onOpenUv?(): void
  onOpenWeights?(): void
  onKnife(): void
  onDuplicateMove(): void
}

type Page =
  | 'main'
  | 'more'
  | 'selection'
  | 'help'
  | 'check'
  | 'uv'
  | 'weights'
  | 'advanced'
  | 'cut'
  | 'mirror'

/** One contextual page at a time. Geometry, previews and history remain scene-owned. */
export function SceneComponentTools(props: SceneComponentToolsProps) {
  const {
    selection,
    choose,
    apply,
    preview,
    beginPreview,
    setMode,
    blocked,
    check,
    uv,
    onOpenUv,
    onOpenWeights,
    weights,
    close,
    removal,
    remove,
    operation,
  } = props
  const [page, setPage] = useState<Page>('main')
  const panel = useRef<HTMLDivElement>(null)
  const returnTo = useRef('')
  const previous = useRef<string>('main')
  const activePage = operation.kind ?? preview.tool ?? page
  useLayoutEffect(() => {
    if (activePage === 'main' && previous.current !== 'main') {
      panel.current
        ?.querySelector<HTMLButtonElement>(`[data-component-trigger="${returnTo.current}"]`)
        ?.focus()
    } else if (activePage !== 'main' && previous.current !== activePage) {
      panel.current?.querySelector<HTMLButtonElement>('.mld-component-back')?.focus()
    }
    previous.current = activePage
  }, [activePage])
  const copy = COPY.scene
  const { can } = useMoldaToolAccess()
  const pro = can('model.mesh-pro')
  const uvAllowed = can('paint.uv')
  useLayoutEffect(() => {
    if (
      (!pro && ['selection', 'advanced', 'check', 'cut', 'mirror'].includes(page)) ||
      (!uvAllowed && page === 'uv')
    )
      setPage('main')
  }, [page, pro, uvAllowed])
  if (!selection) return null
  const count = selection.ids.length
  const isFace = selection.mode === 'face'
  const modeLabel = copy.componentModes[selection.mode]
  const go = (next: Page) => {
    returnTo.current = next
    setPage(next)
  }
  const back = () => {
    operation.cancel()
    preview.cancel()
    check.cancel()
    setPage('main')
  }
  const actionIcons = {
    extrude: ArrowUpFromLine,
    inset: Square,
    thickness: Layers,
    subdivide: Grid3x3,
  }
  const actionLabels = {
    extrude: 'Puxar',
    inset: 'Criar borda',
    thickness: 'Espessura',
    subdivide: 'Dividir',
  }
  const error = preview.error ?? props.transform.error
  let content: ReactNode

  if (operation.kind) {
    content = (
      <SceneComponentOperation
        operation={operation}
        selection={selection}
        onKnife={props.onKnife}
        onBack={() => setPage('main')}
      />
    )
  } else if (preview.tool) {
    content = (
      <ComponentPage title={actionLabels[preview.tool]} backLabel={modeLabel} onBack={back}>
        <SceneFacePreview
          key={preview.tool}
          tool={preview.tool}
          busy={preview.busy}
          update={preview.update}
          confirm={preview.confirm}
          cancel={preview.cancel}
          compact
        />
      </ComponentPage>
    )
  } else if (page === 'cut' && pro) {
    content = <SceneComponentCut {...props} onBack={back} />
  } else if (page === 'mirror' && pro) {
    content = (
      <SceneComponentMirror symmetry={props.symmetry} stop={props.stopSymmetry} onBack={back} />
    )
  } else if (page === 'more') {
    content = (
      <ComponentPage
        title="Mais ferramentas"
        description={
          isFace
            ? 'Outros jeitos de mudar suas faces.'
            : `Outros jeitos de mudar ${modeLabel.toLowerCase()}.`
        }
        backLabel={modeLabel}
        onBack={back}
      >
        {isFace && pro && (
          <div className="mld-component-entries">
            <ComponentEntry
              icon={Merge}
              label="Juntar"
              aria-label={copy.faceActions.merge}
              hint="Tira a linha entre faces planas."
              disabled={blocked || count < 2}
              onClick={() => apply('merge')}
            />
            <ComponentEntry
              icon={Ungroup}
              label="Separar"
              aria-label={copy.faceActions.detach}
              hint="Solta as faces do resto da peça."
              disabled={blocked || !count}
              onClick={() => apply('detach')}
            />
            <ComponentEntry
              icon={Copy}
              label="Duplicar"
              hint="Cria uma cópia das faces."
              disabled={blocked || !count}
              onClick={() => {
                if (operation.start('duplicate')) props.onDuplicateMove()
              }}
            />
            <ComponentEntry
              icon={Square}
              label="Fechar buraco"
              hint="Escolha as linhas ao redor do buraco."
              disabled={blocked}
              onClick={() => operation.start('fill')}
            />
            <ComponentEntry
              icon={Triangle}
              label="Triângulos"
              aria-label={copy.faceActions.triangulate}
              hint="Divide cada face em triângulos."
              disabled={blocked || !count}
              onClick={() => apply('triangulate')}
            />
            <ComponentEntry
              icon={RotateCw}
              label="Virar face"
              aria-label={copy.faceActions.flip}
              hint="Troca o lado de dentro pelo de fora."
              disabled={blocked || !count}
              onClick={() => apply('flip')}
            />
          </div>
        )}
        <p className="mld-component-description">
          As ferramentas mostram o que escolher antes de aplicar.
        </p>
        {!isFace && pro && selection.mode === 'edge' && (
          <ComponentEntry
            icon={Square}
            label="Fechar buraco"
            hint="Escolha as linhas ao redor do buraco."
            disabled={blocked}
            onClick={() => operation.start('fill')}
          />
        )}
        {pro && (
          <ComponentButton icon={Shapes} onClick={() => setPage('advanced')}>
            Mais ajustes da malha
            <ChevronRight aria-hidden="true" />
          </ComponentButton>
        )}
        {pro && (
          <ComponentButton onClick={() => setPage('selection')}>
            {copy.componentMoreSelection}
            <ChevronRight aria-hidden="true" />
          </ComponentButton>
        )}
        {weights && (
          <ComponentButton onClick={onOpenWeights ?? (() => setPage('weights'))}>
            Ossos e pesos
            <ChevronRight aria-hidden="true" />
          </ComponentButton>
        )}
      </ComponentPage>
    )
  } else if (page === 'selection' && pro) {
    content = (
      <ComponentPage title="Mais formas de escolher" backLabel={modeLabel} onBack={back}>
        <fieldset disabled={blocked} className="mld-component-stack">
          <legend className="sr-only">Seleção</legend>
          {(
            [
              'grow',
              'shrink',
              'invert',
              ...(selection.mode === 'edge' ? (['ring', 'loop'] as const) : []),
            ] as const
          ).map((action) => (
            <div key={action} className="mld-component-stack">
              <ComponentButton
                disabled={action !== 'invert' && !count}
                onClick={() => choose(action)}
              >
                {copy.componentSelectionActions[action]}
              </ComponentButton>
              <p className="mld-component-description">{copy.componentSelectionHints[action]}</p>
            </div>
          ))}
        </fieldset>
      </ComponentPage>
    )
  } else if (page === 'advanced' && pro) {
    content = (
      <ComponentPage title="Mais ajustes da malha" backLabel={modeLabel} onBack={back}>
        <SceneComponentAdvanced {...props} />
      </ComponentPage>
    )
  } else if (page === 'check' && pro) {
    content = (
      <ComponentPage
        title="Conferir a peça"
        backLabel={modeLabel}
        onBack={back}
        onEscape={() => {
          if (check.busy || check.preview) check.cancel()
          else back()
        }}
      >
        <SceneMeshCheck check={check} expanded />
      </ComponentPage>
    )
  } else if (page === 'uv' && uv && uvAllowed) {
    content = (
      <ComponentPage title="Pintura da face" backLabel={modeLabel} onBack={back}>
        <Suspense fallback={<p role="status">{copy.uvLoading}</p>}>
          <fieldset disabled={blocked} className="mld-component-grid">
            <legend className="sr-only">Seleção de faces no mapa</legend>
            <ComponentButton aria-label={copy.faceAll} onClick={() => choose('all')}>
              Todas
            </ComponentButton>
            <ComponentButton aria-label={copy.faceNone} onClick={() => choose('none')}>
              Limpar
            </ComponentButton>
          </fieldset>
          <SceneUvEditor {...uv} />
        </Suspense>
      </ComponentPage>
    )
  } else if (page === 'weights' && weights) {
    content = (
      <ComponentPage title="Ossos e pesos" backLabel={modeLabel} onBack={back}>
        <SceneSkinWeightTools {...weights} />
      </ComponentPage>
    )
  } else if (page === 'help') {
    content = (
      <ComponentPage title="Como editar a peça" backLabel={modeLabel} onBack={back}>
        <p>
          Escolha Pontos, Linhas ou Faces e clique na peça para escolher uma parte. Use Shift para
          escolher várias.
        </p>
        <p>
          Escolha uma ação para ver seus ajustes. Mover, Girar e Tamanho usam as alças no modelo.
        </p>
        <p>{copy.componentModeHint}</p>
        <p>Cancelar descarta a prévia. Desfazer traz de volta o último ajuste aplicado.</p>
        <ComponentButton tone="soft" onClick={back}>
          Entendi
        </ComponentButton>
      </ComponentPage>
    )
  } else {
    content = (
      <section aria-label={copy.componentTitles[selection.mode]} className="mld-component-panel">
        <div className="mld-component-heading">
          <h3 className="mld-display mld-component-title">Editar peça</h3>
          <button
            type="button"
            aria-label="Como editar a peça"
            data-component-trigger="help"
            className="mld-component-help"
            onClick={() => go('help')}
          >
            <Info aria-hidden="true" />
          </button>
        </div>
        <fieldset disabled={blocked} className="mld-component-modes" title={copy.componentModeHint}>
          <legend className="sr-only">{copy.componentModeLabel}</legend>
          {(['vertex', 'edge', 'face'] as const).map((mode) => (
            <ComponentButton
              key={mode}
              tone={selection.mode === mode ? 'soft' : 'neutral'}
              aria-pressed={selection.mode === mode}
              onClick={() => {
                setPage('main')
                setMode(mode)
              }}
            >
              {copy.componentModes[mode]}
            </ComponentButton>
          ))}
        </fieldset>
        {props.symmetry && pro && (
          <ComponentButton onClick={() => go('mirror')}>
            Espelho {['X', 'Y', 'Z'][props.symmetry.axis]} ativo
          </ComponentButton>
        )}
        <div className="mld-component-stack">
          <p role="status" className="mld-component-count">
            {count === 0
              ? `Nenhum${isFace || selection.mode === 'edge' ? 'a' : ''} ${isFace ? 'face escolhida' : selection.mode === 'edge' ? 'linha escolhida' : 'ponto escolhido'}`
              : selection.mode === 'face'
                ? copy.faceCount(count)
                : copy.componentCounts[selection.mode](count)}
          </p>
          <fieldset disabled={blocked} className="mld-component-selection">
            <legend className="sr-only">Escolher partes da peça</legend>
            <ComponentButton
              aria-label={
                selection.mode === 'face' ? copy.faceAll : copy.componentAll[selection.mode]
              }
              onClick={() => choose('all')}
            >
              {selection.mode === 'vertex' ? 'Todos' : 'Todas'}
            </ComponentButton>
            <ComponentButton
              aria-label={isFace ? copy.faceConnected : copy.componentConnected}
              disabled={!count}
              title={!count ? 'Escolha uma parte primeiro.' : undefined}
              onClick={() => choose('connected')}
            >
              {selection.mode === 'vertex' ? 'Ligados' : 'Ligadas'}
            </ComponentButton>
            <ComponentButton
              aria-label={isFace ? copy.faceNone : copy.componentNone}
              disabled={!count}
              onClick={() => choose('none')}
            >
              Limpar
            </ComponentButton>
          </fieldset>
          <p className="mld-component-description">
            {isFace
              ? 'Clique nas faces para escolher.'
              : selection.mode === 'edge'
                ? 'Clique nas linhas para escolher.'
                : 'Clique nos pontos para escolher.'}
          </p>
        </div>
        <fieldset disabled={blocked} className="mld-component-shape">
          <legend className="sr-only">Mudar a forma</legend>
          <h4>Mudar a forma</h4>
          <div className="mld-component-grid">
            {isFace ? (
              <>
                {(pro
                  ? (['extrude', 'inset', 'thickness'] as const)
                  : (['extrude', 'inset'] as const)
                ).map((tool) => (
                  <ComponentButton
                    key={tool}
                    icon={actionIcons[tool]}
                    aria-label={copy.facePreview[tool]}
                    data-component-trigger={tool}
                    disabled={!count}
                    onClick={() => {
                      returnTo.current = tool
                      beginPreview(tool)
                    }}
                  >
                    {actionLabels[tool]}
                  </ComponentButton>
                ))}
                {pro && (
                  <ComponentButton
                    icon={Scissors}
                    data-component-trigger="cut"
                    onClick={() => go('cut')}
                  >
                    Cortar
                  </ComponentButton>
                )}
                {pro && (
                  <ComponentButton
                    icon={Grid3x3}
                    aria-label={copy.facePreview.subdivide}
                    data-component-trigger="subdivide"
                    disabled={!count}
                    onClick={() => {
                      returnTo.current = 'subdivide'
                      beginPreview('subdivide')
                    }}
                  >
                    Dividir
                  </ComponentButton>
                )}
                {pro && (
                  <ComponentButton
                    icon={FlipHorizontal2}
                    data-component-trigger="mirror"
                    disabled={!count}
                    onClick={() => {
                      returnTo.current = 'mirror'
                      if (props.symmetry) go('mirror')
                      else operation.start('mirror')
                    }}
                  >
                    Espelhar
                  </ComponentButton>
                )}
              </>
            ) : selection.mode === 'edge' ? (
              <>
                {pro && (
                  <ComponentButton
                    icon={Grid3x3}
                    aria-label={copy.splitEdges}
                    disabled={!count}
                    onClick={props.splitEdges}
                  >
                    Dividir linhas
                  </ComponentButton>
                )}
                {pro && (
                  <ComponentButton
                    icon={Scissors}
                    data-component-trigger="cut"
                    onClick={() => go('cut')}
                  >
                    Cortar
                  </ComponentButton>
                )}
                {pro && (
                  <ComponentButton
                    icon={Merge}
                    aria-label={copy.dissolveEdges}
                    disabled={!count}
                    onClick={props.dissolveEdges}
                  >
                    Juntar faces
                  </ComponentButton>
                )}
              </>
            ) : (
              <>
                {pro && (
                  <ComponentButton
                    icon={Scissors}
                    aria-label={copy.connectPoints.cut}
                    disabled={count !== 2}
                    onClick={() => props.connectPoints('cut')}
                  >
                    Cortar face
                  </ComponentButton>
                )}
                {pro && (
                  <ComponentButton
                    icon={Shapes}
                    aria-label={copy.connectPoints.line}
                    disabled={count !== 2}
                    onClick={() => props.connectPoints('line')}
                  >
                    Ligar pontos
                  </ComponentButton>
                )}
                {pro && (
                  <ComponentButton
                    icon={Merge}
                    aria-label={copy.weldPoints}
                    disabled={!props.weld?.points || !!props.weld.blockedReason}
                    onClick={props.weldPoints}
                  >
                    Juntar pontos
                  </ComponentButton>
                )}
              </>
            )}
          </div>
        </fieldset>
        <div className="mld-component-tip">
          <Lightbulb aria-hidden="true" />
          <p>
            {props.empty
              ? 'Esta peça ficou sem faces. Desfaça para recuperar.'
              : !count
                ? 'Escolha uma parte da peça para começar.'
                : 'Escolha uma ação para ver como usar.'}
          </p>
        </div>
        <div className="mld-component-links">
          {(pro || weights) && (
            <ComponentButton icon={Shapes} data-component-trigger="more" onClick={() => go('more')}>
              Mais ferramentas
              <ChevronRight aria-hidden="true" />
            </ComponentButton>
          )}
          {uv && can('paint.uv') && (
            <ComponentButton
              icon={Paintbrush}
              data-component-trigger="uv"
              disabled={blocked}
              onClick={onOpenUv ?? (() => go('uv'))}
            >
              Pintura da face
              <ChevronRight aria-hidden="true" />
            </ComponentButton>
          )}
          {pro && (
            <ComponentButton
              icon={Scan}
              data-component-trigger="check"
              disabled={!!preview.tool || props.transform.dragging}
              onClick={() => go('check')}
            >
              Conferir a peça
              <ChevronRight aria-hidden="true" />
            </ComponentButton>
          )}
        </div>
        <div className="mld-component-stack">
          <ComponentButton
            tone="danger"
            icon={Trash2}
            disabled={blocked || !count}
            onClick={isFace ? () => apply('remove') : remove}
          >
            {selection.mode === 'face'
              ? copy.faceActions.remove
              : copy.componentRemove[selection.mode]}
          </ComponentButton>
          <p className="mld-component-description mld-component-removal">
            {isFace
              ? 'Abre um buraco. Você pode desfazer.'
              : removal
                ? copy.componentRemovalImpact(removal.faces, removal.looseEdges)
                : 'Você pode desfazer.'}
          </p>
        </div>
        <div className="mld-component-footer">
          <ComponentButton tone="soft" icon={Check} onClick={close}>
            Concluir edição
          </ComponentButton>
        </div>
      </section>
    )
  }
  return (
    <div ref={panel} className="mld-component-root">
      {content}
      {error && (
        <p role="alert" className="text-sm text-mld-danger">
          {error}
        </p>
      )}
    </div>
  )
}
