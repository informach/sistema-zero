# Módulos do Desafio do Primeiro Jogo

**Título do curso:** Desafio do Primeiro Jogo — A Chave do Farol

**Descrição curta:** Crie sua primeira aventura: encontre a chave e acenda o farol para guiar um barco.

**Descrição:** Em três dias, você transforma um cenário preparado num jogo que responde às suas ideias. Primeiro, faz o personagem andar pelo mapa com setas no teclado ou controles de toque. Depois, ensina o jogo a recolher a chave e a lembrar que ela foi encontrada. Por fim, cria uma regra para a porta do farol: a luz só acende quando o personagem está com a chave, e o barco encontra o caminho. A arte já vem pronta para você se concentrar nas regras que dão vida à aventura. O Estúdio aparece dentro das aulas; não é preciso usar o Pinta nem o Estúdio completo.

## Módulo 1 — Sua aventura no farol

**Resumo:** Conheça a plataforma, construa três regras do jogo e comemore sua primeira aventura completa.

- **Introdução:** [A aventura começa aqui](aulas/desafio-introducao.md)
- **Dia 1:** [O personagem ganha movimento](aulas/desafio-dia-1.md)
- **Dia 2:** [A chave muda a aventura](aulas/desafio-dia-2.md)
- **Dia 3:** [A luz do farol](aulas/desafio-dia-3.md)
- **Encerramento:** [Seu certificado e próximos passos](aulas/desafio-certificado.md)

## Importação e produção

Identificador interno e cadeia do projeto: `desafio-primeiro-jogo`. Destinos das aulas: `boas-vindas`, `dia-1`, `dia-2`, `dia-3`, `certificado`. Importar os cinco `.manifesto.json` correspondentes, depois de criar as aulas no admin. A cadeia prioriza o projeto enviado pela criança; os snapshots embutidos dos Dias 2 e 3 são retomadas para quando não houver trabalho anterior. O jogo usa só a extensão Jogo 2D e blocos básicos de variável e condição. O direcional tem quatro botões de toque e também aceita teclado.

Todos os vídeos estão em `plannedVideo`. Gravar a partir dos roteiros falados, um vídeo por seção, vincular no admin e testar reprodução/conclusão antes de publicar. O caderno e o mapa familiar são materiais opcionais: anexar os PDFs ao bloco `materiais-farol` e conferir os nomes exibidos antes de gravar a introdução. O certificado preserva a emissão; o vídeo de continuidade é voltado ao responsável e leva à oferta externa sem exigir acesso, clique ou compra para concluir.

O curso antigo de nave agora se chama [Nave Contra Asteroides](modulos-nave-contra-asteroides.md) e tem seus cinco dias em outro `courseSlug`. A introdução e o certificado pertencem apenas a este Desafio. Não alterar preço, prazo de acesso, catálogo ou funil durante esta importação editorial.

## Verificações antes de liberar

Rodar `bun docs/aulas-interativas/qa/validar-manifestos.ts desafio-` e os testes de projeto/manifesto. Em navegador real, testar o jogo do começo ao fim por toque e teclado, inclusive tela estreita e Estúdio ampliado; confirmar que o direcional não cobre elementos essenciais. Repetir sem chave e com chave, confirmar coleta única, reinício por **Atualizar**, a luz acendendo e o barco chegando. Confirmar continuidade entre dias, entrega, certificado e materiais. Como os vídeos ainda não foram gravados, o curso não está pronto para publicação.
