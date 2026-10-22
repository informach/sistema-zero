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

## Verificação seguinte: CI e desempenho local

O run `39819804782`, no commit `180864740`, aprovou os oito jobs de interface,
incluindo Kids. O job geral falhou antes da execução Node do novo qualificador
de delivery: `Bun.build` dentro do processo de testes recebeu `EISDIR` ao ler
módulos reais do Core. A causa específica dessa leitura não foi reproduzida no
recorte local; contaminação por mocks permanece hipótese. O teste agora usa o
mesmo caminho operacional documentado: Bun CLI em processo próprio, seguido de
Node nativo, com um prazo compartilhado de 30 segundos, saída única e limpeza
confirmada. Os controles de bytes, gzip, MIME e conexão continuam presentes.
O root reexecutou delivery e distribuições: 11 testes/84 asserts, Biome e
tipagem focada verdes. Isso ainda requer confirmação no próximo CI completo.

O [recibo F3 Chrome](../../continuity/2026-10-22-python-reference-games-visual-evidence/current-476-local-f3-chrome-r1.json.snapshot)
registra dez minutos contínuos da distribuição `476d32e7`, com 20 tartarugas,
timers, imagens e 30 entradas causais de teclado/mouse. Intervalo de apresentação
p95: 33,4 ms; trabalho de pintura p95: 0,2 ms; entrada até apresentação p95:
62 ms; zero long paints/tasks. A execução passou sem retry e confirmou o
encerramento dos processos e portas próprios. O recibo inclui os dados causais,
hashes e o supervisor utilizado. É prova local neste computador de 16 GB;
não substitui Edge, F1, sala hospedada, audibilidade nem a prova posterior no
computador de 8 GB.

O run `39823914161`, de `44d562192`, aprovou novamente os oito jobs de interface.
A compilação CLI do qualificador passou; a única falha da suíte geral foi a
asserção de zero sockets logo depois do callback `server.close`. Um probe nativo
Node 24.22 reproduziu a ordem real `server-close → socket-close`: a asserção
antiga observava um socket antes do seu ACK, embora ele fechasse em seguida.
A fixture agora registra uma Promise no evento `connection` para cada fechamento
e aguarda tanto o servidor quanto todos os sockets. Não força destruição, não
usa espera fixa e mantém os mesmos prazos. O root reexecutou os 11 testes com
86 asserts, Biome, sintaxe e tipagem focada sem falhas. Os sete controles de
delivery continuam presentes; o próximo CI precisa confirmar o resultado.

O [recibo F1 Chrome](../../continuity/2026-10-22-python-reference-games-visual-evidence/current-476-local-f1-chrome-r1.json.snapshot)
preserva uma reprovação real de desempenho: os 60 casos funcionais passaram,
mas o Pro após edição teve p95 de 1629,8 ms, acima da meta de 1500 ms.
Classic: frio/cache/editado em 8248,7/1246,8/1264,0 ms; Pro:
8499,0/1547,0/1629,8 ms. Matriz completa conferida: 30 amostras por fase e
tipo, Chrome, distribuição/release atuais e respostas a 20 Mbps + 80 ms.
Não houve retry, evidência inválida nem processo/porta própria retida. O tempo
medido parte do editor/parser/console preparados e não inclui vídeo nem aceite
no computador de referência. A causa da ultrapassagem permanece em investigação;
este recibo não é aprovação de F1 nem autoriza relaxar sua meta.

## Implantação efetiva da candidata atual

Em 22/10, os nove jobs de verificação do commit
`001ce078891cef0e03d5f9d3926653668e2b6c5f` passaram no run `39827084913`.
A etapa Railway dessa primeira tentativa expirou aguardando o Members ainda
`DEPLOYING`; não houve liberação dos aplicativos por essa barreira. Às 19:03 UTC,
uma consulta independente confirmou o deployment `1e2d1e6a-f77b-4aa9-9bbd-f7fb989caa9e`
em `SUCCESS`, com `http.listening`, e o anterior `REMOVED`. Nenhum cancelamento
foi enviado. A retomada explícita usa `gh run rerun 39827084913 --failed`, no
mesmo commit, preservando os nove resultados verdes e todo o range original.
A saúde desse Members, por si só, não comprova a conclusão das migrations,
publicação da jornada, Auth e aplicativos pela onda canônica.

