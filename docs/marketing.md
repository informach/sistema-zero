# Marketing digital do Sistema Zero — manual de conceitos e operação

> Manual CONCEITUAL da ferramenta de marketing (o que cada coisa significa e como o time
> trabalha nela). Os guias técnicos por pacote estão em
> [`packages/marketing/CLAUDE.md`](../packages/marketing/CLAUDE.md) (API) e
> [`packages/marketing-app/CLAUDE.md`](../packages/marketing-app/CLAUDE.md) (app).
> O plano completo de fases vive em `~/.claude/plans/eu-tenho-a-plataforma-wise-nebula.md`.

## O que é

Ferramenta INTERNA da equipe para gerenciar todo o marketing de conteúdo do Sistema Zero:
Instagram, YouTube, Facebook e TikTok em um lugar só. Cobre o ciclo completo:

```
ideia → produção (etapas + checklist) → aprovação → publicações por rede → agendamento
      → publicação (automática ou lembrete) → métricas
```

Quem acessa: qualquer conta da equipe (papel `staff`, `admin` ou `superadmin` no auth), pelo
app dedicado (porta 3012 em dev; `marketing.sistemazero.com.br` quando for ao ar). Cliente
comum (`customer`) não entra. Conectar/desconectar contas sociais é restrito a admin e auditado.

## Os 4 conceitos centrais

### 1. Ideia (inbox)

Captura rápida de qualquer ideia de conteúdo (título + notas + potencial 1..3 + complexidade).
Fica no inbox até alguém **promover** a ideia, o que cria um Conteúdo no pipeline já com o
briefing preenchido e arquiva a ideia (status `accepted`, com link para o conteúdo criado).

### 2. Conteúdo (o mestre, no pipeline de produção)

Um Conteúdo é UMA peça em produção: um Reels, um vídeo longo, um carrossel, um post estático ou
uma sequência de Stories (`content_type`). Ele anda por **etapas** (colunas do kanban):

```
Ideia → Roteiro → Gravação → Edição → Capa e legenda → Revisão → Aprovado
                                        (etapas manuais, arrasta no kanban)
→ Agendado → Publicado          (DERIVADAS das publicações — ninguém move na mão)
```

Regras que o sistema garante:
- Mover entre as 7 etapas de produção é livre (qualquer direção, para corrigir rumo).
- Promover a MESMA ideia duas vezes não cria conteúdo duplicado (a segunda tentativa é
  recusada, inclusive em cliques simultâneos de duas pessoas).
- Cancelar um conteúdo cancela junto as publicações pendentes dele (nenhum lembrete ou
  robô de publicação dispara para conteúdo cancelado).
- **Entrar em "Aprovado" exige o checklist 100% concluído.** Cada conteúdo nasce com um
  checklist copiado do modelo do seu tipo (ex.: Reels tem "gancho nos 3 primeiros segundos",
  "revisão final em aparelho de celular"), e o time pode adicionar itens manuais. Cada item
  marcado guarda quem marcou e quando.
- "Agendado" e "Publicado" são calculadas sozinhas a partir das publicações (abaixo).
- Todo movimento de etapa fica registrado (histórico com autor e hora, base do futuro
  relatório de lead-time).
- Conteúdo tem responsável, prazo, briefing e roteiro (markdown), comentários da equipe e
  anexos de mídia.

### 3. Publicação (cross-post: uma por rede/formato)

Quando o conteúdo está **Aprovado**, o time gera as publicações: o MESMO vídeo pode virar
`ig_reels` + `yt_short` + `tt_video`, cada uma com **legenda, capa, horário e status próprios**.
Formatos: `ig_feed`, `ig_carousel`, `ig_reels`, `ig_story`, `fb_post`, `fb_reels`, `yt_video`,
`yt_short`, `tt_video`.

Ciclo de vida de cada publicação:

```
draft → scheduled → published          (fluxo normal)
              ↘ canceled                (desistiu desta rede)
```

O agendamento só aceita horário válido (nada no passado, nada além de 2 anos) e uma
publicação agendada nunca fica "sem horário": para desistir dela, cancela; para mudar,
reagenda. Cada formato só tem UMA publicação ativa por conteúdo (recriar exige cancelar
a anterior).

Dois modos de publicar:
- **Lembrete (`manual`)** — o modo de HOJE, e permanente para Stories (nenhuma ferramenta do
  mundo publica Stories por API). Agendar cria o compromisso; na hora, o sistema avisa (fase 1:
  aviso por WhatsApp/e-mail via messaging) e a pessoa posta na mão e clica em "marcar como
  publicado", colando o link do post real (isso conecta as métricas depois).
