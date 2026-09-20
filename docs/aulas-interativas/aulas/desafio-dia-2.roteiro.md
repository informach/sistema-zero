# Roteiro de gravação · Desafio do Primeiro Jogo · Dia 2 · A nave atira

## Especificações

- **Formato:** gravação da tela do Estúdio com narração por cima. Os clipes de gesto mostram a
  paleta abrindo gaveta por gaveta, e os de conceito não têm gesto nenhum.
- **Duração:** 8 clipes, de 5min35s a 6min55s somados, narração pura de **873 palavras** a
  **137 palavras por minuto**, que é o ritmo real medido em gravação, o que dá **6min22s** de fala.
- **Calibração:** o projeto entra exatamente como o Dia 1 entrega. Duas áreas montadas, tela 800
  por 480, sprite `nave` em x 400, y 410, tamanho 54 por 62, e o motor com limpar, estrelas
  velocidade 1, mover com as setas velocidade 7, manter dentro da tela e desenhar a nave. As três
  ações de testar e o gesto de confirmar um campo vêm da introdução e não são reensinados. É novo
  de verdade: a terceira área, o grupo, o bloco de leitura arrastado por cima de um número escrito,
  o sinal da velocidade e a faxina.
- **Conceitos nomeados:** **Quando acontecer**, **evento**, **grupo**, **faxina**. E dois que
  voltam do Dia 1 sem serem reensinados: **quadro** e a ordem de desenho.
- **Dor desta aula:** ela dispara cinco vezes, os tiros somem lá em cima, e nada na tela diz que
  eles continuam guardados no grupo. Essa dor **não reproduz na tela**, e é por isso que ela é
  mostrada na experiência da seção 9 e não encenada aqui. Nenhum clipe promete que o jogo fica
  pesado e lento: neste jogo nasce um tiro por aperto e isso não acontece.
- **Vitória do dia:** ela aperta a barra de espaço e sai um tiro da nave, com som, que sobe e some
  lá em cima, de onde quer que a nave esteja.
- **Valores:**
  - **Saem daqui como canônicos:** grupo chamado `tiros` · raio 5 · vx 0 · vy menos 9 · efeito de
    som `tiro` · a ordem do motor: limpar, estrelas, mover a nave com as setas, manter dentro da
    tela, desenhar a nave, mover o grupo tiros, tirar do grupo quem saiu, desenhar o grupo tiros.
  - **Padrões de fábrica que mudam:** o **Criar grupo de sprites** vem escrito com o nome
    `asteroides`, e ele é trocado para `tiros`. Os campos de x e de y do **Criar tiro no grupo**
    vêm com número escrito, e os dois recebem um bloco de leitura por cima.
  - **O que fica e não se mexe:** o **vy** em menos 9. O Dia 3 fala desse número como fato, então o
    clipe de teste mostra o campo e não convida a trocar.
- **Campos livres:** a cor do tiro. Nenhuma aula posterior cita essa cor como fato.
- **Nota de produção:**
  - **Rótulo que mudou.** O bloco que a gravação de 2026 chama de "Atualizar o grupo" hoje se chama
    **Mover os sprites do grupo usando suas velocidades**, em Jogo 2D › Grupos › Movimento. E o
    "Tocar som de pulo" não existe mais: hoje é **Tocar efeito**, em Jogo 2D › Som › Efeitos
    prontos, com a opção `tiro` no menu.
  - **Posição de barra de espaço no menu de teclas: a quinta.** Medida no código em 20/09/2026
    (`sz_g2d_on_key`): quatro setas, barra de espaço, Enter, Escape e as letras. A fala diz a
    posição porque escolher a tecla errada é erro silencioso: nada quebra, o jogo só não responde.
  - Zoom obrigatório em: o momento em que o bloco de leitura cobre o número do x e dá o clique de
    encaixe, que é o gesto mais delicado da aula; o menu de teclas com a lista aberta; o menu do
    efeito com a lista aberta; e o momento em que a peça da faxina abre espaço no meio da pilha.
  - **Marquinha visual a cada som**, obrigatória no `video-teste-e-envio`. Quem estiver sem som
    precisa conseguir contar os disparos com os olhos.
  - Em nenhum clipe a fala diz onde a ferramenta fica na tela. Posição dentro do Estúdio pode ser
    dita, posição da ferramenta na página não.