A tentativa 2 também expirou às 19:16:58 UTC em `members-deployment-poll`.
Seu deployment `85626718-7e61-442b-bb33-f48cfd8561f7` continuava `BUILDING`
na leitura de 19:18 UTC; o anterior `1e2d…` permanecia `SUCCESS`.
Isso é falha da etapa de implantação, não dos nove checks aprovados. Nenhuma
terceira tentativa automática foi disparada nem o build pendente foi cancelado.
O timeout chamado `retirement-timeout` é genérico: nesta tentativa a implantação
nem chegara à fase de retirada. Conferir seu estado antes de retomar a onda;
não publicar aplicativos pulando a barreira nem declarar o run inteiro verde.

O Cloudflare staging recebeu as imagens atuais e a distribuição `476d32…`:

| Componente | Identidade efetivamente lida |
|---|---|
| Runtime Worker | `3db34366-b1e2-4528-8d3b-f3875e34341f` |
| Catálogo Runtime R2 | `3c69eea36bfb14db88679a7e32bc7b61c69e05095d2794f1aabf4ab54985b230` |
| Language Worker | `991d09f7-3474-48c6-880c-e4ffe6baa04a` |
| Migração Language | `language-sessions-initial` |
| Novo namespace Sessions | `e6c5eb8011df471b985f34aac7002edf` |
| Sandbox preservado | `fb9d81d3e52b489faf23ed8c74cea71a` |
| Plano canônico real | `43f7c218d08b00d4a91dd360ffaf53970316d9d3048dd307e59289fc72fd6725` |

Antes da migração, sete sessões QA conhecidas receberam `closed:true` e quatro
órfãos identificados receberam ACK de destroy. A leitura seguinte ainda mostrou
quatro vínculos físicos; essa negativa foi preservada e impediu o corte. Sem
outro destroy, uma nova consulta mostrou zero instâncias físicas e zero
`active/assigned/scheduling/starting`, com os onze nomes históricos contabilizados.
Só então o namespace antigo foi excluído. A primeira invocação usou por engano o
Wrangler 4.98.0 da raiz; a configuração foi reaplicada com o binário explícito
4.120.1, e a versão acima foi conferida externamente. Os recibos distinguem as
duas versões, sem atribuir retroativamente a primeira ao binário pinado.

A referência antiga de catálogo Runtime foi retirada e sua ausência conferida
antes de regenerar o plano. As origens existentes de preview e frames foram
preservadas; Members, Admin, Community e Kids continuavam sem catálogo/hosts.
O promotor canônico realizou o upload imutável nativo R2. Uma leitura independente
conferiu corpo, tamanho e checksum nativo SHA256 dos 43 objetos: 41 arquivos,
`complete.json` e catálogo. O proxy foi encerrado. Só depois o catálogo novo foi
ativado no Runtime. As duas regras temporárias de um dia foram adicionadas aos
prefixos `python-inputs/` e `python-input-states/`, preservando multipart/previews
e os arquivos permanentes.

A primeira tentativa de conexão do promotor em Bun foi interrompida após 200 s
sem readiness; os processos locais próprios foram encerrados, e seu resultado
de upload não foi presumido. A execução seguinte usou o mesmo operador canônico,
compilado com Bun e executado em Node 24.22, com Wrangler externo 4.120.1. Ela
terminou zero, embora o SDK tenha registrado três referências de erro interno.
O readback independente completo passou. Isso não demonstra uma causa específica
em Bun, Node ou no provedor, nem permite apagar a tentativa negativa.

As provas hospedadas efetivamente executadas são:

- API Language: Open/Start/Sync, consultas Pyright reais, assinatura `sz_audio`,
  erro de argumento e sua correção, rejeição de release/contexto/revisão, quota,
  cancelamento da consulta alvo e Close/retirada das duas sessões. Passou em
  15,3 s. Uma leitura posterior da aplicação exata confirmou zero containers
  vivos/pendentes. Não prova cancelamento durante startup ou autorização BFF.
