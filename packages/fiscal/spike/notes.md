# Fase 0 — Achados confirmados (NFS-e padrão nacional, jun/2026)

Fontes primárias baixadas em `spike/docs/` (12/06/2026):
- `xsd-v1.01-20260209.zip` → `docs/xsd/Schemas/1.01/` — **esquemas XSD vigentes v1.01 (09/02/2026)**
- `manual-api-contribuintes-v1.2.pdf` (+ `.firecrawl/*.md`) — manual oficial da API do Emissor Público
- `manual-apis-adn-contribuintes.pdf` — manual das APIs do ADN (distribuição/eventos)
- `anexo_b-nbs2-lista-servico-nacional-v1.01.xlsx` — lista de serviço nacional + NBS 2.0
- `anexo_i-leiaute-dps-nfse-v1.01.xlsx` / `anexo_ii-leiaute-eventos-v1.01.xlsx` — leiautes campo a campo
- `anexo_a-municipios-ibge.xlsx` — códigos IBGE

## Leiaute REAL da DPS (do XSD oficial — NÃO é o padrão ABRASF)

- **Namespace:** `http://www.sped.fazenda.gov.br/nfse` · raiz `<DPS versao="1.01">` > `<infDPS Id="...">`
- **infDPS:** `tpAmb` (1=Produção, **2=Homologação**) · `dhEmi` (UTC `AAAA-MM-DDThh:mm:ssTZD`) · `verAplic` · `serie` · `nDPS` · `dCompet` (data de início da prestação, `AAAA-MM-DD`) · `tpEmit` (1=Prestador) · `cLocEmi` (IBGE) · `subst?` · `prest` · `toma?` · `serv` · `valores` · `IBSCBS?`
- **Id da DPS (TSIdDPS, 45 chars):** `"DPS" + CódMun(7) + TipoInscr(1: 1=CPF? 2=CNPJ — confirmar no Anexo I) + Inscrição(14, zero-pad) + Série(5) + Número(15)` — determinístico ✓ (consulta de recuperação: `GET /dps/{id}`)
- **Série (TSSerieDPS):** numérica, máx 5 dígitos. **Número (TSNumDPS):** máx 15, sem zeros à esquerda.
- **Prestador:** `CNPJ` + `regTrib { opSimpNac=3 (Optante ME/EPP), regApTribSN? (omitir — só p/ sublimite), regEspTrib=0 }`
- **Tomador (TCInfoPessoa, opcional):** `CPF` + `xNome` bastam p/ PF; endereço opcional ✓
- **serv/cServ:** `cTribNac` (6 dígitos = **080201** ✓) · `cTribMun?` (opcional; BH usa "001" — confirmar na parametrização municipal) · `xDescServ` (até 2000 chars) · `cNBS?` (**9 dígitos**)
- **Chave de acesso NFS-e:** 50 dígitos.

## Substituição ≠ evento separado

Substituir = **enviar DPS NOVA** com grupo `subst { chSubstda (chave da original), cMotivo, xMotivo? }`.
O sistema gera automaticamente o "Cancelamento de NFS-e por Substituição" na original e emite a substituta (manual §1.3.2). `cMotivo`: 01–05 específicos, **99=Outros** (nosso caso de correção de dados).

## Cancelamento

Evento **e101101** via `POST /nfse/{chaveAcesso}/eventos` — envelope `pedRegEvento versao` > `infPedReg { tpAmb, verAplic, dhEvento (UTC c/ TZ), CNPJAutor, chNFSe, e101101 { xDesc="Cancelamento de NFS-e" (literal fixo), cMotivo, xMotivo } }` + assinatura.
`cMotivo` do cancelamento: **1=Erro na Emissão · 2=Serviço não Prestado · 9=Outros** (estorno → provavelmente 2 ou 9 — decidir no spike).
Cancelamento após prazo → fluxo de análise fiscal (e105102/104/105) — fora do escopo automático.

## Endpoints (Sefin Nacional — manual v1.2 + integradores; JSON com XML gzip+base64 dentro)

