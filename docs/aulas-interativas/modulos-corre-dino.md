# Módulos do Corre, Dino!

**Avatares nos vídeos, 10/10/2026:** as 13 aulas receberam 75 participações de Debinha e Dedé, alternando por aula, com Debinha na primeira. Os roteiros distinguem Professora, avatar e Zappy na página; trazem entrada, saída e retomada, mantendo o passo a passo. As falas e âncoras estão na fonte `qa/corre-dino.conteudo.json`, e os três documentos são gerados juntos. Gravação e edição desta versão ainda não confirmadas. [Direção e ordem dos avatares](AVATARES-NOS-VIDEOS.md).

**Revisão de continuidade da conversa, 07/10/2026:** saíram chamados duplos para o mesmo resultado; o leitor de tela e o pulo chamam a escuta; a batida retoma a regra já montada; a publicação espera a confirmação. Fonte, roteiros, manifestos e Mapa da Aventura (56 páginas) atualizados. Os testes editoriais distinguem os chamados de som dos visuais. [Trechos e conferências](qa/revisao-conversa-2026-10-07.md).

**Título do curso:** Corre, Dino!

**Descrição curta:** Construa uma corrida com Dino, cactos, pontos e dificuldade que aumenta.

**Descrição:** Em 13 fases, prepare a tela, faça o Dino pular e coloque cactos na pista. Monte sons, telas de começo e fim, reinício e placar. Depois, varie os obstáculos e ajuste a dificuldade com um limite.

Revisão local de 05/10/2026, com os vídeos de experiência reescritos como demonstração em 06/10/2026: **13 aulas, 81 seções, 76 vídeos planejados, 24 experiências e cinco quizzes**. Os 13 identificadores e os 13 programas originais foram preservados. O [Caderno do Aluno](../../output/pdf/corre-dino-caderno.pdf), que a criança vê como **Mapa da Aventura**, acompanha os roteiros; [fontes e reprodução](recursos/corre-dino/README.md).

**Revisão de 06/10/2026 (vocabulário da aventura).** O que a criança vê ou ouve fala de fase, parte, Mapa da Aventura e guia (Diretrizes, seção 6); chaves, slugs e arquivos não mudaram. Falas, Zappy e Mapa citam **Próxima parte**, **Verificar esta parte**, **Objetivo cumprido!**, **Enviar para o guia** e **Concluir fase**; a ponte da entrega virou conversa e as retomadas usam "Lembra da experiência da parte anterior?". A seção 2 da aula 1 virou **Seu Mapa da Aventura**, com o material **Mapa da Aventura: Corre, Dino!** e as escolhas como convite (ler aqui mesmo ou clicar em **Baixar** para guardar). Nas aulas 6 e 11, a comparação usa um bloquinho no lugar do caderno. O PDF foi gerado de novo, sem "Você não precisa baixar ou imprimir". A descrição do curso diz "Em 13 fases"; atualizar também no admin.

**À noite, a equipe no lugar do guia.** "Enviar para o guia" soava estranho: as 13 entregas citam **Enviar meu projeto**, confirmado em **Enviar**, e "Antes de enviar para o guia" virou "Antes de enviar o seu projeto" (só "Antes de enviar" nas fases 1 e 13, em que a frase vizinha já fala do projeto). Trios e PDF (56 páginas) gerados de novo.

**Revisão de 06/10/2026 (falas que conversam).** As regras das três vozes, da conversa contínua e dos chamados de atenção (Diretrizes, seção 6), já aplicadas ao Cadê e ao Farol, chegaram ao Corre, Dino! antes da gravação. Ids, chaves, fases, partes, vídeos, `completion`, `projectChecks`, nomes de bloco e valores do jogo não mudaram; só falas, pontes, passos do Mapa e notas de tela.

