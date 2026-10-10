# Módulos do Desafio do Primeiro Jogo

**Vozes dos vídeos, 10/10/2026:** aplicado o mesmo raciocínio do Cadê Todo Mundo? aos roteiros da
Chave do Farol. A professora conduz e o avatar entra, fala e sai em momentos ligados à explicação.
Zappy fica como fala da página, com o recurso Ouvir; memes e capturas da interface mostram o
mascote sem voz dentro do vídeo.

| Aula | Avatar | Entradas |
| --- | --- | --- |
| Dia 1 | Debinha | 8; o Mapa continua só com a professora |
| Dia 2 | Dedé | 6; coleta, memória e aviso têm funções distintas |
| Dia 3 | Debinha | 14; três na montagem com chave, nenhuma no vídeo dos quatro avisos |
| Certificado | Dedé | 1 comemoração; quiz sem vídeo |

Os roteiros identificam quem fala, os pontos de entrada e saída e a resposta da professora.
As perguntas vêm antes do gesto que responde; os passos de montagem continuam completos.
As conferências dos resultados usam “Se algo não funcionou no seu jogo…”. Os 20 títulos de
seção, os 19 vídeos, os projetos e os critérios de conclusão permanecem. O caderno continua
ensinando os mesmos passos; as participações pertencem ao vídeo.

