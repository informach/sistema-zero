# Correções do full review de 24–25/08

## Objetivo

Corrigir os nove achados do full review e aplicar as melhorias arquiteturais aprovadas, sem alterar a decisão de produto de manter um seletor global Kids × Adultos com overrides locais explícitos em Recados e Entregas.

## Contexto de plataforma

O seletor global define o contexto inicial das telas. Ao trocar de plataforma, cada tela deve invalidar requests em voo e limpar filtros ou seleções incompatíveis. Recados e Entregas mantêm o seletor local de plataforma, mas voltam ao novo contexto global e removem o curso anterior. Moderação mostra apenas servidores da plataforma ativa. Páginas de um curso específico exibem a audiência real do curso e não se apresentam como listas filtradas pelo seletor.

## Correções funcionais

1. Mover o filtro de audiência da moderação para o Hub e preservar a audiência canônica em denúncias cujo conteúdo foi removido.
2. Fazer o store de badges drenar uma revalidação forçada recebida durante outra leitura.
3. Limpar estado incompatível na troca Kids × Adultos e impedir publicação de respostas antigas em Moderação, Análises e Atividade do membro.
4. Criar cursos na plataforma ativa.
5. Buscar responsáveis também pelo nome completo.
6. Contar comentários do Clube somente quando o tópico pai estiver visível.
7. Validar a audiência de origem do clone dentro da transação.
8. Propagar falhas do Auth ao montar a ficha da família.

## Melhorias arquiteturais

- Substituir o fan-out por perfil do detalhe do membro por consultas em lote, agrupadas por aprendiz e curso.
- Executar em paralelo as três agregações independentes de atividade do Hub.
- Adicionar índices `pg_trgm` para as buscas literais com `ILIKE` em nome de perfil, e-mail e nome completo do responsável.
- Cobrir transições de plataforma, paginação, filtros incompatíveis e requests concorrentes com testes de regressão.

## Dados e migrations

A mudança de índice é aditiva e não exige backfill. A migration deve ser gerada pelo script Drizzle do pacote Auth. Ela habilita `pg_trgm` de forma idempotente e cria índices GIN compatíveis com os predicados usados pela busca.

## Estratégia de testes

Cada causa raiz recebe primeiro um teste que falha no estado atual. Os testes devem observar comportamento público ou contratos de ports, sem expor métodos exclusivos de teste. Depois de cada grupo, executaremos a suíte focada. Ao final, executaremos testes, typecheck e Biome de todos os pacotes afetados, além de `git diff --check` e inspeção da migration gerada.