- **Pontes do Zappy:** 80 das 81 abrem com convite: "Sua vez!" nas 24 experiências e no jogo pronto, "Agora…!" nas 37 montagens e "Hora de…!" nos 5 quizzes e nas 13 entregas. A do Mapa segue o modelo aprovado do Cadê ("Este é o seu Mapa da Aventura!"). As 81 terminam na ação de saída: Próxima parte, Verificar esta parte e Próxima parte, ou o envio para o guia e Concluir fase. As dos quizzes dizem o assunto e citam os botões reais do quiz, **Responder!** e **Tentar de novo!** (`kids-quiz.tsx`).
- **Retomadas:** as 30 montagens que aplicam uma experiência começam por "Lembra da experiência…" (nomeando a parte quando ela ficou mais atrás), dizem o que a experiência mostrou, convidam ("Agora a gente vai… no seu jogo!"), pedem um teste no jogo da criança com "Tá vendo?" e o porquê (16) ou, quando o efeito ainda não aparece no jogo, dizem isso com honestidade, depois de "Repare:" (14), e fecham com "Por isso, vamos…".
- **Montagens:** frases ligadas, com o porquê de cada lugar e de cada resultado; "Confira se ficou assim:" em todas; a orientação de deixar o destino à vista ficou numa frase só. Como o Corre usa o encaixe **então** do bloco Se, "então" deixou de ser palavra de ligação em todas as falas (também nas experiências), trocado por "por isso" ou "ou seja". As aberturas impessoais viraram conversa ("Repare: agora que a floresta mostra onde fica a área do jogo, a borda não faz mais falta…").
- **Jogo pronto:** abre com "Oi! Você vai construir um jogo chamado Corre, Dino!", o que acontece e como a partida acaba, e "Antes de montar o seu, vamos ver como ele funciona nesta versão pronta."; "eu aperto a barra de espaço" virou "eu toco na barra de espaço".
- **Achados da revisão:** o único "nós" da fase 8 ("só montamos o desenho") saiu; a comparação da mochila virou "mochila de passeio" com brinquedo; "tarefa" saiu das fases 2 e 13 ("o que fazer e como jogar"); a entrega da fase 13 não repete mais o convite do Mural, que o gerador já acrescenta, e o "uma unidade mais rápido" virou "o sorteio ainda pode tirar mais 1 e deixar um cacto um pouquinho mais rápido".
- **Fase 7:** nas partes 3, 4 e 5, a troca temporária para jogando continua (é o único jeito de testar a partida), mas a volta para inicio ficou num passo próprio, o último antes de verificar: "Antes de verificar, troque o estado em Ao iniciar de volta para inicio, porque…", seguido do efeito que a criança vê (revisão independente abaixo).
- **Notas de tela das montagens:** pedem o teste da retomada antes de qualquer bloco, o resultado à vista no "Tá vendo?", o apontamento em cada "Olha aqui", "Olha só" ou "Repare" e, na fase 7, o estado de volta em inicio antes de verificar.
- **Mapa da Aventura:** a página de abertura fala com a criança e oferece ler na fase ou clicar em **Baixar** como convite; os passos das montagens acompanham as falas novas. O PDF foi gerado de novo: 59 páginas (eram 52) e os mesmos 145 blocos, com fontes, cores e limites conferidos.
- **Guardas:** `qa/corre-dino.test.ts` passou a exigir a abertura nova, o convite e a saída de cada ponte, a retomada conversada, a ausência de "então" de ligação, de "nós" e de travessão, a volta para inicio da fase 7 e a régua de palavras da escola ampliada (unidade, atividade, entrega, trabalho, estudar, devolutiva, formatura, diploma e tarefa).

**Revisão independente de 06/10/2026 (verdade sobre o jogo e rótulos).** Cada "Tá vendo?", "Olha só:" e "Repare:" foi conferido contra o projeto de cada parte, os valores de fábrica dos blocos, o motor do Jogo 2D e as cenas. Mudaram falas, pontes, passos do Mapa, notas de tela, alguns rótulos de critério e dois critérios; programas, ids, partes e vídeos não mudaram.

