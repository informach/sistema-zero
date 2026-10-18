---
status: resolved
file: packages/admin/src/components/editor/lesson-rehearsal.tsx
line: 96
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Ensaio aceita inspeção de um contexto já retirado

## Review Comment

O ensaio Python guarda document/sectionId/epoch/draftRevision e compara apenas os valores finais após a inspeção, sem incluir authorId/lesson.id nem aposentar o owner quando o contexto muda. Assim, a resposta do autor A ainda completa a seção após mudar para B. Alterações A→B→A de autor, documento ou draftRevision também recuperam a aparente validade da resposta antiga. O efeito só aborta na desmontagem; onWorkspaceChange cobre fonte, mas não essas mudanças de escopo.

Prova independente `bun test ./.cache/review096-rehearsal-owner.test.tsx`, cwd packages/admin: 0 pass, 4 fail, 4 expect calls, exit1. Monta LessonRehearsal, LessonPreviewProvider e LessonSections reais com projeto/objetivo Python. Somente a porta inspectPythonSectionProject é gateada; ao retomar ela chama signal.throwIfAborted e input.assertCurrent antes de devolver um resultado. As quatro sequências são autor A→B, autor A→B→A, documento A→B→A e draftRevision A→B→A; todas devolvem accepted em vez de AbortError e atualizam completedProjects no contexto atual. Gates/root são liberados em finally. A prova não carrega CPython/WASM nem concede autoridade Members; demonstra progresso local/formativo obsoleto no ensaio.

Criar identidade estável para cada geração do contexto, incluindo autor/aula/documento/seção/revisão/epoch, aposentando a inspeção quando a geração é retirada no commit/unmount. Comparar a identidade capturada antes/depois dos awaits e impedir callback antigo de registrar conclusão. Acrescentar apenas authorId à comparação final não resolve A→B→A; preservar renders equivalentes sem reiniciar a operação válida.

## Triage

- Decision: `VALID`
- Notes: Resolvido após revalidação independente. useMemo conserva identidade do contexto enquanto documento/seção/epoch/draftRevision/autor/aula são os mesmos; useLayoutEffect cleanup aborta a inspeção do contexto retirado, e ingresso/assertCurrent comparam identidade. Próprios quatro cenários originais passaram4/8 exit0. Permanente isolado realDOM lido e executado diretamente:7/19 exit0, cobrindo também lessonABA/restart e unchanged (render equivalente continua válido), com abortflag antes da liberação da porta. Wrapper+JSrehearsal+form5/31 exit0; Biome11 fresh clean. Novo consumidor formativo Admin; não duplica093/095/091. Não qualifica helper CPython/browser/SDK ou autorização de progresso Members; Live.author em análise separada fora desta096.
