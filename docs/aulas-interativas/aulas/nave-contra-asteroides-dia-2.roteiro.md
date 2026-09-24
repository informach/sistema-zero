# Roteiro de gravação · Nave Contra Asteroides · Dia 2 · A nave atira

**Como ler este roteiro:** só o texto entre aspas em **Narração** é falado no vídeo. **Na tela**
orienta a gravação; as **Notas de produção** são lembretes para a equipe, não falas para a criança.

## Especificações

- **Formato:** gravação da tela do Estúdio com narração por cima. Os clipes de gesto mostram a
  paleta abrindo gaveta por gaveta; os de conceito podem mostrar exemplos sem montar blocos.
- **Duração:** 11 clipes. Os três novos clipes conceituais são curtos; medir a duração final
  depois da gravação, sem comprimir demonstrações necessárias para a criança acompanhar.
- **Calibração:** o projeto entra exatamente como o Dia 1 entrega. Duas áreas montadas, tela 800
  por 480, sprite `nave` em x 400, y 410, tamanho 54 por 62, e o motor com limpar, estrelas
  velocidade 1, mover com as setas velocidade 7, manter dentro da tela e desenhar a nave. As três
  ações de testar e o gesto de confirmar um campo vêm do Dia 1 e não são reensinados. É novo
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
  - **A explicação longa do sinal negativo no clipe prático.** O conceito fica no vídeo da seção 6;
    o clipe de montagem só relembra o valor a escrever.
  - **A enumeração dos seis passos** da gravação de 2026.

---

## Seção 1. O que a gente vai fazer hoje

### Clipe `video-abertura` · O primeiro disparo da sua nave
**Duração alvo:** 25 a 35 segundos; recalibrar após gravar.

**Na tela:** o jogo do fim do Dia 2 rodando, ocupando o quadro inteiro, sem nenhuma parte do
Estúdio à vista: a nave andando para os dois lados e atirando, com o som do tiro.

**Narração:**
> "Oi, que bom te ver de novo. A sua nave já se move. Hoje você vai apertar a barra de espaço e ver um
> tiro sair dela, de onde ela estiver na tela."

**Na tela:** o jogo continua, com a nave indo para um lado e atirando, e depois para o outro e
atirando de novo.

**Narração:**
> "A gente vai ensinar o jogo a criar o tiro, a fazer ele subir, e a mostrar ele na tela."

**Na tela:** manter o jogo completo em movimento, com a nave e um disparo à vista.

**Narração:**
> "No fim da aula, a sua nave também vai disparar de onde estiver. Vamos montar isso juntos.
> Vem comigo."

---

## Seção 2. A área que fica esperando você

### Clipe `video-terceira-area` · A campainha do jogo
**Duração alvo:** 40 a 50 segundos; recalibrar após gravar.

**Na tela:** o jogo do Dia 1. Apertar a barra de espaço ainda não dispara nada. Mostrar as duas
áreas já montadas e um espaço livre ao lado, sem gesto de montagem neste clipe.

**Narração:**
> "A nave já se move, mas ainda não sabe o que fazer quando você aperta a barra de espaço. O jogo
> precisa esperar esse comando. No Dia 1 você montou **Ao iniciar**, para a preparação, e
> **Enquanto estiver rodando**, para o trabalho que se repete. Nenhuma das duas espera uma tecla."

**Na tela:** mostrar as três áreas do projeto lado a lado, a terceira ainda vazia. Enquadrar só
**Quando acontecer**.

**Narração:**
> "Para isso existe a terceira área, **Quando acontecer**. Ela espera uma ação do jogador."

**Na tela:** a mesma caixa vazia, com o enquadramento segurando.

**Narração:**
> "Pensa na campainha de casa. Ela não toca sozinha nem fica tocando o tempo todo. Ela toca quando
> alguém aperta. Essa área funciona parecido."

**Na tela:** a caixa Quando acontecer com um rótulo curto aparecendo por cima.

**Narração:**
> "Quando você aperta a tecla escolhida, o jogo faz o que estiver dentro dessa área. Você faz
> uma coisa e o jogo responde. A gente chama isso de **evento**."

---

## Seção 3. Monte o grupo dos tiros e a área que espera a tecla

### Clipe `video-montar-grupo-e-evento` · O grupo dos tiros e a tecla que o jogo escuta
**Duração alvo:** 70 a 85 segundos; recalibrar após gravar.

**Na tela:** a nave sozinha do Dia 1. Um, depois vários tiros aparecem saindo dela. Representar um
grupo vazio que recebe cada tiro, como um saquinho, antes de abrir a paleta.

