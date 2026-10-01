# Copy das páginas da Comunidade dos Criadores

Data: 01/10/2026. Versão: revisão integral 2, com argumentação desenvolvida no corpo das quatro páginas, dúvidas separadas e demonstrações alinhadas. Referência editorial; a implementação local posterior está registrada no [relatório de implementação](../implementacao-paginas.md). Os arquivos abaixo contêm páginas completas e independentes, com texto dirigido à família.

## Páginas para leitura

| Página | Arquivo | Motivo que conduz a conversa |
| --- | --- | --- |
| A, padrão | [Aprendizagem no tempo de tela permitido](pagina-a-tempo-de-tela.md) | Conhecer uma atividade que a criança possa querer fazer e cujo aprendizado a família consiga perceber. |
| B | [Criação dos próprios jogos](pagina-b-criacao-de-jogos.md) | Apoiar a vontade de construir, modificar e mostrar um jogo. |
| C | [Expressão visual](pagina-c-expressao-visual.md) | Explorar personagens e desenhos em projetos interativos. |
| D | [Formação tecnológica complementar](pagina-d-formacao-tecnologica.md) | Avaliar conteúdo, aplicação, sequência e acompanhamento da iniciação em programação. |
| E, continuidade | [Famílias que já conhecem a plataforma](pagina-e-continuidade.md) | Entender o que a assinatura acrescenta e como continuar a partir da experiência inicial. Página própria implementada localmente; não é um quinto avatar. |

As aberturas aplicam a decisão da conversa: **a promessa orienta a headline; headline e subheadline juntas desenvolvem a superpromessa**. O texto de apoio explica mecanismo e consequência, evitando repetir a primeira frase.

As quatro páginas por motivação têm argumento central, demonstração descrita, integração da plataforma, defesa do formato assíncrono, benefícios complementares, comparação de alternativas, origem do produto, oferta, garantia, 40 respostas práticas agrupadas por assunto e fechamento. A oferta e as respostas factuais comuns foram mantidas consistentes. A sequência e o desenvolvimento principal variam conforme o perfil, assim como as seis primeiras dúvidas. As respostas usam âncoras estáveis para permitir alinhamento entre páginas.

## Quiz de orientação: proposta posterior

A [copy das perguntas](quiz-comunidade.md) e os [quatro resultados com variações](resultados-quiz.md) foram implementados localmente no quiz da Comunidade; ver [registro técnico e verificações](../quiz/implementacao.md). A promessa é ajudar a família a encontrar um ponto de partida para aprender criando. A identificação da prioridade comercial acontece pela mesma conversa, separando o interesse da criança das necessidades do responsável.

Os resultados são uma biblioteca condicional: cada família recebe o texto pertinente às respostas e o botão da oferta correspondente. Na versão 2, o quiz tem oito perguntas principais e até três adicionais, preserva interesses combinados e oferece atividades com papel antes da compra. Empate, procura aberta e objetivo fora das opções têm textos próprios, sem inventar um perfil dominante. Não publicar todos os complementos como uma página única. Consulte a [visão geral](../quiz/README.md), a [pesquisa](../quiz/pesquisa-e-estrategia.md), a [lógica com destinos e casos de validação](../quiz/logica-e-validacao.md) e a [revisão aplicada](../quiz/revisao-proposta.md). O quiz é opcional e não altera o quiz do Desafio.

## Página de continuidade

A página E reconhece a primeira experiência e explica o próximo passo, com destaque para a mesma conta, a diferença entre acesso específico e assinatura, os requisitos da Jornada e o valor do conjunto integrado. Ela atende às entradas pelo Desafio, Cadê Todo Mundo e outras experiências, sem presumir conclusão ou satisfação.

A página usa `/kids/comunidade-dos-criadores/oferta/continuar`, pública e sem exigência de login. A rota e os convites internos foram implementados localmente em 01/10/2026. O tratamento de `origem=desafio` foi removido, sem redirecionamento especial, conforme a decisão do responsável pelo produto. Ver [implementação e validação](../implementacao-continuidade.md).

