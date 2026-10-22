# Python em produção — preparação da implantação atual

Estado deste documento: **plano preparado, sem implantação nem drain executado
por este lote**. As leituras abaixo são observações, não um gate válido por tempo
indefinido. O operador deve reler identidades, configuração e recursos antes da
ação correspondente. Não reutilizar namespaces nem recibos de staging.

## Corte e pinos

- Conta Cloudflare: `bcc0f2d44140e05b69152cba326132f8`.
- Railway: projeto `415d5a1c-5f75-432c-8445-b395d0977ce3`, ambiente produção
  `19c212a5-85c0-493c-9630-a7a0569e8412`.
- Runtime: `https://sistemazero-studio-runtime.helena-bcc.workers.dev`.
- Language: `https://sistemazero-studio-language.helena-bcc.workers.dev`.
- Parents: somente `https://admin.sistemazero.com.br`,
  `https://comunidade.sistemazero.com.br`, `https://kids.sistemazero.com.br`.
- Bucket privado: `sistemazero-studio-artifacts`.
- Distribuição: `476d32e78da6b528730b8b0535ad026f64fe4e61c03f20a195a7438bc56ace2c`.
- Release: `python-browser/2026-10-22-visual-games-3`.
- Manifesto: `bc5710a137facb82e4f1a24df6e370406217f5fc4707c64861adf381d10d3e80`.
- Plano próprio de produção:
  `7564f45956986cd464570cd619606066c30e05d329bd9d6050d549405d139fd9`.
- Catálogo Worker produzido:
  `0c4482cff070b0dc1ea7d452db87d588116ef22b69fe40605fab16e99f2cb069`,
  chave `runtime-configs/0c4482cff070b0dc1ea7d452db87d588116ef22b69fe40605fab16e99f2cb069.json`.

O promotor canônico conferiu os 41 arquivos locais e produziu 256 IDs de autoria.
Os arquivos privados revisáveis são
`.cache/python-reference-games/production-python-promotion-{input,plan,baseline}-r1.json`.
O input declara o caminho local absoluto da distribuição; o promotor o verifica.
Mover o artefato exige gerar e revisar outro plano, pois esse caminho integra o
hash. O plano não oferece CAS entre Cloudflare e Railway.

Imagens já construídas e qualificadas em staging, para reutilização por digest:

| Serviço | Imagem imutável | Evidência de código |
| --- | --- | --- |
| Runtime | `registry.cloudflare.com/bcc0f2d44140e05b69152cba326132f8/sz-studio-runtime-qa@sha256:7e881384684120a0e5993f2972f7ceddca8849fa9d463053ddc8ed0c7d5b6ee1` | Fingerprint `ae46e781102489c22e9fe4ccd92af4c3a2c1a5b0c0597ecb985ac13472c579da`; incorpora os contratos Core atuais. |
| Language | `registry.cloudflare.com/bcc0f2d44140e05b69152cba326132f8/sz-python-language-qa@sha256:b64cb8e24ac10eaeb2e0d298e9e3e7ec809b1aeea7778c145941e65cf0578320` | Pyright `1.1.414`; runtime/Dockerfile e contratos Core usados pelo processo não mudaram entre o corte `001ce0788` qualificado e `dbd2caef9`. |

O nome de repositório `-qa` não muda os bytes do digest. Esses recibos justificam
reutilização da imagem, não qualificam configuração, serviço ou execução em
produção. Conferir imagem efetivamente aplicada e todos os gates abaixo.

## Baseline observado

Leitura GET Cloudflare: 22/10/2026 21:34:47–21:35:06 UTC, Node 24.22.0 e Wrangler
4.120.1. Recibo privado `production-cf-readonly-r2/receipt.json`.

| Recurso | Estado observado | Mudança necessária |
| --- | --- | --- |
| Worker Runtime | Versão `c3f64701-9b08-413b-80f6-3a4b41e1877d`, migração `v1`; sem referência de catálogo Python, sem R2 no versionamento ativo | Código atual, imagem acima, bindings R2 e migração `v2-python-inspection-jobs`; referência do catálogo próprio somente após upload verificado. |
| ProBuildSandbox | Namespace `b17aa818b81b4a5e820c8c12261e7f50`, app `a03f07be-3a1a-4bb8-82bc-5d2c3c01c057` | Preservar namespace/classe e comportamento JS. Configuração atual desejada: `standard-1`, máximo 50. |
| Worker Language | Versão `ec49d7aa-d9d6-4eba-b903-7cfdb7a3c694`, migração `v1` | Após drain comprovado, aplicar `language-sessions-initial`. |
| PythonLanguageOwner | Namespace antigo `7f9c24b7d37b43f29a259ccdcc1888ee` | Excluir somente após gate de retirada; não renomear, copiar tabela nem recuperar leases antigos. |
| PythonLanguageSandbox | Namespace `0d42f167dd204762adfd1095632fff38`, app `a03db69d-1a33-4a8c-9cb0-0d239ccd0e75` | Preservar namespace/classe; imagem Language acima, `standard-2`, máximo 64. |
| PythonLanguageSessions | Ausente | Criar pela migração. Registrar o ID real novo; não usar o de staging. |
| Bucket | Existe, privado, domínio público desativado; multipart 7 dias e `previews/` 2 dias | Preservar regras existentes; acrescentar expiração de 1 dia para `python-inputs/` e `python-input-states/`. Não expirar distribuição, catálogos, receitas e materiais publicados. |

