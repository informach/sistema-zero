import { lazy, type ReactNode, Suspense, useLayoutEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneMeasurementStep } from '../../../scene/measurementStep'
import { useMoldaToolAccess } from '../../toolAccess'
import {
  ArrowUpFromLine,
  Check,
  ChevronRight,
  CircleHelp,
  Copy,
  FlipHorizontal2,
  Grid3x3,
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
  | 'loopSelection'
  | 'coplanarSelection'
  | 'empty'
  | 'choose'
  | 'apply'
  | 'preview'
  | 'beginPreview'
  | 'transform'
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
  measurementStep?: SceneMeasurementStep
  visualCut?: ReactNode
  onOpenUv?(): void
  onOpenWeights?(): void
  onKnife(): void
  onSeparateLine(): void
  onMove(): void
  onAlignPivot(): void
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
  const selectionActions = [
    'grow',
    'shrink',
    'invert',
    ...(selection.mode === 'edge' ? (['ring', 'loop'] as const) : []),
  ] as const
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
        measurementStep={props.measurementStep}
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
          currentAmount={preview.tool === 'extrude' ? preview.amount : undefined}
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
      <ComponentPage title="Mais ferramentas" backLabel={modeLabel} onBack={back}>
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
                if (operation.start('duplicate')) props.onMove()
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
      <ComponentPage
        title="Mais formas de escolher"
        backLabel={modeLabel}
        onBack={back}
        help={{
          title: 'Como escolher mais partes',
          content: (
            <ul className="list-disc space-y-2 pl-5">
              {selectionActions.map((action) => (
                <li key={action}>
                  <strong>{copy.componentSelectionActions[action]}:</strong>{' '}
                  {copy.componentSelectionHints[action]}
                </li>
              ))}
            </ul>
          ),
        }}
      >
        <fieldset disabled={blocked} className="mld-component-stack">
          <legend className="sr-only">Seleção</legend>
          {selectionActions.map((action) => (
            <ComponentButton
              key={action}
              disabled={action !== 'invert' && !count}
              onClick={() => choose(action)}
            >
              {copy.componentSelectionActions[action]}
            </ComponentButton>
          ))}
        </fieldset>
      </ComponentPage>
    )
  } else if (page === 'advanced' && pro) {
    content = (
      <ComponentPage
        title="Mais ajustes da malha"
        backLabel={modeLabel}
        onBack={back}
        help={{
          title: 'Como usar os ajustes da malha',
          content: (
            <>
              {selection.mode === 'vertex' && (
                <>
                  <p>{copy.softMovementHint}</p>
                  <p>{copy.weldPointsHint}</p>
                </>
              )}
              {selection.mode === 'edge' && (
                <>
                  <p>{copy.bevelHint}</p>
                  <p>{copy.pathCreateHint}</p>
                </>
              )}
              <p>{copy.planeCutHint}</p>
            </>
          ),
        }}
      >
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
        <p>Use as opções para escolher partes ligadas, faces planas ou uma linha inteira.</p>
        <p>Apagar uma face abre um buraco. Você pode desfazer.</p>
        {selection.mode === 'edge' && (
          <p>
            Separar linha usa uma linha interna de uma face plana ou um loop fechado no mesmo plano
            para cortar a peça inteira. Confira a prévia e toque em Separar para criar duas peças
            3D.
          </p>
        )}
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
            <CircleHelp aria-hidden="true" />
          </button>
        </div>
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
          {selection.mode === 'edge' && (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-mld-text">
              <input
                type="checkbox"
                name="component-whole-loop"
                className="size-5 accent-mld-accent disabled:opacity-50"
                checked={props.loopSelection.enabled}
                disabled={blocked}
                onChange={(event) => props.loopSelection.setEnabled(event.target.checked)}
              />
              {copy.componentWholeLoop}
            </label>
          )}
          {isFace && (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-mld-text">
              <input
                type="checkbox"
                name="component-coplanar-faces"
                className="size-5 accent-mld-accent disabled:opacity-50"
                checked={props.coplanarSelection.enabled}
                disabled={blocked}
                onChange={(event) => props.coplanarSelection.setEnabled(event.target.checked)}
              />
              {copy.componentCoplanarFaces}
            </label>
          )}
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
        </div>
        <fieldset disabled={blocked} className="mld-component-shape">
          <legend className="sr-only">Mudar a forma</legend>
          <h4>Mudar a forma</h4>
          <div className="mld-component-grid">
            {!isFace && (
              <ComponentButton
                icon={Square}
                data-component-trigger="create"
                disabled={selection.mode === 'vertex' && count < 2}
                onClick={() => {
                  returnTo.current = 'create'
                  operation.start('create')
                }}
              >
                {selection.mode === 'edge' ? 'Criar face' : copy.createFaceEdge.label}
              </ComponentButton>
            )}
            {!isFace && (
              <ComponentButton
                icon={ArrowUpFromLine}
                aria-label={selection.mode === 'edge' ? 'Puxar linhas' : 'Puxar pontos'}
                data-component-trigger="extrude"
                disabled={!count}
                onClick={() => {
                  returnTo.current = 'extrude'
                  if (operation.start('extrude')) props.onMove()
                }}
              >
                Puxar
              </ComponentButton>
            )}
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
                      if (tool === 'extrude') props.onMove()
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
                {can('model.pivot') && (
                  <ComponentButton
                    icon={RotateCw}
                    disabled={blocked || count !== 1}
                    title={count !== 1 ? 'Escolha uma face para definir o eixo.' : undefined}
                    onClick={props.onAlignPivot}
                  >
                    Usar ângulo no pivô
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
                {can('model.cut') && (
                  <ComponentButton
                    icon={Scissors}
                    data-component-trigger="separate-line"
                    disabled={blocked || count === 0}
                    title={
                      count === 0 ? 'Escolha uma linha ou um loop para separar a peça.' : undefined
                    }
                    onClick={props.onSeparateLine}
                  >
                    Separar linha
                  </ComponentButton>
                )}
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
        {props.empty && (
          <div className="mld-component-tip">
            <Lightbulb aria-hidden="true" />
            <p>Esta peça ficou sem faces. Desfaça para recuperar.</p>
          </div>
        )}
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
          {removal && !isFace && (
            <p className="mld-component-description mld-component-removal">
              {copy.componentRemovalImpact(removal.faces, removal.looseEdges)}
            </p>
          )}
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
