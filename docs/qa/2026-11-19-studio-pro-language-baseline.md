# Linha de base: serviço de linguagem Pro com 60 arquivos

Fixture sintética de análise, não jogo de homologação F. São 19.197 bytes:
configuração, estado tipado, 57 módulos de atualização e um entrypoint que
os importa. Não inclui npm, materiais, Monaco, transporte do worker,
WebContainer, navegador, jogo ou Zappy. Não comprova a meta de digitação.

O script [`measure-pro-modular.ts`](../../packages/studio/scripts/measure-pro-modular.ts)
usa o serviço TypeScript real do Estúdio, diagnostica todos os arquivos,
mede edições no corpo de uma função e consulta referências, renomeação da
declaração exportada e símbolos. Após a medição altera o tipo em uma
dependência, exige que o consumidor acuse TS2322, repara o tipo e exige que
o erro desapareça. São três aquecimentos e 30 amostras por operação.
Nenhum arquivo de aluno é aberto ou alterado.

Renomear o alias local de um import não é o mesmo que renomear a declaração
exportada. O ensaio usa a segunda para verificar edições em mais de um
arquivo, preservando a semântica do serviço oficial.

## Resultado local

Windows, Ryzen 5 5600G, 12 processadores lógicos, 32 GiB, Bun 1.3.11,
TypeScript 5.9.3. O recibo integral, com hash da fixture e leituras de
memória, está em [`pro-language-baseline.json`](2026-11-19-studio-pro-language-baseline.json).
Sem trace e sem GC forçado; não comparar diretamente com o navegador ou
outro aparelho. As leituras pontuais de memória não comprovam descarte
nem vazamento, e não medem o worker de produção.

| Operação (ms) | p50 | p95 | Máximo |
| --- | --- | --- | --- |
| Atualização da fonte → diagnóstico | 11,76 | 25,56 | 45,30 |
| Referências entre arquivos | 0,62 | 1,28 | 1,30 |
| Consulta de renomeação exportada | 1,17 | 6,40 | 11,60 |
| Símbolos do entrypoint | 0,30 | 0,63 | 0,76 |

Carregamento das bibliotecas: 12,82 ms. Criação de um serviço novo e
análise inicial dos arquivos: 626,80 ms, medida separadamente. Isso não é
abertura fria da IDE. É um ponto de partida reproduzível para a análise
incremental, sem otimização ou redução de diagnósticos nesta rodada.

Verificações: a medição concluiu com as três checagens funcionais ativas;
os sete testes existentes do serviço de linguagem passaram (16 asserções);
TypeScript estrito do script e Biome passaram. Foi acrescentada coleta à
matriz Linux/Windows da CI, sem tratar os números como limites universais.
Essa nova coleta ainda precisa do resultado de uma execução que a inclua.

```powershell
cd packages/studio
bun --no-env-file scripts/measure-pro-modular.ts --output=.cache/mission/pro-modular-language.json
```

Próximo recorte necessário: projeto real modular com editor, serviço no
worker, prévia e Zappy simultâneos, navegação, alterações externas no FS,
conflitos e descarte. Essa homologação continua pendente.