- **O que NÃO entra, e por quê:**
  - **"a área que fica de ouvido em pé".** É expressão figurada sem marcação, e boa parte da turma
    lê ao pé da letra. No lugar entra a campainha, anunciada com "é como".
  - **"o tiro nasce na altura da nave, bem na pontinha dela".** A posição y é a borda de cima da
    caixa, e não a ponta do desenho do kit. A fala nova diz "no meio da nave e na altura da borda
    de cima dela".
  - **"sem a faxina o jogo fica pesado e lento".** Neste jogo isso não acontece. Fica só a razão
    honesta: a faxina existe para o jogo não continuar carregando o que já foi embora.
  - **O convite a trocar o vy por menos 15.** O Dia 3 conta com o menos 9.
  - **A explicação do sinal do número negativo.** Ela agora é da experiência da seção 6, e o clipe
    de montagem não a repete.
  - **A enumeração dos seis passos** da gravação de 2026.

---

## Seção 1. O que a gente vai fazer hoje

### Clipe `video-abertura` · O primeiro disparo da sua nave
**Duração alvo:** 25 a 35 segundos · **Palavras:** 75

**Na tela:** o jogo do fim do Dia 2 rodando, ocupando o quadro inteiro, sem nenhuma parte do
Estúdio à vista: a nave andando para os dois lados e atirando, com o som do tiro.

**Narração:**
> "Oi, que bom te ver de novo. A sua nave já voa. Hoje você vai apertar a barra de espaço e ver um
> tiro sair dela, de onde ela estiver na tela."

**Na tela:** o jogo continua, com a nave indo para um lado e atirando, e depois para o outro e
atirando de novo.

**Narração:**
> "A gente vai ensinar o jogo a criar o tiro, a fazer ele subir, e a mostrar ele na tela."

**Na tela:** aproximar num disparo, com o tiro subindo e sumindo na borda de cima da tela do jogo.

**Narração:**
> "Repara no tiro: ele sobe e some lá em cima. No fim do dia isso vai estar acontecendo no seu jogo!
> Vem comigo."

---

## Seção 2. A área que fica esperando você

### Clipe `video-terceira-area` · A campainha do jogo
**Duração alvo:** 30 a 40 segundos · **Palavras:** 84

**Na tela:** as três áreas do projeto lado a lado, a terceira ainda vazia. Nenhum gesto de montagem
neste clipe.

**Narração:**
> "No Dia 1 você montou duas áreas. A **Ao iniciar**, que acontece uma vez. E a **Enquanto estiver
> rodando**, que é o motor e repete sem parar."

**Na tela:** enquadrar só a terceira caixa, **Quando acontecer**, vazia.

**Narração:**
> "Hoje entra a terceira, que se chama **Quando acontecer**. Ela fica esperando."

**Na tela:** a mesma caixa vazia, com o enquadramento segurando.

**Narração:**
> "É como a campainha da sua casa: ela não toca sozinha, e não toca o tempo todo. Ela toca na hora em
> que alguém aperta."

**Na tela:** a caixa Quando acontecer com um rótulo curto aparecendo por cima.

**Narração:**
> "O que você põe dentro dela acontece na hora em que a coisa acontece. E isso tem um nome:
> **evento**."

---

## Seção 3. Monte o grupo dos tiros e a área que espera a tecla

### Clipe `video-montar-grupo-e-evento` · O grupo dos tiros e a tecla que o jogo escuta
**Duração alvo:** 55 a 65 segundos · **Palavras:** 136

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Grupos**, e dentro dela a seção
**Criar e percorrer**. Arrastar **Criar grupo de sprites** para dentro do Ao iniciar, logo abaixo
do Criar nave.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Grupos**, e dentro dela **Criar e percorrer**. Pega o bloco
> **Criar grupo de sprites**. Encaixa dentro do **Ao iniciar**, logo abaixo do **Criar nave**."

