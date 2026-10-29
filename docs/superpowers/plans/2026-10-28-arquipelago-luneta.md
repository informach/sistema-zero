# Luneta do píer

Plano de execução com a skill executing-plans, a partir do pedido geral-04.

Objetivo: espiar a próxima ilha fechada sem sair do píer nem carregar a ilha completa.
Arquitetura: regras puras em `sistemas/luneta.ts`; modelo, sinais leves e placas em componentes
próprios de `mundo/`; painel existente pausa o personagem; perfil `luneta` na câmera única.
React Three Fiber, Three.js e os colisores simples já usados no jogo.

- [x] Atualizar staging e preservar mudanças de outras sessões. Pull inicial bloqueado por
  documentação local; integração concluída após guardar e restaurar somente esse documento.
- [x] Regras de destino e copy, enquadramento, perfil e testes puros.
- [x] Luneta na ponta do píer, tubo orientado, colisor e interação E / Usar.
- [x] Vista leve com vulto e brilho, botão Voltar e Esc, pausa e movimento reduzido.
- [x] Placas no fim de cada ponte quebrada, usando a face `texto` do GLB e leitura por interação.
- [x] Navegador: caminhar até o píer, entrar, sair, print da ilha cinza, conferir que não buscou
  GLB completo. Conferir também Farol, toque emulado e movimento reduzido.
- [x] Revisão, documentação, bun test, bun run typecheck e lint antes do commit próprio em staging.

Não alterar arte das ilhas, construção, modo leve, contratos, banco, ambiente ou CI.
Em `anel.tsx`, somente importar e montar a placa no trecho já calculado da ponte quebrada.
Sem mudanças em `medidas.ts`. Sem push nesta tarefa. Antes de eventual envio, atualizar novamente
o remoto; não reescrever commits compartilhados.

O recado de Íris nas placas convida a descobrir a ilha e informa o nome do posto, sem número,
cobrança ou penalidade. Os rótulos kids são textos locais, conferidos contra a apresentação da
plataforma; a ordem e a abertura vêm exclusivamente do contrato existente.

## Conferência final

- `bun test`: 521 passaram, 1 ignorado, nenhuma falha. O teste ignorado exige Postgres.
- `NODE_OPTIONS=--max-old-space-size=8192 bun run typecheck`: passou.
- `bunx biome ci packages/arquipelago --diagnostic-level=error`: 248 arquivos, sem erros.
- Revisão de câmera, pausa, descarte dos recursos próprios, colisores, textos e integrações.
  Ajustados o giro vertical do tubo e a posição lateral da placa para liberar o meio da ponte.
- Playground com plataforma falsa, sem persistência, no Chrome instalado no Windows.
  O caminho Chromium Linux informado não existe neste ambiente. Execução no pacote:

```sh
bun build playground/verificar-luneta-browser.ts --target=node --external playwright-core --outfile .cache/verificar-luneta-browser.mjs
node .cache/verificar-luneta-browser.mjs
```

- Os três cenários passaram: Bosque no posto 1 em 1280 × 800, Vila Doce no posto 2 em
  390 × 844 com toque e movimento reduzido, Farol no posto 8. A criança caminhou pelo
  píer, abriu com E ou Usar, ficou parada, saiu com Esc ou Voltar e voltou a andar.
  Nenhuma ilha completa foi carregada. A leitura da placa do Bosque também passou.
- Prints revisados: `docs/qa/2026-10-28-luneta-ilha-cinza.png` e
  `docs/qa/2026-10-28-luneta-tela-estreita.png`.
- Falta conferir em celular físico: controles por toque, legibilidade, rotação da tela,
  movimento reduzido do sistema e desempenho durante uso prolongado. Emulação não substitui
  essa conferência. Nenhum modelo precisa ser regenerado.
