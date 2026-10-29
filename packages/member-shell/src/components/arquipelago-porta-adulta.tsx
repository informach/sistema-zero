'use client'

import type { ReactNode } from 'react'
import {
  ANIMACOES,
  type EstadoDaPorta,
  type FerramentaDaPorta,
  NOME_DA_FERRAMENTA,
  Paisagem,
  type PeleDaPorta,
} from './arquipelago-porta'

/**
 * A porta do Arquipélago na comunidade adulta: a MESMA paisagem da noite do arquipélago (é o
 * jogo), com o cartão do "Estúdio à noite" por cima (`sz-palco`: a carta escura com a grade de
 * pontos, o sobretítulo em pixel, o título em Bricolage) e a ação amarela com degrau (`sz-btn`).
 * Sem mascote, na voz do community. As classes moram no `globals.css` da comunidade adulta.
 * Só entra pela entrada `arquipelago-host-adulto`.
 */
export const TEXTOS_DA_PORTA_ADULTA: Record<EstadoDaPorta, { titulo: string; texto: string }> = {
  carregando: { titulo: 'Abrindo o Arquipélago', texto: 'Preparando a sua ilha.' },
  indisponivel: {
    titulo: 'O Arquipélago ainda não abriu para você',
    texto: 'Ele está abrindo aos poucos. Quando chegar a sua vez, ele aparece no menu.',
  },
  erro: {
    titulo: 'O Arquipélago não abriu agora',
    texto: 'Pode ser a conexão. Tente de novo daqui a pouco.',
  },
}

export const AVISOS_DA_PORTA_ADULTA = {
  abrindo: (nome: string) => `Abrindo ${nome}`,
  falhou: (nome: string) => `${nome.charAt(0).toUpperCase()}${nome.slice(1)} não abriu agora`,
  pausado: 'O jogo ficou pausado. Volte e tente de novo.',
  voltarAoJogo: 'Voltar ao jogo',
  tentar: 'Tentar de novo',
  voltar: 'Voltar para a comunidade',
} as const

function Carta({ children }: { children: ReactNode }) {
  return (
    <div className="sz-palco relative mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-[1.2rem] border border-border px-6 py-7 text-center shadow-2xl">
      {children}
    </div>
  )
}

function Barra() {
  return (
    <div className="mt-1 h-2 w-48 overflow-hidden rounded-full bg-[var(--carta-2)]">
      <span className="arqp-barra block h-full w-1/3 rounded-full bg-[var(--cta)]" />
    </div>
  )
}

export function PortaAdultaDoArquipelago({
  estado,
  voltarPara,
}: {
  estado: EstadoDaPorta
  voltarPara: string
}) {
  const texto = TEXTOS_DA_PORTA_ADULTA[estado]
  return (
    <div className="absolute inset-0 grid place-items-center overflow-y-auto px-[max(16px,env(safe-area-inset-left))] pt-10 pb-[32vh]">
      <style>{ANIMACOES}</style>
      <Paisagem />
      <Carta>
        <p className="sz-kicker">Arquipélago Vagalume</p>
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-2">
          <h1 className="sz-h2 text-balance">{texto.titulo}</h1>
          <p className="max-w-sm text-pretty text-muted-foreground">{texto.texto}</p>
        </div>
        {estado === 'carregando' ? (
          <Barra />
        ) : (
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {estado === 'erro' ? (
              <button type="button" className="sz-btn" onClick={() => window.location.reload()}>
                {AVISOS_DA_PORTA_ADULTA.tentar}
              </button>
            ) : null}
            <a href={voltarPara} className={estado === 'erro' ? 'sz-btn-outline' : 'sz-btn'}>
              {AVISOS_DA_PORTA_ADULTA.voltar}
            </a>
          </div>
        )}
      </Carta>
    </div>
  )
}

export function AvisoAdultoDaFerramenta({
  ferramenta,
  falhou,
  onVoltar,
}: {
  ferramenta: FerramentaDaPorta
  falhou: boolean
  onVoltar?: () => void
}) {
  const nome = NOME_DA_FERRAMENTA[ferramenta]
  return (
    <div
      role={falhou ? 'alert' : 'status'}
      aria-live="polite"
      className="absolute inset-0 z-50 grid place-items-center bg-[color-mix(in_oklab,var(--noite)_80%,transparent)] px-4 backdrop-blur-sm"
    >
      <style>{ANIMACOES}</style>
      <Carta>
        <p className="sz-h3 text-balance">
          {falhou ? AVISOS_DA_PORTA_ADULTA.falhou(nome) : AVISOS_DA_PORTA_ADULTA.abrindo(nome)}
        </p>
        {falhou ? (
          <>
            <p className="text-muted-foreground">{AVISOS_DA_PORTA_ADULTA.pausado}</p>
            <button type="button" className="sz-btn" onClick={onVoltar}>
              {AVISOS_DA_PORTA_ADULTA.voltarAoJogo}
            </button>
          </>
        ) : (
          <Barra />
        )}
      </Carta>
    </div>
  )
}

export const PELE_ADULTA_DA_PORTA: PeleDaPorta = {
  Porta: PortaAdultaDoArquipelago,
  Aviso: AvisoAdultoDaFerramenta,
}
