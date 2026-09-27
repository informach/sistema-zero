# Desafio Certificate and Pitch Lesson Implementation Plan

**Goal:** Acrescentar ao Desafio uma aula final com emissão do certificado na primeira seção e vídeo de apresentação da Comunidade na segunda; a aula só termina depois de 90% do vídeo e do clique em Concluir aula.

**Architecture:** O certificado continua sendo emitido pelo serviço atual. Para aulas com progresso por seção, a emissão passa a completar apenas a seção que contém o bloco; a conclusão da aula usa o fluxo comum depois que todas as seções terminam. A aula existente sem progresso por seção conserva o comportamento anterior. O manifesto v5 declara o texto do certificado e preserva a arte e as assinaturas já configuradas no admin.

**Tech Stack:** TypeScript, Bun, React, manifestos JSON v5 e Markdown.

**Spec:** Decisão da usuária nesta conversa: módulo 3, uma aula com duas seções obrigatórias, certificado primeiro, pitch em vídeo depois, 90% do vídeo para liberar Concluir aula.

## Global Constraints

- Preservar os certificados já emitidos e a conclusão das aulas legadas sem progresso por seção.
- Não usar a compra da assinatura como critério de conclusão.
- O manifesto v5 preserva o ID e os campos de arte e assinatura do bloco `certificate` existente.
- A oferta da Comunidade está em `packages/community-kids/src/lib/links.ts`.
- Não importar nem publicar conteúdo em produção nesta tarefa.

---

### Task 1: Progresso da aula do certificado

**Files:**
- Modify: `packages/core/src/learning/section-progression.ts`
- Modify: `packages/core/src/learning/requirements.ts`
- Modify: `packages/members/src/application/learning/section-progression.service.ts`
- Modify: `packages/members/src/application/issue-certificate/issue-certificate.service.ts`
- Modify: `packages/members/src/composition-root.ts`
- Modify: `packages/members/tests/helpers.ts`
- Modify: `packages/member-shell/src/components/certificate-block.tsx`
- Test: `packages/core/tests/section-progression.test.ts`
- Test: `packages/members/tests/integration/certificate.test.ts`

**Interfaces:**
- Consumes: `CertificateRepository.findByUserAndCourse(userId, courseId)` e `LearningRepository.getStructure(lessonId)`.
- Produces: `lessonCompletionRequirements` reconhece `certificateState.issued`; `SectionProgressionService.read` libera a segunda seção após a emissão; `IssueCertificateService.execute` só conclui automaticamente aulas sem progresso por seção.

- [x] **Step 1: Escrever o teste de aceitação:** em uma aula com seção 1 `{ blockIds: [certificateBlockId] }` e seção 2 `{ blockIds: [pitchVideoBlockId] }`, emissão conclui apenas a primeira; 89% não libera a conclusão; 90% libera; `POST /complete` fecha aula e curso.
- [x] **Step 2: Executar o teste:** `bun test packages/members/tests/integration/certificate.test.ts` e confirmar que o cenário novo falha antes da alteração.
- [x] **Step 3: Implementar a regra:** aceitar `certificate` como critério da própria seção, verificar o registro emitido no `SectionProgressionService`, preservar a conclusão automática somente quando `hasSectionProgression` for falso e atualizar o player após emitir.
- [x] **Step 4: Executar os testes:** `bun test packages/core/tests/section-progression.test.ts packages/members/tests/integration/certificate.test.ts`.

### Task 2: Conteúdo da nova aula

**Files:**
- Create: `docs/aulas-interativas/aulas/desafio-certificado.md`
- Create: `docs/aulas-interativas/aulas/desafio-certificado.manifesto.json`
- Create: `docs/aulas-interativas/aulas/desafio-certificado.roteiro.md`
- Modify: `docs/aulas-interativas/qa/validar-manifestos.ts`

**Interfaces:**
- Consumes: manifesto v5, bloco `{ "kind": "certificate" }`, vídeo planejado e URL da oferta da Comunidade.
- Produces: aula com `lessonSlug: "certificado"`, duas seções na ordem certificado e próximos passos, com critérios respectivamente `certificado` e `video-pitch`.

- [x] **Step 1: Redigir proposta, manifesto e roteiro:** o vídeo reconhece o jogo criado, explica que a Comunidade oferece outros cursos e ferramentas conforme a Carreira e convida o responsável a consultar a oferta; não cita preço fixo.
- [x] **Step 2: Ajustar o validador:** esperar 28 manifestos e aceitar critério de certificado sem aviso de conclusão vazia.
- [x] **Step 3: Validar:** `bun docs/aulas-interativas/qa/validar-manifestos.ts` deve retornar 28 válidos e zero avisos.

### Task 3: Índices e revisão final

**Files:**
- Modify: `docs/aulas-interativas/modulos-desafio-primeiro-jogo.md`
- Modify: `docs/aulas-interativas/README.md`
- Modify: índices e verificações adicionais que contêm uma lista operacional das aulas atuais.

**Interfaces:**
- Consumes: nova aula `desafio-certificado` e resultado do validador.
- Produces: módulo 3 com Dia 4, Dia 5 e aula de certificado; contagens e limites históricos indicados com datas quando não forem atualizados.

- [x] **Step 1: Atualizar a lista do módulo 3 e o índice principal:** distinguir os 27 manifestos anteriores da nova aula e somar a nova duração/clipe.
- [x] **Step 2: Conferir links e paridade:** manifesto tem exatamente duas seções, o vídeo planejado tem um trecho no roteiro e o bloco de certificado permanece existente.
- [x] **Step 3: Verificar:** `git diff --check`, testes direcionados de certificados, validador dos manifestos e `bun run ci`.
- [x] **Step 4: Registrar no branch `staging`:** adicionar somente os arquivos desta tarefa e fazer commit local, sem publicar nem enviar ao remoto.
