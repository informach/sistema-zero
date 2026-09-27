# Palpite do leitor de tela — design

## Objetivo

Fazer o palpite do leitor de tela explicar a situação que a criança realmente vai encontrar, mostrar o controle citado como um botão reconhecível e ainda manter a prévia segura antes da resposta.

## Problema observado

Na prévia, “Ouvir a tela” é mostrado como um cartão com ícone e texto. A criança não reconhece nele o mesmo botão que usará depois. Além disso, a pergunta diz que o leitor de tela fala *antes* de apertar o botão, embora a fala aconteça somente depois do toque.

## Decisão

- A pergunta passa a relacionar explicitamente o gesto e o resultado: ao apertar “Ouvir a tela” sem ter escrito uma descrição do jogo, o que será dito?
- A prévia continua uma observação, não uma bancada: o botão exibido é o próprio `SceneButton`, com o tom visual de gesto, mas fica nativamente desativado e não executa ação.
- A explicação “Você vai usar este botão depois do seu palpite.” fica logo abaixo do botão, em texto separado. Assim ela não parece ser um rótulo nem uma alternativa do quiz.
- O palco da prévia conserva `role="img"` e continua escondendo os controles reais internos. O botão explicativo fica fora dessa região visual para ser lido e semânticamente identificado como botão desativado.
- A auditoria das 45 previsões não altera as demais cenas: elas descrevem uma condição ou um gesto e perguntam pelo resultado. O leitor de tela era o único texto que declarava um efeito antes do gesto que o dispara.

## Jornada esperada

1. A criança ouve ou lê o contexto, vê a cena inicial e reconhece o botão “Ouvir a tela”.
2. O botão está visivelmente indisponível e a mensagem logo abaixo explica que será usado após o palpite.
3. A pergunta explica que a leitura ocorre ao apertar o botão sem descrição no jogo.
4. Depois de responder, a prévia some e a cena abre com o botão funcional igual ao que ela acabou de conhecer.

## Verificação

- A pergunta não usa “Antes de apertar” e cita o leitor de tela, o botão e a situação sem descrição.
- A prévia contém um `button` nativamente `disabled`, com nome “Ouvir a tela”, e o aviso abaixo dele.
- Não há caminho de clique no botão da prévia.
- O botão ativo da cena só aparece após o palpite.
- Testes compartilhados cobrem estrutura, semântica e a jornada no app Kids.
