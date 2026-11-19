# Conferência do programa completo no Firefox

O CI `44602481462`, fonte `3b08219eb`, passou pelo funcionamento da casca,
console e Parar/Rodar no Firefox Linux, mas recusou a carga longa antes de
executá-la: o `textarea` do Monaco continha apenas a janela de acessibilidade
perto do cursor. O programa de seis linhas não cabe necessariamente nesse
valor. [Falha original](linux-red.txt).

O Monaco 0.52.2 implementa essa janela em
`esm/vs/editor/browser/controller/textAreaState.js`, classe
`PagedScreenReaderStrategy`. Esse campo não é o documento inteiro do editor.
O teste agora seleciona e copia pelo teclado e confere o conteúdo copiado.
Antes de copiar, escreve uma sentinela diferente no clipboard: a comparação
não pode passar por conservar a colagem anterior. Somente CRLF é normalizado
para LF, como na cópia nativa do Windows; espaços e todo o restante são exatos.

A [execução Windows](windows.json) passou pelos dois casos sem retry:
renderização, console, Parar/Rodar, carga real de 30 s, início em menos de dez
segundos, observação externa de três segundos e teto de intervalo de 500 ms.
A prova Linux da correção ainda será registrada separadamente. Nenhuma
asserção de execução, duração ou isolamento foi removida.