O texto revisado tem 50 respostas, organizadas pela decisão da família. A consulta começa por valor adicional, próximo passo, conta, liberação, ajuda, aprendizagem e interesse. A dúvida sobre dificuldade foi incorporada à resposta de ajuda; perda de interesse recebeu uma pergunta própria. Há novas respostas sobre uma atividade concreta de continuidade e sobre o início da assinatura. Cada pergunta tem orientação de prova no [mapa visual de continuidade](../continuidade-provas-visuais.md). A [análise da página](../continuidade-primeira-experiencia.md) registra posicionamento, prioridades, fontes e ajustes de coerência necessários.

As melhorias editoriais do [review da continuidade](../revisao-continuidade-2026-10-01.md) foram aplicadas à copy. A abertura prioriza a criação; o corpo compara curso e assinatura, antecipa a integração e demonstra uma atividade possível no Estúdio/Pinta após os requisitos. A garantia informa contato e início da contagem. O relatório conserva os achados sobre a versão anterior e registra o que continua dependendo de evidência antes da publicação. A implementação posterior reutiliza os componentes e prints reais da reformulação visual das quatro páginas.

A estrutura comercial confirmada pelo responsável pelo produto também está explícita: Cadê Todo Mundo e Desafio têm ofertas de entrada; os demais cursos fazem parte da Comunidade e não exigem compras separadas. Novos cursos publicados durante o plano entram no acesso. A redação não promete frequência de lançamento nem trata cursos em preparação como disponíveis.

Título de busca implementado: **Continue criando jogos na Comunidade dos Criadores**. Descrição: **Já conhece o Sistema Zero Kids? Veja como continuar na mesma conta, o que a assinatura inclui e os próximos passos da Jornada para seu filho.**

Os botões principais dizem “Escolher um plano para continuar”. O botão de demonstração leva a `#proximo-passo`; `#experiencia` identifica a integração entre ferramentas. Os campos comerciais e as âncoras de contratação seguem o padrão descrito abaixo. O pré-checkout desta página inclui a orientação “Se sua família já tem conta, use o mesmo e-mail do responsável”, preservando o plano selecionado e as condições exibidas antes do pagamento. A garantia tem âncora própria, `#garantia`, e a copy liga o e-mail de contato e a rota `/kids/termos`.

O [roteiro visual e mapa de cobertura](../roteiro-visual-e-cobertura.md) identifica as seções de cada página, suas demonstrações, legendas propostas, fontes e a cobertura das 58 fichas do deck. O [mapa de dúvidas e provas visuais](../duvidas-e-provas-visuais.md) complementa cada resposta com o print ou a sequência necessária e uma legenda proposta. O [registro da revisão](../revisao-copy-2026-10-01.md) explica os problemas encontrados e as correções. As instruções editoriais ficam nesses documentos, fora do texto comercial.


## Como ler a revisão

O corpo de cada página sustenta a motivação principal e desenvolve as demais como benefícios complementares. Os recursos são explicados pelo que a criança faz, pelo apoio oferecido e pela consequência que a família consegue conhecer. O papel da inteligência artificial aparece no argumento principal e tem respostas próprias sobre autoria, Pensa e Zappy.

O bloco “Mais sobre a experiência do seu filho” é uma biblioteca de consulta completa na própria página. As respostas educativas explicam mecanismos e exemplos; as operacionais indicam o caminho a seguir. Na implementação, os grupos e os acordeões existentes devem ajudar a localizar cada tema. A existência de 40 respostas não significa exibir quarenta blocos abertos ou repetir todas as demonstrações do corpo.

## O que preencher com os dados da oferta

Somente três valores variáveis permanecem nos textos. Eles correspondem a dados comerciais dinâmicos já existentes na página local, não a pendências de redação.