- Delivery público: metadata, arquivos públicos, doze representações gzip em
  bytes brutos, tamanho/SHA/MIME/ETag, HEAD/304, HTML sem cache, CSP com origens
  exatas e artefatos internos indisponíveis. Passou. Não executa jogos nem prova
  Mural/remix/autenticação.

Os helpers, configurações e recibos públicos ficam no
[pacote operacional](../../continuity/2026-10-22-python-reference-games-visual-evidence/staging-cloudflare-476-001-r1.json.snapshot).
Os pins desse pacote são históricos: não reexecutar drain, reutilizar inventário
vencido nem aplicar sua configuração sem nova leitura do destino.

Ainda faltam a conclusão da onda Railway, ativação Members por último e os
percursos autenticados com admin/aluno. O usuário confirmou possuir ambas as
contas, mas nenhum navegador conectado estava disponível para esta sessão.
Isso não autoriza obter cookies por fora do login normal. Naquela etapa o seletor
estava restrito a admin/superadmin; essa decisão foi superada pela regra de
conquistas descrita abaixo. Produção não foi alterada.
F1 Pro permanece reprovado em 1629,8 ms para a meta de 1500 ms. Nenhuma destas
provas é aceite integral do produto.

O [F3 Edge local](../../continuity/2026-10-22-python-reference-games-visual-evidence/current-476-local-f3-edge-r1.json.snapshot)
também passou nos dez minutos contínuos, com 20 tartarugas e 30 entradas
causais: intervalo p95 de 33,4 ms, pintura p95 de 0,2 ms e entrada até
apresentação p95 de 59,3 ms, sem long paints/tasks. O encerramento dos processos
e portas próprios foi confirmado. Junto ao F3 Chrome anterior, isso cobre os
dois navegadores nesta máquina, sem vídeo, audibilidade, autenticação hospedada
ou teste no computador de 8 GB. Não substitui nem corrige a reprovação F1 Pro.

## Retomada e decisões posteriores de 22/10

O build duplicado Members `85626718…` foi cancelado às 19:28 UTC depois da
conferência de contexto, estado BUILDING sem instâncias e da imagem saudável
`1e2d1e6a…`. O cancelamento recebeu ACK e o estado REMOVED foi conferido.
A imagem saudável foi adotada pelo controller canônico, sem novo build;
migrate e initialize passaram. Auth recebeu o ACK real
`3981bb66-92d3-4f54-9be6-847dc3f47cb3` às 19:47 UTC. Uma consulta posterior
expirou em `auth-deployment-poll`; o recibo ficou FAILED e foi preservado.
Isso não cancela nem prova falha do deployment: às 20:22 UTC ele estava
DEPLOYING, com uma instância nova INITIALIZING. Não houve segundo POST Auth.
Nenhum recibo publicado foi fabricado a partir dessa observação.

Às 20:43:39 UTC, nova leitura confirmou Auth SUCCESS, instância nova RUNNING e
digest `sha256:3e3c9daaf027707e5699a2cde6d7b2e76ad45879df7a991cade161b733290164`.
A retomada R2 adotou esse Auth e o Members anterior pelos IDs/SHA/digests exatos;
conferiu predecessores REMOVED, ausência de deployments pendentes, admissão SSH
e bootstrap canônico. Às 20:45:46 UTC retornou `BACKEND_BARRIER_PASSED`,
`published`, versão 1. Não houve POST de deployment na R2. O recibo R1 FAILED
continua preservado. Esta barreira não equivale à implantação dos aplicativos
nem à qualificação de contratos Core posteriores. Ver
[evidência R2](../../continuity/2026-10-22-python-reference-games-visual-evidence/staging-backend-001-adoption-r2.json.snapshot).

A prova HTTP do Runtime passou às 19:51 UTC, em 131,42 s: três casos,
28 verificações, compilação sem executar os raises/imports da fixture,
rejeição de sintaxe inválida e Turtle com stdin, Space e clique. A captura
320×240/2961 bytes/frameSequence8 passou pelos verificadores Core. Inputs
retirados responderam 410 e o preview retirado respondeu 404. A leitura externa
das 19:52 UTC confirmou zero containers físicos e zero active/assigned/
scheduling/starting no app Runtime exato; nomes DO históricos não são
containers vivos. Fonte qualificada `9ac283…` e delta posterior de duas
conversões de tipos estão separados no
[recibo operacional](../../continuity/2026-10-22-python-reference-games-visual-evidence/staging-execution-and-production-inventory-r1.json.snapshot).
Nenhuma destas provas afirma UI, Mural, cancelamento de operação ocupada ou
aprovação de desempenho.

