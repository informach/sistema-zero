# L2 — Integração dos ambientes e preservação do JavaScript

> Execução: aplicar `executing-plans`, já disponível e lida nesta sessão. Implementação na worktree autorizada, reviews entre fatias; commit e merge local somente depois da entrega completa e full review.

**Objetivo:** conectar a identidade documental L1 aos adaptadores do editor e aos provedores de execução, preservando todos os caminhos JavaScript existentes.

**Arquitetura:** um documento, coordenador e editor compartilhados; implementação de linguagem e execução carregadas pelo ambiente aprovado. O catálogo pertence ao host. Preparar tipos/registry não habilita um ambiente; o writer v3 só muda junto dos leitores e consumidores capazes de preservar os quatro formatos.

**Tecnologias:** TypeScript, React/Zustand existentes, schemas Core, IndexedDB e provedores lazy. Sem novo framework ou segundo armazenamento.

**Especificação:** `docs/plans/2026-10-16-estudio-javascript-python-turtle-proposta.md`, seções 4–6 e 14–16; `docs/plans/2026-10-16-estudio-python-validacao-entregas.md`.

## Restrições

- JS continua padrão. Python não adquire HTML/CSS/JS artificiais, terminal npm ou extensão Turtle automática.
- Provedor recebe snapshot e identidade de execução; o programa não escolhe grants, origem, catálogo ou identidade.
- Mensagem tardia não recupera autoridade. Parar/dispose idempotentes; ciclo qualificado de L0/ADR001 preservado.
- Não mudar COEP global das aulas, catálogo/blocos/IR JS, comportamento de áudio, captura, progresso local, gamepad, exportação ou publicação existentes.
- Runtime Python não entra no bundle inicial do JS. Registro de loaders é leve e não importa WASM/Blockly/Monaco.
- R09 continua exigindo quatro fluxos públicos anônimos no lote final: JS/Python × Clássico/Pro. Outro computador permanece adiado pelo usuário.

## Dependências e ativação coordenada

L1 já tem envelope, fingerprints, revisão Pro, codecs/partes/resumos e factory preparados/revisados. Ainda faltam a união utilizada pelo editor, refinos de payload e conexão do store. Esta integração é dependência dessas tarefas abertas; não declarar L1 completo apenas por existirem contratos puros.

## Fatia 1 — Fronteira de execução

Arquivos novos: `packages/studio/src/runtime/types.ts`, `registry.ts`, `registry.test.ts`.

- [x] Definir identidade, eventos, sessão, provider e erro estruturado de preparação conforme §6.2. Entrada é documento v3 capturado/validado pelo host, não loader arbitrário do projeto. Stdin distingue linha vazia de EOF.
- [x] Registro lazy seleciona perfil/linguagem/tipo exatos; capacidades operacionais continuam resolvidas pelo contrato Core. Um provider ausente ou incompatível produz indisponibilidade, sem fallback JS.
- [x] Compartilhar carregamento do módulo, mas preparar sessão independente por execução; falha de import pode ser tentada novamente. Abort de uma preparação não cancela outra.
- [x] Testar ausência de import Python ao escolher JS, concorrência, falha/retry, abort e identidade; review desta fatia. Revisão independente: 15 testes/74 verificações, sem novos achados.

## Fatia 2 — Adaptadores existentes JavaScript

Arquivos existentes: `preview/renderProject.ts`, `components/preview/PreviewIframe.tsx`, `studio/pro-runtime.tsx`, `modes/pro/RemoteProPreview.tsx`, `modes/pro/ProPreview.tsx`, `components/preview/StudioProjectPlayer.tsx`.

- [x] Mapear os efeitos atuais (run/pause/restart, mute, snapshots, console, storage e gamepad) antes de alterar dispatch.
- [ ] Encapsular preparação do JS clássico e Pro sem duplicar receitas de preview nem lifecycle. Manter compatibilidade temporária de `proRuntime.build` até todos os hosts usarem a fronteira nova.
- [ ] Validar comportamento JS com testes existentes e navegador; revisar a mudança antes de integrar Python.

Mapa preservado: `PreviewIframe` controla debounce800ms, gate de hidratação do progresso, observer/autorun, orçamento de render, retry de extensão, fonte escolhida, nonce no mesmo iframe, foco somente por ação explícita, console/heartbeat, snapshots limitados, mute, gamepad e origem remota com abort/release. `StudioProjectPlayer` monta iframe por geração e conserva handshake/cota de espera/progresso anônimo das publicações Pro. Pro local mantém WebContainer compartilhado por projeto, instalação/dev-server/manual rebuild; Pro remoto mantém a última compilação durante nova tentativa, bridge/storage e artefatos validados. Pausar o preview clássico significa parar/reexecutar, não suspender uma VM.

Primeira extração: `runtime/javascript/classicDocument.ts` agora compartilha resolução de metadata e receita de documento entre preview, player e captura. Não transfere lifecycle nem cria sessão fictícia. Comparação com12documentos anteriores (cincoextensões oficiais e nenhuma, CSPcreative/strict) byte-idêntica. Testes286/784; revisão e prova de navegador em andamento. Provider/session e encapsulamento Pro permanecem pendentes.

## Fatia 3 — Documento e editor

Arquivos existentes: `core/project.ts`, `core/proProject.ts`, `state/projectValidation.ts`, `project-migrations/index.ts`, `state/projectStore.ts`, `state/proRevision.ts`, `persistence/*`, `studio/types.ts`, `studio/StudioCore.tsx`, `core/studio/project-format.ts`.

- [ ] Refinar envelope por linguagem e evoluir tipos sem disfarçar Python como JS. Validação Python de IR/blocos depende do adapter L4; não aceitar payload desconhecido como validado.
- [ ] Integrar factory com catálogo real e manifesto de artefatos gerados/verificados. Não usar hashes de fixture em produção.
- [ ] Conectar revisão Pro v2 ao mesmo CAS/inverso e configuração Python à fonte `requirements.txt`.
- [ ] Conectar cadeia 1→2→3, storage/resumos/cloud e writer somente quando os consumidores preservarem o formato novo. Manter originais/backups/heads e impedir sobrescrita por abas antigas.
- [ ] Exercitar abertura rápida, hidratação tardia, Ponte como fonte autoritativa, autosave/saída, duplicação, restore e importação nas variantes aceitas; revisar.

## Fatia 4 — Verificação do lote

- [ ] Testes afetados, typechecks dos consumidores, revisão de grafo/bundle e baseline JS.
- [ ] Review de requisitos e implementação, corrigindo achados. Registrar explicitamente quaisquer ativações dependentes de L3/L4, sem anunciar recurso inexistente.

Depois: runtime Python de produção (L3), Programação/Turtle/Ponte (L4), Pro (L5), Pinta (L5A), aulas/sala/admin (L6), mural/player/export/Zappy/Pensa (L7), validação integrada/full review/commit/merge local (L8).
