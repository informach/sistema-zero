# Verificação de processos nativos — 21/11/2026

A CI automática 44881202754 do leitor 85 falhou em uma única asserção do
teste de retirada de processos: esperava que `kill(pid, 0)` lançasse depois
do encerramento. A CI anterior do mesmo commit, 44876673236, havia passado.
Não se considera a CI automática aprovada por causa desse resultado anterior.

Em Linux, um processo encerrado pode continuar como `Z` até o pai coletar seu
status; a consulta de existência ainda pode responder. Isso é diferente de
um processo em execução ou parado. Referências: [kill(2)](https://man7.org/linux/man-pages/man2/kill.2.html)
e [proc_pid_stat(5)](https://man7.org/linux/man-pages/man5/proc_pid_stat.5.html).

Uma reprodução controlada pausou somente o pai criado pelo ensaio, encerrou
seu filho, observou `Z` no `/proc` e comprovou a resposta positiva de sinal 0.
Depois retomou o pai e confirmou sua saída/coleta. O estado do PID da falha
original não foi capturado pela CI; não se atribui retrospectivamente a ele
um estado específico. A reprodução demonstra a premissa incorreta da asserção.

## Correção e controles

A alteração ficou em quatro arquivos de testes/fixtures. A observação aceita
somente ausência confirmada ou estados terminais Linux; processos ativos,
parados, erros de acesso e dados desconhecidos não autorizam retirar entradas.
O teste conserva os arquivos de entrada quando a prova de retirada é incerta.
Os prazos anteriores de execução e encerramento permanecem iguais. Não houve
alteração no executor, Worker, imagem funcional, contratos ou arquivos 3D.

Passaram sete casos em Linux, incluindo um zumbi real e seu pai ainda parado.
Dez repetições do conjunto passaram: 70 execuções, sem falha. Um controle
negativo retirou o reconhecimento terminal numa cópia montada no contêiner;
o ensaio real falhou como esperado, sem modificar a fonte verificada.

Os contêineres locais usaram Node 24.22.3 e Bun 1.3.11, como a CI, com duas
CPUs, 512 MiB, rede desativada e fonte somente para leitura. Isso é emulação
Linux nesta máquina, não outro dispositivo físico nem medição do editor.
No Windows passaram seis casos; somente a prova específica de `/proc` foi
ignorada, e foi executada de fato em Linux. Tipos completos do runtime, lint
e perfil passaram. O Worker gerado manteve exatamente 1.979.073 bytes e SHA
`670c8c32d33cf541dc16b6ff81e3c5acf0978626ef6844f7fefaf316f668cf6a`.

O log integral da falha de CI está comprimido, com hash dos bytes originais
e verificação de descompressão. Os resultados locais não substituem uma nova
CI geral nem a homologação autenticada do rollout. Não há prova nova de uso
do editor com crianças ou aparelhos físicos adicionais neste lote.
