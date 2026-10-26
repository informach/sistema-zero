# Admin: separação comercial por comunidade

Estado: código em revisão/integração. Não é um recibo de implantação.

## Alcance

| Área | Regra |
| --- | --- |
| Catálogo | Produtos/cupons com audiência imutável; ofertas herdam produto. Combos, bônus e aplicação de cupom recusam outra comunidade. |
| Campanhas | Lista, contagem, busca, formulário e detalhe seguem Kids/Adultos. |
| Embaixadores | Cadastro e página pessoal compartilhados; códigos, convites, resgates e conversões exibidos por comunidade. Desativar a pessoa continua valendo para ambas, com aviso explícito. |
| Visão geral | Catálogo e vendas da comunidade; cartão de contas explicitamente compartilhado. |
| Vendas/assinaturas | Filtro no SQL antes de total/paginação; detalhes por ID obedecem ao mesmo escopo. Histórico sem origem tem consulta própria. |
| Zappy/Pensa | Progresso de projetos do Pensa separado. Uso/custos/qualidade/cotas gerais claramente identificados. |
| Contas, fiscal, atendimento, auditoria, infraestrutura | Compartilhados. Sem alterar identidade, permissão ou quota. |

O seletor é uma preferência de interface. RBAC e comprovação de origem continuam no servidor.
A troca de comunidade desmonta formulários/diálogos/seleções e aborta as consultas da página
anterior; respostas tardias, inclusive de mutações, não voltam a atualizar a tela retirada.
Cancelar o fetch não promete desfazer uma gravação já aceita pelo servidor.

## Auditoria real de 26/10/2026

Leitura por SSH no Catalog, transação PostgreSQL `read only`, sem copiar credenciais:

- Staging: 19 produtos, zero cupons, 2 pagamentos e zero assinaturas.
- Produção: 19 produtos, zero cupons, 15 pagamentos e 2 assinaturas.
- Todas essas compras e assinaturas guardam `offerId`; nenhuma tem ainda o marcador novo
  `funnel-registry-v1`. A classificação histórica precisa do vínculo canônico com o catálogo.
- O grafo de componentes e bônus lido nos dois ambientes separa Kids e Adultos corretamente.
- Staging guarda o produto arquivado `desafio-do-primeiro-jogo`, ausente da lista inicial.
  A descrição integral é idêntica à do produto Kids `desafio-primeiro-jogo`, dirigida
  expressamente à criança e à família; sua oferta também está arquivada. O `courseRef`
  antigo não resolve mais. A revisão explícita desse registro o classifica como Kids;
  não há classificador por prefixo ou nome. A migração contempla 20 SKUs possíveis.
- O produto arquivado `no-comando-da-ia` permanece Adultos. Não há exclusão de histórico.

## Migrações e ordem de liberação

1. Conferir novamente os produtos/cupons e referências antes de cada ambiente. A migração
   Catalog `0008` expande o schema; `0009` classifica somente SKUs revisados e cupons com
   origem explícita/escopo inequívoco. Produto/cupom desconhecido ou grafo cruzado interrompe
   o lote. Não forçar uma classificação para fazer o deploy passar.
2. Payments `0027` acrescenta a projeção anulável `reporting_audience`, sem alterar snapshots
   de compra, valor, datas, metadata financeira, versão ou estado da regularização.
3. Implantar Catalog e Payments antes do Admin. Referrals e Members também precisam estar na
   nova versão antes de verificar os respectivos painéis. As rotas antigas sem `audience`
   preservam a consulta geral para consumidores existentes; o Admin sempre envia o filtro.
   CI de staging e operador de produção aguardam os ACKs e a retirada das versões antigas de
   Catalog/Payments/Referrals antes dos apps. Falha impede a próxima fase; não repete POSTs.
4. Depois de retirar os writers antigos, repetir a auditoria Catalog de linhas sem comunidade.
   Aplicar eventual classificação revisada antes da etapa de contrato. **O NOT NULL do Catalog
   é uma segunda migração gerada, a publicar somente após esse primeiro rollout**, para não
   quebrar uma réplica anterior que ainda crie registros sem o campo. Ainda não executado.
5. Com Catalog e Payments novos, executar o operador abaixo em cada ambiente, revisar o plano
   e só então aplicar o digest correspondente. Nenhuma operação envia e-mail ou cobra cartão.
