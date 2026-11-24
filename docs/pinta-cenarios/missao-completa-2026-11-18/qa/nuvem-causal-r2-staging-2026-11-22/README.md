# Cloudflare R2 de homologação

O ensaio usou o bucket privado `testes-ugc`, confirmado na configuração de staging do Railway. As políticas CORS foram lidas pelo SDK. O runner abriu o Chrome com perfis efêmeros e navegou para as páginas públicas de login das comunidades adulta e infantil. Cada contexto permitiu a navegação no próprio domínio e o tráfego para os objetos descartáveis do ensaio. O teste usou as funções de assinatura, leitura, selagem e remoção do Member Shell e o decodificador nativo do Pinta.

| Origem | Preflight direto e assinado | PUT sem condição | PUT no Chrome | Selo repetido | GET no Chrome |
| --- | --- | --- | --- | --- | --- |
| Adulta | 204 / 204 | 403 | 200 / 412 / 412 | Recusado | 200 |
| Infantil | 204 / 204 | 403 | 200 / 412 / 412 | Recusado | 200 |

A origem sintética não autorizada recebeu 403. Os GETs recuperaram o mesmo gzip de 265 bytes que o servidor admitiu e selou. A resposta HTTP assinada incluiu o cabeçalho de anexo esperado. As quatro chaves descartáveis foram removidas e conferidas como ausentes pelo SDK. [Resultado sanitizado](resultado.json)

O ensaio qualifica o armazenamento e o CORS ao vivo nas duas origens. A jornada autenticada da galeria e as rotas candidatas continuam sendo verificadas separadamente. [Prova HTTP local da unidade causal](../nuvem-causal-minio-2026-11-22/README.md)

## Reproduzir

Use PowerShell 7, Bun 1.3.11, Node 24, Railway CLI autenticada para staging, dependências instaladas e Chrome disponível. Os comandos partem da raiz do repositório.

```powershell
node packages/member-shell/qa/pinta-causal-r2-staging.mjs
```

O comando sem argumentos lê o CORS e faz preflight. Para o ensaio de escrita autorizado, compile as funções do checkout e use a opção explícita.

```powershell
bun build packages/member-shell/qa/pinta-causal-r2-entry.ts --target=node --conditions=react-server --outfile packages/member-shell/.cache/pinta-causal-r2-entry.mjs
node packages/member-shell/qa/pinta-causal-r2-staging.mjs --probe
```

O runner confere o projeto, ambiente, serviço e bucket esperados antes de prosseguir. As credenciais são lidas em memória, as URLs assinadas expiram em 120 segundos e as escritas usam quatro chaves exatas sob um prefixo aleatório de QA. A limpeza usa somente essas chaves. Não há alteração de política, implantação, sessão autenticada ou acesso a dados de usuários.

[Fontes e índices de integridade](artefatos.json) · [Documentação oficial do CORS](https://developers.cloudflare.com/r2/buckets/cors/) · [Operações condicionais do R2](https://developers.cloudflare.com/r2/api/s3/conditional-operations/)
