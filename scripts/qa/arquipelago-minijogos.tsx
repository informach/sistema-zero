/** Harness local: jogo, player e cartão reais, com serviço falso e sem persistência. */
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { montarArquipelago } from '../../packages/arquipelago/src/entrada'
import { marcarAberturaVista } from '../../packages/arquipelago/src/estado/abertura'
import { criarPlataformaFalsa } from '../../packages/arquipelago/src/plataforma/falsa'
import {
  obraDeExemplo,
  PROJETOS_DE_EXEMPLO,
} from '../../packages/arquipelago/src/plataforma/obra-de-exemplo'
import { MinijogosDaCrianca } from '../../packages/community-kids/src/app/pais/_components/arquipelago-minijogos'
import { ArquipelagoMinijogoPlayer } from '../../packages/member-shell/src/components/arquipelago-minijogo-player'
import { ArquipelagoMuralPlayer } from '../../packages/member-shell/src/components/arquipelago-mural-player'

const params = new URLSearchParams(location.search)
const publico = params.get('publico') === 'adulto' ? 'adulto' : 'kids'
const plataforma = criarPlataformaFalsa({
  publico,
  persistir: false,
  comecarEm: { x: 7, z: -4, y: 2 },
})
const buscar = plataforma.servico.buscar
// Semente no MESMO serviço em memória que aceita os PUTs. Não recriar revisão zero a cada GET.
const guardado = plataforma.guardado()
const semente = structuredClone(guardado.salvamento ?? criarSalvamentoInicial(new Date()))
semente.casa.portaNova = true
semente.posicao = { x: 7, y: 2, z: -4 }
semente.construcao.casa = obraDeExemplo()
semente.construcao.casa.objetos.push({ id: 'fliperama', x: 7, z: -5, giro: 0 })
semente.projetos = structuredClone(PROJETOS_DE_EXEMPLO)
const semeado = await buscar('/salvamento', {
  metodo: 'PUT',
  corpo: { revisaoBase: guardado.revisao, salvamento: semente },
})
if (semeado.status !== 200) throw Error('Semente local recusada')
marcarAberturaVista(publico, plataforma.perfil.id)
plataforma.servico.buscar = async (caminho, opcoes) => {
  if (caminho === '/minijogos' || caminho === '/mural') {
    const r = await fetch(`/api/arquipelago${caminho}`)
    return { status: r.status, corpo: await r.json() }
  }
  return buscar(caminho, opcoes)
}
let abrir: ((id: string, mural: boolean) => Promise<void>) | null = null
plataforma.abrirFerramenta = async (p) => {
  if (p.proposito !== 'minijogo' && p.proposito !== 'jogo-do-mural')
    return { situacao: 'cancelado' }
  const mural = p.proposito === 'jogo-do-mural'
  const molde = p.molde as { desafioId: string; playId: string }
  await abrir?.(mural ? molde.playId : molde.desafioId, mural)
  return { situacao: 'cancelado' }
}
function Sobreposicao() {
  const [jogo, setJogo] = useState<{ id: string; mural: boolean } | null>(null)
  const concluir = useRef<(() => void) | undefined>(undefined)
  abrir = (id, mural) =>
    new Promise<void>((resolve) => {
      concluir.current = resolve
      setJogo({ id, mural })
    })
  return jogo?.mural ? (
    <ArquipelagoMuralPlayer
      playId={jogo.id}
      publico={publico}
      onClose={() => {
        setJogo(null)
        concluir.current?.()
      }}
    />
  ) : jogo ? (
    <ArquipelagoMinijogoPlayer
      url={`/api/arquipelago/minijogos/${jogo.id}`}
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
