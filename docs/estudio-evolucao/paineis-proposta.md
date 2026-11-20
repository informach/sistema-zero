# Investigar, Desempenho e Meus testes: a proposta (20/11/2026)

Etapa 9 do plano de 20/11, parte 2. Proposta inteira, para aprovação antes de qualquer tela:
https://claude.ai/artifact/LzdVbKYzQ1qzET8GVezNhZ (pranchas com fotos do Estúdio de staging, com as
abas montadas na gaveta de verdade). A base técnica é a matriz [`depuracao-matriz.md`](depuracao-matriz.md).

## Onde ficam

Três abas novas na gaveta de baixo do Estúdio, depois de Mensagens e Problemas: **Investigar**,
**Desempenho** e **Meus testes**. Valem no Estúdio Completo e no Estúdio da aula, no Kids e no adulto,
nos Blocos, na Ponte e no Pro. No celular entram na aba Mensagens; a tira rola de lado e a aba aberta
fica à vista. Cada aba só liga o que precisa quando é aberta; com a gaveta fechada, o jogo roda como
hoje.

## O que cada tipo de projeto tem

| Tipo de projeto | Investigar | Desempenho | Meus testes |
|---|---|---|---|
| Jogo 2D e Jogo 2D Avançado | Pausar, Avançar 1 quadro, Valores agora, caminho até o erro | quadros por segundo, tempo de cada quadro, sprites no jogo | no navegador, num palco escondido |
| Jogo 3D, Mundo 3D e 3D Avançado | Pausar, Avançar 1 quadro, Valores agora, caminho até o erro | quadros por segundo, tempo de cada quadro, objetos e desenhos por quadro | no navegador, num palco escondido |
| Página de HTML e CSS | Valores agora e caminho até o erro | a aba diz que a página não tem quadros para medir | no navegador: o texto da página e as mensagens |
| Python com Turtle, Pygame Zero, pygame-ce ou Raylib | Pausar e Avançar na troca de quadro, Valores agora, caminho até o erro | quadros por segundo e tempo de cada quadro | no navegador: testar o programa e testar uma função |
| Python sem biblioteca de jogo | caminho até o erro e valores quando o programa termina | o tempo que o programa levou | no navegador: testar uma função |
| Pro (JavaScript) | caminho até o erro, com arquivo e linha | quadros por segundo e tempo de cada quadro | no servidor: testar o jogo e testar uma função exportada |

Fica de fora nesta versão: parar no meio de um bloco, trocar um valor com o jogo pausado, a memória do
jogo (o navegador não informa) e Pausar ou Valores no Pro.

## Como funciona por trás (as notas das pranchas)

- **Pausar e Avançar 1 quadro** param na troca de quadro: a pausa que cada motor já tem
  (`pauseGame`/`resumeGame` do Jogo 2D, `pausado` do Avançado, `_paused` do 3D), chamada pelo Estúdio
  por mensagem; no Python, o Estúdio segura a resposta do próximo quadro. O programa da criança não muda.
- **Valores agora**: as variáveis e a posição de cada sprite, pelo leitor dos objetivos
  (`instrumentCheckScript`), que só entra no jogo com a aba aberta; no Python, o observador das missões.
  Servem para entender o jogo, nunca para nota.
- **Caminho até o erro**: o erro que o jogo já informa, com cada linha ligada ao bloco pelo mapa de blocos.
  A frase para a criança é a mesma do aviso do palco; Problemas continua contando o erro.
- **Desempenho**: liga ao abrir a aba e para ao fechar a gaveta; lê uma vez por segundo o que os motores já
  contam. Cada número leva a marca medido, estimado ou indisponível. O custo da medida fica abaixo de 5% do
  quadro, conferido por teste antes de ligar.
- **Meus testes**: o formato e o julgamento dos objetivos das aulas (`SectionExecutionRule`,
  `judgeExecutionObservation`), com os mesmos limites (até 20 passos e 15 segundos por teste). Passos:
  apertar ou segurar uma tecla, esperar, clicar num sprite. Conferência: variável, posição x ou y do
  sprite, texto na tela, mensagens do jogo, com as comparações do contrato. Roda o jogo do zero num palco
  escondido, sem mexer no projeto; os testes ficam guardados no projeto. No Pro, roda no executor do
  servidor (o do Verificar projeto), com limite por pessoa, e testa também funções exportadas de `src`.
