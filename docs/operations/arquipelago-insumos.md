# Implantação e recuperação das compras de insumos

O preço é definido no contrato `insumos.ts`. Não há variável nova, moeda no salvamento nem
campo novo em V18. A API usa a porta interna de moedas já existente do Members. As identidades
vêm do gateway; o navegador só manda versão, UUID, revisão-base, item e quantidade.

## Ordem para a entrega integrada

1. Conferir a carteira idempotente e a configuração S2S existentes, sem expor os tokens.
2. Aplicar as migrações geradas `0012_compras_de_insumos` e `0013_pedidos_remunerados` pelo
   procedimento normal do serviço. Nesta implementação, só foram aplicadas no Postgres local.
3. Implantar a API com as rotas de insumos e pedidos e o bloqueio de PUT durante compra pendente.
   Todos os escritores do salvamento precisam dessa versão antes de habilitar o cliente.
4. Implantar gateway, BFFs Kids/adulto e cliente. GET pendente e POST comprar são privados,
   sem cache e sem repetição automática pelo gateway. A abertura do cliente consulta a
   pendência de compra e no máximo um crédito de pedido antes de iniciar o mundo. Estas rotas
   precisam estar disponíveis antes do cliente novo; não é uma habilitação opcional por flag.
5. Conferir em ambiente de teste autorizado: compra, cancelamento, saldo insuficiente,
   perda de resposta e reabertura. Repetição deve manter o mesmo UUID e um único débito.

## Reserva pendente

A reserva é confirmada no banco do jogo antes de chamar a carteira. A confirmação trava a
linha do perfil durante a chamada limitada a cinco segundos. Outros perfis continuam livres.
Debitar e gravar o jogo são duas transações em serviços diferentes: não fingir atomicidade.
O UUID torna a retomada segura depois de uma resposta perdida. A entrega e a nova revisão
são gravadas junto com o encerramento da operação no banco do jogo.

O PUT comum recebe 423 enquanto a reserva estiver pendente. O progresso do aparelho fica
no diário IndexedDB, separado do documento de 64 KB. A tela de salvamento oferece retomada;
outro aparelho também consulta a pendência. Nunca apagar a reserva, entregar por suposição,
cobrar com outra chave ou transformar indisponibilidade em saldo insuficiente.

Não expirar reservas automaticamente. Se a carteira continuar indisponível, recuperar a
conexão e retomar a mesma chave. Não voltar para uma API anterior sem o bloqueio dos escritores
enquanto houver pendências. Um rollback de interface precisa manter a API capaz de retomar
as operações existentes. Adaptações futuras dos preços não podem reinterpretar comandos V1
já reservados: usar versão nova ou preservar o catálogo da versão anterior.

## Prova local reproduzível

No pacote `arquipelago-api`, rodar `bun test tests/db/insumos.test.ts
tests/db/insumos-members.test.ts` com `ARQUIPELAGO_INSUMOS_TEST_DATABASE_URL` apontando para
Postgres local `arquipelago_test*` e `ARQUIPELAGO_INSUMOS_MEMBERS_TEST_DATABASE_URL` para
Postgres local `kids_journey_*`. Os helpers recusam bancos remotos. Não salvar URLs em `.env`.
Os testes geram perfis próprios e conservam os dados alheios.

## Crédito dos pedidos

`GET /pedidos/pendentes` retorna no máximo o crédito pendente mais antigo. O consumo já foi
confirmado, por isso este crédito não bloqueia PUT. `POST /pedidos/entregar` retoma pela mesma
chave, inclusive depois da virada do dia, e nunca reaplica a cesta. A carteira recebe um UUID
gerado pelo servidor, separado do UUID escolhido no navegador. O resultado `teto` confirmado
encerra aquela recompensa e não vira dívida para a semana seguinte. `recusado` fica registrado
e pede investigação de configuração/identidade, sem dizer à pessoa que o pagamento está em fila.

Não excluir linhas pendentes nem voltar a escritores anteriores durante a entrega. O jogo novo
depende do comportamento de replay e da entrega autoritativa. Executar `tests/db/pedidos.test.ts`
e `tests/db/pedidos-members.test.ts` com `ARQUIPELAGO_PEDIDOS_TEST_DATABASE_URL` local
`arquipelago_test*` e a variável local do Members descrita acima. Conferir também o caso de
perda de resposta e de teto antes de liberar o fluxo publicado.
