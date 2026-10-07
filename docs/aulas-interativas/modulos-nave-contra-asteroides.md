# Nave Contra Asteroides

**Revisão de continuidade da conversa, 07/10/2026:** os testes vêm antes de comentar seus resultados; som, desaparecimento da tela e retirada do grupo têm falas distintas. A publicação espera a confirmação antes da comemoração. Fonte, roteiros, manifestos e Mapa da Aventura (39 páginas) atualizados. [Trechos e conferências](qa/revisao-conversa-2026-10-07.md).

**Título do curso:** Nave Contra Asteroides

**Descrição curta:** Monte um jogo de nave com tiros, asteroides, pontos, três vidas e uma partida que você pode recomeçar.

**Descrição:** Primeiro, jogue uma versão pronta para conhecer a nave e os controles. Depois, construa seu jogo em nove fases: faça a nave aparecer e se mover, programe os tiros, crie os asteroides e os acertos, conte pontos e cuide das vidas. No final, coloque as telas de abertura, vitória e derrota e programe Enter para jogar outra vez. Cada fase traz os passos de montagem, testes no jogo e orientações para corrigir o que não funcionar. Você pode consultar o Mapa da Aventura sempre que precisar e compartilhar seu jogo no Mural quando quiser.

## O que consultar para executar

- **Sequência e implantação:** este documento.
- **Gravação:** o `.roteiro.md` da aula, ao lado de sua proposta. As falas do Zappy identificadas como texto da página não são gravadas.
- **Montagem no admin:** o `.manifesto.json` correspondente. Os vídeos ainda são moldes `plannedVideo`.
- **Revisão de texto ou estrutura:** `qa/nave-contra-asteroides.conteudo.json`; depois executar `bun docs/aulas-interativas/qa/gerar-nave-contra-asteroides.ts`. Os nove trios são derivados dessa fonte única.
- **Material de consulta:** [Caderno do Aluno](../../output/pdf/nave-contra-asteroides-caderno.pdf), que a criança vê como **Mapa da Aventura**, apresentado na seção 2 da primeira aula. Geração e conferência em [recursos/nave-contra-asteroides](recursos/nave-contra-asteroides/README.md).

## Módulo 1 · A nave e seus controles

**Resumo:** Faça a nave aparecer, mova com as setas e programe os tiros para sair dela.

| Ordem | Aula | Resultado | Identificador |
| --- | --- | --- | --- |
| 1 | [Faça a nave aparecer](aulas/nave-contra-asteroides-primeira-nave.md) | Tela preparada e nave visível, ainda parada. | `primeira-nave` (novo) |
| 2 | [Mova a nave pelo espaço](aulas/nave-contra-asteroides-dia-1.md) | Setas, limpeza, limites e estrelas. | `dia-1` (preservado) |
| 3 | [Faça a nave atirar](aulas/nave-contra-asteroides-dia-2.md) | Disparo, movimento, desenho e limpeza dos tiros. | `dia-2` (preservado) |

## Módulo 2 · Asteroides, pontos e vidas

**Resumo:** Coloque as pedras no jogo, programe os acertos, conte pontos e dê três vidas à nave.

| Ordem | Aula | Resultado | Identificador |
| --- | --- | --- | --- |
| 4 | [Faça os asteroides cair](aulas/nave-contra-asteroides-chuva-de-asteroides.md) | Intervalo de 40 quadros, sorteio de x e queda das pedras. | `chuva-de-asteroides` (novo) |
| 5 | [Faça o tiro acertar o asteroide](aulas/nave-contra-asteroides-dia-3.md) | Retirada do par envolvido, explosão e som. | `dia-3` (preservado) |
| 6 | [Conte os acertos](aulas/nave-contra-asteroides-pontos.md) | Um ponto por acerto, mostrado no placar. | `pontos` (novo) |
| 7 | [Dê três vidas à nave](aulas/nave-contra-asteroides-dia-4.md) | Dano, proteção temporária e corações. | `dia-4` (preservado) |

## Módulo 3 · Uma partida completa

**Resumo:** Faça o jogo esperar Enter, reconhecer vitória e derrota e preparar uma nova partida.

