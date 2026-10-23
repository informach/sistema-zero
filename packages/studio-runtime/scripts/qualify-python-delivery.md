# Conferir a entrega pública da distribuição Python

Este operador é somente leitura. Usa o plano canônico **da implantação real**,
com SHA fornecido explicitamente; reconfere os arquivos locais antes de fazer
qualquer GET. Não ativa catálogo, altera credenciais nem cria projetos.

Na raiz do repositório, escolha caminhos novos. Compile com o Bun fixado pelo
lockfile e execute o bundle com **Node 24 ou superior**. O HTTP nativo preserva
os bytes gzip; não substituir por fetch com descompressão automática.

```powershell
bun build packages/studio-runtime/scripts/qualify-python-delivery.ts --target=node --format=esm --outfile=.cache/delivery-operador-NOVO.mjs
node .cache/delivery-operador-NOVO.mjs --environment staging --plan CAMINHO_PLANO_CANONICO.json --expect-plan-sha256 SHA_CONFERIDO --out .cache/delivery-prova-NOVA
```

Os placeholders são deliberadamente inválidos. Produção exige `--environment
production` e um plano canônico desse ambiente; não há destino padrão. O
diretório de saída deve ser novo. O recibo `RUNNING` é reservado antes da rede;
o resultado final é `PASSED` ou `FAILED`, com fase pública e erro sanitizado.
Interrupção externa pode deixar `RUNNING`, que nunca é aceite.

A prova confere metadata, todos os arquivos públicos, MIME e tamanho/SHA/ETag exatos,
representações gzip em bytes brutos, `HEAD`, `304`, ocultação dos artefatos
internos gzip, `no-store` nos HTML e as origens exatas de `frame-ancestors`.
Cada leitura tem orçamento de bytes e prazo; as conexões próprias são fechadas
antes de devolver resultado. Não segue redirecionamentos nem envia token.

O wrapper de teste usa sete controles em um subprocesso Node com servidor HTTP
local próprio, incluindo corrupção gzip, MIME incorreto, origem inesperada, resposta excessiva
e cancelamento com corpo aberto. Esse teste é contrato local, não leitura da
Cloudflare. O recibo remoto também não qualifica autenticação do aluno,
execução/publicação de jogos, Mural/remix, áudio audível ou desempenho.