| Operação | Endpoint |
|---|---|
| Emitir (síncrono) | `POST /nfse` |
| Consultar NFS-e | `GET /nfse/{chaveAcesso}` |
| Recuperar chave por DPS | `GET /dps/{id}` (autor precisa constar na nota) / `HEAD /dps/{id}` |
| Registrar evento | `POST /nfse/{chaveAcesso}/eventos` |
| Consultar eventos | `GET /nfse/{chaveAcesso}/eventos[/{tipo}[/{seq}]]` |
| DANFSe PDF | `GET /danfse/{chaveAcesso}` (⚠️ muda jul/2026) |
| Parametrização municipal | `GET /parametros_municipais/{codMun}/convenio` · `GET /parametros_municipais/{codMun}/{codigoServico}` |

Base URLs: produção `https://sefin.nfse.gov.br/SefinNacional` · homolog `https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional` (sem credenciamento; mesmo certificado real; nota SEM validade jurídica → ok p/ local+staging).
Swagger contribuintes (homolog, requer browser/cert): `https://adn.producaorestrita.nfse.gov.br/contribuintes/docs/index.html` — o spec bloqueia curl (403); shapes JSON exatos (nome do campo do XML na requisição/resposta) serão capturados pelo script 02 imprimindo a resposta crua.

## Valores do emitente (Informach) — gabarito

- CNPJ **43.588.758/0001-03** · cLocEmi **3106200** (Belo Horizonte ✓ Anexo A — ⚠️ a pesquisa inicial dizia 3120701, ERRADO)
- `opSimpNac=3` (Simples ME/EPP) · `regEspTrib=0` · **sem destaque de ISS** (DAS) · **IBSCBS omitido em 2026**
- `cTribNac=080201` ✓ (único desdobro do 8.02 na lista nacional — Anexo B aba 1, linha 194)
- `cNBS=122051900` (**1.2205.19.00** — "Outros serviços de educação, inclusive treinamento, NCP" — Anexo B aba 2, linha 1073; alternativa avaliada: 1.2205.14.00 palestras/conferências — não se aplica)
- `cTribMun` BH: "001" no sistema antigo — **confirmar via `GET /parametros_municipais/3106200/{codigoServico}`** (script 00)
- Descrição: nome do produto + linha Lei 12.741/2012 (IBPT atualizado OU forma simplificada do Simples — decisão do contador; valores ficam em config)
- `dCompet` = data do pagamento (decisão contábil a confirmar com o contador)

## Achados adicionais (12/06, scripts prontos)

- **Lei 12.741 tem campo PRÓPRIO no leiaute:** `valores/trib/totTrib` é obrigatório com choice `vTotTrib` | `pTotTrib` | `indTotTrib=0` (não informar, Decreto 8.264/14) | **`pTotTribSN`** ("percentual aproximado do total dos tributos da alíquota do Simples Nacional") — usamos `pTotTribSN=8.24` (config `NFSE_PTOTTRIB_SN`); o texto IBPT na descrição vira opcional.
- **tribMun mínimo:** `tribISSQN=1` (tributável) + `tpRetISSQN=1` (não retido); `pAliq` NÃO se informa — BH é conveniado, a alíquota vem da parametrização municipal.
- **serv exige `locPrest`:** `cLocPrestacao=3106200` (choice município/país).
- **Tipo de Inscrição Federal no Id: 1=CPF, 2=CNPJ** (Anexo I, regra de validação literal) → Informach usa `2`.
- **Id do pedRegEvento: `PRE` + chave(50) + código do evento(6)** (Anexo II) → cancelamento = `PRE<chave>101101`.
- **Assinatura xml-crypto v6 FUNCIONA sob Bun** (smoke test com PFX autoassinado: node-forge converte, SignedXml assina, C14N inclusivo + enveloped, X509 no KeyInfo). Default rsa-sha1 (convenção NF-e), troca p/ sha256 via `NFSE_SIG_ALGO` se a Sefin rejeitar.
- Envelope JSON: requisição com `dpsXmlGZipB64` (emissão) / `pedidoRegistroEventoXmlGZipB64` (evento) são os nomes prováveis — o swagger bloqueia curl (403); o script 02/03 imprime a resposta crua p/ capturar os nomes reais e ajustar.

