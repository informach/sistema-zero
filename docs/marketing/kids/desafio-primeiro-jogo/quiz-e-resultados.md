# Proposta do quiz e dos resultados

03/10/2026. Versão proposta: `desafio-farol-v2`. Complementa a [proposta do funil](proposta-funil-2026-10-03.md). Perguntas e textos abaixo são propostas para revisão, sem alteração do quiz existente. A [pesquisa aprofundada](pesquisa-aprofundada-v2-2026-10-03.md) explica as mudanças.

## Função do quiz

Para a família: encontrar uma forma de apresentar a criação de jogos ao filho, saber como acompanhar o começo e reconhecer o que precisa conferir antes de escolher uma atividade.

Para o Sistema Zero: reconhecer a prioridade da família, conferir o encaixe no Farol e conduzir à apresentação pertinente da oferta. Não medir personalidade, talento, estilo de aprendizagem, inteligência ou probabilidade de sucesso. Gostar de jogar não prova vontade de programar.

Oito perguntas principais. Uma pergunta adicional quando há dois motivos e outra quando a família rejeita o projeto apresentado: máximo de dez no percurso completo. Faixa etária fora do recorte pode encerrar antes, com orientação informativa. Duração só será anunciada depois de medida. Uma resposta por criança, com opção de refazer para outro filho.

**Ordem de apresentação na versão 2:** Q1 → Q6 → Q2 → Q4 → Q3 → Q3P, quando necessária → Q5 → Q7 → Q8 → Q8B, quando necessária. Os IDs permanecem estáveis para revisão documental; os números não aparecem ao usuário. Conferir computador cedo evita solicitar todas as respostas antes de revelar esse requisito. As quatro etapas de progresso são “Para quem”, “O começo”, “O que vocês procuram” e “Sua orientação”, com ramificações previstas; não exibir um percentual que retrocede.

Quando não houver computador, entregar imediatamente uma explicação curta e a opção de continuar a orientação para planejar um começo futuro. Não bloquear o conteúdo informativo nem continuar qualificando como se o equipamento estivesse disponível. A criança não precisa estar presente para o adulto responder.

## Entrada pública

**Sistema Zero Kids · Para mães, pais e responsáveis**

### Descubra por onde seu filho pode começar a criar jogos

Talvez ele goste de jogar, desenhe personagens ou ainda não tenha pensado em criar um jogo. Conte o que você observa em casa e o que gostaria de experimentar com ele.

Você recebe um próximo passo explicado para a situação de vocês: como apresentar a ideia ao seu filho, o que observar na primeira tentativa e que apoio procurar. Ao final, mostramos também uma aventura de programação e se o nosso Desafio do Primeiro Jogo corresponde ao que vocês querem conhecer.

**Botão:** Encontrar um primeiro passo

**Apoio:** Resultado gratuito na tela, sem cadastro. Orientação voltada à faixa de 9 a 14 anos.

**Link secundário:** Já quero conhecer o Desafio → `/kids/desafio-primeiro-jogo/oferta`

Identificar a marca sem pressupor conhecimento da Comunidade. Não mostrar formulário de contato, contagem fictícia, “analisando o cérebro” ou promessa de avaliação científica. A ilustração pode mostrar uma família e uma ideia de jogo; não sugerir liberação gratuita do curso pago.

## Perguntas e uso das respostas

Os identificadores abaixo são técnicos; aparecem apenas na documentação. Uma tela por pergunta, opção de voltar, estado de seleção claro e botão Continuar. Nas seleções múltiplas, não avançar ao primeiro clique.

### Q1 · Faixa etária

**Quantos anos tem a criança ou adolescente em quem você está pensando?**

- Menos de 9 anos. `menos_9`
- De 9 a 11 anos. `9_11`
- De 12 a 14 anos. `12_14`
- 15 anos ou mais. `15_mais`

**Uso:** recorte da orientação e tom dos exemplos, não nível de capacidade. Fora de 9–14, apresentar: “Esta orientação foi preparada para famílias com filhos de 9 a 14 anos. Isso não determina o que seu filho consegue aprender, mas eu não vou indicar este percurso como se ele tivesse sido pensado para a idade que você informou.” Oferecer conhecer o curso de forma informativa ou corrigir a resposta. Não transferir automaticamente para a Comunidade, que usa a mesma faixa.

### Q2 · O que a criança demonstra

**Quais destas situações você já observou?**

*Marque as situações que já observou. Elas podem acontecer juntas.*

