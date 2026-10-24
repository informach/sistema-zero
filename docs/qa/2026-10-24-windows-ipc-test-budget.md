# Orçamento do cenário IPC no Windows

A execução auxiliar `40049946303` falhou no cenário de autenticação IPC ao atingir
o limite padrão de 5.000 ms (5.016 ms observados). O PR do mesmo SHA e a execução
da base financeira passaram nesse cenário; o negativo não foi apagado.

A preparação Windows chama o helper de ACL, que já tem seu próprio limite de
10.000 ms, além de operações no cofre de credenciais do sistema. O limite de cinco
segundos para o cenário completo não comportava esse contrato de preparação.

Os dois cenários IPC passam a ter 30 segundos no Windows; Linux mantém cinco.
Timeouts do handshake, provas de autenticação, cancelamento, segurança do pipe e
orçamentos do produto não mudaram. Não foram adicionados sleeps ou tentativas.

Verificação nativa local: dois testes/seis asserções passaram, 2.297 s e 1.437 s,
com encerramento normal e limpeza do host/credencial temporária. Isso não afirma
reprodução local da lentidão do runner nem apaga a necessidade do próximo CI.