- **Automático (`auto`)** — fases 2 a 4: o sistema publica sozinho via API oficial
  (YouTube primeiro, depois Instagram/Facebook, depois TikTok). Hoje escolher `auto` responde
  `AUTO_PUBLISH_UNAVAILABLE` de propósito; vai liberando por rede conforme cada integração
  entra e a conta estiver conectada.

Sincronização com o conteúdo-mestre: alguma publicação agendada/pendente → conteúdo vira
**Agendado**; todas publicadas → **Publicado**; todas canceladas → volta a **Aprovado**.

### 4. Mídia (biblioteca)

Vídeos, imagens e artes vivem no **R2** (bucket privado próprio do marketing). O upload é
DIRETO do navegador para o R2 (URL pré-assinada), então arquivo de 1 GB não passa pelo app nem
esbarra no teto de 100 MB do Cloudflare. Fluxo: o app pede o presign → sobe direto → confirma
(o serviço confere tamanho no R2). O preview e o download usam URLs temporárias.

O **Google Drive (5 TB)** entra em duas pontas (fase 1+): importar um arquivo do Drive para a
biblioteca (cópia servidor a servidor) e **arquivamento automático** depois de publicado (os
arquivos pesados vão para o Drive e o R2 fica enxuto e barato). O Drive continua sendo a área
humana do time para brutos de gravação.

## Como as peças técnicas se encaixam

```
marketing-app (Next, :3012)  ── BFF /api/* ──►  api-gateway (:3000)  ──►  marketing (:3011)
        │                                          (JWT staff+, rate limit,                │
        │  upload direto (presigned PUT)            x-internal-token)                       │
        ▼                                                                                   ▼
   Cloudflare R2  ◄──────────────── presign/HEAD/GET ───────────────────────  Postgres (schema `marketing`)
```

- O app NUNCA fala com o serviço direto; o gateway autentica (JWT), aplica papel staff+ e
  injeta a identidade confiável.
- O serviço marketing é o dono do bucket R2 e do schema `marketing` no Postgres compartilhado
  (12 tabelas: ideias, conteúdos, eventos de etapa, checklist, comentários, mídia, contas
  sociais, publicações, ordem de carrossel, 2 séries de métricas, states de OAuth).
- O schema já nasceu completo para as fases futuras: as publicações têm o checkpoint de
  idempotência (`provider_session`) que impede post duplicado quando o robô de publicação
  entrar, e as tabelas de métricas guardarão os snapshots periódicos de cada rede.

## Bancada editorial e acervo existente (em validação)

A evolução em Electron usa as contas individuais do Codex e do Claude Code no computador e mantém projetos, revisões e arquivos confirmados no servidor. A bancada é compartilhada com a web; leitura de pastas, produção local e recursos nativos indicam quando precisam do desktop. O plano e os critérios ainda abertos estão em [lotes de implementação](superpowers/plans/2026-10-15-marketing-desktop-colaborativo-lotes.md).

Em **Importar acervo**, a equipe seleciona uma pasta no desktop, confere o inventário e registra as origens no projeto. A seleção por produto e categoria permite carregar textos e originais, retomar interrupções e consultar o resultado pela web. Código e arquivos de produção são guardados como anexos, sem execução. Referências importadas permanecem em preparação, com origem e versões preservadas.

**Conferir cobertura da carga** mostra o inventário inteiro por situação, com filtro, paginação e abertura das referências preservadas. Assim é possível distinguir o que falta carregar, o que pertence a outro produto e o que exige conferência. O recibo comprova que a origem foi preservada; a estruturação da peça, o vínculo de mídia e sua revisão continuam identificados separadamente. Ao terminar um conjunto, o desktop consulta também os arquivos cuja verificação terminou durante os demais envios, sem reenviar seus bytes.

Nas origens ainda não carregadas, **Registrar como continuar esta origem** permite deixar uma pendência, decidir não carregar ou reabrir a carga, sempre com motivo compartilhado. Retomadas em lote respeitam essas decisões; uma alteração concorrente pede nova leitura. A decisão não remove arquivos nem substitui bloqueios de segurança.

