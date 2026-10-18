---
status: resolved
file: packages/studio-runtime/tests/fixtures/python-distribution-wire.mjs
line: 39
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Prazo da prova wire depende de dispose cooperativo

## Review Comment

O prazo de45s chama mf.dispose().finally(process.exit), portanto não encerra o child se dispose não concluir. O finally normal também remove esse timer antes de aguardar dispose, deixando a prova sem prazo durante teardown. O wrapper `tests/python-distribution-wire.test.ts` aguarda child.exited e drains sem race nem finally de killowned; o timeout60s de bun:test marca a falha, mas não é um mecanismo de encerramento do processo filho/workerd. O finally do wrapper deve evitar remover entradas enquanto um processo owned ainda as usa.

Prova independente leve `.cache/review119-platform-evidence.ts`, `bun run ./.cache/review119-platform-evidence.ts` no worktree raiz, exit0. Executa os blocos reais extraídos do runner em funções isoladas com apenas timer/process/dispose controlados: dispara o deadline, observa pedido de dispose e zero process.exit enquanto ACK permanece pendente; executa finally normal e observa timer removido antes do mesmo ACK pendente. Confere que o wrapper aguarda child.exited e não contém timer/kill. Nenhum subprocesso real, Miniflare/workerd, Docker, navegador ou build é aberto nesse probe. Isso demonstra a falha de orçamento/ownership sob teardown não cooperativo, sem afirmar que o after1 deixou recursos: aquele relatório confirma cleanup real.

Manter orçamento total ativo até ACK e limitar grace de teardown independentemente de dispose. O parent precisa cercar child/drains com deadline e finally de retirement apenas da árvore owned, inclusive quando o runner não responde. Confirmar término antes de remover os arquivos de entrada; preservar erro primário, relatório e falha de cleanup. Não encerrar processos globais ou recursos alheios.

## Triage

- Decision: `VALID`
- Notes: Raiz confirmou medium de QA e planeja hard-cleanup grace no runner, deadline/retirement de árvore owned no parent e permanente nativa de falha não cooperativa. Patch e prova antes/depois pendentes. Não duplica076: aquele tratava preparo do harness SDK Linux; este é novo runner de compressão/Miniflare e seu wrapper. Não altera a conclusão específica119001 nem alegações de cleanup da execução real bem-sucedida.
- Resolution: Patch substitui timer cooperativo do child por helper parent-owned com45s para exit/drains e grace independente5s de tree retirement; outputs limitados64KiB, erro preservado, inputs retidos sem ACK. Revisor executou permanente nativa3/11 e cache adaptado2/6, ambos exit0, com Node24.22: deadline/overflow/sinal já-retirado e retirada após prontidão real, filho+neto ausentes e entrada preservada até ACK. Wire real after2 relido: exit0, cinco casos/retired200/revoked404/cleanuptrue, gzip66B/SHA correto. Recibos Runtimeprod/testTSC4 reais lidos, ambos exit0. Resolvido somente harness Windows desse slice; caminho POSIX e proxy originalAcceptEncoding não são qualificados por estas provas.
