# Ensaios da nuvem causal do Pinta

O primeiro ensaio verifica a assinatura, a escrita única e a leitura do gzip pelo AWS SDK do Member Shell. O segundo percorre os handlers reais do Member Shell, Gateway HMAC, serviço Members por HTTP, PostgreSQL e MinIO. Os dois usam um bucket descartável no loopback.

## Reproduzir

Use Windows com PowerShell 7, Bun 1.3.11 e Docker Linux x64. Instale as dependências do repositório e rode da raiz do checkout.

```powershell
pwsh -NoProfile -File docs/pinta-cenarios/missao-completa-2026-11-18/qa/nuvem-causal-minio-2026-11-22/run.ps1
```

O script verifica o SHA-256 do [release oficial do MinIO](https://github.com/minio/minio/releases/tag/RELEASE.2025-09-07T16-13-09Z), sobe o serviço somente em `127.0.0.1:5578`, gera credenciais descartáveis e remove seu container ao sair. O binário e o novo log ficam em `.cache`.

O ensaio integrado usa o container PostgreSQL 16.13 de QA `pinta-causal-20261122-db` em `127.0.0.1:55553`. Deixe livres as portas 5578, 5597, 5598 e 5599. O runner usa as credenciais do container sem exibi-las. Para outra instância descartável no mesmo loopback e porta, injete `PINTA_CAUSAL_JOURNEY_DATABASE_URL` no processo com o banco exato `kids_journey_pinta_causal_bff_journey`.

```powershell
pwsh -NoProfile -File docs/pinta-cenarios/missao-completa-2026-11-18/qa/nuvem-causal-minio-2026-11-22/run.ps1 -Journey
```

O helper de QA cria o banco dedicado se necessário e aplica as migrações reais. Cada rodada gera uma conta e um perfil inéditos. O teste injeta somente a sessão de QA no listener local do Member Shell. O Gateway valida o HMAC real, encaminha requisições ao Members pela rede local e o Members persiste as unidades no PostgreSQL.

## Resultados registrados

- O preflight aceitou a origem local e os cabeçalhos `content-type` e `if-none-match`. O PUT sem condição devolveu 400, o PUT válido devolveu 200 e os reenvios iguais ou diferentes devolveram 412. O GET assinado devolveu o gzip original como anexo. [Log de armazenamento](minio.log)
- Com apenas um dos dois membros verificado, o commit devolveu 409 e o grafo continuou intacto. Com ambos os membros atestados, as duas revisões apareceram juntas. A tentativa de remapear a folha sem seu mapa consumidor também devolveu 409. A unidade completa preservou as coordenadas e os dois flags de espelhamento, com os hashes dos gzips publicados conferidos. [Log integrado](journey.log)
- A unidade inversa restaurou a folha e o mapa com novos timestamps e gzips recomprimidos. A remoção posterior de uma camada por ID produziu o atestado `detached` e publicou o mapa com a camada restante. [Log integrado](journey.log)

O [índice](artefatos.json) fixa as versões, os hashes e as fontes testadas. O CORS e o armazenamento Cloudflare R2 de homologação permanecem por qualificar.
