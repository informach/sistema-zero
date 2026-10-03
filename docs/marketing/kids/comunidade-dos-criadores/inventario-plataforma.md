# Comunidade Kids: inventário de recursos e valor para a família

Levantamento de 01/10/2026, feito no repositório local do Sistema Zero. Complementa a [estratégia das páginas](estrategia-paginas.md) e fundamenta o [deck de argumentação](deck-argumentacao.md).

## Conclusão da análise

O principal valor da Comunidade está na ligação entre orientação, prática, criação, publicação e acompanhamento. A criança encontra uma explicação, realiza uma ação, vê seu efeito, guarda o trabalho e tem um caminho para continuar. O responsável pode acompanhar atividades, temas explorados, projetos e etapas da jornada.

Essa combinação sustenta argumentos específicos para os quatro perfis. Para A, torna visível uma possibilidade de aprendizagem dentro do tempo de tela permitido. Para B, organiza o começo e a continuidade da criação de jogos. Para C, conecta escolhas visuais a personagens e cenários interativos. Para D, oferece uma estrutura de iniciação tecnológica com etapas e produções observáveis.

Os recursos mais úteis à argumentação são aqueles que tornam uma preocupação concreta mais fácil de resolver: a explicação perto da ferramenta; a possibilidade de rever; a retomada; a ajuda com contexto; as criações que a família pode conhecer; a liberação gradual; os perfis separados; e a área dos responsáveis. A existência desses mecanismos está documentada abaixo. Seu impacto sobre aprendizagem, autonomia, permanência ou conversão precisa ser observado no uso.

## Escopo e interpretação da evidência

O levantamento percorreu o mapa das 32 rotas de tela do app Kids e examinou os componentes e serviços das famílias funcionais abaixo: aprendizagem, jornada, Estúdio, Pinta, Molda, Pensa, Zappy, criações, comunidade, gamificação, perfis, responsáveis e contratação. Inclui funcionalidades compartilhadas implementadas em member-shell, core, members, hub e auth. Não é um inventário de cada função interna ou bloco de programação: agrupa capacidades que fazem diferença para a experiência e a compra.

**Foi uma análise estática de código, contratos e documentação local.** Não houve acesso ao banco de catálogo, sessão autenticada de aluno, teste no navegador, envio de mensagens ou verificação de produção. Assim, código implementado, conteúdo publicado, operação ativa e resultado educacional são evidências diferentes. A página de oferta local orienta o contrato comercial, mas não substitui a conferência do catálogo na hora de publicar a copy.

| Marca | O que significa neste inventário |
| --- | --- |
| I | Implementação identificada no código local. Não equivale a execução verificada nesta análise. |
| C | Uso condicionado a curso, configuração, assinatura, nível, serviço ou conteúdo publicado. |
| O | Condição apresentada na oferta local; deve corresponder ao catálogo e ao checkout vigentes. |
| H | Benefício interpretado a partir do mecanismo, ainda sem comprovação específica de resultado. |

Todas as consequências descritas na coluna de valor são interpretações funcionais. Quando envolvem interesse, confiança, autonomia ou aprendizagem, também são H. As necessidades do deck são sínteses editoriais da pesquisa e da conversa, não falas literais de clientes.

## Aprendizagem e orientação

