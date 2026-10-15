# Ambientes e serviços

O runtime oferece workspace local, worktree com WIP e container Linux. Escolha o ambiente explicitamente; ausência do Docker nunca provoca execução automática no host.

Descubra os templates com environment_templates e inspecione uma imagem já instalada com environment_image. O manifesto opcional .sistemazero/environments.json contém version: 1 e uma lista templates. Dependências da imagem são fixadas por digest. Descoberta de scripts não executa comandos.

Para isolamento, capture workspace_snapshot, use seu ID em environment_acquire e guarde o ID/generation retornado. Operações posteriores exigem essa geração e a mesma sessão. environment_run recebe executable e args separados. Container interrompido perde o lease e é parado, inclusive seus descendentes.

service_start recebe o lease, comando, porta e caminho HTTP de readiness. Não adota processos existentes. O runtime prova o dono da porta antes de aceitá-la. A configuração de container deve declarar a porta e escolher bridge para publicar um preview em loopback. Parar um serviço em container também para o ambiente.

O fluxo de encerramento é environment_stop → environment_export → environment_destroy. Stop retorna uma nova geração; use-a nos próximos comandos. O export é um artefato com base, hashes e alterações. Se houver uma edição após exportar, a destruição é recusada. Local apenas revoga o lease; não apaga o workspace.

O CLI usa a mesma sessão com sistemazero tool --session ID --mode build NOME JSON. Aprovações aparecem como eventos e podem ser respondidas pela TUI ou question.answer. Por MCP, clientes com elicitation podem apresentar a aprovação diretamente.

Após crash, o runtime reconcilia seus recursos por instalação/lease e preserva os arquivos. Estado unknown exige verificar o recurso; falha de comunicação com Docker não significa recurso ausente. environments.list e services.list têm paginação; environments.reconcile oferece reconciliação explícita quando não há tarefas ativas.

CPU, memória, processos, duração e logs têm limites. O bind mount próprio do workspace não tem quota física de disco; os limites de snapshot/export não substituem essa quota. Não conecte um daemon Docker remoto a esse adapter: os caminhos de mount pertencem à instalação local.
