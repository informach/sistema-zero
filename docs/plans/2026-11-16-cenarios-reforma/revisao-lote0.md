# Fechamento da fundação

Base revisada: `dbe99040e`. Mantidos documento v2, migração v1, inversão e validação que o Claude implementou. Acrescentados os pacotes novos aos watchPatterns de Members, gateway, Arquipélago API, Admin e comunidades. O CI agora executa também os testes do motor genérico.

O teste da imagem Members estava desatualizado: a dependência `molda-cenarios-core` já era necessária e copiada pelo Dockerfile, mas a lista explícita de workspaces ainda a recusava. Atualizada somente essa lista; preservadas as verificações de isolamento, usuário, ausência de fontes/credenciais privadas e operacionalidade da imagem.

Verificação: seis testes de reconciliação de watchPatterns aprovados. A imagem foi construída localmente e o smoke real executado com Bun 1.4.4, usuário 1000, filesystem somente leitura, `/tmp` efêmero, sem rede e sem privilégios; resultado `MEMBERS_IMAGE_STATIC_SMOKE_PASSED`. O smoke confirmou 152 entradas de migração e não aplicou migrações nem conectou a banco real.

Também executados os sete testes de repositório do lote 1 em Postgres 17 descartável, com o DDL real da 0151: todos aprovados. Container exclusivo `sz-cenarios-reforma-qa`, porta 55439; nenhuma tabela da plataforma foi usada. A operação na plataforma e as capturas da oficina continuam sendo critérios do lote 1, separados deste fechamento.

Plano integral e PDF aprovados preservados nesta pasta. O acompanhamento de execução fica em `docs/superpowers/plans/2026-11-16-cenarios-reforma-execucao.md`.