| ID | Recurso e funcionamento identificado | Valor para pai e filho | Estado e condição | Fontes |
| --- | --- | --- | --- | --- |
| <a id="r01"></a>R01 | Guias de primeiro acesso para responsável e criança; indicação de criar perfil, escolher criança, avatar e primeira atividade. | Ajuda a família a começar e a criança a localizar a primeira ação. | I; guia acompanha o estado do perfil e pode ser dispensado/reaberto. | [S01] |
| <a id="r02"></a>R02 | Navegação por Início, Jornada, Criar, Comunidade e Meu espaço; atalhos para ferramentas disponíveis. | Organiza destinos por uso, com acesso às ferramentas da etapa. | I/C; ferramenta ainda bloqueada não vira atalho disponível. | [S02] |
| <a id="r03"></a>R03 | Continuar/começar, registro de navegação e seção da aula; prioridade para passos pendentes. | Reduz a busca pelo lugar de recomeçar. | I/C; depende dos registros e da disponibilidade da aula. Não garantir retomada de todo estado transitório. | [S03], [S04] |
| <a id="r04"></a>R04 | Mapa da Jornada e trilha de curso, com progresso, postos e requisitos de avanço. | Dá uma visão do percurso e do próximo marco. | I/C; horizonte visual depende do catálogo. Estrutura curricular não é quantidade de cursos publicados. | [S04], [S05] |
| <a id="r05"></a>R05 | Sequência pedagógica: etapas futuras, curso base, cursos de recompensa e cursos extras; trava sequencial quando configurada. | Ajuda a oferecer atividades compatíveis com o percurso. | I/C; nem todo curso segue a mesma regra. Extra exige matrícula, mas não posição na jornada. | [S04], [S05] |
| <a id="r06"></a>R06 | Aula organizada em seções, com índice, anterior, próxima e requisitos de conclusão. | Apresenta uma atividade de cada vez e indica o que ainda falta. | I/C; configuração varia por aula. Não significa navegar livremente por toda a formação. | [S03], [S06] |
| <a id="r07"></a>R07 | Vídeos com reprodução, pausa, retorno e, no player correspondente, posição guardada e tela cheia. | Permite rever uma explicação durante a prática. | I/C; não pressupor os mesmos controles para qualquer vídeo externo. | [S07] |
| <a id="r08"></a>R08 | Conteúdo e editor/cena na mesma seção, com divisão ajustável e manutenção da instância do editor. | Aproxima orientação e execução, reduzindo o vaivém entre materiais. | I/C; algumas atividades abrem ferramenta em outra aba. | [S03], [S06] |
| <a id="r09"></a>R09 | Aula imersiva, menus recolhidos e espaço ampliado de ferramenta. | Dá mais área à atividade e simplifica a tela durante a criação. | I; organização visual não comprova melhora de atenção. | [S08] |
| <a id="r10"></a>R10 | Cenas manipuláveis para tornar visíveis relações como eventos, repetição, posição, movimento e colisão. | Permite observar uma mudança ligada à explicação. | I/C; depende da cena incluída na aula. Catálogo de cenas não comprova uso em todos os cursos. | [S09] |
| <a id="r11"></a>R11 | Quizzes com uma pergunta por vez, correção e regras de aprovação/tentativa. | Dá retorno sobre respostas em atividades configuradas. | I/C; não é avaliação completa de domínio nem componente obrigatório de toda aula. | [S06], [S10] |
| <a id="r12"></a>R12 | Conclusão confere requisitos: seção, vídeo, materiais, atividade, envio, resultado ou ação de plataforma, conforme configuração. | Dá significado operacional ao avanço e informa pendências. | I/C; requisito cumprido não prova compreensão ou autoria independente. | [S10] |
| <a id="r13"></a>R13 | Estúdio e Pinta dentro de aulas; rascunho, envio da atividade e recado opcional ao professor. | A criança executa e registra uma produção associada à aprendizagem. | I/C; enviar não implica revisão humana de toda entrega. | [S06], [S11] |
| <a id="r14"></a>R14 | Recuperação da própria entrega do Estúdio, com ação de trazer o que foi enviado. | Ajuda a retomar uma versão já entregue. | I/C; depende de envio existente. Não é histórico ilimitado de alterações. | [S11], [S12] |
| <a id="r15"></a>R15 | Materiais da aula: anexos, links, acesso/download e indicação de item obrigatório quando configurado. | Reúne os materiais necessários perto da atividade. | I/C; lista e formatos dependem do curso. | [S13] |
| <a id="r16"></a>R16 | Leitor de livro e prévia de material integrado à aula. | Oferece outra forma de consultar a explicação ou o material. | I/C; livro depende de autoria e publicação. | [S06], [S13] |
| <a id="r17"></a>R17 | Texto, imagens, áudio, diálogo do mascote e conteúdo interativo incorporado. | Permite combinar instrução escrita, falada e visual. | I/C; não declarar cobertura universal de legendas, transcrições ou audiodescrição. | [S06] |
| <a id="r18"></a>R18 | Biblioteca Como fazer, com busca, coleções e tutoriais; retorno à aula quando acessada por link contextual. | Ajuda a resolver dúvidas sobre como usar a plataforma. | I/C; o catálogo de tutoriais publicados não foi consultado. | [S14] |
| <a id="r19"></a>R19 | Preciso de ajuda na seção; conversa privada em Recados, histórico, resposta e retorno ao contexto da aula. | Permite pedir ajuda explicando onde surgiu a dificuldade. | I/C; resposta assíncrona da equipe, sem prazo ou revisão universal comprovados. | [S03], [S15] |
| <a id="r20"></a>R20 | Certificado em PDF, número de identificação e validação pública. | Registra e permite compartilhar uma conclusão. | I/C; só nos cursos/blocos configurados e após requisitos. Não é diploma ou comprovação de ganho cognitivo. | [S16] |

## Estúdio e criação visual

