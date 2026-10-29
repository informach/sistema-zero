/** Harness local: jogo, player e cartão reais, com serviço falso e sem persistência. */
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { montarArquipelago } from '../../packages/arquipelago/src/entrada'
import { criarPlataformaFalsa } from '../../packages/arquipelago/src/plataforma/falsa'
import { obraDeExemplo } from '../../packages/arquipelago/src/plataforma/obra-de-exemplo'
import { MinijogosDaCrianca } from '../../packages/community-kids/src/app/pais/_components/arquipelago-minijogos'
import { ArquipelagoMinijogoPlayer } from '../../packages/member-shell/src/components/arquipelago-minijogo-player'

const plataforma = criarPlataformaFalsa({ persistir: false, comecarEm: { x: 7, z: -4, y: 2 } })
const buscar = plataforma.servico.buscar
plataforma.servico.buscar = async (caminho, opcoes) => {
  if (caminho === '/minijogos') {
    const r = await fetch('/api/arquipelago/minijogos')
    return { status: r.status, corpo: await r.json() }
  }
  const r = await buscar(caminho, opcoes)
  if (caminho === '/salvamento' && (!opcoes || opcoes.metodo === 'GET')) {
    const s = criarSalvamentoInicial(new Date())
    s.casa.portaNova = true
    s.posicao = { x: 7, y: 2, z: -4 }
    s.construcao.casa = obraDeExemplo()
    s.construcao.casa.objetos.push({ id: 'fliperama', x: 7, z: -3, giro: 0 })
    s.projetos = {
      geladeira: { ganhoEm: new Date().toISOString(), aparencia: null },
      casinha: { ganhoEm: new Date().toISOString(), aparencia: null },
    }
    return { status: 200, corpo: { revisao: 0, salvamento: s, atualizadoEm: null } }
  }
  return r
}
let abrir: ((id: string) => Promise<void>) | null = null
plataforma.abrirFerramenta = async (p) => {
  if (p.proposito !== 'minijogo') return { situacao: 'cancelado' }
  await abrir?.((p.molde as { desafioId: string }).desafioId)
  return { situacao: 'cancelado' }
}
function Sobreposicao() {
  const [jogo, setJogo] = useState<string | null>(null)
  const concluir = useRef<(() => void) | undefined>(undefined)
  abrir = (id) =>
    new Promise<void>((resolve) => {
      concluir.current = resolve
      setJogo(id)
    })
  return jogo ? (
    <ArquipelagoMinijogoPlayer
      url={`/api/arquipelago/minijogos/${jogo}`}
      onClose={() => {
        setJogo(null)
        concluir.current?.()
      }}
    />
  ) : null
}
if (new URLSearchParams(location.search).has('pais')) {
  document.body.style.cssText =
    'margin:0;padding:24px;font:16px system-ui;background:#faf8f1;color:#1d2340'
  createRoot(document.getElementById('jogo')!).render(
    <main style={{ maxWidth: 800, margin: 'auto' }}>
      <h1 style={{ marginBottom: 24 }}>Arquipélago Vagalume</h1>
      <MinijogosDaCrianca perfilId="11111111-1111-4111-8111-111111111111" nome="Lia" />
    </main>,
  )
} else {
  montarArquipelago(document.getElementById('jogo')!, plataforma)
  const painel = document.createElement('div')
  document.body.append(painel)
  createRoot(painel).render(<Sobreposicao />)
}
