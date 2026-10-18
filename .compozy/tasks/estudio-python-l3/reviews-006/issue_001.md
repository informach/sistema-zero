---
status: resolved
file: experiments/studio-python-runtime/precompile-stdlib.py
line: 13
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Otimização do Python remove as guardas da receita

## Review Comment

As validações operacionais da receita usam assert: versão do compilador, SHA do ZIP de entrada, destino diferente da origem, entradas duplicadas, colisões de pyc e verificação final de preservação. Python -O, -OO ou PYTHONOPTIMIZE removem essas verificações, embora py_compile continue recebendo optimize=0 para os módulos gerados. Assim a receita pode processar um compilador/arquivo incorreto e ainda imprimir sourceSha256 com o valor fixado e sourcesPreserved: true sem ter conferido essas propriedades. A proteção contra source == target também desaparece, permitindo truncar o arquivo de entrada se os mesmos caminhos forem fornecidos.

Reprodução sem gravação de arquivos: compilar o código atual da receita com optimize=0 e optimize=1, instrumentando platform.python_version e os limites de I/O. Versão 0.0.0 e bytes de origem diferentes são recusados por AssertionError em optimize=0; em optimize=1 ambos atravessam a respectiva guarda e alcançam o próximo limite instrumentado. O bytecode da receita perde as oito instruções de assert.

Substituir asserts dessas precondições/invariantes por verificações explícitas com exceções, mantendo as mesmas regras e mensagens claras. Testar as recusas também com otimização habilitada. A condição de optimize=0 do py_compile deve continuar explícita, mas não substitui as guardas da ferramenta que produz o artefato.

## Triage

- Decision: `VALID`
- Notes: Defeito da validação da receita, não evidência de corrupção nos ZIPs já gerados. A conferência independente dos artefatos existentes passou.

- Resolution: As oito guardas passaram a usar require com exceções explícitas. A revalidação encontrou que executar o compilador sob -O altera apenas a serialização marshal de functools.pyc (sem diferenças nos atributos/constantes recursivos comparados), apesar de py_compile optimize=0. O contrato final exige também sys.flags.optimize == 0: -O, -OO e PYTHONOPTIMIZE são recusados antes de abrir destino. Nova geração real com CPython 3.14.2 -I reproduziu SHA 02900077d6d689e6b179454059228f0cff91af254dd38442046acc61f5db80c4 e 7.112.499 bytes. Testes reais de caminhos iguais e hash incorreto também foram recusados, preservando a origem e sem criar saída. Arquivos de cache da reprodução preservados em review006-8m6lgev5 e review006-fixed-yr8bm01p.
- Verification: Código corrigido lido integralmente; reproduções independentes passaram. Fontes não foram modificadas pela revisão.