| ID | Recurso e funcionamento identificado | Valor para pai e filho | Estado e condição | Fontes |
| --- | --- | --- | --- | --- |
| <a id="r21"></a>R21 | Estúdio de programação em blocos, usado nas aulas e na criação livre liberada. | Permite construir regras com peças visuais e instruções concretas. | I/C; recursos da aula e do Estúdio livre têm permissões distintas. | [S11], [S17] |
| <a id="r22"></a>R22 | Prévia do jogo e recursos de teste/inspeção; edição das regras e do comportamento. | Torna possível relacionar uma alteração ao efeito na criação. | I/C; exemplo de aprendizagem precisa mostrar a ação real. | [S17], [S18] |
| <a id="r23"></a>R23 | Materiais do jogo: imagens, sons e modelos; projetos de aula podem trazer elementos preparados. | Permite concentrar a atividade na regra ensinada e usar arte pronta quando apropriado. | I/C; conferir materiais do projeto demonstrado. | [S12], [S18] |
| <a id="r24"></a>R24 | Blocos e extensões liberados pelo currículo; recursos de aula selecionados por autoria. | Apresenta ferramentas conforme o percurso em vez de exigir conhecer tudo no começo. | I/C; não chamar isso de adaptação automática por inteligência artificial. | [S04], [S17] |
| <a id="r25"></a>R25 | Estúdio livre com criar, abrir, nomear, importar e continuar projetos próprios. | Oferece espaço para aplicar e variar o que foi aprendido. | I/C; acesso livre a partir de Construtor(a), além do direito da assinatura. | [S04], [S17] |
| <a id="r26"></a>R26 | Galerias e Meus trabalhos; cópia local e sincronização de criações compatíveis com a conta. | Organiza jogos, desenhos e criações e permite recuperá-los em outro aparelho após sincronização. | I/C; confirmar Guardado na sua conta. Arquivo apenas local não está disponível em outro aparelho. | [S19] |
| <a id="r27"></a>R27 | Desfazer/refazer e exportação/importação de arquivos de projeto, com recursos próprios de cada ferramenta. | Permite experimentar e conservar cópias compatíveis do trabalho. | I/C; não prometer histórico completo, backup infalível ou portabilidade universal. | [S12], [S20] |
| <a id="r28"></a>R28 | Publicação do projeto: preparação de título, descrição e capa e integração com o Mural. | Dá um destino compartilhável à produção. | I/C; depende do projeto, acesso e regras de publicação. | [S21] |
| <a id="r29"></a>R29 | Ponte entre blocos e código. | Possibilita observar outra representação da criação em etapa avançada. | I/C; a partir de Gênio da Criação, com percurso disponível. | [S04], [S17] |
| <a id="r30"></a>R30 | Modo Código/Pro e projetos mais avançados. | Amplia as possibilidades para uma etapa posterior da jornada. | I/C; Lenda. Não é entrega inicial nem promessa de formação profissional concluída. | [S04], [S17] |
| <a id="r31"></a>R31 | Pinta em pixel art: personagens, fundos e peças. | Abre espaço para desenhar elementos do próprio jogo. | I/C; livre em Construtor(a), ou configuração específica de aula. | [S22], [S23] |
| <a id="r32"></a>R32 | Pinta em vetor: desenho por formas, traços e ferramentas de edição. | Oferece outra linguagem visual além do pixel art. | I/C; ferramentas podem ser reduzidas em uma aula. | [S22], [S23] |
| <a id="r33"></a>R33 | Animações de personagens, quadros, estados, velocidade e prévia. | Permite explorar movimento na criação visual. | I/C; configurar e aplicar a animação requer ações da criança. | [S22], [S23] |
| <a id="r34"></a>R34 | Peças de cenário e mapas, em composição por tiles; integração de mapa com projeto. | Permite pensar o espaço onde o jogo acontece. | I/C; não confundir mapa visual com regras de um jogo completo. | [S22], [S23] |
| <a id="r35"></a>R35 | Cores, paletas, camadas, formas, seleção, espelho, grade e guias no Pinta. | Dá recursos para testar composições e personalizar a aparência. | I/C; conjunto visível varia por editor e curadoria da aula. | [S22] |
| <a id="r36"></a>R36 | Importação e exportação visual: arquivos de projeto e formatos como PNG, GIF ou SVG, conforme o tipo. | Permite reaproveitar e levar produções compatíveis. | I/C; não afirmar que digitaliza qualquer desenho em papel ou exporta tudo em todos os formatos. | [S20], [S22] |
| <a id="r37"></a>R37 | Trazer do Pinta para o Estúdio; edição do desenho e atualização da ligação existente. | Conecta a escolha artística ao projeto interativo. | I/C; ferramentas liberadas e formatos compatíveis. Mostrar a passagem real. | [S17], [S23] |
| <a id="r38"></a>R38 | Molda: peças tridimensionais, mover/girar/dimensionar, cor, pintura, referência, espelho e movimentos. | Abre uma etapa de criação visual em três dimensões. | I/C; Explorador(a) de Mundos. Acesso depende do percurso e dos cursos necessários. | [S24], [S25] |
| <a id="r39"></a>R39 | Molda intermediário/avançado: medidas, malha, camadas, materiais, ossos/pesos, curvas e interoperabilidade. | Oferece possibilidades posteriores de construção e acabamento. | I/C; famílias em Arquiteto(a) de Mundos e Lenda. Não apresentar tudo como liberado ao abrir o Molda. | [S24], [S25] |
| <a id="r40"></a>R40 | Criações do Molda guardadas e integradas à biblioteca de materiais do Estúdio. | Relaciona criação de elementos 3D e uso em jogos compatíveis. | I/C; depende de formato, ferramentas e etapa. | [S17], [S25] |

## Planejamento e ajuda de inteligência artificial

