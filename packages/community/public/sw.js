// Kill-switch: este app NÃO usa service worker. Um SW de um site anterior neste
// domínio (comunidade.sistemazero.com.br) fica registrado no navegador dos alunos
// interceptando navegações (erro "no-response" no console); este script o
// substitui no próximo update-check, limpa os caches e se desregistra.
// Sem handler de `fetch` → nenhuma requisição é interceptada após a ativação.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
      await self.registration.unregister()
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) client.navigate(client.url)
    })(),
  )
})
