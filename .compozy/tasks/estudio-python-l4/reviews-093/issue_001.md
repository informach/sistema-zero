---
status: resolved
file: packages/admin/src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/lesson-editor-client.tsx
line: 1080
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Captura antiga fecha sobre rascunho Python inválido novo

## Review Comment

captureEditors verifica studioActivityDraftIssue apenas antes de await studioHandle.save e depois chama captureBlock do render que iniciou a operação. closeBlock não marca busy; o formulário continua editável durante essa espera. Se o autor começa a fechar com critérios válidos e digita JSON inválido enquanto save está pendente, o guard já passou, a closure antiga captura o valor válido anterior e closeBlock fecha o editor. O texto inválido novo fica oculto e pode ser perdido na próxima abertura. A mesma captura antiga é usada pelos fluxos de revisão/publicação que passam por beforePublish; o guard precisa proteger o estado atual no fim da espera, não somente o estado inicial.

Prova independente `bun test ./.cache/review093-admin-race.test.tsx`, cwd packages/admin. LessonEditorClient/ActivityBuilder/PythonActivityBuilder e estado reais; fixture isolada derivada da existente lesson-editor-review.fixture com somente Studio.save aguardando gate, demais storage/fetch/embed ports iguais aos testes permanentes. Abre bloco Python com testcase válido → Voltar ao percurso → durante save escreve '[' em Casos de teste(JSON), valor DOM confirmado → libera save → textarea desaparece/editor fecha. Exit1/0pass1fail/7asserts,766ms; esperado manter editor aberto e rascunho '['. Gate liberado e Reactunmount no finally; sem browser/SDK/SQL.

Após cada await, conferir owner do editor (id/open/lifetime), reler form/callback de captura atuais e revalidar drafts antes de enfileirar/fechar/revisar/publicar. Uma captura iniciada para um editor aposentado não deve gravar sobre outro ou fechar sua sessão. Preservar o texto inválido visível e permitir correção; não usar versão válida anterior silenciosamente como substituto.

Revalidação do patch inicial currentCapture: original inválido pós-save já passa, mas igualdade de lessonId/blockId/open/kind/gallery/environment não distingue abertura A→fechamento→nova abertura A. Segundo caso próprio no mesmo arquivo: Voltar1 aguarda save1; Voltar2/save2 termina e fecha; reabre o MESMO bloco com mesmo ambiente; libera save1; close antigo fecha a nova abertura. Exit1/1pass1fail/18asserts,266ms no casoABA. A fence precisa de geração/token de abertura ou outra identidade de lifetime, além dos campos estáveis. Não é nova issue: é extensão da mesma captura/fechamento obsoletos ainda em correção.

## Triage

- Decision: `VALID`
- Notes: VALID/resolved após revalidação independente. currentCapture relê form/callback atual pós-await e valida JSON; currentBlockEditor mantém objeto estável por abertura, substitui em id/open/lesson e é retirado sincronamente em close/restauração. As duas sequências originais agora passam; próprio controle adicional com edição JSONválida durante save também captura valor atual e preserva __proto__, sem bloquear fechamento legítimo:3pass/26asserts exit0. Permanente real lesson-editor-review preserva invaliddraft+ABA e5legacy:7pass/37asserts exit0. Biome3fresh exit0, somentewarning imgNext preexistente. Detalhes/limites em _verification; sembrowser/SDK/ProxycancelE2E/featureglobal.