| ID | Recurso e funcionamento identificado | Valor para pai e filho | Estado e condição | Fontes |
| --- | --- | --- | --- | --- |
| <a id="r41"></a>R41 | Pensa: conversa e registro da ideia, objetivo, controles e resultado do jogo. | Ajuda a organizar uma ideia em decisões compreensíveis. | I/C; Inventor(a), produto incluído e serviços de IA disponíveis. | [S26], [S27] |
| <a id="r42"></a>R42 | Artefatos de planejamento: desenho do jogo, direção visual, plano e revisão. | Dá uma referência para manter coerência entre ideia, visual e construção. | I/C; sugestões exigem interpretação e conferência. | [S26] |
| <a id="r43"></a>R43 | Tarefas com passos, critérios, dependências e abertura da ferramenta correspondente. | Ajuda a transformar um plano em ações no Pinta, Estúdio ou Molda. | I/C; não é criação automática de qualquer jogo. | [S26], [S27] |
| <a id="r44"></a>R44 | Ciclos e versões do planejamento, com metas e progresso de tarefas. | Permite retomar a ideia e preparar uma nova versão. | I/C; versão do plano não equivale a versionamento ilimitado de todo arquivo. | [S26] |
| <a id="r45"></a>R45 | Equipe no Pensa por código de convite; gestão de participantes, troca/desativação do código e saída. | Permite compartilhar decisões e planejamento com colegas que tenham acesso. | I/C; compartilha o plano. Cada criança constrói nas próprias ferramentas, sem coedição simultânea comprovada do mesmo jogo. | [S28] |
| <a id="r46"></a>R46 | Zappy no Estúdio usa contexto de blocos, erro e projeto e pode apontar explicações/aulas/ajuda acessíveis. | Oferece apoio contextual durante a criação em etapa elegível. | I/C; Inventor(a), ativação do serviço e créditos. Pode errar; não substitui professor humano. | [S29] |
| <a id="r47"></a>R47 | Limites de uso de IA por dia/mês, saldo familiar e instruções/filtros de proteção. | Torna o uso mais delimitado e visível ao responsável. | I/C; saldo compartilhado entre crianças. Proteções não justificam promessa de infalibilidade. | [S29], [S30] |

## Publicação, comunidade e convivência

| ID | Recurso e funcionamento identificado | Valor para pai e filho | Estado e condição | Fontes |
| --- | --- | --- | --- | --- |
| <a id="r48"></a>R48 | Mural com projetos, capas, títulos, comentários e filtros de apresentação. | Dá visibilidade às produções e permite conhecer criações da turma. | I/C; depende de acesso e publicações existentes. Não prova comunidade movimentada. | [S21], [S31] |
| <a id="r49"></a>R49 | Link público para jogar; apresentação do jogo e controles compatíveis, inclusive controles móveis quando aplicáveis. | Permite que familiares experimentem uma criação publicada. | I/C; jogar no celular não torna o celular adequado para fazer o curso. Visibilidade pode mudar por moderação. | [S21], [S32] |
| <a id="r50"></a>R50 | Cartão imprimível com capa/título e QR do jogo. | Leva uma produção digital para uma apresentação simples em família. | I/C; exige link de jogo disponível. | [S33] |
| <a id="r51"></a>R51 | Comentários, respostas, reações e anexos nas superfícies da comunidade. | Permite trocar impressões sobre ideias e produções. | I/C; permissões e moderação por espaço/canal. Não prometer comentários para toda publicação. | [S31] |
| <a id="r52"></a>R52 | Remix de projeto publicado, respeitando acesso e compatibilidade de recursos. | Permite estudar e modificar uma base de outro criador. | I/C; requer Estúdio livre e permissões compatíveis. Não autoriza qualquer cópia externa. | [S31], [S34] |
| <a id="r53"></a>R53 | Clube: conversas, canais, sugestões para iniciar publicação e espaço de avisos da equipe. | Oferece um lugar para conversar sobre criação além da aula. | I/C; fórum assíncrono, não turma ao vivo ou chat privado irrestrito. | [S31], [S35] |
| <a id="r54"></a>R54 | Combinados de convivência e pré-moderação de mensagens conforme configuração. | Estabelece regras e uma etapa de aprovação para a participação. | I/C; seed cria espaços com aprovação, mas a configuração atual do banco não foi auditada. | [S35], [S36] |
| <a id="r55"></a>R55 | Avisar professor/denunciar conteúdo e ferramentas de moderação da equipe. | Dá um caminho para comunicar algo inadequado. | I/C; presença do canal não garante resposta imediata ou risco zero. | [S31], [S36] |
| <a id="r56"></a>R56 | Desafio do mês, tema comum, participação por publicação e reconhecimento. | Oferece um motivo para aplicar o que foi aprendido em outra criação. | I/C; Estúdio e Clube, nível de criação e desafio disponível. Não prometer encontro ou avaliação individual mensal. | [S37] |
| <a id="r57"></a>R57 | Perfil visível a colegas quando autorizado, com avatar, conquistas, quarto e produções. | Permite apresentar uma identidade de criador na comunidade. | I/C; desativado por padrão pelo domínio de perfis. Isso não torna privados os jogos publicados por link. | [S38] |
| <a id="r58"></a>R58 | Indicadores de novidade do Clube e Recados. | Ajuda a localizar retorno e atividade recente. | I/C; depende de haver novidade; não indica professor online. | [S15], [S31] |
| <a id="r59"></a>R59 | Recados iniciados pela equipe, individuais ou coletivos, entregues em conversas privadas. | Permite orientar e comunicar informações dentro da plataforma. | I/C; é capacidade operacional, não compromisso de acompanhamento proativo de cada aluno. | [S39] |

