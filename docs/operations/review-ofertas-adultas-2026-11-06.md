# Implementação e revisão das ofertas adultas

Data: 06/11/2026. Estado: implementação local verificada; este registro não comprova publicação em staging ou produção.

## Escopo

- `/pro/desafio-primeiro-jogo/oferta`.
- `/pro/comunidade-dos-criadores/oferta`.
- `/pro/comunidade-dos-criadores/oferta/continuar`.

Aplicadas as propostas HTML aprovadas, preservando a identidade arcade e a argumentação completa: autonomia para criar e realizar ideias, projeto guiado, compreensão das regras, escolhas e testes, habilidades praticadas e continuidade. O Desafio demonstra A Chave do Farol; a Comunidade explica o valor de ampliar o repertório entre projetos.

A direção está consolidada em [posicionamento adulto](../marketing/pro/posicionamento.md), com a hierarquia dos benefícios, a lógica da conversa, exemplos concretos, papel de cada oferta e critérios para futuras peças. O manual de marketing aponta para os registros adulto e Kids. A análise anterior permanece identificada como histórico.

## Integração

A copy vive nos módulos tipados de cada oferta e alimenta os componentes Astro reais. Os espelhos editoriais foram atualizados. A página Continuar delega ao mesmo componente da oferta normal e compartilha seus dados; altera apenas a headline, inclusive mantendo o mesmo pré-checkout.

Foram preservados os preços do catálogo, a identificação de cada plano, a cotação e o transporte do cupom, o pré-checkout e a atribuição de origem até o checkout. No Desafio, o desconto cotado aparece no valor e no preço anterior riscado. Na Comunidade, o aviso explica que o cupom será conferido para o plano escolhido e vale apenas na primeira cobrança.

As capturas são arquivos reais da plataforma, com dimensões e texto alternativo. A ampliação reutiliza o diálogo compartilhado, agora também com estilo arcade. Cada página mantém apenas o rodapé institucional compartilhado, fora do contêiner que redefine os estilos da oferta.

A página adulta do presente tinha referências à estrutura antiga da oferta paga. Essas referências foram desacopladas preservando sua apresentação existente; não houve reescrita da copy do presente adulto nem dos quizzes adultos.

## Achados corrigidos

1. A continuidade adulta tinha conteúdo e implementação separados. Passou a compartilhar a página normal, evitando diferenças além da headline aprovada.
2. Valores presentes na proposta HTML eram apenas demonstrativos. Todos os valores comerciais apresentados na implementação, incluindo resumos e FAQ, usam o catálogo.
3. Quando só um plano está disponível, a página agora explica esse plano, omite a opção ausente e não mostra preços ou FAQ do anual indisponível. A economia anual exige os dois preços reais e uma diferença positiva.
4. O diálogo de imagens compartilhado só tinha aparência Kids. Recebeu estilos da área adulta, preservando centralização, teclado, Escape, foco e link direto como alternativa sem JavaScript.
5. Os termos das duas assinaturas ainda negavam a aplicação de cupons. Foram alinhados à regra já aprovada e implementada: desconto somente na primeira cobrança, renovação pelo valor normal. As versões registradas para novos aceites foram atualizadas para `comunidade-adulto-2026-11-06` e `comunidade-kids-2026-11-06`.
6. O gerador do espelho editorial mantinha espaços ao fim de trechos da headline. O espelho remove esses espaços finais sem alterar a copy renderizada.

## Evidências

- `bun test`: 617 testes aprovados, dois ignorados, nenhuma falha.
- `bun run typecheck`: nenhum erro ou aviso; três sugestões preexistentes do TypeScript.
- `bun run check`: nenhum erro; sete avisos e 16 informações preexistentes, sem novas ocorrências nos estilos adicionados.
- `bun run build`: concluído com sucesso.
- Navegador: três ofertas do Desafio e cinco da Comunidade, incluindo as variantes Kids existentes, nas larguras 320, 390, 768, 1024 e 1440.
- Conferidos: links e âncoras, ausência de IDs duplicados, arquivos de imagens, um rodapé, preço real do catálogo de teste, escolha do plano, pré-checkout, foco do modal e atribuição até a URL do checkout. A confirmação financeira não foi executada.
- Ampliação de todas as imagens adultas com centralização, limites da tela, teclado, Escape e retorno do foco; leitura com texto ampliado e ausência de rolagem horizontal.
- Comparação do DOM da oferta adulta normal e de Continuar: conteúdo idêntico após normalizar somente a headline.
- Quatro cenários adicionais do catálogo: dois planos, só mensal, só anual e anual sem economia. Cada um conferido nas duas páginas adultas da Comunidade, com cupom válido e expirado. Valores de teste diferentes dos comerciais comprovaram a leitura dinâmica.

As verificações de compra usaram serviços locais simulados e dados sintéticos. Nenhuma assinatura real foi criada. Capturas e logs detalhados permanecem locais em `.cache/adult-offers-implementation-20261106` e `tmp/{desafio-ofertas-review,comunidade-oferta-review}`. A revisão editorial e funcional não é evidência de melhoria de conversão.
