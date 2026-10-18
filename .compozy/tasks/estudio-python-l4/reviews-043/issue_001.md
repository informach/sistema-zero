---
status: resolved
file: packages/admin/src/components/studio/studio-embed.tsx
line: 211
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Troca assíncrona usa catálogo revogado antes da publicação

## Review Comment

`replaceProject` preparava a semente com o catálogo capturado no início da operação e, após o `await`, conferia somente o contador de cancelamento/desmontagem. Se `authoringOptions` mudasse para uma configuração que retirasse ou revogasse a release durante o carregamento, a criação anterior ainda substituía a fonte e chamava `onProjectReset`, limpando a curadoria. A mudança do catálogo não incrementava esse contador. Isso é uma perda de autoria por decisão obsoleta; os metadados desta tela não constituem grants de execução, e esta prova não demonstra execução sem autorização.

Reprodução independente anterior à correção: `.cache/studio-python-l0/review043-authoring-races.test.tsx`. O harness monta o `StudioEmbed` real em React, suspende a factory, troca as opções ativas por opções com a mesma release revogada e libera a criação antiga. O projeto passa de JS para Python e o callback de limpeza é chamado, apesar da indisponibilidade atual. O editor interno é um probe do handle público; a factory e a validação de catálogo são reais. O arquivo também contém um caso isolado de importação sob catálogo anterior, que não é registrado como segundo defeito integrado: o hook de paleta do formulário já introduzia estado nulo e desmontava o importador quando sua identidade mudava.

A seleção deve ser validada novamente contra as opções atuais imediatamente antes de publicar a substituição, usando a mesma regra aplicada pela factory. Se a release ou o template deixar de ser elegível, conservar fonte, identidade e curadoria e mostrar erro. A checagem final e a publicação não podem ter outra suspensão entre si.

## Triage

- Decision: `FIXED`
- Notes: O implementador extraiu `resolveStudioAuthoringSelection`, compartilhado pela factory e pelo commit em `StudioEmbed`. A checagem final lê `latestAuthoringOptions` e ocorre depois do contador de cancelamento, imediatamente antes da substituição. O revisor não alterou código de produção. A key do importador também passou a refletir os IDs do catálogo, fortalecendo o componente isolado sem abrir uma segunda issue não demonstrada no wiring anterior.

## Revalidation

- `bun test --tsconfig-override .cache/studio-python-l0/review043.tsconfig.json ./.cache/studio-python-l0/review043-authoring-revalidate.test.tsx` — exit 0, 2 pass, 0 fail, 9 verificações. A mesma corrida agora conserva o documento original completo, mantém zero chamadas a `onProjectReset` e exibe a recusa. O segundo teste confirma que uma mudança direta JS→Python do catálogo descarta o candidato JSON anterior. Bun emitiu aviso interno de `directory mismatch` associado ao `tsconfig-override`; a suíte terminou com exit 0 e todas as verificações executadas.
- `bun test tests/studio-authoring-options.test.ts tests/studio-authoring-project.test.ts tests/studio-authoring-ui.test.tsx tests/lesson-authoring.test.ts` em `packages/admin` — execução independente: 20 pass, 0 fail, 108 verificações; cobre cancelamento, troca explícita de linguagem/tipo, indisponibilidade, curadoria, quatro documentos e gravação do nível Python.
- `bun test src/core/projectFactory.test.ts src/studio/StudioLesson.test.tsx` em `packages/studio` — execução independente: 12 pass, 0 fail, 50 verificações; inclui preservação dos assets JS Pro e passagem das props de aprendizagem. A suíte emitiu dois avisos React de atualização fora de `act`, já presentes no recorte informado; não é uma qualificação de navegador.
- A revisão também acompanhou `pythonLevel` no DTO/manifesto, projeção da baseline, contrato da sala e consumidores Shell/Studio. Nenhuma perda adicional foi demonstrada neste recorte. Providers/grants efetivos dos hosts permanecem fora desta fatia; estas provas não qualificam a entrega integral L6.
