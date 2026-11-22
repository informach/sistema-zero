# Piso de leitura da galeria Pinta

A reserva de um mapa com formato novo precisa proteger também a folha cujo ID ele referencia. Uma aba antiga pode ter somente a folha no IndexedDB e conseguir alterar seus índices. A comparação de formato e revisão individual da folha aceita a operação mesmo que exista um consumidor opaco em outro item da conta.

O Members guarda o maior formato de mapa, folha ou conjunto que exigiu proteção de dependências a partir do formato 7. A chave é a mesma do inventário em que os IDs se resolvem, formada por perfil, público e ferramenta. A conta responsável é gravada para a purga. Uma reserva de um perfil Kids não altera o inventário de um irmão nem a coleção adulta.

## Ordem das operações

1. A reserva usa o advisory lock da quota do perfil e o lock existente do item. Antes de substituir qualquer ticket, compara a capacidade do leitor com o piso persistido. O formato confirmado e o pendente do próprio item continuam exigindo um formato de escrita suficiente. A revisão-base continua sendo verificada.
2. Só uma reserva aprovada de `tilemap`, `tileset`, `vector-tileset` ou `map-set` pode elevar o piso. A alteração do piso e a nova revisão pendente pertencem à mesma transação. O abandono do PUT conserva a proteção. O valor gravado é o formato integral, inclusive um formato futuro como 99.
3. `maxReadFormatVersion` é uma capacidade opcional enviada pelo cliente da galeria Pinta e associada à revisão pendente. O recibo no banco guarda a revisão e a capacidade juntas. Se uma instância antiga substituir o ticket durante a troca de versão, o commit descarta a capacidade vinculada à revisão anterior. O serviço desta entrega negocia explicitamente até 7 e recusa uma declaração incompatível com o formato de escrita. Um produtor legado continua declarando implicitamente a leitura do próprio formato de escrita, com default 1. Assim o protocolo de formatos opacos do item continua aceitando uma reserva 99. Esse ticket eleva a barreira para 99. Um leitor 7 recebe 409 em uma escrita de sprite formato 1 nessa galeria.
4. Os tickets devolvem o piso efetivo como `inventoryFloor` quando acima de 1. O BFF exige recibo de proteção suficiente antes de assinar o PUT de qualquer novo formato versionado, inclusive 99. O cliente também verifica o recibo antes de enviar bytes. Ambos verificam o eco exato da capacidade quando ela foi declarada. Para o cliente público 6, os pedidos e tickets em galerias sem piso regional conservam o protocolo anterior.
5. No commit, o Members testa primeiro se aquela revisão já foi confirmada. A repetição devolve sucesso mesmo que o piso tenha subido depois. Para uma revisão pendente o serviço relê o piso sob o lock e usa a capacidade capturada na reserva. `CREATION_CLIENT_OUTDATED` com `details.requiredVersion` cancela só esse ticket e mantém o blob corrente. O BFF pode então limpar a chave recusada. O mesmo lock serializa o DELETE do Pinta, que conserva o CAS, a capacidade de exclusão já declarada e a revisão do item.
6. Lápides, exclusão explícita de um documento futuro e compactação preservam o piso. Um leitor que ainda não entende a versão requerida mantém suas alterações no aparelho. A recuperação normal exige um leitor compatível e o respectivo suporte do serviço. A purga da conta remove sua marca durável.

## Implantação e rollback

A migration gerada `0166_pinta_inventory_floor` acrescenta uma tabela indexada e uma coluna pendente anulável. A migration de dados `0167_backfill_pinta_inventory_floor` projeta formatos confirmados e pendentes já existentes, inclusive lápides, e só eleva o piso. O teste reaplica o backfill após remover a linha de maior formato para verificar monotonicidade.

Aplicar DDL, incluir o backfill e concluir a troca de todas as instâncias do Members antes do primeiro escritor regional. Se um serviço anterior tiver recebido escritas opacas durante a troca, reaplicar a projeção após drenar esse serviço e antes de habilitar o escritor. Confirmar também a troca de todos os BFFs e o recibo positivo no cliente. O rollback da interface mantém migrations e serviço de guarda. Um rollback do Members para uma versão que não conhece o piso requer suspender mutações Pinta enquanto se restaura a guarda.

O núcleo público continua com nuvem 6 e os caminhos de edição e leitura já publicados. Esta barreira cobre a escrita de um leitor incapaz de interpretar consumidores remotos. Um escritor moderno que reindexe uma folha ainda precisa provar causalidade do conjunto de alterações quando tem inventário parcial. A persistência de vários itens na nuvem continua confirmando um ticket por item.

## Provas locais

- PostgreSQL 16 descartável. Cenários com formatos 7 e 99, commit antecipadamente reservado, arquivo original preservado, idempotência de uma revisão já confirmada, corrida com duas transações reais esperando o mesmo advisory lock, CAS, abandono, lápide, compactação, backfill repetido, perfis, públicos e ferramentas independentes.
- HTTP Members, BFF e fila do cliente em arquivos de teste separados. Os controles exercitam pedidos antigos, serviço que confirma apenas o formato do blob, capacidade ausente e recibo incompatível com um arquivo futuro. Ausência de recibo impede assinatura e PUT.
- A purga usa outro banco local descartável, executa o histórico de migrations e verifica a remoção do registro de piso junto aos dados pessoais.

O container descartável `pinta-floor-20261122-db` usou PostgreSQL 16.13, com a porta local 55552 publicada somente em loopback. A prova do repositório usou `pinta_floor_test`; a prova de purga com a migration final usou um segundo banco, `kids_journey_pinta_floor_receipt`. Para reproduzir, configure `TEST_DATABASE_URL` e `KIDS_JOURNEY_PURGE_TEST_DATABASE_URL` para bancos locais descartáveis distintos. O segundo nome deve começar por `kids_journey_`. Os testes recriam a tabela de criações no primeiro e limpam os dados do segundo.

| Pacote | Comando |
| --- | --- |
| core | `bun test src/creations/pinta-format.test.ts` |
| members | `bun test tests/db/creations.repository.test.ts` |
| members | `bun test tests/db/user-data-purge.test.ts -t "remove dados de todas as tabelas"` |
| members | `bun test tests/integration/creations.test.ts` |
| member-shell | `bun test tests/creations-routes.test.ts` |
| community-kids | `bun test tests/creations-cloud.test.ts` |

Os seis arquivos de teste executaram 217 casos e 1.412 asserções. O filtro da prova de purga selecionou o caso que percorre todas as tabelas e deixou três casos independentes fora desta execução.

| Recibo | Resultado |
| --- | --- |
| [Core](core.log.gz) | 9 testes |
| [Repositório PostgreSQL](db.log.gz) | 23 testes |
| [Purga PostgreSQL](purge.log.gz) | 1 teste |
| [HTTP Members](members-http.log.gz) | 56 testes |
| [BFF](shell-bff.log.gz) | 66 testes |
| [Fila da galeria](cloud-client.log.gz) | 62 testes |
| [Biome](biome.log.gz) | 20 arquivos verificados |
| [Drizzle](migrations.log.gz) | A projeção final do schema não gerou outra migration |
| [TypeScript Members](members-types.log.gz) | `bun run typecheck` concluiu com saída 0 |
| [TypeScript member-shell](member-shell-types.log.gz) | `bun run typecheck` concluiu com saída 0 |
