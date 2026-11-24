# Acertar no espaço

Base do Construtor · Patrulha Espacial · 3D.

**Entrada:** Tiros e asteroides percorrem a rota e saem dos grupos ao passar dos limites. Ainda não há resposta ao contato nem contador de pontos.

**Conquista:** Um contato real retira o par envolvido, consome o alvo uma única vez e soma um ponto. O placar começa em zero e mostra cada acerto.

## Parte 1. Parecer junto ou encostar?

Distinguir sobreposição da imagem e contato real entre objetos em três dimensões.

- Intenção: exploration.
- Atividades: video-encontro-no-espaco, ponte-encontro-no-espaco, experiencia-encontro-no-espaco.
- Estúdio: não.
- Conclusão: video-encontro-no-espaco, experiencia-encontro-no-espaco.


## Parte 2. Um encontro que acerta

Responder ao contato entre um tiro e um asteroide, retirando os dois e consumindo o alvo.

- Intenção: application.
- Atividades: video-acerto-do-laser, ponte-acerto-do-laser.
- Estúdio: projeto.
- Conclusão: video-acerto-do-laser.
- Crie um tiro na posição lateral da nave quando apertar Espaço durante a partida.
- Conserve a abertura, os grupos vazios e as velocidades desta etapa.
- Retire tiros e asteroides quando saírem dos limites de profundidade.
- Crie asteroides a cada 1,5 segundo, na faixa fornecida e somente durante a partida.
- Use a receita fornecida no X da cópia de asteroide, dentro do relógio.
- Confira o contato dentro do par de grupos e da pergunta alvoAtivo já preparada.
- Ao encostar, retire só o tiro e o asteroide envolvidos e marque o alvo como consumido.
- Antes de Enter não dispare; depois, cada aperto de Espaço cria um tiro.
- Conserve o movimento lateral preparado: espere Enter e respeite as bordas e a altura da nave.
- Confira que o tiro criado sai do grupo ao terminar seu caminho.
- Espere na abertura sem asteroides; depois de Enter, confira o surgimento.

## Parte 3. Um lugar para guardar os pontos

Criar o contador pontos com valor zero no início de cada jogo.

- Intenção: application.
- Atividades: video-contador-da-patrulha, ponte-contador-da-patrulha.
- Estúdio: projeto.
- Conclusão: video-contador-da-patrulha.
- Crie um tiro na posição lateral da nave quando apertar Espaço durante a partida.
- Comece na abertura, com grupos vazios, contador zero e as velocidades já construídas.
- Retire tiros e asteroides quando saírem dos limites de profundidade.
- Crie asteroides a cada 1,5 segundo, na faixa fornecida e somente durante a partida.
- Use a receita fornecida no X da cópia de asteroide, dentro do relógio.
- Confira o contato dentro do par de grupos e da pergunta alvoAtivo já preparada.
- Ao encostar, retire só o tiro e o asteroide envolvidos e marque o alvo como consumido.
- Crie pontos com valor zero em Ao iniciar.
- Antes de Enter não dispare; depois, cada aperto de Espaço cria um tiro.
- Conserve o movimento lateral preparado: espere Enter e respeite as bordas e a altura da nave.
- Confira que o tiro criado sai do grupo ao terminar seu caminho.
- Espere na abertura sem asteroides; depois de Enter, confira o surgimento.

## Parte 4. Cada acerto soma um

Somar um ponto dentro da mesma resposta que consome o par acertado.

- Intenção: application.
- Atividades: video-um-ponto-por-acerto, ponte-um-ponto-por-acerto.
- Estúdio: projeto.
- Conclusão: video-um-ponto-por-acerto.
- Crie um tiro na posição lateral da nave quando apertar Espaço durante a partida.
- Comece na abertura, com grupos vazios, contador zero e as velocidades já construídas.
- Retire tiros e asteroides quando saírem dos limites de profundidade.
- Crie asteroides a cada 1,5 segundo, na faixa fornecida e somente durante a partida.
- Use a receita fornecida no X da cópia de asteroide, dentro do relógio.
- Confira o contato dentro do par de grupos e da pergunta alvoAtivo já preparada.
- Some um ponto no acerto que retira o tiro e consome o asteroide.
- Crie pontos com valor zero em Ao iniciar.
- Antes de Enter não dispare; depois, cada aperto de Espaço cria um tiro.
- Conserve o movimento lateral preparado: espere Enter e respeite as bordas e a altura da nave.
- Confira que o tiro criado sai do grupo ao terminar seu caminho.
- Espere na abertura sem asteroides; depois de Enter, confira o surgimento.

## Parte 5. Veja a contagem na tela

Mostrar o zero inicial e atualizar o placar com a variável pontos em cada acerto.

- Intenção: delivery.
- Atividades: video-placar-da-patrulha, ponte-placar-da-patrulha, projeto.
- Estúdio: projeto.
- Conclusão: video-placar-da-patrulha, projeto; envio atualizado.
- Crie um tiro na posição lateral da nave quando apertar Espaço durante a partida.
- Comece na abertura, com grupos vazios, contador zero e as velocidades já construídas.
- Retire tiros e asteroides quando saírem dos limites de profundidade.
- Crie asteroides a cada 1,5 segundo, na faixa fornecida e somente durante a partida.
- Use a receita fornecida no X da cópia de asteroide, dentro do relógio.
- Confira o contato dentro do par de grupos e da pergunta alvoAtivo já preparada.
- No acerto, retire o par, consuma o alvo e atualize pontos e placar uma única vez.
- Crie pontos com valor zero em Ao iniciar.
- Mostre Acertos: 0 / 20 em cima, à direita, no começo.
- Antes de Enter não dispare; depois, cada aperto de Espaço cria um tiro.
- Conserve o movimento lateral preparado: espere Enter e respeite as bordas e a altura da nave.
- Confira que o tiro criado sai do grupo ao terminar seu caminho.
- Espere na abertura sem asteroides; depois de Enter, confira o surgimento.

## Parte 6. O que faz o ponto valer?

Explicar as regras usando os testes do próprio jogo.

- Intenção: closing.
- Atividades: ponte-conferir-acertos, quiz-conferir-acertos.
- Estúdio: não.
- Conclusão: quiz-conferir-acertos.


[Roteiro completo](patrulha-espacial-aula-3.roteiro.md) · [Passo a passo](passo-a-passo.md).
