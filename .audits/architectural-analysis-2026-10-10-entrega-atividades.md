# Revisão da entrega de atividades e dos rascunhos de aula

Data: 10/10/2026. Base: `f273e5687^`. HEAD revisado: `4da8853a0`.

## Resultado

**Cinco achados confirmados na revisão inicial: três P1 e dois P2. Os cinco foram corrigidos após autorização da usuária.** As descrições abaixo preservam os defeitos e suas reproduções na base revisada. A tabela seguinte registra as correções e as novas verificações.

A revisão inicial não alterou a implementação. A etapa de correção modificou código, testes e documentação local. Não houve publicação nem alteração de dados de produção.

## Correções aplicadas em 10/10/2026

| Achado | Correção | Regressões permanentes |
| --- | --- | --- |
| 1. Avanço antes do salvamento local | Coordenador registra os editores por aula, força a gravação do estado atual e confirma a conta antes do POST de avanço/conclusão. A edição fica inerte até terminar. Falha impede o avanço e permite tentar novamente. | `member-shell/tests/lesson-draft-coordinator.test.ts`; `community-kids/tests/lesson-sections.test.tsx` |
| 2. Flush confundido com confirmação | `confirm` acompanha o item, inclusive backup e reenvio de conflito; timeout e falha terminal rejeitam. Avanço, conclusão e envio usam confirmação. Falha de leitura do arquivo também rejeita, sem simular sincronização concluída. O flush da saída continua sendo melhor esforço. | `community-kids/tests/lesson-draft-cloud.test.ts`; `member-shell/tests/lesson-draft-persistence.test.ts` |
| 3. Marca avançada antes do backup | Estúdio e Pinta só adotam a revisão remota depois de baixar e guardar a outra versão. Falha conserva a marca antiga e obriga a resolver o conflito antes de sobrescrever a conta. | `member-shell/tests/lesson-draft-persistence.test.ts`, download e armazenamento nos dois editores |
| 4. Escrita no namespace errado | `replaceLocalProject` aceita namespace explícito. O rascunho, a cópia de conflito e o reinício da aula usam `namespace: ''`. | `studio/src/state/persistence.test.ts` |
| 5. UUID inválido chegava ao PostgreSQL | BFF, DTO HTTP do Members e serviço de acesso validam UUID para `lesson-studio`/`lesson-pinta`. Os identificadores das ferramentas livres continuam aceitos. | `member-shell/tests/creations-routes.test.ts`; `members/tests/integration/lesson-drafts.test.ts` |

Verificação após as correções:

- Members: **1.350 passaram**, 49 condicionais ignorados; nenhum erro. Não houve alteração de esquema nesta etapa.
- Member-shell: **1.146 passaram**, nenhum erro.
- Kids: **1.242 passaram**, nenhum erro. Depois dos ajustes finais, mais 103 verificações direcionadas de navegação/transportes e 114 dos adaptadores das ferramentas livres passaram.
- Estúdio: **8.769 passaram**, nenhum erro.
- Typecheck de Members, member-shell, Kids e Estúdio: **quatro execuções finais sem erros**.
- Provas integradas adicionais em `.tmp/review-lesson-drafts/fixed-flow.test.ts` e `fixed-namespace.test.ts`: **3 passaram**. Edição antes do autosave chega à conta e o Members recusa avançar com `SECTION_LOCKED` até reenviar; identificador inválido recebe 400 com repositório PostgreSQL real; a cópia remota continua no banco da aula mesmo após trocar o namespace do editor completo.
- Biome: 25 arquivos de código/testes verificados. `git diff --check` sem erros.

As quatro suítes completas totalizam **12.507 testes aprovados**. As execuções direcionadas são repetições e não entram nessa soma. Os logs estão em `.tmp/review-lesson-drafts/` (`final-*.log`, `fixed-proofs.log`, `types-*.log` e `biome-final.log`). Esta verificação cobre testes automatizados; não inclui uma sessão manual em navegador com dois aparelhos reais.

Escopo: os commits `f273e5687` e `4da8853a0`, 97 arquivos alterados. Inclui core, Members, member-shell, Kids, Admin, migrações, testes e documentos das aulas. O plano de referência é `C:/Users/tocha/.claude/plans/wise-drifting-pelican.md`. O trabalho anterior de login infantil não é o objeto desta revisão.

