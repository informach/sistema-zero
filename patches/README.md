# Three.js 0.184.0: descarte dos recursos de cada renderer

`three@0.184.0.patch` corrige duas retenções reproduzidas no Molda. Bun reaplica o
patch em cada instalação (`patchedDependencies` na raiz e no lockfile). As versões
dos pacotes permanecem iguais; o Three 0.180.0 do Estúdio não recebe esta alteração.

- O LUT global de iluminação registrava um listener de descarte por renderer.
  Como o LUT global continua vivo, o listener retinha WebGLTextures, contexto e canvas
  mesmo depois de `renderer.dispose()`. Cada renderer agora possui sua própria Texture,
  compartilhando os dados imutáveis do LUT, e a descarta antes de limpar suas propriedades.
  A correção está no fonte e nas duas entradas publicadas (ESM/CommonJS).
- OrbitControls removia listeners de teclado de `canvas.getRootNode()` no descarte.
  Depois da remoção do canvas, esse nó já não é o documento de registro. O controle agora
  conserva o nó de registro e remove `keydown` e o `keyup` de um Control ainda pressionado.
  Isso atende também previews e hosts que descartam depois de retirar o canvas do DOM.

Validação: `packages/molda/src/viewport/viewportNavigation.test.ts` usa OrbitControls
real com canvas anexado/retirado e tecla pressionada. O e2e `vinte aberturas` mede contextos
WebGL reais e DOM/heap após GC nos ciclos 5/10/15/20. Antes, 1 contexto ativo após fechar e
3.104 nós adicionais entre os ciclos 5 e 20; depois, zero contextos e DOM estável.

Ao atualizar Three, verificar as duas causas no fonte e repetir esses testes, os percursos
de exportação PNG/apresentação e os previews de textura/céu antes de remover o patch.