- **Fase 3, gravidade:** "Aplicar a gravidade" só muda a velocidade; quem move o Dino e faz ele pousar na grama é **Controlar o dinossauro** (`runtime/physics.ts`, `runtime/arcadeKitsDino.ts`). O título da parte, a ponte e a fala deixaram de prometer "o Dino desce até o chão" (a parte agora se chama **Deixe a gravidade pronta**, com a mesma chave): a gravidade fica pronta e o efeito aparece com o controle, na parte seguinte. A ordem do quadro explica que o controle move o Dino, pousa na grama e confere o pulo.
- **Toque:** o toque só faz o Dino pular na parte de cima da tela; embaixo, perto do chão, ele se abaixa. Falas, pontes, Mapa e a instrução do jogo pronto dizem "um toque na parte de cima da tela".
- **Tecla:** clicar na área do jogo já é um toque e começa a partida. Os testes por tecla usam **Atualizar**, que dá o foco ao jogo, e a tecla sem clicar no jogo.
- **Rótulos como estão na tela:**
  - o + que cria um ramo é o de **senão se** (o de **senão** cria o ramo sem pergunta);
  - o sorteio é **um número de 1 a 6**, em Jogo 2D → Sorteios → Números e posições;
  - a conta aparece como **0 + 0** ("Conta matemática" é nome do catálogo do admin);
  - o campo do obstáculo é **vx**;
  - a colisão tem **chamar o sprite de** (chega com inimigo);
  - a limpeza do grupo tem **(chamado sprite)**, trocado por cacto;
  - na cena da condição, o botão é **Toque para começar**;
  - na cena da batida, o aviso é **BATEU!**.
- **Valores de fábrica ditos:**
  - a tela chega com 800 e 480;
  - o Dino chega em x 120;
  - a floresta chega com velocidade 4 (o critério exige 5);
  - o controle chega com força 15;
  - o placar já traz Pontos:, x 12, y 30 e tamanho 24;
  - o sinal da comparação já é >;
  - o estado chega como inicio;
  - a tremida já é 8.
- **Descrições:** a ponte e a fala ditam a frase exata, "sem ponto no fim", porque o critério compara o texto inteiro.
- **Fase 7:** as partes 3 e 4 também conferem `cena-inicial`. A ponte da parte 3 pede o estado em inicio. A volta para inicio diz o efeito visível ("só a floresta continua passando") no lugar de "Confira se o estado voltou". A frase da floresta na entrega foi para depois da volta.
- **Fórmula:**
  - o lembrete de arrastar um espaço vazio ficou só na primeira montagem e na fase 7;
  - os "Repare:" que apontavam o invisível viraram teste com "Tá vendo?";
  - o "Repare:" da pergunta x > 0 aparece uma vez;
  - as retomadas variam o convite e o anúncio;
  - o teste passou a exigir convite, porquê e anúncio, sem frase fixa.
- **Outros:**
  - a sombra do Dino escurece sem a limpeza (conferir na gravação);
  - a retomada da fase 5 deixou de citar um grupo que a cena não mostra;
  - as raias da fase 12 mostram −5 e −6, não a conta;
  - a fase 13 não tem mais "mexa e veja" dentro da entrega;
  - os rótulos de critério "faxina" e "andar de fim" viraram o que a fala diz.
- **Exceção registrada, "Aperte" e "apertando":** os textos que a criança escreve no próprio jogo continuam com essas palavras, e as falas os ditam como estão: "Corra com o dino e pule os cactos apertando espaço", "Aperte qualquer tecla ou toque na tela para começar" e "Aperte qualquer tecla ou toque para jogar de novo". São textos do jogo original, exigidos pelos critérios e pelos 13 programas preservados. A regra de não usar "aperte" vale para as instruções da narração, que continuam com "clique em" para botões e "toque" no jogo.
- **Pendente fora destes arquivos:** na cena da variável (fase 11), cada mudança da caixa explode um cacto-alvo, um desenho que não combina com o Corre, Dino!, onde o ponto vem do tempo. A fala agora descreve o que a cena mostra, mas o desenho é da cena.
- **PDF:** gerado de novo, com 58 páginas e os mesmos 145 blocos; fontes, imagens, cores e limites conferidos pelo gerador. A inspeção visual continua pendente.

