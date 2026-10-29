import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useRef, useState } from 'react'
import { lojaDoConforto, useConforto } from '../estado/conforto'
import { useJogo } from '../estado/contexto'
import { cameraDaFoto } from '../estado/foto'
import {
  eTeclaDaFoto,
  nomeDaFoto,
  PAINEL_DA_FOTO,
  podeEntrarNaFoto,
  TEXTOS_DA_FOTO as T,
} from '../sistemas/modo-foto'

type Situacao =
  | { tipo: 'esperando' }
  | { tipo: 'tirando' }
  | { tipo: 'pronta'; url: string; nome: string }
  | { tipo: 'falhou' }

/** Oferece o arquivo no aparelho (o mesmo jeito de "Baixar de novo"). */
function baixar(url: string, nome: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * O modo foto (fase2-09) no lugar do HUD: o título com a dica, "Tirar foto" e "Voltar". Os botões
 * ficam no alto e no canto de baixo à direita, longe do direcional do toque. A foto é um PNG do
 * canvas oferecido para baixar; nada vai para o serviço nem para o Clube.
 */
export function ModoFoto() {
  const { loja } = useJogo()
  const aparelhoPedeMenos = useReducedMotion()
  const jogoPedeMenos = useConforto(lojaDoConforto(loja), (s) => s.conforto.menosMovimento)
  const [situacao, setSituacao] = useState<Situacao>({ tipo: 'esperando' })
  const tirar = useRef<HTMLButtonElement>(null)
  const ultimaUrl = useRef<string | null>(null)

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    tirar.current?.focus({ preventScroll: true })
    return () => {
      if (ultimaUrl.current) URL.revokeObjectURL(ultimaUrl.current)
      if (anterior?.isConnected) anterior.focus({ preventScroll: true })
    }
  }, [])

  async function tirarFoto() {
    const capturar = cameraDaFoto(loja).capturar
    if (!capturar || situacao.tipo === 'tirando') return
    setSituacao({ tipo: 'tirando' })
    try {
      const png = await capturar()
      if (!png || png.size === 0) {
        setSituacao({ tipo: 'falhou' })
        return
      }
      if (ultimaUrl.current) URL.revokeObjectURL(ultimaUrl.current)
      const url = URL.createObjectURL(png)
      ultimaUrl.current = url
      const nome = nomeDaFoto(new Date())
      baixar(url, nome)
      setSituacao({ tipo: 'pronta', url, nome })
    } catch {
      setSituacao({ tipo: 'falhou' })
    }
  }

  const recado =
    situacao.tipo === 'pronta' ? T.pronta : situacao.tipo === 'falhou' ? T.falhou : T.dica
  return (
    <section
      className={`arq-foto${aparelhoPedeMenos || jogoPedeMenos ? ' sem-entrada' : ''}`}
      aria-label={T.titulo}
    >
      <div className="arq-foto-topo">
        <div className="arq-foto-titulo arq-cartao">
          <b>📷 {T.titulo}</b>
          <span role="status">{recado}</span>
          {situacao.tipo === 'pronta' ? (
            <a href={situacao.url} download={situacao.nome}>
              {T.baixarDeNovo}
            </a>
          ) : null}
        </div>
        <button
          type="button"
          className="arq-botao leve"
          onClick={() => loja.getState().abrirPainel(null)}
        >
          {T.voltar}
        </button>
      </div>
      <button
        ref={tirar}
        type="button"
        className="arq-botao arq-foto-tirar"
        disabled={situacao.tipo === 'tirando'}
        onClick={() => void tirarFoto()}
      >
        {situacao.tipo === 'tirando' ? T.tirando : T.tirar}
      </button>
    </section>
  )
}

/** A tecla F entra no modo foto com o jogo correndo (o menu também tem o botão). */
export function AtalhoDaFoto() {
  const { loja } = useJogo()
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null
      const dentroDeCampo = Boolean(
        alvo?.closest?.('input, textarea, select, [contenteditable=true]'),
      )
      // Os campos do evento são getters do protótipo: um espalhar (`...e`) não os copia.
      const { code, ctrlKey, altKey, metaKey, repeat } = e
      if (!eTeclaDaFoto({ code, ctrlKey, altKey, metaKey, repeat, dentroDeCampo })) return
      const s = loja.getState()
      if (!podeEntrarNaFoto(s)) return
      e.preventDefault()
      s.abrirPainel(PAINEL_DA_FOTO)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [loja])
  return null
}
