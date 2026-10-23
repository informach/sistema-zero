# Revisão completa da implementação do Pensa v2

Revisão de 14/10/2026, solicitada após a implementação. Escopo: alterações do Pensa v2, seus contratos, persistência, orquestração, voz, interface e integração com os três editores. Alterações concorrentes de aulas, marketing e outras funcionalidades do workspace foram preservadas.

**Resultado: nove problemas identificados e corrigidos.** A implementação mantém a criança como autora, a analogia ZERO, OpenRouter para planejamento/transcrição, ElevenLabs para escuta opcional e as permissões reais da plataforma. A revisão automatizada não libera, por si só, o piloto infantil: permanecem a inspeção visual, o percurso com serviços reais e a observação com crianças.

## Achados corrigidos

| ID / prioridade | Problema e consequência | Correção / evidência |
| --- | --- | --- |
| F01 — Alta | O envio inicial removia dados pessoais, mas ideias guardadas, relatos e nomes do inventário podiam chegar ao modelo por outros caminhos. A síntese também aceitava texto antigo sem reaplicar esse filtro. | Redação dos campos narrativos na fronteira com o modelo, da consulta de conhecimento, dos nomes enviados no inventário e do texto sintetizado. IDs e revisões permanecem intactos. Testes capturam os pedidos com e-mail/telefone sintéticos e verificam sua remoção. |
| F02 — Alta | Trocar `viewerId` sem desmontar o app podia conservar a conversa do perfil anterior na tela. A autorização do servidor não apagava esse estado local. | Workspace React recriado por perfil, incluindo o legado. Teste troca o perfil, confere a retirada da conversa anterior e a separação dos rascunhos. |
| F03 — Média | Uma resposta de comando recebida depois de voltar à lista podia reabrir o jogo anterior. Leituras concorrentes também podiam apresentar dados fora de ordem. | Aplicação de resposta condicionada ao projeto ativo e à revisão; sequência das leituras; isolamento de erros por visita; trava síncrona de envio; tarefas filtradas pelos IDs do ciclo ativo. Teste com resposta deliberadamente atrasada mantém a criança na lista. |
| F04 — Alta | Adaptar o caminho conservava um teste positivo anterior como evidência válida. Após voltar a Observar, era possível encerrar o novo recorte sem novo relato. | A revisão estrutural inicia uma nova sessão de observação, preservando o histórico. Teste demonstra que o relato antigo não permite concluir o caminho revisado. |
| F05 — Alta | O catálogo reunia recursos 2D e 3D. Ter desbloqueado 3D permitia aceitar seus blocos em uma proposta declarada 2D. | Reutilização da regra de dimensão do catálogo para blocos, extensões e manuais. Teste rejeita a mesma missão em 2D e a aceita em 3D quando autorizada. |
| F06 — Média | Um segundo reparo copiava o passo `observe-again` do primeiro e o inseria novamente. IDs repetidos prejudicavam a navegação e a referência de voz do guia. | Cada reparo substitui a orientação diagnóstica e conserva os passos da missão. Teste no Postgres executa dois reparos e verifica IDs únicos. |
| F07 — Alta | Tentativas de voz após expiração do lease usavam o mesmo objeto de áudio. Uma tentativa antiga podia sobrescrever ou remover o arquivo da nova; um commit antigo também podia receber sucesso ao encontrar o cache pronto. | Chave de armazenamento exclusiva por lease. Leitura reutiliza a chave do lease concluído; commit/fail precisam corresponder a ele. Teste no Postgres expira o primeiro lease, conclui o segundo e recusa publicações tardias do primeiro. |
| F08 — Alta | A entrada pelo guia aguardava a restauração da nuvem, mas galeria/link direto podiam abrir a cópia local antiga antes da reconciliação. | Aberturas de arquivos Pensa conferem sincronização e revisão antes de montar o editor. A reconciliação existente preserva edições locais divergentes. Teste de retomada lê o arquivo após a reconciliação; os testes de sincronização verificam conflitos, cópias e projetos abertos. |
| F09 — Média | O guia v2 do Molda mantinha a conclusão desabilitada no estado `planned`, obrigando a criança a registrar um início intermediário mesmo com uma criação pronta. | Conclusão direta no v2 após selecionar a criação e confirmar seu salvamento. O teste verifica ausência de checkboxes, ordem salvar → registrar resultado e preservação do asset correto. |

