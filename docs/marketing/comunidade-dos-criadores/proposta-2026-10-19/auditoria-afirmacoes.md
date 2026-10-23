# Auditoria de afirmações sobre o produto: seis peças propostas

Data: 19/10/2026. Escopo: texto visível e atributos `alt` de Pagina917, PaginaMenor9, PaginaAdulto, QuizAdultoResultado, QuizMenorResultado e QuizMenor9Resultado (`scratchpad/canvas-ofertas/project/`). Nenhum arquivo foi editado.

Como ler: "L" é a linha do texto visível extraído por `scratchpad/ofertas-3-publicos/work/audit/extract.py` (rodar `python3 -I extract.py <peça>.dc.html` reproduz a numeração). Caminhos de fonte partem da raiz do repositório; `CLAUDE funnel` = `packages/funnel/CLAUDE.md`, `CLAUDE kids` = `packages/community-kids/CLAUDE.md`, `oferta/` = `packages/funnel/src/funnels/comunidade-dos-criadores/oferta/`, `seed` = `packages/members/src/application/adult-journey/adult-journey-seed.ts`, `operacao` = `docs/plans/2026-10-18-comunidade-adulta-operacao.md`, `posicionamento` = `scratchpad/ofertas-3-publicos/posicionamento-e-plataforma.md`.

Vereditos: CONFERE, NÃO CONFERE, SEM FONTE, AMBÍGUA. Na área adulta, DESENHO = existe no código ou no plano aprovado, sem curso publicado; SEM BASE = promessa sem desenho nem decisão registrada.

## Contexto que atravessa as peças

1. Idade. Toda fonte atual diz 9 a 14 anos (`oferta/tempo-de-tela.ts:24`, `oferta/continuidade-faq.ts:355`, `quiz/result-copy.ts:148`) ou "a partir de 9 anos" (`packages/funnel/src/content/legal-kids.ts:164`). O quiz v5 tem as faixas 9 a 11, 12 a 14, menos de 9 e 15 ou mais, e as duas últimas caem fora da orientação (`quiz/questions.ts:39-54`). O cadastro do perfil aceita qualquer idade abaixo de 18 (`packages/auth/src/domain/profile/profile.aggregate.ts:288`, "Sem piso"). As páginas 9 a 17 e menores de 9 são decisão de público ainda não refletida em copy, quiz, e-mails e Termos (`posicionamento`:19, 364, 389). Nas tabelas, cada idade fora de 9 a 14 recebe NÃO CONFERE com a nota "decisão pendente".
2. Horizonte do catálogo. A Jornada tem 8 postos e exige 49 cursos (`packages/core/src/journey/catalog.ts:96-119`). Há 5 cursos publicados; o mapa real alcança só Faísca e Construtor, e a captura mostra "Mais 6 postos estão sendo construídos" (`oferta/visuals.ts:206-222`; `CLAUDE funnel`, "Nada de em construção nas telas"). Por decisão da dona a copy explica a liberação por posto sem falar de curso em preparação; as tabelas seguem essa regra e não penalizam Pensa, Molda, Ponte e código, mas apontam onde a peça dá a entender que são imediatos.
3. Telas. Só captura real entra na página (`CLAUDE funnel`, decisão de 01/10/2026; `oferta/visuals.ts:3-5`). Ilustrações de personagens são permitidas; maquete de tela apresentada como tela, não.
4. Relatos. Só as falas de `oferta/relatos.ts`, literais, identificadas como no Instagram (nome, Aluno/Aluna ou relação, contexto), sem número, prazo ou resultado (`relatos.ts:3-7`; `copy/proposta-melhoria-2026-10-16/blocos-comuns.md:73-79`). André e Débora são Aluno e Aluna (`CLAUDE funnel`).
5. Preço. R$ 97 mensal e R$ 797 anual com `compareAtPriceCents` 116400 (`packages/catalog/scripts/seed.ts:563, 591-593`). A página real lê tudo ao vivo e não escreve valor à mão (`CLAUDE funnel`). As peças escrevem os valores; a conta está certa, mas a implementação precisa usar os marcadores.
6. Área adulta. Não existe nome, produto, oferta, preço, termos de assinatura, curso publicado, espaço no Hub nem captura de tela (`posicionamento`:100-118; `operacao`). O desenho da jornada adulta foi decidido em 19/10/2026 (`seed:5-43`).

## Pagina917 (9 a 17, Comunidade dos Criadores)

