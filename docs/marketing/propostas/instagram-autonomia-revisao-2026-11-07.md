# Instagram e página principal: proposta revisada

Status: proposta para avaliação, sem publicação. Revisão de 07/11/2026 da [direção inicial](instagram-autonomia-2026-11-07.md), incluindo a revisão completa de linguagem e continuidade das sequências. Esta revisão prevalece sobre a proposta inicial nos destaques, nos fixados e na copy proposta para a página principal. Os posicionamentos Kids e adulto aprovados continuam sendo as referências.

## Entregas locais

- `C:/Users/tocha/Downloads/Proposta Instagram Sistema Zero/Proposta-Instagram.html`: relatório visual, perfil, bio, seis destaques com sequências clicáveis, três fixados com sete telas e legenda, nove pautas, calendário inicial e página principal incorporada.
- `C:/Users/tocha/Downloads/Proposta Instagram Sistema Zero/Pagina-principal.html`: prévia separada da página principal.
- `Verificacao.json`, `Verificacao-FAQ.json` e `Verificacao-review-completo.json`, na mesma pasta: evidências das verificações funcionais e da preservação do FAQ aprovado.

Os dois HTMLs incorporam imagens, fontes e estilos, funcionando por `file://` e offline. O relatório contém uma cópia incorporada da página, além do link para o arquivo separado. Apenas a navegação intencional ao site e aos quizzes atuais precisa de internet. Não há servidor, cadastro, compra ou publicação automática.

## Decisões propostas

Manter o mote **Autonomia se constrói na prática.** Explicá-lo com ações observáveis: organizar o próximo passo, fazer uma escolha, testar, comparar e explicar uma dúvida. A criação de jogos é o mecanismo concreto; a programação entra como instruções que tornam as escolhas visíveis no jogo.

Um perfil comum não exige que cada post fale simultaneamente com todas as idades. A identidade e o raciocínio são compartilhados; mudam a situação, o interlocutor e o apoio. A entrada operacional continua levando aos dois quizzes da Comunidade.

Nome: **Helena e Júlio · Sistema Zero**. Manter identificador `@criecomhelenaejulio`, foto real do casal e categoria Educação.

Bio proposta, com 147 pontos de código Unicode e 148 unidades UTF-16, incluindo quebras internas:

```text
Autonomia se constrói na prática.
Aprenda a planejar e resolver problemas criando jogos.
Crianças, adolescentes e adultos.
👇 Conheça o Sistema Zero
```

Destaques: **Comece aqui · Na prática · Criações · Caminhos · Dúvidas · Sobre nós**. Os nomes mais curtos substituem “Como funciona” e “Cursos” da versão anterior. Criações começa com demonstrações identificadas da equipe; relatos de alunos dependem de autorização e contexto reais.

Fixados:

1. Autonomia se constrói na prática.
2. Veja uma ideia ganhar vida.
3. Um projeto abre caminho para o próximo.

O primeiro liga interesse, planejamento, investigação, criatividade e comunicação à autonomia. Seu quinto slide trata de experimentar cores, formas e detalhes ao desenhar um personagem, em correspondência com a captura real da ferramenta Pinta. O sexto retoma essa ideia para falar de compartilhar escolhas e pedir apoio, acompanhado de perguntas reais para conversar sobre uma criação.

O segundo acompanha uma ideia ganhando forma: definir o que se deseja, separar as ações, experimentar, investigar e compreender o próprio caminho. Cadê Todo Mundo é o exemplo concreto, com imagens do jogo antes e depois da descoberta, da experiência de clique e dos blocos que representam as ações. A promessa é conseguir realizar e compreender escolhas, sem apresentar a estrutura de uma aula.

O terceiro explica a continuidade: uma ideia conhecida ganha outra aplicação, pede novas escolhas e oferece outra oportunidade de prática. A assinatura e as condições comerciais saíram dos fixados e das legendas; os convites ficam no fechamento e oferecem um primeiro passo. Isso não altera contratos, produtos ou acessos da plataforma.