As falhas funcionais foram reproduzidas antes das correções nos cenários de encerramento, dimensão, contexto externo, resposta tardia, reparo, lease, retomada e conclusão no Molda. Os cenários de troca de perfil e inventário receberam cobertura específica. Os testes usam dados sintéticos; não houve envio de dados infantis ou chamadas pagas para reproduzi-los.

## Localização das correções

- F01: `packages/member-shell/src/server/pensa-journey/privacy.ts`, `planner.ts`, `context.ts` e `src/routes/private-narration.ts`.
- F02/F03: `packages/pensa/src/components/PensaApp.tsx` e `JourneyApp.tsx`.
- F04: `packages/core/src/pensa/index.ts`, comando `revise`.
- F05: `packages/member-shell/src/server/pensa-journey/contracts.ts` e a regra compartilhada em `pensa-agents/planner-contract.ts`.
- F06/F07: `packages/members/src/infrastructure/persistence/drizzle/pensa-journey.repository.ts`, comandos de reparo e reserva de narração.
- F08: `packages/community-kids/src/components/kids/studio-full-client.tsx` e `src/lib/resume-creation.ts`.
- F09: `packages/community-kids/src/components/kids/molda-task-guide.tsx`.

## Fluxos e fronteiras revisados

| Área | Conferência realizada |
| --- | --- |
| Ideia → proposta → guia | Autoria infantil, correção antes de aceitar, recursos reais, dependências anteriores, produção de arte separada da integração, publicação integral das tarefas. |
| Construção e ajuda | Uma missão atual, instruções sem checklist v2, confirmação com saída salva, ajuda contextual, tutor sujeito à sua própria habilitação, próxima missão pelo editor. |
| Teste e ciclos | Relato associado à criação/revisão, encerramento incompleto, cópia antes de encerramento/adaptação, novo teste após restauração/adaptação, incremento condicionado à base protegida. |
| Retomada | Rascunhos por perfil/projeto, idempotência de envio, revisão esperada, arquivos com ID estável, pausa, arquivamento, reativação e restauração de tarefas/ciclo/evidências. |
| Autorização | Perfil/conta, audiência Kids, posse/posto, blocos conquistados, ferramentas granulares do Molda, consumo HMAC separado das rotas JWT, suporte somente leitura. |
| IA e custos | Cliente OpenRouter compartilhado, reserva com lock da conta, débito atômico com entrega, leases, limites de tentativas e contador externo que sobrevive à exclusão do plano. |
| Conhecimento | Catálogo oficial, receitas do Estúdio, referências recuperadas, distinção entre acesso à aula, conclusão e domínio desconhecido. |
| Voz | Referência narrável resolvida pelo servidor, verificação de origem após síntese, cache privado, URL curta, isolamento de tentativas, reprodução por gesto e cancelamento/troca de perfil. |
| Exclusão | Cancelamento e cerca contra saída tardia, limpeza privada com atraso, distinção entre plano e conta, preservação do jogo e artes independentes, purga da conta. |
| Compatibilidade | Equipes e planos legados mantidos; rotas antigas impedidas de alterar jornadas v2; flags e recuperação de jornadas existentes quando novos planos estão desligados. |
| Visual / acessibilidade no código | Tokens compartilhados, fontes da comunidade, estados de espera/erro, labels, avisos de texto longo, alvos de toque e instruções progressivas. Inspeção renderizada ainda pendente. |

Migrações 0108–0111 conferidas como aditivas; esta revisão não introduziu migração adicional. O banco de teste v2 usa seus próprios fixtures locais. Não houve alteração remota, publicação ou ativação de flags.

## Evidências automatizadas desta revisão

Contagem de testes distintos nas suítes executadas, sem somar novamente repetições feitas durante as correções:

| Suíte | Resultado |
| --- | ---: |
| Core / contrato Pensa | 7 aprovados |
| Pacote Pensa completo, incluindo legado e troca de perfil | 104 aprovados |
| Member-shell: planejamento, contexto, contratos, proteção, voz, tutor, permissões e legado | 172 aprovados |
| Comunidade Kids: guias, handoff, voz, retomada e sincronização | 88 aprovados |
| Members: Postgres v2, quota, equipes, limpeza, purga e rotas | 26 aprovados |
| Estúdio: guia, persistência e índice de exemplos | 34 aprovados |
| Pinta: guia, galeria e salvamento na saída | 40 aprovados |
| Gateway: configuração e resolução de rotas | 61 aprovados |
| **Total** | **532 aprovados** |