| Afirmação resumida | Onde | Veredito | Fonte | Redação proposta |
| --- | --- | --- | --- | --- |
| "9 a 17 anos" | L1, L6 | NÃO CONFERE (decisão pendente) | `tempo-de-tela.ts:24`; `legal-kids.ts:164`; `quiz/questions.ts:39-54` | Manter 9 a 14 até a dona mudar copy, quiz, e-mails e Termos |
| Manda o link para os amigos jogarem no celular | L8 | CONFERE | `oferta/shared.ts:50, 123`; `CLAUDE kids`, `/jogar` público | |
| "Você acompanha tudo pela sua área" | L8 | AMBÍGUA | `shared.ts:51` lista o que a área mostra | "Você acompanha pela sua área" |
| Não precisa entender de programação | L8 | CONFERE | `shared.ts:101-103` | |
| "Ele faz sozinho e chama você para ver, não para resolver" | L11 | AMBÍGUA | `shared.ts:110` (sentar junto nas primeiras aulas) | "Depois das primeiras aulas, ele faz sozinho e chama você para ver" |
| 7 dias de garantia; cancela quando quiser, sem multa | L13, L41, L118, L184 | CONFERE | `legal-kids.ts:221, 228-230` | |
| Lê com autonomia; computador, mouse e teclado; até 2 perfis | L14 | CONFERE | `tempo-de-tela.ts:24`; `shared.ts:123`; `legal-kids.ts:166` | |
| Herói com o Estúdio no modo Ponte | L15 (alt) | AMBÍGUA | Tela real (`visuals.ts:275-284`), mas a Ponte abre no 7º posto (`catalog.ts:210-221`; `journey-rewards.ts:145-148`) | Herói com a tela `estudio` (blocos); Ponte só na seção da Jornada |
| "Jeffrey, aluno, de fone de ouvido diante do computador" | L16 (alt) | CONFERE | `relato-jeffrey.webp` conferido; `relatos.ts:40-46` | |
| Selos "Publicado no Mural" e "Link pronto para mandar" junto do Jeffrey | L17-L19 | SEM FONTE | Nenhum relato diz que o jogo dele foi publicado; N18 diz "Ainda estou desenvolvendo" (`relatos.ts:188`) | Tirar os selos, ou usar um jogo real publicado com autorização |
| "o gratuito é uma aulinha que não aprofunda" na voz da página | L22 | AMBÍGUA (editorial) | Paráfrase de N14 (`relatos.ts:160`); contexto.md pede não desqualificar gratuitos | Deixar na fala do Harle |
| "O que falta é um curso que ele comece, se interesse e não queira parar" | L23 | CONFERE (paráfrase de N7) | `relatos.ts:118` | |
| "Um personagem, uma fase, um jogo publicado. Coisa feita por ele" | L27 | AMBÍGUA | Personagem próprio só no Pinta, no Construtor (`shared.ts:97`) | "Uma regra, uma fase, um jogo publicado" |
| "O jogo que ele inventa no jantar vira jogo de verdade" | L28 | AMBÍGUA (mecanismo) | Jogo próprio exige Estúdio livre, no Construtor, após concluir e publicar A Chave do Farol (`shared.ts:164`; `packages/community-kids/src/server/studio-gate.ts:27-39`) | "Depois do primeiro curso publicado, o jogo que ele inventa no jantar vira jogo de verdade" |
| Testa, vê o que saiu diferente, ajusta | L29 | CONFERE | `shared.ts:89` | |
| "me mostra o que você mudou" | L30 | CONFERE | `tempo-de-tela.ts:178` | |
| Sem aula marcada; projeto salvo | L31 | CONFERE | `shared.ts:117, 150` | |
| "Lógica, arte, 3D e, mais adiante, código, no mesmo projeto"; adolescente que fala em trabalhar com jogos | L32 | AMBÍGUA | Molda produz modelos para jogos 3D (`journey-rewards.ts:132-136`); um jogo 2D não tem 3D; carreira fora da proposta (`shared.ts:192`; `legal-kids.ts:204`) | "Lógica, arte, 3D e, mais adiante, código, na mesma plataforma" |
| AV08, "Daniel, pai do Rafael" | L35-L36 | CONFERE | `relatos.ts:47-53` | |
| AV09, "Harle, pai do Jeffrey" | L38-L39 | CONFERE | `relatos.ts:54-60` | |
| Tese: no jogo pronto alguém decidiu tudo; criando, ele decide | L43-L44 | CONFERE | `tempo-de-tela.ts:47-48` | |
| "Dois pais contam" seguido de uma mãe | L44 | AMBÍGUA (editorial) | `relatos.ts:61-67` (Flávia, Mãe) | "Uma mãe e um pai contam" |
| AV12, "Flávia, mãe do Fernando" | L46-L47 | CONFERE | `relatos.ts:75-81` | |
| N2, "Daniel, pai do Rafael" | L49-L50 | CONFERE | `relatos.ts:89-95` | |
| "Cada aula segue o mesmo caminho: 1 Primeiro, joga o pronto" | L52-L55 | AMBÍGUA | É o curso que começa com o jogo pronto (`shared.ts:109`; `tempo-de-tela.ts:66-67`) | "Cada curso segue o mesmo caminho" |
| Alt: versão pronta do Cadê com o contador | L54 | CONFERE | `visuals.ts:32-41` | |
| Alt: vídeo ao lado do Estúdio | L56 | CONFERE | `visuals.ts:52-62` | |
| Pausa e monta no Estúdio, editor de blocos; botão Ouvir lê | L57 | CONFERE | `shared.ts:109` | |
| Alt: "O botão Verificar esta parte, com o que já está cumprido" | L58 | SEM FONTE (tela) | Botão existe (`packages/member-shell/src/lib/lesson-copy-kids.ts:140`), mas não há captura em `visuals.ts` | Capturar a tela ou usar `aula-estudio` |
| Verificar esta parte mostra o que já está certo | L59 | CONFERE | `shared.ts:109` | |
| Alt: Mural com Jogar, Copiar link e Fazer a minha versão | L60 | CONFERE | `visuals.ts:285-294`; `components/kids/kids-space-detail.tsx:109-214` | |
| Jogo vai para o Mural com link que abre no celular | L61 | CONFERE | `shared.ts:50`; `CLAUDE kids`, `/jogar` e console móvel | |
| "Na primeira aula do Cadê Todo Mundo, ele faz o jogo contar cada bichinho" | L62 | NÃO CONFERE | Aula 1 programa a reação ao toque; o contador é a aula 2 (`docs/aulas-interativas/kids/cade-todo-mundo/README.md`; `cade-todo-mundo-aula-2.md:66-70`) | "Na primeira aula do Cadê Todo Mundo, ele faz o esconderijo sumir ao toque; na segunda, o jogo conta cada bichinho encontrado" |
| Botão "Jogue um jogo feito por um aluno" | L63 | SEM FONTE (funcional) | Sem destino no HTML; exige jogo real publicado por aluno com autorização (`relatos.ts:3-7`); o Mural de staging só tem perfis de teste (`CLAUDE funnel`) | Ligar a um jogo real autorizado ou retirar |
| Um projeto de cada vez, nesta ordem; cada um pode ir para o Mural | L65 | CONFERE | `shared.ts:172`; publicação na última aula com vitrine (`CLAUDE kids`, Compartilhar); Cadê publica (`CLAUDE funnel`, presente) | |
| Cadê Todo Mundo: contar cada bichinho; alt do jardim | L66-L67 | CONFERE | `visuals.ts:32-41, 63-72` | |
| A Chave do Farol: chave, farol, barco até a costa | L68-L69 | CONFERE | `packages/funnel/src/funnels/desafio-primeiro-jogo/offer-copy.ts:6, 26` | |
| Nave: anda, atira, soma pontos, três vidas | L70-L71 | CONFERE | `docs/aulas-interativas/kids/nave-contra-asteroides/nave-contra-asteroides-primeira-nave.roteiro.md:25`; README aula 4 | |
| O Jogo do Meu Jeito: "Deixa um jogo do jeito dele, com o que aprendeu até ali" | L72-L73 | AMBÍGUA | O curso desenha a própria nave e os asteroides em pixel art e os coloca no jogo da Nave (`docs/aulas-interativas/kids/o-jogo-do-meu-jeito/README.md`) | "Desenha a própria nave e os asteroides e coloca no jogo" |
| Corre, Dino: pula os cactos e decide até onde a corrida acelera | L74-L75 | CONFERE | `docs/aulas-interativas/kids/corre-dino/corre-dino-aula-01.roteiro.md:25`; README aulas 12 e 13 | |
| "As telas são demonstrações feitas pela equipe" | L76 | CONFERE | `visuals.ts:3-5` | |
| "cada jogo publicado abre ferramentas novas pelo caminho" | L79 | NÃO CONFERE | Ferramentas abrem por posto; após o Construtor cada posto exige 8 cursos (`catalog.ts:96-119, 121-237`); Mestre dos Jogos não abre nada (`journey-rewards.ts:109-110, 137-140`) | "e os postos da Jornada vão abrindo ferramentas novas pelo caminho" |
| Alt: Estúdio com blocos e jogo rodando | L80 | CONFERE | `visuals.ts:111-120` | |
| Fase 1: Estúdio livre, Pinta, Molda e ajuda do Zappy | L83 | CONFERE (omite o Pensa) | `packages/core/src/journey/state.ts:3-5, 23-28`; `journey-rewards.ts:118-145` | Incluir "o Pensa para planejar" |
| Postos Faísca, Construtor, Inventor, Explorador de Mundos, Mestre dos Jogos e Arquiteto de Mundos | L84 | CONFERE | `packages/community-kids/src/lib/level-info.ts:33-66`; `catalog.ts:121-208` | |
| Alt: modo Ponte | L85 | CONFERE | `visuals.ts:275-284` | |
| Fase 2 Ponte no posto Gênio da Criação | L86-L89 | CONFERE | `catalog.ts:210-221`; `shared.ts:191` | |
| Alt: "Editor em modo código, com os arquivos do jogo" | L90 | SEM FONTE (tela) | Modo Pro existe (`CLAUDE kids`, Estúdio Completo), sem captura em `visuals.ts` | Capturar ou retirar |
| Fase 3 código no posto Lenda | L91-L94 | CONFERE | `catalog.ts:223-236`; `journey-rewards.ts:149-152` | |
| Alt: aula com o jardim ao lado do Estúdio | L96 | CONFERE | `visuals.ts:52-62` | |
| 9 a 12: cria personagens, pinta cenários no Pinta e manda o primeiro link | L97 | AMBÍGUA | Pinta só no Construtor (`shared.ts:97`) | "manda o primeiro link e, no Construtor, pinta cenários no Pinta" |
| Alt: Molda com personagem 3D de blocos | L98 | CONFERE | `visuals.ts:264-274` | |
| 13 a 17: pode fazer a própria versão de jogos do Mural; a mesma regra aparece em código | L99 | CONFERE | Remix com Estúdio livre e blocos (`CLAUDE kids`, Remix; `kids-space-detail.tsx:125`); Ponte | |
| N18 cortado antes de "Ainda estou desenvolvendo, mas está ficando bom." | L101 | AMBÍGUA | `relatos.ts:188`; `trechos-novos.md`, N18 | Fala completa |
| Legenda "sobre um jogo que ele mesmo inventou no Estúdio da plataforma, com o que aprendeu nos cursos" | L102 | AMBÍGUA | A fala e `trechos-novos.md` dizem só "fora do curso"; "no Estúdio" é afirmação da dona, não do relato | Manter só com confirmação da dona; senão "sobre um jogo que ele mesmo inventou com o que aprendeu nos cursos" |
| Área do responsável mostra o que ele faz e decide como ele entra | L104-L105 | CONFERE | `CLAUDE kids`, Área dos pais e acesso por aparelho | |
| Painel por filho: cursos, atividades, entregas, posto | L106 | CONFERE | `shared.ts:51`; `visuals.ts:489-500` | |
| Resumo toda sexta às 17h, com os jogos publicados; dá para desligar | L107 | CONFERE | `packages/members/src/application/parent-report/send-parent-reports.service.ts:62, 73`; `app/pais/_components/weekly-report-toggle.tsx:56-59` | A plataforma diz "toda sexta no fim da tarde" (gatilho, não hora exata) |
| Autoriza cada computador por 1 a 90 dias; código vale 10 minutos | L108 | CONFERE | `components/kids/study-access-dialogs.tsx:51` (hoje, 7, 30, 90); `study-access-result.tsx:95` | |
| Até 2 perfis, cada um com jogos, progresso e Jornada | L109 | CONFERE | `shared.ts:49, 204` | |
| N8, Daniel | L111-L112 | CONFERE | `relatos.ts:124-130` | |
| Alt: painel do responsável com as atividades da semana | L113 | CONFERE | `visuals.ts:408-427` | |
| N15 (segunda frase), Harle | L115-L116 | CONFERE | `relatos.ts:166-172` (corte em fronteira de frase) | |
| Clube só de alunos; mensagens passam pela equipe antes | L122 | CONFERE | `legal-kids.ts:186`; `packages/hub/src/domain/ports/thread-repository.port.ts:111` | |
| Perfil público começa desligado; só o responsável liga | L123 | CONFERE | `legal-kids.ts:186`; `shared.ts:210` | |
| Página pública do jogo não mostra o nome | L124 | CONFERE | `CLAUDE kids`, `/jogar` "SÓ o jogo + título, NUNCA o nome da criança" | |
| Não existe chat livre; nas aulas os alunos não conversam | L125 | CONFERE | Clube e comentários do Mural com moderação prévia (`legal-kids.ts:186`; `CLAUDE kids`, "a criança só comenta (moderado) e reage") | |
| Microfone desligado; só o responsável libera | L126 | CONFERE | `legal-kids.ts:65, 113` | |
| Pode pedir remoção de publicação | L127 | CONFERE | `legal-kids.ts:186` | |
| Resumo mostra o que ele publicou | L128 | CONFERE | `send-parent-reports.service.ts:62` | |
| Alt: "Helena e Júlio, fundadores, em casa, diante do notebook" | L129 | SEM FONTE (origem) | Imagem (`survey/fundadores-raw.png`) bate com o alt, mas não está no repositório; confirmar que é foto real | Usar foto autorizada dos fundadores |
| Fundadores: pais do André e da Débora, Sistemas de Informação, tempo de tela do André, preparam as aulas | L131-L132 | CONFERE | `shared.ts:9-17` | |
| "André, nosso filho" | L133 | NÃO CONFERE (identificação) | `relatos.ts:26-32` (Aluno); `CLAUDE funnel`; `blocos-comuns.md:79` | "André, aluno" (a seção já diz "pais do André") |
| "cada posto da Jornada abre ferramentas novas" | L135 | AMBÍGUA | Mestre dos Jogos não abre (`journey-rewards.ts:137-140`) | "os postos da Jornada vão abrindo ferramentas novas" |
| Cursos publicados e lançados; Desafio incluído; Estúdio, Pinta, Molda e Pensa pela Jornada; Mural e Clube; Recados; 2 perfis e área do responsável | L136-L141 | CONFERE | `legal-kids.ts:177`; `shared.ts:46-51, 229, 235` | |
| R$ 97/mês; renova no cartão; cancela sem multa | L143-L144 | CONFERE (funcional: ao vivo) | `seed.ts:563`; `legal-kids.ts:211, 221` | Usar `{{preco_mensal}}` |
| "Menos de R$ 3,30 por dia" | L144 | CONFERE (aritmética 97/30) | | Derivar do preço ao vivo |
| Economia de R$ 367; R$ 797/ano; R$ 66,42/mês | L147-L150 | CONFERE (funcional: ao vivo) | `seed.ts:591-593` (116400 menos 79700); 797/12 | `{{economia_anual}}`, `{{equivalente_mensal_anual}}` |
| Pix à vista não renova; cartão renova por ano | L150 | CONFERE | `legal-kids.ts:211` | |
| Passos: perfil com nome e data; autorizar computador; código de 10 min | L154-L156 | CONFERE | `shared.ts:80`; `CLAUDE funnel`, acesso por aparelho; `visuals.ts:428-438` | |
| "em poucos minutos ele já está montando" | L157 | SEM FONTE (prazo) | A aula abre por vídeo e jogo pronto (`shared.ts:109`) | "A primeira aula abre com o jogo pronto, e a montagem começa na mesma aula" |
| 7 dias para ver a primeira aula; valor inteiro de volta | L158 | CONFERE | `shared.ts:74-75` | Em algum ponto, dizer que o pedido é por e-mail |
| "Meu filho tem 15 anos" | L160 | NÃO CONFERE (decisão pendente) | `continuidade-faq.ts:355` | |
| Zappy mascote; linguagem de aventura; "como no print do topo" | L161 | CONFERE (Zappy e aventura); AMBÍGUA (print = Ponte) | `CLAUDE kids`, "A criança lê aventura" | Ver linha do herói |
| Cancela sem multa; acesso até o fim; progresso guardado; modo férias | L163 | CONFERE | `legal-kids.ts:221`; `shared.ts:143-144` | |
| AV10, Flávia | L165 | CONFERE | `relatos.ts:61-67` | |
| Preciso de ajuda manda a dúvida; resposta nos Recados | L167 | CONFERE | `shared.ts:229` | |
| Cenários e personagens prontos; Pinta e Molda pela Jornada | L169 | CONFERE | `shared.ts:96-97, 165` | |
| Scratch e Roblox Studio são grátis | L171 | SEM FONTE (fato externo) | Nenhuma fonte no repositório; `contexto.md` aceita característica verificável | Manter só se confirmado fora |
| Aulas em português, um projeto por vez, espaço só de alunos, blocos até o código | L171 | CONFERE | `shared.ts:263-264`; `legal-kids.ts:186`; `shared.ts:191` | |
| Computador, navegador, sem instalar; celular e tablet só para jogar | L173 | CONFERE | `shared.ts:123`; `legal-kids.ts:174` | |
| Tempo de tela: combinados continuam; trocar assistir por criar | L175 | CONFERE | `shared.ts:136-137` | |
| Aulas gravadas; dúvidas por escrito nos Recados | L177 | CONFERE | `shared.ts:117, 229` | |
| "Se o mais novo ainda não lê sozinho, ele cria junto com você" | L179 | NÃO CONFERE (decisão pendente) | `legal-kids.ts:164`; `tempo-de-tela.ts:24`; `shared.ts:90` | |
| Cancelar em Conta, Minhas compras; jogos continuam no Mural | L181 | CONFERE | `shared.ts:241`; `legal-kids.ts:221` | |
| Razão social e CNPJ | L187 | CONFERE | `packages/funnel/src/content/legal.ts:23-24` | |
| Barra: R$ 97/mês ou R$ 66,42/mês no anual | L190 | CONFERE (funcional: ao vivo) | | |

