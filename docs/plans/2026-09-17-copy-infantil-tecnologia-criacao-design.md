# Copy kids: tecnologia, criação e continuidade

Status: aprovada para implementação em 17/09/2026.

## Objetivo

Reescrever a comunicação do Desafio do Primeiro Jogo e da Comunidade dos Criadores para que ela fale com pais e responsáveis de forma natural. O texto não deve tratar "mais tempo de tela" como a dor central nem usar rótulos internos de estratégia como copy pública.

O funil passa a explicar que a tecnologia já faz parte da infância. Limites, sono, movimento, convivência e brincadeiras fora do ambiente digital continuam importantes. Ao mesmo tempo, para crianças a partir de 9 anos, a questão também é o que elas aprendem a fazer com a tecnologia presente na escola, na comunicação, nas pesquisas e nas brincadeiras.

## Direcionamento confirmado no áudio

O áudio orienta quatro movimentos, nesta ordem:

1. Não tentar convencer os pais de que toda tela é boa.
2. Reconhecer que a preocupação com excessos é legítima.
3. Explicar que eliminar completamente a tecnologia da rotina de uma criança maior não é uma solução realista.
4. Mostrar uma possibilidade concreta para parte desse universo: a criança deixa de apenas consumir jogos e experimenta criar um jogo próprio.

O texto não deve afirmar que "zero telas é prejudicial" como uma alegação médica. A formulação pública segura é que afastar completamente uma criança de 9 anos da tecnologia não é realista e não a prepara para participar de um mundo digital.

## Abordagens consideradas

### 1. Quantidade de tela como tese

Abriria com "mais tempo de tela não é a resposta" e defenderia substituir horas de consumo. Foi descartada. A frase deixa uma pergunta sem resposta, faz o funil parecer defensivo e reduz a conversa à quantidade de horas.

### 2. Orgulho de ver o primeiro jogo pronto

Abriria diretamente com a alegria de o filho mostrar um jogo próprio. É uma imagem forte para o Desafio, mas não desenvolve a conversa que o áudio pede sobre infância e tecnologia.

### 3. Tecnologia, responsabilidade e criação

Abre pela realidade atual, acolhe a preocupação dos pais, explica a decisão qualitativa que continua nas mãos da família e mostra a criação como experiência concreta. Esta é a abordagem escolhida. O orgulho de ver o jogo pronto entra como prova emocional, não como a única tese.

## Mensagens-mãe

Não são necessariamente headlines literais. São a base da escrita:

> A tecnologia já faz parte da vida do seu filho. O que ele aprende a fazer com ela é o que merece a sua atenção.

> Além de perguntar quanto tempo ele passa diante de uma tela, vale perguntar o que ele está aprendendo a fazer com a tecnologia.

> Ele já sabe abrir um jogo, escolher um personagem e tentar passar de fase. Agora também pode descobrir como uma ideia se transforma em um jogo que funciona.

O contraste a demonstrar é entre consumir criações de outras pessoas e participar da criação. Não usar as fórmulas "tela ruim versus tela boa", "mais tela versus menos tela" ou "não é X, é Y" como copy pública.

## Argumentação de oferta

1. A criança vive em um mundo tecnológico.
2. O responsável continua definindo limites e protegendo tempo de sono, movimento, convivência e brincadeiras.
3. A qualidade, o conteúdo e a finalidade do uso também importam.
4. Criar um jogo é uma atividade divertida que exige imaginar, escolher, montar, testar, encontrar erros, ajustar e concluir.
5. O Desafio dá uma primeira experiência curta e guiada, com um jogo publicável ao final.
6. A Comunidade dá continuidade depois da primeira criação, com cursos, ferramentas, acompanhamento e progressão pela Carreira do Criador.

A criança não é enganada para aprender. Ela se diverte criando e, durante o processo, pratica ações observáveis. Não prometer resultado escolar, clínico ou comportamental fora da plataforma.

## Uso das referências externas

As referências entram em uma seção curta logo após a argumentação da página de oferta, com links diretos e sem logos ou sugestão de endosso.

- A American Academy of Pediatrics, em política de 2026, trata o ambiente digital como algo que não pode ser avaliado somente por limites de tela e considera qualidade, contexto e o que a experiência desloca da rotina.
- A UNICEF inclui alfabetização digital entre competências para escola, trabalho e vida, indo além do domínio técnico.
- A Sociedade Brasileira de Pediatria descreve benefícios e riscos e recomenda uso adequado, conteúdo de qualidade, limites e acompanhamento.

Essas fontes sustentam a premissa de contexto. A prova do Sistema Zero vem de seu mecanismo: aulas, etapas, ferramentas, jogo criado, publicação, acompanhamento e regras da Carreira do Criador.

## Distribuição pela jornada

| Etapa | Papel da copy |
| --- | --- |
| Landing e quiz do Desafio | Conversar sobre o interesse atual da criança por jogos e descobrir como ela tende a criar. Sem aula longa sobre telas. |
| Resultado | Ligar as respostas do responsável a um primeiro projeto possível. |
| Hero do Desafio | Apresentar a primeira criação concreta em cinco etapas. |
| Início das ofertas | Desenvolver a conversa sobre mundo tecnológico, equilíbrio e uso com propósito. |
| Referências | Materializar a premissa com fontes externas, sem alegar aprovação do produto. |
| Demonstração | Mostrar as decisões e entregas que a criança vê durante o projeto. |
| Checkout e obrigado | Reforçar decisão, condições comerciais e primeiro acesso. Não reabrir a tese inteira. |
| Comunidade | Mostrar o que acontece depois do primeiro jogo, respeitando a liberação progressiva da carreira. |

## Arquivos e testes

- `packages/funnel/src/funnels/desafio-primeiro-jogo/content.ts`
- `packages/funnel/src/funnels/desafio-primeiro-jogo/index.ts`
- `packages/funnel/src/funnels/comunidade-dos-criadores/content.ts`
- `packages/funnel/src/funnels/comunidade-dos-criadores/index.ts`
- `packages/funnel/src/components/funnel/oferta/DesafioOfertaBody.astro`
- `packages/funnel/src/components/funnel/oferta/ComunidadeOfertaBody.astro`
- `packages/funnel/src/pages/[audience]/[produto]/checkout.astro`
- `packages/funnel/tests/unit/desafio-offer-copy.test.ts`
- `packages/funnel/tests/unit/comunidade-offer-copy.test.ts`
- `packages/funnel/tests/unit/desafio-quiz.test.ts`

Os testes passam a guardar a nova tese e a impedir o retorno das frases "Mais tempo de tela não é a resposta", "Mais tempo de tela não é a solução" e "A proposta não é aumentar o tempo de tela". A revisão de copy confirma linguagem natural, sem travessões e sem promessas não comprovadas.

## Verificação

Rodar os testes unitários da copy, `bun run typecheck`, `bun run check` e `bun run build` em `packages/funnel`. Conferir também a presença das três fontes, a transparência de que elas não endossam o Sistema Zero e a manutenção dos contratos de 30 dias e assinatura.
