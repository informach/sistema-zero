# L3 — Runtime Python isolado Implementation Plan

> **For agentic workers:** usar `executing-plans`, já aplicada, na worktree autorizada. Revisão independente por fatia via `cy-review-round`. Commit e merge somente no final de L0–L8, conforme o usuário.

**Goal:** executar snapshots Python reais em um worker dentro de iframe opaco, com o mesmo provider para editor e player público.

**Architecture:** separar host, frame confiável e worker não confiável. O host valida catálogo/documento/grants; o frame controla a geração, limites e recursos; CPython recebe somente snapshot temporário. Distribuição fixa por hash, sem instalar pacotes arbitrários ou executar fonte na thread do editor. L2 tem dependências cruzadas: ativação documental, providers JS e UI continuam abertas até L4/L7; esta etapa não as declara concluídas.

**Tech Stack:** TypeScript, MessageChannel, Web Worker clássico com import dinâmico, Pyodide314.0.7/CPython3.14.2 qualificados em L0, build Bun e serviço runtime existente.

**Spec:** proposta §6, anexo de desempenho e ADR `.compozy/tasks/estudio-python-l0/adrs/001-worker-stop.md`.

## Global Constraints

- Não mudar COOP/COEP global. `allow-same-origin` proibido no frame.
- Reservar a política Trusted Types no worker e permitir somente bootstrap privado no frame; filhos bloqueados.
- Parar invalida autoridade e efeitos antes do ACK≤250ms; liberação física≤3s é prova separada. Não prometer execução de finally.
- Projeto JS não importa/baixa Python. Python básico não baixa Turtle/renderer.
- Fonte/arquivos gerados executam em FS temporário; nenhuma gravação automática no documento.
- `run` único por geração; `completed` pode manter REPL, `failed` encerra execução. Stdin linha vazia distinto de EOF.
- Artefatos e distribuição de terceiros mantêm hashes/licenças; disponibilidade no catálogo depende de qualificação, nunca de fixture.
- Provas no outro computador e móvel físico continuam adiadas; executar provas locais.

## Task 1 — Snapshot e fronteiras de mensagens

Arquivos: `packages/studio/src/runtime/python/protocol.ts`, `snapshot.ts`, `snapshot.test.ts`, `consoleBuffer.ts`, `consoleBuffer.test.ts`.

Produz `preparePythonExecutionSnapshot(raw)` (Pro inicialmente; Clássico depende do IR L4), `PythonExecutionSnapshot`, comandos/eventos do worker e buffer de saída limitado. Reutiliza leitor/materializador Python; não cria segundo histórico.

- [ ] Capturar documento antes de awaits; montar fontes, diretórios e bytes, mantendo caminhos e entrypoint. Emitir digest do snapshot, sem timestamp/UI. Extensão instalada é derivada do documento aprovado, não inferida de `import turtle`.
- [ ] Validar limites e correlação das mensagens. Console entrega lotes limitados com contagem de linhas omitidas; fila limitada mesmo antes do timer conseguir executar. O consumidor não aceita getters/proxies executáveis de programa (somente structured clone).
- [ ] Testar mutação durante await, imports multifile/assets, colisões e floods de saída; reusar corpus Pac-Man para preservação, sem declarar jogo executado.

## Task 2 — Worker e distribuição verificável

Arquivos: `runtime/python/worker.ts`, `interpreter.ts`, `interpreter.py`, `vendor-manifest.json`; `packages/studio/scripts/build-python-runtime.ts`.

- [ ] Build sem execução autoral: carregar interpreter por localização host-owned, conferir versão; montar snapshot em diretório temporário; executar `compile(bytes, __file__, 'exec')` no módulo `__main__` real, com CWD/argv/sys.path corretos e sem alterar bytes de fonte, como qualificado no L0/entrypoint.ts. Não usar a cópia de globals de runpy para o REPL: funções devem observar o mesmo namespace editado pelo console.
- [ ] `print`/stderr em lotes, stdin via suspensão JSPI, REPL com scheduler exclusivo, mensagens correlacionadas. Capturar tracebacks limitados e destruir proxies de retorno. Pacotes não aprovados geram indisponibilidade, não pip/rede livre.
- [ ] Builder verifica cada arquivo Pyodide contra hash fixado antes de copiar; gera worker/frame e manifesto de artefatos reais. Nenhum hash fictício, URL do aluno ou arquivo experimental no catálogo de produto.
- [ ] Provas de console, entrada, EOF, erro, multifile, arquivo binário e fonte desktop idêntica em Chrome/Edge.

## Task 3 — Supervisor do frame e provider

Arquivos: `runtime/python/frame.ts`, `provider.ts`, `session.ts`; integração de artefatos no serviço `packages/studio-runtime`.

- [ ] Canal host/frame com versão/desafio e porta privada; fonte validada pelo host. Frame aceita somente parent na inicialização. Worker não recebe grants, credenciais ou referência de janela.
- [ ] CSP do frame limita rede/scripts aos artefatos aprovados; bootstrap clássico qualificado, Trusted Types reservado e nenhum subworker. Falha de CSP/capacidade/boot rejeita prepare, sem sessão ready falsa.
- [ ] Sessão controla run/repl/input/stop/dispose, aborto e mensagens tardias. Limites antes de validações pesadas; input pedido uma vez; listeners/timers/BlobURLs/portas liberados em qualquer saída.
- [ ] Turtle liga por módulo lazy L4 e contrato gráfico próprio, não comandos arbitrários no host. Sessão sem Turtle opera console independente.
- [ ] Exercitar loop infinito, flood, fontes maliciosas, duas instâncias, restart e30ciclos, medindo ACK e término nativo separadamente.

## Task 4 — Gate de integração

- [ ] Review de cada fronteira, corrigir achados, typecheck/build e provas reais. Comparar contra L0/ADR001 e registrar metas não atingidas.
- [ ] Conectar catálogo release verificada e provider registry L2; somente habilitar UI/writer quando readers/store/IR e hosts estiverem prontos.
- [ ] Mesmo executor para publicação anônima L7; não criar runtime alternativo exclusivo do editor ou depender da sessão do autor.

Este plano cobre execução. Linguagem/IR/Turtle são L4; LSP Pro L5; Pinta L5A; admin/aulas/live L6; publicação/exportação/Zappy L7; aceites integrados L8.