## 1. [P1] Salvar o editor antes de verificar se a entrega está atualizada

Referência principal: `packages/member-shell/src/components/lesson-sections.tsx:677`.

O clique em Próxima parte chama apenas `lessonDrafts.flushAll()`. A fila da nuvem só recebe uma alteração **depois** que o editor a grava localmente. Tanto o Estúdio quanto o Pinta têm salvamento com atraso; o Pinta usa 1 segundo e o Estúdio também mantém alterações pendentes no editor. Nesse intervalo, a fila pode estar vazia e o flush terminar imediatamente.

Reprodução: existe um envio A e um rascunho A. A criança muda um pixel e avança antes do salvamento automático. O teste usa o `createEditorStore` real do Pinta, o adaptador `withDraftUpload`, a fila real e o fluxo HTTP de navegação do Members com seus repositórios em memória. O flush termina com `dirty=true` e nenhuma reserva de upload. A navegação responde 200. Quando o rascunho B chega depois, a parte já está registrada como concluída e permanece concluída. A equipe continua com o envio A.

O mesmo problema existe no caminho de concluir a fase em `packages/community-kids/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx:170`: ele também espera somente a nuvem.

Correção indicada: os editores montados devem registrar uma operação de salvar/confirmar o estado atual. Antes de avançar ou concluir, drenar os buffers do editor e o salvamento local; só depois confirmar na nuvem a revisão correspondente. Falha no salvamento não deve virar conclusão definitiva baseada na versão anterior.

Confiança: alta. Reprodução: `repro.test.ts`, teste `cloud flush does not drain the editor autosave before settling the section`.

## 2. [P1] Não tratar o flush da fila como confirmação de sincronização

Referência principal: `packages/community-kids/src/lib/lesson-draft-cloud.ts:125`.

O novo canal repassa `createCreationsCloud.flush()` diretamente. Esse método foi desenhado para tentar esvaziar a fila sem prender a saída do editor; ele **não garante** que o conteúdo foi confirmado no servidor. Há dois caminhos relevantes:

- No conflito 409 `CREATION_STALE_BASE`, a fila remove o trabalho e dispara `onStale` em segundo plano. O flush pode resolver enquanto o download da cópia de segurança e a nova subida ainda não terminaram (`creations-cloud.ts:929` em diante).
- Com o teto de 4 segundos, o `Promise.race` resolve mesmo se o upload continua pendente (`creations-cloud.ts:1095`). Os consumidores seguem para a navegação/conclusão e ainda ignoram rejeições com `catch(() => {})`.

Reprodução: dois aparelhos já produziram as revisões 1 e 2. O aparelho local tenta subir outra alteração com base 1. O teste segura a cópia de segurança com uma promessa controlada. `flushAll(4000)` resolve, a marca local ainda é revisão 1 e a nuvem ainda contém a impressão anterior. Só depois de liberar a cópia ocorre a revisão 3. Essa janela permite concluir a parte usando a versão anterior, mesmo após corrigir o salvamento local do achado 1.

Correção indicada: separar a tentativa de flush usada na saída da página de uma confirmação exigida para avançar. A confirmação precisa acompanhar conflitos, novas tentativas e a revisão/impressão que se quer validar. Timeout ou falha devem devolver um resultado explícito de pendência. Não basta aguardar uma Promise que pode resolver sem commit.

Confiança: alta. Reprodução: `repro.test.ts`, teste `flush resolves while conflict backup/reupload are still blocked`.

## 3. [P1] Só adotar a revisão remota depois de preservar a outra versão

Referências: `packages/member-shell/src/components/pinta/lesson-pinta-draft.ts:87` e `packages/member-shell/src/components/studio/lesson-studio-draft.ts:112`.

Na abertura em que local e nuvem mudaram, se a versão local vence, o código primeiro executa `setMark()` com a revisão remota e só depois tenta baixar/gravar a cópia remota como “Outra versão”. Se o download ou a gravação falha, a preparação lança; o componente captura o erro e continua abrindo o trabalho local. A marca, porém, já foi persistida.

Reprodução: o aparelho conhece revisão 1, a conta tem revisão 2 diferente e o local é mais recente. O download da cópia remota falha. O teste confirma que a cópia de segurança está vazia, mas a marca já é revisão 2. O próximo salvamento sobe com `baseRevision=2`, sem provocar o conflito que obrigaria a preservar a versão remota. O commit pode substituir essa versão e agendar a limpeza do blob anterior. A promessa de manter as duas versões deixa de ser cumprida.