O usuário autorizou todo o Python em staging e produção, sem flag temporária
nem seletor limitado à equipe. A regra de produto permanece: cada linguagem
exige pelo menos um bloco conhecido conquistado naquela linguagem; Pro também
exige a capacidade Pro da jornada. Cursos e oficinas podem conceder esses
blocos. Equipe mantém a prévia privilegiada. Uma linguagem não concede a outra,
os blocos da paleta continuam restritos e nenhuma matrícula/curso Python é
publicada automaticamente. O lote de simetria JavaScript foi implementado em
`d89c00fe1`, com autorização fresca na criação/importação/remix e no Pro;
não confundir implementação local com implantação dos aplicativos concluída.

O [plano de produção](2026-10-22-platform-production-release.md) inclui oficinas,
comunidade/ofertas adultas, jornada, objetivos e os serviços relacionados.
Foram identificados 806.391.379 bytes de docs no source001 e COPY integral no
Dockerfile Auth. A exclusão de acervo editorial, QA e caches locais passou por
exportação Docker real de contexto: 8.857 arquivos/170.382.687 bytes, com 27
entradas necessárias conferidas por hash; BuildKit informou transferência de
171,33 MB. A execução levou 22,952 s. Isso não mede dependências instaladas por
RUN, a imagem comprimida ou o tempo de deploy remoto, nem atribui toda a demora
ao tamanho. As imagens anteriores conservam seu contexto original. Ver
[prova do contexto](../../continuity/2026-10-22-python-reference-games-visual-evidence/docker-context-pruning-r1.json.snapshot).

## Runtime após o lote de conquistas por linguagem

O lote alterou contratos Core consumidos pela imagem nativa. O perfil foi
regenerado pelo Bun canônico: fingerprint `ae46e781…`. A imagem
`sha256:7e881384684120a0e5993f2972f7ceddca8849fa9d463053ddc8ed0c7d5b6ee1`
passou nos smokes de imagem e nos seis jogos JavaScript de validação e foi
publicada no registro Cloudflare. O Worker Runtime staging passou para
`6fc805dd-dba2-43b2-9dff-15dc802a0bf6` às 21:06 UTC; a aplicação passou para
versão 7 com esse digest às 21:12 UTC. A primeira leitura ainda mostrava a
imagem anterior, pois o rollout dos containers é assíncrono. Não houve segundo
deploy para contornar essa transição. Language permaneceu na versão `991d09f7…`.

O operador HTTP corrente `4d30f83e…` foi realmente executado contra esse
destino às 21:13–21:15 UTC: três casos e 28 verificações passaram em 133,804 s,
incluindo inspeção sem execução, sintaxe inválida e Turtle com stdin, teclado,
clique e captura 320×240. A retirada lógica de input/preview passou. Às 21:17 UTC,
a aplicação tinha zero instâncias físicas listadas, mas a saúde agregada ainda
informava `starting: 1`; portanto a limpeza física completa permanece sem aceite.
Ver [fonte, pins e recibos atuais](../../continuity/2026-10-22-python-reference-games-visual-evidence/current-ae46-staging-release-r1.json.snapshot).

O ensaio local SDK/CPython/Turtle/preview também passou. Seu harness constrói
uma imagem própria `25a2ffca…`, distinta da imagem `7e881384…` publicada;
o [recibo SDK](../../continuity/2026-10-22-python-reference-games-visual-evidence/current-ae46-sdk-preview-r1.json.snapshot)
mantém essa distinção. Os resultados antigos não foram atribuídos à imagem nova.

Continuam abertos: catálogo/hosts Members carregados pela nova implantação,
CI dos aplicativos com os contratos atuais, percursos autenticados admin/aluno,
Mural/página pública, cancelamento ocupado, desempenho F1 Pro e qualificação
integral de produção. Estes recibos não afirmam conclusão dessas etapas.
