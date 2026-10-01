# Métricas e bases de comparação

| Métrica | Cálculo | Condição |
| --- | --- | --- |
| CTR de link | Cliques de link / impressões | Não misturar CTR geral ou único |
| CPC de link | Gasto / cliques de link | Mesma moeda, conta e período |
| CPM | Gasto / impressões × 1.000 | Comparar público, canal e janela |
| Frequência | Impressões / alcance | Usar alcance deduplicado; não somar alcance diário |
| Chegada à página | Visualizações de landing / cliques de link | Proxy de continuidade, sujeito à coleta e atribuição |
| Conversão por etapa | Pessoas únicas que avançam / pessoas elegíveis na etapa | Mesma coorte, produto, período e definições |
| CPA/CPL | Gasto / compras ou leads atribuídos | Explicitar compra, lead e janela da fonte |
| ROAS | Receita atribuída / gasto | Declarar receita bruta/líquida, moeda e tratamento de estorno |
| Ativação/continuidade | Compradores que ativam/continuam / compradores elegíveis | Aguardar tempo para a coorte maturar |

Denominador zero ou ausente resulta em “não calculável”, não em taxa zero. Taxa real de zero com denominador positivo continua zero. Agregue razões por somas compatíveis, não por média simples das taxas. Não some compras do Meta com pagamentos do funil como se fossem pessoas distintas.

Retenção de vídeo de 25% não equivale a visualização de três segundos: depende da duração. Use o campo exato e descreva sua definição. Comentários, compartilhamentos, alcance e views ajudam a entender conteúdo; sozinhos não demonstram venda incremental.

No Sistema Zero, confira `packages/funnel/CLAUDE.md` e a implementação de eventos/relatórios antes de mapear marcos. Pagamento confirmado é evidência do servidor; carregamento da página de obrigado não prova compra. Valores efetivos devem considerar os snapshots de oferta/pagamento, descontos e estornos pertinentes. UTMs first-touch não são equivalentes à atribuição da plataforma de mídia.

## Matriz de diagnóstico

| Sinal | Investigações possíveis |
| --- | --- |
| Impressões com poucos cliques | Relevância, gancho, público, formato e promessa |
| Cliques sem chegada à página | Destino, carregamento, redirecionamento, coleta, cliques acidentais |
| Página vista sem avanço | Continuidade da promessa, clareza, prova, objeção, oferta, CTA, erro funcional |
| Checkout sem pagamento | Falha técnica, condição comercial, meio de pagamento, confiança, coleta |
| Compras com pouca ativação | Entrega, acesso, boas-vindas, expectativa criada pela copy |
| Engajamento sem resultado comercial | Objetivo da peça, público, CTA, destino, janela e tracking |

Essas são hipóteses concorrentes, não diagnósticos automáticos. Segmente por produto, origem, dispositivo e período quando houver base suficiente. Evite conclusões sobre grupos pequenos ou inferências psicológicas a partir de dados agregados.
