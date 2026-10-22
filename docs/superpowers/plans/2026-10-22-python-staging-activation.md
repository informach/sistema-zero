# Ativação Python em staging

Autorização: implantação completa solicitada pelo usuário; chaves Railway já
concluídas em outra sessão. Não rotacionar credenciais. Produção só recebe a
liberação depois do aceite em staging. Esta sequência não presume que o catálogo
offline de baseline vazio representa o estado remoto.

## Estado conferido antes de qualquer alteração remota

- Conta Cloudflare `bcc0f2d44140e05b69152cba326132f8` e projeto Railway `415d5a1c-5f75-432c-8445-b395d0977ce3`; ambiente staging `f634cff6-aafb-4804-8b69-172fad4e946e`.
- Runtime staging versão `97cbc9af-1659-4db7-bfa0-9e841a757510`, catálogo R2 `40ce822aab07184da90bec7a0902296d4889c011740063be6c859bc5b60c57b2`, release Python QA antiga `2026-10-19-1`. Origens: Admin, Community e Kids de staging, iguais às da candidata.
- Members sem `STUDIO_AUTHORING_POLICY_JSON`/`STUDIO_RUNTIME_HOSTS_JSON`. Community/Kids possuem os pares runtime e language e frame origin do runtime; Admin possui language/frame origin. Nenhum token é registrado neste plano.
- Language staging versão `2606bc1c-fc5d-4702-9ea8-6995955ff06e`, namespace Owner `bf106446ef9e495997e39a02f008a526`, Sandbox `fb9d81d3e52b489faf23ed8c74cea71a`, aplicação `a03225c7-85d7-4bd6-9919-a63ba03178af`.
- Primeira inspeção da aplicação: 11 registros históricos `inactive`; paginação esgotada; `active`, `assigned`, `scheduling` e `starting` iguais a zero. Repetir imediatamente antes do corte; isto não substitui o inventário de sessões conhecidas e seus recibos de Close.
- Lifecycle staging tem multipart abort e `previews/` em dois dias. Faltam as duas regras Python de um dia. Não aplicar expiração aos runtimes nem às publicações.

## Sequência

1. Exigir CI verde do código a implantar. Lote de oficinas e reparo do teste Zappy publicados em `862308ac2`; acompanhar run `39795005373`. Conciliar qualquer avanço remoto antes da ativação.
2. Construir a imagem atual e qualificar JavaScript sem rede. O perfil `bee4799c5e9ef6bd8f1838273234c6db0a37b61156c3966b30873d64a379efbc` é independente da distribuição browser `e3188c84…`. Não trocar tags de imagens de outras sessões para executar QA: os smokes aceitam a imagem como primeiro argumento.
3. Executar `build:server` do language service antes da imagem. Qualificar a imagem real, RPC/Pyright, cancelamento e cleanup; não reutilizar o bundle remoto antigo.
4. Registrar a retirada explícita da referência Python antiga do runtime, preservando JavaScript, origens, secrets e todos os objetos R2. Só depois da ausência confirmada usar `baseline.worker: null` no promotor. Não converter o catálogo antigo para o contrato atual.
5. Preparar um novo plano canônico com as configurações públicas realmente preservadas (`previewOrigin`, frame origins e ausência confirmada de Members/hosts). Usar a distribuição atual verificada e a release `python-browser/2026-10-22-visual-games-2`. O SHA do plano pode diferir do offline `c68ac702…`.
6. Upload pelo promotor canônico e readback dos objetos/marker/catálogo. Upload não é ativação. Uma falha não autoriza converter checksums, usar S3 como se fosse R2 nativo ou trocar a distribuição por bytes não qualificados.
7. Conferir callers pausados, fechar sessões antigas conhecidas e comprovar zero containers vivos/pendentes da aplicação exata. Aplicar a migração create `PythonLanguageSessions`/delete `PythonLanguageOwner` conforme `packages/studio-language-service/DEPLOYMENT.md`; nunca renomear nem transferir o namespace antigo.
8. Implantar runtime/imagens atuais, SHA novo do catálogo, origem de preview e regras de lifecycle prefixadas. Registrar versões, namespaces e digest das imagens reais; preservar JavaScript.
9. Conferir URLs/tokens existentes, CSP e builds dos aplicativos. Members recebe catálogo/hosts por último. Configuração de catálogo não concede produto, IA, Pro ou blocos conquistados; criação Python continua visível só ao admin.
10. Provas autenticadas em staging: Admin→aluno/aula/sala, clássico/Ponte/fonte, Pro/Pyright/REPL/Zappy/Construir, Pinta, publicação/página pública/remix, revogação e cleanup. Só afirmar homologação dos cenários efetivamente executados.
11. Registrar recibos públicos sem fontes/segredos, versões/configurações e pendências. Não herdar aceite de desempenho/áudio da candidata anterior `65c9…` nem promover para produção antes da validação completa.

