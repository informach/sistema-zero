# A casca isolada de volta ao staging: conferência logada (21/11/2026)

Lote 1 do plano pela missão original (seção 5, isolamento).

## Ambiente

- **Chrome:** o Chrome de mesa conectado, logado no staging com a conta da equipe.
- **Worker de staging:** implantado pela frente do Pinta em 21/11, às 09:02 UTC. Imagem
  qualificada 598, com os consertos da casca (`590c6ff48`, `c5417856d`, `ed8e08289`).
- **Apps:** community e community-kids implantados em `61ef65f2d`, com
  `STUDIO_CLASSIC_SHELL_ENABLED=1`. Members no mesmo SHA.
- **Projeto:** "Conferencia casca 20-11" no app adulto. O programa deixa o palco vermelho, fica verde
  ao receber uma tecla e escreve "tecla …" nas Mensagens do jogo.

## O que foi conferido no app adulto

| Conferência | Resultado |
|---|---|
| A prévia está na casca de outro site | sim. O iframe "Pré-visualização" aponta para `sistemazero-studio-runtime-staging.helena-bcc.workers.dev/v1/classic-shell/1.html`, sem `srcdoc` |
| Teclas depois de Rodar, **sem clicar no palco** (o defeito de 20/11) | **chegam**: depois de "Rodar de novo", a seta para cima e a tecla d deixam o palco verde, e as mensagens mostram "tecla ArrowUp" e "tecla d" |
| Laço de foco | não há: ao clicar no código e digitar, o texto entra no editor e nenhuma tecla nova chega ao jogo |
| Programa hostil (30 s de trabalho síncrono que não é laço) | maior atraso do relógio do editor: **50 ms** em 3 s de medição (critério: menos de 500 ms). O aviso "O preview parece travado" apareceu com Parar e Continuar esperando |
| Parar com o jogo preso | o botão voltou a "Rodar" em **846 ms** (critério: menos de 5 s) |
| Conserto depois do Parar | rodou na hora, e a seta para a esquerda chegou ao jogo sem clicar no palco |

## Aula com vídeo, com a casca ligada (app adulto)

Curso "Cadê Todo Mundo?" (adulto), aula 2. Em 20/11 esta conferência tinha ficado de fora.

| Conferência | Resultado |
|---|---|
| Vídeo da parte 1 | toca: a cena andou, o botão virou "Pausar" e o tempo passou de 00:06 |
| Experiência da parte 2 | carrega ao lado do vídeo |
| Estúdio da aula, parte 3 | a prévia "Pré-visualização" está na casca (sem `srcdoc`); na aba Jogo, "Rodando", com o jardim desenhado e "Achados: 0" |

## Casca no app Kids

Com a autorização da dona, o acesso deste navegador ("QA casca 20-11") ao perfil Criador(a) foi
renovado só por hoje ("Somente hoje": "Pode entrar até 21 de nov. de 2026, à meia-noite").

| Conferência | Resultado |
|---|---|
| A prévia está na casca | sim, no projeto "QA staging 2026-10-22 JavaScript moeda" (Pegue a moeda): iframe na casca, sem `srcdoc` |
| Teclas depois de Rodar, sem clicar no palco | chegam: o Enter começa a partida ("Moedas: 0"), e as setas movem o herói |

## Python novo no staging (app adulto)

Projeto novo "QA paineis python 21-11", com o ponto de partida Pygame Zero e um jogo mínimo escrito
pela Ponte (um círculo que anda a cada quadro e imprime a tecla apertada).

| Conferência | Resultado |
|---|---|
| Distribuição usada pelo projeto novo | a nova: os quadros "Pré-visualização Python" e de análise carregam `/v1/runtimes/cf021c32…/` do Worker de staging (release `2026-11-20-pinta-cenarios-6`) |
| O jogo roda e a Ponte faz os blocos | sim |
| Investigar | abre, mostra "O programa está rodando", "Valores agora" com `pos` e "Mostrar o bloco" |
| Pausar e Avançar 1 quadro; Desempenho | **não verificável neste Chrome**: o Pausar não mudou o estado e a medida deu cerca de 1 quadro por segundo |

**Por que não verificável.** A própria página do editor recebia 4 a 5 `requestAnimationFrame` em 2
segundos, também com o jogo parado, embora `document.visibilityState` dissesse "visible" e a página
tivesse o foco. O Chrome conectado roda em outra máquina, e a janela provavelmente estava coberta ou
minimizada. Nesse estado, tudo o que depende de quadros sai errado: o jogo anda a cerca de 1 quadro
por segundo, e a pausa, que espera a resposta do próximo quadro, não chega. As conferências da casca
(teclas, foco, programa hostil, Parar) dependem de eventos e relógios e valem.

**Refeito com a janela visível** (a página passou a receber 121 quadros em 2 segundos):

| Conferência | Resultado |
|---|---|
| Desempenho | 59 quadros por segundo, 17 ms por quadro; memória "indisponível", como a tabela aprovada declara para este navegador |
| Pausar | o jogo pausa: "O jogo está pausado, Quadro 355", com Continuar e Avançar 1 quadro |
| Avançar 1 quadro | anda exatamente um: Quadro 356, e `pos` de [308] para [310] (o jogo soma 2 por quadro) |
| Continuar e teclas | o jogo volta a correr; clicando no palco, a tecla "a" chega ("tecla 97" nas Mensagens do programa) |

