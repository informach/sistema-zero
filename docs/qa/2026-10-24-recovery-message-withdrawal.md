# Retirada de avisos que perderam a finalidade

Preparada a operação S2S `POST /messaging/messages/:id/suppress`, para o processo de
regularização retirar um lembrete ainda na fila após pagamento ou cancelamento.
Exige origem interna e consumidor dono. Recusa corpo extra e mensagem alheia.
Não altera a lista global de destinatários suprimidos.

A operação verifica QUEUED/SCHEDULED e versão na mesma escrita do PostgreSQL, junto
do evento de domínio. Envio iniciado/aceito retorna seu estado real, sem prometer
desfazê-lo. A pré-condição explícita é necessária porque o claim existente do worker
não incrementa versão: comparar só a versão não protege essa transição.

Testes descobriram essa corrida; a correção compara estado e versão na escrita de
retirada. Não altera os orçamentos nem o transporte SendGrid/Evolution, nem reescreve
as regras do worker existente. Prova nativa de PostgreSQL confirmou que um snapshot
antigo com a mesma versão não consegue retirar SENDING.

Evidência: cinco cenários unitários/HTTP e dois de PostgreSQL real. Suíte Messaging
completa: 165 testes / 732 asserções, zero falhas/skip; tipagem passou. O primeiro
negativo de fixture sem assunto e o negativo causal da corrida foram preservados.

A chamada pelo scheduler de regularização ainda não foi conectada. Nenhuma mensagem
ou cliente real foi enviado/suprimido por estes testes. Essa operação não consegue
retirar e-mail já entregue ao provedor.
