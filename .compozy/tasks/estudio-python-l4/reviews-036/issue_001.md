---
status: resolved
file: packages/studio/src/python/language/format.worker.ts
line: 7
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Permitir repetir o download do Ruff após uma falha

## Review Comment

`loadWorkspace` mantinha a Promise rejeitada de `initialize()` em `workspace`. Uma falha transitória do download do WASM era capturada pelo handler e enviada como mensagem de erro comum; o supervisor não descartava o worker por esse tipo de resposta. Assim, clicar novamente em Formatar repetia a mesma rejeição sem fazer outra tentativa de inicialização, até desmontar o editor. O teste existente de recuperação exercitava o evento `Worker.error`, que segue outro caminho e termina o worker.

Invalidar o cache quando a inicialização falhar, permitindo que uma nova ação explícita tente o download novamente. Manter a instância após erros de sintaxe do aluno, pois esses erros não indicam falha do ambiente. Uma alternativa é distinguir falhas de boot no protocolo e descartar o worker nesses casos.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e adicionou `catch` à inicialização para limpar `workspace` antes de relançar. Correção revalidada independentemente, sem alterar a implementação pelo revisor.

## Verification

- Antes da correção: `bun run .cache/studio-python-l0/review036-ruff-retry.ts`, exit 0. Worker de produção e WASM oficial, com somente o primeiro fetch interceptado para falhar: três pedidos retornam o mesmo erro, com apenas um fetch. Inicializar posteriormente o módulo oficial com seus bytes funciona, isolando a causa no cache da Promise do worker.
- Após a correção: `bun run .cache/studio-python-l0/review036-ruff-revalidate.ts`, exit 0. Primeiro pedido retorna erro transitório; segundo faz novo fetch e produz `x = 1\n`. Um pedido com sintaxe inválida retorna erro sem edição; o próximo pedido válido usa a mesma instância, mantém comentários e strings e formata corretamente. Total de dois fetches, sem download adicional por erro de sintaxe.
- `bun test src/python/language/formatter.test.ts src/monaco/__tests__/MonacoTabs.test.tsx` em `packages/studio`: 28 testes, 93 verificações, exit 0. Inclui ausência de worker antes do gesto, versão obsoleta recusada, cancelamento/desmontagem com terminação e recuperação após evento de falha do worker.
- A prova independente usa o handler real e o WASM oficial em Bun para qualificar a lógica de recuperação; não substitui a validação do ciclo de vida em navegador nem mede latência.