## PaginaMenor9 (menores de 9, criando junto)

| Afirmação resumida | Onde | Veredito | Fonte | Redação proposta |
| --- | --- | --- | --- | --- |
| "menores de 9 anos, com um adulto ao lado" | L1, L5 | NÃO CONFERE (decisão pendente) | `legal-kids.ts:164`; `tempo-de-tela.ts:24`; o perfil aceita a idade (`profile.aggregate.ts:288`), os Termos não | Alterar Termos e copy antes de publicar |
| O personagem que ela escolheu aparece e faz o que ela inventou | L7, L23 | CONFERE (aula 2) | `cade-todo-mundo-aula-2.md:14, 54, 69` (escolhe bichos, esconderijos e mensagem) | "faz exatamente o que ela inventou" pede "o que ela programou" |
| Jogo no fim para mostrar aos avós | L7 | CONFERE | `shared.ts:50` | |
| Garantia 7 dias; sem multa | L12, L53, L121 | CONFERE | `legal-kids.ts:221, 228-230` | |
| Computador com mouse e teclado; até 2 perfis | L13 | CONFERE | `shared.ts:123`; `legal-kids.ts:166` | |
| Alt: ilustração de mãe e pai atrás do filho, com o Zappy | L14 | SEM FONTE (prova) | Ilustração, não demonstração real; `posicionamento`:389 marca a demonstração adulto e criança como pendente | Rotular como ilustração |
| No botão Ouvir, o Zappy lê as falas | L15, L36 | CONFERE | `shared.ts:109, 179`; `components/kids/kids-quiz.tsx:353` | |
| "Quase todo curso e aplicativo foi pensado para a criança usar sozinha" | L19 | SEM FONTE (generalização) | | "Muitos cursos e aplicativos..." |
| Ela esconde os bichinhos no jardim e chama você para achar | L24 | CONFERE | `cade-todo-mundo-aula-2.md:14, 69` | |
| Se tocar, some; se achar, conta mais um | L25 | CONFERE | `visuals.ts:121-136, 63-72` | |
| "monta a lógica com blocos, sem digitar nada" | L29 | AMBÍGUA | Mudar um valor exige digitar (`tempo-de-tela.ts:106`) | "quase sem digitar" |
| Ela decide quem se esconde, a cor do personagem, o que acontece no toque e quando o jogo acaba | L31 | NÃO CONFERE (parte) | Escolhe bichos, esconderijos e a mensagem do final (`aula-2.md:14, 69`); cor exige Pinta no Construtor (`shared.ts:97`); a vitória vem aos 3 achados (`aula-2.md:111`) | "Quem se esconde, onde se esconde, o que acontece no toque e a mensagem do final" |
| Um dos primeiros projetos é o Cadê Todo Mundo | L38 | CONFERE | `shared.ts:172` | |
| "Se ela quiser ouvir a fala de novo, é só apertar Ouvir" | L39 | AMBÍGUA | Ouvir lê as falas do Zappy, não o vídeo | "a explicação do Zappy de novo" |
| Jogam a versão pronta; montam; testam; guardam | L40-L43 | CONFERE | `shared.ts:109, 150` | |
| Esconderijo some com um toque; o jogo conta; você lê o bloco | L41 | CONFERE | `visuals.ts:121-136`; `aula-2.md:96-112` | |
| Alts: versão pronta; blocos no Estúdio | L44, L46 | CONFERE | `visuals.ts:32-41, 111-120` | |
| Alt: "Débora, aluna, sorrindo, de óculos" | L48 | CONFERE | `depo-debora.webp` conferido | |
| Débora começou pelo Desafio, incluído na assinatura | L49 | CONFERE | `relatos.ts:19-25`; `legal-kids.ts:177` | |
| AV03, fala | L50 | CONFERE | `relatos.ts:19-25` | |
| "Débora, aluna, 7 anos, sobre o Desafio" | L51 | NÃO CONFERE (idade) | `relatos.ts:7` (sem número); `blocos-comuns.md:75` (sem idade); nenhuma fonte dá a idade | "Débora, aluna, sobre o Desafio do Primeiro Jogo" |
| O projeto espera por vocês | L58 | CONFERE | `shared.ts:150` | |
| Alt: ilustração de duas crianças com o Zappy e troféu | L60 | SEM FONTE (prova) | Ilustração | Rotular como ilustração |
| Quando ler sozinha, cria por conta própria no mesmo perfil; irmão usa o segundo perfil | L62, L84, L112 | CONFERE | Perfil persiste; `shared.ts:49` | |
| Desafio incluído; 2 perfis; cursos novos sem custo | L63-L65 | CONFERE | `legal-kids.ts:177`; `shared.ts:46` | |
| "Depois do jardim, vêm o farol, a nave e o dino" | L66 | AMBÍGUA | Ordem real inclui O Jogo do Meu Jeito antes do Dino (`shared.ts:172`) | "vêm o farol, a nave, o jogo do jeito dela e o dino" |
| Alts e nomes dos três cursos | L67-L72 | CONFERE (nomes) | `shared.ts:172` | |
| Mais adiante, o desenho dela vira personagem no Pinta | L73 | CONFERE | `shared.ts:97` | |
| Alt: fundadores em casa | L74 | SEM FONTE (origem) | Como na Pagina917 | |
| Fundadores: pais, Sistemas de Informação, nasceu dos jogos com os filhos | L75 | CONFERE | `shared.ts:9-17` | |
| Perfil público desligado; jogo sem nome; microfone desligado; Clube com moderação, só alunos | L78-L81 | CONFERE | `legal-kids.ts:65, 186`; `CLAUDE kids`, `/jogar` | |
| Os dois planos dão acesso a tudo: cursos, Estúdio e ferramentas pela Jornada, Mural, área do responsável | L83 | CONFERE | `shared.ts:46-52` | |
| Preços e economia | L86-L93, L127 | CONFERE (funcional: ao vivo) | `seed.ts:563, 591-593` | Marcadores |
| Passos pós-assinatura | L97-L100 | CONFERE | `shared.ts:80`; `study-access-result.tsx:95` | |
| 7 dias para testar; valor inteiro | L101 | CONFERE | `shared.ts:74-75` | |
| "Ela ainda não lê. Dá certo? Dá, com você lendo" | L103-L104 | NÃO CONFERE (decisão pendente) | `tempo-de-tela.ts:24`; `shared.ts:90` | |
| Ouvir lê falas, perguntas e instruções; blocos e botões em texto | L104 | CONFERE | `kids-quiz.tsx:353`; nenhuma leitura em voz no Estúdio foi encontrada | |
| Parar por semanas e voltar do mesmo ponto; cancelar; acesso até o fim | L106 | CONFERE | `shared.ts:143, 150`; `legal-kids.ts:221` | |
| Parar no meio de uma aula e continuar outro dia | L108 | CONFERE | `shared.ts:150`; `CLAUDE kids`, rascunho da fase na conta | |
| Não funciona no tablet; computador com mouse e teclado | L110 | CONFERE | `shared.ts:123` | |
| "Ela tem 5 anos. É cedo? Depende mais de ela gostar..." | L113-L114 | NÃO CONFERE (decisão pendente) | `legal-kids.ts:164` | Responder só depois da revisão dos Termos |
| ScratchJr é gratuito e roda no tablet | L116 | SEM FONTE (fato externo) | | |
| Aula em português; projeto guiado; conta continua no mesmo perfil | L116 | CONFERE | `shared.ts:263`; perfil persiste | |
| Cancelar em Conta, Minhas compras; jogos no Mural | L118 | CONFERE | `shared.ts:241`; `legal-kids.ts:221` | |
| Razão social | L124 | CONFERE | `legal.ts:23-24` | |

