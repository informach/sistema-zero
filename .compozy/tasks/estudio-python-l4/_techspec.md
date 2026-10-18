# Arquitetura

Derivado licenciado da lógica Turtle CPython3.14.2, separando `TurtleScreenBase` e janela de Tk. Vendor e receita fixados; nenhum falso módulo tkinter ou reescrita de fonte autoral. Backend Python mantém geometria, fila e callbacks; renderer Canvas no frame valida protocolo limitado de cena retida. JSPI suspende apenas o executor corrente; eventos são bombeados dentro do Python.

AST/tokenização Python em worker de análise independente do programa, IR Python e codecs próprios, preservação localizada de fonte e identidade por projeto/revisão/geração. Catálogo único de programação/extensão fornece IDs, assinaturas, níveis, caminhos e documentação a paleta/admin/Zappy. Semântica de cada família comparada à referência fixada.
