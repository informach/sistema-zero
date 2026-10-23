# Cursor de código da assistência — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Implementação pelo agente principal; revisão independente conforme cy-review-round.

**Goal:** Mostrar a indicação do professor no arquivo e na versão corretos em JS/Python Clássico/Pro, preservando os alvos Blockly/controles.

**Architecture:** Um alvo de código contém caminho, faixa UTF-16, SHA-256 do texto e versão local do modelo. Members aceita apenas o texto da revisão canônica sob a lease vigente; o receptor compara o próprio buffer antes de resolver a posição pelo Monaco. O registro de editores pertence à instância do Estúdio, sem busca global em DOM/modelos.

**Tech Stack:** TypeScript, React, Monaco público, Web Crypto, Elysia, Bun/Playwright existentes.

**Spec:** `docs/plans/2026-10-16-estudio-javascript-python-turtle-proposta.md`, seção10. Demais partes L6–L8 permanecem no plano integral.

## Restrições

- Não trocar arquivo, rolar ou editar o código do observador ao receber cursor.
- Fonte pendente, rename, troca de aba, modelo descartado, outra instância, revisão antiga ou resposta de hash atrasada não produzem indicação.
- Versão local do Monaco identifica a geração no emissor; não comparar esse número entre computadores. O hash identifica texto entre máquinas.
- O projeto continua sendo salvo pelo coordenador existente. Envio de cursor não salva código nem renova autorização.
- Continuar a execução após o review; commit e merge local somente no fechamento integral solicitado.

## Tarefa1 — contrato e validação servidora

Arquivos: `core/src/live/workspace.ts`, novo `core/src/studio/code-anchor.ts`, `members/src/application/live/live-workspace.service.ts`, `members/src/interfaces/http/routes/live-workspaces.routes.ts`; testes em `core/tests/studio-code-anchor.test.ts` e `members/tests/unit/live-workspace.test.ts`.

Interface do novo alvo:

```ts
type StudioCodeAnchor = {
  kind: 'code'; id: string; start: number; end: number;
  sourceSha256: string; modelVersion: number;
}
// Leitura sem fallback entre os namespaces Classic/Pro:
studioSourceAtPath(project: unknown, path: string): string | null
studioSourceSha256(source: string): Promise<string>
codeAnchorMatchesSource(anchor: StudioCodeAnchor, source: string): Promise<boolean>
```

- [x] Testar os quatro documentos, extras JS, arquivo ausente/diretório, offsets UTF-16 com emoji, hash divergente e faixa fora do texto.
- [x] Implementar leitura de fonte apenas no namespace autoritativo e validação de faixa/hash.
- [x] Estender DTO com união estrita; no serviço exigir revisão igual e fonte/hash compatíveis depois de assertWriter. Recusa não altera o cursor anterior.
- [x] Testar assistência real pelo serviço: aceita fonte confirmada; recusa buffer não salvo, revisão/epoch antigos e outro ator.

```ts
expect(await codeAnchorMatchesSource(anchor, 'x = "😀"')).toBe(true)
expect(await codeAnchorMatchesSource(anchor, 'x = "outro"')).toBe(false)
```

Comandos: `bun test tests/studio-code-anchor.test.ts` em core; `bun test tests/unit/live-workspace.test.ts` em members.

## Tarefa2 — registro de observação por instância

Arquivos novos `studio/src/studio/code-observation.tsx` e `studio/src/monaco/codeObservation.ts`; modificar `StudioCore.tsx`, `types.ts`, `MonacoTabs.tsx` e exportações públicas.

Interfaces no handle:

```ts
getCodeCursorAnchor(clientX: number, clientY: number): Promise<StudioCodeAnchor | null>
getCodeCursorPosition(anchor: StudioCodeAnchor): Promise<{left: number; top: number} | null>
```

- [x] Registry local registra/desregistra somente editores montados; MonacoTabs resolve caminho lógico pelo modelPaths existente, inclusive rename com URI estável.
- [x] Captura via getTargetAtClientPoint; posições/offsets são calculados sobre a fonte canônica, preservando EOL misto que Monaco normaliza. Hash é cacheado por objeto/modelVersion/fonte; antes/depois de await conferir modelo/caminho/versão/fonte.
- [x] Receptor confere hash, converte a posição da fonte canônica, exige posição visível em getVisibleRanges e usa getScrolledVisiblePosition com hit-test de confirmação. Retorna coordenadas do viewport; não manipula scroll/seleção.
- [x] Testar troca de aba/rename/conteúdo/descarte durante hash, dois registros independentes, scroll/posição oculta. Usar porta estrutural mínima de Monaco sem simular implementação do serviço.

Comando: `bun test src/monaco/codeObservation.test.ts` em studio.

## Tarefa3 — sala e qualificação

Arquivos: `member-shell/src/lib/live/cursor.ts`, `components/live/live-workspace.tsx`, `components/live/live-assistance-cursor.tsx`; testes de cursor existentes/novos e cenário Playwright do Estúdio.

- [x] Ponteiro tenta alvo de código no handle; somente depois usa controle/bloco. Guardar epoch/revisão/generation antes do await e descartar resposta atrasada após troca de autoria.
- [x] Cursor do observador consulta handle e recorta contra o contêiner/viewport; callback atrasado não reaparece após expiração/troca de revisão. Invalidar imediatamente posição já desenhada após conteúdo/modelo/scroll/layout mudar.
- [x] Não mover foco, scroll ou arquivo para satisfazer indicação. Caso não visível retorna null; Blockly continua síncrono.
- [ ] Executar testes focados, typechecks sequenciais, cenário browser com emoji/scroll/troca de arquivo/edição pendente.
- [x] Review independente, corrigir achados, registrar provas e continuar L6 integral.

## Evidência do lote

- Core: 2 testes / 26 asserções; serviço Members: 33 / 178; registro Monaco e componente React real: 8 / 19.
- Chrome + Edge: 4 cenários passaram (`l6-code-cursor-browser-1.log`), Clássico/Pro Python, emoji/EOL misto, scroll e edição pendente. Os testes do serviço cobrem também JS Clássico/Pro; o navegador ainda não qualifica o fluxo completo de duas pessoas na sala.
- Review040: 1 achado médio corrigido, 0 pendentes. Revisão independente usou componente React e PieceTree reais para confirmar invalidação e preservação da fonte canônica.
- Studio typecheck (`l6-studio-cursor-typecheck-1.log`) termina com três lacunas já conhecidas em atividades, exportação web e Zappy, que continuam no escopo integral. Não há novo erro apontado no cursor. Typechecks Members/Shell após este lote e teste integrado da sala seguem pendentes.