DOCX, XLSX, ZIP e fontes podem ser preservados como anexos e recuperados com os mesmos bytes. YAML pequeno pode entrar como referência textual, passando pela checagem de credenciais. Para DOCX/XLSX de até 192 KiB, a carga desktop também extrai o texto para referências separadas, vinculadas ao original e identificadas como extração. Na cobertura, **Abrir texto extraído do Office** permite consultar ou preparar essa referência tanto no web quanto no desktop. Layout e imagens não são reproduzidos; nas planilhas, endereços/tipos e valores em cache ficam explícitos e fórmulas não são executadas. Repetir a extração conserva as edições da equipe. Arquivos maiores continuam preservados como anexos e o limite é informado. Arquivos vazios conservam seu caminho e hash como fonte textual vazia. Arquivos da ferramenta anterior não ativam automaticamente um produto ou uma oferta.

**Conferir novamente a pasta** cria outro retrato imutável no desktop. **Comparar inventários** mostra origens novas, removidas, alteradas e reclassificadas; nenhum destino é apagado ou sobrescrito pela comparação. Depois de conferir, **Voltar à carga já preparada** retorna ao conteúdo que já foi carregado. Uma leitura idêntica pode verificar a carga anterior sem duplicar seus arquivos.

**Conferir liberação do acervo** mostra a disposição completa do produto e os motivos que ainda impedem concluir a preparação. A liberação administrativa exige destino ou decisão para cada origem, conferências de produção compartilhadas e outra leitura da pasta com o mesmo conteúdo. Se a leitura mais recente mudou, reconcilie a nova carga primeiro. A liberação registra um recibo e conserva pendências para continuar no app; não aprova peças, muda posicionamento, agenda ou publica. Desativar a carga mantém os originais, as edições da equipe e o histórico.

Antes da carga, um administrador escolhe o **Produto de destino** para cada origem. O app permite carregar somente esse produto e, quando selecionadas, referências compartilhadas. O vínculo não muda o significado de materiais antigos nem reúne produtos pelo nome.

Nas fontes de copy, **Conferir peças desta fonte** apresenta as fichas reconhecidas. **Criar peça editável** separa textos, cenas, legendas e orientações de produção. As mensagens de direct ficam em outra versão da mesma peça; essa conversão não configura nem envia mensagens. A repetição conserva o trabalho já carregado. Se a equipe editar a peça e depois o arquivo de origem mudar, o app aponta o conflito e preserva a edição existente.

**Conferir calendário desta fonte** vincula semana e ordem pela referência exata da copy. As datas editoriais são preservadas; uma semana sugerida não agenda publicação. Copies e pautas podem ser aplicadas em lote por fonte, com progresso e interrupção entre operações. Fontes históricas e mudanças conflitantes ficam identificadas para conferência.

No desktop, **Localizar peças produzidas** e **Conferir integridade e versões** comparam as artes numeradas, legenda e texto alternativo com as copies da pasta original. A conferência funciona sobre o inventário local, inclusive sem resposta do servidor, e aponta alterações posteriores dos arquivos. Versões diferentes permanecem identificadas. **Compartilhar conferência e originais** envia os arquivos e preserva as fontes; o servidor recalcula o relatório e só aceita originais confirmados. A equipe consulta o mesmo relatório e abre suas imagens na web ou no desktop.

A seleção inclui posts, fixados e destaques. **Compartilhar conferências do produto** processa as pastas em sequência e permite pausar após a peça atual. Fixados e destaques conservam descrições e instruções de publicação existentes; ausência de alt, imagens provisórias e falta de uma ficha de montagem ficam como pendências. Nome e quantidade de arquivos não comprovam que a arte corresponde à copy e não autorizam um vínculo automático.

**Conferir vínculo com a peça atual** compara a produção com a copy já estruturada. No desktop, **Vincular artes à peça** prepara arquivos finais com referência aos originais e os vincula na ordem conferida, com texto alternativo. A operação pode ser retomada enquanto o servidor verifica os arquivos. Mudanças da equipe impedem substituição automática; nenhuma parte do vínculo é aplicada se um arquivo ou uma revisão divergir. O relatório preserva textos alternativos curtos e longos; o componente recebe a descrição curta. O vínculo não altera a copy, não ativa a peça e não aprova nem publica. A web indica a preparação no desktop e mostra o resultado compartilhado.

**Conferir vínculos da carga inteira** consulta todas as conferências desse inventário e mostra peças já vinculadas, prontas para vínculo e bloqueadas, com os motivos. No desktop, **Vincular artes de peças conferidas** aplica os planos em sequência, revalidando cada revisão no servidor. É possível pausar após a peça atual e retomar; recibos anteriores e edições da equipe são conservados.