| Ordem | Aula | Resultado | Identificador |
| --- | --- | --- | --- |
| 8 | [Comece a partida com Enter](aulas/nave-contra-asteroides-comecar-partida.md) | Abertura e partida; tiros e pedras só são criados em jogando. | `comecar-partida` (novo) |
| 9 | [Termine e recomece a partida](aulas/nave-contra-asteroides-dia-5.md) | Meta de 26, finais, reinício, revisão e publicação opcional. | `dia-5` (preservado) |

## Decisões pedagógicas

Curso normal, sem calendário de dias ou promessa de prazo. As nove aulas têm 52 seções e 48 vídeos planejados. A divisão acompanha resultados do jogo; a quantidade de seções varia conforme as experiências e montagens necessárias. A duração depende da montagem e dos testes, sem obrigação de terminar tudo em uma sessão.

Pré-requisitos: conseguir usar o teclado e seguir os encaixes guiados. Ter feito Cadê Todo Mundo? e A Chave do Farol ajuda, mas os passos não pressupõem lembrar uma peça ou um menu. A paleta fica em Áreas do projeto, Programação e Jogo 2D, com os tipos necessários até cada etapa. Nenhum HTML, CSS, modo de código ou ferramenta nova entra como requisito.

O primeiro projeto está vazio, com Jogo 2D disponível. Os blocos já oferecem os desenhos e efeitos; a pessoa monta as regras. Nas aulas seguintes, continuar o próprio projeto enviado. O projeto inicial do manifesto só serve de alternativa se não houver envio anterior. A abertura jogável usa o jogo original completo e pede participação, sem exigir vitória.

As 19 experiências reaproveitam cenas existentes e antecedem a primeira aplicação dos conceitos: preparação e repetição; coordenadas; criação e desenho; atualização por quadro; movimento e velocidade; limite; camadas; evento; posição fixa ou lida; direção da velocidade; limpeza de grupo; intervalo; sorteio; par da colisão; variável; preparação das vidas; proteção; estado e reinício. Cada uma orienta todos os testes necessários, sem palpite obrigatório nem pergunta final repetida. A cena de movimento originalmente criada para o Farol agora também representa a nave, com o mesmo motor e os mesmos controles.

Desde 06/10/2026, o vídeo de cada experiência é uma demonstração. A primeira frase diz o conceito ("Esta é uma experiência para a gente entender…", ou "Esta é a mesma experiência…" quando a cena volta com outra meta). Depois de "Olha aqui:", o narrador faz os testes na primeira pessoa, mostra o resultado real conferido no motor da cena e explica por que ele aconteceu, ligando-o ao bloco da montagem. Quando ajuda, há uma comparação com o dia a dia e um meme ilustrado nosso descrito na nota de tela. Só no fim vem "Agora é a sua vez". O vídeo do jogo pronto segue o mesmo raciocínio, com um único gesto de exemplo. Os passos para a criança continuam no imperativo nas instruções da experiência, na ponte do Zappy, nas montagens e no caderno.

A limpeza da imagem retoma a experiência de desenho da primeira aula em uma montagem própria; a limpeza do grupo é outra ideia e tem sua própria experiência na aula dos tiros. A preparação das vidas e a colisão da nave também têm montagens separadas. Nas retomadas, a fala localiza a experiência, mostra o que ainda falta no próprio jogo e só então orienta os encaixes, com o destino visível antes de buscar cada peça. Nas aulas finais, a comparação com a meta aplica variável, leitura e condição já trabalhadas; a constante é apresentada como o valor da meta que permanece igual durante a partida.

Há quatro revisões curtas, nas aulas 2, 5, 7 e 9. Retomam ideias já montadas e testadas, distribuídas ao longo deste curso maior. Cada seção contém somente Zappy → quiz, com explicação após o envio, acerto de todas as questões e tentativas ilimitadas sem espera. Configurar também as tentativas no admin; o manifesto não define essa política global sozinho.

Cada seção com critérios termina em **Verificar esta parte**, correção se necessária e **Objetivo cumprido!**. A entrega termina em **Salvo → Enviar meu projeto → Enviar → Concluir fase**. A última aula ensina a publicação completa, opcional, depois do envio: o resumo já vem preenchido, e a comemoração do Mural convida a copiar o link de jogar e mandar para a família e os amigos antes de Fechar. O caderno (o **Mapa da Aventura**, para a criança) fica em um único bloco de materiais; ler na fase e baixar são convites, sem exigência para concluir.

## Continuidade do código

