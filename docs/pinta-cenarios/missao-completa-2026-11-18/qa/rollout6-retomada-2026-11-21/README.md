# Gravador 6: retomada da qualificação

Lote da etapa 0 do plano aprovado em 21/11. Base de implementação:
`30f6d22963ee57769c970a93c9c63d4492101bb5`; branch isolada
`pinta-missao-retomada-20261121`. Nenhum arquivo do Molda foi alterado.

## O que esta prova verifica

As rotas HTTP reais do Members exercitam B6 → leitor A → B6: reserva não
altera a listagem confirmada; clientes 1–5 são recusados antes e depois do
commit; o download continua disponível; exclusão antiga é recusada; uma base
vencida retorna `CREATION_STALE_BASE` sem mudar o registro; o gravador B6
retoma com revisão crescente. Outro caso garante que a confirmação tardia de
uma reserva A4 não confirma a reserva B6 nem substitui o estado confirmado.

Essa suíte passou com 55 testes e 565 asserções. Ela usa o repositório em
memória da infraestrutura de testes, não R2 ou PostgreSQL.

A suíte do repositório Drizzle passou separadamente em PostgreSQL 17 real:
16 testes e 149 asserções. O caso de exclusão concorrente agora cobre também
um cliente de capacidade 4 bloqueado pela promoção ao formato 6 sob lock.
O armazenamento confirmado e a ausência de exclusão são conferidos depois
da liberação da transação, usando a implementação SQL real.

O banco foi criado em contêiner novo com porta dinâmica vinculada somente
a 127.0.0.1. Não foi utilizado o PostgreSQL de outro projeto. A identidade do
contêiner foi conferida por ID e label antes da remoção. O recibo registra
remoção confirmada. `TEST_DATABASE_URL` foi explícita; não houve skip por
ausência de infraestrutura. O ensaio não lê credenciais de staging.

## Limites e próximo fechamento

Isto não é prova de upload de documento nativo ao R2, recuperação offline
em IndexedDB, autenticação ou rollback de serviços publicados. Esses testes
integram o fechamento operacional que ainda deve ser executado com o produtor
real, dois contextos de navegador e os mesmos mapas, sem semear nuvem 6
manualmente. Não se altera a classificação das evidências anteriores.

A inspeção Railway no início desta retomada encontrou Community e Kids ainda
na fonte 85d16fcd9 (leitor/escrita 4), enquanto o código da staging declara 6.
A CI 44897117931 da fonte 30f6d2296 estava em execução na consulta. Este lote
não executou deploy ou ativação de escritor, nem conclui a etapa 0.
