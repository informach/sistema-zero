# Quiz para famílias que ainda não conhecem a Comunidade

Direção corrigida pelo responsável pelo produto em 01/10/2026. Esta revisão substitui a entrada e a sequência editorial da v2. O pedido autoriza refazer o quiz local, conservando a identidade visual das ofertas.

## Problema e decisão

A versão anterior mencionava a Comunidade no convite, mostrava uma tela do produto e perguntava se o formato da assinatura serviria para a família antes de apresentar o produto. Isso exigia uma familiaridade que o visitante de tráfego frio não tem.

A entrada passa a oferecer uma descoberta: um caminho para o filho começar a criar com tecnologia, relacionado aos interesses dele e ao que o responsável procura. O Sistema Zero Kids continua identificado como autor. A Comunidade só é apresentada depois de entregar a orientação no resultado.

Foram consideradas três abordagens: questionário de requisitos da oferta, teste com rótulo de personalidade e orientação sobre uma atividade possível. A terceira atende ao pedido: entrega algo útil, permite segmentar pelas respostas e não exige conhecer o produto. A primeira repete o problema apontado; a segunda demandaria uma avaliação que as perguntas não sustentam.

## Sequência editorial

1. Entrada: interesses reconhecíveis, benefício concreto do resultado e convite para responder, sem mostrar o produto antes de explicar sua relevância.
2. Perguntas: o que o filho procura, o que já expressou, o que o adulto quer proporcionar, dúvidas e condições da rotina. Perguntas de acompanhamento e equipamento são gerais; nenhuma pede opinião sobre a Comunidade.
3. Resultado: prioridade declarada, relação com os interesses, o que procurar numa atividade e ideia para experimentar em casa.
4. Apresentação: explicar o que é a Comunidade dos Criadores, de quem é, para quem é e como conecta aulas, criação e apoio.
5. Adequação: explicitar diferenças e requisitos informados, sem escondê-los atrás do botão. Mostrar os prints reais e a relação entre o recurso e a necessidade da família.
6. Próximo passo: link para a oferta correspondente. Empate, exploração e outra procura permanecem sem perfil dominante; não são convertidos em avatar A.

O aquecimento vem da progressão do raciocínio e da utilidade do resultado. Não serão usadas mensagens que elogiem uma alternativa ou pressionem o responsável a aceitar o formato antes de responder. Não há diagnóstico de capacidade ou promessa de conversão.

## Plano de implementação e conferência

- [x] Atualizar copy compartilhada, introdução visual, metadados, cabeçalho, saída por idade e perguntas, conservando os critérios de segmentação.
- [x] Reorganizar resultado para entregar orientação antes de nomear o produto; explicar ferramentas e manter todas as condições perto da apresentação.
- [x] Implementar localmente a versão lógica `comunidade-orientacao-v3`: respostas da v2 ficam no lead anterior; uma nova sessão coleta as perguntas revisadas sem reinterpretar respostas antigas.
- [x] Atualizar documentação de perguntas, resultado e lógica, distinguindo histórico v2 da versão vigente.
- [x] Verificar ausência de pressupostos sobre o produto, regras, migração de sessão, quatro destinos e testes do pacote.
- [ ] Conferir a experiência local no navegador: bloqueado pela exigência de aprovação da ferramenta, indisponível nesta sessão.

## Verificação desta revisão

- `bun test`: 400 testes aprovados, nenhuma falha, 3.950 asserções em 41 arquivos. Inclui preservação das respostas da v2, retomada da v3, quatro destinos e ausência de pressupostos sobre o produto na entrada, perguntas e orientação inicial do resultado.
- `bun run typecheck`: 216 arquivos, nenhum erro, aviso ou sugestão.
- `bun run check`: 224 arquivos, nenhuma correção pendente.
- `bun run build`: concluído com sucesso.
- `git diff --check`: sem erros de whitespace.
- Revisão editorial manual dos textos alterados. O script adicional de revisão de copy em `.agents` não pôde executar por restrição de leitura (`EPERM`); não foi considerado aprovado.

As verificações de navegador registradas na implementação original referem-se à v2. Não validam visualmente esta revisão. A direção editorial atende à correção solicitada; seu efeito em conclusão do quiz e conversão ainda precisa ser observado com visitantes reais.

Arquivos principais: `quiz/entry-copy.ts`, `quiz/questions.ts`, `quiz/result-copy.ts`, `quiz/result.ts`, `ComunidadeQuiz.tsx`, `ComunidadeQuizLayout.astro`, `ComunidadeResultado.astro`, `server/leads.ts` e `comunidade-quiz.css`. Sem alteração das ofertas ou do quiz do Desafio.