A conversão também reconhece a amostra preparatória já carregada, usando seus recibos e o caminho exato do calendário. Reaproveita os IDs das peças e componentes correspondentes, conserva o planejamento e recusa substituição automática quando houve edição humana.

A prévia de anexos e o salvamento permitem conferir e recuperar os arquivos confirmados. Arquivo importado não significa arte aprovada, e copy estruturada não significa mídia pronta: a reconciliação das artes e dos projetos ainda integra o lote de carga. A legenda textual é congelada com a edição aprovada, sem exigir imagem própria. Consulte as evidências e limites na [revisão do lote 8](../.audits/marketing-l8-review-2026-10-15.md).

## Roadmap legado (fases de julho de 2026)

| Fase | Entrega | Estado |
|------|---------|--------|
| 0 | Fundação: pipeline + publicações modo lembrete + mídia R2 + app com login/shell | **FEITA (07/2026)** |
| 1 | Operação manual completa: telas ricas (kanban, detalhe, composer, calendário, biblioteca, painel), lembrete por WhatsApp, OAuth Google, importar do Drive | **FEITA (07/2026)** |
| 2 | YouTube automático (upload antecipado + agendamento nativo, quota guard) + tela Conexões + métricas básicas YT | **FEITA (07/2026)** |
| 3 | Instagram/Facebook automático + coletor de métricas completo + dashboards | **FEITA (07/2026)** |
| 4 | TikTok + arquivamento R2→Drive + melhores horários (heatmap) | **FEITA (07/2026)** |
| 5 | IA: legenda/roteiro com validação Light Copy/VTSD + hashtags | **FEITA (07/2026)** |

As fases F0–F5 desse roadmap foram concluídas. O que a F5 entregou, na prática: no composer e na aba Roteiro, dois botões
("Gerar com IA" e "Melhorar") escrevem ou reescrevem a legenda e o roteiro no padrão Light Copy
da casa (as 12 proibições do VTSD), respeitando o limite de cada rede e sugerindo hashtags; a
pessoa revisa o texto e salva (a IA nunca salva sozinha). Um "linter" passivo marca ao vivo os
erros mecânicos (travessão, exclamação, pergunta no gancho) enquanto se escreve, sem depender de
IA. A chave da IA fica no backend; sem ela, os botões somem e o linter continua funcionando.

O que a F4 entregou, na prática: **TikTok automático** (um login conecta a conta do criador; o
vídeo agendado sobe NA hora marcada — no TikTok, terminar o envio já publica, então nada sobe
antes da hora; até a auditoria do app os posts saem privados e dá para torná-los públicos no
próprio TikTok); **arquivamento automático**: 30 dias depois de um conteúdo ficar todo
publicado, a mídia dele sai do R2 (pago) e vai para a pasta "Sistema Zero Marketing — Arquivo"
no Google Drive — a Biblioteca passa a mostrar "Arquivado no Drive" com o link (é preciso
RECONECTAR a conta Google uma vez, por causa da permissão nova de escrita); e o mapa de
**melhores horários** em Métricas: uma grade semana × hora onde a cor mostra quantas views por
post cada horário rendeu no período.

O que a F3 entregou, na prática: **conectar Facebook e Instagram com UM login** (a Página e o
Instagram profissional vinculado entram juntos; o token da Página não expira e o login de 60
dias se renova sozinho), **publicação automática** de post no feed, carrossel (2 a 10 imagens
JPEG, na ordem escolhida no composer), Reels do IG, post e Reels da Página — tudo publicando NA
hora agendada; **métricas por conta e por rede** (o coletor passa em cada post com frequência
que DECAI com a idade do post) com o dashboard de Métricas de verdade: cards por rede com
seguidores e totais de 28 dias, gráfico de seguidores por conta e top publicações de 90 dias;
e o **"Vincular post real"**: uma publicação feita no modo lembrete pode ser ligada ao post que
foi ao ar (cole o link) e entra na coleta de métricas como as automáticas.

Notas de dependência externa: publicar automático exige app aprovado na Meta (em modo dev já
publica para as contas administradoras do app, o que cobre uso interno), app OAuth do Google
publicado (senão o refresh token expira em 7 dias) e auditoria do app TikTok (antes dela os
posts via API ficam privados). O modo lembrete existe exatamente para o produto funcionar
inteiro ANTES de qualquer aprovação externa.

## Operação (dev local)

### Bancada: resultados, acompanhamento e próxima pauta