- Ele gosta de jogar. `joga`
- Ele gosta de desenhar. `desenha`
- Ele inventa personagens ou histórias. `inventa_historias`
- Ele já falou que gostaria de criar ou mudar um jogo. `quer_criar`
- Não observei essas situações; quero apresentar algo novo. `nao_observei`, exclusiva.
- Não sei dizer. `nao_sei`, exclusiva.

**Uso:** escolher o convite e os exemplos. Se só joga, sugerir conversar sobre uma regra; se desenha, reconhecer esse interesse sem prometer aula de desenho; se inventa histórias, falar das ações de um personagem sem dizer que gosta de desenhar; se já quer criar, começar por essa vontade relatada. `nao_observei` e `nao_sei` geram convites de descoberta, com justificativas diferentes. Nenhuma opção soma pontos para decidir o motivo adulto. Quatro interesses podem coexistir; as duas alternativas exclusivas desmarcam as demais.

### Q3 · Prioridade da família

**O que mais pesa para você ao procurar uma atividade como essa?**

*Escolha até duas opções.*

- Encontrar algo para ele construir dentro do tempo de tela que já combinamos. `A`
- Ver um primeiro jogo funcionando, construído por ele com orientação. `B`
- Dar espaço ao interesse dele por desenhos, personagens e histórias. `C`
- Conhecer uma iniciação em programação e entender o que ele aprende. `D`
- Ainda estou procurando uma ideia para apresentar a ele. `exploracao`, exclusiva.
- O que procuro não aparece nessas opções. `outra_procura`, exclusiva.

**Uso:** motivo comercial declarado, preservando combinações. B destaca a realização do projeto; D destaca conhecer conteúdo e percurso de programação. São prioridades que podem coexistir, não categorias naturalmente exclusivas. Não chamar quem escolhe D de mais comprometido nem quem escolhe A de preocupado em excesso.

**Q3P, somente se houver dois motivos:** “Qual desses dois você gostaria de explorar primeiro?” Repetir somente as duas escolhas e acrescentar “Os dois têm o mesmo peso para mim”.

**Uso:** definir principal quando a pessoa o escolhe. Em igualdade, principal vazio e ambos preservados; nenhum desempate automático por ordem de clique, idade ou interesse da criança.

### Q4 · Experiência em programação de jogos

**Até onde seu filho já chegou ao tentar programar um jogo?**

- Ainda não tentou. `primeira_vez`
- Começou, mas ainda não conseguiu fazer uma versão funcionar. `interrompida`
- Já fez uma versão funcionar seguindo uma atividade guiada. `guiada`
- Já consegue montar jogos por conta própria. `independente`
- Não sei dizer. `nao_sei`

**Uso:** ajustar o ponto de partida. Primeira vez recebe explicação de blocos e elementos preparados; tentativa interrompida recebe uma orientação para localizar um passo e testar; experiência independente recebe aviso de que o Farol é introdutório. Não repetir a pergunta sobre desenho nesta tela.

### Q5 · Dúvida principal

**O que você mais gostaria de esclarecer antes de escolher?**

- Se ele vai querer participar da atividade. `interesse`
- Se vai precisar de mim ao lado o tempo todo. `companhia`
- Como recebe ajuda quando uma parte não funciona. `ajuda`
- Como encaixar as atividades na nossa rotina. `rotina`
- O que recebemos pelo valor pago. `valor`
- Ainda não tenho uma dúvida específica. `sem_duvida`

**Uso:** ordenar e desenvolver um argumento do resultado, sem criar outro avatar. Companhia e ajuda são opções distintas. Cada resposta altera uma passagem concreta; não reaparece como uma lista de “dores do perfil”.

### Q6 · Equipamento

**Para fazer uma atividade no computador, qual é a situação de vocês hoje?**

- Temos computador ou notebook com internet disponível para isso. `disponivel`
- Temos, mas precisamos combinar os horários de uso. `compartilhado`
- Hoje só temos celular ou tablet para essa atividade. `sem_computador`
- Preciso conferir o equipamento e a conexão. `a_conferir`

**Uso:** requisito e orientação de rotina. Compartilhado não é incompatível. Celular/tablet não equivale a computador. Não pedir marca, renda ou especificação extensa no quiz. A checagem técnica detalhada é feita na demonstração dos requisitos antes da compra.

### Q7 · Formato de acompanhamento

**Que acompanhamento vocês procuram para esse começo?**

