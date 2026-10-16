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


## Monaco 0.52.2: ciclo de vida dos serviços globais de hover

`monaco-editor@0.52.2.patch` move o registro global de hover do construtor de
cada editor para a inicialização dos serviços standalone. A fábrica e o serviço
base passam a pertencer ao mesmo escopo global que os consome. Editores e diffs
continuam sendo descartados normalmente; não há editor oculto retido, timeout,
retry ou captura de erro para disfarçar o defeito.

Causa reproduzida: fechar a revisão de renomeação e depois abrir F1/Localizar
podia lançar `InstantiationService has been disposed`. O último diff substituía
a fábrica global por uma closure sobre seu serviço filho, já encerrado.
O problema também está documentado em
[Monaco #5518](https://github.com/microsoft/monaco-editor/issues/5518).

O patch cobre a entrada ESM usada por todos os consumidores locais (o loader é
configurado com a instância importada, sem AMD/CDN). Bun o reaplica via
`patchedDependencies`, sem atualização das demais dependências. Ao atualizar
Monaco, conferir a correção upstream e repetir `e2e/pro-workspace.spec.ts`,
especialmente revisão carregada → fechar → F1 → Localizar, e assistência Zappy.