## PaginaAdulto (18+, "Modo Criador")

| Afirmação resumida | Onde | Veredito | Fonte | Redação proposta |
| --- | --- | --- | --- | --- |
| Nome "Modo Criador" | L1, L3, L143 | SEM BASE (nome a decidir) | `posicionamento`:100-101 ("Nome: Não existe"); `operacao`:25 | Registrar a decisão de nome antes da copy |
| "é o seu nome que aparece na tela de título"; "UM JOGO DE SEU NOME"; "© VOCÊ"; "seu nome nos créditos" | L8, L10, L21, L24, L34 | SEM BASE | O Estúdio não gera tela de título nem créditos; `/jogar` mostra só o jogo (`CLAUDE kids`; `community/src/app/jogar/[id]/page.tsx:7`); o nome aparece no Mural só com perfil público (`components/community/public-profile-settings.tsx:147`) | "com o seu nome no Mural, se você quiser" |
| O herói tem a cara que você desenhou | L9, L38 | DESENHO | Pinta na 1ª etapa, Aprendiz (`seed:21-26`) | |
| Link que abre no celular, sem cadastro | L11, L67, L113 | DESENHO (código pronto) | `community/src/app/jogar/[id]`; Mural adulto depende de espaço no Hub (`operacao`:25) | |
| "7 dias de garantia. Cancele quando quiser." | L14, L41, L106, L193 | CONFERE (garantia); SEM BASE (cancelar) | `legal.ts:186`; termos adultos cobrem só o e-book (`posicionamento`:110) | Só com oferta e termos de assinatura adultos |
| "Para quem tem 18 anos ou mais" | L15, L121, L166 | SEM BASE (sem verificação) | Idade mínima não declarada (`posicionamento`:112); `legal.ts:57` só diz que o site não é dirigido a menores | Manter como público, sem afirmar que a área exige ou confere |
| Navegador do computador, mouse e teclado | L16, L124, L162, L176 | DESENHO | Equipamento não declarado para o adulto (`posicionamento`:118); coerente com o Estúdio | |
| R$ 97/mês; R$ 797/ano; economia de R$ 367; R$ 66,42 | L17, L151-L161, L198 | SEM BASE | Sem produto, oferta ou preço adulto no catálogo (`seed.ts`; `posicionamento`:102-105) | Preencher só com oferta criada |
| "Guardiões da Arena", jogo de arena "feito no Estúdio Pro" | L19-L25 | NÃO CONFERE | Tela fictícia apresentada como jogo da ferramenta; regra "só telas reais" (`CLAUDE funnel`) | Retirar, ou usar um exemplo real do Estúdio com legenda "exemplo da equipe" |
| Estúdio Pro é a ferramenta da fase 3 | L25 | DESENHO | `seed:42` (pro na 7ª etapa) | |
| Jogo rodando no navegador; amigos jogam pelo celular | L34-L35 | CONFERE | `/jogar`; console móvel | |
| Tudo fica salvo e espera você voltar | L37, L59, L178 | DESENHO | `operacao`:5 (nuvem `creations/adult/<accountId>`) | |
| Clube e Desafio do mês: mostra, joga o dos outros | L39, L115 | DESENHO | Rotas `(app)/comunidade` e `(app)/desafios`; Desafio exige Estúdio e Clube adulto (`desafios/page.tsx:52-56`); espaços a criar no Hub | |
| Criar é escrever as regras em blocos e ver o jogo obedecer | L44 | CONFERE | mecanismo das páginas kids | |
| Corre, Dino: pula o cacto ao apertar a tecla | L46 | CONFERE | `corre-dino-aula-01.roteiro.md:25-27` | |
| Pseudo-blocos "QUANDO APERTAR · PULAR" etc. | L47, L50, L53, L56 | AMBÍGUA | Não são os blocos reais ("quando o jogo começar", "a cada 1 segundo") | Legenda "esquema das regras" ou blocos reais |
| Nave: três vidas; encostou, perde uma | L49 | CONFERE | `nave-contra-asteroides-primeira-nave.roteiro.md:25`; README aula 4 | |
| Farol só acende depois da chave | L52 | CONFERE | `desafio-primeiro-jogo/offer-copy.ts:26` | |
| Nave: cada asteroide soma; "Quanto vale, você decide" | L55, L71 | CONFERE (ponto); DESENHO (valor aberto) | roteiro:25; `tempo-de-tela.ts:106` (atividade kids com valor aberto) | |
| Vídeo ao lado do editor; pausa, monta, vê | L59 | DESENHO | Sem aula adulta publicada (`posicionamento`:43) | |
| "Aperta Testar o jogo" | L65, L69 | SEM BASE (rótulo) | Rótulo não existe no Estúdio nem no member-shell (busca por "Testar o jogo" sem resultado) | Conferir o rótulo real do botão de rodar |
| "Verificar esta etapa" | L65 | DESENHO | `packages/member-shell/src/lib/lesson-copy.ts:258` (copy adulta) | |
| Alt e legenda: "Aula da Nave na área adulta: vídeo, Estúdio, botão Testar o jogo" | L68-L69 | NÃO CONFERE | A imagem (`work/adulto-aula-full.png`) é maquete: "Salvo na sua conta" em vez de "Guardado na sua conta" (`packages/studio/src/components/layout/Topbar.tsx:151`), gavetas e botões que o Estúdio não tem, nenhuma aula adulta publicada | Sem captura real, não mostrar tela de aula adulta |
| Você começa pelos clássicos; os mesmos jogos; publica com o seu nome | L73-L74, L174 | DESENHO (jogos); SEM BASE (nome) | Decisão de usar os mesmos jogos (tarefa); clone de curso Kids nasce rascunho (`posicionamento`:44) | |
| Cinco jogos, nomes e descrições | L75-L84 | CONFERE (nomes e descrições, como na Pagina917) | `shared.ts:172`; roteiros | O Jogo do Meu Jeito: mesma correção da Pagina917 |
| "As telas são demonstrações feitas pela equipe" | L85 | NÃO CONFERE | Não há captura adulta (`posicionamento`:117); as telas usadas são do Kids, e a página diz que a aparência adulta é outra (L174) | "As telas são da plataforma Kids; a área adulta tem outra aparência" |
| 7 etapas com nome e cor; conclui cursos, sobe, ganha a ferramenta | L88 | DESENHO; AMBÍGUA ("a ferramenta" por etapa) | `seed:15-43`; `community/src/lib/journey-stage.ts:13-14`; `core/journey/adult-policy.ts:106-146`; Construtor, Explorador e Mestre não liberam nada (`seed:27, 29-35`) | "algumas etapas liberam uma ferramenta nova" |
| Fase 1 blocos, etapas 1 a 5: Estúdio, Pinta e Molda; "pelo caminho chegam o Pinta e o Molda" | L89-L92 | DESENHO; AMBÍGUA (Pinta) | Estúdio e Pinta na 1ª, Molda na 3ª (`seed:21-28`) | "O Estúdio e o Pinta abrem na primeira etapa; o Molda, na terceira" |
| Fase 2 Ponte, etapa 6; a IA chega aqui (planejar, explicar erros) | L94-L97 | DESENHO | `seed:36-41` (bridge, ai, pensa no Arquiteto de Mundos); `operacao`:29; sem chave de IA no community (`CLAUDE kids`, Zappy do Studio) | |
| Alt: Ponte com JavaScript | L98 | CONFERE (tela Kids) | `visuals.ts:275-284` | Dizer que é tela do Kids |
| Fase 3 código, etapa 7: Modo Pro, arquivos e pastas | L99-L102 | DESENHO | `seed:42`; Pro com arquivos (`CLAUDE kids`, Estúdio Completo) | |
| Alt: Estúdio Pro com árvore de arquivos | L103 | SEM FONTE (tela) | Sem captura | |
| Pinta e Molda não usam IA | L104, L180, L184 | CONFERE | `community/src/app/(app)/criar/page.tsx:51-72`; `legal-kids.ts:102` | |
| Alt e legenda: Mural adulto com cartões | L107-L108 | SEM FONTE (tela) | Sem captura adulta; espaço a criar | |
| "Jogue um jogo feito aqui, no seu celular" | L109 | SEM BASE (funcional) | Sem destino; nenhum jogo adulto publicado | |
| Mural: quem recebe o link "pode fazer a própria versão" | L113 | AMBÍGUA | Remix é do membro com Estúdio liberado, não de quem recebe o link (`components/community/showcase-card.tsx:172`; `member-shell/src/lib/studio-tier.ts:80-130`) | "e você pode fazer a sua versão dos jogos dos outros" |
| Clube: conversa com pessoas de 18 anos ou mais | L114 | DESENHO + SEM BASE (idade) | Ver idade acima | |
| Ranking: só aparece quem quiser; perfil começa privado | L116 | AMBÍGUA | A posição aparece; o nome só com perfil público ("Participante", `ranking-client.tsx:29`; `public-profile-settings.tsx:147`; `operacao`:7) | "no ranking, o seu nome só aparece se você ligar o perfil público" |
| Dúvidas pelos Recados | L118, L186 | CONFERE | rota `(app)/recados`; `cursos/[slug]/page.tsx:290` | |
| Tutor com IA no Estúdio nas etapas avançadas | L118 | DESENHO | `criar/page.tsx:45`; `app/api/studio/zappy/*`; capacidade `ai` na 6ª etapa; chave de IA não configurada no adulto | |
| Não é para quem precisa de professor ao vivo; nem engine específica | L125-L129 | CONFERE (exclusões) | Oficinas ao vivo ficam fora do pacote (`posicionamento`:A6) | |
| Alt: "Helena e Júlio gravando uma aula com o Estúdio na tela" | L130 | SEM FONTE (origem) | Imagem (`survey/fundadores-aulas-raw.png`) bate com o alt; origem a confirmar | |
| Mais de dez anos; Banco do Brasil, Tractebel e InCeres; jogos com os filhos | L132-L133, Quiz L15 | CONFERE | `packages/funnel/src/content/sales-sections.ts:256`; `shared.ts:11, 17` | |
| "A área adulta usa o mesmo Estúdio e o mesmo Mural" | L133 | AMBÍGUA | Mesmo pacote de Estúdio (`CLAUDE kids`); Mural adulto é espaço próprio, separado do Kids (`operacao`:25) | "o mesmo Estúdio e um Mural próprio" |
| Cursos do primeiro jogo ao código; cursos novos sem custo; dois planos | L136, L145 | DESENHO (cursos); SEM BASE (planos) | `operacao`:13 (chave `all_courses`); sem oferta | |
| "Você cria sua conta com e-mail e já entra" | L138 | NÃO CONFERE | Compra gera e-mail com link para definir a senha (`funnels/no-comando-da-ia/index.ts:33-35`; `CLAUDE funnel`, pós-compra adulto) | "Depois do pagamento, você recebe por e-mail o link para criar a senha e entrar" |
| Passos: abre o curso, muda a regra, publica | L139-L141 | DESENHO | | |
| Reembolso integral por e-mail em 7 dias | L142 | CONFERE | `legal.ts:186` | |
| Pacote: Estúdio, Pinta, Molda; Mural; Clube e Desafio; etapas, conquistas e certificado; tutoriais e Recados | L146-L150 | DESENHO | Rotas existem; certificado (`app/validar/[id]`); progresso (`CLAUDE community`); Como fazer adulto não publicado (`docs/como-fazer-adulto/README.md`) | |
| Renova no cartão; Pix anual sem renovação | L153, L159 | SEM BASE | Sem assinatura adulta | |
| "O primeiro jogo leva o mesmo tempo aos 20 e aos 40" | L168 | SEM BASE (resultado) | `contexto.md` proíbe prazo de aprendizagem | Cortar |
| Primeiro curso com blocos e projeto preparado; cada parte conferida | L170 | DESENHO | `member-shell/src/components/studio/section-project-check.tsx:33` | |
| Sem promessa de carreira | L170 | CONFERE | diretriz (`contexto.md`; `legal-kids.ts:204`) | |
| Blocos, Ponte, código em três fases | L172 | DESENHO | `seed` | |
| "A área, as aulas, a conversa e o caminho até o código são adultos, com outra conta e outra aparência" | L174 | DESENHO; AMBÍGUA (aulas) | Conta própria (`operacao`:5); pele adulta (`CLAUDE community`); aulas adultas ainda não existem e o clone não adapta narração (`posicionamento`:44) | "A área e a conversa são adultas; as aulas chegam na versão adulta" só quando existirem |
| Tudo no navegador; celular para jogar | L176 | CONFERE | | |
| Pinta e Molda "entram quando você quiser desenhar os seus" | L180 | AMBÍGUA | Pinta na 1ª etapa, Molda na 3ª (`seed`) | "entram pelas etapas" |
| "O Estúdio livre e o Mural ficam na sua conta para os seus projetos" | L182 | AMBÍGUA | Estúdio livre exige capacidade `studio` (1ª etapa concluída), licença e paleta conquistada (`operacao`:16; `criar/page.tsx:105-110`; `member-shell/src/server/studio-unlocks.ts:38-66`) | "Depois da primeira etapa, o Estúdio livre..." |
| Limite mensal de pedidos à IA, no perfil; sem custo à parte | L184 | DESENHO | `components/community/profile/ai-credits-panel.tsx`; `posicionamento`:A3 (50/dia, 500/mês) | |
| Cancelamento em Compras; acesso até o fim; jogos continuam no Mural | L188 | SEM BASE | Rota `(app)/compras` existe; sem assinatura adulta; regra do Mural é dos Termos Kids (`legal-kids.ts:221`) | |
| Razão social | L195 | CONFERE | `legal.ts:23-24` | |
| "1P · RECORDE 00450" e outros dados de arcade | L23 | AMBÍGUA (decorativo) | Dados fictícios | Deixar claro que é moldura decorativa |