`qa/nave-contra-asteroides-projetos-qa.ts` permanece como referência original, sem alterações. Os resultados das aulas 2, 3, 5, 7 e 9 correspondem exatamente aos seus cinco marcos. `qa/nave-contra-asteroides-etapas.ts` deriva quatro estados intermediários, retirando comandos ainda não ensinados. A saída de cada aula é a entrada preparada da seguinte.

Valores finais preservados: tela 800 × 480; nave em (400, 410), tamanho 54 × 62, velocidade 7; estrelas 1; tiro com raio 5, vx 0, vy -9, centro x e posição y da nave; asteroides a cada 40 quadros, x sorteado, y -30, tamanho 40, vx 0, vy 3; um ponto por acerto; três vidas, dano 1, proteção 45 e tremor 8; alvo 26; estados inicio, jogando, vitoria e fim. A derrota é verificada depois da vitória, preservando o comportamento original em empate no mesmo quadro. Cores continuam personalizáveis.

## Aplicação no admin

Os nomes visíveis são os títulos das aulas. Os cinco slugs antigos continuam como identificadores técnicos das aulas existentes; não são divisão pedagógica por dias. Todos os projetos mantêm a cadeia `nave-contra-asteroides`.

1. Exportar a versão atual e conferir IDs, ordem, vídeos, envios e conclusões. Manter slugs não garante, sozinho, preservar progresso em andamento numa reimportação.
2. Criar somente os quatro destinos novos e ordenar as nove aulas conforme as tabelas. Não recriar as cinco existentes nem substituir destinos do Desafio. Reconciliar materiais movidos e `retireBlockKeys`, preservando histórico de mídias e envios.
3. Preservar conclusões e conquistas anteriores. Para quem concluiu os marcos antigos, as aulas inseridas detalham conteúdo já coberto: conferir acesso à continuação e não exigir refazê-lo por efeito da nova ordem. Para quem está em andamento, conferir o projeto salvo antes de retomar.
4. Gravar os roteiros e vincular as mídias revisadas. `plannedVideo` não publica uma gravação. Anexar o caderno na primeira aula, seção 2; `materials.items` fica vazio até haver arquivo hospedado, sem URL inventada.
5. Configurar **videoBeforeActivity = true** nesta proposta e conferir com perfil de aluno. A ordem editorial não configura essa opção automaticamente.
6. Conferir uma pessoa nova e outra em continuidade: abrir, assistir, experimentar, montar, verificar, enviar, confirmar, reabrir o mesmo projeto, avançar e publicar opcionalmente. Ensaiar com crianças para ajustar ritmo, linguagem e duração.

Esta entrega altera materiais locais. Gravação, vínculo das mídias e aplicação no admin são etapas de produção; a revisão não declara o curso publicado nem a compreensão infantil validada.

Registro da retomada e das verificações: [revisão de 05/10/2026](qa/revisao-nave-2026-10-05.md), com a nota da revisão de 06/10/2026.

## Revisão de 06/10/2026 (vocabulário da aventura)

A pedido do responsável e registrada nas [Diretrizes Pedagógicas](DIRETRIZES-PEDAGOGICAS.md), seção 6: tudo o que a criança vê ou ouve fala de aventura, fase, parte, Mapa da Aventura e guia. Por dentro, nada mudou: slugs, chaves (inclusive `video-seu-caderno-do-aluno` e `caderno`), nomes de arquivo e projetos continuam iguais. Os vídeos revisados ainda não foram gravados, então a gravação já usa as falas novas.

**À noite, a equipe no lugar do guia.** "Enviar para o guia" soava estranho: as entregas citam **Enviar meu projeto**, confirmado em **Enviar**, e as nove pontes de envio dizem "envie o seu projeto". Trios e PDF (39 páginas) gerados de novo.