- Podemos considerar aulas gravadas. `gravado`
- Prefiro ao vivo, mas gostaria de conhecer como funciona uma atividade gravada. `prefere_ao_vivo`
- Preciso de um professor ao vivo acompanhando a atividade. `exige_ao_vivo`
- Ainda preciso entender a diferença para escolher. `a_conferir`

**Uso:** preferência não é exigência. O resultado explica pausa, repetição e ajuda que pode exigir espera, inclusive para quem marcou gravado. Não afirmar que qualquer criança consegue sozinha. Quem exige ao vivo não recebe o Desafio nem a Comunidade assíncrona como solução equivalente.

### Q8 · A experiência que está sendo considerada

Antes da pergunta, apresentar uma imagem ou sequência real do Farol e este texto curto:

> No jogo A Chave do Farol, o personagem precisa encontrar uma chave e acender a luz para um barco chegar. O cenário e os desenhos já vêm preparados. A criança acompanha explicações gravadas, monta as regras com blocos e testa no Estúdio da aula. Pode pausar e rever; as dúvidas seguem por mensagens. O curso é feito no computador e custa R$ 67, uma compra, com 30 dias de curso e Mural completo. Depois, permanece o Mural visitante para ver e jogar.

**Você gostaria de apresentar esse primeiro projeto guiado ao seu filho?**

- Sim, gostaria de conhecer como ele faria. `conhecer`
- Quero conversar com ele antes de escolher. `conversar`
- Esse projeto não corresponde ao que estamos procurando. `outra_atividade`

**Uso:** qualificar a expectativa após mostrar o escopo. Interesse do responsável não é aceitação já obtida da criança. A resposta não libera compra, muda motivo nem representa compromisso.

A prova nesta tela deve mostrar uma regra sendo montada e seu efeito, além da arte do jogo. Não usar um trailer que esconda como é a atividade. É apresentação comercial identificada, não uma pergunta neutra de pesquisa de mercado; não usar suas respostas para alegar demanda independente pela ideia.

**Q8B, somente para `outra_atividade`: “O que vocês gostariam de encontrar no lugar desse projeto?”**

- Uma atividade centrada em desenhar. `desenho`
- Um curso feito no Roblox ou Minecraft. `ferramenta_especifica`
- Um projeto mais avançado de programação. `avancado`
- Outro tipo de atividade. `outro`

**Uso:** explicar o desencontro e permitir um próximo passo pertinente. É uma pergunta de escopo; a exigência de ao vivo já foi registrada em Q7. Se o interesse por desenho apareceu em qualquer combinação, o resultado explica os desenhos preparados, independentemente do motivo principal.

## Regras de orientação e destinos

Não usar soma de pontos. Guardar separadamente `motivos`, `principal`, `interesses`, `experiencia`, `duvida`, `equipamento`, `formato`, `interesse_no_projeto` e eventual motivo de desencontro. O resultado computado tem versão e estado de adequação; o endereço de destino é outro campo. Acrescentar o próximo passo recomendado: `conhecer_projeto`, `retomar_com_apoio`, `conversar_com_filho`, `conferir_condicoes` ou `outra_atividade`. São ações, não novos avatares.

### Precedência

1. Respostas incompletas, inválidas ou de versão anterior não produzem resultado novo por aproximação. Voltar à pergunta necessária.
2. Faixa fora do recorte: orientação informativa, sem recomendação personalizada de compra.
3. Exigência de ao vivo, projeto recusado ou ausência de computador: registrar todos os obstáculos e oferecer orientação correspondente antes de qualquer convite comercial.
4. Equipamento/formato a conferir, conversa pendente ou experiência independente: recomendação com ressalva explícita, sem “ideal para ele”.
5. Condições compatíveis: desenvolver a recomendação conforme motivo e interesse observado, com a mesma clareza sobre escopo e preço.

Dentro de condições compatíveis, `conversar` em Q8 define `conversar_com_filho`; caso contrário, tentativa interrompida define `retomar_com_apoio`, e as demais situações definem `conhecer_projeto`. Equipamento incerto e compreensão pendente do formato produzem `conferir_condicoes`; esse estado permanece até a checagem, sem declarar encaixe confirmado. Experiência independente recebe ressalva de nível mesmo quando a pessoa quer conhecer o projeto. Projeto recusado produz `outra_atividade`, sem mensagem posterior que contradiga a recusa.

