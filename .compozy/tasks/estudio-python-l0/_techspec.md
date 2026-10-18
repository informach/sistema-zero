# Contrato da prova

Implementação isolada em `experiments/studio-python-l0`: nenhum pacote de produto importa os experimentos. A prova de materialização importa as funções reais do Pinta para verificar sua saída, sem alterar seus exports JavaScript. Distribuição Pyodide 314.0.7 obtida por HTTPS do endereço versionado oficial, servida localmente e fixada em manifesto SHA-256. Cache/vendor não são versionados.

A origem de execução é diferente da origem host; iframe tem sandbox opaco e CSP restritivo. Comparar worker de URL, worker blob módulo e bootstrap clássico blob com import dinâmico. A alternativa deve manter isolamento, não habilitar mesma origem autenticada nem desativar CSP.

Automação Playwright roda em Node; Bun serve HTTP. A reprodução mínima mostrou timeout do transporte Playwright sob Bun 1.3.11 Windows, enquanto Node executa o mesmo lançamento normalmente.

Saída JSON registra versão do navegador/interpretador, topologia, suspensão JSPI, saída Python, término do worker e reinício. Resultados não são benchmark homologado e não substituem desktop CPython/Tk, dispositivos físicos, Pyright, Pinta ou desempenho com vídeo.
