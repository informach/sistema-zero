# Resultado do quiz: explicação concreta para cada família

Revisão solicitada em 02/10/2026. Complementa a [direção para tráfego frio](revisao-trafego-frio.md). Escopo: perguntas, copy, montagem dos resultados e provas visuais. A versão passa a `comunidade-orientacao-v4`, porque mudam a formulação e a ordem das perguntas. Os códigos e critérios dos quatro destinos permanecem iguais. Respostas anteriores ficam no lead original; uma nova sessão coleta a versão atual.

## Referências aplicadas

- Fluxo Criativo: `C:/Users/tocha/Documents/fluxo-criativo/.claude/commands/lt-quiz.md`, especialmente foco no público, progressão situação/problema/necessidade e resultado condicional que prepara a oferta.
- Fluxo Criativo: `C:/Users/tocha/Documents/fluxo-criativo/.claude/skills/revisora/references/manual-copy.md`, especialmente ensinar antes de oferecer, especificidade, mecanismo e consequência.
- Sistema Zero: `.claude/commands/lt-quiz.md`, `.agents/skills/copy-funil/SKILL.md` e `.agents/skills/revisao-copy/SKILL.md`. A adaptação local orienta a implementação em FunnelQuiz e a verdade da oferta.
- [Deck de argumentação](../deck-argumentacao.md), [inventário](../inventario-plataforma.md) e capturas reais já usadas pelas ofertas.

O original do Fluxo foi escrito para produtos low ticket e entrega de prompts para Lovable. Aplicamos a progressão e a argumentação, adaptadas ao funil existente. Não acrescentamos calculadora de prejuízo, dez perguntas obrigatórias, prazo de aprendizagem ou diagnóstico: esses elementos não correspondem ao produto e ao pedido atual. O responsável já definiu a direção e autorizou a implementação local.

## Problema e solução

Acrescentar palavras a todos os cartões manteria a sensação de tópicos isolados. Substituir tudo por um texto comum perderia a personalização. A solução adotada é uma sequência de explicações conectadas, escolhidas pelas respostas, com uma função clara para cada seção.

Cada argumento deve ligar: o que você contou → uma cena com seu filho → o recurso que permite essa ação → por que isso ajuda → a tela que mostra o recurso. Dificuldades e condições reais continuam explícitas, com uma orientação prática sobre o que fazer.

Formato, apoio e dúvida deixam de repetir a mesma explicação em três cartões. A preferência por acompanhamento orienta a explicação das aulas; o comportamento ao encontrar dificuldade orienta a ajuda; a dúvida principal recebe uma resposta específica. Quando a dúvida principal é ajuda, ela é respondida na própria seção de apoio.

## Revisão das perguntas segundo o Fluxo Criativo

A progressão situação → dificuldade/dúvida → necessidade orienta a conversa. Neste caso, implicação significa explicar por que uma condição muda a experiência da família, no resultado; não calcular um prejuízo imaginário nem provocar culpa pelo uso de telas.

| Ordem | Pergunta | Problema encontrado e correção | Uso real da resposta |
| --- | --- | --- | --- |
| 1 | Q1, idade | Formulação simplificada; mantém o recorte real da proposta. | Orientação de faixa etária. Não define capacidade. |
| 2 | Q2, atividade observada | O relato quase não aparecia no resultado. Todas as oito alternativas agora geram contexto próprio. | Convite ligado ao comportamento observado e ativação de QB/QC. |
| 3 | Q3, vontade expressa | “Vontades expressas” virou uma pergunta sobre o que o filho já falou em fazer. | Interesses combinados, sem confundir gostar de jogar com querer criar. |
| 4 | Q6, reação à dificuldade | Aparecia depois da escolha do objetivo. Passa a integrar a observação da situação atual. | Explica como usar revisão, tentativas ou pedido de ajuda, conforme o relato. |
| 5 | Q5, dúvida principal | Pergunta simplificada e colocada antes de imaginar o resultado desejado. | Responde a preocupação indicada; ajuda é desenvolvida uma única vez no apoio. |
| 6 | Q4, desejo | As opções eram categorias abstratas. Agora descrevem o que o adulto gostaria de ver o filho fazendo. | Define uma ou duas motivações, preservando os quatro perfis. |
| 7, se necessário | QT, prioridade | Mantida: resolve uma ambiguidade real, em vez de repetir a escolha para todos. | Prioridade entre os dois objetivos ou empate explícito. |
| Seguinte, se pertinente | QB, ferramenta | Linguagem simplificada e convite para dizer quando ainda não conversaram. | Confere expectativa de Roblox, Minecraft ou outra ferramenta. |
| Seguinte, se pertinente | QC, desenho | Alternativas com ações concretas; mantém espaço para desenho fora de jogos. | Demonstra a integração ou reconhece a diferença de proposta. |
| Penúltima | Q7, acompanhamento | A alternativa de aulas gravadas anunciava benefícios antes da escolha. Ficou neutra e direta. | Explicação própria para abertura, preferência, desconhecimento ou exigência de ao vivo. |
| Última | Q8, equipamento | A opção começava com “sim” numa pergunta que não era de sim/não. Redação alinhada. | Orientação sobre aparelho, horários e requisito antes da contratação. |