**Na tela:** aproximar no nome escrito dentro do bloco, que vem de fábrica como asteroides. Clicar
nele e trocar para tiros, clicando fora depois.

**Narração:**
> "Esse bloco já vem com o nome **asteroides** escrito. Clica nesse nome e troca para **tiros**. O
> grupo começa vazio, e cada disparo vai pôr um tiro nele. É tipo um saquinho."

**Na tela:** abrir a categoria **Áreas do projeto** e arrastar **Quando acontecer**, soltando ao
lado das outras duas, com um espaço visível entre elas.

**Narração:**
> "Agora, na categoria **Áreas do projeto**, pega o **Quando acontecer** e solta ao lado das outras
> duas, com um espacinho."

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Controles**, e dentro dela a seção
**Teclado, ações e toque**. Arrastar **Quando apertar a tecla** para dentro do Quando acontecer,
que está vazio.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Controles**, e dentro dela **Teclado, ações e toque**. Pega o
> **Quando apertar a tecla**, e encaixa dentro do **Quando acontecer**, no primeiro lugar."

**Na tela:** abrir o menu de teclas do bloco, com a lista inteira à vista. Enquadrar a posição da
barra de espaço na lista e escolher ela.

**Narração:**
> "Esse bloco tem um menu de teclas. Abre o menu e escolhe a **barra de espaço**, que é o **quinto**
> da lista, logo depois das quatro setas."

> **Posição conferida no código em 20/09/2026** (`blockCatalogInteraction.ts`, o `field_dropdown`
> do `KEY`). A lista começa com as quatro setas, na ordem direita, esquerda, cima e baixo, e a
> **barra de espaço é a quinta**. Depois dela vêm Enter, Escape e as letras. Dizer a posição é
> obrigatório aqui porque escolher a tecla errada é erro silencioso: nada quebra, o jogo só não
> responde, e quem está montando não tem como descobrir sozinho.

---

## Seção 5. Faça o tiro nascer na nave

### Clipe `video-criar-tiro` · O tiro nasce na nave
**Duração alvo:** 55 a 65 segundos · **Palavras:** 148

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Grupos**, e dentro dela a seção
**Criar e percorrer**. Arrastar **Criar tiro no grupo** para dentro do Quando apertar a tecla, que
está vazio.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Grupos**, e dentro dela **Criar e percorrer**. Pega o bloco
> **Criar tiro no grupo**, e encaixa dentro do **Quando apertar a tecla**, no primeiro lugar."

**Na tela:** abrir o menu do grupo dentro do bloco e conferir que está escolhido tiros.

**Narração:**
> "Confere se o grupo escolhido é **tiros**."

**Na tela:** aproximar no campo do x do Criar tiro no grupo, com o número que já vem escrito dentro
dele.

**Narração:**
> "Repara: o campo do x já vem com um número dentro."

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Movimento**, e dentro dela a seção
**Posição e tamanho**. Arrastar **o centro x do sprite** por cima do número do x, com aproximação
no momento em que o bloco cobre o número e dá o clique de encaixe.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Movimento**, e dentro dela **Posição e tamanho**. Pega o bloco
> **o centro x do sprite**, e arrasta ele por cima do número que está no x, até dar o clique. Escolhe
> **nave** nele."

**Na tela:** na mesma seção, arrastar **a posição y do sprite** por cima do número do y, com a
mesma aproximação no clique de encaixe.

**Narração:**
> "Na mesma seção, **Posição e tamanho**, pega **a posição y do sprite**, e arrasta por cima do
> número que está no y. Escolhe **nave** nele também."

**Na tela:** a tela do jogo com as marcas da caixa da nave ligadas, mostrando o meio da caixa e a
borda de cima, e o tiro saindo desse ponto.

