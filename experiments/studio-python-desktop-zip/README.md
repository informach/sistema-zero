# Projeto Python exportado rodando no computador (R12)

Prova local de que o ZIP de fonte do Estúdio roda fora da plataforma, como quem abre a pasta no VS Code:

1. Projetos Python Clássico e Pro (com módulo local `regras.py` no Pro) passam pelo exportador do produto (`buildPythonSourceFiles` com o catálogo de runtime, `zipFiles`).
2. O ZIP é descompactado numa pasta nova.
3. O programa roda com `python main.py` no CPython nativo: `input` e `print`, e Turtle/Tk real, que fecha sozinho com `ontimer(bye)`.
4. A regra é alterada no arquivo extraído e o programa roda de novo.

```sh
bun experiments/studio-python-desktop-zip/run.ts <caminho do python.exe 3.14.2 com Tk>
```

Resultado em 21/10/2026, Windows 11 com CPython 3.14.2/Tk 8.6.15: Clássico e Pro passaram, sem avisos de exportação. A primeira execução deu `total 42` e a segunda, depois da mudança da regra, `total 63`.

O Turtle do CPython mostra `(-0.00,0.00)` depois de quatro giros de 90°, por arredondamento de ponto flutuante; o teste aceita os dois zeros. Projetos grandes com materiais e áudio, como a exportação do Space Arena 1.2 com `sz_audio`, rodam nativamente pelos casos Q02–Q08 da qualificação de jogos.
