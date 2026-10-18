---
status: resolved
file: packages/studio/src/components/preview/PythonRuntimePreview.tsx
line: 189
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Descartar erros de entrada de uma execução anterior

## Review Comment

O callback de rejeição de `sendInput()` escrevia no estado local `error` sem conferir se o controller, a execução e o pedido de entrada ainda eram os atuais. A filtragem de AbortError não cobre uma rejeição normal da sessão antiga. Assim, um programa reiniciado e já funcionando podia mostrar o erro de uma resposta enviada à execução anterior.

Reprodução independente com PythonRuntimePreview, catálogo e registry reais, usando uma sessão controlável: iniciar o programa, emitir input-request, enviar uma resposta mantendo provideInput pendente, clicar Reiniciar e aguardar a segunda sessão chegar a running; rejeitar a resposta antiga com Error('old input failure'). Resultado observado: `{newRunStarted:true,status:'running',staleAlert:'old input failure'}`.

Capturar controller/identidade/pedido no envio e revalidar antes de aplicar efeitos locais do callback. Stop, substituição da execução, mudança de pedido e unmount devem invalidar o retorno anterior. Manter o erro visível quando ele pertence ao pedido atual.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador com validação de currentController, runId e requestId antes de aplicar o erro; token de submissão impede que o finally antigo libere um novo envio. Revalidação independente do mesmo caso passou. O revisor não modificou implementação.

## Verification

- Prova independente do componente real por stdin (`bun -`): enviar input pendente, reiniciar, abrir e enviar novo pedido com o mesmo requestId, rejeitar o pedido anterior. Nenhum alert apareceu e o novo botão permaneceu desabilitado enquanto sua submissão estava pendente. Rejeitar o pedido atual exibiu seu erro e liberou a tentativa seguinte.
- A regressão permanente também verifica duplo clique: apenas uma chamada de provideInput é despachada.
- `bun test src/components/preview/PythonRuntimePreview.test.tsx src/runtime/capture.test.ts`: 9 pass, 0 fail, 49 verificações, exit 0. Avisos esperados de iframe page loading desabilitado no HappyDOM.
- `bunx biome check src/components/preview/PythonRuntimePreview.tsx src/components/preview/PythonEditorPreview.tsx src/components/preview/PythonRuntimePreview.test.tsx`: três arquivos, exit 0, sem alterações.
