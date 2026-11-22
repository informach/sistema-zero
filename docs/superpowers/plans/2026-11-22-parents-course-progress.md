# Retomada de aulas e alunos responsáveis

> Execução: aplicar o plano tarefa a tarefa, com verificação antes de concluir.

**Objetivo:** retomar a parte e o vídeo guardados na conta e distinguir responsáveis dos alunos adultos e dos perfis infantis no Time.

**Arquitetura:** o progresso existente continua no Members, por usuário, conta, aula, bloco e revisão. A entrada no player consulta a aula atual sem reutilizar o retrato do roteador; o registro de abertura conserva uma navegação existente. Pais são um contexto da conta na comunidade Kids, identificado pelo `learner: parents` do curso, sem novo papel de autenticação ou migração de dados.

**Restrições:** preservar direitos, respostas, conquistas e dados existentes; nenhuma alteração de produção; nenhum build ou suíte pesada nesta máquina. Usar checkout isolado. Testes completos e builds no GitHub.

## Evidências

Inspeção em produção, 22/11/2026: cursos para pais têm navegação, marcos e segundos guardados na conta; nenhuma posição órfã na amostra. Na Aula 2, o serviço devolve a parte 2 guardada e os três vídeos com posições. Abertura do player grava incondicionalmente a parte do snapshot recebido, e `useState` a usa como início, permitindo regressão ao reabrir um retrato antigo do roteador ou quando o pedido inicial termina depois de uma navegação nova. No Time, a conta é sempre classificada como adulto e a lista Kids só oferece perfis.

## Tarefas

- [ ] Provar com regressões isoladas a reabertura com snapshot antigo e a abertura atrasada após navegação; preservar segundos e isolamento por conta/perfil.
- [ ] Consultar a aula atual antes de montar o player, com sessão e viewer conferidos, cancelamento na saída e erro explícito com nova tentativa. Prévia e oficina ao vivo mantêm os contratos existentes.
- [ ] Diferenciar abertura de navegação explícita. Inserir a posição inicial apenas quando não há posição válida, conservando a posição já guardada atomicamente.
- [ ] Incluir o destino do curso nas views do Time; matrícula de curso para pais pertence à conta, nunca ao perfil infantil. Mostrar Pais na lista Kids e na ficha, com progresso próprio.
- [ ] Executar regressões leves direcionadas; revisar diff e criar commit isolado. Enviar a branch e executar CI no GitHub, sem testes pesados locais.
- [ ] Registrar resultados reais e limites da verificação, sem alegar implantação que não aconteceu.
