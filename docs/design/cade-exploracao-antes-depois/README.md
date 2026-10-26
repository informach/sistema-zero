# Cadê Todo Mundo — exploração antes e depois

[HTML para avaliação](../cade-todo-mundo-exploracao-antes-depois.html).

O Antes importa os componentes e manifestos atuais das experiências de ação/reação e contagem. A Proposta usa as mesmas artes, componentes de palco, diagrama, contador, fontes, botões e temas, mudando a condução e a liberdade dos testes. Os protótipos anteriores do curso permanecem preservados.

## Diferenças propostas

- Dois esconderijos desde o início. Pode começar pelo arbusto ou pelas pedras, com a reação ligada ou desligada.
- A ligação fica disponível sempre. Alterar a ligação não revela nem esconde retroativamente os personagens.
- Esconder de novo prepara outra tentativa e mantém a ligação e as descobertas. Recomeçar experiência limpa tudo.
- Contagem preserva o jardim de três personagens e o valor único de achados. Zappy descreve o último teste e sugere o que ainda vale comparar.
- Tocar no vazio antes de encontrar alguém já conta como observar o valor permanecer igual. Não é necessário seguir a ordem sugerida para marcar as descobertas.
- Desfazer último teste restaura cena, regra e descobertas em conjunto (até 29 ações anteriores). Continua disponível depois de concluir.
- Concluir as descobertas não bloqueia a exploração. Alternar Antes/Proposta preserva os testes; navegar para outra experiência inicia uma demonstração nova.

Não altera o curso publicado, dados de aluno, quiz ou objetivos do Estúdio. Neste HTML, o foco são as duas experiências que receberam a proposta de exploração livre. Voz opcional do navegador; sem gravações finais.

## Fontes e validação

`model.ts`: adaptações locais e histórico. `experiences.tsx`: condução e composição. `touch-rule.tsx`: mesmo diagrama atual com convite atualizado. `client.tsx`: comparação. O empacotador e a moldura são compartilhados com o protótipo do Farol.

- Gerar: `bun docs/design/cade-exploracao-antes-depois/build.ts`.
- Modelo: `bun test ./docs/design/cade-exploracao-antes-depois/model.test.ts`.
- Navegador: `node docs/design/cade-exploracao-antes-depois/verify.mjs`.

Casos: ligar antes de tocar; pedras primeiro; alternar regra; repetir toque; esconder novamente; desfazer; limpar experiência; vazio primeiro; reinício antes do segundo achado; continuar após concluir; antes funcional e independente; temas e larguras 390/768/1440. As verificações técnicas não comprovam aprendizagem.


Os dados de **Antes** estão congelados nos arquivos `*.antes.json`, extraídos da base `5bde02c4f`. Assim a comparação preserva a versão aprovada antes da implementação, mesmo depois de atualizar os manifestos do curso.