Correção indicada: concluir a preservação da versão remota antes de avançar a marca usada como base do upload. Em falha, manter a revisão anterior e permitir uma nova tentativa segura. Aplicar o mesmo ordenamento nos dois editores.

Confiança: alta. Reprodução: `repro.test.ts`, teste `failed backup nevertheless acknowledges remote revision`.

## 4. [P2] Fixar também o armazenamento das escritas do rascunho do Estúdio

Referência: `packages/member-shell/src/components/studio/lesson-studio-draft.ts:53`.

As leituras desse módulo usam explicitamente `{ namespace: '' }`, o armazenamento das aulas. A função `gravar()`, entretanto, chama `replaceLocalProject(project)` sem escopo. Essa função grava no namespace global ativo no momento da escrita.

A fila da aula sobrevive à navegação. Se houver um conflito em andamento e a criança abrir o Estúdio Completo enquanto a versão remota baixa, o namespace global passa a ser o do perfil. Quando o download termina, a cópia “Outra versão” é gravada no armazenamento do Estúdio Completo. Ao voltar à aula, a busca no armazenamento das aulas não encontra a cópia.

Reprodução: usa `keepRemoteAsOther`, `replaceLocalProject`, validação e leitores reais do Estúdio, com `fake-indexeddb`. O download é segurado; troca-se o namespace como faz o Estúdio Completo; depois libera-se o download. A cópia não existe no namespace da aula e existe no namespace do perfil.

Correção indicada: passar um escopo explícito e estável também para a substituição/gravação, preservado através dos awaits. Evitar restaurar temporariamente o namespace global, pois isso cria outra disputa entre operações.

Confiança: alta. Reprodução: `namespace.test.ts`.

## 5. [P2] Validar UUID nos identificadores dos novos rascunhos de aula

Referência: `packages/members/src/application/creations/lesson-draft-access.service.ts:51`.

Os novos tipos `lesson-studio` e `lesson-pinta` usam o UUID de um bloco. Porém, o BFF e o DTO do Members continuam aceitando o identificador genérico das criações (`[A-Za-z0-9_-]{1,64}`). O serviço entrega essa string diretamente ao `findBlockLessonId`, que consulta uma coluna UUID.

Reprodução: POST em `/creations/lesson-studio/not-a-uuid/upload` com os demais campos válidos passa pela validação HTTP. Usando o `DrizzleCourseRepository` real no banco descartável, a consulta falha e a resposta é 500, em vez de uma recusa 400 antes do banco. O erro também é classificado pelo transporte como passível de nova tentativa.

Correção indicada: exigir UUID para os dois tipos de rascunho na borda e no serviço que resolve o acesso à aula. Conservar o formato genérico para as ferramentas livres que usam outros identificadores. Acrescentar um teste HTTP com repositório real ou validação de que IDs inválidos não chegam à consulta.

Confiança: alta. Reprodução: `repro.test.ts`, teste `non-UUID lesson block passes HTTP validation and becomes PostgreSQL 500`.

## Verificação da revisão inicial, antes das correções

| Verificação | Resultado |
| --- | --- |
| `packages/core`: `bun test tests` | 154 passaram |
| `packages/members`: `bun test tests` | 1.349 passaram; 49 testes condicionais ignorados |
| `packages/member-shell`: `bun test tests` | 1.134 passaram |
| `packages/community-kids`: `bun test tests` | 1.237 passaram |
| `packages/admin`: `bun test tests` | 478 passaram |
| Migrações e persistência: `learning-migrations.test.ts`, com banco descartável explícito | 35 passaram, incluindo testes ignorados na execução geral |
| Typecheck: core, Members, member-shell, Kids, Admin e Community | Seis execuções sem erros |
| Biome nos arquivos de código/dados alterados | 78 arquivos, sem erros |
| `git diff --check f273e5687^..HEAD` | Sem erros |
| Validador de manifestos de aulas | 37 válidos, zero avisos e zero reprovações |
| Cinco provas de reprodução desta revisão | Os cinco comportamentos defeituosos foram confirmados |