**Retomadas curtas e conferência depois do teste (06/10/2026, à noite, pedido da dona).** As 30 retomadas seguem a ordem nova: o teste no jogo da criança com "Tá vendo?" e o porquê, a lembrança da experiência numa frase e o anúncio uma vez só, colado ao primeiro passo; as 5 sem efeito visível (criar-dino, aplicar-gravidade, grupo-e-relogio, faxina e o relógio da fase 7) ficam só com a lembrança e o anúncio. Mediana de 72 para 48 palavras, máximo de 106 para 50. Em 26 montagens a lista dos blocos entra uma vez, depois do teste ("Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: …"); nas 11 sem teste visível, "Confira se ficou assim:" continua logo depois da montagem. O Mapa ficou com 56 páginas e os mesmos 145 blocos. O teste do curso trava o teto de 50 palavras por retomada e uma lista de conferência por montagem.

Pendente: gravar os vídeos com as falas novas, importar os 13 manifestos no admin e anexar o PDF novo.

## Módulo 1 — O Dino ganha vida

**Resumo:** Prepare a tela e faça o Dino aparecer, cair e pular com som.

| Aula | Resultado | Seções | Identificador |
| --- | --- | ---: | --- |
| 1. [Prepare a tela e crie o Dino](aulas/corre-dino-aula-01.md) | Tela 480 × 270, borda e Dino criado, ainda sem desenho. | 10 | `aula-01` |
| 2. [Mostre o Dino e a floresta](aulas/corre-dino-aula-02.md) | Desenho por quadro, limpeza, floresta e descrição acessível. | 9 | `aula-02` |
| 3. [Faça o Dino cair e pular](aulas/corre-dino-aula-03.md) | Gravidade e controles de pulo; primeira revisão. | 6 | `aula-03` |
| 4. [Toque um som em cada pulo](aulas/corre-dino-aula-04.md) | Som ligado ao pulo que aconteceu. | 4 | `aula-04` |

## Módulo 2 — Da corrida ao jogo inteiro

**Resumo:** Crie e mova os cactos, separe a abertura da partida e programe a derrota e o recomeço.

| Aula | Resultado | Seções | Identificador |
| --- | --- | ---: | --- |
| 5. [Faça os cactos entrar na pista](aulas/corre-dino-aula-05.md) | Grupo, nascimento por intervalo, movimento e desenho. | 6 | `aula-05` |
| 6. [Retire os cactos que saíram](aulas/corre-dino-aula-06.md) | Limpeza do grupo; revisão de som e obstáculos. | 4 | `aula-06` |
| 7. [Separe a abertura da partida](aulas/corre-dino-aula-07.md) | Estados e condições no quadro e no relógio dos cactos. | 5 | `aula-07` |
| 8. [Comece por tecla ou toque](aulas/corre-dino-aula-08.md) | Tela de início e entrada para começar a partida. | 4 | `aula-08` |
| 9. [Termine e recomece a corrida](aulas/corre-dino-aula-09.md) | Batida, efeitos, tela de fim e reinício; revisão do ciclo. | 8 | `aula-09` |

## Módulo 3 — Pontos e dificuldade

**Resumo:** Ajuste a área da batida, conte pontos e varie o lugar e a velocidade dos cactos.