## Evidência local já obtida

Imagem runtime `sz-studio-runtime-qa:bee4799c5e9e-staging-r1`, manifest Docker
`7bcc39cd5182804602636fdc4481829d94cf3d738cf758f8c251364e2ce06048`, config
`08c323d253d7b375dd143652b58114f5efad8eec5f165295f512c175428de166`.
`check:validation-profile`, build e smoke sem rede passaram. Os seis kits
`canvas-puzzle`, `canvas-survival`, `three-exploration`, `canvas-grid-arena`,
`phaser-tactics` e `three-tactics` passaram com boot/pausa/entrada/objetivo/reinício
e captura PNG real, executando como UID 1000.

Nenhuma configuração remota foi alterada por este checkpoint de preparação.

Os uploads das duas imagens ao registro gerenciado foram concluídos, sem trocar
as aplicações ativas. Referências imutáveis:

- `registry.cloudflare.com/bcc0f2d44140e05b69152cba326132f8/sz-studio-runtime-qa@sha256:7bcc39cd5182804602636fdc4481829d94cf3d738cf758f8c251364e2ce06048`
- `registry.cloudflare.com/bcc0f2d44140e05b69152cba326132f8/sz-python-language-qa@sha256:b64cb8e24ac10eaeb2e0d298e9e3e7ec809b1aeea7778c145941e65cf0578320`

Os dois bundles operacionais passaram em `wrangler deploy --dry-run`, com os nomes
exatos das aplicações staging existentes e essas imagens. A configuração de
retirada não contém a referência antiga de catálogo; a de linguagem preserva o
Sandbox e descreve somente a troca de Owner por Sessions já prevista. Dry-run não
aplicou migração nem alterou variável/namespace remoto. Os arquivos operacionais
locais são derivados da configuração versionada; caminhos devem ser relativos
ao arquivo para o Wrangler no Windows.

Imagem language construída depois de `build:server`: índice OCI
`ba7fa9ef40bdad0996f6db0cf9c6f7e8bded823389a30ba08571aa8ac2c3300a`, plataforma
amd64 `b64cb8e24ac10eaeb2e0d298e9e3e7ec809b1aeea7778c145941e65cf0578320`, bundle
`05aa76d4a5a1dd916677d8b661d34c1dc9a1198180f9b63bb0c5fab459e94fb0`.
O runner existente `scripts/verify-container.ts` passou nos três casos reais
`empty`, `provided` e `forged`, com rede desativada, rootfs somente leitura,
UID 1000, Pyright 1.1.414, módulo de áudio exato, cancelamento, saída física do
servidor e remoção confirmada dos três containers. O manifesto externo da release
foi conferido antes do primeiro comando Docker. Recibo público:
[language-image-e318-r1](../../continuity/2026-10-22-python-reference-games-visual-evidence/language-image-e318-r1.json.snapshot),
SHA256 `1341386898b50b1c682ca8ac0ab521023c06ea111a32c91722140fbb90972c06`.

## Conciliação da autoria concorrente

Os commits locais `8a09da4bf` e `cbbf15ac3` acrescentam herança/lambda visuais e
Cobrinha, sem mudar os inputs da distribuição e318 nem da imagem bee4799c.
Foram conciliados pelo merge `8075bfd4b`. A nova lista de codecs muda a curadoria
Members: o plano antigo não pode ser reutilizado nesse checkout. O plano de
implantação precisa ser regenerado com os codecs atuais, incluindo `sz_py_lambda`.
Verificação independente inicial: 55 testes/1292 asserts da autoria/galeria,
5 testes/93 asserts dos geradores e 9 testes nativos do modelo Cobrinha.
Essas provas não substituem os percursos gráficos hospedados.

## CI e preparação de mídia

O run `39795005373` de `862308ac2` teve oito jobs de interface aprovados, mas o job
geral excedeu 45 minutos. O log comprova que a instalação de FFmpeg baixava
99 pacotes/94,1 MB pelo mirror Azure. Às 15:01:33 UTC ainda iniciava o modelo de
voz opcional `pocketsphinx-en-us` de 27,4 MB; cancelou às 15:07:06, sem chegar ao
restante dos testes. Não é evidência de regressão Python nem CI verde.

A correção de preparação mantém os pacotes oficiais assinados, usa o arquivo
Ubuntu HTTPS no lugar do mirror Azure HTTP e instala FFmpeg sem recomendações
de modelos de voz/GPU não utilizadas. Os testes de mídia, navegador, AppArmor e
o limite de 45 minutos continuam iguais. Os 97 testes de contrato do pipeline
passaram, com 234 asserts; YAML foi analisado. O ganho e o pipeline completo
somente poderão ser afirmados após a nova execução remota.
