import { Check, Undo2 } from '../../ui/icons'
import { ComponentButton, ComponentPage } from './SceneComponentPanel'
import { SceneLoopCutControls } from './SceneLoopCutControls'
import type { useSceneWorkshop } from './useSceneWorkshop'

export function SceneKnifePanel({ workshop }: { workshop: ReturnType<typeof useSceneWorkshop> }) {
  const knife = workshop.knife,
    count = knife.owner?.points.length ?? 0,
    loop = knife.mode === 'loop'
  const help = loop ? (
    <>
      <p>Passe o cursor por uma linha da peça e clique para escolher a faixa de faces.</p>
      <p>
        Ajuste a quantidade e a posição dos cortes. O corte segue faces com 4 lados. No campo de
        posição, 0% centraliza os cortes.
      </p>
      <p>Enter aplica. Backspace solta a faixa escolhida.</p>
      <p>Depois de cortar, escolha uma nova face e use Puxar.</p>
    </>
  ) : (
    <>
      <p>Clique na face e marque os pontos do corte. Depois, aplique para criar novas faces.</p>
      <p>
        Você pode começar em um ponto, em uma linha ou no meio da face. Clique perto do primeiro
        ponto para fechar um contorno.
      </p>
      <p>Shift encaixa no meio da linha. Enter aplica. Backspace retira o último ponto.</p>
      <p>Pontos no meio da face podem criar linhas de apoio. Depois de cortar, use Puxar.</p>
    </>
  )
  return (
    <div className="mld-component-root">
      <ComponentPage
        title="Cortar"
        help={{ title: loop ? 'Como usar Corte em faixa' : 'Como usar Corte livre', content: help }}
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
            Corte em faixa
          </ComponentButton>
        </fieldset>
        {loop ? (
          <>
            <SceneLoopCutControls
              count={knife.count}
              offset={knife.offset}
              change={knife.configureLoop}
            />
            <p role="status" className="mld-component-count">
              {count ? 'Faixa escolhida' : 'Escolha uma linha para começar'}
            </p>
          </>
        ) : (
          <>
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
          </>
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