| Aula | Resultado | Seções | Identificador |
| --- | --- | ---: | --- |
| 10. [Ajuste a área da batida](aulas/corre-dino-aula-10.md) | Área menor sem mudar o desenho; contorno de teste retirado. | 5 | `aula-10` |
| 11. [Conte e mostre os pontos](aulas/corre-dino-aula-11.md) | Memória, placar, soma por tempo e resultado final; revisão. | 8 | `aula-11` |
| 12. [Varie o lugar e a velocidade dos cactos](aulas/corre-dino-aula-12.md) | Sorteio de posição e de variação na velocidade. | 4 | `aula-12` |
| 13. [Aumente a dificuldade com um limite](aulas/corre-dino-aula-13.md) | Velocidade base variável, condição de limite, descrição completa e revisão final. | 8 | `aula-13` |

## Aplicação das diretrizes

Pré-requisitos: ler instruções curtas, usar teclado ou toque e acompanhar os encaixes guiados. Cadê Todo Mundo? e A Chave do Farol ajudam, mas a montagem não pressupõe lembrar os nomes dos blocos ou os caminhos da paleta. Programação e Jogo 2D ficam disponíveis conforme as peças de cada etapa.

A abertura jogável e a apresentação do caderno estão na primeira aula, junto da construção. Jogar pede participação, sem recorde obrigatório. O caderno é uma consulta opcional, fora da conclusão; a fala o apresenta como o Mapa da Aventura da criança e oferece ler na fase ou baixar para guardar como convite.

A primeira aula começa com o projeto vazio e termina com a tela preparada e o Dino criado. A experiência de criação e desenho explica antes da montagem por que esse objeto ainda não aparece. A aula 2 faz o desenho: não se muda o marco original nem se apresenta a invisibilidade como defeito misterioso. Nas demais aulas, continuar o próprio projeto enviado. O projeto inicial é alternativa quando não houver envio anterior.

Cada conceito novo tem experiência antes da primeira aplicação. As 24 experiências usam cenas existentes: uma vez e sempre; tamanho; coordenadas; criação e desenho; quadros e limpeza; camadas; descrição acessível; gravidade; impulso; acontecimento; som; intervalo; direção da velocidade; limpeza de grupo; estado; entrada; contato; reinício; área da batida; variável; ritmo dos pontos; sorteio; números negativos; base e velocidade recebida ao nascer. Não há palpite obrigatório nem pergunta final automática repetida.

Desde a revisão de 06/10/2026, os vídeos das 24 experiências e o do jogo pronto são demonstrações. A primeira frase diz o conceito ("Esta é uma experiência para a gente entender…"; nas aulas 4 e 10, onde a cena volta, "Esta é a mesma experiência…"). A partir de "Olha aqui:", o narrador faz os testes na primeira pessoa, mostra o resultado real conferido no motor e liga cada um ao bloco que será montado. Só no fim ele passa a vez. O jogo pronto mostra um exemplo só, sem jogar a partida até o fim. As instruções das experiências, a ponte do Zappy, as montagens e o Caderno do Aluno continuam no imperativo. A entrega da aula 13 comemora a publicação e convida a mandar o link com **Copiar link de jogar**. Detalhes no [registro de revisão](qa/revisao-corre-dino-2026-10-05.md).

A montagem retoma a experiência, situa o que falta no próprio jogo e localiza o destino antes de buscar a peça. Preparar, desenhar, limpar, controlar, ouvir um evento e mudar um estado ficam em seções próprias. Comparações entre comportamentos acontecem nas experiências; o projeto não precisa receber uma montagem sabidamente errada para depois ser corrigida.

Os roteiros usam os caminhos e nomes atuais do Estúdio, inclusive **Mostrar a caixa de colisão do sprite** e **Aplicar a gravidade do mundo ao sprite**. A descrição acessível, já presente no programa original, agora é ensinada na aula 2 e completada na aula 13. O compartilhamento final é opcional e ensina o caminho inteiro. A demonstração de Ponte foi retirada porque este curso trabalha no modo de blocos.

