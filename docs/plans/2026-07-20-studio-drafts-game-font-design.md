# Rascunhos discretos e tipografia infantil nas extensões

**Status:** aprovado em 2026-07-20

## Objetivo

Reduzir a interferência visual dos blocos de rascunho no editor e dar às telas
automáticas das extensões oficiais uma identidade mais acolhedora para crianças,
sem depender de rede e sem alterar fontes escolhidas explicitamente pelo aluno.

## Decisões de experiência

O aviso global e persistente de rascunhos será removido. Um bloco incompleto já
possui borda tracejada, aparência diferenciada e aviso próprio do Blockly; esses
sinais permanecem próximos do problema e não ocupam uma faixa fixa sobre a área
de trabalho. O toast de colagem é independente e continuará temporário.

A fonte automática de HUDs, placares, diálogos, menus e telas prontas das
extensões oficiais será **Baloo 2**, com fallbacks arredondados. A escolha não
substitui fontes configuradas pelo aluno nem a tipografia monoespaçada de
informações estritamente técnicas, como consoles e painéis de depuração.

## Arquitetura da fonte

A variante necessária de Baloo 2 será incorporada localmente, com sua licença,
e convertida em um módulo gerado com `data:` URI. Um bootstrap compartilhado
injetará uma única regra `@font-face` no documento da execução, identificada por
um atributo estável para evitar duplicação.

O bootstrap acessará o DOM por `window.document` e encerrará sem efeito quando o
documento não existir. Isso mantém os runtimes testáveis em ambientes sem DOM e
permite que preview, reinício e exportação offline usem exatamente a mesma
fonte. Nenhum runtime dependerá de Google Fonts, CDN ou outra requisição externa.

As extensões oficiais que produzem interface pronta reutilizarão o mesmo token
de família tipográfica. A adoção abrangerá Jogo 2D, Jogo 2D Avançado, Jogo 3D
Avançado e Mundo 3D; extensões sem HUD ou tela automática não receberão código
sem uso.

## Compatibilidade e versionamento

A alteração é apenas visual e não muda IR, blocos ou projetos salvos. As versões
patch das extensões modificadas serão elevadas para que catálogo, exportação e
cache reconheçam os novos runtimes.

## Testes

As regressões devem demonstrar que:

- o editor não renderiza mais o aviso global de rascunhos;
- blocos incompletos continuam recebendo classe visual e warning próprios;
- o bootstrap da fonte é local, idempotente e seguro sem DOM;
- os runtimes oficiais usam o token compartilhado nas interfaces automáticas;
- não há URL HTTP na fonte incorporada;
- preview e exportação continuam válidos e os runtimes continuam parseáveis.

A conclusão exige testes focais, suíte completa do Studio, typecheck, lint/formato
e o E2E de lifecycle executados novamente após as alterações.

## Documentação

O manual do Studio explicará que rascunhos são indicados diretamente no bloco,
sem aviso fixo, e que interfaces automáticas usam uma fonte infantil local. Os
manifests e documentos técnicos relevantes serão atualizados somente onde essa
informação faz parte do contrato descrito.