## Identidade, conquistas e motivação

| ID | Recurso e funcionamento identificado | Valor para pai e filho | Estado e condição | Fontes |
| --- | --- | --- | --- | --- |
| <a id="r60"></a>R60 | Avatar tridimensional com personalização e itens. | Oferece escolhas de apresentação pessoal. | I/C; itens podem depender de conquista ou moedas internas. | [S40] |
| <a id="r61"></a>R61 | Cor do perfil persistida e aplicada à experiência. | Permite reconhecer e personalizar o próprio espaço. | I; não confundir com antigo tema claro/escuro da plataforma. | [S40] |
| <a id="r62"></a>R62 | Quarto com móveis, posição, decoração, cores e mascotes/animais conforme catálogo. | Oferece outra atividade de composição e expressão pessoal. | I/C; itens disponíveis e saldo. Não é o argumento central de aprendizagem em programação. | [S41] |
| <a id="r63"></a>R63 | Medalhas, conquistas, troféus, celebrações e apresentação do posto. | Reconhece marcos e registra realizações na experiência. | I/C; conquista de sistema não prova competência fora da plataforma. | [S40], [S41], [S42] |
| <a id="r64"></a>R64 | Pontos de experiência por atividades registradas. | Dá retorno de participação. | I; XP não determina sozinho o posto da Jornada, nem mede aprendizagem. | [S04], [S42] |
| <a id="r65"></a>R65 | Missões diárias, semanais e mensais, com resgate de recompensas. | Oferece objetivos complementares ligados a ações da plataforma. | I/C; seleção considera acesso e oportunidades. Não exigir uso diário na copy. | [S42] |
| <a id="r66"></a>R66 | Moedas internas, baús de unidade e uso de saldo para itens. | Relaciona atividades a escolhas de personalização. | I/C; distinguir moedas internas de preço da assinatura e de créditos de IA. | [S42] |
| <a id="r67"></a>R67 | Sequência de dias de atividade e protetores de sequência. | Torna visível uma regularidade de participação. | I/C; respeitar rotina familiar; não prometer formação automática de hábito. | [S43] |
| <a id="r68"></a>R68 | Modo férias com período definido e proteção da sequência. | Reconhece pausas planejadas na rotina. | I/C; não suspende a cobrança nem estende o acesso contratado. | [S43] |
| <a id="r69"></a>R69 | Ranking e ligas com posição e regras de período. | Oferece uma forma de participação para quem aprecia esse tipo de estímulo. | I/C; não pressupor que competição motiva toda criança. | [S44] |

## Responsáveis, perfis e acesso