Não esconder um impedimento porque outro já apareceu. Em múltiplos obstáculos, explicar os dois em um parágrafo conectado e disponibilizar a checagem de requisitos; não despejar uma pilha de alertas.

| Situação | Motivo registrado | Destino e CTA principal |
| --- | --- | --- |
| A, condições compatíveis | A | `/kids/desafio-primeiro-jogo/oferta/tempo-de-tela` · Ver o Desafio por dentro |
| B, condições compatíveis | B | `/kids/desafio-primeiro-jogo/oferta` · Conhecer o primeiro projeto |
| D, condições compatíveis | D | `/kids/desafio-primeiro-jogo/oferta/iniciacao-tecnologica` · Ver como funciona essa iniciação |
| C, aceita conhecer arte preparada | C, sem reclassificar como B | Oferta padrão, com limite de desenho explicado antes do botão. |
| Empate, exploração ou outra procura | Principal vazio; motivos preservados | Oferta padrão apenas como possibilidade, sem afirmar que atende ao objetivo ainda desconhecido. |
| Precisa conversar com o filho | Motivo preservado | Primeiro o convite para conversar; link secundário para conhecer a oferta correspondente. |
| Só celular/tablet | Motivo preservado; sem equipamento | `/kids/desafio-primeiro-jogo/oferta#requisitos` · Conferir o que é necessário para fazer o curso. Sem CTA de compra no resultado. |
| Exige ao vivo | Motivo preservado; formato incompatível | Orientação na própria tela, botão Alterar respostas. Link informativo de formato opcional; não encaminhar à Comunidade como se fosse ao vivo. |
| Desenho como tarefa principal | C ou motivo que realmente declarou | Explicar que o Farol não ensina isso. Pode haver link secundário a `/kids/comunidade-dos-criadores/oferta/expressao-visual` apenas para conhecer desenho ligado a projetos interativos e suas condições, nunca como curso comprovado de desenho tradicional. |
| Exige Roblox/Minecraft | Motivo preservado; ferramenta incompatível | Explicar ferramenta própria; não chamar de equivalente. Alterar respostas se quiser considerar outra proposta. |
| Já cria e quer mais complexidade | Motivo preservado; escopo introdutório | Não priorizar compra do Desafio. Pode conhecer a Comunidade, verificando catálogo e Jornada sem promessa de curso avançado. |

Os slugs específicos do Desafio e a âncora de requisitos são propostos; ainda não existem. Os links da Comunidade citados já existem. Entrada sem quiz continua válida. Os valores antigos de `perfil` são `explorador`, `especialista`, `foguete` e `investigador`, apresentados ao público como Explorador, Inventor, Desafiador e Investigador. Eles deixam de determinar a nova segmentação; visitas antigas podem receber a página padrão sem inventar correspondência A/B/C/D. Preservar cupons e atribuição pertinentes, não os rótulos antigos como evidência de motivo.

## Composição da página de resultado

1. Uma conclusão limitada ao relato: “Pelo que você contou, vale começar por...”.
2. Dois parágrafos conectando prioridade e observação; não repetir literalmente cada resposta.
3. Um convite pronto para o adulto fazer ao filho, usando uma demonstração que possa ver no celular. Copiar o convite é ação opcional, não um novo cadastro.
4. O que observar e como acompanhar, ajustado à dúvida.
5. Apresentação por extenso do Desafio, explicação da prática e uma ou duas telas pertinentes. Quando o próximo passo for apenas conversar/conferir, manter a compra como possibilidade secundária.
6. Condições que mudam a recomendação, preço e prazo antes do botão.
7. Ação principal, Alterar respostas e Refazer para outro filho. Feedback opcional de utilidade sem bloquear a navegação.

Não mostrar barras de compatibilidade, diagnóstico, percentual de talento ou “seu filho foi selecionado”. Não usar o nome da criança, coletar diagnóstico ou inserir dados pessoais na URL. O resultado é sobre um possível próximo passo, não uma identidade permanente.

## Experiência gratuita que sustenta o convite

A entrega gratuita é a orientação e a demonstração pública, não acesso ao curso. O adulto pode mostrar a cena do Farol e o trecho de montagem e dizer:

> “Nesse jogo, o personagem precisa da chave para entrar. Você gostaria de conhecer como a gente monta a regra que faz a porta responder?”

Mostrar o jogo pronto e os blocos evita confundir vontade de jogar com vontade de construir. A criança pode perguntar sobre a aventura, querer conhecer a montagem ou preferir outra coisa. Não é preciso obter uma resposta certa, acertar um enigma nem concluir uma tarefa para continuar lendo a oferta.

