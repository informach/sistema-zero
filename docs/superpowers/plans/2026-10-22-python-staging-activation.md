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

1. Exigir CI verde do SHA final conciliado a implantar; um resultado de um checkout anterior não substitui esse gate. Conciliar qualquer avanço local/remoto antes da ativação.
2. Construir a imagem atual e qualificar JavaScript sem rede. O perfil `bee4799c5e9ef6bd8f1838273234c6db0a37b61156c3966b30873d64a379efbc` é independente da distribuição browser `476d32…`. Não trocar tags de imagens de outras sessões para executar QA: os smokes aceitam a imagem como primeiro argumento.
3. Executar `build:server` do language service antes da imagem. Qualificar a imagem real, RPC/Pyright, cancelamento e cleanup; não reutilizar o bundle remoto antigo.
4. Registrar a retirada explícita da referência Python antiga do runtime, preservando JavaScript, origens, secrets e todos os objetos R2. Só depois da ausência confirmada usar `baseline.worker: null` no promotor. Não converter o catálogo antigo para o contrato atual.
5. Preparar um novo plano canônico com as configurações públicas realmente preservadas (`previewOrigin`, frame origins e ausência confirmada de Members/hosts). Usar a distribuição atual verificada e a release `python-browser/2026-10-22-visual-games-3`, manifesto `bc5710a137facb82e4f1a24df6e370406217f5fc4707c64861adf381d10d3e80`. O SHA do plano pode diferir do offline `57e25c2c…`.
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

Os commits `7974d9796` e `dd8dc807a` foram conciliados no merge `9c9c913b9`.
Acrescentam a correção de `turtle.dot()` e 17 exemplos, levando a 20 jogos com
variantes Classic/Pro. Os inputs das duas imagens e o fingerprint não mudaram;
a distribuição mudou para `476d32e78da6b528730b8b0535ad026f64fe4e61c03f20a195a7438bc56ace2c`.
O serviço de linguagem foi requalificado com o bootstrap/manifesto `bc5710…`:
os três casos reais `empty`, `provided` e `forged` passaram, com os containers
removidos e ausência confirmada. O recibo atual é
[language-image-476-r1](../../continuity/2026-10-22-python-reference-games-visual-evidence/language-image-476-r1.json.snapshot),
SHA256 `548b037a9ad14168483e9603a8a0f10bfb2eb3fd3145845212414e7f4b4988d1`.
O recibo e318 acima permanece somente histórico.

A qualificação gráfica local atual passou em seis lotes seriais: 24 testes
Turtle em Chrome/Edge e 40 percursos dos 20 jogos no Chrome. Cada jogo foi aberto
pela galeria em Classic e Pro, editado, salvo/reaberto e executado com entrada
causal verificada em pixels; Classic também conferiu a fonte da Ponte. Zero
falhas/skips/retries, limpeza de processos/portas confirmada em cada lote. O
[recibo conjunto](../../continuity/2026-10-22-python-reference-games-visual-evidence/current-476-local-ui-r1.json.snapshot)
contém os hashes dos relatórios. Os 204 testes de modelo nativo dos 20 jogos,
46 testes locais de renderer/galeria/reprodução/metadados, geradores e tipagem
completa do Studio também passaram. Esta evidência não inclui áudio audível,
máquina de 8 GB, autenticação hospedada nem aceite de desempenho remoto.

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

O run `39802574396`, de `fa2ed1219`, avançou pela preparação de mídia e executou
os testes de gravação real com FFmpeg, mas falhou em um cenário de permissões
Adult/Kids. O cenário retirava metadata Adult depois da conclusão do curso e
esperava perder uma conquista já congelada. O fake passou a reproduzir o freeze
transacional que a produção já fazia para cursos gravados. A correção preserva
as negativas 403 de produto/paleta Kids no contexto Adult e acrescenta o positivo
de preservação do ledger após retirada da metadata. Foram 61 testes/211 asserts
verificados novamente pelo root, sem falhas. Não houve alteração de autorização
em produção. O commit `41c552349` foi publicado em staging local/remoto e iniciou
o run `39805510567`; seu resultado não deve ser presumido.

