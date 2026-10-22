# Reprodução da distribuição Python de 21/10/2026

Este procedimento reproduz e verifica a distribuição `65c9bffd3e97d71e22bbaaf2f2dd29fbf10ee80759ad56423c0e3e4b82af022c` em outro checkout. O descritor esperado de 41 arquivos já está em `deployment.distribution` no [plano canônico da candidata](../superpowers/plans/2026-10-21-python-audio-2-candidate/canonical-plan.json). O caminho absoluto registrado naquele plano pertence à máquina original; o novo comando não o utiliza nem altera o documento histórico.

Reprodução de bytes não substitui testes funcionais, medições de desempenho, recibos de testes ausentes ou aprovação de implantação. Os comandos abaixo não sobem serviços, executam código de aluno, publicam artefatos, alteram catálogo, promovem releases ou usam credenciais de provedores. O build da biblioteca padrão, quando necessário, executa o compilador CPython/WASM fixado como ferramenta de construção.

## Reprodução e cópia remota conferidas em 22/10

Foram executadas duas reconstruções neste checkout Windows: a primeira reutilizou
somente a stdlib preparada, depois de conferir seu pin; a segunda compilou a stdlib
dos sete inputs originais verificados, usando Node 24.22.0. Ambas produziram o SHA
`65c9bffd3e97d71e22bbaaf2f2dd29fbf10ee80759ad56423c0e3e4b82af022c`, com os 41
arquivos idênticos ao descritor versionado. O [recibo público desta reprodução](2026-10-22-python-reproduction-receipt.json)
registra os inputs, horários, ferramentas e arquivos, sem caminhos pessoais.