Para quem já tentou e parou, o convite pode retomar a parte que ficou sem funcionar, sem exigir recriar o projeto antigo no Sistema Zero. Para quem inventa histórias, perguntar como o personagem reagiria a uma porta fechada. Para quem desenha, reconhecer seu desenho e explicar que no Farol a arte já vem preparada. Não presumir interesse ou habilidade pela faixa etária.

**Opção para experimentar fora da tela:** se a família quiser, um objeto pode representar a chave e uma folha a porta. A criança inventa o que acontece com e sem a chave. Essa brincadeira é opcional, não requer desenhar um mapa e não mede capacidade. Para adolescentes ou quem já cria, pode ser mais pertinente conversar sobre uma regra de um jogo conhecido. Não associar idade a competência ou gosto pela brincadeira.

O resultado não afirma que essa conversa confirma interesse duradouro. Se a criança preferir outra atividade, a orientação deve continuar útil, sem insistência para provar que o quiz acertou.

## Exemplos completos de resultado

Os exemplos são composições editoriais, não famílias reais ou depoimentos. Provas visuais são especificadas em documento separado.

### Exemplo A · Joga, adulto prioriza tempo permitido, computador compartilhado e dúvida de companhia

**Uma parte do tempo combinado pode virar um jogo para vocês conhecerem juntos**

Você quer encontrar uma atividade de construção para o tempo de tela que já combinou com seu filho. Ele gosta de jogar, mas você ainda não contou que ele tenha pedido para criar um jogo. Vale começar apresentando essa possibilidade e ouvindo o que chama a atenção dele.

Uma forma de convidar é mostrar a cena abaixo e dizer: “Nesse jogo, a porta só abre depois que o personagem encontra a chave. Você gostaria de conhecer como essa regra é feita?”. Mostre também o trecho em que os blocos são montados. Assim, vocês conversam sobre o que ele faria na atividade, além da vontade de jogar a aventura pronta.

Como o computador é compartilhado, combinem um momento em que ele estará disponível. E, sobre precisar ficar ao lado: algumas crianças precisam de companhia para se localizar no primeiro acesso. A proposta é que você ajude a começar, observe uma tentativa e descubra que apoio seu filho precisa, sem assumir a programação no lugar dele.

Se ele quiser experimentar essa criação no computador, o Desafio do Primeiro Jogo ensina a programar A Chave do Farol. A explicação fica junto da atividade. Seu filho pode pausar, montar os blocos e testar se o personagem respondeu. Quando se perder em um encaixe, pode rever o trecho ou consultar o caderno. Uma dúvida da aula pode ser enviada pelo “Preciso de ajuda”, com conversa por mensagens e possível espera pelo retorno.

O cenário e os desenhos já vêm preparados. Ele trabalha nas regras de movimento, coleta e porta, aprende a publicar e pode mostrar o jogo à família. São R$ 67, uma única compra, com 30 dias de curso e Mural completo; depois permanece a visita ao Mural para ver e jogar. A família continua definindo o tempo de tela.

**Botão:** Ver o Desafio por dentro → oferta de tempo de tela.

### Exemplo B · Já pediu para criar, tentativa interrompida, dúvida sobre ajuda

**Um primeiro jogo com um passo para retomar quando alguma coisa não funciona**

Seu filho já falou em criar um jogo e chegou a tentar, mas parou antes de fazer funcionar. Para esse começo, faz sentido conhecer um projeto em que cada parte tenha uma orientação para consultar e um resultado que ele consiga testar.

Você pode convidá-lo assim: “Vamos conhecer como se monta a regra dessa porta?”. Mostre a demonstração e deixe que ele diga o que gostaria de entender. Se tiver um projeto anterior, vocês podem conversar sobre a parte que ficou sem funcionar. O Farol é outra construção, guiada desde o começo; não exige transferir o projeto antigo.

No Farol, a criança começa com cenário e desenhos preparados e monta os comandos no Estúdio que abre dentro da aula. Isso permite concentrar a tentativa em uma parte: fazer andar, recolher a chave ou conferir se a porta pode abrir. Depois ela executa o jogo e compara o resultado com a explicação.

A sua principal dúvida foi o que acontece se ela travar. A atividade tem “Verificar esta etapa”, que confere critérios da montagem e aponta o que precisa ser ajustado. Essa conferência não substitui jogar e observar. Se a dúvida continuar, o botão “Preciso de ajuda” permite explicá-la a partir da aula. O atendimento é por mensagens; não há um professor ao vivo observando cada movimento, e o retorno pode exigir espera.