“Resultados do projeto” agrupa as edições publicadas por objetivo, necessidade do público, série e formato. Classificação e mídia vêm da edição aprovada. O relatório informa origem, data da coleta e cobertura; um contador indisponível não é zero. Fontes públicas e dados importados são mostrados separadamente. A leitura de um resultado pode gerar uma análise; “Criar próxima pauta” pede hipótese e critério de avaliação e preserva as revisões usadas.

Em “Perfis e temas”, abra uma fonte e escolha “Configurar acompanhamento”. Feed RSS/Atom HTTPS é consultado pelo servidor, inclusive com o desktop desligado. Configure intervalo em horas, fuso e orçamento diário. “Pesquisa pessoal” aguarda o responsável no Electron e usa sua própria assinatura; “Manual” aguarda uma observação conferida/importada. Pausar mantém o histórico. “Novidades observadas” reúne as referências e alterações; consulte a fonte antes de preparar uma variação. Data de consulta não significa data de publicação.

“Processo produtivo” apresenta tentativas, retomadas, duração/consumo informados e avaliações de utilidade. O consumo dos resultados confirmados pode ser parcial e não representa saldo ou custo da assinatura. Registre seu tempo ativo quando quiser acompanhar esforço humano: espera pela IA não é preenchida automaticamente. Correções e anulações preservam o histórico. Sobreposições de horário da mesma pessoa são recusadas mesmo entre projetos.

CSV/JSON de referências aceita `observation` opcional, com `sourceType` (`public`/`imported`), rede, assunto, início/fim da janela, coleta, amostra, cobertura, dimensões e métricas definidas. Valores ausentes usam `null` e disponibilidade explícita. O exemplo completo está em [observações de marketing](marketing-observations-example.json). No CSV, serialize esse objeto como JSON em uma célula entre aspas. Essas referências nunca se tornam resultados de conta conectada por inferência.

As três telas também existem no Electron, usando os mesmos serviços e permissões. A implementação está em revisão local; a importação e as provas não representam implantação em produção. Consulte as auditorias e o plano de lotes para os critérios ainda abertos.

1. Postgres: `bun run dev:up` (raiz) e migration: `bun run db:marketing:migrate` (aplicada em
   07/07/2026 no dev local).
2. Suba auth (:3002), gateway (:3000) e marketing (:3011, `bun run dev:marketing` — precisa de
   `.env`, ver `packages/marketing/.env.example`).
3. App: `bun run dev:marketing-app` → `http://localhost:3012` → login com usuário staff+
   (crie com o `db:seed` do auth).

## Infra (staging/produção) — PROVISIONADA 07/07/2026

- Serviços `marketing` e `marketing-app` criados no Railway em staging E produção, com envs,
  domínios (staging `marketing-app-staging-cb28.up.railway.app`; produção
  `marketing.sistemazero.com.br`) e SVC_IDs preenchidos no CI (cases descomentados).
- Buckets R2 criados com CORS das origens do app: `testes-marketing` (staging/dev) e
  `sistemazero-marketing` (produção). Credenciais S3 = referências ao token da conta (admin).
- `MARKETING_INTERNAL_TOKEN` está no `PROD_REQUIRED_SECRETS` do gateway e setado nos 2 ambientes.
- ⚠️ Pendência única: criar o CNAME `marketing` → `34z3j59k.up.railway.app` na zona
  sistemazero.com.br do Cloudflare (o token de API atual é read-only para DNS). A produção
  só atende pelo domínio depois disso; o deploy de produção em si acontece no próximo merge
  para a `main` (PR), como nos demais serviços.

### CORS para o upload editorial multipart

O upload da bancada usa `content-md5`, além do `content-type` do fluxo anterior. A regra antiga de julho não cobre esse contrato. Antes de implantar, execute no pacote `marketing`, com as credenciais R2 do ambiente carregadas de forma segura:

```powershell
bun run storage:cors --bucket sistemazero-marketing --origin https://marketing.sistemazero.com.br
```

