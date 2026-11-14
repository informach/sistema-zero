import type { AparenciaDoObjeto, ObjetoDaCasa, Obra } from '@sistemazero/arquipelago-contracts'
import {
  MORADA_CATALOG,
  type MoradaInstance,
  moradaFileUrl,
} from '@sistemazero/avatar-quarto/morada/catalog'
import { MoradaPieceView } from '@sistemazero/avatar-quarto/morada/piece'
import { Suspense, useEffect, useMemo, useState } from 'react'
import type { Object3D } from 'three'
import { useJogo } from '../estado/contexto'
import { lojaDoFarol } from '../estado/farol'
import { lojaDosMinijogos } from '../estado/minijogos'
import { lojaDosPassos } from '../estado/primeiros-passos'
import { falaDoGanho, ganharProjetos } from '../sistemas/construcao/projeto-azul'
import { FALA_DO_MODO_LIVRE } from '../sistemas/galeria-do-farol'
import { moradaFunctionPiece } from '../sistemas/morada'
import { MoradaAppearance } from './morada-aparencia'
import { MoradaFunctionDecor } from './morada-funcoes'

export const painelDoObjeto = (id: ObjetoDaCasa) => `objeto:${id}`
/** Id funcional legado não escolhe mais um GLB legado. */
export function modeloComAparencia(id: ObjetoDaCasa, appearance: AparenciaDoObjeto | null): string {
  const piece = MORADA_CATALOG.pieces[moradaFunctionPiece(id, appearance)]
  if (!piece) throw new Error(`A Morada não tem equivalente para ${id}.`)
  return moradaFileUrl(piece.file)
}
export function carregarObjetos(_ids: readonly ObjetoDaCasa[]) {
  /* Carregamento sob demanda do renderer compartilhado. */
}

/** Mesmo componente nos pedestais e na casa; criações próprias continuam independentes do visual. */
export function ModeloDoObjeto({
  id,
  aparencia,
}: {
  id: ObjetoDaCasa
  completo: boolean
  aparencia: AparenciaDoObjeto | null
}) {
  const instance = useMemo<MoradaInstance>(
    () => ({
      id: `visual-${id}`,
      pieceId: moradaFunctionPiece(id, aparencia),
      position: [0, 0, 0],
      rotation: 0,
      behavior: `objeto:${id}`,
    }),
    [id, aparencia],
  )
  const [root, setRoot] = useState<Object3D | null>(null)
  return (
    <Suspense fallback={null}>
      <MoradaPieceView instance={instance} onLoad={setRoot} />
      {root ? (
        <>
          <MoradaAppearance object={id} appearance={aparencia} model={root} />
          <MoradaFunctionDecor object={id} model={root} />
        </>
      ) : null}
    </Suspense>
  )
}
/** Leitura histórica: a casa canônica é a única fonte de posicionamento nova. */
export function ObjetosDaObra(_props: { obra: Obra; base: [number, number, number] }) {
  return null
}

export function GanharProjetos() {
  const { loja, plataforma } = useJogo()
  useEffect(() => {
    const fonte = lojaDosMinijogos(loja, plataforma)
    void fonte.carregar()
    return loja.subscribe((s, antes) => {
      if (antes.ferramentaAberta && !s.ferramentaAberta) void fonte.carregar()
    })
  }, [loja, plataforma])
  useEffect(() => {
    let esperando: (() => void) | null = null
    const conferir = () => {
      const s = loja.getState()
      const { salvamento, ganhos } = ganharProjetos(s.salvamento, new Date())
      if (ganhos.length === 0) return
      s.mudar(() => salvamento)
      const ultimo = ganhos.at(-1)
      if (!ultimo) return
      // Muitos de uma vez só acontece no modo livre: uma fala só, a do modo livre. Ela chega no
      // fim dos fachos, com a HUD escondida; a fala espera a descida do Farol para ser vista.
      if (ganhos.length > 1 && salvamento.farol.concluido) {
        const farol = lojaDoFarol(loja)
        if (farol.getState().etapa === 'fora') s.dizer(FALA_DO_MODO_LIVRE)
        else {
          esperando?.()
          esperando = farol.subscribe((f) => {
            if (f.etapa !== 'fora') return
            esperando?.()
            esperando = null
            loja.getState().dizer(FALA_DO_MODO_LIVRE)
          })
        }
        return
      }
      // Nos primeiros passos: a geladeira é a fala 16 deles; o resto espera o fim do tutorial.
      const passos = lojaDosPassos(loja, plataforma).getState()
      if (!passos.andando()) s.dizer(falaDoGanho(ultimo))
      else if (ultimo !== 'geladeira') passos.adiar(falaDoGanho(ultimo))
    }
    conferir()
    const parar = loja.subscribe((s, antes) => {
      if (s.salvamento !== antes.salvamento) conferir()
    })
    return () => {
      parar()
      esperando?.()
    }
  }, [loja, plataforma])
  return null
}