Esta é a situação atual de autoria: textos e direções aplicados; gravação, edição e publicação
ainda não confirmadas. Medir a duração final com as novas falas, sem acelerar os gestos. As
âncoras e as falas dos avatares estão em [Avatares nos vídeos](AVATARES-NOS-VIDEOS.md#chave-do-farol).

**Ajustes de 10/10/2026, depois da revisão de ritmo:**

- **Celebração sem ressalva** (Diretrizes, seção 3, como no Cadê Todo Mundo?): o vídeo do certificado passou de "Os desenhos e o barco já vieram prontos, mas olha só o que você programou…" para "Você terminou A Chave do Farol! Olha só o que você programou…"; a primeira página do Mapa da Aventura trocou "O cenário, os desenhos e o movimento do barco já vêm preparados." por "Neste jogo, o barco só chega quando o farol acende."; e a descrição do curso perdeu a mesma frase. O preparo da arte e do barco fica nas notas da equipe. PDF regerado, com 27 páginas.
- **Plano de edição na ordem de corte:** o gerador monta o `plannedVideo` com as participações na ordem do roteiro, D e R intercaladas, e para a geração se a ordem ou um trecho citado divergir do roteiro. O nome do roteiro voltou a ficar sozinho em "Roteiro falado", e a frase sobre a criança só aparece nos vídeos com avatar.
- **Durações com as falas novas:** cada alvo cobre a fala estimada a 137 palavras por minuto, contando a criança, e, nas montagens, os gestos sem fala. Mudaram `video-intro-farol` (de 50 a 65 s para 70 a 90 s), `video-d1-quadro` (de 70 a 90 s para 90 a 110 s), `video-d1-andar` (de 3 a 4 min para 4 a 5 min), `video-d2-contexto` (de 90 a 110 s para 120 a 140 s), `video-d2-recolher` e `video-d2-guardar` (de 2 a 3 min para 3 a 4 min) e `video-d3-sem-chave` (de 3 a 4 min para 5 a 6 min).

No Admin: atualizar a descrição do curso, importar os quatro manifestos e substituir o anexo do Mapa da Aventura.

**Revisão de continuidade da conversa, 07/10/2026:** a abertura anuncia a surpresa sem pedir segredo; o encerramento do Dia 2 reconhece o que a criança programou e retoma a promessa numa fala ligada ao envio. Propostas, roteiros e gerador dos manifestos atualizados. [Trechos e conferências](qa/revisao-conversa-2026-10-07.md).

**Título do curso:** Desafio do Primeiro Jogo · A Chave do Farol

**Descrição curta:** Programe sua primeira aventura: encontre a chave e acenda o farol para guiar um barco.

**Descrição:** Conheça a aventura jogando uma versão pronta. Depois, em três dias, programe as regras do seu jogo: faça o personagem andar pelo mapa, recolher a chave e abrir a porta do farol quando estiver com ela. Você constrói as regras que ligam esses momentos, escolhe os personagens e o cenário, troca os objetos, escreve os avisos e decide onde fica a chave. Depois de testar, aprende a publicar seu jogo no Mural. Tudo acontece dentro das fases, inclusive o Estúdio.

Revisão de 03/10/2026: aplicação do formato testado no Cadê Todo Mundo. Contexto pertinente antes de cada tarefa, instruções completas, menos navegação obrigatória, verificação antes do envio e publicação orientada.

O [review pedagógico do curso](qa/review-pedagogico-desafio-2026-10-03.md) registra os achados e as correções seguintes: conceitos explicados no momento do uso, critérios vinculados ao encontro e ramo corretos, instruções completas e caderno alinhado às aulas. As propostas por aula incluem a triagem dos conceitos exigida no briefing.

A [revisão de 04/10/2026](qa/revisao-pedagogica-desafio-2026-10-04.md) foi aplicada aos materiais locais: comparação de velocidades no Dia 1, experiência de memória no Dia 2, porta em duas etapas no Dia 3 e pergunta final de diagnóstico. As gravações, a atualização remota e o ensaio com crianças ainda são etapas de produção.

**Revisão de linguagem de 05/10/2026**, com o Cadê Todo Mundo? como referência de voz. Roteiros, pontes do Zappy, instruções das experiências e do jogo pronto, fala do quiz e caderno passaram a seguir o mesmo jeito de falar:

- a tarefa vem na primeira frase;
- uma ação por parágrafo;
- o caminho da paleta completo ("Abra Jogo 2D, depois Movimento e depois Movimentos prontos");
- "Confira:" depois de cada montagem;
- teste com o resultado esperado e uma correção curta;
- a mesma fórmula de verificação e envio do Cadê;
- "clique em" para botões.

Os rótulos foram conferidos no código. Correções:

- o bloco de valor lógico aparece como **verdadeiro**, com menu, e não como "Verdadeiro ou falso";
- o senão é acrescentado pelo **+** ao lado de **senão**, na linha abaixo do Se;
- o bloco se chama **A cada quadro do jogo**;
- o bloco **texto** vem com Olá, que precisa ser apagado;
- **Atualizar** fica logo acima do jogo, e **Compartilhar** fica no alto do Estúdio.

Também em 05/10, cada montagem que aplica uma experiência passou a começar pela **retomada no próprio jogo**: lembra o que a experiência mostrou, pede um teste que mostra o que ainda falta e diz o que será montado. Exemplo: "Leve o personagem até a chave. Ele passa por ela e nada acontece, porque nenhuma ação está ligada a esse encontro." As oito montagens e os subtítulos do caderno seguem essa ordem.

Ainda em 05/10, a pedido do responsável, toda montagem passou a seguir **primeiro o destino, depois a peça**. A fala manda deixar à vista a área, o bloco vizinho ou o espaço vazio. Só então a criança abre a paleta, pega o bloco e arrasta até lá. Antes, o roteiro mandava pegar o bloco e depois procurar a área, o que é difícil com o bloco preso no mouse. A regra entrou nas Diretrizes e na especificação do roteiro, e o caderno segue a mesma ordem.

A revisão de linguagem não mudou seções nem critérios. A divisão em seções, descrita abaixo, veio depois, no mesmo dia, e criou as seções, a experiência e os critérios intermediários novos. As gravações e o ensaio com crianças continuam pendentes.

**Revisão de 06/10/2026: falas que conversam com a criança.** A pedido do responsável, como no Cadê Todo Mundo?, e registrada nas [Diretrizes Pedagógicas](DIRETRIZES-PEDAGOGICAS.md), seção 6:

- na apresentação do caderno, saiu o "Não precisa baixar nem imprimir", que a criança entendia como uma ordem para não baixar. O vídeo diz "Olha aqui: este é o seu Mapa da Aventura!" e oferece as duas escolhas: ler aqui mesmo ou clicar em **Baixar** para guardar o mapa e consultar onde quiser. O Zappy da seção e a primeira página do caderno seguem a mesma ideia;
- a narração chama a atenção para a tela nos momentos que importam: "Olha aqui", "Olha só" quando aparece um resultado, "Repare" num detalhe e "Tá vendo?" depois do teste da retomada;
- na segunda rodada do mesmo dia, cada fala virou uma conversa contínua: as frases se ligam, cada resultado vem com o porquê e cada experiência diz o que é cada coisa no próprio jogo. Em todo o curso, "então" não é usado como palavra de ligação, porque é o nome de um espaço do Se;
- saíram das montagens as frases soltas sobre o que já vem preparado ("O cenário e os desenhos já estão preparados", "A variável ganhou já veio preparada", "O encontro com a chave já está pronto no seu projeto"). No lugar, a fala diz o papel de cada coisa no momento em que a criança a usa ("É essa variável que chama o barco");
- as pontes do Zappy começam convidando ("Sua vez!", "Agora…!", "Hora de…!") e falam do jogo da criança;
- o certificado comemora ("Parabéns pelo seu jogo!") e diz em voz ativa que quem montou as regras foi ela.

Seções, blocos, critérios e identificadores não mudaram, e a fórmula de verificação continua a mesma dos outros cursos. Com as explicações, algumas experiências ficaram um pouco mais longas (as durações estão nos roteiros e nas tabelas das propostas). Os vídeos precisam ser gravados com as falas novas; o PDF do caderno foi regerado.

**Revisão de 06/10/2026 (vocabulário da aventura).** A pedido do responsável, como no Cadê Todo Mundo?, tudo o que a criança vê e ouve usa o vocabulário da aventura das [Diretrizes Pedagógicas](DIRETRIZES-PEDAGOGICAS.md), seção 6. Por dentro (chaves, identificadores, `plannedVideo`, objetivos e documentos da equipe), curso, aula, seção e caderno continuam:

- os botões citados nas falas, nas pontes e nas notas de gravação passaram a ser **Próxima parte**, **Verificar esta parte**, **Objetivo cumprido!**, **Enviar para o guia** e **Concluir fase**; as retomadas dizem "Lembra da experiência da parte anterior?" e "Lembra da experiência da primeira parte desta fase?", e na publicação "Na aula, ele pode aparecer só como um ícone" virou "Aqui, ele pode aparecer…";
- a seção 2 do Dia 1 se chama **Seu Mapa da Aventura**, o material é **Mapa da Aventura: A Chave do Farol** e o vídeo diz "Olha aqui: este é o seu Mapa da Aventura! (…) Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o mapa e consultar onde quiser.";
- no Dia 2, a comparação da variável passou de "anotar num caderno" para "anotar num bloquinho", também no meme e na partida nova, que "começa com o bloquinho em branco";
- no Dia 3, como "parte" passou a ser o nome da seção, os ramos do bloco Se deixaram de ser "a parte então" e "a parte senão": a fala, a ponte do Zappy e o caderno dizem "o espaço do então" e "o espaço do senão" ("Complete o espaço do então"), como o Cadê fala do espaço vazio ao lado de fazer, e "na parte de baixo do bloco Se" virou "na linha de baixo do bloco Se";
- os links do Como Fazer mantêm os mesmos endereços. Nesta rodada, três rótulos do Dia 1 e o da publicação ainda não eram títulos de tutoriais que existem; o full review de 06/10/2026 (abaixo) os trocou pelos títulos exatos de `docs/como-fazer/como-fazer.json`;
- o PDF diz Mapa da Aventura na capa, no título e no rodapé, troca seção por parte e professor por guia e, nos cabeçalhos, "entrega" por "envio"; o arquivo continua `output/pdf/desafio-farol-caderno.pdf`, com a paginação daquela revisão;
- à noite, a equipe no lugar do guia ("Enviar para o guia" soava estranho): falas, pontes e notas citam **Enviar meu projeto**, confirmado em **Enviar**; a ponte do Dia 3 diz "envie o seu projeto"; o link de ajuda virou **Como pedir ajuda à equipe**, o título novo do tutorial; o Mapa diz que **Enviar meu projeto** manda o projeto para a equipe; manifestos e PDF (27 páginas) gerados de novo;
- sem imagem base, o certificado tem o título **Certificado de Criador**, e a frase passou de "concluiu o Desafio do Primeiro Jogo" para "completou o Desafio do Primeiro Jogo";
- a descrição do curso dizia "O Estúdio aparece dentro das fases"; no full review de 06/10/2026 ela passou a dizer "Tudo acontece dentro das fases, inclusive o Estúdio." e deixou de citar o Pinta e o Estúdio completo, que são vendidos à parte.

Seções, blocos, critérios, identificadores e durações não mudaram. No Admin, atualizar a descrição do curso, substituir o anexo do caderno e conferir os títulos das seções e o bloco do certificado.

**Full review de 06/10/2026.** Os achados foram conferidos no código e aplicados juntos em roteiros, gerador, manifestos, propostas, quiz e Mapa da Aventura:

- **"Então" fora das falas.** Os cabeçalhos dos roteiros dos Dias 1 e 2 ainda recomendavam "então" como palavra de ligação, e treze falas o usavam assim. Em todo o curso, "então" agora só aparece como o nome do espaço do Se; no lugar ficaram "por isso", "para o jogo responder" ou duas frases. A lista de palavras de ligação dos roteiros passou a ser "por isso", "mas", "ou seja" e "agora que".
- **Ações de saída.** As pontes das experiências terminam em "Quando terminar, clique em Próxima parte.". A ponte da velocidade, que começava convidando ("Agora escolha a velocidade do seu personagem!"), saiu com a seção na personalização ampliada registrada abaixo; hoje as cinco experiências são quadro, limite, memória, porta e posição da chave, e as pontes de mexa e veja do Dia 3 começam convidando ("Hora de deixar o jogo com a sua cara!", "Agora escreva os avisos do seu jeito!", "Agora escolha onde fica a chave!").
- **Publicação.** A ponte e o Mapa dizem "Se precisar, peça ajuda a um adulto"; o **Compartilhar** que aparece só como ícone é "uma setinha para cima", conferido no ícone do Estúdio.
- **Links de ajuda.** Os rótulos usam exatamente os títulos de `docs/como-fazer/como-fazer.json`: **Como abrir o Mapa da Aventura e os materiais**, **Como mostrar o menu e a lista de fases**, **Como continuar uma fase** e **Como publicar seu jogo no Mural** (com "Mural" em maiúscula, que o Como Fazer passa a usar).
- **Frases mais curtas.** A condição é definida uma vez só no Dia 3; a abertura da experiência da memória diz por que o jogo precisa guardar a chave; na criação da área **Quando acontecer**, o destino é "um lugar sem blocos", para não se confundir com o espaço vazio que se arrasta.
- **"Aventura" que queria dizer jogo.** Como aventura passou a ser o nome do curso para a criança, "testar a aventura inteira", "teste a aventura" e "fazem a aventura funcionar" viraram "o jogo". Continuam, no sentido da história, "quem vive a aventura", "a aventura acontecer", o título do Dia 2 (**A chave muda a aventura**) e o da revisão (**As regras da sua aventura**).
- **Quiz.** A opção certa da quarta pergunta diz o controle real ("Clicar em Atualizar para começar uma partida nova…"), e as explicações das perguntas 1 e 3 ficaram mais curtas e falam de temChave, do então e do senão pelo nome.
- **Mapa da Aventura.** A primeira página fala com a criança ("Este é o seu Mapa da Aventura!") e oferece ler ou clicar em **Baixar**; os botões são citados com "clique em" (inclusive **Voltar para a fase**, **Preciso de ajuda**, **Baixar certificado (PDF)** e os do quiz: **Começar!**, **Próxima**, **Responder!** e **Tentar de novo!**); a variável ganhou é apresentada pelo que faz ("É essa variável que chama o barco"). Naquela revisão, o PDF tinha 21 páginas; a ampliação de personalização abaixo muda a paginação.
- **Descrição do curso.** Saiu a frase sobre o Pinta e o Estúdio completo, vendidos à parte; ficou "Tudo acontece dentro das fases, inclusive o Estúdio.".
- **Retomadas curtas, primeiro o problema (à noite, pedido da dona).** As oito montagens que vêm depois de uma experiência começam pelo teste no jogo da criança ("Aqui no seu jogo, … Tá vendo? …, porque …"), depois lembram a experiência numa frase e anunciam a montagem uma vez só, colado ao primeiro passo. Na guarda de temChave, que não aparece no jogo, ficam só a lembrança e o anúncio; na escolha do lugar da chave, que não tem nada faltando, também. Saíram os anúncios duplicados ("Por isso, vamos colocar a parede invisível!", "Por isso, vamos avisar!", "A gente vai começar pela resposta…"), a explicação do evento repetida e o "É como anotar no bloquinho" da montagem. Medidas do "Lembra" (ou do teste) até o primeiro passo: antes, mediana de 67 palavras e máximo de 97; depois, mediana de 50 e máximo de 52.
- **Conferência uma vez só, depois do teste.** As montagens deixaram de terminar em "Confira se ficou assim:". A criança monta e testa direto; a lista dos blocos entra depois do teste, com o gatilho genérico "Se no seu jogo não aconteceu isso, volte aos blocos e confira se ficou assim: …", sem caso de erro que repita a lista. A exceção é a guarda de temChave, sem efeito visível, que mantém o "Confira se ficou assim:" logo depois da montagem. O Mapa da Aventura segue o mesmo formato nos textos de teste.

Seções, blocos, critérios, identificadores e durações não mudaram. No Admin: atualizar a descrição do curso, importar os quatro manifestos, conferir os rótulos dos links de ajuda e substituir o anexo do Mapa da Aventura. Os vídeos ainda precisam ser gravados com as falas novas.

**Personalização ampliada, 06/10/2026.** Esta decisão substitui as orientações de velocidade e personalização das revisões anteriores registradas acima:

- Sai a escolha da velocidade, junto de `tanto` e `velocidade` do Dia 1. O movimento preparado fica em 3. Os cinco blocos dessas duas seções entram em `retireBlockKeys`.
- O catálogo tem oito personagens, quatro cenários, quatro barcos, três chaves e quatro pares de faróis. Os nomes identificam os desenhos; no campo de imagem, as palavras usam hífens e não levam acentos. As variáveis dos sprites continuam `personagem`, `chave`, `farol` e `barco`.
- Cada tipo conserva dimensões e área de contato. Os cenários mantêm caminho, ponte e mar; os faróis conservam a posição da porta nas versões apagada e acesa. Trocar a imagem não exige corrigir tamanho ou posição.
- O Dia 3 oferece as trocas de imagem em `personalizar` (com o par do farol, desde a decisão abaixo), os quatro avisos em `farol-mensagens`, a experiência `posicao` e a aplicação `posicionar-chave`, antes de `fecho`. As escolhas ficam no mesmo projeto enviado; não criam segundo envio obrigatório.
- A experiência `lighthouse-position` torna x/y concretos antes da aplicação. O mapa apresenta os três pontos sugeridos e as galerias com os mesmos nomes da lista de imagens.
- Novas imagens são acrescentadas aos projetos salvos, preservando imagens, blocos e escolhas anteriores. Os aliases antigos continuam funcionando. A verificação aceita todas as imagens acesas do catálogo e o alias legado `farol-aceso`, sem aceitar qualquer desenho.
- **O que fica diferente para quem já tinha projeto salvo antes de 06/10/2026.** Os blocos dessa criança continuam com os nomes antigos das imagens (`personagem`, `cenario`, `chave`, `barco`, `farol-apagado`, `farol-aceso`, e `menina`, `menino` e `exploradora` para quem já tinha trocado o personagem), e na lista de imagens os nomes antigos e os novos aparecem juntos: `personagem` e `aventureiro`, `cenario` e `praia-tropical`, `chave` e `chave-dourada`, `barco` e `veleiro`, `farol-apagado` e `farol-listrado-apagado`, `farol-aceso` e `farol-listrado-aceso`, `menina` e `menina-de-laco`, `menino` e `menino-de-bone`, `exploradora` e `exploradora-de-chapeu`. No jogo, os dois nomes de cada par ocupam a mesma caixa do sprite e têm o mesmo contato (o cenário cobre a tela inteira), então qualquer um dos dois funciona; os nomes novos são os do catálogo que os vídeos e o Mapa usam. Os vídeos citam os nomes novos; quando o bloco dela mostrar o antigo, a troca é no mesmo campo, e o farol continua precisando do par do mesmo modelo nos dois blocos.

**Uma ideia por seção na personalização do Dia 3, 06/10/2026 (decisão da dona).** O review independente apontou que `farol-mensagens` juntava duas ideias, o par do farol e os quatro avisos (Diretrizes, "Uma ideia por seção"), e que o Dia 3 chegava tarde à publicação. A dona aprovou:

- O par do farol (o modelo apagado em **Criar sprite farol** e o mesmo modelo aceso em **Trocar imagem do sprite farol para**, dentro de então) foi para `personalizar`, que virou a parte de trocar imagens pelas do mesmo tipo: personagem, barco, chave, farol e cenário.
- `farol-mensagens` ficou só com os quatro avisos, numa parte curta (90 a 120 s), com o título **Escreva seus avisos**. A chave da seção e as dos blocos (`video-d3-farol-mensagens`, `ponte-d3-farol-mensagens`) ficaram as mesmas: trocar só o título preserva os identificadores no Admin e dispensa aposentar blocos na importação.
- `personalizar` passou a ter a verificação `acender` (a mesma regra da entrega): a imagem dentro de então precisa ser um farol aceso, de qualquer um dos quatro modelos ou o antigo `farol-aceso`. Ela não julga a escolha; só impede publicar um jogo cujo farol não acende. Por isso a parte termina em **Verificar esta parte → Objetivo cumprido! → Salvo → Próxima parte**. É a única exceção à regra "o mexa e veja conclui pelo vídeo", registrada também nas Diretrizes.
- Os vídeos ficaram enxutos, com a conferência uma vez só, depois do teste. O tempo de vídeo entre o envio (`decisao`) e a publicação (`fecho`) caiu de cerca de 9 a 12,5 minutos para cerca de 7,5 a 10,5 minutos; o do Dia 3 inteiro, de 18 a 24 para 16,5 a 22,5 minutos. Seções e vídeos do curso continuam 20 e 19; o Mapa continua com 27 páginas, com a galeria dos faróis logo depois das outras galerias e a página dos avisos depois dela.

**A surpresa do final, 07/10/2026.** Decisão do responsável (Diretrizes, seção 2, "A surpresa do final"), só aqui e no Cadê Todo Mundo?, os primeiros cursos da criança (nos seguintes ela já sabe que pode personalizar): a personalização do Dia 3 passa a ser anunciada desde o começo.

- **Plantar:** o vídeo `video-intro-farol` conta, antes de passar a vez, que lá no fim desta aventura tem uma surpresa que vai deixar o jogo do seu jeito, com palavras diferentes das do Cadê Todo Mundo? para quem fizer os dois cursos (alvo de 50 a 65 s; era 45 a 60).
- **Lembrar:** o vídeo `video-d2-programar` comemora o que a criança programou e lembra a surpresa entre o envio e **Concluir fase**.
- **Revelar:** o vídeo `video-d3-personalizar` começa com "Sua missão deu certo! E a surpresa chegou: olha quantas versões essa aventura pode ter…", mostra duas versões completas do jogo, passa pelas galerias do Mapa da Aventura e, depois do teste, diz que é com essa cara que o jogo vai para o Mural; a ponte `ponte-d3-personalizar` começa com "A surpresa chegou!".
- **Mapa da Aventura:** a primeira página cita a surpresa, o índice chama as páginas 17 a 24 de **A surpresa do final**, e a página da personalização e as quatro galerias têm o sobretítulo **Dia 3 · A surpresa do final**. Continua com 27 páginas.

Seções, blocos, critérios e identificadores não mudaram. No Admin: importar os manifestos dos Dias 1, 2 e 3 e substituir o anexo do Mapa da Aventura. Regravar os três vídeos citados.

## Módulo 1 · Sua aventura no farol

**Resumo do módulo:** Conheça a aventura A Chave do Farol e programe as regras que fazem o jogo acontecer. Você vai fazer o personagem andar, recolher a chave e abrir a porta do farol para guiar o barco. Teste cada construção, aprenda a publicar seu jogo no Mural e guarde seu certificado.

| Aula | Seções | Resultado |
| --- | --- | --- |
| [O personagem ganha movimento](aulas/desafio-dia-1.md) | 6 | Jogar a versão pronta e conhecer o caderno. Depois, experimentar e montar o movimento a cada quadro e o limite da tela. |
| [A chave muda a aventura](aulas/desafio-dia-2.md) | 4 | Experimentar a memória e montar a coleta em três partes: recolher, guardar e avisar. |
| [A luz do farol](aulas/desafio-dia-3.md) | 8 | Comparar a condição, montar as respostas, trocar as imagens (com o par do farol), escrever os avisos, experimentar a posição da chave e publicar o mesmo jogo. |
| [Seu certificado](aulas/desafio-certificado.md) | 2 | Rever as regras no quiz, reconhecer a autoria e guardar a conquista. |

São quatro aulas, vinte seções e dezenove vídeos. Cada conceito novo tem uma experiência antes de virar bloco. No Dia 1, `quadro` e `limite` usam `lighthouse-walk`. No Dia 2, a memória é experimentada antes da coleta. No Dia 3, `lighthouse-key` compara as respostas da porta, e `lighthouse-position` apresenta x/y antes da escolha do lugar da chave. A versão pronta e o caderno abrem o Dia 1, como na Aula 1 do Cadê Todo Mundo?. As montagens intermediárias verificam sem enviar; cada dia tem um envio na última montagem obrigatória. Depois do envio do Dia 3, a personalização preserva as escolhas da criança e a publicação usa esse mesmo projeto. A seção comercial obrigatória continua retirada do certificado.

O [quiz único antes do certificado](proposta-quizzes-cursos-curtos-2026-10-03.md) integra os materiais locais: quatro perguntas, fala inicial do Zappy e nenhum vídeo na seção. A seção de celebração e os identificadores existentes foram preservados.

## Projeto e conclusão

Identificador do curso e cadeia: `desafio-primeiro-jogo`. Aulas: `dia-1`, `dia-2`, `dia-3`, `certificado`. Preservar esses destinos e a chave `projeto` em cada dia. A antiga aula `boas-vindas` sai do curso na atualização do Admin.

A cadeia prioriza o envio anterior da criança. Os projetos embutidos dos Dias 2 e 3 são retomadas somente quando não há trabalho anterior. O jogo pronto do Dia 1 é uma atividade isolada e nunca deve substituir o projeto da criança.

Cada entrega ensina testar, **Verificar esta parte**, corrigir pendências, conferir **Objetivo cumprido!**, esperar **Salvo**, **Enviar meu projeto** e confirmar **Enviar**. Testes manuais do comportamento complementam a verificação dos blocos.

No Dia 1, as experiências `quadro` e `limite` antecedem `andar` e `borda`; só `borda` envia. No Dia 2, a primeira seção compara a coleta com e sem memória, o afastamento e o reinício. Depois, `recolher` e `guardar` verificam sem enviar, e `programar-chave` monta o aviso e envia. No Dia 3, `sem-chave` constrói e verifica senão; `decisao` completa então e recebe a entrega. Seguem as quatro partes de personalização e experiência, antes da publicação. Os critérios são cumulativos:

- Dia 1: dois em `andar` e três na entrega. Ensinar velocidade 3; preservar projetos salvos que já usam outro valor.
- Dia 2: quatro em `recolher`, sete em `guardar` e oito na entrega.
- Dia 3: dez em `sem-chave`, quatorze na entrega e um em `personalizar` (`acender`, que aceita os quatro faróis acesos e o antigo). O teste jogado liga os dois ramos na mesma partida e confere o reinício. A escolha do modelo de farol e as frases não são cobradas literalmente.

A experiência de posição exige as metas `mover-horizontal` e `mover-vertical`. As escolhas visuais, textuais e do lugar da chave não viram critério de preferência. Conferir manualmente visibilidade, alcance e reinício, incluindo todos os pontos sugeridos.

O inventário [blocos-desafio-primeiro-jogo.json](blocos-desafio-primeiro-jogo.json) é gerado junto dos manifestos e descreve os blocos disponíveis para este Farol, incluindo os preparados. O inventário do jogo antigo de nave permanece no acervo legado.

O projeto preparado e a paleta usam somente **Programação e Jogo 2D**. As áreas Ao iniciar, Quando acontecer e Enquanto estiver rodando organizam esses blocos. A tela é criada pelo facilitador Jogo 2D; não liberar HTML, CSS ou Canvas nem embutir blocos dessas categorias no projeto inicial.

As dezenove seções com vídeo têm uma ponte do Zappy imediatamente após o vídeo, encaminhando a ação da criança. As pontes são texto da página, não novos vídeos ou critérios de conclusão.

No Dia 3, a seção de publicação usa o mesmo Estúdio da montagem. **Compartilhar** fica disponível após o envio. O resumo vem preenchido (na aula, o título vem do curso e não aparece na janela); ensinar gerar capa, publicar, comemorar e copiar o link de jogar para mandar à família e aos amigos. Publicar é a tarefa, mas o vídeo segue como critério técnico daquela seção. Não criar bloqueio novo por acesso expirado ao Mural.

## Materiais de consulta

- **Mapa da Aventura (o caderno):** [desafio-farol-caderno.pdf](../../output/pdf/desafio-farol-caderno.pdf). PDF único com passos de montagem, testes, entrega, publicação e ajuda. Anexar em `materiais-farol`, com `bookPreview: true`.
- **Como Fazer:** links contextuais no caderno e na primeira montagem do Dia 1 e na publicação. Abrem na mesma aba e permitem voltar à aula. Não exigir consulta, impressão ou download para concluir.

O [gerador do caderno](recursos/desafio-farol/gerar-materiais.py) usa o conteúdo de `caderno-conteudo.json` e a composição de `gerar-caderno.ts`, com o mesmo CSS, fontes locais e blocos desenhados do Cadê Todo Mundo. O PDF tem 27 páginas, incluindo capa, montagens ilustradas, galerias por tipo, pares de faróis, posição da chave, testes, publicação e certificado. O caderno deve ser anexado antes da gravação que o apresenta.

O conteúdo do caderno acompanha as seções reais: visão geral, passos de montagem, testes, publicação, certificado e ajuda. Não existe um mapa como material ou atividade adicional. Por orientação posterior do responsável em 03/10/2026, o PDF do mapa para responsáveis foi retirado do repositório e não será gerado. O único material para anexar é o caderno, que a criança vê como Mapa da Aventura.

## Atualização de aulas existentes

Os quatro manifestos locais são fontes de autoria, com `plannedVideo`. **Não importar cegamente sobre aulas publicadas.** Antes de aplicar no admin:

1. Registrar o estado atual: IDs das seções/blocos, vídeos vinculados, anexos e alunos com progresso.
2. Conferir o diff preservando as chaves mantidas, a cadeia e o bloco de certificado. Usar a reconciliação de seções para não criar projetos paralelos.
3. Tratar `retireBlockKeys` explicitamente. Retiram-se os dois vídeos sem prática do Dia 1, os vídeos/pontes das antigas seções tanto/velocidade, a experiencia-velocidade e o pitch do certificado. Reconciliar as duas seções retiradas sem apagar progresso.
   - A importação no modo padrão (preservar) aposenta falas, experiências, materiais e os vídeos que ainda são só planejados: sem link no bloco e sem Vimeo escolhido no rascunho. É o caso dos vídeos das seções `tanto` e `velocidade`, que nunca foram gravados. Um vídeo retirado que já tem Vimeo escolhido ou link no bloco continua protegido e a importação recusa com a mensagem "Só instruções, descobertas, materiais e vídeos ainda não vinculados podem ser aposentados…". Nesse caso, desvincular o vídeo no Admin antes de importar, ou usar "Substituir o rascunho pelo manifesto" depois de anotar os blocos que a autora acrescentou à mão (a substituição remove tudo o que não está no manifesto).
   - As seções mantidas conservam o mesmo identificador, então o progresso das crianças continua valendo. As seções retiradas saem do rascunho; o progresso guardado nelas não é apagado e deixa de contar quando a versão nova for publicada. Coberto por `packages/members/tests/integration/farol-dia-1-reimport.test.ts`, que importa a versão de 05/10 e depois a atual.
   - A aula `boas-vindas` inteira sai do curso, com seu tour antigo.
   - Importar antes o Dia 1 com as seções `apresentacao` e `caderno` e anexar o caderno.
   - Depois, despublicar ou retirar `boas-vindas` sem apagar o progresso, as entregas nem os certificados já registrados.
   - Se o Admin só permitir apagar, registrar antes quem tem progresso nela. Não apagar mídia apenas porque o molde local contém `plannedVideo`.
4. Conferir os dezenove vídeos planejados. Regravar os existentes e gravar os novos:
   - `video-d1-quadro`, `video-d1-andar` e `video-d1-limite`;
   - `video-d2-recolher` e `video-d2-guardar`;
   - `video-d3-sem-chave`, `video-d3-personalizar`, `video-d3-farol-mensagens`, `video-d3-posicao` e `video-d3-posicionar-chave`. Os roteiros de caderno e publicação precisam corresponder aos materiais e à interface reais. Manter vínculos de mídia até a substituição conferida.
5. Atualizar o caderno, preservando anexos que já existem até a substituição ser conferida. Retirar da aula a referência ao mapa antigo, se houver, sem apagar a mídia armazenada.
6. Conferir `experiencia-memoria`, `sem-chave`, sua verificação sem envio e `q-memoria-coleta` (substitui q2 do Farol). Conferir também `experiencia-posicao` e as três novas seções do Dia 3, o catálogo recebido por projetos salvos e a aceitação dos faróis acesos na verificação. Preservar conquistas e certificados anteriores.
7. Ensaiar com conta nova e conta com progresso, inclusive certificado já emitido. Conferir avanço após as seções retiradas, a entrada pelo Dia 1 sem a aula `boas-vindas`, retomada do projeto e retorno do Como Fazer.
8. Publicar somente depois de conferir mídia, conclusão e a experiência completa.

## Escopo comercial e outros cursos

A oferta atual do Desafio concede 30 dias de curso e Mural completo, seguidos de Mural visitante. Ofertas históricas podem ter outros direitos. Esta adaptação editorial não muda preço, prazo, catálogo, funil ou concessões.

O curso antigo de nave está em [Nave Contra Asteroides](modulos-nave-contra-asteroides.md), com outro identificador. Não alterar seus cinco dias.

## Verificações

```powershell
bun docs/aulas-interativas/qa/gerar-desafio-farol.ts
bun test docs/aulas-interativas/qa/desafio-farol-manifestos.test.ts docs/aulas-interativas/qa/desafio-farol-projeto.test.ts docs/aulas-interativas/qa/desafio-farol-regressoes.test.ts
bun docs/aulas-interativas/qa/validar-manifestos.ts desafio-
python docs/aulas-interativas/validar-roteiros.py desafio-
bun docs/como-fazer/validar.ts
python docs/aulas-interativas/recursos/desafio-farol/gerar-materiais.py
```

Além dos checks locais, ensaiar em navegador por toque e teclado, tela estreita, Estúdio ampliado, retorno de ajuda, duas situações da porta, verificação, envio, publicação e certificado. Fazer novo ensaio com crianças: os ajustes vieram do Cadê Todo Mundo, mas a compreensão deste Desafio ainda precisa ser observada. Estes arquivos não significam que o curso publicado já foi atualizado.
