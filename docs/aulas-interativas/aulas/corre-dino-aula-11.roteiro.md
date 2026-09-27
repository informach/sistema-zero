# Roteiro de gravação · Corre Dino · Aula 11 · A caixinha que conta a sua partida

## Especificações

- **Formato:** gravação de tela com narração, no Estúdio embutido.
- **Duração:** 360 a 425 segundos de clipes; 896 palavras de narração, cerca de 6.5 minutos a 137 palavras por minuto. As pausas de observação e de trabalho na ferramenta ocupam o restante.
- **Calibração:** o jogo da aula 10, com a colisão justa. No `Ao iniciar` há seis blocos, e o último é o `Usar área de colisão de 80 % do tamanho para o sprite dino`. Dentro do `Se o estado do jogo é jogando ?`, o último bloco é o `Tirar do grupo cactos quem sair da tela`, porque o raio-X saiu ontem. O `Enquanto estiver rodando` tem duas raízes: o `A cada quadro do jogo` e o `A cada 1.4 segundos`. O jogo ainda não tem nenhuma variável.
- **Conceitos nomeados:** variável, valor da variável, HUD, relógio de pontos e frase dinâmica.
- **Dor desta aula:** O jogo ainda não guarda nem mostra a duração da partida. O placar branco fica ilegível no céu claro até mudar a cor.
- **Vitória do dia:** o número sobe no canto da tela enquanto ela corre, e a tela de fim diz quantos pontos ela fez naquela partida.
- **Valores:** Variável pontos começa em 0; placar em x 12, y 30 e tamanho 24; Somar 1 por intervalo de 0.5 a 3 segundos, exemplo 1.
- **Campos livres:** Cor contrastante do placar e intervalo de pontos entre 0.5 e 3 segundos.
- **Nota de produção:** Mostrar os campos do placar um por um, incluindo o encaixe do bloco de valor por cima do número. Gravar duas partidas com pontuações diferentes.
- **O que NÃO entra, e por quê:** Não chamar a variável de caixa de colisão. Não fixar o intervalo de um segundo como regra universal.

## Seção 1. O que a gente vai fazer hoje

### Clipe `video-abertura` · Hoje o seu jogo começa a contar
**Duração alvo:** 20 a 30 segundos · **Palavras:** 56

**Na tela:** Jogar a versão final com placar legível subindo; perder e mostrar a frase de fim com o número.

**Narração:**
> "Hoje o seu jogo começa a contar. Enquanto o Dino corre, o número sobe no canto. Quando a
> partida termina, a tela diz quantos pontos você fez."

**Na tela:** Aproximar o placar e o número na frase; voltar ao projeto atual sem placar.

**Narração:**
> "Para isso funcionar, o jogo precisa guardar um número, mudar esse número com o tempo e
> mostrá-lo em dois lugares. Vamos montar esses três trabalhos, um por vez."

## Seção 2. A caixinha dos pontos

### Clipe `video-caixinha` · A caixinha que guarda um número
**Duração alvo:** 50 a 60 segundos · **Palavras:** 127

**Na tela:** Abrir Programação > Variáveis; pegar Criar variável com valor e mostrar Ao iniciar com Criar grupo e Mudar o estado.

**Narração:**
> "Em **Programação**, abre **Variáveis** e pega **Criar variável com valor**. Essa é uma
> caixinha que guarda um número. Chama-se **variável** porque o número dentro dela pode variar,
> pode mudar."

**Na tela:** Encaixar entre Criar grupo de sprites cactos e Mudar o estado do jogo para inicio; mostrar ajuste de colisão permanecendo abaixo.

**Narração:**
> "Encaixa no **Ao iniciar**, **entre Criar grupo de sprites cactos e Mudar o estado do jogo
> para inicio**. O ajuste da caixa de colisão continua mais abaixo, no fim. Não confunde as duas
> caixas: a de ontem era um contorno; esta guarda um número."

**Na tela:** Zoom no nome contador de fábrica e valor 0; trocar nome para pontos e confirmar.

**Narração:**
> "No nome vem escrito **contador**. Apaga e escreve **pontos**. O valor vem em **0**; deixa.
> Toda partida começa com zero ponto, e o **Ao iniciar** prepara esse começo."

**Na tela:** Mostrar jogo ainda sem placar.

