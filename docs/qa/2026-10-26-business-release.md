# Verificação da liberação comercial de 26/10/2026

## Fonte e CI

- Fonte revisada: `b2cf04e94ded79463752099123c390c6dcf1f444`.
- CI staging `40322484576` e CI do PR `40322490465`: concluídos com sucesso.
- PR 214 promovido para `6000391444d24d38e4b88236ecd9f62a77c428fe`, árvore idêntica.
- Plano de configuração de produção `40322490350`: sem alterações de configuração.
- Arquivos sem commit de outras sessões não compõem essa fonte.

## Staging

- Os 17 serviços afetados estão na fonte revisada, com versões anteriores retiradas.
  O gravador, sem alteração de fonte nesta entrega, manteve seu deployment existente.
- Admin autenticado: produtos Kids 10/Adultos 9; contas compartilhadas; produtos e
  transações de outro público retornam 404; troca de comunidade limpa formulário não salvo.
- Histórico financeiro: duas projeções classificadas como Kids por plano revisado;
  segunda leitura sem mudanças, conflitos ou registros sem origem. Nenhum valor, estado,
  vencimento ou histórico de cobrança foi alterado.
- Campanha adulta assume o público correto; Pensa mostra dois projetos Kids e nenhum adulto.
  Oficinas exibem o curso QA em Kids e nenhum curso em Adultos. Diálogos foram cancelados;
  nenhuma matrícula, curso, produto ou campanha foi criado nessa conferência.

## Executor hospedado nos dois ambientes

Imagem: `sha256:23d8003f2124f242d419aaf2e26bc742c763876fa05f50dfb7472979bb6fc3ac`.
Worker staging `e518cc4c-1e72-41c1-b4ac-d24aaa12fb8a`, container versão 20.
Worker produção `a3cc4450-3bc6-4be1-acac-f3e1396af1e1`, container versão 5.
Catálogos Python ativos preservados; nenhuma release reativada ou retirada.

JavaScript: build e validação reais com resultado positivo nos dois ambientes. Python:
oito casos em cada ambiente, todos com o resultado esperado e zero falhas de cleanup.
Incluem movimento Raylib 2D/3D positivo, contrário e parado, clique e função em outro arquivo.
Os negativos de comportamento foram reprovados pelo juiz; não foram contados como falhas
de infraestrutura. Entradas temporárias tiveram remoção confirmada.

O primeiro probe JavaScript de staging ocorreu durante a troca da imagem e falhou; recibo
negativo foi preservado. A execução positiva seguinte só começou após confirmar a imagem
nova e os containers saudáveis. Produção foi testada depois dessa mesma confirmação.

São provas de operador autorizado usando cliente canônico, Worker/DO e executor real.
Não equivalem a uma nova homologação integral de todos os jogos ou do percurso de aluno.

## Produção: confirmação posterior ao limite de acompanhamento

A onda `40337356091` terminou com falha de acompanhamento (`hub-deployment-poll`,
`retirement-timeout`), após períodos de rate limit da API Railway. Não houve nova tentativa
de build: a implantação reconhecida do Hub concluiu depois do prazo. Leitura posterior
conferiu os 17 serviços em `600039144`, todos SUCCESS, e os anteriores REMOVED. Isso confirma
a convergência no provedor; não transforma o resultado negativo do workflow em CI verde.

O plano de configuração remoto estava sem alterações. A auditoria readonly confirmou as
migrations de Catalog, Payments e Members. Em staging há uma entrada histórica adicional
no journal Members; todos os 141 timestamps do journal atual constam nos dois ambientes.

Classificação financeira aplicada em produção: 15 pagamentos e duas assinaturas, sem
conflitos ou registros sem origem. A conferência seguinte retornou zero alterações.
Não houve mudança de cobrança, valor ou estado financeiro. Catálogo: 9 produtos Kids e
10 adultos. Admin autenticado confirmou esses totais, 16 contas compartilhadas, transações
Kids/adultos separadas e 404 ao consultar produto com o público errado.

## Jornada do Criador: ativação explícita

O bootstrap publicado na versão 1 era a política anterior, sem `curriculum`. Sua presença
não comprovava ativação da proposta de 25/10. Em 26/10 a usuária esclareceu que a nova proposta
deve substituir as regras anteriores nos dois públicos. A operação e os resultados estão em
[ativação da Jornada](2026-10-26-creator-journey-activation.md). Não confundir o seed antigo
adulto de sete etapas planejadas com o novo currículo completo.

O contrato NOT NULL do catálogo e a composição adicional de exploração livre/tipografia
continuam sendo uma segunda liberação; não estão incluídos no SHA de produção acima.

O [Clube adulto](2026-10-26-adult-club-seed.md) foi criado nos dois ambientes com canais
e acessos próprios. A [revisão adicional](2026-10-26-integrated-exploration-review.md)
registra as correções e verificações locais da próxima liberação.
