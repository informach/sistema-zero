# Módulos de Cadê Todo Mundo?

**Título do curso:** Cadê Todo Mundo?

**Descrição curta:** Crie seu primeiro jogo de procurar personagens escondidos.

**Descrição:** Você vai entrar num jardim com três personagens escondidos e transformar o toque numa descoberta. Primeiro, faz um personagem aparecer. Depois, ensina o jogo a contar cada achado até encontrar todo mundo. O jardim já começa preparado, e você programa as regras que fazem a busca funcionar. Pode fazer as aulas no seu ritmo, de onde estiver.

## Módulo 1 — Minha primeira busca

**Resumo:** Entre no jardim, descubra como o jogo responde ao toque, revele os personagens e faça o contador chegar a três.

- **Aula 1:** [O primeiro achado](aulas/cade-todo-mundo-aula-1.md)
- **Aula 2:** [Complete a busca](aulas/cade-todo-mundo-aula-2.md)
- **Aula 3:** [Seu certificado](aulas/cade-todo-mundo-certificado.md)

## Notas de importação

Identificador interno: `cade-todo-mundo`. Não usar `desafio-primeiro-jogo` nem o identificador do curso Nave Contra Asteroides; o funil e o catálogo pago não são alterados por estes manifestos. Na Aula 1, a primeira seção apresenta o jogo e a navegação básica; atividade e Estúdio são explicados quando a criança chega a eles. Não há aula de tour separada.

Todos os vídeos ainda são `plannedVideo`; portanto, o curso **não está pronto para publicação**. Gravar um vídeo por seção a partir dos respectivos `.roteiro.md`, vincular no admin e conferir a reprodução e a exigência de 90%. O Caderno do Aluno opcional está em `output/pdf/cade-todo-mundo-caderno-do-aluno.pdf`: anexar o PDF **uma única vez** ao bloco `caderno` da seção **Seu Caderno do Aluno**, na Aula 1. O mesmo anexo oferece download sob o vídeo e leitura no livro 3D à direita quando houver espaço, com leitura por páginas como alternativa. Em tela estreita, o livro vem depois do vídeo e do download. A Aula 2 não tem bloco do caderno; sua fala remete à seção da Aula 1. Ao reimportar o manifesto da Aula 2, o antigo bloco de materiais sai do rascunho; se já havia um PDF enviado nessa aula, o arquivo continua na biblioteca para revisão manual e não é apagado automaticamente. O visual e o conteúdo editável estão em `recursos/cade-todo-mundo/caderno-do-aluno.template.html`; para gerar o PDF, executar `bun docs/aulas-interativas/recursos/cade-todo-mundo/gerar-caderno.ts`. Gravar o vídeo curto da segunda seção da Aula 1 depois de anexar o PDF, mostrando uma página verdadeira. A conclusão dessa seção exige só o vídeo; abrir ou baixar não bloqueia a progressão.

Na Aula 2, a retomada do jardim vem antes de uma seção curta sobre o contador **Achados**: vídeo conceitual e experiência sem palpite ou quiz. A criança testa quando o único valor atual muda, quando fica igual e o que acontece ao recomeçar. Só depois programa a regra no Estúdio. Essa seção exige vídeo e experiência concluídos. A prática termina com o envio; o compartilhamento é apresentado como opção no fechamento, com o mesmo Estúdio ao lado do vídeo.

Os tipos de blocos usados no jogo completo estão listados em [`blocos-cade-todo-mundo.json`](blocos-cade-todo-mundo.json), no mesmo formato dos outros cursos. Essa lista alimenta o `allowBlocks` dos Estúdios das Aulas 1 e 2: somente esses blocos ficam disponíveis na paleta da aula. O projeto inicial usa apenas blocos de programação e Jogo 2D; o bloco **Preparar o jogo** cria a tela automaticamente, sem blocos de HTML, CSS ou Canvas. A lista não concede acesso ao curso nem ao Estúdio completo.

## Cadastro e importação no admin

- Criar o curso com slug `cade-todo-mundo`, título/subtítulo acima, etapa **Primeiros Passos / 2D** e papel **curso extra**, sem posição. Conceder o acesso gratuito apenas às crianças contempladas pela oferta ou evento; a matrícula da Comunidade também abre o curso. Configurar a página externa de oferta da Comunidade para quem não tem matrícula. A ordem é Aula 1, Aula 2, Aula 3 (certificado). A terceira lição usa o slug `certificado`; criar as demais com os slugs exatos indicados.
- Importar `cade-todo-mundo-aula-1.manifesto.json`, `cade-todo-mundo-aula-2.manifesto.json` e `cade-todo-mundo-certificado.manifesto.json`, cada um na lição correspondente.
- A cadeia `cade-todo-mundo` no bloco do Estúdio transporta o projeto da primeira para a segunda aula. A segunda tem um projeto inicial de retomada apenas se não houver projeto salvo; não apaga o trabalho da criança.
- Só o Estúdio da Aula 2 tem `showcase.enabled`: **Compartilhar** habilita após o envio e publica o jogo imediatamente no Mural quando a criança confirma. O fechamento reutiliza esse mesmo Estúdio como `workspaceKey`, sem duplicar o bloco ou o projeto. Publicar e copiar o link são opcionais; a conclusão da aula não depende deles. O vídeo final ensina o link público sem pressupor acesso permanente ao Mural. A concessão temporária de sete dias pelo link de embaixador é tratada em outra frente.
- Na aula, a criança usa só o Estúdio incorporado em modo blocos, com Jogo 2D. Não há Pinta nem link para o Estúdio completo.
- Os demais cursos sem matrícula conservam seus destinos externos configurados. O botão do cartão diz “Mostrar ao responsável” e abre a página externa em nova aba; a aula do certificado não apresenta oferta.

## Verificações antes de liberar

Executar `bun docs/aulas-interativas/qa/validar-manifestos.ts cade-todo-mundo` e os testes `cade-todo-mundo-*.test.ts`. Em navegador real, verificar arte embutida, clique/toque nos três esconderijos, revelação após encaixar `Deixar o sprite escolhido com 0% de visibilidade`, impossibilidade de contar o mesmo esconderijo duas vezes, incremento 1–2–3 e vitória. Conferir o fluxo em celular, o caderno vinculado, envio do projeto, publicação imediata e link jogável quando a criança escolhe compartilhar, conclusão sem publicar, continuidade entre aulas, certificado e fechamento sem oferta. Depois que a frente do embaixador estiver pronta, testar o acesso de sete dias ao Mural com uma conta que resgatou o link. Os testes automatizados validam estrutura e regras; não substituem esse ensaio com crianças.
