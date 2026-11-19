# Pintura por teclado: verificação

O lote acrescenta foco, cursor, pintura, conta-gotas, seleção, cancelamento e
navegação pela grade usando os algoritmos existentes. O guia é
[Pintar e navegar pelo teclado](../../pintura-por-teclado.md).

## Falhas reproduzidas e corrigidas

- A grade não recebia foco pelo teclado.
- Trocas rápidas de ferramenta e de peça usavam a última renderização React.
  Os controles passam a consultar o estado atual da sessão.
- Uma troca de ferramenta sem alterar as demais opções mantinha a prévia
  anterior. O contrato transitório acompanha também a ferramenta.
- Selecionar o destino de um pedaço flutuante consultava o mapa antes do
  carimbo. A consulta passa a usar a revisão resultante da confirmação.
- Em mapas rolados, o cursor de uma casa parcialmente visível usava um ponto
  fora do papel. Os contornos são recortados pelos limites reais do mapa.
- O viewport deixava oito pixels finais sem pintar porque descontava o
  padding nas duas dimensões. O caso unitário exige o extremo completo e o
  ensaio nativo confere a cor do pixel real da última casa.

Cada gesto continua sujeito à curadoria, ao bloqueio e à aceitação do host.
As prévias não são persistidas; troca de revisão, recuperação, Escape, perda
de foco e início do ponteiro cancelam o gesto pendente.

## Escopo das evidências

Os ensaios nativos verificam pixels, operações e documento exportado após
reabrir: pintura e cópia; mapa grande com deslocamento herdado; terrenos,
balde, histórico e conta-gotas; criação de marcador. Os três perfis usam esta
máquina. Não há alegação de testes físicos em celulares, participação infantil
ou teste assistivo com leitor de tela.

A rodada `r6b` passou nos 12 casos antes das duas últimas correções da revisão.
A primeira execução da suíte completa leu os testes novos enquanto estavam
sendo acrescentados e registrou as duas regressões vermelhas; ela não é uma
prova final do código corrigido. As provas finais devem ser posteriores ao
congelamento dos arquivos e ficam identificadas separadamente.

## Resultado final

A [suíte completa congelada](pinta-completo-final.txt) teve **2192 aprovados,
zero falhas e zero omissões**, com Python real habilitado.
[Tipos do Pinta](pinta-types-final.txt), [tipos do Estúdio](studio-types.txt) e
[lint](biome.txt) passaram. O tipo completo do Estúdio antecede apenas as duas
correções internas de seleção/contrato transitório, cobertas pelos tipos finais
do Pinta; não mudou a API pública do editor nesse intervalo.

A rodada r7 encontrou uma falha de reabertura: o ensaio recarregava a página
3,3 ms após terminar o clique em Voltar, sem esperar a conclusão do fechamento
assíncrono. O teste agora exige que a galeria esteja visível antes de recarregar.
Não houve aumento de espera fixa, redução de comparação ou mudança da persistência.
[Cinco repetições do fechamento](fechamento-cinco-vezes.txt) passaram.
A [rodada final r9](navegadores-final.json) teve **12 aprovados**, sem retry,
omissão ou instabilidade, após esse ajuste. A comparação integral de camadas
continua obrigatória. Isso não comprova descarte abrupto de um documento ainda
não confirmado pelo salvamento; a autoridade offline tem seus ensaios próprios.

Os 474 arquivos do snapshot de fonte foram conferidos novamente ao arquivar.
Os screenshots são de fixtures locais, sem sessão autenticada. O ensaio entre
clientes de staging continua separado na etapa 0b.
