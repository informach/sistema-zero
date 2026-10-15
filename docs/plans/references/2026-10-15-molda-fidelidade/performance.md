**Molda — comparação de desempenho da oficina, 15/10/2026**

A comparação usou o commit anterior `7981caf7a4fb6773ebb804405bf7ad6f6551814f` e o código implementado, ambos em builds de produção. Máquina: Windows 11 Pro, Ryzen 5 5600G, 15,8GiB de RAM. Navegador: Chromium 148.0.7778.96 do Playwright, 1440×900. O renderer reportou **ANGLE/SwiftShader: renderização por software**, não a GPU Radeon. Os números não certificam desempenho em dispositivos físicos nem garantem 60fps.

Foram usados os mesmos documentos de quatro e 128 peças, sem animação, com geometria e materiais compartilhados. Os hashes SHA-256 aparecem nos resultados. O script aquece o gesto e mede quatro arrastos da câmera de 80 passos; as capturas anterior/posterior precisam diferir. O intervalo de `requestAnimationFrame` inclui renderização, compositor e instrumentação do navegador. Confirmação/cancelamento são medições separadas do domínio e histórico no Bun 1.3.11, sem React/GPU: 20 aquecimentos, 60 prévias e 30 amostras de cada encerramento, verificando restauração exata do documento, exceto o carimbo de edição.

| Cena | Versão anterior, p50/p95 de quadro | Implementação antes da otimização | Somente cache de sombras | Estado final: cache + receptor delimitado |
|---|---|---|---|---|
| 4 peças | 16,7 / 16,8ms | 33,4 / 50,0ms | 33,3 / 33,4ms | 16,7 / 33,4ms |
| 128 peças | 16,7 / 16,8ms | 50,0 / 66,7ms | 33,3 / 50,0ms | 16,8 / 33,4ms |

O referencial anterior nesta tabela é da rodada final. A primeira rodada teve p95 de 33,4ms na cena anterior de 128 peças; os JSONs conservam essa variação. São amostras locais, não uma estimativa estatística de toda a população de dispositivos.

Foram removidos dois custos identificados: recalcular o mapa de sombras quando só a câmera muda e executar o shader de sombra sobre uma superfície desnecessariamente grande. O mapa continua sendo recalculado em mudanças de conteúdo, pose, visibilidade, quadro de imagem e restauração de contexto. O receptor usa a projeção dos limites dos sólidos pela direção da luz e margem para filtro/bias. A resolução de 2048², o filtro, as cores e a opacidade permanecem iguais; as 15 comparações visuais passaram com as referências originais da implementação. O estado final ainda tem p95 maior que a versão anterior sem essas sombras no renderer por software; essa diferença é registrada, não tratada como ganho universal.

| Cena | CPU da prévia, p50/p95 anterior → final | CPU de confirmar, anterior → final | CPU de cancelar, anterior → final |
|---|---|---|---|
| 4 peças | 0,091/0,158 → 0,062/0,083ms | 0,036/0,082 → 0,021/0,040ms | 0,003/0,012 → 0,002/0,014ms |
| 128 peças | 0,738/1,481 → 0,734/0,964ms | 0,297/0,610 → 0,274/0,533ms | 0,003/0,009 → 0,003/0,006ms |

Esses tempos de CPU são pequenos e sujeitos a ruído. Não são latência de ponta a ponta do clique até a imagem. A comparação não cobre o limite máximo de todos os tipos de cena; os orçamentos máximos de animação e pintura têm provas próprias no acompanhamento. Prioridade da correção de sombras: impacto 5 × confiança 5 / esforço 2 = 12,5; evidência de correção: testes de invalidação e projeção, capturas iguais e repetição da medição.

Resultados brutos: [primeira medição](performance-before.json), [cache de sombras](performance-shadow-cache.json), [estado final](performance-final.json).

**Reprodução.** Os scripts são `packages/molda/scripts/profile-workshop.ts` e `profile-workshop-browser.mjs`. Bun executa o domínio TypeScript; o processo Node executa o driver Playwright, recebendo os documentos por JSON na entrada padrão, sem shell intermediário. A versão anterior foi extraída por `git archive`, sem alterar o checkout de trabalho:

```powershell
# Na raiz do repositório:
New-Item -ItemType Directory -Force packages/molda/.cache/perf-baseline
git archive --format=tar --output=packages/molda/.cache/perf-baseline.tar 7981caf7a4fb6773ebb804405bf7ad6f6551814f packages/molda packages/ui/src/styles
tar -xf packages/molda/.cache/perf-baseline.tar -C packages/molda/.cache/perf-baseline
# Em terminais separados, iniciar scripts/serve-e2e.ts em cada pacote:
# versão anterior: packages/molda/.cache/perf-baseline/packages/molda, E2E_PORT=5202
# versão atual: packages/molda, E2E_PORT=5205
# Com ambos disponíveis, dentro de packages/molda:
bun scripts/profile-workshop.ts .cache/perf-baseline/packages/molda http://127.0.0.1:5202 http://127.0.0.1:5205
```

A política de atualização usa a API pública documentada de [LightShadow](https://github.com/mrdoob/three.js/blob/dev/docs/pages/LightShadow.html), conferida também no código instalado do Three.js. As provas locais estão em `SceneViewport.test.ts` e `SceneGround.test.ts`: navegação reaproveita a sombra, alterações pertinentes invalidam, e todos os cantos projetados cabem no receptor em peças apoiadas, suspensas e abaixo da origem.
