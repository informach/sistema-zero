# Da tela ao espaço

Base do Construtor · Patrulha Espacial · 3D.

**Entrada:** A nave já se move para os lados depois de Enter. Cena, câmera, três modelos, grupos vazios, percursos, abertura, estado e telas finais estão preparados. As velocidades dos grupos ainda são zero.

**Conquista:** Cada aperto de Espaço cria um laser na posição lateral da nave; ele viaja pelo Z negativo e sai do grupo ao ultrapassar o limite.

## Parte 1. Conheça a Patrulha Espacial

Experimentar o jogo completo e reconhecer a nova rota em três dimensões.

- Intenção: explanation.
- Atividades: video-abertura, ponte-abertura, jogo-pronto-abertura.
- Estúdio: não.
- Conclusão: video-abertura, jogo-pronto-abertura.


## Parte 2. Seu passo a passo do projeto

Conhecer o caderno de consulta e os caminhos de ajuda da plataforma.

- Intenção: material.
- Atividades: video-seu-passo-a-passo, ponte-seu-passo-a-passo, materiais.
- Estúdio: não.
- Conclusão: video-seu-passo-a-passo.


## Parte 3. Investigue as três direções

Relacionar x, y e z ao lado, à altura e à profundidade antes de posicionar o laser.

- Intenção: exploration.
- Atividades: video-tres-direcoes, ponte-tres-direcoes, experiencia-tres-direcoes.
- Estúdio: não.
- Conclusão: video-tres-direcoes, experiencia-tres-direcoes.


## Parte 4. Um aperto, um laser

Criar uma cópia do laser ao apertar Espaço, somente durante a partida.

- Intenção: application.
- Atividades: video-um-aperto-um-laser, ponte-um-aperto-um-laser.
- Estúdio: projeto.
- Conclusão: video-um-aperto-um-laser.
- Crie uma cópia do moldeTiro ao apertar Espaço durante a partida.
- Conserve a abertura, os grupos vazios e as velocidades desta etapa.
- Antes de Enter não dispare; depois, cada aperto de Espaço cria um tiro.
- Conserve o movimento lateral preparado: espere Enter e respeite as bordas e a altura da nave.

## Parte 5. O laser nasce na nave

Usar a posição X atual da nave como origem lateral de cada disparo.

- Intenção: application.
- Atividades: video-laser-segue-a-nave, ponte-laser-segue-a-nave.
- Estúdio: projeto.
- Conclusão: video-laser-segue-a-nave.
- Crie um tiro na posição lateral da nave quando apertar Espaço durante a partida.
- Conserve a abertura, os grupos vazios e as velocidades desta etapa.
- Antes de Enter não dispare; depois, cada aperto de Espaço cria um tiro.
- Conserve o movimento lateral preparado: espere Enter e respeite as bordas e a altura da nave.

## Parte 6. O laser segue para o fundo

Escolher a velocidade negativa em Z para o grupo de tiros.

- Intenção: application.
- Atividades: video-laser-em-profundidade, ponte-laser-em-profundidade.
- Estúdio: projeto.
- Conclusão: video-laser-em-profundidade.
- Crie um tiro na posição lateral da nave quando apertar Espaço durante a partida.
- Conserve a abertura, os grupos vazios e as velocidades desta etapa.
- Antes de Enter não dispare; depois, cada aperto de Espaço cria um tiro.
- Conserve o movimento lateral preparado: espere Enter e respeite as bordas e a altura da nave.

## Parte 7. O laser tem um fim de caminho

Retirar do grupo os lasers que ultrapassaram os limites de profundidade.

- Intenção: delivery.
- Atividades: video-fim-do-caminho-do-laser, ponte-fim-do-caminho-do-laser, projeto.
- Estúdio: projeto.
- Conclusão: video-fim-do-caminho-do-laser, projeto; envio atualizado.
- Crie um tiro na posição lateral da nave quando apertar Espaço durante a partida.
- Conserve a abertura, os grupos vazios e as velocidades desta etapa.
- Retire os tiros que saírem do intervalo de Z −36 a 3.
- Antes de Enter não dispare; depois, cada aperto de Espaço cria um tiro.
- Conserve o movimento lateral preparado: espere Enter e respeite as bordas e a altura da nave.
- Confira que o tiro criado sai do grupo ao terminar seu caminho.

[Roteiro completo](patrulha-espacial-aula-1.roteiro.md) · [Passo a passo](passo-a-passo.md).
