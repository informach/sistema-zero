# Revisão das oficinas ao vivo — 14/10/2026

**Resultado: 8 achados acionáveis, sendo 3 de prioridade alta (P1) e 5 de prioridade média (P2).** Recomendo corrigir os P1 antes de aprovar esta versão para produção. A organização por curso, turma e encontro é coerente, mas ainda há falhas entre os componentes que passaram nos testes isolados.

Revisão de `feat/cursos-ao-vivo`, HEAD `c0213934f`, no worktree `.claude/worktrees/voz-para-texto`. Comparação com `8cc24ced5`: 315 arquivos, 53.275 linhas adicionadas e 5.179 removidas, incluindo documentação, testes e snapshots de migrações. Escopo funcional: autoria, catálogo, matrícula, sala da criança e professora, gravação, projetos, acesso, progresso e integração com a comunidade adulta.

Incluídas as alterações locais de `member-shell/CLAUDE.md`, `media-devices.ts`, `live-media.test.ts` e `live-media-panel.tsx`. A última apareceu durante a revisão; foi relida e os testes de mídia e a checagem de tipos do member-shell foram reexecutados. HEAD permaneceu igual. Os hashes de arquivos relevantes estão em [review-file-hashes.json](../.tmp/codex-live-review/review-file-hashes.json).

Não alterei código da aplicação, configurações de infraestrutura ou dados externos. Este relatório e as reproduções locais são os artefatos da revisão.

## Achados

### 1. [P1] O BFF do Vimeo permite obter a gravação sem validar a atribuição à turma

