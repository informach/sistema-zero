import { useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDasVisitasAdultas, PAINEL_DAS_VISITAS_ADULTAS } from '../estado/visitas-adultas'
import { JanelaDoPainel, useFecharPainel, useNoMenu } from './janela-do-painel'

export function EfeitoDasVisitasAdultas() {
  const { loja, plataforma, pedidos, fila } = useJogo()
  const visitas = lojaDasVisitasAdultas(loja, plataforma, pedidos, fila)
  useEffect(() => {
    if (plataforma.publico !== 'adulto') return
    visitas.iniciar()
    const conferir = () => {
      if (document.visibilityState !== 'hidden') void visitas.conferir()
    }
    const timer = setInterval(conferir, 15_000)
    document.addEventListener('visibilitychange', conferir)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', conferir)
      visitas.parar()
    }
  }, [visitas, plataforma.publico])
  return null
}

export function PainelDasVisitasAdultas() {
  const { plataforma } = useJogo()
  return plataforma.publico === 'adulto' ? <Painel /> : null
}
function Painel() {
  const { loja, plataforma, pedidos, fila } = useJogo()
  const fecharPainel = useFecharPainel()
  const visitas = lojaDasVisitasAdultas(loja, plataforma, pedidos, fila)
  const noMenu = useNoMenu()
  const aberto = useEstado((s) => s.painelAberto === PAINEL_DAS_VISITAS_ADULTAS) || noMenu
  const somenteLeitura = useEstado((s) => s.acesso.somenteLeitura)
  const { ativo, codigoGerado, ocupado, recado } = useStore(visitas.estado)
  const [codigo, setCodigo] = useState('')
  const [copia, setCopia] = useState<string | null>(null)
  const fechar = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (aberto) {
      fechar.current?.focus({ preventScroll: true })
      void visitas.carregar()
    } else {
      visitas.ocultarCodigo()
      setCodigo('')
      setCopia(null)
    }
  }, [aberto, visitas])
  if (!aberto) return null
  return (
    <JanelaDoPainel
      classes="arq-quadro arq-caderno arq-visitas arq-visitas-adultas"
      rotulo="arq-visitas-adultas-titulo"
    >
      <h2 id="arq-visitas-adultas-titulo">Visitas entre pessoas da comunidade</h2>
      <p className="arq-quadro-sub">
        Você escolhe se quer receber visitas. Compartilhar mostra sua casa, seu quintal e seu
        quarto. Quem visita só pode olhar.
      </p>
      <section aria-labelledby="arq-convite-titulo">
        <h3 id="arq-convite-titulo">Receber na minha casa</h3>
        <p>
          {ativo === null
            ? 'Lendo sua escolha.'
            : ativo
              ? 'Seu convite está ativo. Gerar outro código invalida o anterior.'
              : 'As visitas estão desligadas.'}
        </p>
        <div className="arq-menu-acoes">
          <button
            type="button"
            className="arq-botao"
            disabled={ocupado || somenteLeitura || ativo === null}
            onClick={() => {
              setCopia(null)
              void visitas.gerar()
            }}
          >
            {ativo ? 'Gerar outro código' : 'Ativar e gerar código'}
          </button>
          {ativo && (
            <button
              type="button"
              className="arq-botao leve"
              disabled={ocupado || somenteLeitura}
              onClick={() => {
                setCopia(null)
                void visitas.desligar()
              }}
            >
              Desligar visitas
            </button>
          )}
        </div>
        {codigoGerado && (
          <div className="arq-convite-codigo">
            <label htmlFor="arq-meu-codigo">Código para compartilhar</label>
            <input
              id="arq-meu-codigo"
              value={codigoGerado}
              readOnly
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="arq-botao leve"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(codigoGerado)
                  setCopia('Código copiado.')
                } catch {
                  setCopia('Selecione e copie o código no campo acima.')
                }
              }}
            >
              Copiar código
            </button>
            <small>
              Ao fechar esta tela, o código fica oculto. Você pode gerar outro quando precisar.
            </small>
          </div>
        )}
      </section>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void visitas.abrir(codigo.trim())
        }}
      >
        <h3>Visitar uma casa</h3>
        <label htmlFor="arq-codigo-recebido">Código recebido</label>
        <input
          id="arq-codigo-recebido"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          maxLength={32}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
        <button type="submit" className="arq-botao" disabled={ocupado}>
          Abrir visita
        </button>
      </form>
      {(recado || copia) && (
        <p role="status" className="arq-aviso atencao">
          {copia ?? recado}
        </p>
      )}
      {ativo === null && !ocupado && (
        <button type="button" className="arq-botao leve" onClick={() => void visitas.carregar()}>
          Tentar carregar
        </button>
      )}
      <div className="arq-menu-acoes">
        <button ref={fechar} type="button" className="arq-botao leve" onClick={fecharPainel}>
          Voltar ao jogo
        </button>
      </div>
    </JanelaDoPainel>
  )
}
