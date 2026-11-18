# Verificação do Pinta — revisão de 18/11/2026

**Estado: revisão verificada, missão parcial e release bloqueado pela issue 026.**
O bloco de perda local foi reproduzido e permanece aberto; testes aprovados não o resolvem.

Base inicial: `origin/staging` em `567b93f95`; segundo fetch integrado sem conflitos até
`42b395d93`, branch isolada `pinta-full-review-20261118`. Os gates finais foram reiniciados
na árvore integrada; a execução anterior interrompida não é apresentada como suíte completa.
Não foram alterados os arquivos de Molda Cenários 3D. A missão completa permanece parcial;
consulte a [matriz](../cobertura.md), não apenas a conclusão dos incrementos anteriores.

## Ambientes

- Windows, PowerShell, Bun 1.3.11; builds de produção dos playgrounds com Vite.
- Navegador Chromium do Playwright: desktop e Pixel 7 emulado com toque. Versão e dimensões
  efetivas acompanham os artefatos do ensaio final. Não são aparelhos físicos.
- Python 3.13.17, pygame-ce 2.5.8 e SDL 2.32.10; driver SDL `dummy`, com surfaces e física reais.
- Tiled 1.12.2: executável Windows, leitura/reexportação por CLI, plataforma Qt `windows`.
- Godot 4.7.2: importação e execução nativas `--headless`. Não houve validação visual com GPU.
- Phaser 3.90.0: arquivo oficial incorporado no pacote, hash/licença conferidos; HTTP local.

## Ensaios funcionais comprovados

| Fluxo | Prova | Limite |
|---|---|---|
| Pinta: importar Vila, editar, desfazer/refazer, baixar, fechar/reabrir e mover o personagem | Playwright pelo arquivo de entrada, botões, canvas, backup baixado e armazenamento real do playground; desktop e toque | Não cria livremente 16 camadas: a fixture importada já possui 18 |
| Phaser portátil | Pacote real servido por HTTP, pixels do personagem/frente/água animada, movimento, paredes, objetos e portas nos dois sentidos | Desktop e viewport móvel emulado; os controles do exemplo são de teclado, sem alegação de controle por toque |
| Estúdio Jogo 2D e Avançado | Dois exemplos da Vila criados pela galeria, primeiro quadro e controles no Chromium, com diagnósticos estritos de rede/console | Exemplos locais; não é envio/atualização autenticados a partir da biblioteca |
| Pygame portátil e PNG v2 | `check:homologacao --exigir-pygame`, comparação de cenas e pixels, portas nos dois sentidos | SDL sem janela física; não valida todo projeto Pygame externo |
| API Python do Estúdio | `test-pinta-module.py` nativo e `--sem-pygame` | Teste de módulo, sem Pyodide autenticado no navegador |
| PyDew Valley | Jogo real: 60 passos de 1/60 s, mapa de 16 camadas, 349 obstáculos e 55 cores na captura | Não é medição de 60 FPS nem ensaio de todas as mecânicas da fazenda |
| Tiled | TMX dos dois mapas aberto e reexportado no executável; cena completa comparada com `maps.json`; sem diferenças/avisos após normalizar alfa opaco | CLI, não edição manual da interface do Tiled; somente o subconjunto documentado |
| Bloqueio de camada no Tiled | JSON → TMX → JSON no executável, `locked: true` preservado, reimportação Pinta sem avisos | Fixture complementar, sem alterar a Vila oficial |
| Godot | Importação e script de QA: 18 camadas, IDs de instâncias, referências, origem afim, animação, movimento, colisão da casa e portas | Sem GPU; não prova todos os formatos de geometria, versões de Godot ou hardware |