### A promessa conduz o conteúdo

Nos fixados, pautas e destaques de apresentação, a conversa parte da conquista desejada e mostra o raciocínio por trás da prática. O jogo torna uma decisão observável: imaginar, organizar, experimentar, comparar e explicar. “Cenários preparados”, “formato gravado” e “ordem das aulas” deixaram de conduzir esses conteúdos.

A progressão didática é traduzida em benefício: começar por uma parte, entender o que aconteceu e acrescentar uma nova escolha. O destaque Caminhos foi refeito nessa direção, sem lista de produtos, compras ou planos. Sobre nós apresenta o propósito, sem entrar na preparação técnica das aulas. O formato e os equipamentos continuam sendo respondidos no destaque Dúvidas e no FAQ, onde correspondem a perguntas específicas de quem quer conhecer o funcionamento.

Na página principal, a demonstração do Farol também passou a enfatizar a ideia, as escolhas e os testes; as observações sobre cenário preparado e organização da aula saíram da demonstração. O FAQ aprovado permanece exatamente igual.

### Revisão de variedade dos destaques e fixados

A pedido do responsável, os seis destaques e os três fixados foram reescritos para representar o repertório do Faísca. A estrutura argumentativa continua conquista, mecanismo e continuidade. Os exemplos agora percorrem Cadê Todo Mundo, Jardim Secreto em 2D e 3D, Pinta, Moedas no caminho, Segredo da cabana, Ponte apressada e Baú dos símbolos. A Chave do Farol aparece como opção de entrada e como base ampliada pelos Poderes.

Foram executados oito projetos portáteis de `docs/aulas-interativas/faisca` com o gerador de prévia e os motores reais 2D/3D da plataforma. As capturas locais não modificaram os projetos ou a plataforma. Os Poderes receberam também recortes do navegador que aproximam a regra específica: moedas e baú, cabana e emblema, ponte e alavanca, pedras e sequência. Os módulos 3D foram resolvidos dos arquivos oficiais já instalados, sem servidor local. A captura da ferramenta Pinta e os blocos de Cadê Todo Mundo vieram do acervo real existente, com identificação distinta das capturas novas.

O HTML inclui uma galeria de oito referências visuais, títulos de curso/ferramenta e ampliação centralizada dentro das sequências. As capas dos fixados usam Jardim 3D, Cadê Todo Mundo e Pinta. As pautas e a composição inicial da proposta também foram alinhadas à variedade. Na etapa inicial dessa revisão, a página principal permaneceu idêntica. A revisão completa posterior também acrescentou exemplos de Cadê Todo Mundo e da ferramenta Pinta à página, simplificou a explicação dos blocos e alinhou o convite ao benefício da orientação personalizada. O FAQ aprovado permanece exatamente igual.

Fontes específicas: READMEs e projetos portáteis nas pastas `cade-todo-mundo`, `o-jardim-secreto`, `meu-primeiro-desenho-no-pinta`, `poder-moedas-no-caminho`, `poder-o-segredo-da-cabana`, `poder-a-ponte-apressada` e `poder-o-bau-dos-simbolos`. Os READMEs distinguem autoria pronta de mídia/publicação: a proposta sinaliza essa pendência de conferência antes de uma publicação futura, sem anunciar acesso imediato a todo o repertório. Não houve nova consulta ao catálogo de produção.

Verificação específica: 56 telas, referências visuais variadas, imagem e título coerentes, galeria com oito itens, ampliação a partir do carrossel em computador e celular e navegação preservada após fechar a imagem. As capturas dos cursos que ampliam o Farol e da aula de desenho podem reutilizar o cenário; não são apresentadas como mundos independentes. Responsividade conferida de 320 a 1440 pixels; corrigida a largura dos cartões de destaques na menor tela. Sem erros JavaScript ou dependência de recursos externos nos HTMLs. Os textos dos destaques e fixados passaram pela revisão editorial e pelo linter mecânico, sem ocorrências.

