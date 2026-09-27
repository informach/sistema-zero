# Experiência “Uma vez e sempre”

## Objetivo

Fazer a criança ver a diferença entre `Ao iniciar` e `Enquanto estiver rodando` no movimento da mesma nave. A experiência deve provar a regra no cenário, sem depender de uma leitura abstrata de contadores.

## Decisão

A atividade terá uma ficha: **Mover a nave um pouquinho**. A nave já aparece com a chama ligada. Não haverá ficha nem estado visual de “Ligar a nave”.

O vídeo apresenta a linha do tempo: um momento de início e vários passos seguintes. O Zappy faz uma única ponte para a prática: “Agora veja a mesma ação nos dois lugares.” A instrução junto dos controles conduz dois testes curtos:

1. Colocar a ficha em `Ao iniciar` e avançar três passos. A nave se move no primeiro passo e para.
2. Usar `Voltar ao começo`, colocar a mesma ficha em `Enquanto estiver rodando` e avançar três passos. A nave se move a cada passo.

O HUD mostra o passo e o total de movimentos. Ele confirma a observação, mas o deslocamento da nave é a evidência principal.

## Conclusão da experiência

O caso do piloto exige as metas `once` e `always`, nesta ordem. A primeira meta só aparece depois de a ação em `Ao iniciar` ter acontecido uma vez e a criança avançar pelo menos três passos. Depois de recomeçar, a segunda só aparece quando a mesma ficha em `Enquanto estiver rodando` acontece em cada um de pelo menos três passos.

`Voltar ao começo` limpa a montagem, os passos, a posição da nave e os contadores da tentativa atual. Ele preserva a evidência das metas já observadas; assim, a criança compara dois testes sem ter de refazer o primeiro.

O piloto não cobra a meta combinada `both`, não tem palpite nem pergunta final, e não acrescenta um segundo exemplo. A própria repetição controlada do mesmo movimento é a comparação necessária.

## Compatibilidade e escopo

O motor continua aceitando o identificador histórico `panel` em retratos antigos, mas nenhum preset atual do piloto o oferece. Isso evita invalidar sessões salvas sem manter uma falsa ação pedagógica na nova experiência.

A revisão atualiza o manifesto, o roteiro de gravação, a documentação da cena, as metas do preset, o HUD e os testes do motor e do palco.

## Verificação

Os testes devem cobrir os dois caminhos com a ficha `move`, a preservação da primeira descoberta após `reset`, as metas restritas do piloto, a chama permanente da nave e a ausência do texto ou da ação de “Ligar a nave”. A validação final roda os testes, o typecheck e o check dos pacotes afetados.
