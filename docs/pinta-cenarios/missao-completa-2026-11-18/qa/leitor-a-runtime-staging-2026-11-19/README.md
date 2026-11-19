# Leitor A: runtime implantado em staging

**Continuação vigente:** o runtime foi atualizado para o perfil `f11aa057`;
ver [identidades e recibos atuais](continuidade-f11/README.md). As identidades
abaixo documentam a primeira implantação, preservada como histórico.

Em 19/11/2026, Worker e os dois aplicativos de contêiner de **staging** receberam
a fonte/imagem qualificadas no CI `44592954163`. A origem é
`https://sistemazero-studio-runtime-staging.helena-bcc.workers.dev`.
Nenhuma operação de implantação foi dirigida à produção.

| Artefato | Identidade conferida |
| --- | --- |
| Versão do Worker | `7232eba7-0e8e-4006-8a30-a0d3a900aaa7`, 100% |
| SHA-256 do módulo publicado | `b168ada8bc86b095adaca6bf8ef1671b75f1ca3dc7ed959e96970a2a4de47406` |
| Perfil da imagem e do Worker | `8151d121eb0ef36103c2aa16717a30ba1d4f316da6f2e7369a6e70f529596d2c` |
| Manifesto da imagem | `sha256:1411706838fd121e2897ac12c30f9438fbb3d0e9d517539ff84ee60ce387cf0e` |

A [leitura independente](leitura-independente.json) obteve o módulo publicado pela
API da Cloudflare, confirmou o perfil e o leitor `pinta-scene-physics-v1`.
`/healthz` respondeu 200. A configuração do aplicativo Pro e do
[aplicativo 3D](container-3d.json) aponta para o digest qualificado.
O comando de listagem mostrou temporariamente o digest anterior; a verificação
usou o detalhe de cada aplicativo, que confirmou a nova configuração.

Uma [execução real de objetivo](execucao-container.json), autorizada pelo mesmo
token do serviço de staging mantido somente em memória, iniciou o contêiner,
abriu o programa JavaScript próprio no Chromium do sandbox e confirmou
`dobro(2) === 4`. Não é um teste de publicação de mapa nem de motor 3D.
Na primeira fixture faltava expor a função no contrato de inspeção; o serviço
respondeu corretamente “Não achei a função”. Essa tentativa não foi contada
como objetivo aprovado. A fixture final usa o contrato real e exige `passed`.

## Correção da implantação parcial

A primeira tentativa publicou o Worker, mas a aplicação do contêiner foi
recusada: ao achatar `env.staging`, a configuração perdeu o sufixo de ambiente
dos nomes gerados pelo Wrangler. O código do Wrangler fixado confirmou a causa.
Foram usados os nomes exatos dos dois aplicativos já existentes; nenhuma
duplicata foi criada. [Diagnóstico](primeira-tentativa.json),
[recibo final](implantacao.json). O mesmo SHA de bundle foi confirmado.

## O que continua pendente

- O aplicativo leitor A e a preservação offline entre abas ainda dependem do
  deploy do CI dos hosts. A aba antiga autenticada permanece aberta.
- O seletor Python antigo `f69814b9…` e a política Members `022e5b54…` foram
  preservados. A distribuição `132db1bd…` não foi ativada por esta implantação.
- O gravador de nuvem continua em 4. Habilitar a escrita 6 exige primeiro
  verificar todos os leitores publicados e executar os critérios da etapa 0b.
- O [rollback está preparado](rollback-preparado.json), mas não foi executado.
  O ensaio de rollback da versão gravadora para A continua obrigatório.

Não declarar rollout completo, ciclo autenticado, publicação Pinta ou desempenho
de hardware a partir desses testes do runtime.

## Política pronta para implantação coordenada

O plano de promoção foi recalculado após o merge e gerou exatamente o mesmo
SHA `cb956145…`, distribuição `132db1bd…` e manifesto `eec668d0…`. A consulta
fresca aos seletores confirmou as mesmas bases anteriores. A mudança do perfil
da imagem não alterou os catálogos Python: são contratos distintos.

A política Members foi validada e empacotada sob
`b67d2e697aa20774e092773d5632bc5278b57597c1c6778c0c73b0f0cb2f7164`,
135.208 bytes. A formatação ocorre antes de calcular o digest; o artefato
canônico intermediário, ainda não commitado, foi substituído por essa embalagem
formatada com conteúdo JSON idêntico. O catálogo imutável remoto não foi alterado.
[Preparação sem ativação](politica-preparada.json), [nove testes/54 asserções](politica-testes.txt).
O arquivo estará disponível no código para o próximo deploy, mas nenhum seletor
Members ou Python foi modificado por essa preparação.