| ID | Recurso e funcionamento identificado | Valor para pai e filho | Estado e condição | Fontes |
| --- | --- | --- | --- | --- |
| <a id="r70"></a>R70 | Área do responsável protegida por verificação; sessão da criança separada da gestão. | Reserva configurações e assuntos da conta ao adulto. | I; não equivale a controle do dispositivo ou de todos os sites acessados. | [S30], [S45] |
| <a id="r71"></a>R71 | Até dois perfis na oferta local, com progresso e projetos próprios. | Permite atender dois filhos sem misturar os percursos. | I/O/C; capacidade deriva do direito do plano. Não extrapolar para acesso simultâneo ilimitado. | [S45], [S46] |
| <a id="r72"></a>R72 | Criação/edição/arquivamento de perfil, nome, nascimento opcional e autorização de visibilidade. | Dá ao responsável controle sobre os perfis da família. | I; recomendação comercial 9–14 é diferente do bloqueio técnico de maiores de idade. | [S38], [S45] |
| <a id="r73"></a>R73 | Painel por criança: cursos em andamento/concluídos, entregas, pontos, conquistas e jornada. | Permite acompanhar registros de participação em um lugar. | I/C; não interpreta sozinho as causas de dificuldade ou abandono. | [S30] |
| <a id="r74"></a>R74 | Temas explorados nas aulas e jogos publicados na semana. | Oferece assunto concreto para conversar sobre a experiência. | I/C; tema explorado não significa habilidade dominada. | [S30] |
| <a id="r75"></a>R75 | Resumo semanal por e-mail, com preferência de recebimento. | Pode levar o acompanhamento à rotina do adulto. | I/C; serviço exige integrações e considera contas com atividade. Entrega de e-mail não foi verificada. | [S30], [S47] |
| <a id="r76"></a>R76 | Próxima conquista, publicações pendentes e ferramentas incluídas/liberadas no painel. | Ajuda o responsável a entender o que falta para avançar. | I/C; respeita currículo e acesso. | [S30] |
| <a id="r77"></a>R77 | Convites para conversar sobre ideia, teste, mudança e próxima versão, com acesso a produções. | Dá ao adulto uma forma de participar sem assumir a aula de programação. | I/H; profundidade da conversa e vínculo são resultados a observar. | [S30], [S33] |
| <a id="r78"></a>R78 | Atendimento da família na área do responsável, com pedidos e histórico. | Reúne problemas de conta e solicitações à equipe. | I/C; distinto de ajuda pedagógica em Recados. | [S48] |
| <a id="r79"></a>R79 | Histórico de compras e gerenciamento de assinaturas, situação, cobrança e cancelamento elegível. | Permite consultar a relação comercial e controlar a renovação. | I/C; exige integração de pagamentos. Não foi feita transação. | [S49] |
| <a id="r80"></a>R80 | Oferta mensal/anual com contratação por checkout e continuidade durante o período pago. | Oferece opções de compromisso financeiro. | O/C; preço dinâmico. Valores de contingência do código não confirmam o preço atual. | [S46], [S49] |
| <a id="r81"></a>R81 | Garantia descrita na oferta e canal para solicitar reembolso. | Dá clareza sobre a decisão inicial e sobre como solicitar a garantia. | O/C; conferir regra integral. Cancelar renovação e pedir reembolso são ações distintas. | [S46], [S49] |
| <a id="r82"></a>R82 | Acesso aos cursos publicados e aos adicionados durante a assinatura, respeitando a jornada. | Sustenta continuidade além de uma única produção. | O/C; lançamento e catálogo em evolução. Não há contagem de cursos publicados validada aqui. | [S04], [S46] |
| <a id="r83"></a>R83 | Experiência pelo navegador do computador; leitura, mouse, teclado e internet como requisitos da oferta. | Permite explicar com antecedência o preparo necessário em casa. | I/O; não prometer funcionamento completo em celular, offline ou em qualquer máquina. | [S46] |
| <a id="r84"></a>R84 | Estados claros de indisponibilidade, conteúdo ainda em preparação, ferramenta bloqueada e erro de salvamento. | Ajuda a distinguir problema técnico, etapa futura e falta de acesso. | I/C; não prova ausência de falhas. | [S06], [S17], [S19], [S25], [S27] |
| <a id="r85"></a>R85 | Controles de foco, rótulos, navegação por teclado em superfícies e redução de movimento em partes da interface. | Oferece recursos de uso e apresentação para diferentes preferências. | I/C; auditoria completa de acessibilidade não foi feita. Não declarar conformidade total. | [S08], [S33], [S41] |
| <a id="r86"></a>R86 | Interface e orientação editorial em português, com termos ligados às ações da criança. | Ajuda a explicar onde clicar, o que mudar e o que observar. | I/C; ferramentas avançadas podem conter código e termos técnicos. | [S18], [S22] |
| <a id="r87"></a>R87 | Continuidade da conta e do percurso para quem já começou no Desafio, conforme acesso. | Evita apresentar a assinatura como um recomeço obrigatório. | O/C; origem pelo Desafio não comprova conclusão nem satisfação. | [S46] |
| <a id="r88"></a>R88 | Programa de embaixadores na área dos pais, com indicação por link e acesso introdutório específico. | Pode permitir apresentar a experiência a outra família. | I/C; benefício e campanha próprios. Não transformar em renda garantida ou teste gratuito universal da assinatura. | [S50] |

## Retorno sobre a experiência e recuperação de conta

| ID | Recurso e funcionamento identificado | Valor para pai e filho | Estado e condição | Fontes |
| --- | --- | --- | --- | --- |
| <a id="r89"></a>R89 | Avaliação de curso por estrelas, comentário e perguntas opcionais sobre clareza, prática, interesse e expectativa. | Oferece um canal para a criança contar como percebeu a experiência e para a equipe investigar melhorias. | I/C; formulário implementado não comprova avaliações recebidas nem satisfação. Uso público de relatos exige contexto e autorização. | [S51] |
| <a id="r90"></a>R90 | Telas de login, solicitação de recuperação e redefinição de senha por token; alteração de senha na gestão. | Dá à família caminhos para voltar à conta e administrar suas credenciais. | I/C; depende de autenticação, token e entrega da mensagem de recuperação. O fluxo não foi executado. | [S45], [S52], [S53] |

## O que se libera em cada etapa

Esta tabela descreve regras implementadas. A possibilidade real de alcançar cada etapa depende dos cursos obrigatórios publicados e acessíveis. A assinatura inclui direitos; o percurso determina a liberação de uso.

