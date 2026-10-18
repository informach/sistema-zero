# VERIFICATION REPORT

- Claim:113001 reproduz requisitos uppercase ignorados na geração de configuração nativa.
- Command: `bun test ./.cache/review113-desktop-metadata.test.ts` em packages/studio.
- Executed: sim, após ajustar somente fixtures cache para respeitar unicidade case e diretórios explícitos do contrato.
- Exit code:1.
- Output summary:2pass/1fail/14asserts; REQUIREMENTS.TXT externo preservado e legível no Windows por requirements.txt, mas pyproject gerado dependencies=[]/warnings=[]. Colisões de caminhos case/ancestrais e ZIP com BOM/CRLF/Unicode/diretórios vazios passaram.
- Warnings: leitura e testes leves apenas; nenhum browser/build/TSC/Docker/SQL/TkGUI executado. A exportação mantém status not-observed/not-performed e não certifica arbitrários programas nativos.
- Errors: falha esperada do probe causal, nenhuma inferência a partir das duas fixtures inicialmente inválidas.
- Verdict:1issue/0resolved/1unresolved. Revisão scoped em andamento, não aprovação global L7.

## Revalidation final

- Claim:113001 resolvida para lookup/nome de requisitos em variantes de caixa.
- Command: `bun test ./.cache/review113-desktop-metadata.test.ts ./src/export/__tests__/pythonSource.test.ts ./src/export/__tests__/sourceExport.test.ts` em packages/studio.
- Executed: sim, após patch e permanente uppercase.
- Exit code:0.
- Output summary:16pass/0fail/106asserts; generatedConfig undefined e aviso revisão nativa no causal; permanente confirma pip -r REQUIREMENTS.TXT. Colisões case/ancestrais, ZIP bytes BOM/CRLF/Unicode/emptydirs e JS6 passam.
- Additional command: `.cache/studio-python-l0/cpython-3.14.2/python.exe .cache/studio-python-l0/review113-native-artifacts.py`, raiz feature; exit0.
- Additional output: VERIFIED archive/source/assets/sourceSha/dirs/PNG CRC/TOML/CPython-Tk stdout/upstream raw+LF hashes; read-only, no GUI reexecution. Native2 ZIP SHA5018d06ba4dd760cc35d3d5fd47d654e3944d2aa532dcb60e5e42a94bbbaf451; observação arquivada CPython3.14.2/Tk8.6.15, dois turtles, PNG/GIF e helper real. Não é novo ensaio nativo do revisor nem prova VS Code/arbitrários projetos/sistemas operacionais.
- Warnings: nenhum teste pesado do revisor; fullTSC/formatter pertencem à raiz e não são implicitamente aprovados por unit. Metadata mantém desktopExecution not-observed/portabilityAnalysis not-performed.
- Errors: nenhum na revalidação final; negativo préfix e tentativas fixture inválidas anteriores preservados como tais.
- Verdict:1issue/1resolved/0unresolved, somente recorte additive desktop metadata.

- Fechamento administrativo posterior ao probe: aguardando TSC fresh67552 solicitado pela raiz; issue permanece VALID, meta1/0/1, sem retirar a evidência unit16/106.


## Fechamento após TSC fresh

- Claim:113001 resolved; metadata113 total1/resolved1/unresolved0.
- Command: `Get-Content .cache/studio-python-l0/l7-desktop-metadata-typecheck-2.log` e readback YAML issue/meta via Bun.YAML.
- Executed: sim, após raiz colher67552 e confirmar três arquivos estáveis.
- Output summary: log contém Studio TypeScript fresh verification / Exit code:0. Somam-se evidências independentes já executadas16pass/106asserts e leitura/hash Native2, sem reexecução desnecessária.
- Warnings: TSC executado pela raiz; revisor verificou artefato explícito. Nenhuma execução heavy pelo revisor, nenhuma declaração de analyzer arbitrário/VS Code/Pinta restante/performance.
- Errors: nenhum no fechamento.
- Verdict:PASS para issue113001; meta1/1/0 e YAML parseados após gravação.
