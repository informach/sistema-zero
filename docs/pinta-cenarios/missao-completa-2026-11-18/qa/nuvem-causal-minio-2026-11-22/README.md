# Ensaio de armazenamento da nuvem causal do Pinta

O ensaio usa o AWS SDK do Member Shell e um servidor MinIO executado em Docker no loopback. O servidor recebe o preflight HTTP, o PUT que o navegador receberia e os GETs autenticado e assinado. O teste confere o gzip com o leitor de produção.

## Reproduzir

Use Windows com PowerShell 7, Bun e Docker em modo Linux x64. Instale as dependências do repositório antes de rodar. Execute da raiz do checkout.

```powershell
pwsh -NoProfile -File docs/pinta-cenarios/missao-completa-2026-11-18/qa/nuvem-causal-minio-2026-11-22/run.ps1
```

O script baixa a versão indicada no [release oficial](https://github.com/minio/minio/releases/tag/RELEASE.2025-09-07T16-13-09Z), confere SHA-256 antes da construção e inicia o serviço somente em `127.0.0.1:5578`. O bucket e as credenciais são descartáveis. A execução remove o container e restaura as variáveis de ambiente. O binário e o novo log ficam em `.cache`.

## Resultado registrado

- O preflight aceitou a origem `http://127.0.0.1:5577` e os cabeçalhos `content-type` e `if-none-match`.
- O PUT sem `If-None-Match` devolveu 400 e o objeto continuou ausente. O PUT válido devolveu 200. Os reenvios com os mesmos bytes e com bytes diferentes devolveram 412.
- A leitura autenticada recuperou o gzip e o manifesto esperado. O segundo PUT do servidor na chave selada devolveu a recusa esperada.
- O GET assinado devolveu o arquivo como anexo. Seu SHA-256 coincidiu com o SHA-256 antes da selagem.

O [log da execução](minio.log) registra 19 asserções. O [índice](artefatos.json) fixa as versões, os hashes dos arquivos e as fontes testadas. O CORS do bucket Cloudflare R2 de homologação permanece por qualificar.
