import { Check, Lightbulb, Undo2 } from '../../ui/icons'
import { ComponentButton, ComponentPage } from './SceneComponentPanel'
import { SceneLoopCutControls } from './SceneLoopCutControls'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneKnifePanel({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const knife = workshop.knife,
    count = knife.owner?.points.length ?? 0,
    loop = knife.mode === 'loop'
  return (
    <div className="mld-component-root">
      <ComponentPage
        title="Cortar"
        description="Crie novas faces para modelar e puxar."
        backLabel={knife.owner?.selection ? 'Faces' : 'Peças'}
        onBack={workshop.cancelKnife}
        footer={
          <div className="mld-component-grid">
            <ComponentButton onClick={workshop.cancelKnife}>Cancelar</ComponentButton>
            <ComponentButton
              tone="primary"
              icon={Check}
              disabled={!knife.canConfirm}
              onClick={workshop.confirmKnife}
            >
              Aplicar corte
            </ComponentButton>
          </div>
        }
      >
        <fieldset className="mld-component-grid" aria-label="Tipo de corte">
          <ComponentButton
            tone={!loop ? 'primary' : 'neutral'}
            aria-pressed={!loop}
            disabled={!knife.owner}
            onClick={() => knife.setMode('free')}
          >
            Livre
          </ComponentButton>
          <ComponentButton
            tone={loop ? 'primary' : 'neutral'}
            aria-pressed={loop}
            disabled={!knife.owner}
            onClick={() => knife.setMode('loop')}
          >
            Loop cut
          </ComponentButton>
        </fieldset>
        {loop ? (
          <>
            <div className="mld-component-note">
              <strong>1. Passe o cursor por uma linha da peça.</strong>
              <p>2. Clique para escolher a faixa de faces.</p>
              <p>3. Ajuste os cortes e aplique.</p>
            </div>
            <SceneLoopCutControls
              count={knife.count}
              offset={knife.offset}
              change={knife.configureLoop}
            />
            <p role="status" className="mld-component-count">
              {count ? 'Faixa escolhida' : 'Escolha uma linha para começar'}
            </p>
            <p className="mld-component-description">
              O Loop cut segue faces com 4 lados. De 1 a 16 cortes, mantendo a peça inteira. Enter
              aplica. Backspace solta a faixa escolhida.
            </p>
          </>
        ) : (
          <>
            <div className="mld-component-note">
              <strong>1. Clique na face para começar.</strong>
              <p>2. Marque os próximos pontos do corte.</p>
              <p>3. Aplique para criar as novas faces.</p>
            </div>
            <p className="mld-component-description">
              Você pode começar em um ponto, em uma linha ou no meio da face. Clique perto do
              primeiro ponto para fechar um contorno.
            </p>
            <p role="status" className="mld-component-count">
              {count === 1 ? '1 ponto marcado' : `${count} pontos marcados`}
            </p>
            <ComponentButton icon={Undo2} disabled={!count} onClick={knife.back}>
              Corrigir último ponto
            </ComponentButton>
            <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                name="knifeMidpoint"
                className="size-5 accent-mld-accent"
                checked={knife.midpoint}
                onChange={(event) => knife.setMidpoint(event.target.checked)}
              />
              Grudar no meio das linhas
            </label>
            <p className="mld-component-description">
              Shift também encaixa no meio da linha. Enter aplica o corte. Backspace retira o último
              ponto.
            </p>
          </>
        )}
        <div className="mld-component-tip">
          <Lightbulb aria-hidden="true" />
          <p>Depois de cortar, escolha uma nova face e use Puxar.</p>
        </div>
        {!loop && (
          <p className="mld-component-description">
            Pontos no meio da face podem criar linhas de apoio para fechar as novas faces. A prévia
            mostra essas linhas.
          </p>
        )}
        {!knife.owner && !knife.error && (
          <p role="status">Escolha uma peça visível e destravada para cortar.</p>
        )}
        {knife.error && (
          <p role="alert" className="text-sm text-mld-danger">
            {knife.error}
          </p>
        )}
      </ComponentPage>
    </div>
  )
}
