---
name: analise-marketing
description: Analisa métricas de conteúdo, tráfego pago e conversão do funil do Sistema Zero para diagnosticar gargalos e planejar experimentos, otimização e escala com dados comparáveis.
---

# Análise de marketing e experimentos

Leia [o contexto](../marketing-sistema-zero/references/contexto.md) e [métricas e diagnóstico](references/metricas.md). Descubra os dados disponíveis: exportação, relatório, API autorizada, métricas do app ou analytics do funil. Uma fonte ausente não exige inventar integração.

## Diagnóstico

1. Declare produto/campanha, período, fuso, moeda, origem dos números, definição de conversão e janela de atribuição. Separe dado ausente, zero e atraso de coleta.
2. Confira qualidade: duplicação, eventos de cliente versus servidor, URLs/UTMs, mudanças na oferta, tracking, pagamentos, dados parciais e atraso de conversão. Falha de checkout pode explicar queda que parece problema de copy.
3. Calcule métricas com bases compatíveis. Mostre contagens junto de taxas. Compare períodos equivalentes e histórico da própria operação; não importe thresholds fixos de outros negócios.
4. Percorra a jornada: entrega de mídia → atenção → clique → página → lead/quiz → checkout → pagamento → ativação/continuidade. Use apenas etapas observadas; marque as ausentes.
5. Para cada gargalo, apresente evidência, explicações alternativas, hipótese e ação proporcional. Priorize o que afeta a decisão, não uma lista automática de dez relatórios.

## Experimentos e escala

Defina hipótese, controle/variante, unidade de comparação, métrica principal, proteções e critério de leitura antes de executar. Registre no [histórico de experimentos](../marketing-sistema-zero/references/registro.md). Se não houver aleatorização ou infraestrutura de A/B, proponha observação e explicite a limitação.

Orçamento/CPA aceitável depende de margem, taxas, impostos, reembolso, custo de entrega, retenção e caixa. Não use “50% do ticket” ou aumento de “20% ao dia” como regra. Em assinaturas, separe receita inicial e valor ao longo do tempo; não extrapole LTV sem coorte e horizonte.

Recomende escala apenas com qualidade do dado, volume/contexto e capacidade de entrega suficientes. Defina limites e condições de interrupção proporcionais ao pedido. Sem dados suficientes, entregue um plano de coleta ou teste limitado.

Analisar não autoriza pausar campanha, alterar orçamento, publicar peças ou enviar relatórios a terceiros. Quando essas ações forem explicitamente pedidas, prepare a mudança concreta e respeite o escopo/limites já autorizados; peça apenas a decisão que faltar. Consulte documentação oficial atual antes de operar uma API de anúncios.

Entregue diagnóstico priorizado, cálculos, limitações e plano. Não declare melhoria de conversão sem resultado observado comparável.