**Narração:**
> "Agora o tiro nasce no meio da nave, e na altura da borda de cima dela."

**Na tela:** aproximar no campo do raio e escrever 5, clicando fora. Depois o quadradinho de cor do
tiro, com uma cor escolhida.

**Narração:**
> "Falta o **raio**, que é o tamanho da bolinha: escreve 5 e clica fora. E a cor é sua, capricha."

---

## Seção 7. Escreva a velocidade e ponha o som

### Clipe `video-velocidade-som` · A velocidade e o som do tiro
**Duração alvo:** 40 a 50 segundos · **Palavras:** 96

**Na tela:** aproximar no campo vx do Criar tiro no grupo. Escrever 0 e clicar num espaço vazio
fora do bloco.

**Narração:**
> "No **vx** fica 0, porque o tiro não anda para os lados. Escreve o 0 e clica fora."

**Na tela:** aproximar no campo vy. Escrever menos 9, com o sinal de menos bem visível, e clicar
fora.

**Narração:**
> "No **vy** escreve menos 9, com o sinal de menos na frente. É esse menos que manda o tiro para
> cima."

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Som**, e dentro dela a seção **Efeitos
prontos**. Arrastar **Tocar efeito** para dentro do Quando apertar a tecla, logo abaixo do Criar
tiro no grupo.

**Narração:**
> "Agora o som. Na categoria **Jogo 2D**, abre **Som**, e dentro dela **Efeitos prontos**. Pega o
> **Tocar efeito**, e encaixa logo abaixo do **Criar tiro no grupo**."

**Na tela:** abrir o menu do efeito, com a lista à vista, e escolher tiro.

**Narração:**
> "Abre o menu do efeito e escolhe **tiro**."

**Na tela:** enquadrar os dois blocos juntos, dentro do Quando apertar a tecla.

**Narração:**
> "Como ele está dentro do **Quando apertar a tecla**, o som toca uma vez em cada disparo, e não o
> tempo todo."

---

## Seção 8. Os tiros voam

### Clipe `video-tiros-voam` · Mover e desenhar o grupo
**Duração alvo:** 45 a 55 segundos · **Palavras:** 112

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Grupos**, e dentro dela a seção
**Movimento**. Arrastar **Mover os sprites do grupo usando suas velocidades** para dentro do A cada
quadro do jogo, logo abaixo do Desenhar o sprite da nave.

**Narração:**
> "Volta no motor, no **A cada quadro do jogo**. Na categoria **Jogo 2D**, abre **Grupos**, e dentro
> dela **Movimento**. Pega o **Mover os sprites do grupo usando suas velocidades**, e encaixa logo
> abaixo do **Desenhar o sprite** da nave."

**Na tela:** abrir o menu do grupo e escolher tiros.

**Narração:**
> "Escolhe o grupo **tiros**. É ele que empurra cada tiro para cima, usando a velocidade que você
> escreveu."

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Grupos**, e dentro dela a seção
**Desenho e ordem**. Arrastar **Desenhar o grupo** para dentro do A cada quadro do jogo, logo
abaixo do Mover os sprites do grupo.

**Narração:**
> "Agora, na categoria **Jogo 2D**, abre **Grupos** de novo, e dentro dela **Desenho e ordem**. Pega
> o **Desenhar o grupo**, e encaixa logo abaixo do **Mover os sprites do grupo**."

**Na tela:** abrir o menu do grupo desse bloco e escolher tiros.

**Narração:**
> "Escolhe **tiros** nele também. Esse é o que mostra os tiros na tela."

**Na tela:** o ponteiro clicando dentro da área do jogo, e a barra de espaço sendo apertada. O
primeiro tiro saindo da nave, subindo, com o som.

**Narração:**
> "Agora clica na área do jogo e aperta a barra de espaço!"

---

## Seção 10. Ponha a faxina entre os dois blocos

### Clipe `video-faxina` · A peça que entra no meio
**Duração alvo:** 35 a 45 segundos · **Palavras:** 89

