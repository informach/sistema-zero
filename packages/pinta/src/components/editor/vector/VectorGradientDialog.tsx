/**
 * A janela do DEGRADÊ do vetor: 3 tipos + as 2 cores + "Tirar o degradê".
 *
 * Mora AQUI, montada pelo PALCO, e não no painel de Aparência que tem o botão:
 * na tela estreita o painel vive dentro do disclosure "Cores e camadas", que
 * DESMONTA ao recolher, e recolher para enxergar o desenho é o gesto natural no
 * meio de uma captura de cor. A janela precisa sobreviver a isso para reabrir
 * quando a criança toca na forma. `gradientOpen` vive no escopo pelo mesmo
 * motivo.
 *
 * As duas cores abrem a janelinha de cor com o conta-gotas "Pegar uma cor do
 * desenho": as duas janelas fecham, o palco entra em captura e o toque numa
 * forma traz UMA cor de volta para a ponta pedida (ver `beginColorPick`).
 */
import type { JSX } from 'react'
import { useLayoutEffect, useRef } from 'react'
import { COPY } from '../../../core/copy'
import { isToolAllowed } from '../../../core/toolCuration'
import { isVectorGradient } from '../../../vector/model'
import { Button, ToolButton } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { CircleDot, MoveHorizontal, MoveVertical } from '../../ui/icons'
import { ColorButton } from '../ColorPicker'
import { useToolCuration } from '../editorContext'
import { useVectorEditor } from './VectorEditorScope'

type GradientEnd = 'from' | 'to'

export function VectorGradientDialog(): JSX.Element {
  const {
    style,
    customColors,
    rememberColor,
    applyStyle,
    currentGradient,
    applyGradient,
    beginColorPick,
    gradientOpen,
    setGradientOpen,
    gradientButtonRef,
  } = useVectorEditor()
  const activeGradient = isVectorGradient(style.fill) ? style.fill : null
  // Conta-gotas da janelinha de cor. Some quando o conta-gotas foi curado numa
  // aula: a caixa reverteria a ferramenta na hora (`toolFallback`) e o botão
  // pareceria quebrado.
  const canPickFromDrawing = isToolAllowed(useToolCuration(), 'picker')

  /**
   * Reabre a janela devolvendo o foco ao botão "Degradê" ANTES: o `Dialog`
   * guarda quem estava focado ao abrir para devolver o foco ao fechar, e depois
   * de um toque no palco (ou no X da faixinha, que desmonta) isso seria o body.
   */
  function reopen(): void {
    gradientButtonRef.current?.focus()
    setGradientOpen(true)
  }

  // Os handlers da captura vivem num ref atualizado a cada COMMIT: a request
  // fica guardada no escopo entre um toque e outro, e um `applyGradient` velho
  // aplicaria com a seleção do render em que nasceu (apagada no meio, gravaria
  // um desfazer vazio). Assim ela roda sempre com os fechamentos mais recentes.
  const pickRef = useRef<{ apply: (end: GradientEnd, hex: string) => void; reopen: () => void }>({
    apply: () => undefined,
    reopen: () => undefined,
  })
  useLayoutEffect(() => {
    pickRef.current = {
      apply: (end, hex) => {
        rememberColor(hex)
        // A mesma cor que já está na ponta: nada a aplicar (gravaria um desfazer
        // que não desfaz nada). Cor sólida ainda vira degradê, como no "Aplicar".
        if (!(activeGradient && activeGradient[end] === hex)) {
          applyGradient(end === 'from' ? { from: hex } : { to: hex })
        }
        reopen()
      },
      reopen,
    }
  })

  /** Fecha o Degradê e pede ao palco UMA cor para a ponta escolhida. */
  function pickFor(end: GradientEnd): void {
    const accepted = beginColorPick({
      onPick: (hex) => pickRef.current.apply(end, hex),
      onCancel: (reason) => {
        if (reason === 'user') pickRef.current.reopen()
      },
    })
    // Recusa (conta-gotas curado) não fecha a janela para nada.
    if (accepted) setGradientOpen(false)
  }

  return (
    <Dialog open={gradientOpen} onClose={() => setGradientOpen(false)} title={COPY.vector.gradient}>
      <div className="flex flex-wrap items-center gap-1">
        <ToolButton
          icon={MoveHorizontal}
          label={COPY.vector.gradientH}
          active={activeGradient?.type === 'linear' && activeGradient.angle === 0}
          onClick={() => applyGradient({ type: 'linear', angle: 0 })}
        />
        <ToolButton
          icon={MoveVertical}
          label={COPY.vector.gradientV}
          active={activeGradient?.type === 'linear' && activeGradient.angle === 90}
          onClick={() => applyGradient({ type: 'linear', angle: 90 })}
        />
        <ToolButton
          icon={CircleDot}
          label={COPY.vector.gradientRadial}
          active={activeGradient?.type === 'radial'}
          onClick={() => applyGradient({ type: 'radial' })}
        />
        <ColorButton
          label={COPY.vector.gradientFrom}
          value={activeGradient?.from ?? currentGradient().from}
          recentColors={customColors}
          onChange={(hex) => {
            rememberColor(hex)
            applyGradient({ from: hex })
          }}
          onPickFromDrawing={canPickFromDrawing ? () => pickFor('from') : undefined}
        />
        <ColorButton
          label={COPY.vector.gradientTo}
          value={activeGradient?.to ?? currentGradient().to}
          recentColors={customColors}
          onChange={(hex) => {
            rememberColor(hex)
            applyGradient({ to: hex })
          }}
          onPickFromDrawing={canPickFromDrawing ? () => pickFor('to') : undefined}
        />
      </div>
      {/* Sem isto não existe caminho de volta: qualquer toque nos controles
          acima vira degradê e a criança fica presa nele. */}
      <Button
        variant="outline"
        disabled={!activeGradient}
        onClick={() => {
          applyStyle({ fill: (activeGradient ?? currentGradient()).from })
          setGradientOpen(false)
        }}
        className="mt-4 w-full"
      >
        {COPY.vector.gradientOff}
      </Button>
    </Dialog>
  )
}