**Local:** [live-recording-vimeo.ts:134](../packages/admin/src/server/live-recording-vimeo.ts#L134), também linhas 121–128. A rota faz apenas a verificação de equipe em [route.ts:50](../packages/admin/src/app/api/admin/live/occurrences/[id]/recording/vimeo/route.ts#L50).

No GET, `refresh()` consulta o `videoId` recebido do navegador e retorna imediatamente se o vídeo estiver processando. Nesse caminho não chama o Members para autorizar a ocorrência nem confirmar que o vídeo pertence a ela. Um usuário `staff` pode receber o endereço privado/hash de um vídeo usando uma ocorrência inexistente ou de outra turma.

No POST, o mapa global usa somente `occurrenceId`. Enquanto a professora autorizada envia uma gravação, outra pessoa da equipe que não pertence à turma recebe a mesma Promise e seu resultado, sem passar pela própria verificação de `recording/source`. O Members tem a verificação correta; estes dois atalhos a contornam.

**Reprodução:** dois casos executáveis em [vimeo-reproductions.test.ts](../.tmp/codex-live-review/vimeo-reproductions.test.ts). Em ambos houve resposta `kind: 'ok'` e **zero chamadas de autorização** para o solicitante sem atribuição. Provedores substituídos por fakes; nenhum vídeo real foi acessado.

**Correção:** autorizar cada requisição antes de consultar o provedor ou aproveitar o trabalho em andamento. Resolver o identificador do vídeo a partir da gravação autorizada. A deduplicação do envio não pode substituir a autorização do solicitante.

### 2. [P1] O Estúdio ao vivo elimina controles que continuam obrigatórios para concluir a aula

**Local:** [studio-block.tsx:152](../packages/member-shell/src/components/studio/studio-block.tsx#L152) e [live-workspace.tsx:245](../packages/member-shell/src/components/live/live-workspace.tsx#L245).

Uma seção de aplicação pode exigir `completion.projectChecks`, por exemplo usar uma repetição. No gravado, `SectionProjectCheck` lê esse critério, mostra os objetivos e envia a verificação ao servidor. Na sala ao vivo, o retorno antecipado substitui todo esse componente por `LiveBlockWorkspace`, que não consome o critério nem renderiza a verificação. O servidor continua exigindo a evidência em [section-progression.service.ts:251](../packages/members/src/application/learning/section-progression.service.ts#L251).

A criança pode criar e salvar o projeto corretamente, mas não consegue cumprir o objetivo registrado nem concluir a fase e receber seu XP. Liberar a navegação entre partes, como faz o último commit, não resolve a conclusão. Critérios antigos de envio/aprovação também precisam de tratamento explícito: o editor ao vivo não oferece o envio e suas revisões não se tornam entregas do curso.

**Reprodução:** [studio-reproduction.test.ts](../.tmp/codex-live-review/studio-reproduction.test.ts) renderiza os componentes reais com o mesmo contexto e objetivo. O controle normal exibe “Verificar esta etapa”; o bloco ao vivo chega a “Guardar”, mas não exibe objetivo nem verificação. Somente a fronteira do editor e as chamadas de rede foram substituídas.

**Correção:** conectar a verificação ao projeto canônico do Estúdio ao vivo e atualizar o progresso. Compatibilizar os critérios de envio existentes, ou recusá-los claramente na autoria ao vivo; não retirar os critérios de conclusão silenciosamente.

### 3. [P1] A comunidade adulta tem sala, mas não tem um fluxo válido de matrícula

**Local:** [workshops-admin.tsx:993](../packages/admin/src/app/admin/oficinas/workshops-admin.tsx#L993), [enrollment-picker.tsx:38](../packages/admin/src/app/admin/oficinas/enrollment-picker.tsx#L38), [live.service.ts:435](../packages/members/src/application/live/live.service.ts#L435).

O novo curso aceita `audience: 'adult'` e a comunidade ganhou a página de oficinas, mas o seletor continua oferecendo somente perfil de criança ou reserva familiar. A reserva grava `learnerId: null`; a sessão do adulto não a reconhece como sua vaga. Tentar matricular diretamente `learnerId = accountId` também falha: o gateway consulta o contrato de propriedade de **perfil**, e o Auth procura esse identificador na tabela de perfis, não na conta adulta.

Consequência: uma conta adulta ativa não consegue chegar à sala com uma matrícula válida pelo fluxo implementado. Há ainda uma restrição herdada em `LiveWorkspaceService.listOwned()` que retorna lista vazia quando `actor.id === actor.accountId`; ela precisa ser ajustada junto com essa jornada.

**Reprodução:** [domain-reproductions.test.ts](../.tmp/codex-live-review/domain-reproductions.test.ts) usa a rota real de ownership do Auth, com repositórios mínimos: a conta ativa é aceita para reserva, mas rejeitada quando apresentada como aluna. Leitura complementar: [internal.routes.ts:49](../packages/auth/src/interfaces/http/routes/internal.routes.ts#L49) e [live.service.ts:683](../packages/members/src/application/live/live.service.ts#L683).

**Correção:** distinguir inscrição de conta adulta e inscrição de perfil infantil no admin e no domínio, validar a identidade correspondente e cobrir matrícula → catálogo → sala → projeto com a sessão adulta real.

### 4. [P2] Uma reposição esconde a gravação publicada do encontro original

**Local:** [live-learner-room.tsx:683](../packages/member-shell/src/components/live/live-learner-room.tsx#L683), especialmente a escolha de `recording` e `occurrenceId`.

O servidor preserva o histórico em `room.recordings` e informa `canWatchRecording` quando qualquer ocorrência daquela aula tem gravação publicada. A nova sala ignora essa lista e sempre usa `room.occurrence`, que passa a apontar para a reposição. Antes da reposição, mostra apenas a entrada do novo encontro; depois, se ele não tiver gravação publicada, solicita a gravação da ocorrência errada e recebe erro. Mesmo com duas gravações, não há seleção da anterior.

**Reprodução:** [domain-reproductions.test.ts](../.tmp/codex-live-review/domain-reproductions.test.ts): publicar a ocorrência original, criar reposição, consultar a sala. A gravação antiga continua disponível sem filtro, mas a consulta com o `occurrenceId` que a interface encaminha falha.

**Correção:** selecionar entre as gravações publicadas de `room.recordings`, independentemente da ocorrência atual, e manter acesso ao histórico enquanto durar o grant da aula.

### 5. [P2] Alterar o slug do curso quebra a abertura das aulas das turmas existentes

**Local:** [live.service.ts:790](../packages/members/src/application/live/live.service.ts#L790), com origem na cópia feita na linha 288.

A turma guarda uma cópia de `course.slug` na criação. A sala monta o endereço da aula a partir dessa cópia, enquanto a autoria permite alterar o slug do curso. Os leitores do repositório recuperam o documento da turma sem atualizar o resumo. Depois de uma alteração do endereço, a turma continua usando o slug antigo e a busca da aula retorna 404, mesmo com vaga e datas válidas.

**Reprodução:** [domain-reproductions.test.ts](../.tmp/codex-live-review/domain-reproductions.test.ts): após mudar o slug na fonte dos cursos, a sala ainda devolve o anterior.

**Correção:** resolver o endereço atual pelo `courseId` ou atualizar de forma consistente as referências das turmas quando o slug muda. O resumo comercial pode ser histórico, mas o endereço usado para carregar conteúdo precisa continuar válido.

### 6. [P2] A passagem da gravação para o Vimeo perde a retomada de onde a criança parou

**Local:** [live-recording-stage.tsx:50](../packages/member-shell/src/components/live/live-recording-stage.tsx#L50).

O caminho MP4 usa `LiveReplay`, que busca e grava a posição por aula e versão da gravação, inclusive em pausa e saída da página. Quando o Vimeo fica pronto, o novo caminho monta `VimeoPlayer` apenas com vídeo, hash, marca d’água e controles de seek. Não passa `initialPositionSeconds`, `onProgress` ou `onFlush`, nem lê/escreve `replay-progress`.

Assim, uma criança que assistiu parte de uma oficina longa reabre o Vimeo do início. A posição salva enquanto o MP4 estava disponível também deixa de ser aproveitada. A conclusão decorre dos dois caminhos de código; não foi feita reprodução contra o Vimeo real.

**Correção:** compartilhar a persistência de posição entre os dois players, usando a mesma aula e versão de gravação. Trocar de provedor não deve trocar o histórico de reprodução.

### 7. [P2] Falha de rede após criar o vídeo deixa uploads órfãos no Vimeo

**Local:** [live-recording-vimeo.ts:105](../packages/admin/src/server/live-recording-vimeo.ts#L105).

O vídeo é criado antes de salvar seu identificador no Members. O serviço apaga o órfão quando recebe uma resposta HTTP de erro, mas não trata a exceção de transporte lançada por `gatewayFetch` em desconexão/timeout. Nesse caso o identificador criado não fica recuperável pela operação; repetir o envio pode criar outro vídeo e consumir armazenamento/cota.

**Reprodução:** terceiro caso de [vimeo-reproductions.test.ts](../.tmp/codex-live-review/vimeo-reproductions.test.ts): upload confirmado seguido de erro de conexão no save; resultado observado: um vídeo criado e zero exclusões ou recuperação do vínculo.

**Correção:** tornar o envio recuperável/idempotente, preservando o identificador criado e reconciliando o resultado do save. Um timeout é ambíguo — o servidor pode ter salvo —, portanto a solução não deve simplesmente apagar um vídeo que já possa estar vinculado.

### 8. [P2] Os controles da sala deixam “Materiais” fora da tela em 320 px

**Local:** [live-learner-room.tsx:1149](../packages/member-shell/src/components/live/live-learner-room.tsx#L1149) e linha 1264.

A barra coloca sete botões em uma linha sem quebra ou rolagem, cada um com mínimo de 48 px, além dos espaços e padding. Em viewport de 320 px o botão “Arquivos/Materiais” começa em **x=331** e termina em **x=379**; a largura rolável do documento permanece 320 px. O botão de chat também fica parcialmente cortado. O controle de compartilhar tela continua ocupando espaço mesmo quando não é suportado.

**Reprodução em Chromium:** [captura de 320 px](../.tmp/codex-live-review/visual/mobile-320.png) e [medidas do DOM](../.tmp/codex-live-review/visual/mobile-measurement.json). A amostra usa os componentes e CSS reais desta branch; mídia e atividade foram substituídas para isolar o layout.

**Correção:** reorganizar os controles no espaço disponível, preservando alvos de toque e acesso a todas as ações. Validar 320/360/390 px e ampliação do navegador.

## Evidências e cobertura

**591 testes da suíte existente passaram, sem falhas nas execuções finais abaixo.** Os sete testes locais adicionais reproduzem defeitos deliberadamente; seu resultado verde significa que o comportamento defeituoso foi observado, não que foi corrigido.

| Área | Testes passando | Evidência |
| --- | ---: | --- |
| Members: todas as suítes `live*` unitárias e de integração | 133 | [log](../.tmp/codex-live-review/members-live-full-tests.log) |
| Members: regressão de seções, Estúdio, gamificação e materiais/vídeo | 123 | [log](../.tmp/codex-live-review/recorded-regression-tests.log) |
| Member-shell: suítes `live*`, incluindo as alterações locais finais | 113 | [log](../.tmp/codex-live-review/shell-final-tests.log) |
| Admin: oficinas, autoria, professora e Vimeo | 95 | [log](../.tmp/codex-live-review/admin-tests.log) |
| Community Kids: sala, projetos, cursores, participantes e seções | 64 | [log](../.tmp/codex-live-review/kids-tests.log) |
| Community adulta: rotas e políticas da sala | 3 | [log](../.tmp/codex-live-review/adult-tests.log) |
| Gateway: configuração e autorização das rotas | 34 | [log](../.tmp/codex-live-review/gateway-tests.log) |
| PostgreSQL: turmas, projetos, reposições, gravador, leases e desempenho | 18 | [log](../.tmp/codex-live-review/database-tests.log) |
| PostgreSQL com migrations reais: modalidade, acesso, Jornada e Zappy | 8 | [log](../.tmp/codex-live-review/modality-db-tests.log) |

O primeiro lote de banco pulou a suíte que exige `LEARNING_QA_DATABASE_URL`; ela foi executada depois em outro banco descartável, com seus oito testes passando. Não há suíte de banco pretendida nesta tabela que tenha ficado sem execução. Usados somente bancos locais dedicados: `sz_codex_live_review_20261014` e `sz_aulas_qa_codex_live_20261014`.

Checagens `tsc --noEmit` concluídas sem diagnósticos em Members, member-shell, Admin, Community Kids e Community. Member-shell revalidado após a alteração local de captura. `git diff --check` também passou. Não foi executado build de produção.

Reproduções adicionais:

```powershell
bun test ./.tmp/codex-live-review/vimeo-reproductions.test.ts
bun test ./.tmp/codex-live-review/domain-reproductions.test.ts
bun test --preload ./packages/community-kids/test-setup.ts ./.tmp/codex-live-review/studio-reproduction.test.ts
```

Amostra visual em Chromium: 1366×768, 390×844 e 320×740, com abertura/fechamento do chat. [Desktop](../.tmp/codex-live-review/visual/desktop.png), [mobile](../.tmp/codex-live-review/visual/mobile.png). Reaproveitamento dos tokens Kids, `LessonSections`, palco, divisão redimensionável e barra de aula confirmado na amostra. Referência complementar de acessibilidade/layout: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).

## Arquitetura e limites da conclusão

O caminho principal está organizado em autoria de curso → turma → sessão/ocorrência → grant por aula. `LiveClassroom` injeta a aula existente em um slot; `LiveBlockWorkspace` guarda o projeto por curso/perfil/chain ou bloco; mídia usa transporte SFU e gravação coordenada pelo Members. Isso reduz duplicação da autoria, mas exige que os adaptadores preservem integralmente os contratos de identidade, progresso e reprodução — precisamente onde se concentram os achados.

Os testes de banco confirmaram acesso por aula e prazo, separação dos cursos ao vivo da Jornada/Zappy, serialização de gravação e reconciliação de mídia. A simulação local de nove participantes teve p95 de leitura da sala entre 6,3 e 43,9 ms nos cenários executados; isso é evidência do caminho de banco local, não uma garantia de latência no Railway ou de qualidade de vídeo.

Não houve chamada real entre navegadores, gravação pelo serviço implantado, envio ao Vimeo, operação de Cloudflare/Railway ou teste de compra externo. A amostra visual não inclui o shell autenticado completo, o editor real nem streams de câmera. Portanto, não certifica transmissão, Safari/dispositivos móveis ou experiência integral em staging. Nenhuma evidência de deploy anterior foi tratada como validação desta branch.

Ordem sugerida de correção: autorização do Vimeo; critérios do Estúdio; matrícula adulta; histórico e retomada das gravações; vínculo do curso por endereço; recuperação do envio; controles estreitos. Depois, validar em staging com professora e pelo menos dois alunos, incluindo desconexão, ajuda consentida, reposição e retomada da gravação.
