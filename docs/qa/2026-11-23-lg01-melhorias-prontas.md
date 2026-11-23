# LG01 — candidata às melhorias prontas

Execução autorizada em 23/11/2026. A candidata parte de `f8910ee0547cba79a8dc38cc45ffa2a6efb66e5e`, em um checkout próprio na branch `release/lg01-melhorias-prontas-20261123`. Produção consultada nesta execução: Members e Kids em `3d7c532535a5474ce358709d00b78d6a7f23ce1a`.

## Entrega e dependências

| Entrega | O que a criança recebe | Pontas que precisam acompanhar |
| --- | --- | --- |
| Correções da revisão | Recuperação e verificação mais confiáveis | Código e contratos da [revisão](../../.audits/review-7-dias-2026-11-23/relatorio.md) |
| Miniaturas 3D | Escolha visual do modelo na biblioteca e no seletor do bloco | Studio nos dois apps; cache considera todo o conteúdo do arquivo |
| Tela cheia | O mesmo botão amplia o jogo e devolve ao editor | Studio clássico e prévia Python |
| Ajuda na recuperação do Pinta | Pedido de ajuda ligado aos recados do perfil, com confirmação e recuperação preservada em falha | Pinta, core, member-shell, Gateway, Members, Admin e telas dos recados; migration Members `0176` |
| Atualização do Mural | Melhorar o jogo mantendo a publicação e seu link; selo Atualizado | Studio, member-shell, Hub e runtime de versões; migration Hub `0024` |

A candidata conserva a árvore integrada revisada e suas dependências; não é um cherry-pick de quatro componentes isolados. A ajuda depende da recuperação causal e do armazenamento da conta do Pinta. A atualização do jogo depende do serviço de versões. O diff contra main inclui essas integrações e os leitores de compatibilidade: não deve ser apresentado como se contivesse somente os quatro elementos visuais.

Os controles de Molda Cenários, regiões, galeria da equipe e prévia isolada mantêm a configuração de produção. A configuração declarada só acrescenta esses valores ao staging. O catálogo Python de produção mantém o hash de main; o hash novo continua restrito ao staging. Publicação de aulas, liberação das integrações regionais no Studio e estreia do Arquipélago V2 continuam nas respectivas etapas do [plano](../plans/2026-11-23-plano-de-liberacao-gradual.md).

## Aquecimento fora desta candidata

Foram revertidos nesta branch os commits `0a89ef2e3`, `935c58cab` e `95c7cb4ab`. A verificação volta a usar um contêiner por pedido, destruído ao final. Não há aquecimento ao abrir a aula nem reutilização compartilhada pelo perfil. A staging original conserva o trabalho para a qualificação LG02.

Consulta autenticada feita de dentro do Members de staging ao executor real: `POST /v1/check/warm` retornou **404**, em 273 ms, às 18:39:42 UTC de 23/11. [Recibo sem segredos](lg01-20261123/executor-readiness.json). Essa resposta não prova latência nem segurança do recurso: falta implantar runtime/imagem e qualificar primeira execução, repetições, falhas, limpeza, duas abas do mesmo perfil, isolamento, capacidade e suspensão. O aquecimento não está aprovado para produção.

## Verificação desta candidata

Provas executadas no checkout da candidata, com dependências do lockfile e sem usar `node_modules` da staging:

- 45 testes do Studio: cache e apresentação de miniaturas, tela cheia, erros e ciclo de vida de Meus testes, atualização da publicação.
- 157 testes de contratos e fronteiras: runtime, objetivos, configuração do Gateway, recados do Admin e palco.
- 153 testes de serviços e adaptadores: Mural, pedido de ajuda, publicação, autorização e execução. O wrapper de UI deve ser executado na pasta de member-shell; nessa execução separada passou.
- 47 testes da UI do Pinta: galeria, confirmação de ajuda, falha e persistência injetada.
- PostgreSQL real: 2 testes HTTP da ajuda do Pinta e 2 da identidade/atualização do post no Hub, sem banco de produção.
- Build de produção do playground e 3 percursos em Chrome: botão de tela cheia nos dois sentidos, miniatura WebGL do GLB com ossos e espelhos após upload/reabertura, importação dos três formatos do Molda e preservação do vínculo.
- Tipos de 11 pacotes sem erros: Studio (incluindo o novo E2E), core, studio-runtime, Gateway, Members, Hub, member-shell, palco, Kids, Community e Admin.
- Imagem Linux `sistemazero-studio-runtime:lg01` construída; smoke de imagem, objetivos dos kits e templates reais passaram com UID 1000 e sem rede. O perfil da imagem foi conferido antes do build.
- `bun run ci --max-diagnostics=0`: 18.045 arquivos, zero erros; 309 avisos e 297 informações preexistentes. 62 testes das regras de promoção e do workflow de produção passaram.

O teste visual mede o enquadramento pela extensão dos pixels opacos. Uma primeira expectativa de área pintada foi descartada: o GLB de contrato tem peças finas e espelhadas, e a área da silhueta não mede sua escala. O teste final exige imagem carregada, desenho não vazio, extensão superior a 65 dos 96 px e preservação após reabrir. [Captura do navegador](lg01-20261123/miniatura-modelo.png).

Os testes locais não representam uma navegação autenticada no deployment atualizado de produção. A aceitação nesse ambiente, a implantação e os gates remotos continuam pendentes até registro explícito abaixo.

O primeiro CI do PR apontou a formatação do recibo JSON, corrigida, e falhou antes dos testes históricos do Pinta por `shallow.lock`. O log registrou um fetch automático do Playwright para a base do PR que excedeu o prazo do coletor de metadados. O checkout do Chromium passa a incluir profundidade 2: os pais do merge já contêm a base, evitando aquele fetch durante a suíte e preservando os metadados e todas as provas históricas. Não foram removidos locks, testes ou gates.

## Ordem da implantação e aceite

1. Exigir CI do PR e `railway-config-plan` verdes no mesmo SHA. O workflow de produção também exige os nove jobs da tentativa de CI; não usar push direto em main nem deploy avulso para contornar esses gates.
2. Qualificar e implantar a imagem/Worker compatíveis do runtime desta candidata, preservando o catálogo Python de produção. Confirmar a versão de publicações e a verificação corrigida.
3. Aplicar a onda canônica Members/Auth e implantar Hub, Gateway, Admin, Community e Kids no mesmo release. Usar as migrações versionadas completas, não executar apenas `0176`/`0024` manualmente. A rotina de rollout estabelece as barreiras e a ordem dos aplicativos.
4. Com perfil QA infantil elegível, conferir miniaturas, tela cheia, reabertura do projeto e atualização do próprio jogo no Mural. Confirmar que o post e o link se mantêm e que outro perfil não o atualiza.
5. Para ajuda, usar somente perfil e desenhos QA com recuperação retida; conferir conversa, confirmação e comportamento offline. Não gerar pedidos de suporte em nome de crianças reais para testar.
6. Conferir saúde e SHA dos serviços, leitores ativos e flags preservadas. Registrar deployments, horários e resultados. Só então marcar LG01 concluída.

O retorno deve usar a versão compatível anterior por onda, preservando dados já gravados e as barreiras do rollout. Não apagar o valor novo do enum, colunas, desenhos, versões ou posts para tentar desfazer uma implantação. Uma versão anterior de leitor/escritor só pode voltar após comprovar sua compatibilidade com os formatos já emitidos.

## Estado

Candidata e verificações locais concluídas; [PR #283](https://github.com/informach/sistema-zero/pull/283) em rascunho durante a qualificação remota. O plano Railway da primeira tentativa passou. A nova tentativa precisa validar o SHA com as correções de CI. Implantação e aceite no deployment atualizado de produção ainda não realizados por esta execução. LG02 pendente de implantação e qualificação do executor real.