Há uma cópia adicional no [rascunho da transferência](https://github.com/informach/sistema-zero/releases/tag/untagged-bfeaa5a58dc774a45fc5),
acessível por uma conta autorizada ao repositório. O ZIP novo tem **12.685.507 bytes**,
SHA-256 `5418f61888e2d9482421345015c0a47c011524d74e544e7f0462c33eec4e5bbd` e contém
os 41 payloads, `distribution.json`, resumo desta reprodução e instruções.
Os 41 arquivos foram conferidos também dentro do ZIP. Após o upload, o ZIP foi
baixado novamente e seu tamanho/SHA conferidos. O pacote antigo permanece intacto.

Para usar a cópia pronta após atualizar este código:

```powershell
gh release download studio-python-handoff-20261021 --repo informach/sistema-zero --pattern 'studio-python-audio-2-65c9bffd-20261022.*' --dir .cache/python-audio-2-transfer
Get-FileHash .cache/python-audio-2-transfer/studio-python-audio-2-65c9bffd-20261022.zip -Algorithm SHA256
Expand-Archive -LiteralPath .cache/python-audio-2-transfer/studio-python-audio-2-65c9bffd-20261022.zip -DestinationPath .cache/python-audio-2-extracted
bun --no-env-file packages/studio/scripts/reproduce-python-runtime.ts verify --directory .cache/python-audio-2-extracted/studio-python-audio-2-65c9bffd-20261022/65c9bffd3e97d71e22bbaaf2f2dd29fbf10ee80759ad56423c0e3e4b82af022c
```

Confira o SHA acima antes de extrair. Escolha diretórios novos, sem sobrescrever uma
tentativa anterior. O ZIP não contém credenciais nem os recibos históricos de
navegador ausentes; não fecha F1/F3 ou implantação. A reprodução abaixo continua
disponível para quem preferir obter apenas inputs oficiais e reconstruir.

## Pré-requisitos

- Checkout contendo o comando e os fontes da candidata. O recibo original cita o fonte `e1c5fb092`; alterações posteriores no código que entra no bundle podem impedir a reprodução. O SHA esperado permanece fixo.
- Bun **1.3.11**; dependências do `bun.lock` instaladas com `bun --no-env-file install --frozen-lockfile`. A derivação canônica exige esbuild **0.28.1**.
- Node **24+** disponível para compilar a biblioteca padrão quando não houver ZIP preparado. A reprodução conferida usou 24.22.0; o resultado precisa corresponder ao mesmo pin, independentemente do executável escolhido.
- Fontes com finais de linha LF conforme `.gitattributes`. Não converter os arquivos copiados ao runtime nem regravar o descritor para acomodar diferenças.
- Admitir **um build por vez**, sem navegador, Docker, builds de aplicação ou typechecks concorrentes. Verificações de hashes são etapas separadas e leves.

Execute na raiz do checkout. `--no-env-file` evita carregar os arquivos locais de configuração da aplicação.

## 1. Obter e conferir os inputs

Em um clone novo, obtenha somente os sete arquivos de origem fixados no [manifesto vendor](../../packages/studio/src/runtime/python/vendor-manifest.json):

```powershell
bun --no-env-file packages/studio/scripts/reproduce-python-runtime.ts fetch-vendor --vendor .cache/python-reproduction-vendor
bun --no-env-file packages/studio/scripts/reproduce-python-runtime.ts verify-inputs --vendor .cache/python-reproduction-vendor
```

`fetch-vendor` é a única etapa deste procedimento que acessa a rede: usa as URLs oficiais com versões fixadas, recusa redirecionamentos, limita cada resposta ao tamanho declarado e confere SHA-256 antes de gravar. Um cache existente corrompido é erro; o comando não o substitui silenciosamente.

Também é possível usar um diretório vendor existente. `verify-inputs --vendor CAMINHO` confere todos os sete arquivos antes do build. Não usar uma distribuição pronta como diretório vendor: os loaders e a biblioteca padrão dela são derivados, diferentes dos inputs originais.

Opcionalmente, reutilize um `python_stdlib.zip` preparado **somente** após esta verificação:

```powershell
bun --no-env-file packages/studio/scripts/reproduce-python-runtime.ts verify-inputs --vendor .cache/python-reproduction-vendor --stdlib C:/artefatos/python_stdlib.zip
```

O ZIP preparado precisa ter **7.066.273 bytes** e SHA-256 `afc02bfca854c42376d79358e1c808da58c49801de3b0e9e8b16e01b3a4d9b1a`, conforme [stdlib-manifest.json](../../packages/studio/scripts/python/stdlib-manifest.json). Sem `--stdlib`, o builder canônico produz esse ZIP a partir dos inputs verificados e confere o mesmo hash.

## 2. Build serial explícito

Após admitir os recursos, escolha um diretório de saída **novo**:

```powershell
bun --no-env-file packages/studio/scripts/reproduce-python-runtime.ts build --vendor .cache/python-reproduction-vendor --output .cache/python-reproduction-audio-2-run1
```

Para reutilizar o ZIP preparado verificado, acrescente `--stdlib C:/artefatos/python_stdlib.zip`. O comando cria cópias privadas dos inputs, preservando o cache original, e chama `buildPythonRuntimeDistribution`; não existe um segundo builder. O diretório de saída existente é recusado, inclusive após uma tentativa falha. Use outro nome para repetir.

O resultado esperado fica em:

```text
.cache/python-reproduction-audio-2-run1/
  distributions/65c9bffd3e97d71e22bbaaf2f2dd29fbf10ee80759ad56423c0e3e4b82af022c/
    distribution.json
    ... os 41 arquivos declarados ...
  reproduction.json
```

O recibo novo registra hora, plataforma, arquitetura, Bun, pins dos inputs e o resultado observado. Somente recebe `status: verified` depois de conferir todos os arquivos e as representações gzip com o mesmo verificador usado na promoção. Esse recibo pertence à reprodução atual, não à qualificação histórica.

Diferenças de Bun, sistema operacional, diretório de trabalho, fontes ou empacotamento podem mudar bytes. O build termina com erro se obtiver outro SHA, informa a identidade encontrada e conserva os arquivos para análise. **Não renomear a pasta encontrada para o hash esperado, não alterar o pin e não editar o plano histórico.**

## 3. Verificar uma cópia ou download posterior

```powershell
bun --no-env-file packages/studio/scripts/reproduce-python-runtime.ts verify --directory .cache/python-reproduction-audio-2-run1/distributions/65c9bffd3e97d71e22bbaaf2f2dd29fbf10ee80759ad56423c0e3e4b82af022c
```

A verificação é offline: valida o descritor canônico, todos os tamanhos e hashes, caminhos sem links simbólicos e a equivalência entre gzip e arquivo lógico. Apenas ter um `distribution.json` correto não basta. Para compartilhar em outro local, preservar a árvore inteira e executar novamente este comando após obter a cópia. Upload e verificação remota são operações separadas, com autorização e recibo próprios; este procedimento não as executa.

## Validação do comando

```powershell
bun --no-env-file test packages/studio/scripts/python/reproduction.test.ts
bun --no-env-file test packages/studio-runtime/tests/python-promotion.test.ts
```

Os testes sintéticos verificam sintaxe, pins, adulteração, arquivos ausentes e preservação de evidência anterior. Não compilam a distribuição nem demonstram a reprodução do SHA alvo. Registrar separadamente a execução real do passo 2 e sua comparação, sem inferir sucesso dos testes unitários.