Essa é uma seleção ampliada das suítes relacionadas à implementação, não a suíte inteira do monorepo. Testes de modelos, voz e R2 usam transportes simulados; testes de transação usam Postgres local real.

Verificações adicionais: typechecks de core, Pensa, members e member-shell aprovados. O **build completo Kids após o último ajuste** passou por compilação, TypeScript e geração de 73 páginas, com saída 0. Biome passou em 24 arquivos da revisão, sem ajustes pendentes; `git diff --check` passou nos caminhos verificados.

Comandos principais (nos respectivos pacotes):

```text
core: bun test tests/pensa.test.ts
pensa: bun test src
member-shell: bun test tests/pensa-journey-contracts.test.ts tests/pensa-journey-worker.test.ts tests/pensa-journey-context.test.ts tests/pensa-journey-gate.test.ts tests/pensa-protection.test.ts tests/private-narration.test.ts tests/private-narration-route.test.ts tests/voice-transcribe.test.ts tests/creation-cleanup-routes.test.ts tests/pensa-ai.test.ts tests/pensa-capabilities.test.ts tests/pensa-llm.test.ts tests/pensa-missions.test.ts tests/pensa-team-routes.test.ts tests/pensa-server-boundary.test.ts tests/studio-zappy.test.ts
members: bun test tests/db/pensa-journey.repository.test.ts tests/db/ai-usage-atomicity.test.ts tests/db/pensa-team-repository.test.ts tests/db/creation-cleanup.repository.test.ts tests/db/user-data-purge.test.ts tests/integration/pensa-journey-routes.test.ts
studio: bun test src/studio/TaskGuidePanel.test.tsx src/persistence/service.test.ts src/examples/serverExamples.test.ts
pinta: bun test src/components/PintaApp.test.tsx src/components/TaskBriefPanel.test.tsx
api-gateway: bun test tests/unit/config.test.ts tests/unit/route-registry.test.ts
community-kids: bun test tests/molda-task-guide.test.tsx tests/pinta-client.test.tsx tests/pensa-task-handoff.test.tsx tests/pensa-studio-link.test.ts tests/pensa-client.test.tsx tests/studio-full-editor.test.tsx tests/voice-input.test.tsx tests/private-zappy-voice.test.tsx tests/resume-creation.test.ts tests/studio-cloud.test.ts
community-kids: bun run build
```

## Pontos que continuam abertos

1. **Validação visual e infantil.** O navegador integrado foi consultado novamente e retornou lista vazia. Não foi possível conferir desktop/celular, teclado real ou leitores de tela. Também não houve avaliação com crianças. Código e testes de componentes não demonstram que uma criança consegue concluir o percurso sem ajuda.
2. **Execução com serviços reais.** Falta percorrer planejamento com OpenRouter, ditado/escuta nos aparelhos das famílias e proteção/restauração com R2 real. Isso deve acontecer no ambiente do piloto antes de habilitar para crianças.
3. **Executabilidade pedagógica.** Catálogo, receitas e revisão por modelo restringem o plano; não provam que qualquer combinação de mecânicas funciona ou é ensinável. Construir os jogos de referência e avaliar os guias permanece requisito de liberação.
4. **Operação já documentada.** Retomada depende de visita/polling após queda do processo, a flag é global por ambiente e não há expiração temporal automática dos blobs de voz do tutor. Cópias incompletas consomem os limites de checkpoints até a exclusão do plano. Esses limites continuam descritos na entrega.
5. **Manutenção.** A tela de jornada e o repositório concentram muitos estados/comandos. Extraí-los por responsabilidade pode facilitar futuras mudanças, mas não foi feita uma reorganização ampla durante a correção. O helper exportado `nextPensaMission` ainda não conduz o fluxo real: o servidor usa `nextAvailableTask` com as tarefas do ciclo ativo. Seu teste isolado não deve ser apresentado como prova de elegibilidade em produção; a restauração é coberta pelo teste de repositório.

A remoção de dados pessoais utiliza os padrões do filtro compartilhado da plataforma; não constitui detecção perfeita de qualquer informação identificável. A intenção, os IDs e a conversa permanecem guardados conforme o contrato do produto, enquanto o conteúdo enviado aos fornecedores passa por essa filtragem.

As condições de ativação continuam no [registro de entrega](../docs/plans/2026-10-14-pensa-v2-entrega.md), junto do vínculo com os requisitos R01–R32.
