import { SEMENTES_DO_CEU, type SementeDoCeu } from '@sistemazero/arquipelago-contracts'
import { useEffect, useRef } from 'react'
import arcoIris from '../assets/icones/semente-arco-iris-de-petala.png'
import estrela from '../assets/icones/semente-estrela-trepadeira.png'
import flor from '../assets/icones/semente-flor-de-nuvem.png'
import { useEstado, useJogo } from '../estado/contexto'
import {
  canteiroDoPainel,
  NOME_DA_PLANTA_DO_CEU,
  plantarNoJardim,
  TEXTOS_DO_JARDIM_DO_CEU,
} from '../sistemas/jardim-do-ceu'

const url = (caminho: string) => new URL(caminho, import.meta.url).href
/** As sementes do céu (`arte/itens/plantas_do_ceu.py`). */
const ICONE_DA_SEMENTE: Record<SementeDoCeu, string> = {
  'flor-de-nuvem': url(flor),
  'estrela-trepadeira': url(estrela),
  'arco-iris-de-petala': url(arcoIris),
}

/** O painel do canteiro vazio do jardim do céu: escolher o que plantar (B6). */
export function PainelDoJardimDoCeu() {
  const k = useEstado((s) => canteiroDoPainel(s.painelAberto))
  return k ? <JardimAberto k={k} /> : null
}

function JardimAberto({ k }: { k: number }) {
  const { loja } = useJogo()
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    titulo.current?.focus({ preventScroll: true })
  }, [])
  const plantar = (semente: SementeDoCeu) => {
    const s = loja.getState()
    const novo = plantarNoJardim(s.salvamento, k, semente, Date.now())
    s.abrirPainel(null)
    if (!novo) return
    s.mudar(() => novo)
    s.dizer(TEXTOS_DO_JARDIM_DO_CEU.plantado(semente))
  }
  return (
    <div className="arq-sobre">
      <section
        className="arq-menu arq-cartao"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arq-jardim-do-ceu-titulo"
      >
        <h2 ref={titulo} tabIndex={-1} id="arq-jardim-do-ceu-titulo">
          {TEXTOS_DO_JARDIM_DO_CEU.titulo}
        </h2>
        <p className="arq-quadro-sub">{TEXTOS_DO_JARDIM_DO_CEU.escolher}</p>
        <div className="arq-objeto-aparencia">
          {SEMENTES_DO_CEU.map((semente) => (
            <button
              key={semente}
              type="button"
              className="arq-ferramenta"
              onClick={() => plantar(semente)}
            >
              <img className="arq-album-miniatura" src={ICONE_DA_SEMENTE[semente]} alt="" />
              <b>{NOME_DA_PLANTA_DO_CEU[semente]}</b>
              <small>{TEXTOS_DO_JARDIM_DO_CEU.quanto(semente)}</small>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="arq-botao leve"
          onClick={() => loja.getState().abrirPainel(null)}
        >
          {TEXTOS_DO_JARDIM_DO_CEU.voltar}
        </button>
      </section>
    </div>
  )
}