- **Botões:** as falas, as pontes do Zappy e as notas "Na tela" citam **Próxima parte**, **Verificar esta parte**, **Objetivo cumprido!**, **Enviar para o guia** e **Concluir fase**. O gerador acrescenta as fórmulas comuns aos cursos: "Quando aparecer Objetivo cumprido!, espere aparecer Salvo. Depois, clique em Enviar para o guia e confirme em Enviar." e "Quando o envio terminar, clique em Concluir fase."
- **Retomadas:** "Lembra da experiência da parte anterior?"; as experiências que voltam dizem "da primeira fase" ou "da primeira parte desta fase".
- **Mapa da Aventura:** a seção 2 da primeira aula virou **Seu Mapa da Aventura**, e o material, **Mapa da Aventura: Nave Contra Asteroides**. O vídeo diz "Olha aqui: este é o seu Mapa da Aventura!" e oferece ler aqui mesmo ou clicar em **Baixar** para guardar; saiu o "Não precisa fazer isso agora". No PDF, capa e rodapé dizem Mapa da Aventura, os capítulos são Fase 1 a Fase 9 e a primeira página convida a ler na fase ou baixar para guardar, no lugar de "Você não precisa baixar ou imprimir".
- **Comparações:** "apresentação da escola" virou "apresentação de teatro para a família"; "lista de chamada da escola", "lista de convidados de uma festa"; "anotar num caderno", "anotar num bloquinho". Os memes descritos nas notas de tela acompanham.
- **Convite:** no jogo pronto, "Você não precisa ganhar para continuar" virou "Você pode continuar mesmo sem ganhar".
- **Três vozes:** "precisamos desenhá-lo" virou "a gente precisa desenhá-lo"; "ainda não programamos o acerto", "você ainda não programou o acerto"; "Ainda não montamos o encerramento", "Você ainda não montou o encerramento"; e o "No nosso jogo" dos bastidores, "Aqui".

## Revisão de 06/10/2026 (três vozes e conversa contínua)

A pedido do responsável, as regras de fala das [Diretrizes Pedagógicas](DIRETRIZES-PEDAGOGICAS.md), seção 6 ("Três vozes", "Toda fala conversa com a criança", "A fala é uma conversa contínua"), já aplicadas ao Cadê Todo Mundo? e à Chave do Farol, entraram na Nave. A fonte é `qa/nave-contra-asteroides.conteudo.json`; os nove trios e o PDF foram regenerados. Ids, chaves, estrutura (9 fases, 52 partes, 48 vídeos), `completion`/`projectChecks`, nomes de bloco e valores do jogo não mudaram. Nenhum vídeo tinha sido gravado.