## Rodada REAL na Produção Restrita (12/06, certificado A1 da Informach)

- **mTLS sob Bun com o A1 real: FUNCIONA** (fetch + tls{cert,key}; PFX exportado não — chave do repositório do Windows é não-exportável; usamos o arquivo .pfx baixado da SOLUTI; senha = PIN do nome do arquivo).
- **Specs OpenAPI capturados COM o certificado** (sem cert dá 403): `spike/docs/swagger-sefin-pr.json`, `swagger-adn-danfse.json`, `swagger-adn-parametrizacao.json`, `swagger-adn-cnc.json`.
- **Base real da Sefin: `/SefinNacional`** (o `/API/SefinNacional` da página de docs NÃO é a API). DANFSe e Parametrização Municipal MORAM NO ADN: `GET https://adn.../danfse/{chave}` e `GET https://adn.../parametrizacao/{codMun}/...`.
- **Envelopes JSON confirmados pelo spec:** emissão `{dpsXmlGZipB64}` → 201 `{tipoAmbiente, versaoAplicativo, dataHoraProcessamento, idDps, chaveAcesso, nfseXmlGZipB64, alertas[]}`; eventos `{pedidoRegistroEventoXmlGZipB64}` → 201 `{..., eventoXmlGZipB64}`. Erro 400: `{..., idDPS, erros: [{Codigo, Descricao}]}` (⚠️ PascalCase nos erros; idDPS maiúsculo no erro vs idDps no sucesso).
- **Convênio BH confirmado via API:** `aderenteAmbienteNacional=1, aderenteEmissorNacional=1`.
- **Assinatura rsa-sha1 + C14N inclusivo ACEITA** (nenhum erro de schema/assinatura nas rejeições — a validação passou para regras de negócio).
- Erros reais encontrados (ordem): **E0207** CPF do tomador validado contra o cadastro REAL da Receita mesmo em homolog (CPF de teste não existe → spike emite SEM tomador; em produção os CPFs são reais; tratar E0207 como FAILED claro); **E0008** relógio local segundos à frente do servidor → `dhEmi` agora tem margem de 60s; **E0116** BH EXIGE a IM do prestador na DPS (cadastro CNC do município) → elemento `<IM>` após CNPJ, env `NFSE_IM` (PENDENTE: IM da Informach — pegar de uma nota antiga/perfil do Emissor Web; verificador "X" de BH vira "0").
- Consulta de alíquota da parametrização exige "código de serviço com nove dígitos" — formato exato não decifrado (não bloqueia: Simples não destaca ISS; alíquota é parametrizada pelo município).
- CNC do ADN só tem POST (uso municipal) — IM não é consultável por API.

## ✅ FASE 0 CONCLUÍDA (12/06) — ciclo completo validado na Produção Restrita

1. ✓ mTLS A1 sob Bun · ✓ assinatura rsa-sha1 + C14N inclusivo ACEITA · **runtime do serviço = Bun** (sem fallback Node)
2. ✓ **EMISSÃO 201**: chave `31062002243588758000103000000000000126061871788143`, nota AUTORIZADA (cStat 100), `xTribMun` resolvido = "Instrução e treinamento..." → **cTribMun 001 ACEITO**; NBS 122051900 aceito; `vLiq` correto; sem ISS destacado (Simples)
3. ✓ Recuperação `GET /dps/{id}` → 200 + Location com a chave (caminho da resposta ambígua PROVADO)
4. ✓ **CANCELAMENTO 201** (evento e101101, envelope/PRE/assinatura corretos de primeira)
5. ✓ **SUBSTITUIÇÃO 201** (nota A nº2 → nota B nº3 com `subst{chSubstda, cMotivo=99}`; sistema cancela A por substituição)
6. ✓ **DANFSe PDF 280KB** via `GET adn.../danfse/{chave}` (valida a decisão de persistir em bytea)
7. ✓ Série própria `2` aceita; numeração sequencial nossa (1,2,3 consumidos em homolog)