O teste Godot inicialmente mostrou `18 in [18.0] == false`, zero polígonos da parede e
personagem atravessando a casa. Com a normalização na fronteira, a mesma peça tem polígono
e o personagem para em x=74.79642. O teste é integrado ao comando de homologação quando
`GODOT` está configurado; `--exigir-godot` impede contar ausência do motor como sucesso.
O comportamento numérico é descrito em [JSON no Godot](https://docs.godotengine.org/en/stable/classes/class_json.html)
e a conversão usa [PackedInt32Array](https://docs.godotengine.org/en/stable/classes/class_packedint32array.html).

### Leitor anterior e perda de precisão

O [reprodutor](probe-legacy-format.ts) extrai com `git show 567b93f95` o projeto, sua
configuração e o serializador anteriores; não simula o sanitizador. O [resultado](formato-legado.json)
mostra que forçar schema 4 aceitava 16,5/0,25 e devolvia 17/ausente com o mesmo carimbo.
O leitor real recusa mapa, conjunto e arquivo 5. Os backups ricos inteiros 4, só de camadas
3 e legados 1 mantêm seus bytes. O cliente de nuvem anterior declara 3 e recusa a nova versão 4.

```powershell
bun docs/pinta-cenarios/revisao-2026-11-18/qa/probe-legacy-format.ts
```

## Comandos reproduzíveis

```powershell
# Arquivos de homologação e ensaio real do Tiled (instale o executável separadamente):
bun packages/pinta/scripts/homologacao/generate.ts .tmp/pinta-cenarios
# tiled --export-map json <mapa.tmx> <mapa.json>, para cada mapa do pacote
bun packages/pinta/scripts/homologacao/verify-tiled.ts .tmp/pinta-cenarios/tiled

# Configure PYTHON e GODOT com os executáveis instalados; não são baixados pelo teste:
bun packages/pinta/scripts/homologacao/check.ts --exigir-pygame --exigir-godot
python -I -B packages/studio/scripts/python/test-pinta-module.py
python -I -B packages/studio/scripts/python/test-pinta-module.py --sem-pygame
python -I -B packages/pinta/scripts/homologacao/test-pydew-pinta.py .tmp/pydew.png

# Harness existente, builds de produção próprios (na pasta packages/studio):
bun run test:e2e:pinta-scenes
```

O Playwright inicia Pinta e pacote Phaser em portas próprias; não usa banco de produção ou
interceptações para substituir as funcionalidades exercitadas. O CI ganhou o comando de
navegador e o ensaio nativo do PyDew. Isso descreve a configuração; não afirma que um job
remoto já executou esta branch.

## Bloqueios e limites de aprovação

- A falha inicial de `sprites.png` externo/ORB foi corrigida no remoto em `0b169f837`,
  integrado por `42b395d93`. A repetição dos dois exemplos da Vila passou sem afrouxar
  diagnósticos nem mockar a rede. [Issue 018](../../../../.compozy/tasks/pinta-full-review-20261118/reviews-001/issue_018.md).
- O Biome global do Estúdio já reprova 13 formatos de fixtures de aulas protegidas, sem
  alterações nesta branch. O mesmo arquivo obtido de `origin/staging` reprova pelo stdin;
  os arquivos alterados nesta revisão são verificados separadamente.
- 686 testes do Members foram pulados na execução integrada (2.305 aprovados), incluindo cenários
  que dependem de serviços/configuração não presentes. Testes pulados não contam como prova.
- Não foram executados o ciclo autenticado entre Pinta/Estúdio na plataforma implantada,
  conflito entre dois aparelhos físicos, rollback de frota, visualização Godot com GPU ou
  ensaios em celulares/notebooks reais. A importação de uma fixture não substitui autoria
  ampliada, carregamento incremental ou benchmark de memória.

### Bloqueio de segurança local independente

A [issue 026](../../../../.compozy/tasks/pinta-full-review-20261118/reviews-001/issue_026.md)
reproduz perda **sem nuvem** com o gravador real anterior. Uma aba guarda RAM4; o código
novo confirma documento5 com offset2,5; a aba antiga salva RAM4 na mesma chave; reabrir
com o código novo devolve4, sem offset e sem checkpoint/cópia. A recusa da leitura fria5
funciona, mas não impede uma gravação da RAM já aberta. O espelho de nuvem 025 protege o
canônico na conta; não adiciona autoridade versionada ao IndexedDB independente.

```powershell
bun docs/pinta-cenarios/revisao-2026-11-18/qa/repro-local-only-026.ts
# 1 pass; 12 assertivas: o teste confirma a perda existente, não uma correção.
```

O [resultado](local-only-026.json) e o reprodutor preservam a distinção. A correção exige
autoridade local, CAS/assinatura, checkpoint e espelho na mesma transação, cópia de conflito,
quota, tombstone e capacidades futuras; os critérios completos estão na issue. Não foi
introduzido um journal parcial para mascarar o problema. Este PR é draft e não aprova release.

## Gates locais

Os [32 gates finais](gates.json) registram comando, pacote, horário UTC, saída, resumo e
SHA-256 do log. Há 31 saídas zero; o lint global do Estúdio sai1. Cada linha usa a execução
final correspondente; tentativas anteriores ficam separadas em `earlierAttempts`, sem somar
suas contagens. Os [hashes dos artefatos](artefatos.json) incluem capturas e saídas do Tiled.
Os logs integrais permanecem em `.tmp`, com hashes registrados; não são anexados como megabytes
de saídas geradas ao repositório. A execução mais recente encerrou em 18/11/2026, 11:16:58 UTC.

| Pacote | Lint (exit; avisos) | Tipos | Testes aprovados / pulados / falhas |
|---|---|---|---|
| core | 0; zero | 0 | 3.096 / 0 / 0 |
| pinta | 0; cinco preexistentes | 0 | 2.024 / 0 / 0; scripts: 27 / 0 / 0 |
| studio | 1; 13 erros de formatação e 19 avisos | 0 | 11.415 / 4 / 0, soma dos 162 processos isolados, 852 arquivos |
| member-shell | 0; nove avisos | 0 | 2.479 / 0 / 0 |
| community-kids | 0; dois avisos | 0 | 1.698 / 0 / 0 |
| members | 0; quatro avisos | 0 | 2.305 / 686 / 0 |

Os 72 arquivos de código alterados/reprodutores passam no Biome sem avisos. O lint global
não foi afrouxado: a fixture obtida diretamente de HEAD também reprova por stdin e não há
diff das aulas protegidas. A instalação isolada exigida pelo CI (`npm ci --ignore-scripts
--no-audit --no-fund --prefix packages/studio-runtime/runtime`) corrigiu a dependência Vite
ausente antes de repetir **toda** a suíte do Estúdio. Uma falha de porta do ensaio de mídia
foi repetida em porta livre; nenhum processo de outra sessão foi encerrado.

No navegador: quatro casos Pinta/Phaser, dois exemplos da Vila e um caso de mídia Blockly
passaram, com builds de produção. O exemplo Phaser usa teclado também no viewport móvel;
o ensaio Pinta usa taps/controles de toque no projeto móvel. Avisos CLI de cores, tamanho de
chunks e importação dinâmica permanecem nos logs; não são alegados como saída sem avisos.
Os geradores TS/Python, galeria e hash/licença Phaser também passam. CI remoto não foi ensaiado.

```text
VERIFICATION REPORT
-------------------
Claim: aprovação integral da missão e prontidão para release
Command: gates locais de gates.json + repro-local-only-026.ts + matriz R01–R33
Executed: 18/11/2026, após correções e integração 42b395d93
Exit code: lint studio=1; demais gates finais=0; repro026=0 confirma defeito
Output summary: 19 requisitos implementados, 13 parciais, 1 pendente; issue026 aberta
Warnings: avisos globais e de build registrados acima; testes pulados não são aprovação
Errors: 13 erros de formatação de baseline; perda local-only reproduzida
Verdict: FAIL
```

O resultado autoriza revisar os commits e suas provas em PR draft. Não autoriza afirmar
missão concluída, compatibilidade universal, desempenho físico, merge ou implantação.