## QuizAdultoResultado

| Afirmação resumida | Onde | Veredito | Fonte | Redação proposta |
| --- | --- | --- | --- | --- |
| 7 a 14 horas por semana dão 364 a 728 horas por ano | L8 | CONFERE (aritmética, x52) | | |
| Fazer um jogo é escrever as regras em blocos | L10 | CONFERE | mecanismo | |
| Link que abre no celular | L10 | CONFERE | `/jogar` | |
| "O Modo Criador é a área adulta do Sistema Zero" | L12 | SEM BASE (nome) | `posicionamento`:100 | |
| Cada curso é um jogo completo: joga, muda, testa, publica | L12 | DESENHO | sem curso adulto | |
| Primeiros clássicos: nave, dino, farol | L12 | DESENHO | decisão de usar os mesmos jogos | |
| Primeira fase em blocos; Ponte e código depois | L12 | DESENHO | `seed` | |
| Alt e legenda: aula da Nave com botão Testar o jogo | L13-L14 | NÃO CONFERE | Maquete (ver PaginaAdulto L68-L69) | |
| Fundadores: Sistemas de Informação, mais de dez anos, jogos com os filhos | L15 | CONFERE | `sales-sections.ts:256`; `shared.ts:11` | |
| Aulas gravadas; vídeo ao lado do editor; projeto salvo na conta | L17 | DESENHO | | |
| "os dois planos"; "O preço e os planos aparecem na próxima página" | L18, L20 | SEM BASE | sem oferta adulta | |
| "Helena e Júlio, Sistema Zero" | L21 | CONFERE | | |
| Opinião Sim/Em parte/Não e Rever as respostas | L22 | CONFERE (padrão v5) | `CLAUDE funnel`, quiz v5 | |

