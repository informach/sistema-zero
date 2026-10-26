# Revisão das imagens de Catálogo e Pagamentos — 26/10/2026

Os Dockerfiles instalam apenas os workspaces do serviço e do núcleo, incluindo `drizzle-kit` para as migrações. A instalação recebe os manifestos e patches antes do código, permitindo reaproveitar a camada quando as dependências não mudam. A imagem final contém apenas os dois workspaces e as dependências instaladas; executa como usuário `bun`.

Foram construídas as duas imagens finais no Docker local com o lockfile congelado: Catálogo 585.925.027 bytes e Pagamentos 591.194.480 bytes, conforme `docker image inspect`. Os números são tamanhos locais das imagens e não devem ser comparados diretamente ao tamanho de transferência reportado pelo Railway.

Em PostgreSQL 17 isolado e recém-criado, os comandos de migração reais de ambos os serviços concluíram com sucesso. As imagens finais iniciaram com seus comandos padrão e seus endpoints `/readyz` responderam HTTP 200, com banco pronto; Pagamentos também reportou o aquecimento do cliente Efí como pronto usando credenciais e certificado de teste. Não foram feitas cobranças nem chamadas reais à Efí. Verificou-se que o processo roda como `bun` e que documentação, cache e os demais workspaces não estão na imagem final.

O tempo de publicação e a saúde dos serviços após deploy no Railway ainda precisam ser medidos em staging; o teste local não explica nem elimina eventuais atrasos de infraestrutura do provedor.

