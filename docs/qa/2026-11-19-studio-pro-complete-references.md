# Referências completas no Pro

## Falha e contrato

`ProCodeTools.findReferences` recebia os resultados do serviço de linguagem,
calculava posições e descartava tudo após a centésima ocorrência com
`.slice(0, 100)`. A interface não indicava o corte. Um projeto modular maior
perdia destinos válidos de navegação, embora o serviço os tivesse encontrado.

O teste com 251 arquivos de referência reproduziu o corte antes da correção.
O painel agora conserva o resultado inteiro da consulta, monta cem destinos
por vez e informa quantidade visível/total. “Mostrar mais referências” revela
outros cem; uma nova consulta reinicia a janela. Respostas antigas continuam
sujeitas às mesmas guardas de sessão, árvore, fechamento e ordem de consultas.
Não há nova fila, armazenamento ou alteração do serviço de tipos.

Um clique num destino volta o foco ao editor. O teste de navegador identificou
e reproduziu a falta desse foco antes do ajuste. Usar as mesmas classes de
botão e texto do painel preserva a identidade visual; traduções pt-BR/en foram
adicionadas. Os controles e caminhos dos cursos não foram modificados.

## Evidências locais

- Componente: 11 testes/38 asserções, incluindo alcance do último resultado,
  paginação, contagem, reinício de busca e descarte de respostas obsoletas.
- Família de linguagem/workspace: 54 testes/220 asserções, dez arquivos,
  sem falhas.
- TypeScript da árvore local: sem erros. Biome dos arquivos alterados: aprovado.
- Chromium completo, Windows, Monaco e worker TypeScript reais: declaração
  e 251 usos de `score`, 252 referências. Conferidos 100 → 200 → 252 destinos,
  clique na linha 252, foco no editor e ausência do botão após o último lote.
  Uma aprovação em 3,8 s; 30,1 s incluindo build do fixture.

Comando: `bunx playwright test --config e2e/pro-workspace.config.ts
--grep 'all references' --retries=0`, em `packages/studio`.

Não é virtualização completa do painel: lotes revelados continuam montados
até a consulta ser substituída/fechada. O transporte ainda recebe o resultado
completo. Não comprova a homologação do projeto Pro grande com execução,
WebContainer, materiais, Zappy e diagnóstico simultâneos; essa etapa continua
aberta no plano global.