**Narração:**
> "Olha a tela: nada mudou. A variável está guardada, mas ainda não há bloco mostrando o que tem
> dentro. Preparar e mostrar são trabalhos diferentes."

## Seção 4. Ponha o número na tela

### Clipe `video-placar-e-contraste` · O placar que some no céu
**Duração alvo:** 70 a 80 segundos · **Palavras:** 193

**Na tela:** Abrir Jogo 2D > Vida e placar > Indicadores e texto na tela; pegar Mostrar placar.

**Narração:**
> "Lembra do bloco que serviu de medidor na Aula 6? Agora ele volta para ficar. Em **Jogo 2D**,
> abre **Vida e placar**, depois **Indicadores e texto na tela**. Pega **Mostrar placar**."

**Na tela:** Encaixar no Se de jogando, logo abaixo da faxina dos cactos, no fim do ramo.

**Narração:**
> "Encaixa dentro do **Se o estado do jogo é jogando**, logo abaixo da **faxina dos cactos**. O
> placar aparece durante a corrida, não no menu nem na tela de fim."

**Na tela:** Zoom nos campos: texto Pontos:; valor numérico padrão; abrir Programação > Valores; arrastar valor da variável por cima do valor e escolher pontos.

**Narração:**
> "O texto já vem **Pontos:**, deixa. No valor há um número de fábrica. Em **Programação**, abre
> **Valores** e pega **valor da variável**. Arrasta por cima daquele número e escolhe
> **pontos**. O campo não fica vazio esperando a peça; a peça substitui o que estava ali."

**Na tela:** Zoom em x 12, y 30 e cor branca de fábrica; testar ilegibilidade no céu claro.

**Narração:**
> "O x vem **12** e o y **30**; deixa os dois. A cor vem branca; no meu céu claro, quase não dá
> para ler. Olha o placar sumindo no fundo. A informação precisa aparecer para quem joga."

**Na tela:** Trocar cor por azul quase preto, mantendo a escolha aberta; mostrar tamanho 24 e placar legível.

**Narração:**
> "No meu vou escolher um azul quase preto. No seu, escolhe uma cor que contraste: fundo claro
> pede letra escura; fundo escuro pede letra clara. Por último, o tamanho vem em **24**; deixa
> assim. Essa informação por cima do jogo se chama **HUD**. O placar é o HUD da corrida."

## Seção 6. O relógio dos pontos

### Clipe `video-relogio-pontos` · O terceiro relógio
**Duração alvo:** 70 a 80 segundos · **Palavras:** 186

**Na tela:** Abrir Jogo 2D > Tempo > Quadros e intervalos; soltar A cada 2 segundos em Enquanto estiver rodando, ao lado de quadro e relógio dos cactos.

**Narração:**
> "O placar lê a variável, mas ela ainda está em zero. Em **Jogo 2D**, abre **Tempo**, depois
> **Quadros e intervalos**. Pega **A cada 2 segundos** e solta no **Enquanto estiver rodando**,
> ao lado do quadro e do relógio dos cactos, com espaço."

**Na tela:** Zoom no intervalo padrão; ajustar para 1, indicando faixa 0.5 a 3.

**Narração:**
> "No meu jogo o intervalo vai ser **1 segundo**. Você pode escolher entre **0.5 e 3**: menor
> conta mais rápido, maior conta mais devagar. É um relógio só para os pontos."

**Na tela:** Abrir Programação > Lógica e Se; encaixar Condição se, senão se e senão no fazer do novo relógio, primeiro lugar; tirar comparação padrão.

**Narração:**
> "Em **Programação**, abre **Lógica e Se**. Pega **Condição se, senão se e senão** e encaixa no
> espaço de fazer do relógio, que está vazio, no primeiro lugar. Tira a comparação que veio
> dentro da pergunta."

**Na tela:** Abrir Jogo 2D > Jogo e telas > Telas e partida; encaixar o estado do jogo é __ ? com jogando na pergunta.

**Narração:**
> "Em **Jogo 2D**, abre **Jogo e telas**, depois **Telas e partida**. Pega **o estado do jogo é
> __ ?**, encaixa na pergunta do Se e escolhe **jogando**. Assim o ponto só sobe durante a
> partida."