Naquela leitura, ambas as aplicações tinham zero instâncias físicas e zero
active/assigned/scheduling/starting. Language tinha quatro nomes históricos;
isso não prova ausência de leases. O valor `healthy:7` agregado do provedor
também não é contagem de instâncias físicas atuais.

Leitura Railway: 21:39:52–21:39:57 UTC, CLI nativa 5.62.1, recibo
`production-python-railway-baseline-r1.json`, SHA
`d1c2889fe8a2f7fa3610591642457905caacdf0260f5d67d2ce5deb12c986c3e`.
Catálogo e hosts estavam ausentes nos quatro serviços. Admin/Adult/Kids já tinham
`STUDIO_PYTHON_FRAME_ORIGINS` com a origem exata do Runtime produção; o plano
preserva essas listas. Variáveis resolvidas não comprovam os headers do build
Next que está rodando.

As URLs/tokens Language estavam presentes nos três hosts, e os valores de token
coincidiam entre eles. Adult/Kids e Members tinham Runtime URL/token; onde ambos
existiam, Python Runtime token e Pro Runtime token coincidiam. Isso não comprova
igualdade com o secret do Worker, nem validade da credencial. Members não usa o
serviço LSP diretamente; não acrescentar token Language a um consumidor que não
o exige. Admin usa seu contrato existente Pro Runtime para Builder e Language
para análise; não inventar uma variável Admin Python Runtime que seu código não
lê. Nenhum valor de token foi persistido.

## Retirada obrigatória do Language antigo

O GET do bundle real, cercado por leituras da mesma versão `ec49…`, produziu SHA
`8661094c75cc7ea242d0b6829ec3542a925809487047a6cc1930c0a1efc499fc`.
`PythonLanguageOwner` usa a tabela SQL `leases`, não KV. A API antiga oferece
Open/Start/command/DELETE autenticados; não possui GET de leases nem fechamento
administrativo sem owner. A listagem de objetos retornou cinco Owner IDs com
`hasStoredData:true`; esse sinal não informa o número de leases.

Foram localizados dois recibos QA antigos específicos de produção:
`production-python-language-qualified-20261019-r1.json` e `r2.json`, com hashes
`84014a84d8dddaffcfe457bb917a866517a0f4ceee244694ea5041d03a5f4a0b` e
`54b95238a8c937da0e52b59d5a055e0960c0ace52be2aea5cc57a975acb29722`.
Eles registram Close e retirement para `ce43911832cf6a5c1ab46a10e56860dc` e
`6e148f628b1a559d298a1f1a55d226b9`, respectivamente. Não homologam o protocolo
atual. Os nomes históricos `language-0a664fc311ccb10e154e3d91b287ecaa` e
`language-c6f6ab885bedad98287976e97e952280` ainda não têm ownership recuperado nos
caches consultados. Não inventar owner, não usar um Close idempotente em outro
coordenador como prova.

