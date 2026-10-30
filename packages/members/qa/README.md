# Imagem Members por dependências de produção

O Dockerfile recebe o contexto da raiz e usa a mesma base Bun **1.4.4 com digest**
do Auth. Os manifests completos, lock e patches ficam no estágio de instalação;
o filtro `@sistemazero/members...` instala Members e suas dependências workspace:
Core, Studio, Pinta, UI e os contratos do Arquipélago. Os fontes chegam depois da
instalação para permitir o reuso dessa camada quando apenas código muda.

`drizzle-kit` passa a dependência de produção, com o mesmo spec `^0.31.5` e a mesma
resolução **0.31.10**. O pre-deploy continua sendo
`bun run --filter @sistemazero/members db:migrate`. O comando de inicialização e o
usuário `bun` não mudam. São preservados schema, SQL/journal, scripts de bootstrap,
Schema A, Pensa, seeds, backfills e restauração. O teste de banco e o conversor
editorial local não integram a imagem.

O estágio final recebe a store `node_modules/.bun` e os links dos seis workspaces.
O cache global criado pelo instalador fica no estágio anterior. Não há remoção
manual de arquivos de dependências, nem supressão de scripts de instalação.
Studio continua necessário: Members usa seus validadores/AST, checks e exports;
Pinta fornece os contratos de assets. Este recorte não separa o subgrafo servidor
das dependências de navegador declaradas por esses pacotes.

## Build e smoke preparados (ainda não executados)

O job independente `members-image` do CI constrói esta imagem e executa o smoke
montado, sem rede nem banco. O deploy automático de staging depende desse job.
O resultado remoto ainda precisa ser observado; adicionar o job não comprova
que a imagem foi construída ou que o smoke passou.

Na raiz, em uma janela coordenada de Docker:

```powershell
docker build --progress=plain -f packages/members/Dockerfile -t sz-members-qa:closure .
docker image inspect sz-members-qa:closure --format '{{json .Size}} {{json .Id}} {{json .Config.User}}'
$qa = (Resolve-Path packages/members/qa).Path
docker run --rm --network none --read-only `
  --tmpfs /tmp:rw,noexec,nosuid,size=128m --memory 1536m --cpus 1 --pids-limit 128 `
  --cap-drop ALL --security-opt no-new-privileges `
  --mount "type=bind,source=$qa,target=/qa,readonly" `
  sz-members-qa:closure timeout 90s bun --no-env-file /qa/image-smoke.mjs
```

O smoke avalia a imagem final: imports workspace resolvidos, compilação dos grafos
reais sem executar a aplicação/operadores, CLI Drizzle real com `--help`, journal e
SQL de cada migration, seleção real das três migrations Pensa em diretório temporário
e sua remoção. A manutenção responde `/readyz` e 503 sem importar a aplicação.
Não usa banco, credencial ou serviço externo. Os arquivos QA são montados somente
na prova e não entram na imagem.

Antes de promoção ainda são necessários banco PostgreSQL exclusivo de QA com todas
as migrations atuais e replay, boot real `/readyz` com configuração válida,
comandos operacionais sob seus próprios gates e shutdown do comando final como
PID 1. Não apontar o smoke para staging/produção, nem considerar manutenção como
prova de boot normal. Uma implantação staging deve confirmar o boot da nova imagem
antes de produção. O harness Auth não substitui essas provas Members.

## Limites e medição

O lock foi regenerado com Bun 1.3.11 em `--lockfile-only --ignore-scripts` e validado
com essas flags mais `--frozen-lockfile`. O bloco de resoluções foi preservado:
nenhum pacote foi atualizado e não foi feita instalação em `node_modules`.
O build final ainda deve confirmar o filtro e os links usando o Bun 1.4.4 da imagem.

Registrar separadamente tamanho local Docker, digest de configuração/manifest e
bytes comprimidos enviados ao registry. O inventário Git e os 170 MB de contexto
de uma prova anterior não medem o tamanho desta imagem. O antigo Dockerfile
instalava o monorepo inteiro depois de `COPY . .`; isso demonstra trabalho e
invalidação de cache evitáveis, mas não atribui a um pacote específico os minutos
observados no build remoto. Não há ganho de tempo/tamanho qualificado antes do build.

A seleção CI continua conservadora: mudanças em Studio podem selecionar Members.
Esse mecanismo não foi alterado por esta redução de imagem.
