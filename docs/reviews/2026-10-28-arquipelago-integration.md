# Integração e correções do Arquipélago — 28/10/2026

Base das correções: `742e9f66e`. Primeiro lote: `20322b1e4`. Remoto conciliado: `0bfe3c51b` (pintura por quadro, cordas/locomoção e visibilidade do cartão dos pais). Este registro complementa a revisão inicial, cujos resultados descrevem a base anterior.

## Resultado da revisão

- **Publicações e conquistas:** metadados publicados congelados; rascunho não desloca um desafio público nem a conquista antiga. Índice reserva a posição publicada, mesmo durante edição. Arquivar/reativar avança a revisão de escrita e invalida publicações concorrentes. Repetir a publicação devolve os blocos efetivamente congelados. O indicador de alterações compara conteúdo/metadados, sem acusar mudança de projeto apenas por arquivamento.
- **Memória das ilhas:** retenção da cena enquanto `compileAsync` a usa; cancelamento invalida a continuação, e a última liberação descarta materiais originais substituídos, opacos, transparentes, geometrias e texturas. A pintura nova é aplicada também às cópias transparentes, preservando esse ownership.
- **Pausa:** personagem e tempo competitivo usam a mesma política para menu, painel, ferramenta, sincronização, limite e resultado. Física/arte dos cipós do remoto preservada.
- **Shader remoto:** suavização da borda passa a usar `1 - smoothstep(0, borda, f)`. A expressão anterior invertia `edge0/edge1`, caso de resultado indefinido em GLSL. Não muda a intenção visual.
- **Admin e host:** autoria por comunidade, inicial/gabarito independentes, objetivos reutilizados do editor existente, análise/publicação no servidor. O desafio abre em Estúdio de tarefa, sem conceder acesso ao Estúdio Completo. Rascunho isolado por pessoa/comunidade/desafio/revisão; resultado antigo não valida edição nova; erro de salvar não fecha nem envia verificação.
- **Autorização:** BFF reaproveita sessão e proteção de origem do Admin; staff lê/analisa, admin escreve. Allowlist de rotas/corpos; backend continua autorizando. Gabarito restrito à equipe. Leitura do cartão dos pais conserva a política recebida do serviço, com os perfis prontos da conta.
- **Windows:** helper usa APIs ACL existentes do .NET em vez de compilar C# por operação; conserva ACL protegida de um único SID com controle total e o prazo de dez segundos. Agora distingue timeout, saída e última fase. Os logs antigos não provam em qual fase o runner esgotou o prazo; não se atribui a falha ao jogo nem se promete eliminar toda indisponibilidade do Windows.

## Evidência local

| Verificação | Resultado |
| --- | --- |
| Jogo + contratos + API, incluindo Postgres | 376 passaram; 1 teste de tempo inicialmente pulado |
| Teste de tempo executado separadamente com Postgres | 1 passou, 3 asserções |
| Migração de banco antigo preenchido até 0006 | 1 passou, 8 asserções; projetos, revisões, blocos e moedas preservados |
| Rotas do shell + contrato/diálogo do desafio | 15 passaram (diálogo usa wrapper isolado) |
| Cartão de limite dos pais | 8 passaram, 23 asserções |
| Segurança Windows, suíte completa do runtime | 64 passaram, 381 asserções |
| BFF Admin, controles reais de sessão/origem com upstream simulado | wrapper passou; 3 casos internos: sem sessão/origem cruzada, staff/inativo, revisão/cancelamento/allowlist |
| Admin no Chrome, Estúdio real + HTTP em memória | conflito sem perda, salvar/analisar/publicar, separação de públicos, Blockly pronto e fechamento com gravação, largura de 390 px |
| Jogo no Chrome/WebGL local | perda de resposta pausa; recuperação pelo teclado; Escape não remove a proteção |
| Build do cliente do jogo | passou, 19 arquivos / 15,79 MB |

Comandos dos ensaios de navegador estão no plano e em `packages/arquipelago/playground/verificar-tempo-browser.mjs`. Logs e capturas descartáveis ficam na `.cache/` e nos `review-*.log` ignorados; os scripts e testes reproduzíveis ficam no Git. O ensaio Admin não usa dados nem contas reais. O ensaio do jogo não mede FPS, uso de GPU ou todas as interações do Bosque.

## Migração e operação

As migrações 0004–0006 foram geradas a partir do schema, com backfill explícito entre as etapas. O backfill só conhece o último metadado armazenado pelo sistema antigo: não consegue reconstruir a localização histórica que nunca foi salva. A prova de atualização usa schema exclusivo e o remove ao terminar; nenhum banco remoto foi alterado nesta revisão.

`.railway/variables.ts` passa a registrar `ARQUIPELAGO_DESAFIOS` e `ARQUIPELAGO_MEMBERS_TOKEN` (este nos dois serviços). Isso preserva nomes na infraestrutura declarativa; não cria valores nem ativa desafios. Para ativar, conferir token compartilhado Members/jogo, `MEMBERS_URL`, migrações, modo dos desafios e fluxo autenticado completo após o deploy. Estes testes locais não certificam configuração ou implantação de staging/produção. CI hospedado e deploy são etapas posteriores ao push.