**Narração:**
> "Ontem a gente criou uma nave só. Hoje ela pode disparar muitos tiros, um atrás do outro. Para
> cuidar de todos juntos, o jogo usa um **grupo**. É como um saquinho que guarda os tiros. Cada
> disparo põe mais um lá dentro, e depois a gente pode mandar uma ordem para o grupo inteiro."

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
> grupo começa vazio. Cada disparo vai pôr um tiro nele."

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

## Seção 4. Número escrito ou posição lida?

### Clipe `video-escrito-e-lido` · O endereço que acompanha a nave
**Duração alvo:** 35 a 45 segundos.

**Na tela:** um endereço escrito num papel permanece igual quando uma peça de papel muda de
lugar. Ao lado, uma pergunta feita naquele momento acompanha a peça. Não mostrar disparos nem as
marcas de nascimento da experiência.

**Narração:**
> "A nave já pode andar de um lado para o outro, mas o tiro precisa nascer onde ela estiver
> no instante do disparo. Como o jogo descobre esse lugar? Imagina escrever num papel que a nave
> está no x 400. Mesmo que ela ande, o papel continua
> dizendo 400. Agora imagina perguntar ao jogo onde a nave está **neste momento**. Se ela andou,
> a resposta muda. Para o tiro sair da nave, o jogo precisa perguntar a posição dela na hora do
> disparo. Na experiência, veja o que acontece usando um número escrito e depois uma posição lida."

---

## Seção 5. Faça o tiro nascer na nave

### Clipe `video-criar-tiro` · O tiro nasce na nave
**Duração alvo:** 90 a 105 segundos; recalibrar após gravar.

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Grupos**, e dentro dela a seção
**Criar e percorrer**. Arrastar **Criar tiro no grupo** para dentro do Quando apertar a tecla, que
está vazio.

**Narração:**
> "A área que espera a barra de espaço já está no projeto. Agora vamos colocar nela a ordem que
> cria um tiro. Depois, vamos fazer esse tiro nascer na posição da nave, mesmo quando ela mudar
> de lugar. Na categoria **Jogo 2D**, abre **Grupos**, e dentro dela **Criar e percorrer**. Pega o bloco
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

**Na tela:** ainda em **Jogo 2D › Movimento › Posição e tamanho**, arrastar **a posição y do sprite** por cima do número do y, com a
mesma aproximação no clique de encaixe.

**Narração:**
> "Agora, ainda na categoria **Jogo 2D**, em **Movimento**, na seção **Posição e tamanho**, pega o
> bloco **a posição y do sprite**. Arrasta por cima do número que está no y do **Criar tiro no
> grupo**, até encaixar. No bloco de posição y, escolhe **nave**."

**Na tela:** sobrepor marcas didáticas na caixa da nave, mostrando o meio na horizontal e a
borda de cima. Não simular um tiro visível no jogo: o grupo só será movido e desenhado na seção 8.

**Narração:**
> "Assim, quando você disparar, o tiro vai nascer no meio da nave, na altura da borda de cima
> dela. Daqui a pouco a gente vai fazer ele aparecer e voar."

**Na tela:** aproximar no campo do raio, que já mostra 5. Não apagar nem redigitar. Depois,
mostrar o quadradinho de cor do tiro, com uma cor escolhida.

**Narração:**
> "O **raio** mede do meio até a beirada da bolinha. Ele já vem em 5; deixa assim. E a cor é
> sua, capricha."

---

## Seção 6. Para que lado vai o tiro?

### Clipe `video-sinal-da-velocidade` · O sinal muda a direção
**Duração alvo:** 45 a 55 segundos; recalibrar após gravar.

**Na tela:** um eixo vertical simples, com o zero em cima e valores crescentes para baixo. Setas
identificam os sentidos positivo e negativo, sem animar o tiro da experiência.

**Narração:**
> "O tiro já sabe onde nascer. Agora precisamos escolher para que lado ele vai depois que nasce.
> No bloco que cria o tiro, a velocidade em x decide o movimento para os lados. Com zero, o tiro não vai nem para a
> esquerda nem para a direita. A velocidade em y decide o movimento para cima ou para baixo.
> Neste jogo, y aumenta quando descemos. Com um número positivo, o tiro desce. Com um número que
> tem menos na frente, ele sobe.
> O tamanho do número diz quanto ele anda a cada quadro do jogo. Na experiência, descubra o que
> muda quando você troca o sinal."

---

