---
provider: manual
pr:
round: 1
created_at: 2026-10-16T23:15:37Z
---

## Summary

- Total: 4
- Resolved: 4
- Unresolved: 0

## Scope

Revisão independente L4.1: derivação/arquivos oficiais pinados/licenças, engine Python gerado, backend Python, tabela de cores, manifesto de 175 assinaturas, harness nativo e fixture geométrica. Sem implementação do renderer, catálogo visual completo ou integração/browser. `fixtureFamily: null` continua rascunho conhecido, não foi registrado como regressão desta fatia.

## Evidence

- Quatro hashes de vendor conferidos; fontes geradas e vendor parseiam; manifesto contém 175 pares owner/nome únicos e tabela contém 1.020 nomes de cores.
- Execução fresca: `.cache/studio-python-l0/cpython-3.14.2/python.exe -I -B -X utf8 experiments/studio-python-turtle/engine-conformance.py`, exit 0, nove pares desktop/backend aprovados. Relatório `.cache/studio-python-turtle/engine-1792192494742025500.json`. Isso valida os exemplos de estado/geometria/assinaturas/cores/callbacks incluídos; não valida rasterização, entrada real ou desempenho browser.
- Reprodução adicional de cadeia zero: inicialmente divergia; após correção, ambos os lados imprimem `['first', 'second']` em um update. Ordem entre idle zero e timer positivo vencido ainda divergia: Tk `['due', 'idle']`, backend `['idle', 'due']`.
- Reprodução de cfg local: originalmente alterava o SHA de geração mesmo sob `-I`; após exclusão estrutural do hook, ambos os cwd reproduzem SHA `4e722b59b330d2e9f1e7cbc1e6e11588434e807fe1089d2ffaf709c235e45121` sem escrita de artefatos.
- Revalidação de hexadecimal: duas entradas inválidas recusadas e quatro comprimentos válidos aceitos em ambos os lados após correção.
- Reprodução de referência a Turtle após Screen.clear: Tk retorna posição (10,0); backend falha em item apagado com KeyError.

Nenhum navegador/Playwright foi iniciado e nenhum arquivo de implementação foi alterado pelo revisor. O programa de comparação captura stderr, mas atualmente compara exitCode/stdout; o canário de exceção está presente no relatório examinado, sem afirmar equivalência byte a byte dos tracebacks de backends diferentes.

## Revalidation

- Dez pares do harness atualizado passaram em execução independente, exit 0, relatório `.cache/studio-python-turtle/engine-1792192738597547900.json`. A nova fixture cobre cadeia zero, positivo previamente vencido e movimento após limpar a tela.
- Os dois issues pendentes permanecem parcialmente corrigidos: o timer que vence durante uma geração idle ainda é intercalado cedo demais; `_bind` agora aceita silenciosamente item apagado que o Tk recusa. Reproduções independentes registradas nos respectivos issues.
- Inspeção do novo pacote privado: `install_turtle` instala `_sz_turtle_runtime` com `__path__` fixado no diretório confiável; o backend importa cores relativamente. `turtle` não é pré-importado, preservando o sombreamento autoral. Esta inspeção não qualifica a integração/renderer em construção.

## Final revalidation

- Quatro achados resolvidos. Execução independente fresca do harness: dez pares aprovados, exit 0, `.cache/studio-python-turtle/engine-1792192825333614600.json`.
- A fixture timer-priority ampliada coincide integralmente: cadeia zero, prioridade do positivo previamente vencido, geração idle concluída antes do positivo que vence durante callback, posição após clear e erro de vínculo em item apagado.
- Reprodução adicional reentrante, fora da fixture: primeiro idle agenda novo idle, dorme, chama update com positivo vencido e idle antigo pendentes. Desktop/backend imprimem `['first', 'positive', 'old-idle', 'new-idle', 'first-resumed']`, ambos exit 0, stderr vazio.
- Derivação novamente avaliada em memória após a alteração do import privado: cwd normal e cwd com turtle.cfg reproduzem width 0.5 e SHA `1e95c75b103c66181b1bf69bd3a47ecb7c7270875b3654e192e8e95ade54c6db`, igual ao artefato atual. O SHA histórico 4e722b59… acima pertence à versão anterior ao import privado.
- Esta rodada fecha apenas os defeitos confirmados da fatia nativa L4.1; renderer, imagens/transferências, integração de fronteira e provas reais no browser serão revisados separadamente.
