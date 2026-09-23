# Roteiro de gravação · Desafio do Primeiro Jogo · Dia 1 · A nave ganha vida

## Especificações

- **Formato:** gravação da tela do Estúdio com narração por cima. Os clipes de gesto mostram a
  paleta abrindo gaveta por gaveta, e os de conceito não têm gesto nenhum.
- **Duração:** 12 clipes, de 8min05s a 10min05s somados. Com as experiências, montagens, quiz e
  envio, a aula completa deve ficar entre **15 e 25 minutos**. A narração final deve ser conferida
  a **137 palavras por minuto**, que é o ritmo real medido em gravação.
- **Calibração:** esta é a primeira aula de Estúdio da vida de quem assiste, e nada pode ser
  pressuposto. Ela já traz da introdução, e só isso: o caminho até a aula, as três ações de testar,
  o gesto de confirmar um campo saindo dele, as etiquetas de salvamento e o jeito de pedir ajuda.
  Do Estúdio ela não traz nada. É novo de verdade: a paleta e as gavetas, as áreas do projeto, o x
  e o y, o sprite, o quadro, o motor, a limpeza antes do desenho e a ordem de desenho.
- **Conceitos nomeados:** **áreas do projeto**, **Ao iniciar**, **Enquanto estiver rodando**,
  **sprite**, **quadro**, **motor**, **camadas** (dita como ordem de desenho).
- **Dor desta aula:** ela preenche o **Criar nave** inteiro, com nome, posição, tamanho e cores, e
  a nave não aparece na tela. Essa dor reproduz sempre, com todo mundo, porque o bloco que desenha
  só entra quatro seções depois. É dor de verdade e o clipe não a esconde, nem diz que houve erro.
- **Vitória do dia:** a nave dela aparece num espaço com estrelas e obedece às setas, sem sair da
  tela e sem deixar rastro.
- **Valores:**
  - **Saem daqui como canônicos:** tela 800 por 480 · sprite chamado `nave` · x 400, y 410 ·
    largura 54, altura 62 · estrelas com velocidade 1 · setas com velocidade 7.
  - **Padrões de fábrica que ficam:** a velocidade 1 do fundo de estrelas já vem escrita, e a fala
    diz para deixar assim.
  - **Padrões de fábrica que mudam:** o nome do sprite no **Mover o sprite com as setas** e no
    **Manter o sprite dentro da tela** vem de fábrica com outro nome, e os dois são trocados para
    `nave`.
- **Campos livres:** a cor do fundo do jogo, a cor do corpo e a cor das asas da nave. Nenhuma aula
  posterior cita essas cores como fato.