## QuizMenorResultado (9 a 17, perfil B, filha de 13 a 17)

| Afirmação resumida | Onde | Veredito | Fonte | Redação proposta |
| --- | --- | --- | --- | --- |
| "filha de 13 a 17"; "ela tem entre 13 e 17 anos" | L1, L6 | NÃO CONFERE (decisão pendente) | `quiz/questions.ts:39-54` (faixas atuais) | |
| 2 a 4 horas por dia dão 730 a 1.460 horas por ano | L8 | CONFERE | calculadora I6, horas/dia x 365 (`CLAUDE funnel`) | |
| Ao tocar no esconderijo, o personagem aparece e o contador soma um | L10 | CONFERE | `visuals.ts:121-136, 63-72` | |
| "crianças e adolescentes de 9 a 17 anos" | L12 | NÃO CONFERE (decisão pendente) | `quiz/result-copy.ts:148` (9 a 14) | |
| Cada curso é um jogo completo; começa pela versão pronta; os cinco cursos na ordem | L12 | CONFERE | `shared.ts:47, 172` | |
| Conclui A Chave do Farol, publica, chega ao Construtor; Estúdio livre | L12 | CONFERE | `shared.ts:164` | Acrescentar "e o Pinta" |
| Alt e legenda: Estúdio com os blocos do jardim | L13-L14 | CONFERE | `visuals.ts:111-120` | |
| AV11 sem as aspas internas | L17-L18 | AMBÍGUA | `relatos.ts:69` marca "Eu quero mudar isso aqui no jogo" como fala do Rafael | Manter as aspas internas |
| Painel por filho: cursos, atividades, entregas, posto | L20 | CONFERE | `shared.ts:51` | |
| A ferramenta é o Estúdio, da própria plataforma | L20 | CONFERE | `shared.ts:263` | |
| Próxima página: cinco jogos, aula por dentro, Jornada, acompanhamento, planos | L21 | CONFERE | Pagina917 | |
| Assinatura "Helena e Júlio, Sistema Zero Kids"; opinião | L24-L25 | CONFERE | | |