Mantendo callers pausados, a inspeção oficial por
[Data Studio](https://developers.cloudflare.com/durable-objects/observability/data-studio/)
permite consultar SQL por ID do objeto. A consulta mínima é
`SELECT COUNT(*) AS leases FROM leases` em cada um dos cinco Owner IDs do recibo
`production-language-legacy-readonly-r2.json`. Não selecionar token, bootstrap,
binding, fonte ou linhas completas. A consulta aciona o DO remoto; precisa de
admissão operacional e não foi executada neste lote. Se houver leases, apurar
estado/ownership e preparar cleanup específico antes da migração. Se o dashboard
não estiver disponível, não inferir zero a partir de TTL ou da listagem REST.

O [runbook do Language](../../../../packages/studio-language-service/DEPLOYMENT.md)
continua obrigatório. Após a última limpeza/consulta autorizada, reler a aplicação
exata, aguardar convergência por leituras — sem repetir destroy automaticamente —
e exigir zero físico/live/pending. A exclusão do namespace apaga seus alarmes;
não aplicar a migração enquanto esse gate estiver incompleto.

## Ordem operacional proposta

1. Fixar checkout e imagens revisados. Pausar callers de QA/Builder/LSP, conferir
   versões/namespaces/apps próprios e completar o gate acima. O rollout Railway
   de aplicações e os gatilhos nativos são tratados pelo plano de CD, não por
   este documento. Não repetir o patch de dois watchPatterns já aplicado pelo
   root e confirmado por readback/plano sem mudanças.
2. Reler os baselines públicos; qualquer drift exige outro input/plano canônico.
   Revalidar o artefato local com `promote-python-runtime.ts prepare`, sem build
   ou download. O plano atual parte de ausência comprovada de catálogo Python,
   não da referência antiga ainda presente no default `wrangler.jsonc`.
3. Com autorização operacional, completar as duas regras de lifecycle no bucket
   próprio preservando as demais. Fazer upload pelo promotor R2 canônico:
   `upload --plan .cache/python-reference-games/production-python-promotion-plan-r1.json --expect-plan-sha256 7564f45956986cd464570cd619606066c30e05d329bd9d6050d549405d139fd9`.
   Exigir SHA256 nativo e `onlyIf`, depois readback independente dos 43 objetos
   (41 arquivos, marker, catálogo). Não ativar Members durante esse passo.
4. Derivar configs somente de produção: usar caminhos absolutos de main/tsconfig,
   retirar o bloco `env` da cópia operacional, fixar as imagens por digest e os
   dois bindings públicos do plano. Preservar binding/classe JS, quotas, cron,
   rate limiters e URLs de callbacks Kids/Adult. Não subir `./Dockerfile` por
   engano nem usar default catalogSHA `6742…`, staging `3c69…` ou imagem `7bcc…`.
5. Aplicar Runtime com a migração `v2-python-inspection-jobs`; após o gate de
   retirada, aplicar Language com `language-sessions-initial`. Confirmar a
   criação das novas classes, exclusão somente do Owner antigo, preservação dos
   namespaces Sandbox existentes, versões e imagens reais. Falha mantém callers
   pausados; não restaurar implementação/tabela antiga como fallback.
6. Qualificar delivery GET/HEAD/gzip/ETag/MIME/CSP/bytes pelo plano de produção,
   Language Open/Start/Sync/Pyright/Close e Runtime inspect/validate/Turtle/PNG.
   Runners precisam de `--environment=production`, origem produção exata e pins
   explícitos. Language recebe o bootstrap e o deployment públicos, exigindo
   igualdade da release e SHA externo da distribuição; Runtime recebe o plano
   completo com pins de plano, manifesto e distribuição. Diretório novo por execução, token somente RAM/env, cleanup
   aguardado. Ligar os recibos à inspeção externa posterior da aplicação correta
   com zero físico/live/pending. Cancelamento não comprovado permanece falso.
7. Conferir as URLs e os secrets existentes, sem rotação implícita. Runtime
   `INTERNAL_TOKEN` precisa corresponder aos consumidores Pro/Python Runtime;
   Language `INTERNAL_TOKEN` aos consumidores Language. Callbacks de publicação
   e cleanup usam o token Runtime e os endpoints fixos Kids/Adult. Provar o
   caminho JS também, pois o Worker/ProBuildSandbox é compartilhado.
8. Construir/deployar os hosts com os CSPs corretos e o código revisado. Conferir
   os headers reais. Aplicar `configuration.members` em
   `STUDIO_AUTHORING_POLICY_JSON` e `configuration.hosts` em
   `STUDIO_RUNTIME_HOSTS_JSON` do Members por último; confirmar leitura e processo
   ativo antes de retomar callers.
9. Qualificar contexto autenticado Admin/aula/live/Completo, permissões por
   linguagem e pacote Pro, REPL, LSP/formatter, Zappy/Builder, export e publicação
   Kids/Adult com retirada. Public player segue política própria; grants de
   criação não são impostos ao leitor público. Guardar negativos e cleanup.

## Limites de conclusão

Este plano e os testes inertes dos operadores não certificam produção. As
capacidades `assist`, `python-repl`, `publish` e `export-source` constam da release;
direitos de usuário/contexto continuam revalidados pelos serviços. Catálogo ativo
não concede produto Pro nem blocos não conquistados. O resultado S2S não certifica
UI hospedada, Mural, áudio audível, latência/performance, cancelamento ocupado ou
cleanup físico sem leitura externa. A infraestrutura pode ficar pronta antes de
todos esses percursos; registrar separadamente cada gate ainda aberto.
