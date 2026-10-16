# Lote 3 — review

- Problemas expõem TS/código/mensagem original, explicação opcional e investigação contextual como rascunho do Zappy. Hash, faixa e conteúdo vivo são conferidos novamente no clique; não há envio automático.
- Estados explícitos pending/ready/error impedem apresentar uma análise ainda não concluída como projeto sem erros. Falhas antigas não substituem uma rodada nova.
- Review no browser reproduziu reinícios contínuos: ProCodeEditor criava `proProject` em cada render. Entrada memoizada por árvore/dependências resolve a causa, preservando novas análises em mudanças reais. Indicador pending repetido não gera novo render.
- Materiais usam o bundle canônico e seu cache existente. Lista filtrável, 50 itens por página, uma prévia de imagem solicitada por vez, exemplos montados sob demanda, busca literal por ID/caminho. Nenhum renderer 3D adicional, áudio automático ou cópia de material para a árvore textual.
- Guias conservam catálogo/compatibilidade e podem localizar símbolos pelo serviço de linguagem na revisão atual. Breadcrumb revela também a navegação estreita.
- Trinta e dois testes focados passaram. Chromium passou em investigação sem envio, materiais/busca de uso, inserção revisada, continuidade do jogo/undo e hosts sem tutor.
- Observação no Sistema Zero é deliberadamente `inert` (inclui handoff); esse contrato foi preservado. O teste novo foi corrigido para verificar bloqueio total do observador e navegação no host autor sem tutor, em vez de presumir interação no observador.
- Typecheck do lote anterior terminou sem erros; o conjunto ampliado será verificado novamente no full review.