## QuizMenor9Resultado (menores de 9)

| Afirmação resumida | Onde | Veredito | Fonte | Redação proposta |
| --- | --- | --- | --- | --- |
| "menos de 9 anos"; "ela cria com você" | L1, L6, L12 | NÃO CONFERE (decisão pendente) | `legal-kids.ts:164`; quiz v5 manda "menos de 9" para fora da faixa (`posicionamento`:235) | |
| "Quase todo curso e aplicativo foi pensado para a criança usar sem adulto" | L8 | SEM FONTE (generalização) | | "Muitos cursos..." |
| Regra em blocos: se tocar, some; se achar, conta mais um | L10 | CONFERE | `visuals.ts:121-136, 63-72` | |
| Você lê o passo e os blocos; Ouvir lê as falas do Zappy | L10, L20 | CONFERE | `shared.ts:109` | |
| "o personagem dela aparecendo na tela, acontece na primeira sessão" | L10 | AMBÍGUA | Na aula 1 os personagens vêm prontos (`cade-todo-mundo-aula-1.md:10`); a escolha de bichos é a aula 2 | "o bichinho aparecendo quando ela toca no esconderijo acontece na primeira sessão" |
| "duas ou três sessões curtas por semana bastam" | L10 | SEM FONTE (frequência) | | "cabem: o projeto fica guardado" |
| Um dos primeiros projetos é o Cadê Todo Mundo | L12 | CONFERE | `shared.ts:172` | |
| Quando ler sozinha, cria por conta própria no mesmo perfil | L12 | CONFERE | perfil persiste | |
| Alt e legenda: aula do Cadê com o vídeo, o Estúdio e o botão Ouvir | L13-L14 | CONFERE | `visuals.ts:52-62` | |
| "A Débora passou pelo Desafio com 7 anos" | L15 | NÃO CONFERE (idade) | `relatos.ts:7`; `blocos-comuns.md:75` | "A Débora passou pelo Desafio do Primeiro Jogo e contou assim" |
| AV03; "Débora, aluna, 7 anos" | L17-L18 | CONFERE (fala); NÃO CONFERE (idade) | `relatos.ts:19-25` | "Débora, aluna, sobre o Desafio do Primeiro Jogo" |
| Blocos dizem o que fazem, em português | L20 | CONFERE | `visuals.ts:111-120` | |
| Próxima página: sessão, papel, segurança, planos | L21 | CONFERE | PaginaMenor9 | |
| Assinatura e opinião | L24-L25 | CONFERE | | |

## Fatos da Jornada (Kids), posto por posto

Fontes: `packages/core/src/journey/catalog.ts:7-16, 121-237`; `packages/core/src/journey/state.ts:3-28`; `packages/community-kids/src/lib/journey-rewards.ts:117-153`; `packages/community-kids/src/lib/level-info.ts:33-78`; `packages/member-shell/src/lib/studio-tier.ts:30-60`; `oferta/shared.ts:48, 164-165, 191`.

1. Faísca (noob): Estúdio só dentro das fases, com as peças que a aventura ensina. Estuda o degrau de entrada, 1 curso: A Chave do Farol.
2. Construtor(a) (coder): exige concluir e publicar A Chave do Farol. Abre o Estúdio livre e o Pinta. A paleta do Estúdio livre é a união dos blocos dos cursos concluídos e publicados (`studio-unlocks.ts:69-87`; `CLAUDE kids`, "Ferramentas do Estúdio vêm dos cursos"). O Cadê Todo Mundo é curso extra e não leva ao Construtor (`continuidade-faq.ts:338-342`).
3. Inventor(a) (hacker): exige 8 cursos do degrau Iniciante 2D concluídos e publicados. Abre o Pensa e a ajuda do Zappy no Estúdio, que usam os créditos de IA da família (`shared.ts:178-185`).
4. Explorador(a) de Mundos (explorer): exige 8 cursos do Iniciante 3D. Abre o Molda, faixa básica (peças, pintura, movimentos), e o kit Jogo 3D.
5. Mestre dos Jogos (elite): exige 8 cursos do Intermediário 2D. Não abre ferramenta; dá "um posto novo no mapa" e a trilha nova.
6. Arquiteto(a) de Mundos (architect): exige 8 cursos do Intermediário 3D. No Molda chegam a malha, as camadas de pintura e a pintura que se mexe.
7. Gênio da Criação (champion): exige 8 cursos do Avançado 2D. Abre o modo Ponte (blocos e código lado a lado).
8. Lenda (god): exige 8 cursos do Avançado 3D. Abre o modo Pro (escrever o jogo em código; promover projeto para Pro) e, no Molda, os ossos, as curvas de movimento e a malha avançada.

Total de 49 cursos. Publicados hoje: Cadê Todo Mundo (extra), A Chave do Farol, Nave Contra Asteroides, O Jogo do Meu Jeito e Corre, Dino (`shared.ts:172`). O mapa real alcança o Construtor (`visuals.ts:206-222`).

Outros fatos usados: o remix "Fazer a minha versão" exige Estúdio livre e blocos que cubram o jogo (`CLAUDE kids`, Remix); a página pública `/jogar/<id>` abre sem login, em celular, e mostra só o jogo e o título; o Clube e os comentários do Mural têm moderação prévia; o resumo semanal sai às sextas, 17h de São Paulo, com os jogos publicados; a autorização de aparelho é de "somente hoje", 7, 30 ou 90 dias e o código vale 10 minutos; os créditos de IA são por família, 500 no mês e 50 no dia (`visuals.ts:464-475`).