| Campo | Conteúdo esperado |
| --- | --- |
| `{{preco_mensal}}` | Valor mensal vigente, formatado em reais. |
| `{{preco_anual}}` | Total vigente para 12 meses, formatado em reais. |
| `{{equivalente_mensal_anual}}` | Total anual dividido por 12, apresentado como equivalência; não é anúncio de parcelamento. |

Na implementação, preencher pela mesma origem comercial usada pela página e pelo checkout. Valores de contingência do código não foram tratados como preço confirmado. Descontos, comparação com 12 mensalidades e parcelamento só devem aparecer quando correspondentes à oferta real; não foram inventados para esta redação.

## Botões e continuidade da contratação

Os links internos permitem navegar pelo rascunho. `#experiencia` identifica a demonstração principal; `#planos`, o bloco de assinatura; `#contratacao`, a explicação sobre seguir ao pagamento. Os dois botões de plano precisam manter a seleção correspondente na implementação e abrir o fluxo já existente da oferta.

Texto de apoio para o modal após escolher um plano:

> Informe seus dados para conferir o plano escolhido e seguir para o pagamento.

Botão de continuidade:

> Continuar para o pagamento

O fechamento retorna aos planos. Não acrescentar quiz obrigatório, teste gratuito, upsell ou outra etapa por causa da nova redação.

## Títulos e descrições para as páginas

| Página | Título de busca proposto | Descrição proposta |
| --- | --- | --- |
| A | Comunidade dos Criadores: aprender criando jogos | Uma atividade de criação de jogos para crianças de 9 a 14 anos, com aulas guiadas, ferramentas integradas e acompanhamento da família no tempo de tela permitido. |
| B | Criar jogos para crianças: Comunidade dos Criadores | Um caminho guiado para seu filho começar a criar jogos, testar regras e explorar ideias próprias, com ferramentas, projetos e ajuda na mesma plataforma. |
| C | Personagens e jogos: Comunidade dos Criadores | Conheça o caminho entre desenho digital e criação de jogos para crianças de 9 a 14 anos, com ferramentas conectadas e orientação para construir interações. |
| D | Programação por projetos: Comunidade dos Criadores | Iniciação em programação por projetos de jogos, com explicação, prática, progressão e registros para a família acompanhar a experiência de crianças de 9 a 14 anos. |

A página A permanece na entrada padrão. As rotas de B, C e D foram implementadas e estão listadas no [relatório de implementação](../implementacao-paginas.md).

## Revisão e situação da entrega

A revisão editorial conferiu a distinção de foco, o encadeamento do argumento, as condições das ferramentas, o formato assíncrono e a coerência comercial com a oferta local. A revisão mecânica de Light Copy foi aplicada aos quatro arquivos. As condições comuns descrevem a oferta do repositório; não acrescentam interpretação jurídica ou um novo contrato.

Os textos usam exemplos de funcionamento e cenas possíveis, sem inventar depoimentos ou resultados de crianças. Os relatos já presentes na página local foram registrados como material candidato no roteiro visual, com sua origem, e não inseridos automaticamente como prova validada.

O roteiro registra o que ainda deve ser demonstrado na implementação: catálogo incluído, conta de aluno nos marcos apresentados, integração entre ferramentas, salvamento, canais de ajuda e condições comerciais. Nove arquivos visuais locais existentes foram inspecionados; o mapa registra seus limites de uso. Nenhuma nova captura foi feita e não foram utilizados login de staging nem produção.

O design e a identidade da oferta local permanecem como referência para o trabalho posterior. Esta entrega não altera componentes, imagens, estilos, checkout ou páginas do app.

## Base de trabalho

- [Posicionamento](../posicionamento.md) e [promessas e superpromessas](../promessas-e-superpromessas.md).
- [Estratégia das páginas](../estrategia-paginas.md) e [diretrizes de copy](../diretrizes-copy.md).
- [Deck de argumentação](../deck-argumentacao.md) e [inventário da plataforma](../inventario-plataforma.md).
- [Promessas isoladas da etapa anterior](promessas-2026-10-01.md), mantidas como histórico do desenvolvimento da abertura.