O run `39805510567` aprovou os oito jobs de interface e as suítes gerais, incluindo
Studio, mas parou no gate SQL Python: a fixture de recuperação do Builder ainda
retornava uma policy vazia. O commit `af64a21a4` fornece a release do próprio
fixture de rede, preservando o contrato obrigatório. O root repetiu os três
comandos do gate com um PostgreSQL 18 próprio e banco novo: galeria/migrações
8 testes/41 asserts, autorização 35/157 e o wrapper que exige os dois casos reais
de recuperação aprovados. Não somar esse wrapper aos seus casos internos. O banco
e seu container foram removidos por ID e label conferidos. Staging local/remoto
recebeu `af64a21a4`; CI corrente `39810961768`, ainda sem resultado presumido.

O job geral desse run falhou posteriormente em 15 cenários de importação
OBJ/Blockbench do Molda, antes do gate SQL. A mesma suíte havia passado no run
anterior e não houve alteração produtiva do Molda entre os dois commits. A
reprodução local Windows passou tanto no foco quanto no lote `test:2` inteiro
(1232 testes/121100 asserts); isso não demonstra a causa do erro Linux nem
autoriza chamá-lo de intermitência resolvida. O teste recebe diagnóstico limitado
na fronteira do Worker real, mantendo os mesmos módulos, revisão e exigência de
estado `ready`. Nenhum retry, timeout adicional ou relaxamento de critério foi
introduzido. A implantação continua dependente de CI verde.

As provas SDK adicionais passaram na distribuição atual e têm recibos separados:
[Turtle/preview](../../continuity/2026-10-22-python-reference-games-visual-evidence/current-476-sdk-preview-r1.json.snapshot)
usa entrada roteirizada, SDK/workerd/R2/Docker reais e captura verificada;
[Builder](../../continuity/2026-10-22-python-reference-games-visual-evidence/current-476-sdk-builder-r1.json.snapshot)
usa policy real sobre fatos controlados, PostgreSQL descartável, Pyright,
proposta/validação/preview, renovação, autorização fresca e recuperação SQL.
O segundo usa a receita padrão do produto, sem entrada roteirizada; modelo e
fatos de acesso são fixtures, sem dispatch ao provedor ou gasto de créditos.
As releases de qualificação desses runners não são a release de staging, embora
os 41 arquivos da distribuição tenham exatamente SHA `476d32…`.

O host QA do Builder foi corrigido separadamente: retorna a autorização em vez
de descartá-la, materializa os módulos da release pelo bootstrap canônico e
encerra sessões/arquivos mesmo com Open pendente ou falha de cleanup, preservando
o erro original. Não muda código de produção. O teste SDK completo passou com
esse host; os 12 controles de Open/módulos reexecutados pelo root passaram com
73 asserts. Os containers/sidecars próprios e os dois bancos SQL de prova foram
removidos; os serviços locais preexistentes do usuário ficaram intactos.

## Recursos antigos do serviço de linguagem

O inventário completo da aplicação staging manteve 11 registros históricos
inativos, sem paginação restante e sem containers ativos, atribuídos ou iniciando.
Sete nomes correspondem aos recibos anteriores de sessão. Quatro nomes não tinham
proveniência de owner suficiente para repetir o Close com segurança. Não se
inventou owner nem se interpretou sucesso idempotente de uma sessão desconhecida
como destruição física.

Um operador de manutenção efêmero foi revisado com allowlist desses quatro nomes,
conta/Worker/namespace/aplicação fixados, inventário externo obrigatório e prazo
curto. O preview remoto usa somente um binding externo para o Sandbox já existente;
não contém migração, aplicação de container ou endpoint no produto. Os dez
controles locais passaram. A etapa remota `inspect` comparou os quatro IDs
derivados com os IDs efetivamente lidos do provider, sem chamar `getStub`/`destroy`,
e encerrou o preview. O [recibo de inspeção](../../continuity/2026-10-22-python-reference-games-visual-evidence/staging-orphan-inspect-r1.json.snapshot)
mantém `gateQualified: false`: ainda não houve drain nem cutover.