## Fatos da área adulta

Fontes: `seed:5-43`; `packages/core/src/journey/adult-policy.ts:3-11, 81-146`; `packages/community/src/lib/journey-stage.ts:13-57`; `packages/community/CLAUDE.md`, seções "A cor da etapa da jornada" e "Mural, não Mostra"; `operacao`; `packages/community/src/app/(app)/criar/page.tsx:39-112`; `posicionamento`:40-118.

1. Etapas (desenho de 19/10/2026, cadastrado no Admin pelo script `journey:seed-adult`): 1 Aprendiz (Primeiros passos 2D) libera Estúdio e Pinta; 2 Construtor(a) (Iniciante 2D) nada; 3 Inventor(a) (Iniciante 3D) libera Molda, inteiro, sem as faixas do Kids; 4 Explorador(a) de Mundos (Intermediário 2D) nada; 5 Mestre dos Jogos (Intermediário 3D) nada; 6 Arquiteto(a) de Mundos (Avançado 2D) libera Ponte, IA e Pensa; 7 Gênio da Criação (Avançado 3D) libera Pro. A posição final, Lenda, é quem concluiu as sete. Cada etapa exige concluir (e publicar, nos cursos com vitrine) todos os cursos do nível; o seed para na primeira etapa sem curso adulto publicado.
2. Estado: política inicial vazia; nenhum curso adulto publicado; nenhuma ferramenta liberada até a etapa existir e ser concluída; licenças `adult-estudio-completo`, `adult-pinta`, `adult-molda`, `adult-pensa` por oferta; chave de IA não configurada no community.
3. Estúdio: modos blocos, Ponte e Pro; paleta vem dos cursos; tutor de IA no canto quando a capacidade `ai` existir; Pinta e Molda sem IA; Pensa com IA após a etapa avançada.
4. Comunidade: Clube (`(app)/comunidade`) e Mural dos Criadores adulto (`mural-dos-criadores-adulto`, espaço próprio, não o do Kids) com canais e permissões a criar no Hub; Desafio do mês (`(app)/desafios`) exige Estúdio e Clube adulto; ranking e liga mostram o nome só de quem ligou o perfil público; perfil público e voz desligados por padrão; `/jogar/<id>` público, sem login; remix por quem tem Estúdio liberado.
5. Apoio: Recados, Preciso de ajuda na aula, Ajuda com busca no Como fazer (50 tutoriais escritos em `docs/como-fazer-adulto`, não publicados), chamado no helpdesk; certificado com validação pública; Seu progresso com etapas, conquistas, XP e moedas.
6. Venda: sem nome, produto, oferta, preço, termos de assinatura, funil (`pro/<slug>` e `FUNNEL_OFFER_<KEY>`) ou captura de tela. Pós-compra adulto: e-mail com link para definir a senha. Reembolso de 7 dias por e-mail nos termos adultos atuais, que cobrem só o e-book.

## Onde cada peça confunde o jogo do curso com o jogo próprio

O mecanismo certo: a criança faz os cursos; concluir e publicar sobe de posto; cada posto libera parte das ferramentas; com o que aprendeu, ela cria os próprios jogos no Estúdio da plataforma; quanto mais cursos, mais ferramentas; a liberação é progressiva de propósito.

- Pagina917: o herói (L8, L28) e os três ganhos (L9-L11) falam do jogo inventado por ele como se fosse o primeiro passo; o jogo próprio só existe no Construtor, depois de A Chave do Farol publicada, e com os blocos dos cursos feitos. A seção "Como funciona" (L52-L62) descreve bem o jogo do curso. A Jornada (L79, L135) diz que cada jogo ou cada posto abre ferramenta, e não é assim. O selo "Publicado no Mural" ao lado do Jeffrey (L18) mistura o jogo próprio dele, ainda em desenvolvimento, com publicação. Falta uma frase que diga onde o jogo próprio é feito: "no Estúdio da plataforma, com os blocos que ele conquistou nos cursos".
- PaginaMenor9: a página descreve só o jogo do curso (Cadê Todo Mundo) e chama isso de "o jogo dela" (L6, L23). Está correto para a personalização da aula 2 (bichos, esconderijos, mensagem), mas "a cor do personagem" (L31) e "faz exatamente o que ela inventou" (L7) prometem mais do que a aula entrega. A liberação do Estúdio livre e do Pinta aparece só em L73 e L83.
- PaginaAdulto: a tela de título com o nome (L8-L24) e "O jogo inteiro tem a sua cara" (L38) vendem o jogo próprio como o resultado do primeiro curso; o desenho prevê Estúdio livre e Pinta só depois da etapa 1 concluída, e o jogo publicado com o nome não existe. "Posso fazer um jogo meu, fora das aulas?" (L181-L182) responde "Pode" sem a condição da etapa.
- Quizzes: o do adulto (L12) e o dos 9 a 17 (L12) mantêm a sequência curso, publicação, posto, Estúdio livre; o dos menores de 9 (L10) fala em "o personagem dela" na primeira sessão.

## Separação dos problemas

Editoriais (voz, argumento, identificação): "Dois pais" com uma mãe; "não para resolver"; paráfrase do gratuito na voz da página; "André, nosso filho"; idade da Débora; aspas internas de AV11; corte do N18; títulos e dados de arcade decorativos.

De prova (fonte, tela, relato): selos do Jeffrey; "Guardiões da Arena"; maquete da aula adulta; alts de telas sem captura (Verificar esta parte, modo Pro, Mural adulto, Estúdio Pro); ilustrações do criar junto; origem das fotos dos fundadores; botão "Jogue um jogo feito por um aluno"; afirmações externas sobre Scratch, Roblox Studio e ScratchJr; "mesmo tempo aos 20 e aos 40"; "em poucos minutos".

Funcionais (o que precisa existir ou mudar antes de publicar): idade 9 a 17 e menores de 9 em copy, quiz, e-mails e Termos; preços e economia por marcador ao vivo; destino dos botões de jogar; para o adulto, nome, produto, oferta, preço, termos, funil, cursos, espaços no Hub, chave de IA e rótulos reais ("Testar o jogo", "Salvo na sua conta").

## Verificações realizadas e não realizadas

Realizadas: leitura integral do texto visível e dos alts das seis peças; conferência contra `CLAUDE funnel`, os módulos de `oferta/`, `legal-kids.ts`, `legal.ts`, `sales-sections.ts`, o quiz v5, o core da Jornada, `studio-tier.ts`, `studio-unlocks.ts`, `studio-gate.ts`, `level-info.ts`, `journey-rewards.ts`, o seed e a política da jornada adulta, as rotas e componentes do community, o seed do catálogo, os roteiros de Cadê Todo Mundo, Nave, Corre Dino e O Jogo do Meu Jeito, o relatório semanal, o acesso por aparelho, os documentos de decisão de 16/10 e as imagens `relato-jeffrey.webp`, `depo-debora.webp`, `fundadores-raw.png`, `fundadores-aulas-raw.png` e `adulto-aula-full.png`.

Não realizadas: as imagens das peças (`/_blob/...`) não foram abertas, então os alts das telas Kids foram conferidos contra `visuals.ts`, não contra o arquivo; não foi conferido em staging se o Cadê Todo Mundo publica no Mural para assinantes; não foi lido o `.riv`/áudio do Ouvir nem o rótulo real do botão de rodar do Estúdio; a origem das fotos dos fundadores e a hospedagem dos vídeos V1/V2 não foram verificadas; nenhum teste de conversão foi feito. Esta é revisão editorial e de prova, com verificação funcional por leitura de código, sem executar os serviços.
