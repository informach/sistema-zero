# C01e: ajustes manuais não escondem conhecimentos exigidos

## Problema e decisão

C01c deriva as ferramentas das regras alteradas. A API ainda aplica `blocosManuais.retirar`
antes de conferir a cobertura. Retirar um tipo derivado pode ocultar um bloco sem curso
ou dependente de Poder opcional e permitir publicar. Corrigir na análise compartilhada
por publicação e importação: o conjunto exigido sempre inclui os derivados, e tentar
retirá-los gera problema impeditivo com o nome do bloco.

O formato histórico não muda. Acréscimos manuais continuam podendo acrescentar requisitos;
retiradas de itens que não são derivados conservam a semântica anterior. Não conceder blocos,
alterar carteira, limpar histórico ou mudar automaticamente publicações existentes.
O Admin explica o limite junto aos campos existentes. Não apagar ajustes sem ação da equipe.

Como defesa compatível com uma versão anterior do Members, blocos desconhecidos informados
na resposta também são problemas da API, mesmo se aquela resposta não trouxer o problema.
Não confiar no catálogo remoto para legitimar um bloco que o leitor não conhece.

## Etapas

- [x] Reproduzir o desvio por análise/publicação e prévia/aplicação de manifesto.
- [x] Preservar derivados na cobertura e impedir a publicação com retiradas indevidas.
- [x] Provar blocos desconhecidos de uma resposta antiga do Members e rascunho preservado.
- [x] Atualizar orientação do Admin, docs, revisão, testes, tipagem e Biome.
- [x] Commit `50ca1203b` e merge local `a769f0a78`, sem push.

## Histórico e próximos recortes

Publicações antigas têm snapshots próprios. A reativação hoje confere a cobertura da lista
congelada. Conferir novamente seu conteúdo, sem usar o rascunho e sem mudar conclusões,
foi tratado no recorte C01e2, documentado em `2026-10-30-arquipelago-reativar-publicacoes.md`.
Implantação e auditoria do conteúdo remoto continuam em Q01.
Antes de publicar conteúdo revisado, implantar a derivação C01c do Members e esta barreira
da API. A defesa para respostas antigas não substitui a comparação semântica do Members.

## Pedidos de arte

Nenhum. Sem arte, banco remoto, migração, salvamento ou push.

## Verificações

- Antes da correção, os três testes novos falharam: requisito omitido, desconhecido aceito
  e manifesto autorizado a publicar sem fonte. Depois, passaram.
- API completa: 270 testes aprovados, 114 ignorados por dependerem de Postgres local,
  zero falhas, 1.076 asserções. Banco não configurado. A análise e as rotas HTTP reais
  usam repositório em memória nos testes deste lote.
- Admin completo: 971 testes aprovados, zero falhas, 3.979 asserções.
- Tipagem da API e do Admin com 8 GB aprovada (`bunx tsc --noEmit` em cada pacote).
  Biome dos quatro arquivos TS/TSX e `git diff --check` aprovados.
  A mudança do Admin é apenas orientação textual;
  não altera controles, layout nem tratamento existente dos problemas da análise.
- Revisão: todos os caminhos de publicação/importação usam a análise protegida. Derivados
  únicos continuam na cobertura; a retirada não é apagada silenciosamente. Cancelamento de
  acréscimo não derivado e deduplicação do problema de desconhecido têm testes próprios.
  Tipos de resposta, permissões, controle de revisão e snapshots publicados permanecem iguais.
- Não há prova nova de navegador neste recorte de análise no servidor. As rotas reais foram
  conferidas em memória; o aceite autenticado e a implantação continuam em Q01.
