# Recuperação offline — issue 026

Correção no worktree `pinta-full-review-20261118`, sem mudança visual, merge ou deploy.
Os resultados desta execução complementam os gates anteriores de `gates.json`;
não substituem suas datas nem afirmam nova execução de motores não alterados.

Código verificado: `f0dfed557a95ff8ebe2751a6c26673f5759d9e43`.
[Comandos, datas e hashes dos logs](autoridade-local-026/gates.json).

| Verificação desta correção | Resultado |
|---|---|
| Pinta: fontes e scripts, com Python/Pygame nativo configurado | 2.076 aprovados; zero falhas ou pulados |
| member-shell: suíte completa | 2.480 aprovados; zero falhas ou pulados |
| community-kids: suíte completa | 1.698 aprovados; zero falhas ou pulados |
| Tipos: Pinta, member-shell, Kids e Estúdio | Todos aprovados; harness final também conferido isoladamente com opções herdadas do Estúdio |
| Biome: 33 arquivos de código alterados | Zero erros ou avisos |
| IndexedDB real e UI de produção | Cinco casos aprovados; original5 e edição4 preservados |
| Vila/Phaser: desktop e toque emulado | Quatro casos aprovados |
| Continuação no editor durante validação | Dez repetições aprovadas, sem retries; dados salvos comparados |
| Reprodutor com 37 módulos publicados reais e IO simulado | Um caso, 13 asserções, sem nuvem |

O lint global antigo do Estúdio continua documentado como falha preexistente em fixtures
protegidas; ele não foi alterado nem apresentado como aprovado. A suíte integral antiga
do Estúdio e os motores Tiled/Godot não foram repetidos para esta correção de persistência.

## Contrato implementado

O documento completo fica em `pinta:local:document:<id>`, no mesmo banco/store do perfil.
O envelope 1 contém capacidade 5, revisão opaca e asset nativo; asset nulo é lápide.
`pinta:asset:<id>` é espelho de compatibilidade. A primeira leitura moderna de um
mapa/tileset/conjunto legado estabelece a autoridade antes de devolver a edição.

Uma transação readwrite lê, compara e grava autoridade, espelho e cópias. Nenhum await
ocorre dentro do planejador transacional. A confirmação depende de `oncomplete`; erro
ou abort não confirma parcialmente. Leitura, lista, backup e captura/exportação para
o Estúdio resolvem a mesma autoridade. O fecho de recursos de uma captura vem da
mesma transação; não há descoberta e releitura de versões misturadas.

Uma edição atrasada do espelho vira cópia independente, com IDs e referências
remapeados pelo planejador de importação existente. A origem da edição atual acompanha
sua linhagem em memória; uma listagem ou checagem da nuvem não autentica snapshots
antigos, inclusive mapas vinculados a um tileset. O símbolo de origem não é persistido
nem exportado. A revisão avança somente depois da gravação daquela linhagem.

O editor adota a cópia já confirmada, cancela o histórico anterior, remonta os controles
do documento e permite continuar salvando. Gestos antigos não podem restaurar o ID
original. Uma mudança feita enquanto o save estava em voo permanece suja para retry.
O aviso usa o toast/feedback existente do Pinta. A galeria mostra original e cópia.

A lápide impede ressurreição por autosave antigo. Ler uma lápide não autentica RAM
de origem anterior. Uma restauração explícita de backup sem linhagem usa a revisão
da lápide lida; a importação normal da galeria continua atribuindo IDs novos.
Exclusão visual usa a base exibida, com CAS. Exclusão antiga apenas do espelho é
reparada na próxima leitura moderna.

A ponte da conta conserva a revisão nativa que realmente confirmou na nuvem.
Dois horários iguais não tornam revisões diferentes intocadas, inclusive em uma
segunda reconciliação ou depois de reiniciar o wrapper. O hook novo do reconciliador
é opcional; consumidores sem revisão nativa mantêm o comportamento anterior.

## Limites de armazenamento e desempenho

- Um checkpoint corrente por ID; exclusão remove seu payload e deixa lápide compacta.
  Não há expiração automática que permita uma aba publicada ressuscitar o mesmo ID.
  Cópias podem ser exportadas e removidas pela galeria normalmente.
- Autoridade e espelho duplicam fisicamente o payload protegido. A quota do navegador
  é independente dos32 MiB do backup portátil. Toda falha conserva o estado anterior;
  não se apaga o checkpoint para fazer uma gravação caber.
- Cópias entram no orçamento portátil como assets reais. Autoridades/lápides não criam
  entradas duplicadas no backup. A validação do orçamento considera o resultado final
  de uma redução/exclusão, permitindo liberar espaço e recuperar na mesma transação.
- Saves em galeria com documentos protegidos têm leitura O(galeria), necessária para
  orçar o estado consistente de clientes publicados que desconhecem o índice novo.
  Capturas normais leem só dependências; galeria apenas de sprites conserva o inventário
  incremental. Não se afirma streaming, memória constante ou desempenho físico.
- Os tetos de criação/leitura, células, camadas e peças permanecem iguais. Nenhum dado
  de Molda Cenários 3D foi alterado.

## Provas reproduzíveis

O [resultado do navegador](autoridade-local-026/navegador.json), a
[prova com baseline real](autoridade-local-026/baseline-real.json), a
[medição da galeria](autoridade-local-026/indexeddb-budget.json) e a
[regressão da Vila/Phaser](autoridade-local-026/vila-regressao.json) acompanham esta entrega.
Capturas: [reabertura com aviso](autoridade-local-026/offline-reopened.png) e
[editor continuado na cópia](autoridade-local-026/editor-recovered.png).

```powershell
# Código antigo real 567b93f95 e domínio atual, IO simulado, sem nuvem:
bun docs/pinta-cenarios/revisao-2026-11-18/qa/repro-local-only-026.ts

# Núcleo, limites, origens, exclusão, versões futuras e falhas simuladas:
cd packages/pinta
bun test src/state/localAuthority.test.ts src/state/editorStore.test.ts

# Ponte real com persistência do Pinta e IO simulado, realm isolado:
cd ../member-shell
bun test tests/pinta-local-authority.test.ts

# IndexedDB do Chromium e UI compilada em produção:
cd ../studio
bunx playwright test --config playwright.pinta-authority.config.ts
```

O harness de navegador extrai os 37 módulos reais do baseline, compila as duas versões
e as serve na mesma origem/banco. O teste conserva RAM4, promove a5, fecha a página
nova, grava pelo código antigo com o contexto offline, fecha a aba antiga e reabre
a galeria. Exige schema 5/offset 2,5 e cópia 4, com aviso. Outros casos exercitam duas
abas atuais, exclusão/escrita tardia, abort no segundo put, retry, continuação do editor
e dez saves/captura em uma galeria com502 assets. Os números medidos ficam no artefato
`indexeddb-budget.json`, sem extrapolação para tablets ou aparelhos físicos.

Quota física esgotada, desligamento elétrico/OS e frota implantada não foram testados.
`QuotaExceededError` foi injetado em testes e no segundo put de uma transação real;
fechar/reabrir páginas comprova independência de RAM, não durabilidade após perda de energia.
O resultado histórico em `local-only-026.json` conserva a reprodução anterior do defeito.
O reprodutor atualizado exige preservação; um teste verde agora confirma a correção.
