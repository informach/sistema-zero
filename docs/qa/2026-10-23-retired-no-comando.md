# Retirada do No Comando da IA

Decisão da dona em 23/10/2026: não trabalhar mais com o produto; excluir o curso,
quiz e página de oferta. A compra encontrada era um teste da própria dona, confirmado
na conversa. O histórico financeiro desse teste permanece.

## Dados e código

- Produção: oferta e produto arquivados pela API autenticada do Admin. Preço original
  confirmado em 3.700 centavos. Curso excluído pelo BFF canônico após contagem de
  entregas igual a zero; leitura posterior confirmou ausência no catálogo de cursos.
- Nenhum pagamento, cadastro de comprador ou histórico financeiro foi excluído.
- Fonte: retirados registro público, quiz/diagnóstico exclusivos, body de oferta,
  treze imagens e entrada no sitemap. `/pro` e atalhos planos usam a Comunidade adulta.
- Seed do catálogo não recria o produto/oferta. O antigo seed de desenvolvimento
  Members, dedicado ao curso retirado, foi eliminado com seus comandos.
- Comunidade: removidos cartão promocional exclusivo e sua consulta de acesso.
- Tipos e componentes compartilhados de quiz, checkout e documentos legais continuam.

## Verificação local

- Funil: `bun test`, 592 aprovados, 2 PostgreSQL ignorados por falta de banco de teste,
  zero falhas. Checkout/assinatura/webhook executados explicitamente: 70/70.
- `astro check`: 337 arquivos, zero erros e três sugestões preexistentes.
- `astro build`: sucesso. Biome sem erros; avisos de especificidade CSS e strings
  de templates preexistentes permanecem identificados.
- Seed Catalog: 7 testes/48 asserções. Continuidade Community: 7/20.
  Controles Member Shell de acesso/retorno: 9/24.
- SSR real em loopback, sem banco/gateway: cinco URLs retiradas retornam 404;
  `/pro` retorna 302 para a Comunidade adulta; quizzes Adultos/Kids retornam 200.
  Servidor de teste encerrado. Runner versionado:
  `bun tests/browser/retired-funnel-routes.ts`, após build do pacote Funnel.
- Sem afirmação de homologação visual completa ou de implantação destas alterações
  de fonte; a confirmação remota deve ser registrada após o rollout.

## Correção encontrada no Admin

O formulário emitia `37.00`, mas `reaisToCents` removia todos os pontos e o interpretava
como 3.700 reais. Isso alterava um preço mesmo ao salvar apenas a situação da oferta.
O parser agora distingue decimal com ponto de agrupamento brasileiro, aceita vírgula
e recusa entrada inválida. RED reproduziu a multiplicação; GREEN: 10 testes/30
asserções com os controles de política de acesso da oferta. O valor da oferta
arquivada foi restaurado e conferido no servidor.
