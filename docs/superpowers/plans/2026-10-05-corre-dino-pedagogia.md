# Aplicação das diretrizes ao Corre, Dino!

**Objetivo:** aplicar ao Corre Dino a revisão autorizada para Nave Contra Asteroides, preservando os 13 marcos do programa e os slugs atuais.

**Arquitetura:** uma fonte editorial gera proposta, roteiro, manifesto e conteúdo do caderno. Os projetos originais de `qa/corre-dino-projetos-qa.ts` continuam independentes dos critérios; um adaptador converte cada marco para o documento atual do Estúdio, com IDs determinísticos. As experiências existentes são reaproveitadas, com instruções conferidas nos controles e no motor.

**Referências:** `docs/aulas-interativas/DIRETRIZES-PEDAGOGICAS.md`, `ESPEC-ROTEIRO.md` e a aplicação concluída em `modulos-nave-contra-asteroides.md`.

## Decisões

- Conservar as 13 aulas e os resultados existentes: preparação; desenho; pulo; som; cactos; limpeza; estados; início; derrota e reinício; colisão; pontos; sorteio; dificuldade.
- Separar conceitos por seção. Uma aula pode ter diversas montagens verificadas; o envio fica no fim.
- Colocar experiências antes da primeira aplicação e retomar o que foi observado antes de buscar os blocos. Mostrar o destino antes de abrir a paleta.
- Preservar o resultado da primeira aula: tela e Dino criado, ainda não desenhado. A experiência de criação e desenho explica essa diferença antes da montagem; a construção da tela é a ação prática desta aula.
- Distribuir cinco quizzes nas aulas 3, 6, 9, 11 e 13, somente Zappy e perguntas, com explicações e novas tentativas.
- Tirar tours, agendas, a demonstração de Ponte indisponível no modo de blocos e o fechamento comercial. Publicação opcional no fim, com os passos reais.
- Produzir o caderno com o padrão visual atual, cores reais dos blocos e montagem completa.
- Não publicar nem substituir anexos remotos. Preservar alterações de outros cursos presentes no diretório.

## Execução e evidências

- [x] Levantar manifestos, roteiros, projetos e regras atuais; guardar cópia local em `tmp/corre-dino-retomada/originais`.
- [x] Executar a referência anterior: 24 testes do Estúdio aprovados.
- [x] Criar `qa/corre-dino.conteudo.json`, `qa/corre-dino-etapas.ts` e `qa/gerar-corre-dino.ts`; gerar os 39 arquivos das aulas.
- [x] Incluir o curso nos validadores das diretrizes atuais e testar continuidade, critérios, quizzes e instruções executáveis das experiências em `qa/corre-dino.test.ts`.
- [x] Gerar e inspecionar `output/pdf/corre-dino-caderno.pdf` com os fontes em `recursos/corre-dino/`.
- [x] Atualizar o mapa do curso, índice e registro de revisão; executar validadores, testes editoriais e de execução do jogo, tipagem e conferência visual.

Resultado: 13 aulas, 81 seções, 76 vídeos planejados, 24 experiências e cinco quizzes; caderno de 52 páginas. Verificações do escopo: 185 testes editoriais/aprendizagem, 24 de execução do jogo e dois de renderização aprovados. A varredura ampliada das cenas conserva uma falha de distribuição de alternativas em Meu Jeito; a tipagem completa do member-shell conserva cinco diagnósticos externos. Evidências e produção pendente em `docs/aulas-interativas/qa/revisao-corre-dino-2026-10-05.md`.

Comandos principais: `bun docs/aulas-interativas/qa/gerar-corre-dino.ts`; `bun docs/aulas-interativas/qa/validar-manifestos.ts corre-dino`; `python -X utf8 docs/aulas-interativas/validar-roteiros.py corre-dino`; `bun test docs/aulas-interativas/qa packages/core/tests/learning.test.ts`; em `packages/studio`, `bun test src/blockly/__tests__/correDinoEditorial.test.ts`.