**Na tela:** a pilha do motor à vista, com o Mover os sprites do grupo e o Desenhar o grupo colados
um no outro.

**Narração:**
> "Essa peça entra num lugar diferente de todas as outras de hoje: no meio."

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Grupos**, e dentro dela a seção
**Participação e limpeza**. Arrastar **Tirar do grupo quem sair da tela, para cada um** até o meio
da pilha, com aproximação no momento em que a peça abre espaço entre os dois blocos.

**Narração:**
> "Na categoria **Jogo 2D**, abre **Grupos**, e dentro dela **Participação e limpeza**. Pega o
> **Tirar do grupo quem sair da tela, para cada um**. Encaixa entre o **Mover os sprites do grupo** e
> o **Desenhar o grupo**."

**Na tela:** a peça abrindo espaço no meio da pilha, em câmera lenta ou com o enquadramento
segurando.

**Narração:**
> "Olha ela abrindo espaço bem ali no meio! Abre o menu do grupo e escolhe **tiros**."

**Na tela:** aproximar no espaço de fazer que existe dentro do bloco, vazio.

**Narração:**
> "E repara nesse espaço de fazer dentro dela, que serve para mandar alguma coisa acontecer quando
> alguém sai. Hoje ele fica vazio."

> **Nota de produção.** O instinto é soltar a peça no fim da pilha, então a gravação precisa deixar
> reconhecível o momento em que ela abre espaço entre os dois blocos que já existem. Nenhuma frase
> deste clipe promete que sem a faxina o jogo fica pesado e lento.

---

## Seção 11. Teste, envie e fecha

### Clipe `video-teste-e-envio` · Dois tiros de dois lugares e o envio
**Duração alvo:** 50 a 60 segundos · **Palavras:** 133

**Na tela:** o ponteiro clicando dentro da área do jogo.

**Narração:**
> "Clica dentro da área do jogo, para o teclado ser dele."

**Na tela:** a seta para a esquerda levando a nave até a beirada esquerda. Depois a barra de
espaço, com o tiro saindo de onde a nave está, subindo e sumindo na borda de cima. Marquinha visual
no canto a cada som.

**Narração:**
> "Leva a nave até a beirada da esquerda e aperta a barra de espaço."

**Na tela:** a seta para a direita levando a nave até a beirada direita. Barra de espaço de novo,
com o segundo tiro nascendo do lugar novo. Marquinha visual no som.

**Narração:**
> "Agora até a beirada da direita, e aperta de novo. Esse nasceu no lugar novo, não no do primeiro."

**Na tela:** aproximar nos três campos do Criar tiro no grupo, um de cada vez, cada um enquadrado:
raio 5, vx 0 e vy menos 9.

**Narração:**
> "Antes de enviar, confere três números no **Criar tiro no grupo**: raio 5, vx 0, e vy menos 9."

**Na tela:** a tela do jogo inteira, com os dois disparos acontecendo e as marquinhas visuais.

**Narração:**
> "Confere: os dois tiros nascem em lugares diferentes, sobem, somem lá em cima, e cada um tem som."

**Na tela:** a barra do Estúdio com a etiqueta **Salvo**. Depois o botão **Enviar para
o professor** sendo apertado, com a confirmação.

**Narração:**
> "Espera o **Salvo** e aperta o **Enviar para o professor**."

**Na tela:** o jogo do Dia 2 rodando ao fundo, depois de o envio já ter acontecido na tela.

**Narração:**
> "Agora cada disparo nasce na sua nave, onde quer que ela esteja. A área Quando acontecer cria o
> tiro, e o motor faz o resto: move o grupo, tira quem saiu e desenha. No Dia 3 chegam os asteroides
> para você acertar."

> **Nota de produção.** Nenhuma montagem de bloco neste clipe: ele é teste, conferência, envio e
> fecho. O clipe mostra o campo do vy e não convida a mudar o número, porque o Dia 3 fala do menos
> 9 como fato.