- **Abertura do jogo pronto:** "Oi! Você vai construir um jogo chamado Nave Contra Asteroides. Nesse jogo, a nave atira nas pedras que caem do espaço, e cada acerto vale um ponto. Você ganha ao chegar a 26 pontos e perde se as três vidas acabarem. Antes de montar o seu, vamos ver como ele funciona nesta versão pronta." Números conferidos no projeto final (constante alvo 26, três vidas, Somar 1 por acerto). No gesto de exemplo, "aperto Enter" virou "toco em Enter".
- **Pontes do Zappy (52):** começam convidando ("Sua vez!" depois da demonstração; "Agora…!" ou "Hora de…!" antes da montagem e do quiz) e terminam na saída real: "Quando terminar, clique em Próxima parte."; "…clique em Verificar esta parte. Depois, clique em Próxima parte."; ou "…clique em Verificar esta parte e envie o projeto para o guia. Depois, clique em Concluir fase.". A ponte do Mapa repete a aprovada no Cadê e no Farol ("Este é o seu Mapa da Aventura!"). As pontes dos quatro quizzes dizem o que vai ser retomado.
- **Retomadas (17):** seguem o modelo do Cadê: "Lembra da experiência da parte anterior? [o que ela mostrou, com o porquê]. Agora a gente vai fazer isso no seu jogo! Primeiro, [teste no jogo da pessoa]. Tá vendo? [o que acontece], porque [motivo]. Por isso, vamos [o que vai montar]." Em Crie a nave nos bastidores, a criação não aparece na tela: a retomada só lembra a experiência e avisa que a tela continua vazia, sem inventar teste. A limpeza do rastro diz "Lembra da experiência da primeira fase, em que você comparou o desenho no começo e em cada quadro?".
- **Montagens (27):** imperativo com conversa. Cada passo diz o porquê do lugar e do valor ("A limpeza tem que acontecer no começo de cada quadro, antes de tudo. Por isso, …"), mantém o destino à vista antes da peça, o caminho completo da paleta ("Abra Jogo 2D, depois Grupos e depois Movimento"), o nome literal do bloco, "Confira se ficou assim:" e a fórmula de verificação. As falas passaram a dizer o que já vem no bloco, conferido no código: o grupo nasce como asteroides (troque por tiros no grupo dos tiros), a variável como contador, a constante como PI, A cada quadros com 30, o Se com a pergunta x maior que 0 (vai para a lixeira do espaço dos blocos, também nos ramos de senão se), e placar, corações, dano, proteção e tremor já com os valores da Nave. As aberturas impessoais ("O evento já cria tiros.", "A abertura já aparece, mas…", "Vamos mostrar uma tela…") viraram chamados a partir do jogo da pessoa ("Repare: quando você toca na barra de espaço, dá para ouvir o som do tiro, mas nenhum tiro aparece. É que…"). O parágrafo genérico "Se o lugar do encaixe estiver fora da tela…" entrou no primeiro destino de cada montagem, como no Farol.
- **Chamados de atenção:** "Olha aqui:", "Olha só:", "Repare:" e "Tá vendo?", um por momento importante, também nas experiências, que continuam abrindo pelo conceito, com um único "Olha aqui:", narrador na primeira pessoa e o mesmo fecho.
- **"Então":** neste curso é o encaixe do bloco Se. As quatro ocorrências como palavra de ligação (Mapa, duas experiências e a montagem do relógio e do tiro) viraram "por isso".
- **Achado M1 (fase 4, parte 5):** a entrega mandava trocar 40 por 80 e voltar para 40, e a verificação exige A cada 40 quadros. A parte virou **Teste e envie a sua chuva de pedras**, só com o teste do jogo inteiro (pedras a cada 40 quadros com vy 3, setas e tiros) e sem troca de valores.
- **Achado B4 (fase 9, parte 4):** "Vamos manter essa parte." ficou ambíguo depois que parte passou a ser a seção. Agora: "A condição dentro dele já começa a partida quando o estado é inicio, e esse pedaço fica como está."
- **Publicação e jogo pronto:** "Publicar no Mural é opcional" virou convite ("Agora, se quiser, você pode mostrar o seu jogo no Mural, ou deixar para outra hora."), e a instrução do jogo pronto passou a dizer "toque em Enter" e "clique em Próxima parte". Nas perguntas da fase 9, "apertou Enter" virou "tocou em Enter". "Aperte Enter para começar" e "Aperte Enter para voltar ao início" continuam: são os textos que a própria criança escreve nas telas do jogo e que a verificação confere.
- **Mapa da Aventura:** a primeira página abre com "Este é o seu Mapa da Aventura! Consulte quando precisar de um passo, um valor ou um teste: você pode ler aqui na fase ou baixar para guardar."; o restante fala do "seu jogo" (registro em [recursos/nave-contra-asteroides](recursos/nave-contra-asteroides/README.md)). O PDF foi de 33 para 41 páginas.
- **Teste do curso:** `qa/nave-contra-asteroides.test.ts` exige a abertura nova e ganhou a régua: pontes com convite e saída, as 17 retomadas com "Agora a gente vai … no seu jogo!" e o teste com "Tá vendo?" e o porquê, nenhum "então" de ligação, nenhum "aperte" e as correções M1 e B4.

Antes e depois, pela mesma contagem: pontes com convite, 0 → 51 de 52 (mais o Mapa, igual ao aprovado); pontes que terminam na saída, 6 → 52; retomadas com "Tá vendo?", 0 → 16 de 17 (a da criação é o efeito invisível); montagens com porquê, 3 → 27; "Tá vendo?" 0 → 35, "Olha só" 0 → 31, "Repare" 0 → 28 (contados na fala gravada, sem as notas de tela); parágrafos com três ou mais frases curtas seguidas (até 8 palavras cada), 11 → 0.

**Revisão independente, fim de 06/10/2026.** Um revisor conferiu cada "Tá vendo?", "Repare:" e "já vem" contra o projeto de cada parte, os blocos do Estúdio e as cenas, e as correções entraram na fonte:

- **Som do disparo:** o menu de Tocar efeito tem "tiro" (o laser) e "tiro grande" (o disparo do jogo original, que a verificação confere). A fala, o "Confira se ficou assim", os três rótulos de critério e os dois esquemas do Mapa diziam "tiro" e levavam a criança a reprovar no Verificar; agora dizem "tiro grande".
- **O + do senão se:** a linha de baixo do Se é "+ senão se + senão", e "o + ao lado de senão se" podia ser o do senão. As falas dizem "o + que fica antes de senão se", e as notas de tela pedem para apontar os dois.
- **Retomada da limpeza dos tiros:** "a tela não mostra o grupo" virou "Os tiros somem lá em cima, mas continuam guardados no grupo, como na experiência".
- **Nomes:** "área de montagem" virou "espaço dos blocos", o nome que o Farol usa e que não se confunde com Áreas do projeto nem com a área do jogo. Os pedidos da experiência Reiniciar trocaram "aperte Enter" por "clique em Apertar Enter".
- **Menos fórmula:** "Se esse lugar não estiver aparecendo…" ficou só na primeira montagem e na criação de Quando acontecer (de 18 para 2); o anúncio da retomada varia ("Para tirar esse rastro, vamos…", "Para as pedras começarem a cair, vamos…") e o convite também ("usar", "montar", "colocar isso no seu jogo"); saíram dois chamados duplos e dois "Tá vendo?"/"Olha só" sem surpresa nas experiências.
- **O que já vem no bloco:** as falas dizem os valores de fábrica em vez de mandar escolher o que já está lá (tela 800 × 480 e fundo escuro, o nome heroi no limite, o grupo asteroides, o placar em 12/30/24, os corações em 12/48/22, o título e o subtítulo da abertura).
- **Ordem da conferência:** superada no mesmo dia (abaixo): a lista dos blocos passou para depois do teste, uma vez só.
- **Mapa da Aventura:** as montagens usam a fala do Mapa (`falasSecao(…, 'mapa')`), sem "Olha aqui", "Olha só", "Repare" e "Tá vendo?", que apontam para um gesto do vídeo.
- **Títulos das experiências:** os oito que diferiam passaram a ser iguais ao título da parte, que é o que a criança vê no cabeçalho.

Pela mesma contagem, na fala gravada: chamados de atenção 118 → 114 ("Tá vendo?" 35 → 34, "Olha só" 31, "Repare" 28 → 25, "Olha aqui" 24); "Por isso" 64 → 46; "Agora a gente vai fazer isso no seu jogo!" 17 → 7; palavras 14 226 → 13 997. Os vídeos mais longos quase não encolheram (Monte o disparo, 703 → 706 palavras; Separe a abertura da partida, 697 → 705), porque as correções acrescentaram o que já vem no bloco; encurtá-los de verdade pede dividir a parte em duas, o que muda a estrutura. O PDF continua com 41 páginas.

**Retomadas curtas e conferência depois do teste (06/10/2026, à noite, pedido da dona).** As 17 retomadas seguem a ordem nova: o teste no jogo da criança com "Tá vendo?" e o porquê, a lembrança da experiência numa frase e o anúncio uma vez só, colado ao primeiro passo (a da criação da nave fica só com a lembrança e o anúncio, porque o efeito é invisível). Mediana de 85 para 51 palavras, máximo de 99 para 52. Nas 18 montagens com teste, a lista dos blocos saiu de antes do teste e entrou uma vez depois dele, com o gatilho "Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: …"; nas montagens sem teste visível, "Confira se ficou assim:" continua logo depois da montagem. Fala total de 13 997 para 13 115 palavras; Mapa de 41 para 39 páginas. O teste do curso trava o teto de 55 palavras por retomada e uma lista de conferência por montagem.

Falta: gravar os vídeos com as falas novas, importar os manifestos no Admin, anexar o PDF novo e ensaiar com crianças.

## Conferência local

```powershell
bun docs/aulas-interativas/qa/gerar-nave-contra-asteroides.ts
bun docs/aulas-interativas/qa/validar-manifestos.ts nave-contra-asteroides
python -X utf8 docs/aulas-interativas/validar-roteiros.py nave-contra-asteroides
bun test docs/aulas-interativas/qa/nave-contra-asteroides.test.ts
bun test docs/aulas-interativas/qa/vocabulario-crianca.test.ts
python docs/aulas-interativas/recursos/nave-contra-asteroides/gerar-materiais.py
```

O teste existente `packages/studio/src/blockly/__tests__/naveEditorial.test.ts` é executado de dentro de `packages/studio`, com seu preload. Cobre os cinco marcos originais, disparos, colisões, pontos, derrota, vitória real em 26 pontos e reinício limpo.