## Seção 7. Escreva a velocidade e ponha o som

### Clipe `video-velocidade-som` · A velocidade e o som do tiro
**Duração alvo:** 55 a 65 segundos; recalibrar após gravar.

**Na tela:** aproximar no campo vx do Criar tiro no grupo, que já mostra 0. Não apagar nem
redigitar.

**Narração:**
> "Você viu que o sinal da velocidade muda a direção do tiro. Agora vamos escolher os números
> do nosso disparo e acrescentar o som. No bloco **Criar tiro no grupo**, o **vx** já vem em
> **0**, porque o tiro não vai para os lados. Confere e deixa assim."

**Na tela:** aproximar no campo vy. Escrever menos 9, com o sinal de menos bem visível, e clicar
fora.

**Narração:**
> "No **vy**, troca o número que veio por menos 9, com o sinal de menos na frente. Clica fora
> para confirmar. É esse menos que manda o tiro para cima."

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
**Duração alvo:** 70 a 85 segundos; recalibrar após gravar.

**Na tela:** abrir a categoria **Jogo 2D**, a subcategoria **Grupos**, e dentro dela a seção
**Movimento**. Arrastar **Mover os sprites do grupo usando suas velocidades** para dentro do A cada
quadro do jogo, logo abaixo do Desenhar o sprite da nave.

**Narração:**
> "Quando você aperta a barra de espaço, o tiro já nasce e toca o som. Agora falta fazer os
> tiros se moverem e aparecerem na tela a cada quadro. Volta no motor, no **A cada quadro do
> jogo**. Na categoria **Jogo 2D**, abre **Grupos**, e dentro
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

**Na tela:** destacar a ordem: estrelas, nave, grupo tiros; o tiro passa à frente da nave.

**Narração:**
> "A ordem de desenho do Dia 1 continua valendo: primeiro as estrelas, depois a nave, por último
> os tiros. Por isso o tiro aparece na frente."

**Na tela:** o ponteiro clicando dentro da área do jogo, e a barra de espaço sendo apertada. O
primeiro tiro saindo da nave, subindo, com o som.

**Narração:**
> "Agora clica na área do jogo e aperta a barra de espaço!"

---

## Seção 9. O tiro sumiu. Ele foi embora?

### Clipe `video-tiro-fora-da-tela` · Invisível não quer dizer removido
**Duração alvo:** 35 a 45 segundos.

**Na tela:** o brinquedo da analogia fica atrás de uma porta: fora da vista, ainda presente. Ao
lado, um desenho simples de uma caixa de grupo, sem simular os tiros, a prateleira ou os contadores
da experiência. Não prometer lentidão ou travamento.

**Narração:**
> "Quando o tiro sai da tela, nossos olhos não conseguem mais vê-lo. Mas isso, sozinho, não
> tira o tiro do grupo. É como guardar um brinquedo atrás da porta: ele não aparece, mas ainda
> está ali. O jogo precisa de uma ação para retirar do grupo os tiros que já saíram. Na
> experiência, observe a cena e o contador: eles contam histórias diferentes?"

---

## Seção 10. Ponha a faxina entre os dois blocos

### Clipe `video-faxina` · A peça que entra no meio
**Duração alvo:** 50 a 65 segundos; recalibrar após gravar.

**Na tela:** a pilha do motor à vista, com o Mover os sprites do grupo e o Desenhar o grupo colados
um no outro.

**Narração:**
> "Você viu que o tiro pode sair da tela e continuar guardado no grupo. Agora vamos retirar do
> grupo cada tiro que saiu. Essa peça entra num lugar diferente das outras de hoje: no meio da
> sequência que move e desenha os tiros."

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

## Seção 11. Quiz do Dia 2

Sem vídeo. O Zappy faz uma única ponte curta para o quiz separado: "Hora de conferir o que você
descobriu sobre os tiros. Pode pensar com calma antes de escolher!" As perguntas verificam o
conceito, sem pedir que a criança memorize o nome de um botão.

---

## Seção 12. Teste, envie e fecha

### Clipe `video-teste-e-envio` · Dois tiros de dois lugares e o envio
**Duração alvo:** 70 a 85 segundos; recalibrar após gravar.

**Na tela:** o ponteiro clicando dentro da área do jogo.

**Narração:**
> "O disparo já nasce na nave, sobe, faz som e sai do grupo quando deixa a tela. Vamos testar
> tiros em dois lugares diferentes e depois enviar o jogo. Primeiro, clica dentro da área do
> jogo, para o teclado ser dele."

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