Mantidos: oito perguntas principais, até três condicionais, seleção múltipla apenas quando faz sentido, alternativas de desconhecimento e botão de continuar. Não acrescentamos um slider ou cálculo que não acrescentaria informação útil. A pergunta de desejo usa uma cena possível, sem prometer que a criança terá um resultado em prazo fixo.

## Plano de implementação

- [x] Reescrever os quatro argumentos principais e os módulos de formato, apoio, dúvidas e requisitos em `quiz/result-copy.ts`.
- [x] Compor formato e apoio sem duplicação em `quiz/result.ts`; manter incompatibilidades e os quatro destinos.
- [x] Reorganizar `ComunidadeResultado.astro` para leitura contínua e prints junto da explicação pertinente, usando os componentes e estilos existentes.
- [x] Revisar perguntas, alternativas e sequência; preservar os IDs e registrar a versão 4.
- [x] Conferir combinações de respostas, principalmente formato indefinido + procura por ajuda, preferir/exigir ao vivo, objetivos mistos e requisitos não atendidos.
- [x] Atualizar a copy documentada e registrar exemplos completos da versão atual.
- [x] Executar testes do pacote, tipos, formatação e build; registrar limites da verificação visual.
- [ ] Conferir o resultado no navegador em desktop e celular: ferramenta bloqueada pela exigência de aprovação, indisponível nesta sessão.

## Critérios editoriais

Personalizar pelo que foi respondido, sem inferir personalidade, autonomia ou resultados da criança. Exemplos devem ser reconhecíveis como exemplos. Mostrar a vantagem da pausa e da repetição na execução da tarefa; explicar o envio da dúvida e a espera; concretizar a companhia inicial do adulto. Distinguir conteúdo disponível, recursos liberados pelo percurso e etapas futuras.

As capturas comprovam a existência e o funcionamento visível dos recursos. Não são prova de que toda criança aprende sozinha ou de que esta versão converte melhor.

## Verificações da primeira revisão em 02/10/2026

- `bun test`: 406 testes passaram, nenhuma falha, 4.032 asserções em 41 arquivos.
- `bun run typecheck`: 216 arquivos, nenhum erro, aviso ou sugestão.
- `bun run check`: 224 arquivos, nenhuma correção pendente.
- `bun run build`: concluído com sucesso.
- `git diff --check`: sem erros de whitespace.
- Revisão editorial manual e leitura das combinações completas. Conferidas diretamente as capturas locais da aula integrada e da conversa nos Recados, além do mapa de provas visuais. As novas explicações usam recursos já registrados no inventário e no deck.
- Casos automatizados acrescentados: ordem e agrupamento das perguntas, uso das oito observações de Q2, ajuda desenvolvida uma única vez, distinção entre preferir e exigir ao vivo, integração do desenho apresentada uma vez e preservação de leads das versões 2 e 3.
- Navegação local tentada com a ferramenta Playwright; resposta: `MCP tool call requires approval, but approval policy is never`. Não houve validação visual da página nesta revisão. O build e a inspeção das imagens de origem não substituem essa conferência.

A [copy das perguntas](../copy/quiz-comunidade.md), a [biblioteca de resultados](../copy/resultados-quiz.md) e os [exemplos completos](exemplos-de-resultado-v4.md) refletem a implementação. A revisão verifica coerência editorial e funcional; compreensão pelas famílias e efeito em conversão ainda exigem observação de uso real.

## Segunda revisão: conversa com a família e rodapé

