# Remediação do review de 15/08/2026

## Objetivo

Corrigir os três achados do review do trabalho de 15/08/2026 e restaurar a geometria correta dos seletores de preenchimento e contorno do Pinta.

## Desenho aprovado

### Deploy do Pinta no Members

`@sistemazero/members` passou a consumir o formato wire de `@sistemazero/pinta`. Portanto, qualquer mudança em `packages/pinta` deve disparar também o deploy do Members tanto no Railway quanto no seletor de serviços do workflow de staging. A documentação do pacote deve refletir essa dependência real.

### Carregamento assíncrono do editor

Os embeds do Pinta no Member Shell e no Admin terão um loader isolado e testável que transforma rejeições do `import()` em um resultado explícito. As telas mostrarão erro com ação de tentar novamente, em vez de permanecerem no spinner. O padrão seguirá o loader já usado pelo embed do Studio.

### Paridade do fake de desbloqueios

O repositório em memória considerará fonte viva apenas quando o curso existir, pertencer à audiência solicitada e estiver `published`, espelhando a consulta Drizzle. Haverá regressão cobrindo curso arquivado tanto na lista de blocos quanto na revisão.

### Seletores de preenchimento e contorno

Os dois alvos clicáveis permanecerão separados e com 44 px. Cada amostra visível terá 40 px e continuará deslocada para formar o par sobreposto. Borda e ring de seleção serão aplicados à própria amostra, não ao alvo externo; assim, a indicação ativa terá exatamente o mesmo tamanho e alinhamento da cor exibida. O furo do contorno continuará diferenciando visualmente os canais.

## Verificação

- Testes focados de deploy, loaders, fake de desbloqueios e geometria dos seletores.
- Testes completos dos pacotes afetados.
- Lint, `git diff --check`, testes e typecheck globais do workspace.