Cinco revisões curtas, nas aulas 3, 6, 9, 11 e 13, retomam o que foi montado e testado. Cada seção contém apenas Zappy → quiz, com explicação após responder, acerto de todas as questões e novas tentativas sem limite nem espera. Essa política também precisa estar configurada no admin.

As etapas de montagem terminam em **Verificar esta parte → correção, se necessária → Objetivo cumprido! → Salvo → Próxima parte**. A entrega final acrescenta **Enviar meu projeto → Enviar → Concluir fase**. Publicar no Mural não é condição de conclusão.

## Continuidade do jogo

`qa/corre-dino-projetos-qa.ts` permanece intacto como referência independente. `qa/corre-dino-etapas.ts` prepara o projeto vazio e os 13 marcos originais para os manifestos. Não foram criadas aulas novas nem renumerados os slugs. A cadeia continua `corre-dino`, com Jogo 2D disponível e somente o modo de blocos.

Valores de referência preservados: tela 480 × 270; Dino em (110, 150), tamanho 64; borda provisória 4; floresta 5; pulo 14; cactos a cada 1,4 segundo, tamanho 44 e velocidade inicial −5; estados inicio, jogando e fim; tremor 8; área de colisão 80%; pontos preparados em 0 e somados a cada segundo de partida; placar em (12, 30), tamanho 24; x sorteado entre 500 e 560; variação de velocidade de 0 a 1; base −5, reduzida a cada 5 segundos enquanto maior que −9. O limite vale para a base: o sorteio ainda permite um cacto com velocidade −10. Cada cacto conserva o valor recebido ao nascer.

As escolhas de cores e os ajustes previstos pelos critérios continuam disponíveis. A referência serve para conferir a continuidade, não para substituir o projeto personalizado de quem faz o curso.

## Produção e aplicação no admin

1. Exportar a versão atual e conferir IDs, ordem, mídias, projetos enviados e conclusões. Atualizar as 13 aulas existentes pelos slugs preservados; manter um slug não garante sozinho preservar todo o progresso de uma reimportação.
2. Reconciliar seções e `retireBlockKeys`, preservando o histórico de vídeos e envios. Conferir o acesso de quem está em andamento e de quem já concluiu; evitar refazer uma etapa apenas por mudança editorial.
3. Gravar os 76 roteiros e vincular as mídias revisadas. `plannedVideo` não substitui nem publica a gravação antiga.
4. Hospedar o único PDF e anexá-lo à seção 2 da aula 1. `materials.items` fica vazio até existir um arquivo hospedado; o manifesto não inventa uma URL.
5. Configurar **videoBeforeActivity = true** e tentativas ilimitadas dos quizzes, sem espera. A ordem editorial não configura essas opções automaticamente.
6. Conferir com perfil de aluno novo e em continuidade: assistir, experimentar, montar, verificar, enviar, confirmar, reabrir o projeto, avançar e compartilhar opcionalmente. Ensaiar com crianças para ajustar linguagem e ritmo de gravação.

Esta entrega prepara os materiais locais. Gravação, vínculo das mídias, aplicação no admin e ensaio com crianças são etapas de produção pendentes. O [registro de revisão](qa/revisao-corre-dino-2026-10-05.md) reúne as evidências e os limites da verificação.

## Conferência local

```powershell
bun docs/aulas-interativas/qa/gerar-corre-dino.ts
bun docs/aulas-interativas/qa/validar-manifestos.ts corre-dino
python -X utf8 docs/aulas-interativas/validar-roteiros.py corre-dino
bun test docs/aulas-interativas/qa/corre-dino.test.ts
python -X utf8 docs/aulas-interativas/recursos/corre-dino/gerar-materiais.py
```

Executar o teste `src/blockly/__tests__/correDinoEditorial.test.ts` de dentro de `packages/studio`, com seu preload. Ele cobre a compilação e execução dos 13 marcos, controles, colisão, pontos, estados, reinício e dificuldade.
