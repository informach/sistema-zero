'use client'

import {
  aplicarPasso,
  CARTAS_LUMI,
  type CartasDoJogador,
  comecarExecucao,
  conferirResultadoDaRotina,
  type Execucao,
  estagio,
  type MoldeDaRotina,
  type MundoDaRotina,
  proximoPasso,
  type ResultadoDaFerramentaRotina,
  terminarExecucao,
} from '@sistemazero/arquipelago-contracts'
import * as Blockly from 'blockly/core'
import * as PtBr from 'blockly/msg/pt-br'
import { useCallback, useEffect, useRef, useState } from 'react'
import { szThemeFor } from '../blockly/theme'
import { portaisBlocklyNoDialogo } from './blockly-dialog'
import { caixaDeBlocosLumi, carregarRotinaLumi, lerRotinaLumi, registrarBlocosLumi } from './blocks'
import './editor.css'

type Leitura = ReturnType<typeof lerRotinaLumi>
export interface RotinaLumiEditorProps {
  molde: MoldeDaRotina
  lerCartas(): Promise<CartasDoJogador | null>
  onFinish(resultado: ResultadoDaFerramentaRotina | null): void
}

export function RotinaLumiEditor({ molde, lerCartas, onFinish }: RotinaLumiEditorProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const host = useRef<HTMLDivElement>(null)
  const workspace = useRef<Blockly.WorkspaceSvg | null>(null)
  const [cartas, setCartas] = useState(molde.cartas)
  const cartasAtuais = useRef(cartas)
  cartasAtuais.current = cartas
  const [erro, setErro] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [aba, setAba] = useState<'blocos' | 'previa'>('blocos')
  const [mundo, setMundo] = useState<MundoDaRotina>(() => structuredClone(molde.mundo))
  const [registro, setRegistro] = useState<string[]>([])
  const [posicao, setPosicao] = useState<{ lugar: string | null; canteiro: number }>({
    lugar: null,
    canteiro: 0,
  })
  const [rodando, setRodando] = useState(false)
  const [terminou, setTerminou] = useState(false)
  const execucao = useRef<{ e: Execucao; leitura: Leitura; mundo: MundoDaRotina } | null>(null)
  const ocupado = useRef(false),
    vivo = useRef(true),
    sujo = useRef(false)
  const [confirmarSaida, setConfirmarSaida] = useState(false)
  const agora = new Date(molde.agora)

  const reiniciar = useCallback(() => {
    setRodando(false)
    setTerminou(false)
    execucao.current = null
    setMundo(structuredClone(molde.mundo))
    setRegistro([])
    setPosicao({ lugar: null, canteiro: 0 })
    workspace.current?.highlightBlock(null)
  }, [molde])
  function ler(): Leitura {
    if (!workspace.current) throw Error('Espere os blocos terminarem de abrir.')
    const leitura = lerRotinaLumi(workspace.current, cartasAtuais.current)
    const r = conferirResultadoDaRotina(
      { ...molde, cartas: cartasAtuais.current },
      {
        versao: 1,
        abertura: molde.abertura,
        lumi: molde.lumi,
        rotina: leitura.rotina,
      },
    )
    if ('motivo' in r) throw Error(r.motivo)
    return leitura
  }
  function avancar() {
    try {
      if (!execucao.current) {
        const leitura = ler()
        execucao.current = {
          leitura,
          e: comecarExecucao(molde.lumi, leitura.rotina),
          mundo: structuredClone(molde.mundo),
        }
        setRegistro([])
        setErro(null)
      }
      const x = execucao.current
      const passo = proximoPasso(x.e, x.mundo, agora.getTime())
      workspace.current?.highlightBlock(
        x.e.cartaoAtual ? (x.leitura.blocos.get(x.e.cartaoAtual) ?? null) : null,
      )
      if (!passo) {
        const fim = terminarExecucao(x.e, x.mundo)
        if (fim.texto) setRegistro((r) => [...r, fim.texto as string])
        setRodando(false)
        setTerminou(true)
        if (x.e.motivo) setErro(x.e.motivo)
        return
      }
      const r = aplicarPasso(x.e, x.mundo, agora)
      x.mundo = r.salvamento
      setMundo(r.salvamento)
      setPosicao({ lugar: passo.lugar, canteiro: passo.canteiro })
      setRegistro((atual) => [...atual, r.texto])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Confira os blocos da rotina.')
      setRodando(false)
    }
  }
  const avancarAtual = useRef(avancar)
  avancarAtual.current = avancar
  useEffect(() => {
    if (!rodando) return
    const timer = setInterval(() => avancarAtual.current(), 700)
    return () => clearInterval(timer)
  }, [rodando])

  useEffect(() => {
    vivo.current = true
    const elemento = dialog.current,
      area = host.current
    if (!elemento || !area) return
    elemento.showModal()
    const mensagens: Record<string, string> = {}
    for (const [chave, valor] of Object.entries(PtBr))
      if (typeof valor === 'string') mensagens[chave] = valor
    Blockly.setLocale(mensagens)
    registrarBlocosLumi()
    const restaurarPortais = portaisBlocklyNoDialogo(elemento)
    const ws = Blockly.inject(area, {
      toolbox: caixaDeBlocosLumi(molde.cartas),
      theme: szThemeFor('light', elemento),
      renderer: 'zelos',
      trashcan: true,
      sounds: false,
      move: { scrollbars: true, drag: true, wheel: true },
      zoom: { controls: true, wheel: false, startScale: 0.9, maxScale: 1.4, minScale: 0.5 },
    })
    workspace.current = ws
    Blockly.Events.disable()
    try {
      carregarRotinaLumi(ws, molde.rotina ?? [{ c: 'quando-amanhecer' }])
    } finally {
      Blockly.Events.enable()
    }
    const changed = (event: Blockly.Events.Abstract) => {
      if (event.isUiEvent || event.type === Blockly.Events.FINISHED_LOADING) return
      sujo.current = true
      reiniciar()
      setErro(null)
    }
    ws.addChangeListener(changed)
    const resize = new ResizeObserver(() => Blockly.svgResize(ws))
    resize.observe(area)
    return () => {
      vivo.current = false
      resize.disconnect()
      ws.removeChangeListener(changed)
      ws.dispose()
      restaurarPortais()
      workspace.current = null
      elemento.close()
    }
  }, [molde, reiniciar])

  async function guardar() {
    if (ocupado.current) return
    ocupado.current = true
    setGuardando(true)
    setErro(null)
    setRodando(false)
    try {
      const novas = await lerCartas()
      if (!vivo.current) return
      cartasAtuais.current = novas
      setCartas(novas)
      workspace.current?.updateToolbox(caixaDeBlocosLumi(novas))
      const { rotina } = ler()
      onFinish({ versao: 1, abertura: molde.abertura, lumi: molde.lumi, rotina })
    } catch (e) {
      if (vivo.current)
        setErro(
          e instanceof Error
            ? e.message
            : 'Não deu para conferir os blocos agora. Tente novamente.',
        )
    } finally {
      ocupado.current = false
      if (vivo.current) setGuardando(false)
    }
  }
  function sair() {
    if (ocupado.current) return
    setRodando(false)
    if (sujo.current) setConfirmarSaida(true)
    else onFinish(null)
  }
  return (
    <dialog
      ref={dialog}
      className="sz-lumi-editor"
      data-sz-theme="light"
      aria-labelledby="sz-lumi-titulo"
      onCancel={(e) => {
        e.preventDefault()
        sair()
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <header>
        <div>
          <h1 id="sz-lumi-titulo">Rotina do Lumi</h1>
          <p>Encaixe os blocos e veja o que vai acontecer.</p>
        </div>
        <button type="button" onClick={sair} disabled={guardando}>
          Voltar ao jogo
        </button>
      </header>
      <nav className="sz-lumi-abas" aria-label="Áreas da rotina">
        <button type="button" aria-pressed={aba === 'blocos'} onClick={() => setAba('blocos')}>
          Blocos
        </button>
        <button type="button" aria-pressed={aba === 'previa'} onClick={() => setAba('previa')}>
          Prévia
        </button>
      </nav>
      <div className="sz-lumi-corpo" data-aba={aba}>
        <section className="sz-lumi-blocos" aria-label="Blocos da rotina">
          <div ref={host} className="sz-lumi-workspace" />
          <details className="sz-lumi-aprender">
            <summary>Mais blocos nos cursos</summary>
            {CARTAS_LUMI.filter(
              (c) =>
                c.tipo === 'controle' &&
                !cartas?.cartas.some((x) => x.id === c.id && x.conquistada),
            ).map((c) => {
              const cursos = cartas?.cartas.find((x) => x.id === c.id)?.aprendaEm ?? []
              return (
                <p key={c.id}>
                  <strong>{c.nome}</strong>:{' '}
                  {cursos.length
                    ? `Aprenda em ${cursos.map((x) => x.titulo).join(', ')}.`
                    : cartas
                      ? 'Nenhum curso ensina este bloco por enquanto.'
                      : 'Não deu para conferir seus cursos agora.'}
                </p>
              )
            })}
          </details>
        </section>
        <section className="sz-lumi-previa" aria-label="Prévia da horta">
          <h2>Prévia</h2>
          <p>Este teste não muda sua ilha. O tempo da horta é o da abertura.</p>
          <div className="sz-lumi-horta">
            {mundo.horta.map((c, i) => (
              <div
                key={c.id}
                className="sz-lumi-canteiro"
                data-atual={posicao.lugar === 'horta' && posicao.canteiro === i}
              >
                <span aria-hidden="true">
                  {posicao.lugar === 'horta' && posicao.canteiro === i
                    ? '✨'
                    : c.semente
                      ? '🌱'
                      : '🟫'}
                </span>
                <strong>Canteiro {i + 1}</strong>
                <span>{c.semente ?? 'vazio'}</span>
                <small>{estagio(c, agora.getTime())}</small>
              </div>
            ))}
          </div>
          <div className="sz-lumi-geladeira" data-atual={posicao.lugar === 'geladeira'}>
            <span aria-hidden="true">{posicao.lugar === 'geladeira' ? '✨' : '▣'}</span> Geladeira{' '}
            {mundo.geladeiraPosta
              ? `com ${Object.values(mundo.geladeira?.guardado ?? {}).reduce((a, b) => a + b, 0)} alimentos`
              : 'ainda não está na casa'}
          </div>
          <div className="sz-lumi-acoes">
            <button
              type="button"
              disabled={terminou || guardando}
              onClick={() => {
                if (rodando) setRodando(false)
                else {
                  setRodando(true)
                  avancar()
                }
              }}
            >
              {rodando ? 'Pausar prévia' : 'Prever'}
            </button>
            <button type="button" disabled={terminou || rodando || guardando} onClick={avancar}>
              Próximo passo
            </button>
            <button type="button" onClick={reiniciar}>
              Recomeçar
            </button>
          </div>
          <p role="status">
            {terminou
              ? 'Prévia encerrada.'
              : (registro.at(-1) ?? 'O Lumi espera o primeiro passo.')}
          </p>
          <ol className="sz-lumi-registro">
            {registro.map((s, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: registro só acrescenta passos e é reiniciado por inteiro
              <li key={`${i}-${s}`}>{s}</li>
            ))}
          </ol>
        </section>
      </div>
      <footer>
        {erro ? (
          <p role="alert">{erro}</p>
        ) : (
          <p>Até 16 blocos nesta rotina e 32 somando todos os Lumis.</p>
        )}
        {confirmarSaida ? (
          <div className="sz-lumi-acoes">
            <p>As mudanças ainda não foram guardadas.</p>
            <button type="button" onClick={() => onFinish(null)}>
              Sair sem guardar
            </button>
            <button type="button" onClick={() => setConfirmarSaida(false)}>
              Continuar montando
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className="sz-lumi-guardar"
          disabled={guardando}
          onClick={() => void guardar()}
        >
          {guardando ? 'Conferindo blocos…' : 'Guardar rotina'}
        </button>
      </footer>
    </dialog>
  )
}
