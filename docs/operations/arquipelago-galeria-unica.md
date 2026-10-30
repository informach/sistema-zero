# Galeria única: adoção e troca de autoridade

Este procedimento ainda não foi executado em staging nem em produção. Os ensaios da entrega
usam somente Postgres descartável local. A operação é por ambiente, com bancos correspondentes.

## Resultado e identidades

O Members passa a guardar a posse em `room_inventory`, sempre por perfil e público. Os nove
IDs de aparência dos salvamentos permanecem iguais. Aquário, fliperama e planta usam os itens
existentes `aquario`, `fliperama` e `planta`; seus preços únicos são 70, 70 e 30 moedas. A compra
mais cara anterior continua válida, sem diferença a pagar. Os outros seis IDs de inventário
começam por `arquipelago:` e não aparecem como modelos do quarto.

O preço vem do contrato puro. Os modelos de cada destino continuam independentes. A função
do projeto azul não depende da compra, e a posse não concede curso, bloco nem projeto azul.

## Preparação e corte

1. Conferir as versões de Members, jogo, API do jogo, contratos e host das duas comunidades.
   A migration gerada `0142_arquipelago_gallery_adoption` acrescenta somente um valor ao enum
   do livro de moedas. Aplicá-la pelo migrador do Members antes da adoção. Não editar o SQL.
2. Preparar a versão nova e impedir temporariamente novas compras **nos dois destinos**, quarto
   e jogo. Drenar os pedidos antigos já iniciados. Parar apenas o jogo é insuficiente: uma compra
   no quarto antes da adoção ainda poderia cobrar por um item adquirido no jogo. A implantação
   deve coordenar essas rotas e o processamento em andamento; a flag da ferramenta abaixo é uma
   confirmação operacional, não é uma trava distribuída nem substitui a drenagem.
3. Com as compras antigas paradas, exportar pelo pacote que é dono do banco do jogo. O exportador
   usa transação `REPEATABLE READ READ ONLY`, não lê o JSON do salvamento, não modifica tabelas e
   não sobrescreve o arquivo. `GALERIA_EXPORT_DATABASE_URL` é variável do processo, sem editar `.env`.

   ```powershell
   bun packages/arquipelago-api/scripts/exportar-posse-da-galeria.ts caminho/galeria.json
   ```

4. Guardar o arquivo em armazenamento restrito. Ele contém IDs operacionais, nunca deve entrar
   no Git nem ser enviado a uma rota pública. Conferir o SHA-256 emitido pelo exportador. O limite
   é 100 mil compras e 50 MB por arquivo; excedê-lo exige exportação por lotes revisada, não truncar.
5. No Members, usar `GALERIA_ADOPT_DATABASE_URL` do ambiente correspondente. Primeiro conferir:

   ```powershell
   bun packages/members/scripts/adopt-arquipelago-gallery.ts caminho/galeria.json SHA256 caminho/conferencia.json
   ```

   A conferência não concede posse nem movimenta saldo. Pagas e pendentes com débito confirmado
   são adotáveis. Pendente sem débito não é compra concluída. Uma compra paga sem débito, público
   divergente, conta desconhecida ou ausência de comprovação da compra gratuita interrompe o
   avanço. Não converter impedimento em nova cobrança. Resolver a origem confiável e exportar
   novamente, preservando o arquivo e o recibo anteriores.
6. Após resolver todos os impedimentos, aplicar o mesmo arquivo conferido:

   ```powershell
   bun packages/members/scripts/adopt-arquipelago-gallery.ts caminho/galeria.json SHA256 caminho/aplicacao.json --apply --compras-antigas-paradas
   ```

   O operador confere todas as linhas antes de conceder a primeira. Cada adoção é transacional
   e idempotente, usa as cercas da conta e a trava da carteira, e registra um evento de valor zero
   `arquipelago_gallery_adoption`. Nenhuma moeda ou XP é concedida. Se houver interrupção, repetir
   o mesmo arquivo com recibo novo. A mesma chave histórica não concede outro item na mesma pessoa.
7. Conferir as contagens e os recibos, iniciar a API nova e o Members novo e só então reabrir as
   compras. O jogo deixa de ler e escrever `compras_da_galeria`; essa tabela permanece como histórico.
   Não há versão nova de salvamento nem atualização em lote dos JSONs.
8. Validar com contas de teste Kids e adultas: posse antiga, compra em cada destino, reabertura,
   saldo, suporte somente leitura e serviço indisponível. O token `ARQUIPELAGO_COINS_TOKEN` deve
   ser o mesmo no Members e na API; não usar o token de leitura para comprar. Nenhuma variável
   nova de produção é necessária.

## Falhas e retorno

Não voltar à API antiga após aceitar compras canônicas novas: ela não conhece essas posses.
Se o novo cliente tiver problema visual, preservar a API canônica e corrigir o cliente. Se a
adoção não estiver íntegra, manter as compras pausadas, preservar os recibos e corrigir a causa.
A migration é aditiva e não precisa ser revertida. Não apagar o inventário adotado nem o livro.

As rotas de leitura e de compra recusam indisponibilidade com erro explícito. Uma resposta
ausente não é interpretada como inventário vazio; o salvamento não aceita aparência sem prova
de posse. Reabrir uma compra confirmada não cobra de novo, mesmo com outra chave no navegador.
