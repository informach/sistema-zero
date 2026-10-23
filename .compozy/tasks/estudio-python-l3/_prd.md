# Execução Python isolada

Requisitos completos em `docs/plans/2026-10-16-estudio-javascript-python-turtle-proposta.md`, seção6, e `docs/plans/2026-10-16-estudio-python-validacao-entregas.md`. Plano em `docs/superpowers/plans/2026-10-16-studio-python-l3.md`.

Executar Python real no navegador com arquivos temporários, console limitado, entrada suspensível e REPL no mesmo namespace. Preservar fonte, imports e arquivos binários. O editor e a página pública usarão o mesmo executor, sem depender da sessão do autor. Não adicionar downloads Python ao projeto JS.

Iframe opaco e worker descartável; parar revoga efeitos antes do ACK e termina o worker conforme ADR001 do L0. Turtle é extensão posterior (L4), não parte implícita do núcleo. A ativação na interface depende também dos documentos e adapters L1/L2/L4.
