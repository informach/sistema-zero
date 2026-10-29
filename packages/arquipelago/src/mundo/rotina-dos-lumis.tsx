import { useFrame } from '@react-three/fiber'
import {
  CATALOGO_DE_OBJETOS,
  type LumiId,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { useRef, useState } from 'react'
import { type Group, Vector3 } from 'three'
import algodaoGlb from '../assets/lumis/algodao.glb'
import bolhaGlb from '../assets/lumis/bolha.glb'
import brigadeiroGlb from '../assets/lumis/brigadeiro.glb'
import brotinhoGlb from '../assets/lumis/brotinho.glb'
import buzioGlb from '../assets/lumis/buzio.glb'
import cristalGlb from '../assets/lumis/cristal.glb'
import estrelinhaGlb from '../assets/lumis/estrelinha.glb'
import gelinhoGlb from '../assets/lumis/gelinho.glb'
import ipeGlb from '../assets/lumis/ipe.glb'
import ovinhoGlb from '../assets/lumis/ovinho.glb'
import perolaGlb from '../assets/lumis/perola.glb'
import pitangaGlb from '../assets/lumis/pitanga.glb'
import plumaGlb from '../assets/lumis/pluma.glb'
import quindimGlb from '../assets/lumis/quindim.glb'
import { lojaDasCartas } from '../estado/cartas'
import { useEstado, useJogo } from '../estado/contexto'
import { lojaDaRotina, type PedidoDeRotina } from '../estado/rotina'
import { jogoPausado } from '../sistemas/pausa'
import {
  aplicarPasso,
  cartasNaMao,
  comecarExecucao,
  daRotinaDo,
  fazendoAgora,
  limparRotina,
  lugarDaGeladeira,
  type Passo,
  proximoPasso,
  quandoDaVirada,
  RITMO_DA_ROTINA,
  rotinasDoQuando,
  terminarExecucao,
  validarRotina,
} from '../sistemas/rotina'
import { suavizarAngulo } from '../sistemas/zappy'
import { trocarClipe, useCopiaAnimada } from './animado'
import { ESCALA_DOS_LUMIS_DA_VILA } from './borroes-da-vila'
import { lugarDoCanteiro } from './horta'
import { ALTURA_DA_TERRA } from './medidas'
import { ComReserva } from './modelos'

const url = (arquivo: string) => new URL(arquivo, import.meta.url).href
const MODELOS: Readonly<Record<LumiId, string>> = {
  estrelinha: url(estrelinhaGlb),
  buzio: url(buzioGlb),
  pitanga: url(pitangaGlb),
  ipe: url(ipeGlb),
  quindim: url(quindimGlb),
  brigadeiro: url(brigadeiroGlb),
  bolha: url(bolhaGlb),
  perola: url(perolaGlb),
  gelinho: url(gelinhoGlb),
  cristal: url(cristalGlb),
  ovinho: url(ovinhoGlb),
  brotinho: url(brotinhoGlb),
  algodao: url(algodaoGlb),
  pluma: url(plumaGlb),
}

const CLIPES_DE_UMA_VEZ = ['feliz'] as const
/** A base da obra da casa (a mesma do `casa.tsx`): o chão onde a geladeira fica. */
const CHAO_DA_CASA = ALTURA_DA_TERRA + 0.02
const ALTURA_DA_GELADEIRA = CATALOGO_DE_OBJETOS.geladeira.molde.caixa.altura

/** Onde o Lumi fica para o passo: em cima do canteiro ou da geladeira. */
function lugarDoPasso(p: Passo, s: Salvamento, saida: Vector3): boolean {
  if (p.lugar === 'geladeira') {
    const g = lugarDaGeladeira(s)
    if (!g) return false
    saida.set(g.x, CHAO_DA_CASA + ALTURA_DA_GELADEIRA + RITMO_DA_ROTINA.alturaNaGeladeira, g.z)
    return true
  }
  const c = s.horta[p.canteiro]
  if (!c) return false
  const l = lugarDoCanteiro(c.id, p.canteiro)
  saida.set(l.x, ALTURA_DA_TERRA + RITMO_DA_ROTINA.alturaNaHorta, l.z)
  return true
}

/**
 * A rotina dos Lumis no mundo (fase2-07), montada pela `Cena`. Quando a noite chega ou vai embora
 * (o mesmo `ambiente.noite` dos borrões), as rotinas daquele QUANDO entram na fila; o "Testar" do
 * painel também. Um Lumi de cada vez aparece na horta da ilha central e faz os passos.
 */
export function RotinaDosLumis() {
  const { loja, ambiente } = useJogo()
  const rotina = lojaDaRotina(loja)
  const noiteAntes = useRef<boolean | null>(null)
  const [atual, setAtual] = useState<(PedidoDeRotina & { chave: number }) | null>(null)
  const proxima = useRef(1)

  useFrame(() => {
    // A primeira olhada só marca: abrir o jogo de noite não conta como a noite chegando.
    const agora = ambiente.noite
    const antes = noiteAntes.current
    noiteAntes.current = agora
    const quando = antes === null ? null : quandoDaVirada(antes, agora)
    if (quando) {
      const s = loja.getState().salvamento
      for (const lumi of rotinasDoQuando(s, quando)) {
        const cartoes = s.rotinas[lumi]
        if (cartoes) rotina.getState().pedir({ lumi, cartoes, origem: 'quando' })
      }
    }
    // Na casa de um irmão (fase3-12) a horta é a dele: a rotina espera a volta.
    if (!atual && !loja.getState().visita && rotina.getState().fila.length > 0) {
      const pedido = rotina.getState().tirarDaFila()
      if (pedido) setAtual({ ...pedido, chave: proxima.current++ })
    }
  })

  if (!atual) return null
  return (
    <ComReserva reserva={null}>
      <LumiTrabalhando
        key={atual.chave}
        pedido={atual}
        aoTerminar={() => {
          rotina.getState().mostrarAndando(null)
          setAtual(null)
        }}
      />
    </ComReserva>
  )
}

type Fase = 'pensando' | 'voando' | 'trabalhando' | 'esperando' | 'festa'

function LumiTrabalhando({ pedido, aoTerminar }: { pedido: PedidoDeRotina; aoTerminar(): void }) {
  const { loja, plataforma } = useJogo()
  const rotina = lojaDaRotina(loja)
  const pausado = useEstado(jogoPausado)
  const raiz = useRef<Group>(null)
  const corpo = useRef<Group>(null)
  const { cena, actions } = useCopiaAnimada(MODELOS[pedido.lumi], raiz, CLIPES_DE_UMA_VEZ, pausado)
  // Criados uma vez por Lumi que chega (o laço do quadro só reaproveita).
  const [exec] = useState(() => comecarExecucao(pedido.lumi, limparRotina(pedido.cartoes)))
  const [pos] = useState(() => {
    // Aparece um pouco acima do primeiro canteiro da horta.
    const primeiro = loja.getState().salvamento.horta[0]
    const l = primeiro ? lugarDoCanteiro(primeiro.id, 0) : { x: 0, z: 0 }
    return new Vector3(l.x, ALTURA_DA_TERRA + RITMO_DA_ROTINA.alturaNaHorta + 0.6, l.z)
  })
  const registro = useRef<string[]>([])
  const fase = useRef<Fase>('pensando')
  const tempo = useRef(0)
  const tocando = useRef<string | null>(null)
  const alvo = useRef(new Vector3())
  const falta = useRef(new Vector3())
  /** A rotina vale com os cartões dela? `null` enquanto confere (a leitura do serviço). */
  const valeu = useRef<boolean | null>(null)
  const conferindo = useRef(false)
  const paradas = useRef(rotina.getState().paradas)
  const fim = useRef(false)

  const tocar = (clipe: string) => {
    if (tocando.current === clipe) return
    trocarClipe(actions, tocando.current, clipe, 0.2, `lumi-da-rotina-${pedido.lumi}`)
    tocando.current = clipe
  }

  /** Acaba: o que o Lumi carregava vai para a mochila, e a última vez fica para o painel. */
  const acabar = (motivoDeFora: string | null) => {
    if (fim.current) return
    fim.current = true
    const e = exec
    const s = loja.getState().salvamento
    const r = terminarExecucao(e, s)
    if (r.salvamento !== s) loja.getState().mudar(() => r.salvamento)
    if (r.texto) registro.current.push(r.texto)
    const erro = motivoDeFora ?? (e.situacao === 'erro' ? e.motivo : null)
    rotina.getState().registrar(pedido.lumi, {
      origem: pedido.origem,
      registro: [...registro.current],
      erro,
    })
    const quem = daRotinaDo(pedido.lumi)
    loja
      .getState()
      .dizer(
        erro
          ? `A rotina ${quem} parou no meio. O motivo está no painel Rotina.`
          : `A rotina ${quem} terminou.`,
      )
    fase.current = 'festa'
    tempo.current = RITMO_DA_ROTINA.festa
    tocar('feliz')
  }

  useFrame((_, dt) => {
    const e = exec
    if (corpo.current) corpo.current.position.copy(pos)
    if (pausado) return
    if (fase.current === 'festa') {
      tempo.current -= dt
      if (tempo.current <= 0) aoTerminar()
      return
    }
    if (rotina.getState().paradas !== paradas.current) {
      registro.current.push('Você parou a rotina.')
      acabar(null)
      return
    }
    if (loja.getState().visita) {
      registro.current.push('A rotina parou porque você foi visitar um irmão.')
      acabar(null)
      return
    }
    // Na chegada, confere a rotina (os cartões de controle vêm do serviço, como no caderno).
    if (!conferindo.current) {
      conferindo.current = true
      tocar('parado')
      rotina.getState().mostrarAndando({ lumi: pedido.lumi, texto: 'chegando na horta' })
      const cartas = lojaDasCartas(loja, plataforma)
      const conferir = () => {
        const recusa = validarRotina(pedido.cartoes, cartasNaMao(cartas.getState().dados))
        valeu.current = recusa === null
        if (recusa) acabar(recusa.motivo)
      }
      if (cartas.getState().dados) conferir()
      else void cartas.getState().carregar().finally(conferir)
    }
    if (valeu.current !== true) return
    const s = loja.getState().salvamento
    if (fase.current === 'pensando') {
      const p = proximoPasso(e, s, Date.now())
      if (!p) {
        acabar(null)
        return
      }
      rotina.getState().mostrarAndando({ lumi: pedido.lumi, texto: fazendoAgora(p) })
      if (p.tipo === 'voar') {
        if (!lugarDoPasso(p, s, alvo.current)) alvo.current.copy(pos)
        fase.current = 'voando'
        tocar('andar')
      } else if (p.tipo === 'esperar') {
        fase.current = 'esperando'
        tempo.current = p.segundos
        tocar('parado')
      } else {
        fase.current = 'trabalhando'
        tempo.current = RITMO_DA_ROTINA.trabalho
        tocar('trabalhar')
      }
      return
    }
    if (fase.current === 'voando') {
      const f = falta.current.copy(alvo.current).sub(pos)
      const d = f.length()
      const anda = RITMO_DA_ROTINA.voo * Math.min(dt, 0.1)
      if (d > 1e-3 && raiz.current)
        raiz.current.rotation.y = suavizarAngulo(
          raiz.current.rotation.y,
          Math.atan2(f.x, f.z),
          6,
          dt,
        )
      if (d <= anda) pos.copy(alvo.current)
      else pos.addScaledVector(f, anda / d)
      if (d > anda) return
    } else {
      tempo.current -= dt
      if (tempo.current > 0) return
    }
    // O passo terminou no mundo: vale no salvamento (pelas funções puras) e vem o próximo.
    const r = aplicarPasso(e, loja.getState().salvamento, new Date())
    if (r.salvamento !== loja.getState().salvamento) loja.getState().mudar(() => r.salvamento)
    registro.current.push(r.texto)
    fase.current = 'pensando'
  })

  return (
    <group ref={corpo} name={`lumi-da-rotina-${pedido.lumi}`} position={pos.toArray()}>
      <group ref={raiz} scale={ESCALA_DOS_LUMIS_DA_VILA} dispose={null}>
        <primitive object={cena} />
      </group>
    </group>
  )
}