Total das execuções de testes do projeto: **4.387 aprovações**. As cinco provas adicionais afirmam o comportamento atual defeituoso; sua aprovação não significa que os defeitos foram corrigidos. Os testes existentes não cobriam essas combinações de salvamento local, sincronização, navegação e falha na preservação da cópia.

Banco de QA criado especificamente para esta revisão: `sz_aulas_qa_review_drafts_20261010`, PostgreSQL local na porta 5433. A suíte de migrações exige e usa um banco descartável com esse prefixo; nenhum banco de produção foi usado.

Logs e reproduções: `.tmp/review-lesson-drafts/`. Para repetir as provas depois que o banco descartável estiver preparado:

```powershell
bun .tmp/review-lesson-drafts/prepare-probes.ts
bun test ./.tmp/review-lesson-drafts/repro.test.ts ./.tmp/review-lesson-drafts/namespace.test.ts
```

## Observações da revisão inicial sobre arquitetura e cobertura

- O isolamento de rascunhos em `lesson-studio`/`lesson-pinta`, a verificação de acesso pela aula e o reaproveitamento do transporte de criações evitam misturar a atividade com a galeria livre. Não encontrei quebra de isolamento entre perfis no fluxo revisado; isso não substitui teste de navegador com duas sessões reais.
- A impressão do conteúdo foi centralizada no core. Os testes exercitam os campos relevantes e a compatibilidade do JSON canônico usado pelas partes já salvas. As migrações de enum e colunas passaram contra PostgreSQL real.
- A decisão de qual versão abrir é pura e testada, mas os adaptadores de Estúdio e Pinta repetem a sequência que adota a revisão e guarda a cópia. O achado 3 está duplicado nos dois: a política de confirmação deve ser compartilhada ou ter os mesmos testes de falha nos dois adaptadores.
- Não havia arquivo de produção novo inteiramente sem consumidor identificado. A exigência desnecessária de `restoreProjectFromCloud` em `StudioDraftDeps` também foi removida na correção. `KidsLessonDraftCloud.dispose()` existe, mas o singleton usado pelo player não tem chamada de descarte no código de produção. Esta última é uma observação de manutenção, sem novo defeito funcional confirmado além dos cinco acima.
- Não foram executados QA manual em staging/produção, testes de dois navegadores reais nem inspeção visual dos PDFs gerados. As provas usam implementações reais com transporte controlado, repositórios em memória onde indicado, IndexedDB simulado e PostgreSQL local para migrações/UUID.

## Ordem recomendada na revisão inicial

1. Preservar a versão remota antes de atualizar a base; fixar o escopo de escrita do Estúdio.
2. Criar a sequência obrigatória: salvar editor → salvar localmente → confirmar a revisão na nuvem → verificar/navegar. Fazer a confirmação aguardar conflitos e distinguir timeout de sucesso.
3. Validar os IDs dos rascunhos de aula antes do acesso ao banco.
4. Transformar as reproduções em testes de regressão nas respectivas suítes e validar os fluxos em dois aparelhos, incluindo rede lenta e falha no download da outra versão.

## Revisão seguinte (10/10/2026, mesmo dia): o que mudou nas correções acima

Um full review das correções acima (quatro revisores em paralelo: servidor, núcleo e cursos, blocos da aula, transporte do Kids) achou que a confirmação obrigatória da conta prendia a criança em toda fase com Estúdio ou Pinta: cota cheia, projeto recusado, editor ainda carregando ou 5xx repetido travavam avançar, voltar, concluir e enviar à equipe. O que vale agora:

- A confirmação só é exigida nos blocos das partes com "envio em dia" que a ação fecha (`upToDateWorkspaceIds`; voltar não fecha nada). Nos outros, salvar e subir são tentativa, com teto de 4 s.
- Falhando a conta numa parte marcada, ela passa se o trabalho deste computador é o que foi enviado (`matchesSubmission`); enviar de novo sempre destrava.
- O envio à equipe não espera a nuvem do rascunho (achado 2 desta revisão, revertido no envio).
- Conflito na subida: conteúdo igual só adota a revisão; no primeiro contato do aparelho com a conta, a versão da conta passa para cima e a daqui vira a "Outra versão" (antes, o modelo inicial podia subir por cima do trabalho guardado).
- `confirm` espera o item (não a fila), não acorda o backoff a cada volta e a fila manda para o fim quem vai tentar de novo.

Detalhes e testes no commit da revisão e nos CLAUDE.md de member-shell e community-kids.