| Etapa | Regra e capacidade | Implicação para a copy |
| --- | --- | --- |
| Faísca | Entrada, aulas e ferramentas configuradas dentro delas. | Mostrar a experiência inicial real. Não abrir uma conta administrativa e apresentá-la como primeiro acesso da criança. |
| Construtor(a) | Curso obrigatório de entrada concluído e projeto publicado; Estúdio livre e Pinta. | Explicar a passagem da orientação inicial à criação livre. |
| Inventor(a) | Requisitos cumulativos de Primeiros Passos e Iniciante 2D; Pensa e elegibilidade ao Zappy do Estúdio. | Ajuda de IA também depende de ativação e créditos. Não é professor particular desde o primeiro dia. |
| Explorador(a) de Mundos | Requisitos acumulados até Iniciante 3D; Molda básico. | Mostrar 3D como etapa posterior, condicionada ao percurso disponível. |
| Mestre dos Jogos | Requisitos até Intermediário 2D. | Continuidade de recursos do currículo, sem anunciar Ponte antes do posto correto. |
| Arquiteto(a) de Mundos | Requisitos até Intermediário 3D; ferramentas intermediárias do Molda. | Distinguir ferramentas do Molda básico e intermediário. |
| Gênio da Criação | Requisitos até Avançado 2D; modo Ponte. | Explicar relação entre blocos e código como possibilidade avançada. |
| Lenda | Requisitos até Avançado 3D; Pro e ferramentas avançadas do Molda. | Não converter o nome do modo em promessa de qualificação profissional. |

Fontes: [catálogo canônico da jornada][S04], [regras das ferramentas][S05], [Molda][S24] e [acesso ao Zappy][S29]. O código prevê 49 posições obrigatórias no percurso completo; isso **não significa 49 cursos publicados**. Cursos extras e de recompensa seguem regras próprias.

## Capacidades que exigem cuidado na apresentação

| Achado | Consequência para argumentação e demonstração |
| --- | --- |
| A vitrine de exemplos do Estúdio livre é habilitada para papéis privilegiados na rota local. | Não vender o acervo interno de exemplos como uma galeria inteira liberada ao aluno. Materiais preparados nas aulas são outra coisa. |
| A equipe pode acessar ferramentas sem as mesmas restrições de um aluno. | Gravar demonstrações com perfil de criança na etapa representada. |
| Posto da jornada depende de cursos concluídos e projetos publicados; pontos têm outra função. | Não dizer que acumular moedas ou XP libera sozinho a formação. |
| A publicação de projeto tem fluxo próprio; mensagens têm moderação configurável. | Evitar a frase absoluta “tudo passa por revisão humana antes de aparecer”. Mostrar a regra específica de cada superfície. |
| O seed habilita aprovação ao criar espaços, mas não prova a configuração atual de espaços já existentes. | Confirmar a política efetiva de Clube/Mural e dos respectivos canais antes de uma afirmação categórica na página. |
| O perfil pode ficar invisível aos colegas, enquanto um jogo publicado tem link público. | Explicar separadamente visibilidade de perfil, publicação de jogo e participação no fórum. |
| Há registro de entrega e capacidade de resposta da equipe. | Não prometer correção humana de todas as atividades ou acompanhamento individual periódico sem definição operacional. |
| O resumo por e-mail depende de serviços e de atividade registrada. | Preferir demonstrar o painel já disponível; verificar um envio real antes de prometer dia e horário de recebimento. |
| A sincronização informa pendência, erro e sucesso; há rascunhos locais. | Ensinar a reconhecer Guardado na sua conta antes de trocar de aparelho. Não vender backup infalível. |
| O Pensa compartilha o plano; cada participante constrói nas próprias ferramentas. | Defender planejamento conjunto sem prometer edição simultânea de um único jogo. |
| Existem instruções internas antigas com outras faixas etárias: 8–13 em documentação e 7–12 em cláusula de IA. | A recomendação comercial local é 9–14. Alinhar esses textos em trabalho de produto futuro; a divergência não comprova, por si, inadequação funcional. |
| Conteúdo local inclui materiais para Desafio do Primeiro Jogo, Corre, Dino!, O Jogo do Meu Jeito, Cadê Todo Mundo? e Nave Contra Asteroides. | São indícios de autoria, não confirmação do catálogo publicado, inclusão comercial ou conclusão de toda a produção. |

## Cobertura para a próxima redação

O [deck](deck-argumentacao.md) traduz este inventário em necessidades e argumentos. Cada ficha aponta recursos por ID, prioridade editorial, demonstração e condição que a copy precisa respeitar. O inventário cobre a experiência Kids relevante à família; ferramentas internas de administração, cobrança e moderação aparecem apenas na medida em que sustentam a entrega.

Antes de publicar as páginas, falta uma conferência operacional delimitada: catálogo incluído/publicado; conta de aluno em cada etapa mostrada; política efetiva de moderação; salvamento e retomada; prazo/capacidade real de suporte; créditos e ativação da IA; condições do checkout; e materiais de demonstração. Não é necessário esperar essa conferência para estruturar os argumentos, mas afirmações dependentes dela precisam ser concluídas antes da publicação.

## Fontes locais

As referências levam ao código ou ao documento examinado. Um conjunto de arquivos na mesma referência sustenta uma família funcional, não uma alegação de teste executado.

