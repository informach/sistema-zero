# Análises e descobertas de marketing

Esta pasta reúne análises de público, posicionamento, pesquisas de mercado, decisões de copy e aprendizados de campanhas do Sistema Zero. Os registros ficam organizados por público e produto, para que novas descobertas possam complementar o que já foi analisado.

## Relatórios

| Público | Produto | Documento |
| --- | --- | --- |
| Kids | Comunidade dos Criadores | [Quiz: orientação para a família, quatro resultados e destinos](kids/comunidade-dos-criadores/quiz/README.md), com [pesquisa](kids/comunidade-dos-criadores/quiz/pesquisa-e-estrategia.md), [perguntas](kids/comunidade-dos-criadores/copy/quiz-comunidade.md), [resultados](kids/comunidade-dos-criadores/copy/resultados-quiz.md) e [lógica e validação](kids/comunidade-dos-criadores/quiz/logica-e-validacao.md). [Implementado localmente](kids/comunidade-dos-criadores/quiz/implementacao.md). |
| Kids | Comunidade dos Criadores | [Review da copy de continuidade: problemas priorizados, oportunidades, exemplos e conferência da oferta](kids/comunidade-dos-criadores/revisao-continuidade-2026-10-01.md) |
| Kids | Comunidade dos Criadores | [Oferta para quem já conhece a plataforma: análise e rota de continuidade](kids/comunidade-dos-criadores/continuidade-primeira-experiencia.md), [copy revisada](kids/comunidade-dos-criadores/copy/pagina-e-continuidade.md) e [demonstrações e 50 respostas com provas](kids/comunidade-dos-criadores/continuidade-provas-visuais.md) |
| Kids | Comunidade dos Criadores | [Implementação das quatro páginas: endereços, respostas ilustradas, capturas pendentes e verificação](kids/comunidade-dos-criadores/implementacao-paginas.md) |
| Kids | Comunidade dos Criadores | [Revisão integral das copies](kids/comunidade-dos-criadores/revisao-copy-2026-10-01.md) e [dúvidas alinhadas com prints e demonstrações](kids/comunidade-dos-criadores/duvidas-e-provas-visuais.md) |
| Kids | Comunidade dos Criadores | [Copy integral das quatro páginas](kids/comunidade-dos-criadores/copy/README.md), com [roteiro visual e cobertura das 58 fichas](kids/comunidade-dos-criadores/roteiro-visual-e-cobertura.md) |
| Kids | Comunidade dos Criadores | [Promessas e superpromessas: fundamento e composição por perfil](kids/comunidade-dos-criadores/promessas-e-superpromessas.md), com [oito formulações em texto limpo](kids/comunidade-dos-criadores/copy/promessas-2026-10-01.md) |
| Kids | Comunidade dos Criadores | [Posicionamento: quadro, furadeira e decorados por perfil](kids/comunidade-dos-criadores/posicionamento.md) |
| Kids | Comunidade dos Criadores | [Deck de argumentação: 58 fichas de necessidades, benefícios, objeções e provas](kids/comunidade-dos-criadores/deck-argumentacao.md) |
| Kids | Comunidade dos Criadores | [Inventário da plataforma: 90 recursos e condições de uso, com fontes locais](kids/comunidade-dos-criadores/inventario-plataforma.md) |
| Kids | Comunidade dos Criadores | [Estratégia das quatro páginas: perfil padrão e prioridades de desejos, dores e objeções](kids/comunidade-dos-criadores/estrategia-paginas.md) |
| Kids | Comunidade dos Criadores | [Diretrizes para a nova copy: formato assíncrono e autonomia](kids/comunidade-dos-criadores/diretrizes-copy.md) |
| Kids | Comunidade dos Criadores | [Definição dos quatro avatares: recomendação vigente de 01/10/2026](kids/comunidade-dos-criadores/definicao-avatares-2026-10-01.md) |
| Kids | Comunidade dos Criadores | [Kodland: avatares, diferenças de entrega e implicações para a copy](kids/comunidade-dos-criadores/pesquisa-kodland-2026-10-01.md) |
| Kids | Comunidade dos Criadores | [Visão geral: nicho, produto e avatares](kids/comunidade-dos-criadores/visao-geral.md) |
| Kids | Comunidade dos Criadores | [Análise aprofundada dos avatares: pesquisa de 01/10/2026](kids/comunidade-dos-criadores/avatares-pesquisa-2026-10-01.md) |
| Kids | Comunidade dos Criadores | [Reavaliação dos públicos e direção da nova copy: histórico de 01/10/2026](kids/comunidade-dos-criadores/reavaliacao-publicos-e-direcao-copy-2026-10-01.md) |