O [pacote de preparação](../../continuity/2026-10-22-python-reference-games-visual-evidence/staging-orphan-maintenance-prep-r1.json.snapshot)
preserva os nove arquivos de fonte/plano/controles, com bytes e SHA-256 de cada um,
para retomar em outra máquina. Não contém credenciais. Para restaurar, criar um
diretório novo `.cache/python-reference-games/orphan-drain-prep-r1`, conferir o
hash UTF-8 de cada `content` e gravar cada `name` simples sem sobrescrever arquivos.
O `plan.json` exige também os pins do checkout e das dependências instaladas.
O inventário UNBOUND é deliberadamente inválido; usar somente um inventário
fresco da mesma aplicação e Worker, sem reutilizar as janelas expiradas dos recibos.

Após o CI do código publicado e com callers pausados, executar o drain serial dos
quatro alvos, guardar ACKs e fazer nova leitura completa do provider. Registros
históricos inativos podem permanecer; o gate requer zero execução viva/pendente e
todos os alvos contabilizados. Só então aplicar a migração de namespace. Falha,
transporte incerto ou divergência de ID mantém o namespace antigo e interrompe
novos disparos; nenhuma exclusão de aplicação ou fallback de leases é permitida.

## Continuação sobre staging local `8a885d540`

O avanço foi conciliado por fast-forward. O resolver de blocos passou a detectar
escrita em atributos privados oficiais e acesso dinâmico a mecanismos de mutação,
preservando leituras comuns. Os 11 testes de catálogo/Core/Turtle passaram com
1017 asserts; `check:python-visual-examples` conferiu os arquivos dos 20 jogos e
seus metadados sem alteração. O fingerprint da imagem passou novamente no
verificador. Essas verificações não são uma nova execução dos 64 percursos UI.

Os operadores atuais de qualificação hospedada ficam versionados, substituindo
a dependência operacional dos scripts privados de 19/10:

- [Language API](../../../packages/studio-language-service/scripts/qualify-remote.md):
  bootstrap/release pinados, admissão, Pyright, contexto, quota, cancelamento
  classificado pelo resultado do alvo e Close aguardado. Os dez testes inertes
  passaram com 58 asserts; não são prova de Pyright hospedado. O recibo mantém
  explicitamente separados UI, autorização contextual, versão implantada e
  limpeza física externa.
- [Delivery público](../../../packages/studio-runtime/scripts/qualify-python-delivery.md):
  plano canônico da implantação, Node HTTP sem descompressão implícita, bytes
  identity/gzip, MIME, ETag, HEAD/304 e CSP com as origens finais preservadas.
  Um wrapper passou nos sete controles em Node 24.22, incluindo corrupção,
  MIME incorreto, excesso de bytes e cancelamento de conexão aberta. Não somar
  o wrapper aos seus controles como oito testes independentes. Não qualifica
  o fluxo de publicação/Mural/remix.

Ambos passaram na tipagem focada em seus ambientes corretos (Node e Worker
separados). Nenhum dos dois executou chamadas remotas neste checkpoint. Seus
destinos e pins são explícitos, não recebem tokens em argumentos e não ativam
catálogos. A execução deve usar os novos planos obtidos depois da conciliação
real da infraestrutura.

A execução `39815270042` aprovou a suíte que falhara no Molda, mas o job Kids
`119952377716` esgotou seus 20 minutos na instalação APT do Playwright, antes de
qualquer teste: o log ficou no mirror Azure entre 16:37 e 16:56 UTC. Não é
falha de teste do aplicativo. A correção anterior do mirror estava somente no
job geral; o preparo precisa ocorrer também nos demais jobs Ubuntu antes de
APT, preservando fontes assinadas, keyrings e pacotes. O resultado geral dessa
execução ainda não substitui CI verde do próximo código a implantar.

O preparo APT agora usa um único helper nos quatro jobs Ubuntu, antes de
instalações: troca somente a URI Azure exata pelo arquivo HTTPS oficial,
mantendo prioridades, mirror+file, keyrings, suites, componentes e fontes de
terceiros. A transformação é idempotente. Foram sete testes/29 asserts
reexecutados pelo root e os 167 testes/570 asserts do diretório CI executados
pela revisão independente, sem falhas. Nenhum timeout, teste de navegador,
AppArmor ou orçamento do produto foi relaxado. O efeito na instalação real
depende do próximo run; não é um contorno para ignorar o job Kids.