[S01]: ../../../../packages/community-kids/src/lib/guide.ts
[S02]: ../../../../packages/community-kids/src/components/kids/nav.ts
[S03]: ../../../../packages/member-shell/src/components/lesson-sections.tsx
[S04]: ../../../../packages/core/src/journey/catalog.ts
[S05]: ../../../../packages/core/src/journey/state.ts
[S06]: ../../../../packages/community-kids/src/components/kids/kids-lesson-blocks.tsx
[S07]: ../../../../packages/member-shell/src/components/vimeo-player.tsx
[S08]: ../../../../packages/community-kids/src/components/kids/focus-mode.tsx
[S09]: ../../../../packages/core/src/learning/scene/catalog.ts
[S10]: ../../../../packages/members/src/application/mark-lesson-complete/mark-lesson-complete.service.ts
[S11]: ../../../../packages/member-shell/src/components/studio/studio-block.tsx
[S12]: ../../../../packages/studio/src/components/layout/topbar/menuLayout.ts
[S13]: ../../../../packages/member-shell/src/components/materials-block.tsx
[S14]: ../../../../packages/community-kids/src/app/(app)/como-fazer/page.tsx
[S15]: ../../../../packages/members/src/application/teacher-threads/teacher-threads.service.ts
[S16]: ../../../../packages/member-shell/src/components/certificate-block.tsx
[S17]: ../../../../packages/community-kids/src/components/kids/studio-full-client.tsx
[S18]: ../../../orientacao-cursos-jogos.md
[S19]: ../../../../packages/community-kids/src/lib/creations-cloud.ts
[S20]: ../../../../packages/pinta/src/components/export/ExportDialog.tsx
[S21]: ../../../../packages/hub/src/application/showcase/showcase.service.ts
[S22]: ../../../../packages/pinta/src/core/project.ts
[S23]: ../../../../packages/community-kids/src/components/kids/pinta-client.tsx
[S24]: ../../../../packages/molda/src/core/toolFamilies.ts
[S25]: ../../../../packages/community-kids/src/components/kids/molda-client.tsx
[S26]: ../../../../packages/pensa/src/core/types.ts
[S27]: ../../../../packages/community-kids/src/components/kids/pensa-client.tsx
[S28]: ../../../../packages/pensa/src/core/teamCopy.ts
[S29]: ../../../../packages/member-shell/src/server/zappy-access.ts
[S30]: ../../../../packages/community-kids/src/app/perfis/parent-dashboard.tsx
[S31]: ../../../../packages/community-kids/src/components/kids/kids-space-content.tsx
[S32]: ../../../../packages/community-kids/src/components/kids/public-player.tsx
[S33]: ../../../../packages/community-kids/src/components/kids/game-card-dialog.tsx
[S34]: ../../../../packages/community-kids/src/app/(app)/mural-dos-criadores/page.tsx
[S35]: ../../../../packages/hub/scripts/seed-community-spaces.ts
[S36]: ../../../../packages/community-kids/src/components/kids/clube-combinados.tsx
[S37]: ../../../../packages/members/src/domain/gamification/challenges.ts
[S38]: ../../../../packages/auth/src/domain/profile/profile.aggregate.ts
[S39]: ../../../../packages/members/src/application/teacher-threads/teacher-broadcasts.service.ts
[S40]: ../../../../packages/community-kids/src/app/(app)/perfil/page.tsx
[S41]: ../../../../packages/community-kids/src/components/kids/room/room-builder.tsx
[S42]: ../../../../packages/members/src/domain/gamification/missions.ts
[S43]: ../../../../packages/community-kids/src/components/kids/streak-protection.tsx
[S44]: ../../../../packages/community-kids/src/components/kids/league-board.tsx
[S45]: ../../../../packages/community-kids/src/components/kids/profile-management.tsx
[S46]: ../../../../packages/funnel/src/components/funnel/oferta/ComunidadeOfertaBody.astro
[S47]: ../../../../packages/members/src/application/parent-report/send-parent-reports.service.ts
[S48]: ../../../../packages/community-kids/src/app/responsavel/ajuda/page.tsx
[S49]: ../../../../packages/community-kids/src/app/perfis/purchases-view.tsx
[S50]: ../../../../packages/community-kids/src/app/perfis/ambassador-card.tsx
[S51]: ../../../../packages/community-kids/src/components/kids/course-rating-flow.tsx
[S52]: ../../../../packages/community-kids/src/app/(auth)/esqueci-senha/page.tsx
[S53]: ../../../../packages/community-kids/src/app/(auth)/redefinir-senha/page.tsx

Conferências complementares: [rota do Estúdio e acesso privilegiado](../../../../packages/community-kids/src/app/(app)/estudio/page.tsx), [contexto da IA](../../../../packages/member-shell/src/server/zappy-ai.ts), [proteções da conversa](../../../../packages/member-shell/src/server/pensa-agents/safety.ts), [curadoria das ferramentas do Pinta](../../../../packages/pinta/src/core/toolCuration.ts), [Meus trabalhos](../../../../packages/community-kids/src/components/kids/creator-works.tsx), [estado da sincronização](../../../../packages/community-kids/src/lib/cloud-status.ts), [regra de aprovação de mensagens](../../../../packages/hub/src/application/threads/thread.service.ts), [ativação do resumo semanal](../../../../packages/members/src/composition-root.ts), [materiais de autoria](../../../aulas-interativas/REFERENCIA-PLATAFORMA.md) e [guia de jornada](../../../jornada-do-criador.md).
