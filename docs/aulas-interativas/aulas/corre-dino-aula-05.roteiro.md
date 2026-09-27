# Roteiro de gravação · Corre Dino · Aula 05 · O cacto vem vindo

## Especificações

- **Formato:** gravação de tela com narração, no Estúdio embutido.
- **Duração:** 295 a 360 segundos de clipes; 773 palavras de narração, cerca de 5.6 minutos a 137 palavras por minuto. As pausas de observação e de trabalho na ferramenta ocupam o restante.
- **Calibração:** o Dino corre na floresta, pula pelos três controles e o pulo tem som. Em `Ao iniciar`: `Preparar o jogo em tela cheia, tela 480 × 270, fundo azul-claro` e `Criar dinossauro dino em x 110 y 150 tamanho 64`. Em `Quando acontecer`: `Quando o sprite dino pular` com `Tocar efeito` com `pulo`. Em `Enquanto estiver rodando`, um `A cada quadro do jogo` com cinco blocos. A pista está vazia: não há de que desviar.
- **Conceitos nomeados:** grupo, relógio, posição de nascimento fora da tela e velocidade horizontal negativa.
- **Dor desta aula:** Criar cacto a cada quadro enche a pista; o acúmulo é provocado e identificado como consequência do encaixe.
- **Vitória do dia:** cactos entrando pela direita, um de cada vez, com espaço entre eles, e o Dino pulando por cima. É a aula em que o jogo vira jogo.
- **Valores:** Grupo cactos, relógio 1.4 segundo, x 560, tamanho 44, vx -5. Os números de fábrica ficam até a etapa que os modifica.
- **Campos livres:** Nenhum campo obrigatório livre nesta aula.
- **Nota de produção:** Mostrar a avalanche no projeto real, depois Ctrl ao retirar só o criador do meio da pilha. Na régua, 400, 480 e 560 precisam estar na mesma escala.
- **O que NÃO entra, e por quê:** Não ensinar colisão agora; o Dino ainda atravessa os cactos, assunto da Aula 9.

## Seção 1. O que a gente vai fazer hoje

### Clipe `video-abertura` · O motivo do pulo chega pela direita
**Duração alvo:** 25 a 35 segundos · **Palavras:** 61

**Na tela:** Mostrar Dino pulando sem obstáculos; depois o jogo do fim da aula com cactos chegando pela direita.

**Narração:**
> "O Dino já pula, mas por enquanto pula sem ter do que desviar. Olha o que vai entrar hoje:
> cactos vindo da direita, um depois do outro, com espaço para você reagir."

**Na tela:** Mostrar um salto por cima do cacto.

**Narração:**
> "Você vai montar o grupo, fazer cada cacto nascer no ritmo certo e mandar todos andarem. A
> batida ainda não conta nesta aula; hoje é o começo da pista."

## Seção 2. Um time de cactos, e a avalanche

### Clipe `video-grupo-e-avalanche` · Duzentos cactos em três segundos
**Duração alvo:** 75 a 90 segundos · **Palavras:** 210

**Na tela:** Abrir Jogo 2D > Grupos > Criar e percorrer; encaixar Criar grupo de sprites no Ao iniciar, logo abaixo de Criar dinossauro.

**Narração:**
> "Primeiro o time. Em **Jogo 2D**, abre **Grupos**, depois **Criar e percorrer**. Pega **Criar
> grupo de sprites** e encaixa no **Ao iniciar**, logo abaixo do **Criar dinossauro**. No nome,
> escreve **cactos**, sem acento. Um grupo deixa a gente dar o mesmo comando a muitos sprites."

**Na tela:** Abrir Jogo 2D > Kits prontos > Dino; pôr No grupo criar obstáculo dentro de A cada quadro do jogo, logo abaixo de Desenhar o sprite dino.

**Narração:**
> "Em **Jogo 2D**, abre **Kits prontos**, depois **Dino**. Pega **No grupo criar obstáculo** e
> encaixa dentro do **A cada quadro do jogo**, logo abaixo de **Desenhar o sprite dino**. No
> grupo, escolhe **cactos**. A forma já vem como **cacto**. Deixa x em **400**, tamanho em
> **44** e vx em **menos 3**, como vieram por enquanto."

**Na tela:** Abrir Jogo 2D > Grupos > Movimento; encaixar Mover os sprites do grupo usando suas velocidades logo abaixo do criador.

**Narração:**
> "Em **Jogo 2D**, abre **Grupos**, depois **Movimento**. Pega **Mover os sprites do grupo
> usando suas velocidades** e encaixa logo abaixo do **No grupo criar obstáculo**. Seleciona
> **cactos** no campo do grupo."

**Na tela:** Abrir Jogo 2D > Grupos > Desenho e ordem; encaixar Desenhar o grupo logo abaixo de Mover os sprites do grupo usando suas velocidades.

**Narração:**
> "Em **Jogo 2D**, abre **Grupos**, depois **Desenho e ordem**. Pega **Desenhar o grupo** e
> encaixa logo abaixo do **Mover os sprites do grupo usando suas velocidades**. Nesse campo
> também escolhe **cactos**."

**Na tela:** Mostrar a tela enchendo de cactos; deixar a conta visual aparecer.

**Narração:**
> "Olha a parede que apareceu! O criador está dentro do **A cada quadro do jogo**, que acontece
> muitas vezes por segundo. Pedimos um cacto novo em cada quadro: em três segundos são quase
> duzentos. O computador fez exatamente o que a pilha mandou. Agora precisamos escolher outro
> ritmo."

## Seção 4. Dois ritmos, um do lado do outro

