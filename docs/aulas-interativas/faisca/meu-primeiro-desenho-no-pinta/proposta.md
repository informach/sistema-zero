# Meu primeiro desenho no Pinta: proposta do extra do Faísca

29/10/2026 · **Proposta aprovada** (design da vaga de arte,
[`docs/plans/2026-10-29-desenho-da-crianca-no-jogo-design.md`](../../../plans/2026-10-29-desenho-da-crianca-no-jogo-design.md)).
Define a autoria; não declara mídia produzida nem publicação realizada.

## 1. O que é

Um extra curto do Faísca, depois do par do posto: a criança desenha a chave do seu jogo da Chave do
Farol no Pinta e a coloca no jogo. No Faísca ela ainda não tem o Pinta Completo nem o Estúdio
Completo, então tudo acontece nos blocos da aula: um bloco de Pinta para o desenho e um bloco de
Estúdio com o jogo pronto. O desenho chega sozinho aos materiais do jogo pela **vaga de arte**
`minha-chave` (nada de baixar e reenviar arquivo).

Fonte no currículo ([`creator-journey-curriculum.json`](../../../../packages/members/src/infrastructure/config/creator-journey-curriculum.json),
extras do Faísca): "Criar uma imagem e usá-la no próprio Farol. É uma exploração de ferramenta, não
um Poder de lógica." Extra opcional: não conta para subir de posto.

## 2. Quem chega e o que vem pronto

- **Já sabe:** jogar e programar a Chave do Farol (andar, recolher a chave, guardar `temChave`,
  acender o farol com Se e senão) e trocar a imagem de um sprite pelo campo do bloco (a parte de
  personalizar do Farol).
- **Vem pronto:** o jogo da Chave do Farol concluído, no Estúdio da aula, e o quadro vazio do Pinta
  (vetor, quadrado de 64, com o nome `minha-chave`).
- **Constrói:** um desenho próprio da chave, com formas, e a troca da imagem da chave no jogo.

## 3. A aula: A minha chave no Farol

Uma aula, quatro partes:

1. **Uma chave desenhada por você** (apresentação): o jogo pronto com uma chave desenhada no lugar
   da dourada; a criança joga.
2. **O seu Passo a passo do projeto** (material).
3. **Desenhe a sua chave** (entrega do desenho): o bloco de Pinta. O vídeo ensina as ferramentas
   que o bloco libera e desenha junto, um gesto por vez: Preenchimento e Contorno, a argola com
   **Círculo**, a haste e os dois dentes com **Retângulo**, arrumar com **Selecionar** e um brilho
   com **Pincel**. A parte só termina com o desenho enviado (**Enviar meu desenho** → **Enviar** →
   **Desenho enviado!**) e em dia.
4. **A sua chave no jogo** (fechamento): o bloco de Estúdio com o jogo pronto. A criança vê o
   desenho em menu ⋯ › Imagens (selo **Seu desenho da aula**), troca em **Ao iniciar** a imagem do
   bloco **Criar sprite chave** de `chave-dourada` para `minha-chave`, testa, verifica e envia.

**Por que a entrega do desenho fica numa parte de Entrega e o jogo no Fechamento:** a régua das
entregas da plataforma só aceita a entrega de um Estúdio ou Pinta na parte de Entrega (seguida só
do Fechamento) ou no Fechamento. Com o desenho na Entrega, a criança envia ANTES de abrir o jogo, e
a vaga chega preenchida. O desenho vem antes do jogo também na ordem do curso, como a conferência
das vagas exige.

## 4. Experiência, quiz e conceitos

**Sem experiência e sem quiz.** Não há conceito novo de lógica: desenhar formas e trocar a imagem
de um sprite são operação de ferramenta (DIRETRIZES, seção 2: "Operação de interface não é
conceito e não ganha cena"), e o quiz retoma raciocínio já ensinado, que aqui não existe. A única
ideia que o vídeo explica é que **trocar a imagem muda só a aparência**: o nome do sprite continua
`chave`, e as regras programadas continuam valendo.

## 5. Ferramentas e paletas

- **Pinta** (bloco da aula, vetor): `select`, `ellipse`, `rect`, `brush` e `fit` (Ajustar, o
  caminho de volta de quem aproximou demais). Os quadradinhos de Preenchimento e Contorno e o painel
  Cores aparecem sempre. Sem molde por baixo do desenho (decisão da dona: confundiria; o vídeo
  ensina a desenhar).
- **Estúdio** (bloco da aula): só blocos, nível `iniciante-2d`, paleta = os blocos do jogo da Chave
  do Farol (Programação e Jogo 2D), sem Ponte nem código. Sem `chain`: o jogo pronto é o ponto de
  partida, não a entrega do curso do Farol.

## 6. Critérios de conclusão

- **Desenhe a sua chave:** vídeo, entrega do desenho e envio em dia.
- **A sua chave no jogo:** vídeo, entrega do projeto e envio em dia, e dois objetivos:
  - montagem: em Ao iniciar, o bloco Criar sprite chave usa a imagem `minha-chave`;
  - execução: a chave começa com o desenho (`chave.imageName` antes da primeira ida) e continua
    sendo recolhida (`temChave` verdadeiro depois de chegar até ela). Provado no executor real
    (`qa/meu-desenho-browser.ts`): o gabarito passa e o jogo sem a troca reprova.
- O jogo inicial não cumpre a montagem; o gabarito (com uma chave rosa de exemplo nos materiais)
  cumpre.

## 7. Fora do escopo

Desenhar o farol (duas imagens, apagado e aceso), desenho em 3D, molde por baixo do desenho e levar
o desenho para o Estúdio Completo ou para "Meus desenhos" (é do Pinta Completo).

[Posto Faísca](../README.md) · [Regras da jornada](../../../jornada-do-criador.md)