- **Nota de produção:**
  - **Correção obrigatória, e ela é de conteúdo.** A gravação de 2026 diz que o x 400 centraliza a
    nave. Está errado: **x 400 é o canto esquerdo de uma caixa de largura 54, e o centro dela cai
    em 427**. O `video-coordenadas` não fala em centralizar, e diz que a marca do x e do y fica no
    canto de cima à esquerda da caixa.
  - **O bloco se chama `Desenhar o sprite`**, e não "Desenhar o sprite por último". O "por último"
    é a posição dele no motor, que é o conceito, e não o nome da peça. Nada nesta aula pode afirmar
    que ele é para sempre o último bloco do motor, porque o Dia 2 encaixa três blocos depois dele.
  - Zoom obrigatório em: os campos de largura e altura do **Preparar o jogo em tela cheia**; o
    ícone de alerta aberto, com a mensagem em português; o clique num espaço vazio fora do bloco,
    toda vez que ele aparecer; e a pilha inteira do motor no `video-desenhar-por-ultimo`.
  - O `video-livrinho` é a única imagem fora do Estúdio: um livrinho de folhear de verdade, filmado
    em cima da mesa.
  - Em nenhum clipe a fala diz onde a ferramenta fica na tela. A ferramenta muda de lugar conforme
    a largura, e posição dentro do Estúdio pode ser dita ("na coluna da esquerda, onde ficam os
    bloquinhos"), posição da ferramenta na página não.
- **O que NÃO entra, e por quê:**
  - **A enumeração dos seis passos**, que abria a gravação de 2026. O redesenho tem treze seções e a
    lista viraria um cartório. A abertura diz o que vai estar na tela no fim do dia, e emenda.
  - **Explicação conceitual dentro de clipe de gesto.** Uma vez contra sempre, para onde o y cresce,
    criar contra mostrar, quadros e camadas têm clipes conceituais próprios. Os clipes de montagem
    não repetem essas ideias.
  - **"as estrelas iam tampar ela"**, do fecho do quinto passo. No lugar entra "o que é desenhado
    depois pode cobrir o que veio antes", que é a regra e serve para o resto do curso.
  - **O convite a brincar com a velocidade 7 e trocar por 12.** A velocidade 7 é canônica e o Dia 2
    conta com ela.
  - **A instrução de mandar rodar o jogo, e qualquer botão de play.** Nenhum dos dois existe. As
    três ações de testar vêm da introdução, e esta aula usa sem reensinar.

---

## Seção 1. O que a gente vai fazer hoje

### Clipe `video-abertura` · A sua nave no espaço
**Duração alvo:** 25 a 35 segundos · **Palavras:** 57

**Na tela:** o jogo do fim do Dia 1 rodando, ocupando o quadro inteiro, sem nenhuma parte do
Estúdio à vista: a nave num espaço cheio de estrelas, indo para a esquerda e para a direita com as
setas.

**Narração:**
> "Oi. Olha o que vai estar na sua tela no fim da aula de hoje: a sua nave, num espaço cheio de
> estrelas, obedecendo às setas."

**Na tela:** o jogo continua rodando, com a nave indo até uma das beiradas e parando nela.

**Narração:**
> "E repara que ela não some pela beirada. Hoje a gente vai preparar o jogo, descobrir onde a nave
> fica na tela, e montar um pedacinho de cada vez. Vem comigo."

---

## Seção 2. O que acontece uma vez e o que acontece sempre

### Clipe `video-duas-areas` · A mesma ação em dois momentos
**Duração alvo:** 40 a 50 segundos · **Palavras:** 86

**Na tela:** uma linha do tempo curta com o começo do jogo e três passos. A ficha **Mover a nave um
pouquinho** está em **Ao iniciar**. No começo, a nave anda uma casa; nos passos 1, 2 e 3, ela fica
parada. O HUD mostra Passo e Movimentos.

**Narração:**
> "Ao iniciar é o comecinho do jogo. O que estiver aqui acontece uma vez e pronto. Veja: a nave
> ganha um empurrão no começo. Depois, os passos passam, mas ela não ganha outro. É como dar o
> primeiro empurrão para a brincadeira começar."

**Na tela:** voltar a linha do tempo ao começo. A mesma ficha passa para **Enquanto estiver rodando**.
Nos passos 1, 2 e 3, a nave anda outra casa a cada passo; o HUD acompanha os movimentos.

**Narração:**
> "Enquanto estiver rodando continua trabalhando a cada passo. Agora a nave ganha outro empurrão
> em cada passo. Por isso ela vai cada vez mais longe de onde começou. A mesma ação muda porque
> está em outro lugar."

**Na tela:** os dois testes lado a lado: uma casa no começo e uma casa em cada passo.

**Narração:**
> "Agora você vai testar essa diferença."

---

## Seção 3. Monte as áreas e prepare a tela

### Clipe `video-montar-areas-tela` · As áreas do projeto e a tela do jogo
**Duração alvo:** 50 a 60 segundos · **Palavras:** 130

**Na tela:** a categoria **Áreas do projeto** aberta na coluna dos bloquinhos. Arrastar **Ao
iniciar** para a área do meio e soltar.

**Narração:**
> "Na categoria **Áreas do projeto**, pega o bloco **Ao iniciar**. Arrasta para o meio e solta."

**Na tela:** voltar à mesma categoria e arrastar **Enquanto estiver rodando**, soltando ao lado do
Ao iniciar, com um espaço visível entre os dois.

**Narração:**
> "Na mesma categoria, pega **Enquanto estiver rodando** e solta ao lado, com um espacinho."

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Jogo e telas**, e dentro dela a seção
**Preparar a área do jogo**. Arrastar **Preparar o jogo em tela cheia** para dentro do Ao iniciar,
com o clique de encaixe à vista.

**Narração:**
> "Agora abre **Jogo 2D**, **Jogo e telas** e **Preparar a área do jogo**. Pega **Preparar o jogo em
> tela cheia** e encaixa no **Ao iniciar**."

**Na tela:** aproximar nos campos de largura e altura do bloco. Os campos já mostram 800 e 480.
Não apagar nem redigitar. Marcar com uma seta horizontal a largura e com uma seta vertical a altura.

**Narração:**
> "Esse bloco já vem com os dois números de que a gente precisa. A largura é 800: ela mede a área
> do jogo de um lado ao outro. A altura é 480: ela mede de cima até embaixo. Hoje é só conferir os
> dois e deixar como estão."

**Na tela:** clicar no quadradinho de cor do fim do bloco e escolher um tom escuro. A área do jogo
aparecendo com o fundo escolhido.

**Narração:**
> "No fim do bloco tem um quadradinho de cor, que é o fundo do jogo. Escolhe um escuro, para
> enxergar bem a nave e as estrelas depois."

---

## Seção 4. Onde a nave fica na tela

### Clipe `video-coordenadas` · O endereço da nave na tela
**Duração alvo:** 30 a 40 segundos · **Palavras:** 75

**Na tela:** a tela do jogo de 800 por 480, com uma marca no canto de cima, à esquerda, escrita
x 0, y 0.

**Narração:**
> "O x e o y são o endereço da nave na tela, é como dizer onde ela mora. O zero dos dois fica no
> canto de cima, à esquerda."

**Na tela:** uma seta saindo do zero para a direita, com o x crescendo. Depois outra seta saindo do
zero para baixo, com o y crescendo.

**Narração:**
> "O x cresce para a direita. E o y cresce para baixo, que é a parte que pega todo mundo de
> surpresa."

**Na tela:** a caixa da nave desenhada na tela, com a marca do x e do y presa no canto de cima, à
esquerda da caixa.

**Narração:**
> "E a marca do x e do y fica no canto de cima, à esquerda da caixa da nave. Não é no meio dela."

> **Correção obrigatória.** Nada neste clipe diz que o x 400 centraliza a nave. Ele é o canto
> esquerdo de uma caixa de largura 54, e o centro dela cai em 427.

---

## Seção 5. Crie a sua nave

### Clipe `video-criar-nave` · A nave com as suas cores
**Duração alvo:** 45 a 55 segundos · **Palavras:** 122

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Kits prontos**, e dentro dela a seção
**Espaço**. Arrastar **Criar nave** para dentro do Ao iniciar, logo abaixo do Preparar o jogo em
tela cheia.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Kits prontos**, e dentro dela **Espaço**. Pega o bloco **Criar
> nave**. Encaixa dentro do **Ao iniciar**, logo abaixo do **Preparar o jogo em tela cheia**."

**Na tela:** aproximar no campo do nome. Apagar o que vem de fábrica, escrever nave e clicar num
espaço vazio fora do bloco.

**Narração:**
> "O primeiro campo é o nome. Escreve **nave**, tudo minúsculo, e clica fora."

**Na tela:** preencher x 400 e y 410, um de cada vez, clicando fora depois de cada um.

**Narração:**
> "No x escreve 400. No y escreve 410, que põe ela perto da beirada de baixo da tela."

**Na tela:** preencher largura 54 e altura 62, clicando fora depois de cada um.

**Narração:**
> "Na largura escreve 54, e na altura 62. Esse é o tamanho dela."

**Na tela:** clicar nos dois quadradinhos de cor do bloco, o do corpo e o das asas, escolhendo uma
cor em cada.

**Narração:**
> "E agora a parte boa. Esse bloco deixa você escolher a cor do corpo e a cor das asas. Capricha, que
> essa nave vai ser só sua!"

**Na tela:** a área do jogo, com o fundo escuro e nenhuma nave à vista. Segurar o enquadramento
alguns segundos.

**Narração:**
> "Pronto. E repara na tela do jogo: a nave ainda não está lá. Guarda essa pergunta, que a gente
> resolve agora."

> **Nota de produção.** Manter a surpresa. O clipe não diz que houve erro, não corrige nada e não
> antecipa a resposta.

---

## Seção 6. Criar e mostrar são duas coisas diferentes

### Clipe `video-criar-e-mostrar` · Criar não é mostrar
**Duração alvo:** 35 a 45 segundos · **Palavras:** 90

**Na tela:** dividir o enquadramento entre **Bastidores** e **Tela do jogo**, ambos vazios. Criar a
nave apenas nos bastidores, com a tela ainda vazia.

**Narração:**
> "O bloco Criar nave preparou um objeto nos bastidores. A nave já tem nome, posição, tamanho e
> cores. Ela existe no jogo, mesmo sem aparecer na tela."

**Na tela:** destacar a ficha da nave guardada nos bastidores e manter a tela vazia ao lado.

**Narração:**
> "É como preparar uma peça antes de colocá-la no palco. Preparar a peça e mostrar a peça são duas
> ações diferentes."

**Na tela:** acrescentar a ação de desenhar. A mesma nave aparece na tela do jogo.

**Narração:**
> "A tela só mostra o que o jogo manda desenhar. Quando chega a ordem de desenhar a nave, ela sai
> dos bastidores e aparece para o jogador."

**Na tela:** congelar com a nave visível nos dois lados: ficha nos bastidores e desenho na tela.

**Narração:**
> "Então guarda esta diferença: criar prepara o objeto; desenhar mostra esse objeto na tela."

---

## Seção 7. O que é um quadro

### Clipe `video-livrinho` · O livrinho de folhear
**Duração alvo:** 35 a 45 segundos · **Palavras:** 95

**Na tela:** um livrinho de folhear de verdade, em cima da mesa, com uma página aberta por vez,
mostrando que cada desenho é um pouquinho diferente do anterior.

**Narração:**
> "Você já viu aqueles livrinhos de folhear? Cada página é um desenho um pouquinho diferente da
> página de antes."

**Na tela:** o mesmo livrinho sendo folheado rápido, com o bonequinho parecendo se mexer.

**Narração:**
> "E quando as páginas passam rápido, o seu olho enxerga movimento. Um jogo funciona igualzinho a
> isso."

**Na tela:** congelar numa página só, com um rótulo curto aparecendo por cima dela.

**Narração:**
> "Cada página dessas tem um nome: **quadro**. O jogo desenha um quadro, depois outro, depois outro,
> muito rápido, e é isso que faz tudo parecer que se mexe."

**Na tela:** o livrinho e a tela do jogo lado a lado, os dois em movimento, com um contador de
quadros subindo ao lado do jogo.

**Narração:**
> "O seu jogo faz a mesma coisa, e faz muito rápido, várias vezes por segundo. Quando alguma coisa se
> mexe na tela, é porque um quadro novo acabou de ser desenhado."

---

## Seção 8. Ligue o motor e desenhe o espaço

### Clipe `video-motor-e-fundo` · A lousa mágica e o espaço com estrelas
**Duração alvo:** 60 a 70 segundos · **Palavras:** 159

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Tempo**, e dentro dela a seção
**Quadros e intervalos**. Arrastar **A cada quadro do jogo** para dentro do Enquanto estiver
rodando, que está vazio.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Tempo**, e dentro dela **Quadros e intervalos**. Pega o bloco **A
> cada quadro do jogo**. Encaixa dentro do **Enquanto estiver rodando**, que ainda está vazio, no
> primeiro lugar."

**Na tela:** aproximar no espaço aberto que existe dentro do bloco A cada quadro do jogo.

**Narração:**
> "Repara no espaço aberto dentro dele. Tudo o que entrar aí acontece de novo e de novo, a cada
> quadro."

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Desenho e efeitos**, e dentro dela a
seção **Efeitos**. Arrastar **Limpar a tela** para dentro do A cada quadro do jogo.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Desenho e efeitos**, e dentro dela **Efeitos**. Pega o bloco
> **Limpar a tela**, e encaixa dentro do **A cada quadro do jogo**, no primeiro lugar."

**Na tela:** enquadrar o Limpar a tela já encaixado dentro do motor.

**Narração:**
> "Esse é a borracha. Sabe aquelas lousas mágicas? Toda vez que a gente quer desenhar de novo, apaga
> o que estava lá."

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Cenários**, e dentro dela a seção
**Fundos**. Arrastar **Desenhar fundo de estrelas** para dentro do A cada quadro do jogo, logo
abaixo do Limpar a tela.

**Narração:**
> "Agora, na categoria **Jogo 2D**, abre **Cenários**, e dentro dela **Fundos**. Pega o **Desenhar
> fundo de estrelas**, e encaixa logo abaixo do **Limpar a tela**."

**Na tela:** aproximar no campo de velocidade do bloco, com o número 1 já escrito de fábrica.

**Narração:**
> "A velocidade dele já vem 1, deixa assim. Bem suave, como se a nave estivesse viajando pelo
> espaço."

**Na tela:** a área do jogo, com o espaço estrelado descendo devagar. Enquadrar a pilha do motor,
com a borracha em cima e o fundo logo abaixo.

**Narração:**
> "E olha a ordem: a borracha vem antes do desenho novo."

---

## Seção 9. A nave obedece a você

### Clipe `video-setas-e-borda` · As setas e a borda da tela
**Duração alvo:** 55 a 65 segundos · **Palavras:** 147

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Movimento**, e dentro dela a seção
**Movimentos prontos**. Arrastar **Mover o sprite com as setas** para dentro do A cada quadro do
jogo, logo abaixo do Desenhar fundo de estrelas.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Movimento**, e dentro dela **Movimentos prontos**. Pega o **Mover
> o sprite com as setas**, e encaixa logo abaixo do **Desenhar fundo de estrelas**."

**Na tela:** aproximar no nome de fábrica escrito dentro do bloco, sem mexer nele ainda, e depois
na nave já criada, na tela do jogo.

**Narração:**
> "**Sprite** é uma palavra nova, e é o nome de um objeto do jogo. A sua nave é um sprite."

**Na tela:** clicar no nome de fábrica e trocar para nave. Enquadrar o ícone de alerta que aparece
enquanto o nome está errado, aberto, com a mensagem em português, e depois o alerta sumindo.

**Narração:**
> "Esse bloco vem com um nome de fábrica: clica nele e troca para **nave**. Se aparecer um aviso, ele
> não é bronca, é um ajudante: clica nele e ele diz o que arrumar."

**Na tela:** aproximar no campo de velocidade e escrever 7. Clicar num espaço vazio fora do bloco.

**Narração:**
> "A velocidade dele é 7. Escreve o 7 e clica fora."

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Movimento**, e dentro dela a seção
**Bordas e rebatidas**. Arrastar **Manter o sprite dentro da tela** para dentro do A cada quadro do
jogo, logo abaixo do Mover o sprite com as setas.

**Narração:**
> "Agora, na categoria **Jogo 2D**, abre **Movimento** de novo, e dentro dela **Bordas e rebatidas**.
> Pega o **Manter o sprite dentro da tela**, e encaixa logo abaixo do **Mover o sprite com as
> setas**."

**Na tela:** trocar o nome de fábrica desse bloco para nave também, com o alerta sumindo.

**Narração:**
> "Esse também vem com nome de fábrica: troca para **nave**. Ele é a cerquinha: sem ele, a nave sumia
> pela beirada."

---

## Seção 10. Desenhe a nave no fim do motor

### Clipe `video-desenhar-por-ultimo` · A nave no fim do motor
**Duração alvo:** 35 a 45 segundos · **Palavras:** 85

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Sprites**, e dentro dela a seção
**Criar e trocar aparência**. Arrastar **Desenhar o sprite** para dentro do A cada quadro do jogo,
logo abaixo do Manter o sprite dentro da tela.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Sprites**, e dentro dela **Criar e trocar aparência**. Pega o
> bloco **Desenhar o sprite**, e encaixa logo abaixo do **Manter o sprite dentro da tela**."

**Na tela:** abrir o menu do bloco e escolher nave.

**Narração:**
> "Abre o menu dele e escolhe **nave**. Esse é o bloco que finalmente mostra a nave."

**Na tela:** enquadrar a pilha inteira do motor, de cima para baixo: Limpar a tela, Desenhar fundo
de estrelas, Mover o sprite com as setas, Manter o sprite dentro da tela, Desenhar o sprite.

**Narração:**
> "A ordem do motor ficou assim: limpar, estrelas, mover, manter dentro da tela, desenhar a nave. O
> que é desenhado depois pode cobrir o que veio antes, e por isso a nave vem no fim."

**Na tela:** a área do jogo, com a nave aparecendo na frente do espaço estrelado.

**Narração:**
> "E aí está ela!"

> **Nota de rótulo.** O bloco se chama **Desenhar o sprite**. "Por último" é onde ele fica no
> motor, e não o nome dele. A fala não promete que ele é para sempre o último bloco, porque o Dia 2
> encaixa três blocos depois deste.

---

## Seção 11. Quem é desenhado depois fica por cima

### Clipe `video-camadas` · Quem é desenhado depois fica na frente
**Duração alvo:** 30 a 40 segundos · **Palavras:** 80

**Na tela:** duas folhas coloridas sobre a mesa. Colocar a folha azul e depois a amarela por cima.

**Narração:**
> "Quando dois desenhos ocupam o mesmo lugar, a ordem decide quem fica na frente. A folha que chega
> depois cobre uma parte da que já estava ali."

**Na tela:** inverter as folhas, sem retirar nenhuma delas.

**Narração:**
> "Se eu troco a ordem, a outra aparece na frente. Nenhuma folha sumiu; só a pilha mudou."

**Na tela:** mostrar a nave e o fundo de estrelas em duas ordens, primeiro com a nave coberta e
depois com a nave visível.

**Narração:**
> "A tela do jogo funciona do mesmo jeito. O que é desenhado depois fica por cima e pode cobrir o
> que veio antes."

**Na tela:** congelar na ordem correta, fundo primeiro e nave depois.

**Narração:**
> "Por isso o fundo entra antes e a nave é desenhada depois dele."

---

## Seção 13. Teste, envie e feche

### Clipe `video-teste-e-envio` · A nave nas duas bordas e o envio
**Duração alvo:** 45 a 55 segundos · **Palavras:** 103

**Na tela:** aproximar no campo de velocidade do Mover o sprite com as setas. Digitar o número e
segurar o enquadramento no clique num espaço vazio da área dos bloquinhos, fora do bloco.

**Narração:**
> "Antes de testar, o gesto de sempre: escreveu um número, clica num espaço vazio fora do bloco, que
> é o que confirma."

**Na tela:** o ponteiro clicando dentro da área do jogo.

**Narração:**
> "E clica dentro da área do jogo, que passa o teclado para ele."

**Na tela:** a seta para a esquerda segurada até a nave encostar na beirada esquerda e parar ali.

**Narração:**
> "Segura a seta para a esquerda. A nave anda, chega na beirada e para."

**Na tela:** a seta para a direita segurada até a nave encostar na beirada direita e parar ali.

**Narração:**
> "Agora a seta para a direita, até a outra beirada. Para de novo."

**Na tela:** a tela do jogo inteira, com a nave se movendo na frente do espaço com estrelas, sem
nenhum rastro atrás dela.

**Narração:**
> "Confere comigo: anda para os dois lados, não passa das beiradas, fica na frente do espaço, e não
> deixa rastro."

**Na tela:** a barra do Estúdio com a etiqueta **Salvo**. Depois o botão **Enviar para
o professor** sendo apertado, com a confirmação.

**Narração:**
> "Espera aparecer **Salvo** e aperta o **Enviar para o professor**."

**Na tela:** manter a confirmação do envio visível por um instante.

**Narração:**
> "Pronto. Esse é o caminho do teste final até a entrega."

> **Nota de produção.** Nenhuma montagem de bloco neste clipe: ele é teste e envio. Se ficar
> um rastro de naves na tela, o **Limpar a tela** não está antes do **Desenhar fundo de estrelas**,
> e a gravação deve deixar esse sintoma reconhecível. A fala do Zappy abaixo do vídeo convida a
> criança a fazer a conferência no próprio projeto; o clipe não celebra antes dessa ação real.