### Clipe `video-relogio` · O relógio mora ao lado do motor
**Duração alvo:** 60 a 70 segundos · **Palavras:** 159

**Na tela:** Mostrar A cada quadro do jogo com o criador no meio da pilha; abrir Jogo 2D > Tempo > Quadros e intervalos.

**Narração:**
> "Essa peça se chama **relógio**. Ela deixa uma ação acontecer de tempos em tempos, sem repetir
> em cada quadro. Em **Jogo 2D**, abre **Tempo**, depois **Quadros e intervalos**. Pega o bloco
> **A cada 2 segundos**. A linha de baixo dele diz **fazer**."

**Na tela:** Soltar o relógio dentro de Enquanto estiver rodando, ao lado de A cada quadro do jogo; mostrar 2 de fábrica mudando para 1.4.

**Narração:**
> "Solta dentro do **Enquanto estiver rodando**, **ao lado** do **A cada quadro do jogo**, com
> espaço. Não é dentro dele. O intervalo vem em **2**; troca por **1.4**, com ponto, e confirma
> fora do campo."

**Na tela:** Demonstrar arraste sem Ctrl trazendo os blocos de grupo, desfazer com Ctrl+Z.

**Narração:**
> "Se eu puxar o criador do meio da pilha assim, os blocos de mover e desenhar vêm junto. Eles
> passariam a funcionar só a cada 1.4 segundo, e o cacto andaria aos trancos. Desfaz com
> **Control e Z**."

**Na tela:** Segurar Ctrl e arrastar só No grupo criar obstáculo para o primeiro lugar dentro do relógio.

**Narração:**
> "Agora segura **Control** enquanto arrasta **No grupo criar obstáculo**. Sai só ele. Solta no
> espaço de fazer do relógio, que está vazio, no primeiro lugar. Mover e desenhar continuam no
> quadro. Olha: um cacto nasce por vez, mas todos andam sem trancos."

## Seção 5. Nascer fora da tela

### Clipe `video-fora-da-tela` · Nascer do lado de fora
**Duração alvo:** 40 a 50 segundos · **Palavras:** 114

**Na tela:** Mostrar a régua com 400 dentro da tela de largura 480 e 560 fora, à direita; apontar o cacto aparecendo já visível.

**Narração:**
> "O ritmo ficou melhor, mas olha onde o cacto aparece: já dentro da telinha, perto da beirada.
> O x dele veio em **400**, e a tela vai até **480**. Por isso ele aparece de repente na sua
> frente."

**Na tela:** Zoom no x do No grupo criar obstáculo dentro do relógio; trocar 400 por 560, confirmar.

**Narração:**
> "No bloco **No grupo criar obstáculo**, dentro do relógio, troca o x de **400** por **560**. O
> tamanho continua **44** e o vx continua **menos 3** agora. Confirma fora do campo e olha o seu
> jogo."

**Na tela:** Mostrar o cacto entrando pela direita, andando.

**Narração:**
> "O cacto nasce depois da beirada e entra andando. Assim o jogador vê o obstáculo chegando e
> tem tempo de decidir o pulo. Nascer fora da tela é uma boa regra para coisas que vêm na
> direção de quem joga."

## Seção 7. Ponha o menos 5 no seu jogo

### Clipe `video-teste-e-valores` · Joga de verdade
**Duração alvo:** 45 a 55 segundos · **Palavras:** 114

**Na tela:** Zoom no vx do No grupo criar obstáculo, -3; trocar por -5 e confirmar.

**Narração:**
> "O último campo do cacto é o **vx**, a velocidade na horizontal. Veio em **menos 3**. Troca
> por **menos 5** e clica fora. O sinal de menos manda o cacto para a esquerda; aumentar a
> distância do zero faz ele chegar mais rápido."

**Na tela:** Clicar na área do jogo; mostrar pelo menos dois cactos vindo da direita e dois pulos.

**Narração:**
> "Clica na área e joga. Os cactos nascem fora, entram pela direita, um de cada vez. Você tem
> espaço para pular. Se o Dino encostar, ele ainda atravessa: a colisão é assunto de outra aula,
> então hoje isso está certo."

**Na tela:** Mostrar relógio 1.4 e vx -5 lado a lado.

**Narração:**
> "Antes de seguir, confere dois números que as próximas aulas vão usar: o relógio em **1.4** e
> o vx em **menos 5**. Eles são a base do seu jogo agora."

## Seção 8. Teste, envie e fecha

### Clipe `video-teste-e-envio` · Esperar dois cactos e enviar
**Duração alvo:** 50 a 60 segundos · **Palavras:** 115

**Na tela:** Clicar na área do jogo e esperar dois cactos inteiros entrarem pela direita, com intervalo visível; pular os dois.

**Narração:**
> "Vamos conferir na pista: um cacto entra inteiro pela direita, depois outro. Entre eles sobra
> espaço para dois pulos. Se vier uma parede inteira, olha se o criador ficou no relógio, fora
> do **A cada quadro do jogo**."

**Na tela:** Mostrar as pilhas e objetivos; esperar Salvo, clicar Enviar para o professor.

**Narração:**
> "Confere o grupo **cactos**, o relógio em **1.4**, o nascimento em x **560** e o vx em **menos
> 5**. Quando os objetivos estiverem certos, espera **Salvo** e clica em **Enviar para o
> professor**."

**Na tela:** Mostrar jogo rodando e cartela breve de conceitos.

**Narração:**
> "Hoje você criou um time de cactos e escolheu o ritmo em que cada um entra. **Grupo** é o
> time. **Relógio** escolhe quando nasce o próximo. Na próxima aula vamos investigar algo que
> acontece com esses cactos depois que somem da sua vista."