Esse é um curso introdutório para construir o Farol no Estúdio do Sistema Zero. Não é uma promessa de fazer qualquer ideia ou um jogo no Roblox. Pela proposta que você disse querer conhecer, ele pode ser um primeiro projeto delimitado para experimentar. A compra custa R$ 67 uma vez, inclui 30 dias de curso e Mural completo e não renova automaticamente.

**Botão:** Conhecer o primeiro projeto → oferta padrão.

### Exemplo D · Primeira vez, adulto quer entender conteúdo, prefere ao vivo mas aceita conhecer

**Conheça uma iniciação em que o conteúdo aparece no funcionamento do jogo**

Você quer entender o que seu filho vai aprender antes de escolher uma atividade de programação. Como ele ainda não tentou criar um jogo, ajuda começar por um projeto com poucas regras e uma sequência que vocês consigam reconhecer.

No Farol, primeiro ele faz o personagem andar e ficar dentro do cenário. Depois programa o encontro com a chave e guarda que ela foi recolhida. Por fim, monta uma decisão: a porta responde de um jeito sem a chave e de outro jeito com ela. Movimento, memória e condição deixam de ser apenas nomes porque aparecem em ações que ele precisa montar e testar.

Você disse que prefere aulas ao vivo, mas quer conhecer o gravado. Aqui, seu filho assiste a uma explicação e pode interrompê-la no ponto de montar. Se precisar de mais tempo para localizar o bloco, a orientação fica disponível para rever durante o acesso. A família escolhe o horário; dúvidas podem ser enviadas por mensagem. Esse formato tem flexibilidade, mas não oferece resposta imediata de um professor durante a tentativa.

Antes de decidir, mostre a cena e a montagem dos blocos. Vocês podem conversar sobre o que o personagem precisa conferir antes de abrir a porta e depois observar como isso aparece no programa. Se seu filho quiser conhecer esse tipo de atividade, vocês terão um exemplo concreto para escolher o começo. A conversa não funciona como teste de capacidade.

O Desafio permite conhecer essa iniciação com um projeto guiado, por R$ 67, pagamento único. Vocês têm 30 dias de curso e Mural completo. Se quiserem um percurso contínuo depois, a Comunidade dos Criadores é uma contratação separada. O Farol não representa uma formação completa em programação.

**Botão:** Ver como funciona essa iniciação → oferta de iniciação tecnológica.

### Exemplo C · Desenho é principal, mas a família aceita conhecer o Farol

**O interesse por personagens pode abrir uma conversa sobre como um jogo funciona**

Você contou que seu filho gosta de desenhar e que quer dar espaço a esse interesse. Vale reconhecer isso no convite: “Se esse personagem entrasse em um jogo, o que ele faria quando encontrasse uma porta?”. Mostre a demonstração e conversem sobre a ligação entre o personagem e a regra que o faz agir.

Há uma diferença importante antes de escolher o Desafio: no Farol, os desenhos já vêm preparados. Seu filho programa as regras do personagem; não aprende a desenhá-lo nesse curso. Como você disse que gostaria de conhecer essa primeira programação, a oferta pode ajudar a avaliar a ponte entre personagem e ação.

Ele acompanha a orientação, monta no Estúdio da aula e testa as respostas. O valor dessa primeira experiência está em perceber como uma regra faz a cena acontecer. Se o que ele quer agora é passar o encontro desenhando, essa entrega pode não corresponder ao interesse principal. Nesse caso, vale conhecer com calma a proposta de expressão visual da Comunidade e conferir seu percurso, sem tratar as duas compras como equivalentes.

**Botão:** Conhecer a programação do Farol → oferta padrão. Informar R$ 67/30 dias e arte preparada junto do botão. Motivo registrado continua C.

### Exemplo de prioridade compartilhada · A e D empatados, interesse ainda desconhecido

**Vale conhecer uma construção que vocês possam experimentar e conversar a respeito**

Você deu o mesmo peso a encontrar uma atividade para o tempo de tela permitido e a conhecer uma iniciação em programação. Também contou que ainda não sabe o que despertaria o interesse do seu filho. O primeiro passo pode ser mostrar uma atividade concreta, antes de decidir um curso por ele.

