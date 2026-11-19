# Chromium do consumidor correto

O CI fixado em `87261f880`, execução `44625631453`, passou o smoke do Kids,
mas falhou antes de executar os quatro casos do Pensa. O job instalava o
Chromium 1223 do Playwright 1.60.0 (Kids); o Pensa usa Playwright 1.64.1,
que exige Chromium 1248. O executável esperado não existia no runner Linux.

A instalação do Kids estava correta. Foi acrescentada a instalação pela CLI
do próprio pacote Pensa, antes de `bun run e2e`. Nenhuma suíte, asserção,
timeout, retry ou navegador foi removido ou afrouxado. A instalação explícita
do consumidor Studio permanece necessária para seus próprios comandos.

A resolução local e o modo `install --dry-run chromium` confirmaram as duas
revisões. Com o navegador do Pensa disponível, os mesmos
[quatro casos passaram no Windows](pensa-windows.txt), em 10,9 segundos.
Isso não substitui a execução Linux: a branch desta correção recebe um CI
completo próprio, sem depender dos próximos pushes em staging.

O código de produto desta correção é idêntico ao de `87261f880`. O restante
da missão, a rastreabilidade do deployment atual de Members e o ciclo
autenticado continuam sendo entregas separadas.
