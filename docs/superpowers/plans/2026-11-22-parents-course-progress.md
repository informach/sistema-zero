# Retomada de aulas e alunos responsáveis

> Execução: aplicar o plano tarefa a tarefa, com verificação antes de concluir.

**Objetivo:** retomar a parte e o vídeo guardados na conta e distinguir responsáveis dos alunos adultos e dos perfis infantis no Time.

**Arquitetura:** o progresso existente continua no Members, por usuário, conta, aula, bloco e revisão. A entrada no player consulta a aula atual sem reutilizar o retrato do roteador; o registro de abertura conserva uma navegação existente. Nos cursos para pais, em aula gravada ainda em andamento, uma parte já concluída dá lugar à primeira pendente; quando falta somente concluir a aula, a retomada abre seu fim. Cursos infantis e adultos preservam a parte escolhida para continuar a criação, mesmo após cumprir a atividade. Aulas concluídas e encontros ao vivo preservam a revisão/navegação escolhida. Pais são um contexto da conta na comunidade Kids, identificado pelo `learner: parents` do curso, sem novo papel de autenticação ou migração de dados.

**Restrições:** preservar direitos, respostas, conquistas e dados existentes; nenhum build ou suíte pesada nesta máquina. Usar checkout isolado. Testes completos e builds no GitHub. Atualização de escopo autorizada pela usuária: publicar esta correção em produção pelo fluxo normal e integrar os mesmos ajustes no staging local antes da publicação.

## Evidências

Inspeção em produção, 22/11/2026: cursos para pais têm navegação, marcos e segundos guardados na conta; nenhuma posição órfã na amostra. Na Aula 2, o serviço devolve a parte 2 guardada e os três vídeos com posições. Abertura do player grava incondicionalmente a parte do snapshot recebido, e `useState` a usa como início, permitindo regressão ao reabrir um retrato antigo do roteador ou quando o pedido inicial termina depois de uma navegação nova. No Time, a conta é sempre classificada como adulto e a lista Kids só oferece perfis.

## Tarefas

- [x] Provar com regressões isoladas a reabertura com snapshot antigo e a abertura atrasada após navegação; preservar segundos e isolamento por conta/perfil.
- [x] Consultar a aula atual antes de montar o player, com sessão e viewer conferidos, cancelamento na saída e erro explícito com nova tentativa. Prévia e oficina ao vivo mantêm os contratos existentes.
- [x] Diferenciar abertura de navegação explícita. Inserir a posição inicial apenas quando não há posição válida, conservando a posição já guardada atomicamente.
- [x] Incluir o destino do curso nas views do Time; matrícula de curso para pais pertence à conta, nunca ao perfil infantil. Mostrar Pais na lista Kids e na ficha, com progresso próprio.
- [x] Executar regressões leves direcionadas; revisar diff e criar commit isolado. Enviar a branch e executar CI no GitHub, sem testes pesados locais.
- [x] Registrar resultados reais e limites da verificação, sem alegar implantação que não aconteceu.

## Verificação e limites

Regressões reproduzidas antes da correção: o player montava com snapshot antigo; a abertura atrasada substituía a parte 2 pela 1; um responsável que concluía a parte 1 retomava nela em vez da parte 2 pendente. As três provas ficaram verdes após a correção. As provas HTTP cobrem adulto, criança com perfil e responsável com conta; conservam 87 segundos no vídeo, a parte guardada e o isolamento de outro aprendiz. A prova da retomada também cobre erro/repetição de leitura, resposta atrasada após troca de aprendiz e refresh posterior sem remontar o editor.

Time: Pais na lista Kids e na ficha, cursos/certificados/avaliações filtrados por público, chave-mestra ganha incluída. A atividade cronológica continua sendo o histórico geral da conta e informa esse alcance; a paginação existente não é filtrada no navegador. Recados gerais da equipe para a conta aparecem na Ajuda dos pais e não no perfil infantil.

Provas PostgreSQL novas usam apenas bancos descartáveis do GitHub: preservação atômica da navegação e paginação/contagem da lista de pais. Nenhum banco precisa de migração para esta alteração. A liberação seletiva parte de main e contém os commits desta correção; o staging local recebe a correção antes da publicação.

Revisão adicional: uma parte pode liberar a próxima aos 90% do vídeo. A retomada conserva a parte enquanto há vídeo ainda não terminado, inclusive numa revisão, e só avança ao próximo pendente depois do fim. A regressão HTTP de 109/120 segundos ficou vermelha e depois verde. Uma atualização de props durante a leitura de entrada também foi reproduzida e corrigida: a resposta atual vence os retratos recebidos enquanto estava em andamento. Certificados de cursos removidos continuam acessíveis pelo botão explícito de histórico completo, mesmo quando o resultado filtrado está vazio; recado em grupo de criança mantém a guarda da lente Kids.

O E2E real de integração Pinta/Estúdio no GitHub demonstrou que a criação infantil precisa reabrir na parte escolhida, mesmo depois da entrega. O avanço de partes concluídas foi restrito aos cursos para pais; duas regressões HTTP, infantil e adulta, reproduziram a falha e passaram após o ajuste. A prova de próximo pendente dos pais e a de segundos restantes do vídeo continuam passando. A suíte completa deve ser executada novamente no novo commit antes da publicação.
## Liberação verificada

- [PR de produção #282](https://github.com/informach/sistema-zero/pull/282), merge `3d7c532535a5474ce358709d00b78d6a7f23ce1a`, árvore idêntica ao head aprovado `0e0e2a255de531b03f2063191a0e231b7fc417f4`.
- [CI completo aprovado](https://github.com/informach/sistema-zero/actions/runs/45040934738): regressões, navegadores, PostgreSQL e tipos; as provas de concorrência da navegação e de paginação da lista de pais passaram no banco real.
- [Plano Railway aprovado](https://github.com/informach/sistema-zero/actions/runs/45040934768), sem alteração de configuração.
- [Produção implantada pelo workflow padrão](https://github.com/informach/sistema-zero/actions/runs/45045073513): Members, Auth, Admin, comunidade adulta e Community Kids no mesmo SHA. Manifesto terminou em `PRODUCTION_WAVE_PASSED`.
- O merge publicado foi integrado ao staging local no merge `25c4e9e1c` antes do início da implantação. A ancestralidade foi conferida novamente após a publicação; os commits posteriores de staging preservam essa integração.
- Leitura em produção, sem alterar dados: Aula 2 retornou a Parte 3 pendente com 151 segundos de vídeo guardados, em vez da Parte 2 já terminada. A listagem de pais respondeu HTTP 200. Os dados de navegação e vídeo permaneceram preservados.

Os testes pesados e builds foram executados no GitHub e no Railway, sem suíte pesada nesta máquina. Esta liberação é somente da correção de retomada e dos alunos responsáveis; não promove os demais recursos de staging para produção.