Na demonstração abaixo, o personagem encontra uma chave e a porta passa a responder de outro jeito. Mostre também o trecho de montagem e pergunte se ele gostaria de conhecer como essa regra é feita. É uma forma de apresentar a programação pela ação que aparece no jogo. Se preferir outra atividade, essa resposta ajuda vocês a escolherem; não significa falta de capacidade.

O Desafio oferece esse começo com a arte preparada, explicação gravada e prática dentro da aula. Seu filho pode pausar, montar uma parte e testar. O responsável pode ajudar no primeiro acesso e pedir que mostre uma regra; dúvidas da aula seguem por mensagens, com possível espera. Essa experiência pode ajudar vocês a conhecer o formato, mas a conversa e a primeira tentativa é que vão mostrar como ele participa.

Se quiserem conhecer o percurso completo, são R$ 67 uma vez, para 30 dias de curso e Mural completo, com visita ao Mural depois. A página abaixo mostra as três construções e as condições. Seus dois motivos continuam considerados; não precisamos escolher um perfil para vocês à força.

**Ação:** Copiar o convite para conversar. **Link secundário:** Conhecer o Desafio → oferta padrão. Este exemplo pressupõe Q8 `conversar`, além de computador e formato compatíveis.

### Exemplo de incompatibilidade · Sem computador e exigência de ao vivo

**Antes de escolher, há duas condições importantes para a sua família**

Você contou que hoje dispõe de celular ou tablet e precisa de um professor ao vivo acompanhando a atividade. O Desafio foi pensado para montar o jogo no navegador de um computador, com mouse e teclado. A orientação é gravada e a ajuda acontece por mensagens, podendo exigir espera.

Por essas duas diferenças, eu não indicaria a compra como se ela atendesse à situação que você descreveu. Vocês ainda podem conversar sobre uma regra de jogo usando objetos em casa. Se conseguirem reservar um computador e quiserem reconsiderar o formato, é possível voltar às respostas. A Comunidade também usa esse modelo assíncrono; ela não resolve a exigência de aula ao vivo.

**Botão:** Conferir os requisitos do curso. **Link:** Alterar minhas respostas. Sem botão de compra no resultado.

## Conferência editorial e cenários para implementação

### Como desenvolver a dúvida escolhida em Q5

Usar a passagem correspondente para desenvolver a preocupação real, ajustando a transição ao restante do resultado. Não acrescentar todas as passagens em sequência nem repetir uma explicação já presente. Idade, experiência e condições práticas modulam o exemplo; uma resposta incompatível prevalece sobre o convite comercial.

**Interesse:** “Antes de escolher por ele, vale mostrar o que acontece com a porta e perguntar se gostaria de descobrir como essa regra é feita. Se ele já pediu para criar um jogo, você pode retomar essa vontade. Se ainda não pediu, a conversa serve justamente para apresentar uma possibilidade. Observe se quer experimentar e o que gostaria de mudar. Uma primeira reação não define capacidade nem obriga vocês a comprar.”

**Companhia:** “Sua dúvida é quanto dessa atividade vai depender de você. Vale estar junto no primeiro acesso, ajudar a abrir a aula e observar uma pequena tentativa. Depois da explicação, veja se seu filho consegue pausar, localizar o bloco e testar. Se ainda precisar de apoio, vocês podem combinar outra tentativa com companhia. A aula explica a montagem; você pode ajudar a se organizar e a comunicar uma dúvida. Não existe aqui a promessa de que toda criança fará tudo sozinha.”

**Ajuda:** “Quando uma parte não funcionar, seu filho pode comparar o que montou com a explicação e usar a verificação da etapa. Se continuar em dúvida, o ‘Preciso de ajuda’ no rodapé da aula abre o caminho para explicar o que aconteceu. Por exemplo: ele pegou a chave, mas a porta não respondeu. A conversa segue nos Recados e a resposta pode exigir espera. Isso permite consultar a orientação e retomar a tentativa, mas é diferente de ter um professor ao vivo acompanhando cada movimento.”

**Rotina:** “Para encaixar na rotina, comecem reservando um momento com o computador disponível. A família pode usar uma parte do tempo de tela que já permite para conhecer a aventura e experimentar a primeira construção. Como a explicação é gravada, seu filho pode pausar e voltar ao trecho durante o acesso. As três etapas organizam a montagem; não obrigam a fazer tudo em três dias seguidos. O prazo de uso é de 30 dias a partir da aprovação da compra, então vale escolher um período em que conseguirão abrir espaço para essa experiência.”