6. Validar Admin autenticado: Kids → Adultos → Kids em catálogo/campanhas/vendas; totais, filtro
   de produtos, formulário aberto, ID de outra comunidade e visão sem classificação. Conferir
   que Contas segue geral e que o progresso do Pensa acompanha a lente, sem duplicar cotas.
7. Produção recebe a fonte que passou no CI e na conferência de staging. Nova consulta confirma
   migrações, projeções e revisões em execução; não basta o status de build do Railway.

## Classificação financeira revisada

No serviço Payments, com a conexão do próprio ambiente:

```sh
bun scripts/backfill-business-audience.ts
bun scripts/backfill-business-audience.ts --apply --expected-sha256=<digest-revisado>
```

O modo padrão só lê. A aplicação usa transação serializável, relê o plano e recusa divergência
ou conflito entre catálogo, assinatura e metadata de origem comprovada. Só preenche projeções
nulas. O plano mostra IDs opacos e referências comerciais, sem e-mail/cartão/senha. Guardar o
resultado e digest da execução. Um segundo dry-run deve mostrar zero mudanças aplicáveis.
Registros realmente sem prova permanecem sem classificação, acessíveis na consulta própria.

Novos checkouts recebem audiência do registro canônico de funis. Renovações de assinaturas
históricas herdam sua projeção revisada; evidência divergente mantém a cobrança sem classificação
no relatório, sem interromper ou autorizar operações financeiras. Saves normais dos agregados
preservam a projeção conferida e nunca convertem isso em permissão de acesso/regularização.

Rollback de aplicação mantém colunas/projeções; não apagar histórico para voltar a versão.
Antes do contrato NOT NULL, retirar todos os writers antigos. Depois dele, rollback só para
versão que também escreva audiência explícita.

## Evidência local antes da conciliação

- Catalog: 158 testes passaram, 3 testes do adaptador de seed sem banco dedicado foram pulados.
  Inclui PostgreSQL real: paginação, rollback por produto desconhecido e backfill idempotente.
- Referrals: 147 testes/651 asserções passaram, incluindo banco real e fluxos públicos de
  embaixadores Kids/adulto. A identidade compartilhada conserva o código público existente.
- Payments: 421 testes de aplicação/HTTP/domínio passaram. 3 testes específicos de PostgreSQL,
  71 asserções, passaram: recebido/estornado/MRR/cancelamento por público, detalhe por ID,
  aplicação histórica revisada, renovação e conflitos sem alterar autoridade financeira.
- Admin: execução completa inicial teve 919 positivos e 2 negativos de texto. A descrição
  específica do curso foi preservada em cada público, corrigindo os dois negativos; seleção
  afetada posterior passou (13 testes). Nova verificação integrada ainda necessária.
- Teste DOM real de catálogo/financeiro usa o PlatformProvider real, prova resposta atrasada,
  fechamento de diálogo e mudança explícita para histórico sem comunidade. Não substitui
  a inspeção visual do Admin implantado.
- Pensa: teste de persistência comprova que projeto Kids não entra no funil adulto, preservando
  as transições já testadas. Nenhuma alteração nas cotas.
- CI ganhou bancos descartáveis dedicados para as provas Catalog/Payments; não usa banco real.

## Verificação da composição integrada

Conciliação com staging `8f34d7bdd` em `1421cac20`, incluindo Jornada/Maestrias e Cadê:

- Tipagem completa do Admin e Members passou.
- Suíte completa do Admin, no diretório canônico do pacote: 935 testes, 3.920 asserções,
  zero falhas. Dois fixtures de formulário agora devolvem a política da jornada na nova
  consulta, mantendo as asserções de modalidade e concessão de blocos.
- Operadores de implantação: 65 testes, 186 asserções. Incluem execução do trecho Bash real
  de staging com sucesso, falha de retirada e falha de POST. Nenhum desses testes acessa Railway.
- A primeira chamada da suíte Admin pela raiz teve sete negativos: quatro fixtures filhas
  usam cwd do pacote e três cenários tinham resposta de política desatualizada. O log original
  foi preservado; a execução canônica após corrigir os fixtures é a evidência de aprovação.

Pendentes neste registro: CI remoto, aplicação nos ambientes,
backfill financeiro, contrato final e conferência visual autenticada.