### Linguagem e fio da conversa

A pessoa que chega pelo Instagram não conhece a organização interna dos cursos. As publicações explicam escolhas que ela consegue reconhecer: desenhar um personagem, comparar tentativas, conferir uma contagem ou conversar sobre o que criou. Termos como “extra”, “Poderes” e “Jornada” ficam fora da copy pública. As capturas de blocos mostram instruções relacionadas ao exemplo, sem transformar a publicação em uma apresentação técnica. O nome Pinta recebe a explicação de ferramenta de desenho.

Cada sequência foi relida inteira, com começo, desenvolvimento e conclusão. Os exemplos sustentam um raciocínio, sem funcionar apenas como uma lista de cursos. No destaque Criações, uma ação passa a depender de um objeto, de uma quantidade, do tempo ou da ordem; o fechamento mostra que combinar essas decisões pede planejamento e testes. Isso é uma sequência de explicação da proposta, não uma promessa de ordem curricular.

O HTML mostra, em notas separadas da publicação, o fio da conversa de cada sequência. Também permite abrir “Ler a sequência inteira”. As setas permanecem no topo no celular; avançar retorna ao começo do slide. As nove pautas editoriais ganharam interlocutor e próximo passo definidos, e há um exemplo completo de Reel ligando situação, tentativa, comparação, habilidade e convite.

Verificação específica desta revisão: FAQ anterior e atual idênticos; FAQ incorporado e separado idênticos; 56 telas sem os rótulos internos identificados; controles acessíveis depois de rolar a sequência em 1440, 390 e 320 pixels; retorno ao início do slide; ampliação centralizada e fechamento sem perder o carrossel. Capturas de computador e celular inspecionadas visualmente.

### Correspondência entre texto e imagem

As imagens foram conferidas pelo que mostram, não apenas pelo nome do arquivo. As trocas incluem:

- Antes de descobrir, depois do clique e conclusão da busca: estados reais distintos de Cadê Todo Mundo.
- Escolher e testar o esconderijo: captura da experiência de clique desse mesmo projeto.
- Comparar duas situações: duas tentativas reais no Jardim 2D, com a flor fechada sem regador e aberta depois de recolhê-lo. O projeto local foi executado com o motor real e controles de teclado, sem alterar regras ou resultados. A comparação aproxima os detalhes e identifica cada situação com legendas externas às capturas.
- Comunicação e acompanhamento: recorte das perguntas reais sobre a ideia, o que foi testado e o que experimentar depois. A pauta sobre pedir ajuda usa a captura real de uma dúvida na conta de demonstração.
- Formato das aulas, exclusivamente em Dúvidas: vídeo e área de criação da plataforma, substituindo a imagem de desenho que aparecia antes.

Fontes adicionais: capturas em `packages/funnel/public/img/cade-todo-mundo` e `packages/funnel/public/img/comunidade-dos-criadores`; origem das telas documentada em `packages/funnel/scripts/captura-telas-kids.ts`, que identifica o uso de perfil de teste. Foram recortadas apenas áreas relevantes, preservando textos e interface. As capturas novas e as ações observadas estão registradas em `.cache/instagram-proposta-v2/capturas/alinhamento-visual.json`. Não são depoimentos ou resultados de alunos.

A conferência funcional encontrou uma perda de foco quando uma seta era desabilitada no primeiro/último slide e quando os botões numerados eram reconstruídos. O HTML mantém agora o foco dentro do carrossel, preservando a navegação pelo teclado. O teste das nove sequências voltou a passar após a correção.

## Página principal

Headline: **Autonomia se constrói na prática.**

Subheadline:

> No Sistema Zero, você pratica planejamento, escolhas e resolução de problemas enquanto aprende a criar jogos. Projetos guiados dão um objetivo para começar e testes para compreender cada decisão.