**Valor:** “Pelos R$ 67, vocês conhecem um percurso completo para construir o Farol: introdução ao jogo, três etapas de programação, explicações que podem rever, prática dentro da aula, material de consulta e ajuda por mensagens. A aula ensina também a publicar a criação. Curso e participação completa no Mural ficam disponíveis por 30 dias; depois permanece a visita para ver e jogar. Essa compra não vira assinatura. Para decidir se vale a experiência, compare o que seu filho procura com esse projeto e esse formato, e não apenas com o preço.”

**Sem dúvida específica:** “Antes de escolher, mostre a aventura ao seu filho e combinem uma primeira tentativa. Os desenhos já vêm preparados: a atividade será montar as regras do jogo no computador. Vocês podem conferir na demonstração como a explicação acompanha os blocos, o que acontece quando ele testa e como envia uma dúvida. Assim, o convite parte de algo que ambos conseguiram conhecer.”

Em Q5 `valor`, o preço já aparece no desenvolvimento; no fechamento, basta um quadro curto com as condições. Em Q5 `ajuda` combinado com preferência por ao vivo, unir a explicação em um único trecho coerente. A página final precisa soar como uma conversa, não como seis respostas concatenadas.

### Casos a conferir

Esta versão foi conferida por leitura de regras e casos; não foi executada uma simulação do novo motor. A implementação deve automatizar estes cenários antes da publicação:

| Caso | Resultado necessário |
| --- | --- |
| A + criança só joga | Não afirmar desejo prévio de criar; destino A. |
| B + tentativa interrompida | Ajuda e retomada desenvolvidas; não diagnosticar persistência. |
| D + preferência ao vivo | Explicar gravado e espera; preferência não bloqueia. |
| C + aceita Farol | Destino padrão com limite explícito; motivo continua C. |
| A/C com prioridade A | Mostrar ambas; conferir limite de expressão visual, sem atribuir gosto por desenho se só relatou histórias. |
| B/D com pesos iguais | Principal vazio, dupla prioridade preservada; oferta padrão. |
| Exploração | Convite leve; não inventar avatar identificado. |
| Outra procura | Reconhecer limite; não declarar adequação a um desejo desconhecido. |
| Sem computador | Requisitos antes da compra; celular não classifica como disponível. |
| Computador compartilhado | Orientação de horário, sem reprovação. |
| Exige ao vivo | Não encaminhar assinatura como solução equivalente. |
| Projeto recusado por desenho | Explicar o desencontro; nenhuma promessa de Pinta no Desafio. |
| Exige Roblox/Minecraft | Informar ferramenta própria e ausência dessa entrega. |
| Já cria independentemente | Aviso de escopo inicial, sem infantilizar. |
| Faixa fora do recorte | Saída informativa, sem inferir incapacidade. |
| Troca resposta e volta | Limpar ramo inativo; recalcular destino e texto. |
| Refaz para outro filho | Nova revisão de respostas; não misturar resultados anteriores. |
| Falha ao salvar ou sessão expirada | Mensagem de erro e retomada; não fabricar resultado completo. |
| Respostas antigas do quiz | Não converter Explorador/Inventor/Desafiador/Investigador nos novos motivos. |
| Só inventa histórias | Falar de personagem e ação; não afirmar que desenha. |
| Não observou os interesses | Convite para apresentar algo novo; não afirmar que a criança não tem interesses. |
| Não sabe informar interesses | Reconhecer incerteza; não converter em ausência de interesse. |
| Q8 quer conversar com o filho | Convite como ação principal, oferta secundária; não declarar aceitação da criança. |
| Equipamento a conferir | Recomendação condicional; checagem antes da compra. |
| Sem computador e continua orientação | Preservar a restrição no resultado; não voltar a mostrar recomendação de compra como confirmada. |
| Q3B e Q2 sem vontade declarada | Reconhecer desejo do adulto de ver um projeto; não dizer que o filho já pediu para programar. |
| Interesse visual secundário, Q8 aceita | Explicar arte preparada sem bloquear o curso por causa do interesse secundário. |

As telas precisam funcionar por teclado e no celular do responsável. O curso exige computador, mas o quiz não. Rodapé, logo, espaçamento, foco, estados de erro e botões seguem a experiência visual da Comunidade. O progresso deve refletir perguntas realizadas e ramos ativos, sem estimativa falsa de minutos nem percentuais que retrocedem ao abrir um ramo.
