# Pensa: planejador de jogos

Este documento define o contrato coordenado entre members, gateway, member-shell, community-kids, Pensa, Pinta e Estúdio. O formato anterior foi removido no mesmo release; não há feature flag nem compatibilidade.

## Responsabilidades

O Pensa cria e revisa o plano. O Pinta cria `sprite`, `background`, `tileset` e `tilemap`. O Estúdio cria o jogo, inclusive modelos, mundos e materiais 3D. O Pensa nunca monta um editor.

O método ZERO produz cinco artefatos: `idea`, `game_design`, `visual_direction`, `task_plan` e `plan_review`. A Bíblia Visual registra estilo, câmera, clima, formas, paleta por função, regras, telas e inventário. Cada item do inventário recebe exatamente um Cartão de Criação.

## Geração por SSE

`POST /cycles/:id/artifacts/generate` responde `text/event-stream`: um comentário `: ok` imediato, `: ping` a cada 15s e um único evento terminal — `done` com o corpo JSON de sempre (`{artifact}`) ou `error` com `{status, code, message?}`. O pré-voo (sessão, gates, quota) continua respondendo JSON com os envelopes usuais. Sem o stream, a borda (Railway; Cloudflare em produção) derrubava com 502 o POST que fica mudo por minutos durante a síntese. A desconexão do cliente não aborta a geração: o resultado persiste no members e um reload o mostra.

## Tarefas e progresso

Cada tarefa registra destino, categoria, estimativa, posição, dependências anteriores, guia com IDs estáveis, contexto discriminado e progresso. Dependências formam um DAG. A conclusão exige todos os itens obrigatórios e um `outputRef` da ferramenta correta.

Arte do Pinta usa `context.assetId` para apontar ao inventário. Tarefas do Estúdio usam `context.visualAssetIds` para modelos, mundos ou materiais e referências resolvidas de `SERVER_BLOCK_CATALOG` e `SERVER_MECHANIC_DOCUMENTS`. O servidor filtra o catálogo pelo nível, modos e extensões da criança e rejeita drift.

As ferramentas atualizam `PATCH /tasks/:id/progress`; o Pensa lê o resumo e `nextTaskId`. `GET /tasks/:id/handoff` devolve projeto, ciclo, cartão e capability. Falta de entitlement bloqueia o envio, não o planejamento.

## Handoff

- `/pinta?tarefa=<id>` restaura o brief, preenche tipo, estilo e paleta, vincula o desenho aberto e exige “Usar no Estúdio” quando o cartão pede. A volta é o botão “Voltar ao plano” no pé do painel do brief, sempre visível na galeria e no editor: ele guarda o desenho e só então navega para `/pensa?plano=<projectId>`; gravação que falha não navega e mostra o recado na própria tela. O contrato é o `onReturnToPlan` opcional do `PintaTaskSession`, e o id do plano vem do handoff, não da URL. O Molda tem o mesmo botão, com o mesmo rótulo, no guia da tarefa.
- `/estudio?tarefa=<id>` restaura ou cria `pensa-<pensaProjectId sem hífens>`, apresenta as extensões permitidas no guia e mantém o painel após reload. O vínculo local usa `sz:studio:pensa-link:<viewerId>:<pensaProjectId>`.

`StudioTaskSession` é independente de `LessonActivity`. O backup pertence ao armazenamento do host do Estúdio, não ao Pensa.

## Edição e revisão

Tarefas planejadas podem ser alteradas. Se o plano já foi aprovado, a mudança reabre O e torna `plan_review` rascunho. Alterar uma tarefa iniciada ou concluída cria uma revisão, arquiva a original e atualiza dependentes.

## Equipe (26/09/2026)

Um plano pode ter até 5 membros além do dono. O convite é um código do projeto (`ZAP-XXXXXX`, alfabeto sem `0/O/1/I/L`; a entrada tolera minúsculas, espaços, hífen e o prefixo): o dono gera em `POST /projects/:id/share` (gerar de novo invalida o anterior) e desliga em `DELETE`; quem tem o Pensa entra em `POST /projects/join` com `{code}` (10/min no gateway) e passa a ver e mexer em tudo do plano: conversa, artefatos, avanço, tarefas, handoff e progresso. O dono continua sendo quem renomeia, arquiva, apaga, gera código e tira membro (`DELETE /projects/:id/members/:profileId`; `me` = sair); qualquer outro recebe 403 `PENSA_NOT_OWNER`. `GET /projects/:id/members` lista a equipe com primeiro nome e rosto; o código só aparece nessa resposta, e só para o dono.

Nas views, `role: 'owner' | 'member'` e `team` (`memberCount` e `ownerFirstName` na lista; `memberCount` e `shareEnabled` no detalhe) chegam ao Pensa pelo member-shell. O detalhe não muda de forma: o plano compartilhado é o mesmo objeto. XP vai para quem avança a etapa; a cota de IA é da conta de quem chama. Estúdio, Pinta e Molda seguem por perfil: cada membro constrói no seu, a colaboração é no plano. Não há trava na conversa da etapa Z (último-vence); a UI avisa "alguém da equipe mexeu no plano" por polling do `updatedAt`.

Migração `0098_pensa_project_members.sql`: `share_code` em `pensa_projects` (índice único parcial) e a tabela `pensa_project_members` (PK projeto + perfil, `on delete cascade`). Ordem de deploy: members, gateway, member-shell, kids.

## Migração

`0060_pensa_planner_v2.sql` apaga por cascata todos os projetos Pensa e recria somente o novo domínio. A migração não toca projetos autônomos do Estúdio nem desenhos do Pinta. Os hosts removem chaves locais exclusivas do fluxo anterior.