A página mantém a foto do casal, a marca, as fontes usadas pela plataforma, cartões arredondados e duas entradas. Propõe uma apresentação visual comum para os caminhos e acrescenta uma demonstração e dúvidas abaixo da escolha inicial.

Entradas:

- **Quero aprender a criar.** Adultos de 18 anos ou mais. Destino: `/pro/comunidade-dos-criadores/quiz`.
- **Quero ajudá-lo a ganhar autonomia.** Responsável pelo filho ou filha. Faixa de 9 a 17 anos; menores de 9 acompanhados. Destino: `/kids/comunidade-dos-criadores/quiz`.

Os botões explicitam “Responder às perguntas”. A demonstração de A Chave do Farol mostra uma ideia, as instruções que a tornam possível e o teste que permite conferi-la, com capturas reais e ampliação centralizada. O FAQ esclarece idades, experiência prévia, computador, aulas gravadas, acompanhamento e a orientação personalizada entregue pelo quiz. A apresentação comercial continua ocorrendo no resultado, conforme o fluxo existente.

### Ajuste do FAQ solicitado pelo responsável

- A necessidade de apoio fica no parágrafo do Kids, antes da apresentação da área adulta.
- A resposta sobre conhecimento prévio começa explicitamente: “Não. Você não precisa saber programar nem chegar com uma ideia de jogo.”
- A explicação das aulas reúne formato, prática, pausa, revisão e ritmo; um segundo parágrafo apresenta os equipamentos necessários.
- O resultado das perguntas é apresentado pelo benefício entregue: orientação baseada nos interesses, desafios e objetivos informados. Para os pais, caminhos para fortalecer a autonomia, resolver problemas e expressar ideias; para o adulto, um próximo passo para aprender a criar com mais autonomia. Essa formulação acompanha as promessas dos quizzes e não promete avaliação clínica ou acompanhamento individual.

Na prévia local, os cartões abrem um diálogo de conferência do destino, com link opcional ao quiz atual. Na futura página publicada, devem navegar diretamente, preservando a atribuição e os identificadores analíticos já existentes. O diálogo é um recurso de avaliação da proposta, não uma nova etapa do funil.

## Revisão e validação

- Revisão editorial da promessa, mecanismo, exemplos, interlocutor e continuidade entre perfil, página e quiz.
- Linter Light Copy aplicado à bio, aos três fixados e aos destaques: nenhuma ocorrência mecânica. O FAQ foi conferido diretamente, preservando suas perguntas e as respostas aprovadas. Esse resultado não comprova eficácia comercial nem efeitos educacionais.
- Duas páginas abertas diretamente como arquivos, com navegador offline; nenhuma requisição HTTP de recurso externo e nenhum erro JavaScript.
- Verificação de largura em 1440, 1024, 768, 390, 360 e 320 pixels nas duas páginas: sem rolagem horizontal do documento e sem imagens quebradas.
- Nove sequências verificadas, incluindo limites de navegação, setas do teclado e fechamento por Escape.
- Conferidos prévia incorporada, controle de largura, cópia da bio com alternativa por seleção, destinos dos dois quizzes, FAQ, rodapé único e ampliação de imagens.
- Inspeção visual de capturas de computador, celular, perfil e carrossel. Corrigidos o dimensionamento do herói em 320 pixels e uma sobreposição na legenda da imagem.

Fontes: captura `perfil_instagram.png` fornecida pelo responsável, documentação em `docs/marketing`, direções aprovadas Kids/adulto, proposta inicial e `packages/funnel/src/pages/index.astro`. As imagens vêm do acervo real de capturas e da foto de perfil da plataforma. Não foi feita nova auditoria completa do Instagram, identificação dos fixados atuais ou consulta de Insights.

A página de produção, o perfil e os posicionamentos aprovados não foram alterados. Os HTMLs são propostas locais para avaliação.