**Na tela:** Abrir Programação > Variáveis; pôr Somar em variável no então, primeiro lugar; escolher pontos e manter 1.

**Narração:**
> "Em **Programação**, abre **Variáveis**. Pega **Somar em variável** e encaixa no **então**,
> que está vazio, no primeiro lugar. Escolhe **pontos** na lista da variável. O número já vem
> **1**; deixa. Começa a partida e olha o canto: o placar sobe de um em um."

## Seção 7. A tela de fim conta a sua partida

### Clipe `video-frase-de-fim` · A frase que muda de partida para partida
**Duração alvo:** 80 a 90 segundos · **Palavras:** 197

**Na tela:** No Mostrar tela do andar fim, mostrar subtítulo antigo como bloco de texto removível; abrir Programação > Valores.

**Narração:**
> "A tela de fim ainda tem um subtítulo fixo. Vamos pôr nela o número daquela partida. Em
> **Programação**, abre **Valores** e pega **juntar texto**. Arrasta por cima do bloco de texto
> que está no subtítulo do **Mostrar tela** do estado **fim**."

**Na tela:** Mostrar juntar texto vazio; clicar no mais três vezes e mostrar três espaços de valor.

**Narração:**
> "O **juntar texto** nasce sem pedaços. Clica no **mais** três vezes. Surgem três espaços, um
> para cada parte da frase. O zero claro em cada espaço é só uma sombra; ele some quando a peça
> entra."

**Na tela:** Abrir Programação > Valores; encaixar texto no primeiro e terceiro espaços, valor da variável no segundo, na ordem.

**Narração:**
> "Ainda em **Programação**, **Valores**, pega **texto** para o primeiro espaço e escreve **Você
> fez**, com um espaço depois de fez. No segundo, encaixa **valor da variável** e escolhe
> **pontos**. No terceiro, outro **texto**: começa com um espaço e escreve **pontos. Tente bater
> essa marca!**"

**Na tela:** Mostrar frase montada, com espaços visíveis; jogar duas partidas que terminam com números diferentes.

**Narração:**
> "Lê a frase montada: **Você fez 12 pontos. Tente bater essa marca!** Na próxima partida, o
> número pode ser outro. A frase é a mesma, mas o valor no meio vem da caixinha daquela
> partida."

**Na tela:** Mostrar menos ao lado do mais e ícone de alerta como ajuda condicional.

**Narração:**
> "Se sobrou um espaço com zero, usa o **menos** para fechar o último. Se apareceu um aviso,
> clica nele: ele mostra qual espaço ficou sem peça. Confere também os espaços antes e depois do
> número, para a frase não ficar grudada."

## Seção 8. Teste, envie e fecha

### Clipe `video-teste-e-envio` · Quatro testes no placar e o envio
**Duração alvo:** 70 a 85 segundos · **Palavras:** 137

**Na tela:** Recarregar e esperar no menu sem placar; começar e enquadrar canto enquanto passa de 0 para 1 e 2.

**Narração:**
> "Faz quatro conferências. Primeiro: no menu, não há placar. Segundo: começa a partida e ele
> aparece em zero. Espera dois intervalos e vê subir para um, depois dois."

**Na tela:** Bater de propósito; ler frase de fim; reiniciar, fazer partida curta e perder com outro número.

**Narração:**
> "Terceiro: deixa o Dino bater e lê a frase de fim com o número daquela corrida. Quarto:
> reinicia, perde de novo e compara. A nova partida começou de zero; o número do fim pode ser
> diferente."

**Na tela:** Mostrar Ao iniciar com variável 0, Se jogando com placar e relógio com Somar; conferir objetivos.

**Narração:**
> "Cada trabalho tem um lugar: **Criar variável pontos com 0** no Ao iniciar, **Mostrar placar**
> no estado jogando, e **Somar 1** dentro do relógio protegido por jogando. O **Reiniciar o
> jogo** prepara a variável em zero de novo."

**Na tela:** Esperar Salvo e clicar Enviar para o professor; fechar.

**Narração:**
> "Confere os objetivos, espera **Salvo** e clica em **Enviar para o professor**. Hoje o jogo
> ganhou memória: guardar, mudar e mostrar um número. Na próxima aula os cactos deixam de
> repetir sempre o mesmo caminho."