Ainda em 02/10/2026, nova revisão à luz do `lt-quiz` e do manual do Fluxo Criativo. O critério aplicado foi transformar as respostas em uma conversa e uma orientação útil, em vez de devolver categorias ou repetir o questionário. A correção mantém o público frio, a explicação antes da oferta e a diferença entre desejo relatado e resultado garantido.

| Problema encontrado | Melhoria implementada |
| --- | --- |
| Contexto repetia “você contou” e em seguida propunha praticamente o mesmo convite. | Passa a falar de um jogo que ele pode mostrar, um desenho recente ou um assunto de vídeo; relatos que apontam para o mesmo interesse viram um parágrafo conectado. |
| O mesmo exercício com tampinha ou palmas era usado para adolescentes. | Exemplos próprios para 12–14 anos usam esboços, regras e situações de teste. Isso muda a apresentação, sem presumir nível técnico pela idade. |
| Uma tentativa prévia de criação apenas acrescentava uma observação. | A experiência parte do projeto ou da ideia já tentada, com alternativa em papel se o projeto não estiver disponível. |
| C podia sugerir uma interação em jogo para quem pediu desenho sem jogos. | A sugestão passa a trabalhar uma nova versão do desenho. A abertura e a orientação também respeitam essa procura, e a diferença em relação à Comunidade permanece explícita. |
| O ramo que explicava a integração podia citar Pinta e Estúdio antes de definir as ferramentas. | Define os dois recursos e acompanha a passagem da arte para o jogo, explicando aparência e ação. |
| Rotina e acompanhamento ainda traziam termos genéricos. | Desenvolve a cena do horário compartilhado, da pausa, do salvamento, da retomada e da conversa sobre o comando que o filho montou. |
| A última pergunta dizia apenas “Continuar”. | O botão anuncia “Ver a sugestão para meu filho” quando essa resposta completa o percurso. |
| Uma opinião negativa parecia exigir corrigir as respostas da família. | A revisão das respostas é oferecida quando algo foi marcado diferente do pretendido; o feedback continua registrado. |
| Logo enorme e textos colados no rodapé. | O `Footer` estava dentro de `.cdc`, cujas regras sem camada impõem `height: auto` às imagens e zeram margens dos parágrafos. Nas ofertas, ele fica fora desse escopo. O quiz agora usa a mesma estrutura, com o componente compartilhado intacto. A altura mínima do wrapper do quiz foi removida para não criar um vão antes do rodapé nas telas curtas. |

A formulação de Q3 foi alinhada à pergunta sobre vontades que o filho já falou, preservando o significado e os códigos. A sequência situação → dificuldade/dúvida → desejo → condições permanece. Esta segunda revisão mantém a versão lógica 4 e as respostas existentes; não altera o contrato das perguntas nem exige uma nova sessão.

Os exemplos completos passam a onze. Foram incluídos os cenários de adolescente, tentativa anterior de criação e desenho sem jogos. A biblioteca separa as variações de atividade e a lógica registra sua precedência. A revisão não altera o quiz do Desafio nem os componentes de oferta compartilhados com outros trabalhos.

### Verificação da segunda revisão

- `bun test`: 409 testes aprovados, nenhuma falha, 4.088 asserções em 41 arquivos. Os três testes novos cobrem adaptação para adolescentes sem mudar o destino, precedência de projeto já tentado e preservação da procura por desenho sem jogos.
- `bun run typecheck`: 216 arquivos, nenhum erro, aviso ou sugestão após corrigir os tipos do mapa de interesses combinados e dos perfis usados no teste.
- `bun run check`: 224 arquivos, nenhuma correção pendente; arquivos alterados também passaram pela formatação do pacote.
- `bun run build`: concluído com sucesso após a correção.
- `git diff --check`: sem erros de whitespace.
- Rodapé: comparados o componente compartilhado, o layout das ofertas e o escopo dos resets de CSS. Corrigida a causa no layout do quiz; nenhuma regra especial para compensar tamanho da logo foi acrescentada.
- A conferência visual em navegador continua pendente pela restrição de aprovação já registrada. Não afirmar validação de dimensões renderizadas ou de aparência em desktop/celular com base apenas no build.

As sugestões foram conferidas como combinações completas, inclusive os três cenários acrescentados. O uso real por famílias continua sendo necessário para validar compreensão, utilidade e conversão.
