# Criar o Dino e mostrar na tela

## Problema

A experiência `world` chama uma ação visual de “ligar/desligar o desenho”. Esse é o nome de uma implementação, não a forma como uma criança entende o que está acontecendo. Ele aparece nos botões, nas metas, nas pistas, na demonstração, no palpite e no estado da cena. A criança precisa traduzir a cada passo uma chave técnica para a ideia que a aula quer ensinar.

O desenho atual também permite mostrar antes de criar. Esse contraste foi criado para explorar uma possibilidade do sistema, mas conduz a interação pela ordem menos clara: a criança pode apertar um controle cuja consequência ainda não consegue ver.

## Decisão aprovada

Organizar a bancada em duas ações com uma sequência guiada:

1. **Nos bastidores:** `Criar o Dino`.
2. **Na tela do jogo:** `Mostrar o Dino na tela`.
3. Depois de mostrar, o segundo botão passa a ser `Tirar o Dino da tela`.

Antes da criação, o segundo botão permanece visível, fechado e acessível. A nota associada explica: “Primeiro, crie o Dino nos bastidores.” Ele não despacha uma ação. Assim, a criança vê o próximo passo sem ser levada a tentar uma ação que ainda não pode produzir efeito.

Depois de criar, o primeiro botão continua no mesmo lugar como um estado fechado, `✓ Dino nos bastidores`. Isso preserva a posição de foco e mostra o que já foi feito. O segundo botão passa a ser a única ação disponível para levar o Dino à tela.

## Modelo de estado

O estado interno continua usando `world.created` e `world.drawn`; `drawn` representa a visibilidade na tela e não é exposto como vocabulário infantil. A ação de persistência continua sendo `connect/draw`, pois ela já representa a ligação entre a criação e a saída visual.

O motor passa a proteger a sequência da interface: uma ação `connect/draw` enquanto `created` é falso não altera `drawn`, não registra descoberta e não altera a cena. Depois de criar, mostrar registra `visible`; tirar da tela registra ou mantém `hidden`. O fluxo válido é:

`vazio → criado nos bastidores → Dino aparece na tela → Dino nos bastidores`.

## Linguagem da experiência

Toda a comunicação destinada à criança deve usar a mesma ideia:

- `Criar o Dino nos bastidores`
- `Mostrar o Dino na tela`
- `Tirar o Dino da tela`
- `O Dino existe nos bastidores`
- `O Dino apareceu na tela do jogo`

Não usar “ligar/desligar o desenho” para descrever esta cena. A demonstração e a pergunta final reforçam que tirar da tela não apaga o que foi criado nos bastidores.

## Superfícies afetadas

- O catálogo da cena define título, instrução, metas, pistas e roteiro automático com a nova sequência.
- O motor bloqueia a transição inválida antes da criação.
- A faixa de estado e a frase de situação mostram `bastidores` e `na tela do jogo`, sem estados de chave.
- O palpite pergunta pelo Dino depois de ser criado nos bastidores e antes de aparecer na tela. A explicação descreve duas ações, criar e mostrar.
- A bancada separa visualmente `Nos bastidores` e `Na tela do jogo`, com botões e notas associadas por `aria-describedby`.
- O palco e os textos alternativos dizem que o Dino aparece ou não aparece na tela, nunca que foi “desenhado” ou que o desenho está “ligado”.
- O editor administrativo nomeia a ação `draw` como mostrar ou tirar o personagem da tela. Os roteiros e manifestos da Aula 1 ficam coerentes com a nova experiência.

## Verificação

Os testes de Core devem provar que não é possível mostrar antes de criar, que a sequência guiada registra as duas descobertas e que tirar da tela preserva o Dino nos bastidores. Os testes de Member Shell e Community Kids devem provar os dois grupos de controles, o botão fechado com sua explicação e a transição para o botão de retirar. Os validadores de manifesto e os roteiros devem usar a mesma pergunta e os mesmos pedidos do catálogo.

Após a alteração textual da experiência, a voz do Zappy dessa cena precisa ser regenerada no Admin antes de publicar a aula.
