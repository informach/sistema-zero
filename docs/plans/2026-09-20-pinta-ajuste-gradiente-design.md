# Ajuste visual do degradê no Pinta vetorial

## Decisão

Adicionar um modo temporário **Ajustar no desenho** à janela de Degradê. A janela atual é modal, portanto o comando a fecha e mostra alças sobre a única forma vetorial livre selecionada. O resultado aparece na própria forma durante o arraste. A autora confirmou que quer mover o brilho e ajustar a transição do degradê redondo, além de reposicionar as pontas do degradê linear, usando arraste na forma com mouse ou toque.

## Alternativas consideradas

- Modo temporário com alças na forma: escolhido. Dá controle visual preciso sem misturar as alças do degradê com as de seleção, tamanho e rotação.
- Alças sempre visíveis ao selecionar: economizaria um clique, mas sobreporia controles com funções diferentes e atrapalharia mover a forma.
- Controles apenas na janela: implementação menor, porém não permite posicionar o brilho olhando diretamente para a esfera ou outra forma.

## Interação

Com uma forma desbloqueada de preenchimento em degradê selecionada, **Ajustar no desenho** fecha a janela e entra no modo de edição. Uma faixa discreta identifica o modo e oferece **Concluir**; Esc também encerra o modo. A seleção e as demais ferramentas não disputam o mesmo gesto enquanto o modo estiver ativo. Se a forma for removida, bloqueada, escondida, trocada ou o editor sair do documento, o modo termina sem gravar uma edição vazia. Para seleção múltipla, a janela orienta a escolher uma forma; as ações existentes de cores continuam funcionando para várias formas.

No degradê redondo, uma alça marca o centro da cor inicial, permitindo deslocar o brilho até perto de qualquer borda. Uma segunda alça regula o alcance da cor final e, assim, o tamanho da transição. No degradê linear, as duas alças marcam o início e o fim. As alças têm alvo de toque adequado e tamanho visual constante com o zoom. A forma pode estar girada: posições de alças e coordenadas gravadas acompanham a rotação. Um arraste atualiza a prévia continuamente, mas gera apenas uma entrada no Desfazer ao terminar; cancelar o ponteiro restaura apenas o gesto em curso.

As cores continuam sendo escolhidas na janela já existente. Os três botões de tipo continuam sendo predefinições: **deitado**, **em pé** e **redondo**. Escolher uma predefinição reinicia a geometria correspondente em posição padrão, para sempre haver um caminho simples de volta. A interface não acrescenta novas cores ou paradas intermediárias nesta entrega.

## Dados e renderização

As posições são proporcionais à caixa da forma, não pixels absolutos. O modelo guarda campos opcionais para as duas pontas lineares ou para centro e alcance radial. Desenhos salvos sem esses campos continuam com a aparência atual: o linear deriva do ângulo existente e o redondo permanece centralizado com o raio atual. Validação normaliza os novos valores finitos e impede geometria inválida. A renderização React, a exportação SVG e a prévia usam a mesma geometria; o conta-gotas respeita a nova posição das cores.

## Verificação

Testes cobrem valores padrão e antigos, validação e persistência, posição e alcance nos dois tipos, rotação, paridade entre tela e SVG exportado, escolha de cor por posição, predefinições, seleção bloqueada ou múltipla, mouse, toque, Desfazer/Refazer e cancelamento do gesto. Antes da publicação, rodar a suíte, tipos e checagem de estilo do Pinta, depois acompanhar CI e saúde dos serviços de staging afetados.