Para a Comunidade, a definição vigente recomenda quatro motivações de compra: aprendizagem no tempo de tela já permitido, criação de jogos, expressão visual em projetos interativos e formação tecnológica complementar. A pesquisa compara outras situações e registra o que justifica uma página própria. É uma decisão para as primeiras vendas, ainda sem clientes pagantes ou ranking comercial validado. Os relatórios anteriores permanecem como histórico e base de pesquisa.

Para o tráfego misto informado, a estratégia recomenda aprendizagem no tempo de tela permitido como perfil da página padrão. Os outros três têm páginas específicas. Cada página desenvolve sua motivação principal e incorpora os benefícios dos demais perfis em seções secundárias; o documento de estratégia registra a hierarquia completa.

O quiz, revisado na versão 3 e implementado localmente, recebe famílias que ainda não conhecem a Comunidade. Oferece um caminho para o filho começar a criar com tecnologia; primeiro entrega orientação e uma ideia para experimentar, depois apresenta o produto e a oferta correspondente. Separa interesses da criança, objetivos do responsável e condições práticas em oito a onze perguntas. A lógica preserva interesses combinados, admite objetivos fora das opções e não força um perfil principal em caso de empate. Veja a [revisão para tráfego frio](kids/comunidade-dos-criadores/quiz/revisao-trafego-frio.md) e a [implementação](kids/comunidade-dos-criadores/quiz/implementacao.md). É uma etapa opcional; o quiz do Desafio permanece no fluxo existente.

Para famílias que já conhecem a plataforma, a proposta posterior acrescenta uma página de continuidade em `/kids/comunidade-dos-criadores/oferta/continuar`. Ela atravessa as quatro motivações e atende entradas como Desafio e Cadê Todo Mundo. A decisão é manter acesso público, sem login, usando a rota como destino dos convites internos para a assinatura. O tratamento do parâmetro antigo `origem=desafio` foi retirado, sem compatibilidade especial, conforme confirmação do responsável pelo produto. A rota, a copy, as 50 respostas e os convites internos foram implementados localmente usando o design e os prints reais das quatro páginas. Ver [implementação e validação](kids/comunidade-dos-criadores/implementacao-continuidade.md).

A Kodland é a principal referência competitiva indicada pelo responsável pelo produto. Seu relatório aprofunda as semelhanças de motivação e as diferenças de acompanhamento que afetam a adequação das famílias à Comunidade.

Para preparar a nova copy, comece pelo posicionamento: ele recomenda um quadro para cada perfil, a apresentação do mecanismo comum e os decorados prioritários para pais e crianças. Consulte também o deck de argumentação junto do inventário. As fichas relacionam necessidades aos recursos locais, indicam o peso por perfil e propõem demonstrações. O levantamento distingue implementação, condições de liberação, catálogo e operação ainda não conferidos e benefícios que precisam de observação de uso.

## Como registrar novas descobertas

- Identifique a data, a pergunta analisada e a versão ou fonte consultada, distinguindo oferta local, staging e produção.
- Separe informações observadas, interpretações e hipóteses que precisam de validação.
- Registre as fontes e as limitações que afetam a conclusão.
- Acrescente pesquisas e experimentos na pasta do produto e atualize este índice. Ao revisar a visão geral, registre a descoberta que motivou a mudança.

O [manual do módulo de marketing](../marketing.md) documenta a operação do sistema. Esta pasta concentra o conhecimento sobre os produtos, seus públicos e a comunicação comercial.
