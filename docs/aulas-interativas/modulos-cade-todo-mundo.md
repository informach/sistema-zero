# Módulos de Cadê Todo Mundo?

**Título do curso:** Cadê Todo Mundo?

**Descrição curta:** Crie seu primeiro jogo de procurar personagens escondidos.

**Descrição:** Você vai entrar num jardim com três personagens escondidos e transformar o toque numa descoberta. Primeiro, faz um personagem aparecer. Depois, ensina o jogo a contar cada achado até encontrar todo mundo. O jardim já começa preparado, e você programa as regras que fazem a busca funcionar. Pode começar no evento e terminar em casa.

## Módulo 1 — Minha primeira busca

**Resumo:** Entre no jardim, descubra como o jogo responde ao toque, revele os personagens e faça o contador chegar a três.

- **Aula 1:** [O primeiro achado](aulas/cade-todo-mundo-aula-1.md)
- **Aula 2:** [Complete a busca](aulas/cade-todo-mundo-aula-2.md)
- **Aula 3:** [Seu certificado](aulas/cade-todo-mundo-certificado.md)

## Notas de importação

Identificador interno: `cade-todo-mundo`. Não usar `desafio-primeiro-jogo` nem o identificador do curso Nave Contra Asteroides; o funil e o catálogo pago não são alterados por estes manifestos. A introdução leve à plataforma está no vídeo da primeira seção da Aula 1; não há uma aula de tour separada.

Todos os vídeos ainda são `plannedVideo`; portanto, o curso **não está pronto para publicação**. Gravar um vídeo por seção a partir dos respectivos `.roteiro.md`, vincular no admin e conferir a reprodução e a exigência de 90%. A folha opcional está em `output/pdf/cade-todo-mundo-mapa-do-jogo.pdf`: anexá-la ao bloco `caderno` da Aula 1 antes de gravar o vídeo dessa seção. O download da folha não bloqueia a progressão.

## Cadastro e importação no admin

- Criar o curso com slug `cade-todo-mundo`, acesso gratuito e título/subtítulo acima. A ordem é Aula 1, Aula 2, Aula 3 (certificado). A terceira lição usa o slug `certificado`; criar as demais com os slugs exatos indicados.
- Importar `cade-todo-mundo-aula-1.manifesto.json`, `cade-todo-mundo-aula-2.manifesto.json` e `cade-todo-mundo-certificado.manifesto.json`, cada um na lição correspondente.
- A cadeia `cade-todo-mundo` no bloco do Estúdio transporta o projeto da primeira para a segunda aula. A segunda tem um projeto inicial de retomada apenas se não houver projeto salvo; não apaga o trabalho da criança.
- Na aula, a criança usa só o Estúdio incorporado em modo blocos, com Jogo 2D. Não há Pinta nem link para o Estúdio completo.
- Os demais cursos sem matrícula conservam seus destinos externos configurados. O botão do cartão diz “Mostrar ao responsável” e abre a página externa em nova aba; a aula do certificado não apresenta oferta.

## Verificações antes de liberar

Executar `bun docs/aulas-interativas/qa/validar-manifestos.ts cade-todo-mundo` e os testes `cade-todo-mundo-*.test.ts`. Em navegador real, verificar arte embutida, clique/toque nos três esconderijos, revelação após encaixar `Deixar o sprite escolhido com 0% de visibilidade`, impossibilidade de contar o mesmo esconderijo duas vezes, incremento 1–2–3 e vitória. Conferir o fluxo em celular, a folha vinculada, envio do projeto, continuidade entre aulas, certificado e fechamento sem oferta. Os testes automatizados validam estrutura e regras; não substituem esse ensaio com crianças.
