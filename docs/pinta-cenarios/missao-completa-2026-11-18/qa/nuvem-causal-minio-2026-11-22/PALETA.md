# Biblioteca de paletas com escrita verificada em homologação

Este ensaio usa o BFF compartilhado das duas comunidades, Gateway HTTP com JWT para o fluxo legado e HMAC para os cinco comandos privados, Members com composição real, PostgreSQL 16 e MinIO. A fixture injeta a sessão de QA adulta somente no BFF local. Ela não testa login remoto, CORS de staging ou R2 de produção.

O perfil real precisa ser elegível por audiência, conta e usuário. O Member Shell e Members exigem `PINTA_PALETTE_WRITE_CANDIDATE=1` e a lista `PINTA_CAUSAL_QA_PROFILES`. Desligar a flag impede novas negociações. A geração da paleta já adotada permanece na base e continua bloqueando escritores anteriores. Não foi alterada a versão do JSON da biblioteca nem ativado o cliente.

## Reproduzir

Use o PostgreSQL de QA em `127.0.0.1:55553` e o banco isolado `kids_journey_pinta_palette_scope_v2`, com o mesmo container e dependências do [roteiro MinIO](README.md). O banco `kids_journey_pinta_palette_protocol` preserva o histórico do primeiro ensaio. Em PowerShell, com Bun 1.4.3 disponível, execute o runner a partir da raiz.

    ./docs/pinta-cenarios/missao-completa-2026-11-18/qa/nuvem-causal-minio-2026-11-22/run.ps1 -Palette

O runner usa a imagem e o SHA do MinIO já fixados no roteiro. Ele destina somente 5578 e 5597–5599 ao ensaio, cria bucket descartável, mascara URLs assinadas e remove apenas seu container em `finally`. O banco e o histórico de migrações continuam intactos.

As suítes `packages/members/tests/db/pinta-palette-writes{,-http}.test.ts` aceitam `PINTA_PALETTE_TEST_DATABASE_URL`. Para o segundo caso HTTP, aponte `PINTA_PALETTE_PREDECESSOR_ROOT` para um checkout com dependências e código Members de `d5bf4f2158eff3e23576bdf7e7214f3d34b5fb97`. O replay usou um checkout cuja árvore `packages/members/src` foi conferida como idêntica a essa revisão. Inicie as duas suítes em sequência, pois o preparo do banco detecta outro cliente conectado.

## Resultados da primeira rodada

| Ensaio | Resultado |
| --- | --- |
| Core | 6 testes / 16 verificações |
| Escritores SQL/HTTP de Members em PostgreSQL | 5 testes / 63 verificações |
| ACL do Gateway nas 15 rotas privadas, cinco da paleta | 1 teste / 77 verificações |
| BFF de criações, candidatos de escrita e worker de limpeza | 94 testes / 432 verificações |
| BFF real → Gateway real → Members → PostgreSQL → MinIO | 1 teste / 40 verificações |

O PUT condicional da nova reserva respondeu 412 no replay. A URL ainda válida do upload antigo numerado respondeu 200 depois da adoção. Seu commit recebeu 409, e os downloads negociado e legado voltaram com os bytes selados. No replay do checkout limpo `e9c5a49a1943af5dbab5c3b440b3d143ad1514ed`, o SHA-256 observado foi `a2ccb7f7ab3ad72b4726db6cb0e654bd9e2b4e80fddca6cc7f3d9ef19f9e2657`. Repetir o commit do mesmo nonce retornou o mesmo ACK. A exclusão legítima girou a geração, devolveu 404 tipado na ausência e permitiu recriação na nova encarnação.

No ensaio separado com o **processo Members anterior** aberto contra as migrações novas, a tentativa de gravar ou excluir após adoção chegou ao SQL e foi revertida pelo trigger. O processo anterior devolveu HTTP 500 porque seu mapeador não conhece essa recusa. A versão nova devolveu HTTP 409 estruturado mesmo com a flag desligada. A leitura antiga continuou funcionando. A prova qualifica preservação com o servidor anterior, com erro de escrita degradado até ele ser atualizado.

A verificação do gzip cobre tamanho reservado, conteúdo, timestamp autoral, SHA-256, estrutura canônica e selagem em `If-None-Match: *`. O sistema não relê como imutável uma chave de upload antiga. O [contrato](../../../../superpowers/plans/2026-11-22-pinta-paleta-escrita-verificada.md) registra o limite de compatibilidade anterior à primeira adoção.

## Revisão de escopo e de reservas históricas

O primeiro SQL retornava `23514` ao atualizar um projeto Studio com o mesmo ID em um perfil que havia adotado paletas. A migração revisada restringe o gatilho ao canal Pinta em `OLD` e `NEW`. O projeto Studio completou reserva, commit, download e exclusão por HTTP. A paleta manteve a mesma geração e o mesmo ponteiro. Escrever o kind `palette-library` pelo Studio e mover ou renomear a identidade protegida continuaram proibidos.

Também foi reproduzida uma linha histórica com ticket vencido na revisão 1 e contador de alocação atrás. O predecessor reservava novamente a revisão 1 e deixava o ticket vencido registrado na linha. O trigger revisado limpa o marcador quando muda o contador, e o predecessor confirmou a nova revisão por HTTP 200. A tentativa direta de confirmar o ticket vencido foi revertida antes da nova reserva. O PostgreSQL também confirmou o reaproveitamento após compactação, a purga autorizada e a revisão 21 para uma linha histórica com publicação 10, pendência 20 e contador 5.

No banco isolado `kids_journey_pinta_palette_scope_v2` passaram 8 testes SQL/HTTP e 103 verificações com o predecessor real. Passaram também 16 testes e 136 verificações do Core, 15 testes e 76 verificações de BFF e Pensa, e o fluxo real MinIO com 1 teste e 40 verificações. O replay MinIO usou a migração de SHA-256 `11925676080604587b6ab2702af9aa6791e9508fac9962c6bf6583d8f96898c8` e preservou o gzip da fixture com SHA-256 `0d62a37ac4c4d75e13078ff8e38961102d60508b0049efa06633a6de7e471c2d`. Os bancos `kids_journey_pinta_palette_protocol` e `kids_journey_pinta_palette_scope` preservam as duas rodadas anteriores.
