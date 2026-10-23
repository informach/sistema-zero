---
status: resolved
file: packages/studio/src/runtime/python/controller.ts
line: 181
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Validar autoridade sem suspensão antes de enviar Run

## Review Comment

O coordenador fazia uma terceira `await environment.registry.load(...)` para validar a autorização após preparar a sessão. O registry validava a política antes de devolver sua Promise; durante a suspensão seguinte, a política podia mudar sem alterar a referência do ambiente, `canExecute()` ou o writer epoch. `requireOwner()` não conferia o status/grants da release e `session.run()` era chamado com autorização já revogada.

Reprodução independente com catálogo, registry e snapshot reais: a terceira chamada de `environment.access()` devolvia o estado ativo e agendava uma microtask que mudava `releaseStatus` para `revoked`. Uma sessão de teste registrou que `run()` foi chamado após essa revogação. A mesma fronteira não revalidava ownership depois de publicar `ready`: um subscriber que chamasse Stop ou reiniciasse a execução ainda deixava o coordenador invocar `run()` da sessão anterior. O provider Python concreto possui sua própria recusa após Stop, mas o coordenador não deve depender disso para despachar comandos de uma geração revogada.

A checagem completa da política deve ser síncrona e ocorrer após callbacks de `ready`, junto da validação de geração/projeto/epoch, imediatamente antes de invocar `session.run()`, sem nova suspensão entre validação e despacho. Reutilizar o resolver existente para evitar duas políticas divergentes.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador extraindo `assertStudioRuntimeExecutionAccess`, reutilizado pelo registry, e verificando ownership/política/ownership após publicar `ready`. Revalidação independente confirmou que uma revogação posterior por microtask ocorre somente depois do despacho autorizado, enquanto revogação síncrona no subscriber de `ready` impede Run. Stop/restart reentrantes também não despacham a sessão anterior. Nenhuma fonte foi modificada pelo revisor.

## Verification

- Seis cenários independentes em memória, com registry/catalog/snapshot reais e uma sessão controlável: política no despacho; revogação em `ready`; Stop em `ready`; restart em `ready` com evento antigo; sessão preparada depois de Stop/restart; troca de documento durante preparação. Todos passaram, sem frames remanescentes após dispose e com cada frame liberado uma vez.
- `bun test src/runtime/registry.test.ts src/runtime/python/frameMessages.test.ts src/runtime/python/workerSupervisor.test.ts`: 23 pass, 0 fail, 126 expect() calls, exit 0.
- `bunx biome check src/runtime/registry.ts src/runtime/python/controller.ts`: exit 0, sem alterações.
- O log `l4-python-controller-browser-2.log` contém oito casos Chrome/Edge aprovados antes desta correção. Não foi executado navegador ou TSC pelo revisor; a revalidação do fix acima é uma prova de fluxo/autoridade e não uma nova medição de runtime real.
