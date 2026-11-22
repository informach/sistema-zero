# Retomada de aulas e alunos responsáveis

> Execução: aplicar o plano tarefa a tarefa, com verificação antes de concluir.

**Objetivo:** retomar a parte e o vídeo guardados na conta e distinguir responsáveis dos alunos adultos e dos perfis infantis no Time.

**Arquitetura:** o progresso existente continua no Members, por usuário, conta, aula, bloco e revisão. A entrada no player consulta a aula atual sem reutilizar o retrato do roteador; o registro de abertura conserva uma navegação existente. Em aula gravada ainda em andamento, uma parte já concluída dá lugar à primeira pendente; quando falta somente concluir a aula, a retomada abre seu fim. Aulas concluídas e encontros ao vivo preservam a revisão/navegação escolhida. Pais são um contexto da conta na comunidade Kids, identificado pelo `learner: parents` do curso, sem novo papel de autenticação ou migração de dados.

**Restrições:** preservar direitos, respostas, conquistas e dados existentes; nenhuma alteração de produção; nenhum build ou suíte pesada nesta máquina. Usar checkout isolado. Testes completos e builds no GitHub.

## Evidências

Inspeção em produção, 22/11/2026: cursos para pais têm navegação, marcos e segundos guardados na conta; nenhuma posição órfã na amostra. Na Aula 2, o serviço devolve a parte 2 guardada e os três vídeos com posições. Abertura do player grava incondicionalmente a parte do snapshot recebido, e `useState` a usa como início, permitindo regressão ao reabrir um retrato antigo do roteador ou quando o pedido inicial termina depois de uma navegação nova. No Time, a conta é sempre classificada como adulto e a lista Kids só oferece perfis.

## Tarefas

- [x] Provar com regressões isoladas a reabertura com snapshot antigo e a abertura atrasada após navegação; preservar segundos e isolamento por conta/perfil.
- [x] Consultar a aula atual antes de montar o player, com sessão e viewer conferidos, cancelamento na saída e erro explícito com nova tentativa. Prévia e oficina ao vivo mantêm os contratos existentes.
- [x] Diferenciar abertura de navegação explícita. Inserir a posição inicial apenas quando não há posição válida, conservando a posição já guardada atomicamente.
- [x] Incluir o destino do curso nas views do Time; matrícula de curso para pais pertence à conta, nunca ao perfil infantil. Mostrar Pais na lista Kids e na ficha, com progresso próprio.
- [ ] Executar regressões leves direcionadas; revisar diff e criar commit isolado. Enviar a branch e executar CI no GitHub, sem testes pesados locais.
- [ ] Registrar resultados reais e limites da verificação, sem alegar implantação que não aconteceu.

## Verificação e limites

Regressões reproduzidas antes da correção: o player montava com snapshot antigo; a abertura atrasada substituía a parte 2 pela 1; um responsável que concluía a parte 1 retomava nela em vez da parte 2 pendente. As três provas ficaram verdes após a correção. As provas HTTP cobrem adulto, criança com perfil e responsável com conta; conservam 87 segundos no vídeo, a parte guardada e o isolamento de outro aprendiz. A prova da retomada também cobre erro/repetição de leitura, resposta atrasada após troca de aprendiz e refresh posterior sem remontar o editor.

Time: Pais na lista Kids e na ficha, cursos/certificados/avaliações filtrados por público, chave-mestra ganha incluída. A atividade cronológica continua sendo o histórico geral da conta e informa esse alcance; a paginação existente não é filtrada no navegador. Recados gerais da equipe para a conta aparecem na Ajuda dos pais e não no perfil infantil.

CI disparado na branch de correção, sem publicação de staging ou produção. Provas PostgreSQL novas usam apenas bancos descartáveis do GitHub: preservação atômica da navegação e paginação/contagem da lista de pais. Nenhum banco foi migrado para esta alteração.
