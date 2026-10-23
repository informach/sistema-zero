---
status: resolved
file: packages/admin/src/components/editor/lesson-structure-editor.tsx
line: 36
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Prévia combina projeto anterior com nova revisão do rascunho

## Review Comment

`ToolPreview` conserva `initialProject` em `useRef` e sua chave React é apenas `block.id`. Ao salvar uma mudança no bloco e retornar à prévia que ficou montada/oculta, `runtimeScope` passa a revisão nova, mas o seed entregue ao `StudioEmbed` continua sendo o antigo. A nova autorização de ensaio compara o candidato com o bloco salvo da revisão atual: uma troca Classic→Pro ou de linguagem/release passa a receber recusa, mesmo quando o projeto salvo atual está autorizado. Se apenas a fonte muda, o autor pode conferir o código antigo como se fosse o rascunho atual.

Reprodução independente: `bun test --tsconfig-override .cache/studio-python-l0/review043.tsconfig.json ./.cache/studio-python-l0/review046-preview.test.tsx` — 1 pass, 5 verificações, exit 0. O teste monta `LessonStructureEditor` real, atualiza o mesmo bloco de Python Classic para Pro com nova revisão e observa as props do `StudioEmbed` substituído somente para evitar abrir o engine: `rendered=classic`, `saved=pro`, contexto já com a revisão nova. `AuthorizeAuthoringRuntimeService` e policy reais recusam o candidato observado, mas aceitam o Pro salvo. Não houve execução de navegador nem alteração de produção.

Vincular a prévia de conferência ao conteúdo/revisão de origem efetivamente salvo. Para um ensaio que já acumulou trabalho local, detectar a alteração e oferecer reinício explícito preservando o estado anterior até a escolha, em vez de trocar código silenciosamente ou associá-lo à nova revisão. Exercitar o retorno da edição mantendo o bloco montado, mudança de ambiente e mudança somente de fonte; não depender apenas da chave de ID.

## Triage

- Decision: `FIXED`
- Notes: A prévia agora conserva projeto e revisão da sessão. Uma revisão diferente mostra aviso, retira o contexto de execução, passa o editor para observação e desabilita a checagem estrutural. A troca para o rascunho atual é explícita e permite antes baixar o trabalho anterior. O ensaio conserva também a revisão de cada workspace, inclusive em remontagem; mudanças no workspace invalidam sua conclusão estrutural. Nenhuma policy de continuidade foi relaxada e o revisor não alterou produção.

## Revalidation

- `bun test --tsconfig-override .cache/studio-python-l0/review043.tsconfig.json ./.cache/studio-python-l0/review046-preview-revalidate.test.tsx` — 1 pass, 0 fail, 23 verificações, exit 0. Usa `LessonStructureEditor` e `LessonRehearsal` reais, substituindo apenas o `StudioEmbed` para observar suas props. Confirma Classic→Pro com o mesmo ID, projeto antigo preservado sem autoridade, abertura explícita do novo projeto e serviço/policy reais recusando o candidato antigo e aceitando o atual.
- O mesmo teste edita o projeto no ensaio, muda novamente a revisão e remonta com “Ensaiar retomada”: o trabalho editado permanece associado à revisão antiga, em observação, sem `runtimeScope` e com checagem desabilitada. Só “Abrir rascunho atual” troca o projeto e restaura o contexto atual. Resultado observado: `reloads=2`, `oldWorkPreserved=true`, `staleExecutionDenied=true`.
- O harness emite o aviso interno `directory mismatch` do Bun com tsconfig externo; o caso concluiu sem falhas. Essa prova confirma composição React, proveniência e fronteira de autorização, sem iniciar interpretador ou navegador real. A qualificação de navegador do Admin continua separada; não declara L6 completo.
