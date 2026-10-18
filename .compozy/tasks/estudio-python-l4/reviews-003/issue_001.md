---
status: resolved
file: packages/studio/src/runtime/python/turtle/_sz_turtle_backend.py
line: 384
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Screen padrão falha quando o viewport excede o perfil

## Review Comment

O tamanho relativo de setup é multiplicado pelo viewport real antes de ser comparado com o teto do Canvas. Como a criação de Screen chama setup(width=0.5, height=0.75), um viewport alto pode impedir até a abertura de uma tela sem dimensões autorais. O renderer devolve container.clientWidth/clientHeight sem limitação; em 3840×2160, o tamanho padrão calculado é1920×1620 e a altura viola1080. Um programa que chama setup com dimensões explícitas menores também falha antes de chegar a essa chamada, durante o construtor de Screen.

Reprodução independente com CPython3.14.2 e o backend real, fornecendo apenas um transporte de teste que responde viewport=[3840,2160]: `import turtle; turtle.Screen()` lança TurtleGraphicsError com a mensagem de limite1920×1080. Não foi iniciado browser para essa prova; o caminho da resposta de viewport do renderer foi inspecionado diretamente.

Definir um viewport lógico limitado para resolver proporções/padrões, ou limitar o resultado relativo conforme o contrato documentado. Manter a recusa explícita de dimensões em pixels acima do perfil. Cobrir Screen padrão em viewport maior, proporções e limites absolutos para que aumentar a janela não torne um programa válido impossível de iniciar.

## Triage

- Decision: `VALID`
- Notes: Corrigido com viewport lógico limitado antes da multiplicação das proporções. Revalidação independente em CPython fixado confirmou Screen padrão funcional em viewport grande e preservação da recusa de pixels explícitos acima do perfil.

## Revalidation

Com viewport 3840×2160, Screen padrão agora mede 960×810; setup(1.0,1.0) mede 1920×1080. Pedidos explícitos 1921×1080 e 1920×1081 levantam TurtleGraphicsError e deixam intacto o tamanho válido anterior. Ensaio com engine/backend reais e transporte controlado, exit 0. Nenhum browser foi iniciado pelo revisor.