Conclusão: os painéis do Python funcionam no staging com a distribuição nova, num projeto novo.

## Projetos Python antigos de teste e de QA apagados

Decisão da dona (21/11): o Python não tem compatibilidade com projetos antigos, porque ninguém usa
ainda. Ela confirmou a lista antes. Cada um foi excluído pela interface ("Esta ação não pode ser
desfeita"):
- no Kids, perfil Criador(a): "QA staging 2026-10-22 Pac-Man Python", "Remix de QA staging
  2026-10-22 Pac-Man Python", "QA staging 2026-10-22 Space Arena Python" e "QA staging 2026-10-22
  Python Pro Pinta";
- na conta adulta: "qa-vila-python-20261121".

Fica o "QA paineis python 21-11", criado hoje na distribuição nova, como evidência desta
conferência. O outro perfil do Kids não foi aberto (precisa de autorização própria neste
navegador).

## Troca de perfil com gravação em voo, no app Kids (lote 2)

Critério da etapa 1 do plano: "troca de perfil com gravação em voo conferida no app". Com a
autorização da dona para criar chave de acesso, este navegador foi liberado também para o segundo
perfil Criador(a) ("QA troca de perfil 21-11", "Somente hoje", até a meia-noite de 21/11).

| Passo | Resultado |
|---|---|
| Perfil A: projeto novo "QA troca de perfil A 21-11", duas linhas digitadas na Ponte | gravadas; uma recarga da página com a gravação na conta pendente é barrada pelo aviso de alterações não salvas do navegador |
| Trocar para o B pelo menu da conta com "Guardando na sua conta…" | o B não tem projeto nenhum: nada do A vazou |
| Perfil B: projeto novo "QA troca de perfil B 21-11", duas linhas digitadas (a segunda logo antes da troca) e, 123 ms depois dela, "Trocar de perfil" pelo menu da conta (por script, para caber no intervalo do salvamento automático) | no instante da troca o selo dizia **"Alterações não salvas"** |
| Perfil A depois da troca | a lista só tem o projeto do A; o projeto do A tem as duas marcas dele e nenhuma do B |
| De volta ao B | o projeto do B tem as duas marcas, inclusive a digitada logo antes da troca, e está guardado na conta do B ("1 projeto guardado na sua conta") |

Conclusão: a gravação pendente vai para o perfil em que nasceu, inteira, e não aparece no outro.
Os dois projetos ficam como evidência. Precisão (revisão do lote 2): só a troca do B para o A
saiu com a gravação local pendente ("Alterações não salvas"); na do A para o B a gravação local já
tinha terminado e só a subida para a conta estava em voo.

**Observação para o lote 3:** uma linha escrita na Ponte fora da função do programa (no topo do
`script.js`) aparece nos blocos como "Código avançado" dentro da área "Enquanto estiver rodando ·
repete sem parar". O código salvo continua no topo (o aviso "Só no Código" diz que o código manda),
mas faltava conferir o que acontece se a criança mexer nos blocos. **Conferido no mesmo dia:** não
repete. O gerador (`generators/js.ts`, `compileBehaviorLoopRoot`) só põe laço nas raízes de tempo
dos motores (Jogo 2D e Jogo 2D Avançado); o código avançado na área roda uma vez, no fim do
programa, e numa regeração entra no envelope da partida com o mesmo efeito (sonda local: o
contador da página ficou em 1).

## Verificar e Enviar com a casca ligada (lote 8, 21/11 à noite)

Lacuna 3 de [`homologacao-a-h.md`](../estudio-evolucao/homologacao-a-h.md): em 20/11 o Verificar e
o Enviar foram conferidos com a casca desligada. Mesma conta da equipe, mesmos apps de staging
(build das 16:24 UTC no Kids), Chrome conectado.

| Aula | Prévia | Verificar projeto | Enviar |
|---|---|---|---|
| Cadê Todo Mundo (adulto), aula 1, parte 4 | "Pré-visualização" no Worker de staging, sem `srcdoc` | **2 de 2 cumpridos**, "Objetivo cumprido!" (o executor rodou o jogo) | "Enviar de novo" → "Projeto enviado! Foi em 21/11/2026, 18:13:39." |
| Desafio do Primeiro Jogo (Kids, perfil Criador(a) "QA troca de perfil 21-11"), aula 1, parte 4 de 6 | a mesma casca, sem `srcdoc` | com o projeto inicial, sem nada feito: **0 de 6**, "Ainda falta um objetivo. Veja a lista e tente de novo." | "Enviar meu projeto" → "Projeto enviado! Foi em 21/11/2026, 18:15:56." |

- A aula 1 do Desafio tem Estúdio em duas partes (manifesto `desafio-dia-1`): a 4, "Faça o
  personagem andar", com 6 objetivos, usada aqui; e a 6, "Mantenha o personagem na tela", usada em
  20/11. Este perfil ainda não tinha passado da parte 4.
- **Não verificado com a casca:** os 6 de 6 do Desafio (montar os blocos pelo Chrome remoto) e o
  "Concluir aula". Os objetivos das aulas protegidas passam no robô das aulas, no CI, com a prévia
  direta.
