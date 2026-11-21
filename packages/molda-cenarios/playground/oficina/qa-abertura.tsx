import { createRoot } from 'react-dom/client'
import { criarHostEmMemoria } from '../../src/oficina/host-memoria'
import Oficina from '../../src/oficina/telas/Oficina'

/** Fixture local: uma URL antiga misturando IDs de dois mundos da mesma conta. */
export async function abrirCenarioDeOutroMundo() {
  const host = criarHostEmMemoria()
  const mundo = await host.criarMundo('conta', 'Primeiro mundo')
  const outro = await host.criarMundo('conta', 'Outro mundo')
  const cenario = await host.criarCenario(outro.id, 'Cenário do outro mundo')
  const elemento = document.createElement('div')
  document.body.replaceChildren(elemento)
  createRoot(elemento).render(
    <Oficina
      host={host}
      espacoId="conta"
      mundoId={mundo.id}
      cenarioId={cenario.id}
      tema="light"
      aoVoltar={() => {}}
    />,
  )
}
