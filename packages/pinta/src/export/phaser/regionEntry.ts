import { bootRegionPhaser } from './regionPlayer'

void bootRegionPhaser().catch((error: unknown) => {
  const status = document.getElementById('pinta-status')
  if (status)
    status.textContent = error instanceof Error ? error.message : 'Erro ao abrir o cenário.'
})
