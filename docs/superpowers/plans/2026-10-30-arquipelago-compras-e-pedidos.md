# Compras de insumos e pedidos remunerados

Continuação de L07. A galeria unifica a posse dos cosméticos, mas consumíveis
pertencem ao salvamento do jogo. Não usar o inventário do quarto para alimentos.
A carteira continua no Members e o jogo não importa o serviço.

## Consistência escolhida

Um comando econômico com versão, UUID e revisão-base entra no serviço depois de
salvar o progresso local. A interface pausa os gestos do mundo durante a operação.
O preço, a quantidade entregue e a recompensa são calculados pelo servidor usando
regras puras compartilhadas. O navegador nunca escolhe valor de moeda.

A API reserva a compra de insumos duravelmente antes da chamada à carteira. Enquanto uma
reserva está sem resposta definitiva, o PUT normal de salvamento desse perfil é
recusado explicitamente, conservando o rascunho no aparelho. O dono pode retomar
a mesma operação. Uma tentativa econômica por perfil evita bloquear o mundo de
outras pessoas ou consumir duas vezes um mesmo conjunto de ingredientes.

A retomada serializa por perfil e mantém a trava transacional enquanto chama a
porta de moedas, cujo prazo já é de cinco segundos. Confirmar carteira e aplicar
o salvamento são fases distintas: se a resposta cair, a reserva continua e a
mesma chave consulta o débito já feito, sem repetir. O novo save e o estado
confirmado da operação são gravados na mesma transação do banco do jogo. Nenhum
save inteiro de outro serviço entra no Members.

A fila local precisa incorporar o resultado autoritativo com a própria revisão,
sem tratá-lo como uma edição comum e sem ignorar mudanças concorrentes. O comando
não avança com rascunho pendente, suporte, visita, tempo pausado ou conflito. Após
reabrir, consultar pendência antes de aceitar novas mutações econômicas. Reserva
sem resposta não vira saldo zero, estorno presumido ou sucesso falso.

## Insumos

- Três sementes e oito ingredientes já existentes. Sem isca fictícia, pois ainda
  não há um item de isca com uso implementado. Não criar arte nova.
- Uma a dez unidades por compra; teto de 999 por item e 64 KB no save. A entrega
  inteira deve caber antes de cobrar. O catálogo não concede projetos ou receitas.
- Sementes, fubá, leite e ovo custam duas moedas por unidade. Polvilho, queijo,
  cacau, leite de coco e polpa de açaí custam três. Valores editoriais de partida,
  baixos frente ao teto semanal de 100. Não há desconto por urgência ou aleatoriedade.
- Fontes gratuitas permanecem: sementes devolvidas pela colheita e ingredientes
  dos pedidos/turnos. A compra é atalho opcional, nunca obrigação para continuar.

## Pedidos

Mover somente as regras puras necessárias para um domínio compartilhado no
contrato. O serviço precisa validar o pedido do dia e aplicar o consumo/retorno,
não apenas aceitar `entregue: true` de um JSON. Registro por perfil, público,
morador e dia de São Paulo, crédito idempotente e teto comum. A amizade, a cesta
e o registro financeiro precisam permanecer coerentes ao falhar ou reabrir.
A implementação de pedidos vem depois da compra de insumos e usa o mesmo fluxo
de comando/revisão, sem duplicar a fila de salvamento.

### Decisão de implementação dos pedidos

Os seis moradores mantêm seus pedidos, falas, amizade e cestas atuais. O catálogo
de pedidos e receitas e a entrega pura passam ao contrato, importado pelo jogo e
pelo serviço. Não importar o jogo no servidor e não copiar uma segunda regra.
O dia dos pedidos passa a ser o de São Paulo em todos os aparelhos. O servidor
confere o catálogo do morador, o pedido do dia em aberto e os itens persistidos.
A escolha determinística local é compartilhada; não alegar que um save enviado
pelo cliente prova a origem de cada item. O caso da Capi que pede um bicho conserva
a contagem inicial no ID e exige um novo bicho conhecido depois daquela contagem.

Prêmio editorial inicial: três moedas por pedido, quatro com humor ótimo no
snapshot confirmado. Usa o teto único de 100 moedas semanais já decidido. Não
há punição por faltar nem perda de amizade. No teto, entrega, amizade e cesta
continuam possíveis, sem inventar crédito. A operação guarda o resultado do teto
e não vira dívida de moedas para outra semana.

O consumo, a amizade, a cesta e um crédito pendente são gravados em uma transação
antes da chamada à carteira. Isso difere da compra: é seguro continuar o jogo
enquanto um crédito já conquistado espera confirmação, pois não resta uma entrega
de inventário por aplicar. A transação usa a mesma trava do save e recusa uma
compra de insumos pendente. A chave única por morador/dia impede usar outro UUID
para ganhar de novo; a carteira recebe outra chave gerada pelo servidor, evitando
colisão com chaves de compras ou desafios escolhidas pelo cliente.
Resposta perdida conserva a operação, inclusive na virada do dia. O cliente
incorpora o resultado autoritativo pela fila existente, sem fazer a entrega local
primeiro. Comando V1 não recebe preço, saldo, amizade ou cesta escolhidos pelo cliente.

## Etapas

- [x] Catálogo e contrato versionado; regra de entrega indivisível.
- [x] Reserva, trava por perfil e migração gerada, somente banco local descartável.
- [x] Serviço, HTTP e Members real em testes locais: concorrência e resposta perdida.
- [x] Fila de salvamento, retomada, plataforma real e falsa, bloqueios coerentes.
- [x] Feira: quantidade, preço total, alternativa gratuita, confirmação e resultado.
- [x] Pedidos diários com regra compartilhada e concessão confirmada no servidor.
- [ ] Navegador, tipagem, lint e revisão integrada. Nenhum envio intermediário.

Não mudar a V18: o comando usa inventário e moradores já presentes. As reservas
financeiras vivem no banco do serviço, fora dos 64 KB do progresso. Se surgir uma
necessidade incompatível de save, reavaliar e criar versão nova antes de editar.
