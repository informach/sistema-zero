# Reorganização do Desafio do Primeiro Jogo

**Objetivo:** preparar um script único para ensaiar em staging e depois repetir em produção, preservando os IDs das sete aulas que permanecem.

**Fonte curricular:** `docs/aulas-interativas/modulos-desafio-primeiro-jogo.md` e os slugs dos sete manifestos. O curso pode ter três módulos ou um quarto módulo antigo de encerramento contendo apenas certificado e “Continue criando”. Módulos ou aulas inesperados fazem o script parar antes de escrever.

## Planejamento

- [x] Identificar as sete aulas por slug ou título conhecido; caderno, mapa e “Continue criando” são exclusões opcionais.
- [x] Planejar a ordem final: boas-vindas + Dia 1; Dia 2 + Dia 3; Dia 4 + Dia 5 + certificado.
- [x] Aplicar título, resumo e ilustração de cada módulo. Preservar o ID e o conteúdo das aulas mantidas.

## Segurança da execução

- [x] Dry-run padrão com IDs e mudanças propostas; aplicação exige alvo, ID do curso e identidade do banco conferidos no dry-run.
- [x] Transação única; bloquear o curso durante a aplicação; evitar colisões do índice único de ordem com posições temporárias.
- [x] Limpar as conclusões das aulas excluídas, como faz o CRUD existente; impedir exclusão de uma atividade de vitrine.
- [x] Repetir o script sem mudanças deve ser um no-op.

## Verificação

- [x] Testar cenários sem aulas opcionais, com aulas antigas, títulos alternativos, entradas inesperadas, quarto módulo e segunda execução.
- [x] Rodar typecheck e testes dos pacotes afetados. A conexão disponível aponta para localhost e recusou acesso; staging ainda precisa do dry-run com sua própria `DATABASE_URL`.
- [x] Não executar em produção nesta tarefa.