### Exigências de BH descobertas na prática (entram no emitter-profile)
- `<IM>13372670018</IM>` obrigatória (E0116)
- `<regApTribSN>1</regApTribSN>` obrigatório p/ opSimpNac=3 (E0166) — 1 = federais+municipal pelo SN
- dhEmi com margem de 60s (E0008, clock skew)
- Tomador: CPF é validado contra o cadastro REAL da Receita TAMBÉM em homolog (E0207) — testes de homolog emitem SEM tomador; produção usa CPF real do checkout; E0207 em prod = FAILED com erro claro
- GET de eventos na Sefin = 405 (só POST); consulta de eventos é no ADN

### Decisões do usuário (12/06)
1. **Competência (`dCompet`) = DATA DA EMISSÃO** (data atual no momento em que o worker emite), NÃO a data do pagamento — decisão do usuário.
2. **`pTotTribSN` configurável** via env `NFSE_PTOTTRIB_SN` (hoje 8,24; muda com o faturamento — atualizar a env no Railway quando o contador avisar).

### Ainda em aberto (não bloqueia Fase 1)
- Motivo padrão do cancelamento pós-estorno: 2 (Serviço não Prestado) ou 9 (Outros)?
- (Opcional) conferir uma nota real do Emissor Web lado a lado com `out/nfse.xml`

### 25/08/2026 — API do DANFSe DESLIGADA em produção (NT 008/2026) → gerador LOCAL

- Sintoma em produção: as 2 primeiras notas reais EMITIDAS com `last_error`
  "DANFSe indisponível: DANFSe respondeu 503 (text/html)" e e-mail retido.
- Sondas mTLS com o A1 real (25/08): `adn.nfse.gov.br/danfse/*` (produção) = `503 Service
  Unavailable — No server is available to handle this request` no serviço INTEIRO (incl.
  /docs/index.html); `adn.producaorestrita.../danfse/{chave-dummy}` = 404 (vivo);
  `adn.nfse.gov.br/contribuintes/*` = 200 (o ADN em si está de pé); Sefin `/DANFSe` = 501
  ("movido") desde sempre. Ou seja: NÃO é outage — é o desligamento anunciado.
- **NT 008/2026** (v1.02 de 14/07, baixada em `docs/nt-008-se-cgnfse-danfse-v1.02.pdf`):
  suspendeu a API de geração em 03/08/2026 (prazos anteriores: 01/07 → 15/07) e definiu o
  leiaute nacional "DANFSe v2.0" (Anexo I + tabela 2.4.5 com posições em cm). QR code →
  `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=` + chave (literal do item 2.4.3).
  Homolog (tpAmb=2) = "NFS-e SEM VALIDADE JURÍDICA" vermelho no cabeçalho; cancelada/
  substituída = marca d'água diagonal ≥50pt cinza K35.
- **Anatomia da chave de acesso (medida contra `out/chave-acesso.txt`)**: cMun(7) + ambGer(1)
  + tpInsc(1) + inscrição(14) + nNFSe(13) + AnoMes(4) + código(9) + DV(1) — o nNFSe é
  derivável da chave (fallback do gerador local sem XML).
- Fix implementado: `LocalDanfseRenderer` (src/infrastructure/danfse/) — ver §DANFSe LOCAL no
  CLAUDE.md. `spike:06` renderiza `out/danfse-local.pdf` do `out/nfse.xml` real p/ comparação
  visual com `out/danfse.pdf` (o PDF do próprio governo, mesma chave).
- ⚠️ Ao inspecionar PDFs com pdfjs: sem `standardFontDataUrl` o preview degrada o espaçamento
  das StandardFonts e PARECE bug do gerador (não é — abra num viewer real).
