# Evidências da auditoria do Arquipélago

Data: 30/10/2026. Base: `f7bee3d3a`. Nenhuma alteração de implementação.

## Ambiente e escopo

- Worktree isolado: `C:\Users\tocha\projects\sistema-zero-auditoria-20261030`.
- Dependências instaladas pelo lockfile, com `bun install --offline --ignore-scripts --frozen-lockfile`.
- Playground local com plataforma falsa e porta livre escolhida pelo próprio verificador.
- Chrome em modo headless com `--use-angle=swiftshader --enable-unsafe-swiftshader`.
- Computador: 1280 × 720, movimento normal.
- Celular emulado: 390 × 844, toque, preferência de movimento reduzido.
- Qualidade leve. Não é uma medição de GPU física nem uma sessão autenticada da plataforma.

## Testes novos

| Execução | Resultado |
| --- | --- |
| Jogo, `bun test` | 1.220 passaram, 1 ignorado, 0 falharam; 144.132 expectativas |
| Contratos, `bun test` | 195 passaram, 0 falharam; 8.261 expectativas |
| API, `bun test tests/unit` | 92 passaram, 0 falharam; 224 expectativas; sem banco |
| Conteúdo, `bun test docs/desafios-do-jogo` | 18 passaram, 0 falharam; 12.316 expectativas. Conferência das fontes/artefatos e regras declaradas, não execução de todos os jogos no navegador |
| Jogo, `NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit` | Passou |
| Biome dos pacotes jogo/contratos | Dois erros exclusivamente de formatação nos relatórios JSON de `arte/ilhas` e `arte/ilhas-b` |

O teste ignorado do jogo requer uma integração com Postgres. Nenhum teste de banco foi habilitado nesta auditoria.

## Final do Farol

Comando, a partir do pacote do jogo:

```powershell
bun build playground/verificar-final-farol-browser.ts --target=node --external playwright-core --outfile .cache/auditoria-final.mjs
$env:ARQUIPELAGO_PRINTS='C:/Users/tocha/projects/sistema-zero/.audits/qa-2026-10-30-arquipelago/farol'
node .cache/auditoria-final.mjs
```

Resultado: código de saída 0. Os dois tamanhos concluíram o fluxo. O roteiro conferiu a chegada com apoio, a caminhada até a mesa, os trechos da página, a pausa durante os fachos, os seis fachos, a volta para casa, a conversa com a Íris, a página no diário e a segunda entrada/saída. Conferiu também persistência após recarregar, recusa antes da Lenda e reserva visual quando a sala falha no carregamento. Nenhum erro de página foi reportado pelo roteiro.

Capturas principais:

- [Sala no computador](farol/sala-computador.png).
- [Página no celular](farol/pagina-celular.png).
- [Seis fachos no computador](farol/fachos-computador.png).
- [Íris no celular](farol/iris-celular.png).
- [Reabertura no computador](farol/reaberto-computador.png).
- [Reabertura no celular](farol/reaberto-celular.png).
- [Medidas no computador](farol/medidas-computador.json).
- [Medidas no celular](farol/medidas-celular.json).

## O teste passou, mas há uma lacuna de memória

O roteiro existente verifica a estabilidade das geometrias na reentrada, não a estabilidade das texturas. As duas execuções registraram:

| Recurso | Antes da reentrada | Depois da saída |
| --- | --- | --- |
| Geometrias, computador | 399 | 399 |
| Texturas, computador | 53 | 74 |
| Geometrias, celular emulado | 399 | 399 |
| Texturas, celular emulado | 53 | 74 |

Uma reprodução separada com `copiarArteAnimada` confirmou que o descarte não libera a textura do esqueleto clonado. Foi criado um `SkinnedMesh` simples, com `Bone` e `Skeleton`, copiado pelo helper real; `computeBoneTexture()` alocou a textura da cópia. Depois de `soltar()`, a textura ainda existia e seu evento `dispose` não havia sido chamado. Os recursos usados pela reprodução foram liberados explicitamente ao final.

Saída da reprodução:

```json
{"esqueletoProprio":true,"texturaPropria":true,"soltouTextura":false,"texturaContinua":true}
```

Esse resultado fundamenta A10 no relatório. Não significa que todas as texturas do mundo tenham o mesmo problema, nem identifica individualmente as 21 texturas adicionais.

## Repetição para distinguir carregamento de retenção

Foi feita uma segunda execução no computador, a partir de uma cópia temporária do mesmo verificador. Depois do fluxo completo e da reentrada original, foram acrescentados três ciclos de subir, aguardar a sala/corte, sair com Esc, aguardar o fim do corte e esperar três segundos antes de medir. A cópia temporária não alterou o código do jogo.

| Medição | Geometrias | Texturas |
| --- | --- | --- |
| Antes da reentrada | 399 | 53 |
| Depois da reentrada do roteiro original | 399 | 74 |
| Depois do primeiro ciclo adicional | 399 | 95 |
| Depois do segundo ciclo adicional | 399 | 116 |
| Depois do terceiro ciclo adicional | 399 | 137 |

A execução terminou com código 0 e sem erros de página. [Medidas completas dos ciclos](memoria/ciclos.json). O crescimento repetido reforça a necessidade de correção; o indicador de geometrias sozinho não cobre o descarte de recursos animados.

## Limites de desempenho e visual

As amostras registradas variaram de 1 a 3 quadros por segundo no cenário de computador e de 3 a 6 no celular emulado. São números de renderização por software, headless, nesta máquina, não resultados de celular ou computador com a GPU-alvo. Não confirmam nem refutam as metas de 60/30 FPS do produto.

As capturas foram inspecionadas. A página cabe no celular, com ação principal reconhecível. O HUD continua mostrando a tarefa inicial de plantio durante o final quando essa tarefa está incompleta no cenário de teste, o que motivou A5. A câmera e as interações deste roteiro não qualificam todos os percursos do jogo.

Não foram testados nesta rodada: aparelhos físicos, sessão longa, contas autenticadas, compras reais, importação/publicação de conteúdo, todos os fluxos do adulto e toda a rede de barcos em edição pela outra sessão.
