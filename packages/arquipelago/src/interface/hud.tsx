import type { FerramentaDaPlataforma } from '@sistemazero/arquipelago-contracts'
import { useEffect, useState } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { restanteDeHoje } from '../estado/loja'
import { ITENS, itensVisiveis, remover } from '../sistemas/itens'
import { comer } from '../sistemas/necessidades'
import { momentoDoDia, relogio } from '../sistemas/tempo-do-dia'
import { ControlesDeToque } from './toque'

function Necessidades() {
  const n = useEstado((s) => s.salvamento.necessidades)
  const linhas = [
    { emoji: '🍎', nome: 'Fome', v: n.fome, cor: '#e0584f' },
    { emoji: '⚡', nome: 'Energia', v: n.energia, cor: '#ffc93c' },
    { emoji: '🎈', nome: 'Diversão', v: n.diversao, cor: '#2fb39a' },
  ]
  return (
    <div className="arq-necessidades arq-cartao">
      {linhas.map((l) => (
        <div key={l.nome} className="arq-nec" title={`${l.nome}: ${Math.round(l.v)} de 100`}>
          <span aria-hidden="true">{l.emoji}</span>
          <div className="arq-barra" aria-hidden="true">
            <i style={{ width: `${l.v}%`, background: l.cor }} />
          </div>
          <span className="arq-sr">{`${l.nome}: ${Math.round(l.v)} de 100`}</span>
        </div>
      ))}
    </div>
  )
}

function Relogio() {
  const criadoEm = useEstado((s) => Date.parse(s.salvamento.criadoEm))
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const m = momentoDoDia(agora, criadoEm)
  return (
    <span className="arq-pilula">
      {m.noite ? '🌙' : '☀️'} Dia {m.dia} · {relogio(m)}
    </span>
  )
}

function TempoLivre() {
  const restante = useEstado(restanteDeHoje)
  if (restante === null) return null
  return <span className="arq-pilula">Hoje: {restante} min</span>
}

function Dica() {
  const dica = useEstado((s) => s.dica)
  const [visivel, setVisivel] = useState<number | null>(null)
  useEffect(() => {
    if (!dica) return
    setVisivel(dica.id)
    const t = setTimeout(() => setVisivel((v) => (v === dica.id ? null : v)), 7000)
    return () => clearTimeout(t)
  }, [dica])
  if (!dica || visivel !== dica.id) return null
  return (
    <div className="arq-dica" role="status" aria-live="polite" key={dica.id}>
      <span className="arq-zappy" aria-hidden="true" />
      <span>{dica.texto}</span>
    </div>
  )
}

function Inventario() {
  const { loja } = useJogo()
  const inv = useEstado((s) => s.salvamento.inventario)
  const itens = itensVisiveis(inv)
  if (itens.length === 0) return null
  return (
    <section className="arq-inventario" aria-label="Mochila">
      {itens.map(({ item, qtd }) =>
        item.comida ? (
          <button
            key={item.id}
            type="button"
            className="arq-item comida"
            title={`Comer ${item.nome.toLowerCase()}`}
            aria-label={`Comer ${item.nome.toLowerCase()} (${qtd})`}
            onClick={() => {
              const s = loja.getState()
              s.mudar((sv) => {
                const resto = remover(sv.inventario, item.id)
                const comida = ITENS[item.id]
                return resto && comida
                  ? { ...sv, inventario: resto, necessidades: comer(sv.necessidades, comida) }
                  : sv
              })
              s.dizer(`Hum. ${item.nome} deu energia para continuar.`)
            }}
          >
            <span aria-hidden="true">{item.emoji}</span>
            <b>{qtd}</b>
          </button>
        ) : (
          <span key={item.id} className="arq-item" title={item.nome}>
            <span aria-hidden="true">{item.emoji}</span>
            <span className="arq-sr">{item.nome}</span>
            <b>{qtd}</b>
          </span>
        ),
      )}
    </section>
  )
}

function Acao() {
  const alvo = useEstado((s) => s.alvo)
  if (!alvo) return null
  return (
    <div className="arq-acao">
      <span className="arq-tecla">E</span>
      {alvo.rotulo}
    </div>
  )
}

function Menu() {
  const { loja, plataforma } = useJogo()
  const aberto = useEstado((s) => s.menuAberto)
  const ferramentaAberta = useEstado((s) => s.ferramentaAberta)
  const [aviso, setAviso] = useState('')
  async function abrirFerramenta(ferramenta: FerramentaDaPlataforma) {
    if (loja.getState().ferramentaAberta) return
    setAviso('')
    loja.getState().definirFerramentaAberta(true)
    try {
      const resultado = await plataforma.abrirFerramenta({
        ferramenta,
        proposito: 'criar no Arquipélago',
      })
      if (resultado.situacao === 'pronto') setAviso('Sua criação foi guardada.')
      if (resultado.situacao === 'indisponivel')
        setAviso(
          resultado.motivo === 'acesso-necessario'
            ? 'Confira seu acesso e sua jornada para usar esta ferramenta.'
            : 'Esta ferramenta não está disponível para abrir agora.',
        )
    } catch (erro) {
      plataforma.relatarErro(erro, 'abrir-ferramenta')
      setAviso('Não consegui abrir a ferramenta agora. Tente novamente.')
    } finally {
      loja.getState().definirFerramentaAberta(false)
    }
  }
  if (!aberto) return null
  return (
    <div className="arq-sobre">
      <div className="arq-menu arq-cartao" role="dialog" aria-label="Menu do jogo">
        <h2>Arquipélago Vagalume</h2>
        <ul>
          <li>Andar: W A S D ou as setas (no tablet, o círculo da esquerda)</li>
          <li>Correr: Shift · Pular: espaço</li>
          <li>Usar o que está perto: E</li>
          <li>Girar a câmera: arraste na tela · Aproximar: roda do mouse</li>
        </ul>
        <p>Crie com as ferramentas da plataforma:</p>
        <div className="arq-ferramentas">
          {(['pinta', 'molda', 'estudio'] as const).map((ferramenta) => (
            <button
              key={ferramenta}
              type="button"
              className="arq-botao leve"
              disabled={ferramentaAberta}
              onClick={() => void abrirFerramenta(ferramenta)}
            >
              {ferramenta === 'pinta' ? 'Pinta' : ferramenta === 'molda' ? 'Molda' : 'Estúdio'}
            </button>
          ))}
        </div>
        {aviso ? <p role="status">{aviso}</p> : null}
        <button
          type="button"
          className="arq-botao"
          disabled={ferramentaAberta}
          onClick={() => loja.getState().abrirMenu(false)}
        >
          Continuar jogando
        </button>
        <button
          type="button"
          className="arq-botao leve"
          disabled={ferramentaAberta}
          onClick={() => plataforma.voltarParaPlataforma()}
        >
          Voltar para a plataforma
        </button>
      </div>
    </div>
  )
}

export function Hud() {
  const { loja } = useJogo()
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && !loja.getState().tempoPausado && !loja.getState().ferramentaAberta)
        loja.getState().abrirMenu(!loja.getState().menuAberto)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [loja])
  return (
    <div className="arq-hud">
      <Necessidades />
      <div className="arq-topo-dir">
        <Relogio />
        <TempoLivre />
        <button
          type="button"
          className="arq-botao leve"
          onClick={() => loja.getState().abrirMenu(true)}
          aria-label="Abrir o menu"
        >
          ☰ Menu
        </button>
      </div>
      <Dica />
      <div className="arq-baixo">
        <Acao />
        <Inventario />
      </div>
      <ControlesDeToque />
      <Menu />
    </div>
  )
}
