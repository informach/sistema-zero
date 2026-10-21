# Pac-Man: encerramento agendado uma vez por tela

Os cenários instrumentados de vitória e derrota da variante portátil 1.0 fecharam
naturalmente após três segundos no navegador, mas o histórico completo registrou
104 e 90 agendamentos do callback `bye`, respectivamente. O loop original repete
os dois ramos de encerramento a cada quadro. Esses recibos comprovam o fechamento
observado e preservam o defeito de agendamento; não aprovam a variante seguinte.

A variante `portable-audio-1.1.0` acrescenta `close_game_once(screen)` e substitui
somente os dois agendamentos nesses ramos. A marca pertence à tela e só é gravada
depois de `ontimer` retornar com sucesso. Erros de registro continuam propagando.
O loop de 16 ms, os timers iniciais de 2500 ms, `reset_speed` após 3000 ms, a ordem
das operações, os sete inimigos, os sons e os demais algoritmos são preservados.
O upstream, sua autoria, licença e inventário continuam fixados no manifesto.
Os arquivos externos permanecem no cache de QA, fora dos exemplos do produto.

Fonte proposta e aplicada: SHA256
`3ccbfc081e26b5ac8c3bab5e44dae35841dc0cd54e956af81a3ca5d913edcb76`.
Manifesto: SHA256
`689bbeced12887dd08a44765c0e49151be1cf78e273f910e7e380d9278b1609d`.
O inspector verifica ambos; a versão continua declarada como não qualificada.

## Verificação leve e seus limites

Os controles puros extraem o helper da receita real e verificam repetição,
vitória/derrota simultâneas, telas independentes, propagação de falha no registro,
tentativas após falha e independência de outro callback com o mesmo atraso.
Não importam o jogo, Turtle ou áudio, nem executam callbacks de timers.

Neste lote passaram seis controles puros, dez testes de preparação de documento
(84 asserções) e o Biome dos quatro arquivos TypeScript/JSON alterados. A remoção
controlada do guard foi rejeitada pelos testes antes de conferir a fonte real.
Full TSC, build, navegador e execução nativa ficaram fora da janela autorizada.

O review de preservação compara o módulo completo por AST: ao remover o helper e
restaurar exatamente suas duas chamadas para os agendamentos anteriores, o módulo
fica igual à fonte portátil 1.0. A aplicação da receita ao upstream fixado precisa
reconstruir exatamente o hash 3ccb acima. Isso não substitui execução real do jogo.

## Próxima prova real

O coordenador deve revisar os novos pins e vincular um host/output novo antes de
executar. Não reutilizar a identidade de um host encerrado ou qualificar 1.1 com
recibos de 1.0. A distribuição do runtime só pode ser reutilizada após conferir seu
fingerprint; alterar a receita do corpus não autoriza dispensar essa conferência.

Nos dois cenários existentes, `victory-near-end` e `defeat-near-end`, verificar o
histórico completo após `completed`: um agendamento e um disparo com
`callback == 'bye'` e `delay == 3000`, mesmo `scheduledClock`, atraso observado de
pelo menos três segundos, um fechamento natural e cleanup normal. Preservar os
estados esperados do jogador/inimigos, mensagens e ausência de erros de callback
ou console. `reset_speed` usa legitimamente 3000 ms: seu timer deve permanecer
independente, sem contar todos os timers desse atraso como encerramento.

Uma nova exportação canônica precisa fixar seus próprios ZIP/recibo/inventário.
O runner nativo histórico continua pinado à variante 1.0 e não foi reescrito para
aceitar a nova fonte. Preparar uma cópia com pins novos somente quando o artefato
real existir, preservando o original. Nenhum navegador ou nativo 1.1 foi executado
neste lote. Não há aceite de partida completa, desempenho, Mural ou instalação
fresca. O Space Arena 1.2 e suas provas permanecem congelados.