O comando consulta e mostra a diferença; código 1 indica configuração pendente. Após conferir bucket e origens, acrescente `--apply` para aplicar e verificar. Ele preserva origens existentes e regras externas, recusa origem com caminho/credencial/curinga e não faz nenhuma escrita por padrão. Não torna o bucket público. Em staging, use o bucket e a origem de staging. O teste local de 16/10 atualizou somente `testes-marketing`, incluindo `http://127.0.0.1:15334`; a configuração de produção não foi modificada. Conclua a validação com upload real pelo navegador, pois uma assinatura válida não dispensa CORS. Referência: [documentação oficial do R2](https://developers.cloudflare.com/r2/buckets/cors/).

A biblioteca acompanha a verificação do arquivo automaticamente enquanto estiver aberta. Arquivo recebido ainda não significa arquivo confirmado; nenhum original é vinculado antes da confirmação. Se a conexão falhar, o envio permanece rastreável e pode ser retomado com o mesmo arquivo.
## Revisão de descrições na entrega

A entrega do fluxo editorial encaminha o texto alternativo da edição aprovada junto de cada posição de mídia. O publicador Instagram envia `alt_text` na imagem do feed e em cada imagem do carrossel; Facebook envia `alt_text_custom` nas fotos. Vídeos conservam a descrição na edição, sem transformá-la em legenda nem enviar um parâmetro de imagem. Imagem repetida em posições diferentes pode ter descrições distintas. O legado sem descrição continua identificado por valor ausente; não inventar alt a partir do nome do arquivo. Uma imagem ausente invalida o carrossel inteiro antes de criar contêineres externos.

## Revisões anteriores e espaço no computador

Em uma montagem de vídeo, **Criar ou ajustar animação com IA** permite escolher uma cena gráfica e descrever a animação. Codex ou Claude produz o fonte Remotion, validado e renderizado no desktop. A prévia, os parâmetros e o fonte ficam no histórico compartilhado; a web reproduz o resultado e indica as etapas que precisam do desktop. Ações de texto conservam o fonte existente; ajustes de animação podem conservar a copy. Cenas de até 60 segundos são processadas individualmente, mantendo gravações, áudio e demais cenas. Alternativas aguardam escolha; ajustes têm Desfazer. Cenas com camadas protegidas conservam o fluxo de receita existente.

O fonte gerado só é compilado e executado pelo processo isolado de produção. Não roda no Player web nem na janela Electron com ponte. Fontes, mídias, revisão de origem e saída são vinculadas por identidade, e a equipe recebe a prévia depois da confirmação do arquivo. A retomada pode reutilizar tanto a resposta da assinatura quanto variantes já renderizadas. A atualização utiliza o protocolo 3 e preserva filas antigas quando é necessário atualizar um cliente.

Se uma produção for interrompida, **Retomar resultado local** aproveita a resposta completa preservada neste computador e repete sua validação, sem nova chamada de geração. A retomada exige acesso ao projeto e autorização do servidor para concluir a tarefa. Respostas incompletas ou inválidas permanecem identificadas; **Solicitar nova geração** inicia uma tentativa separada. Quando a resposta já incluía imagens, a retomada conserva seus arquivos e identidades. Em outro computador, um resultado ainda não enviado precisa primeiro ser retomado no dispositivo de origem.

Na bancada, **Histórico** permite consultar as revisões em páginas, carregar as anteriores e abrir a mídia de uma versão antes de decidir. **Restaurar conteúdo como nova revisão** mantém o histórico e os vínculos atuais da peça; não apaga a versão mais recente nem aprova a restauração automaticamente.

No Electron, **Espaço neste computador** informa o uso do cache e o espaço livre no disco. **Liberar cópias sincronizadas** verifica no servidor quais arquivos deste projeto já estão confirmados e remove somente cópias locais equivalentes, priorizando as maiores até cerca de 1 GB por operação. Arquivos pendentes ou usados por trabalhos em andamento permanecem protegidos; arquivos sem cópia disponível permanecem locais e aparecem na contagem. Os originais nas pastas de importação são preservados. Ao consultar novamente uma mídia, o app recupera a cópia do servidor e confere sua integridade. A limpeza exige conexão e acesso ao projeto.

## Continuar um acervo importado

**Conferir novamente a pasta**, no desktop, cria outro inventário sem alterar o anterior. **Comparar inventários** mostra origens novas, removidas, alteradas e reclassificadas. **Reaproveitar origens sem mudanças** conserva recibos, decisões e conferências cujas dependências continuem iguais; alterações realizadas nas peças dentro do app permanecem. Arquivos novos ou alterados ainda precisam ser carregados e conferidos. A comparação e os resultados compartilhados também podem ser consultados na web.

**Liberar acervo para continuidade** registra quais origens estão preservadas e quais decisões/pendências existem naquela conferência. A liberação não aprova peças, agenda posts nem ativa comercialmente produtos antigos. O filtro de situação das peças permite abrir cada pendência de produção diretamente, inclusive finais ausentes, fixados ou destaques sem montagem completa. Uma mudança detectada na origem exige reconciliação antes de uma nova liberação.
