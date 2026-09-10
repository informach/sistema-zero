# Leitor poligonal OBJ, lote 161

## Referência e escopo

Foi consultado o [apêndice B1 original do manual Wavefront](https://www.martinreddy.net/gfx/3d/OBJ.spec),
em 08/09/2026. A leitura preserva listas separadas de posições, UV e normais,
índices positivos e negativos relativos ao ponto de uso, ordem dos cantos e
contexto de objetos, grupos, materiais e suavização. Peso de posição é conservado,
não usado para dividir xyz. Grupos múltiplos não são uma hierarquia. Bibliotecas
de materiais permanecem referências, sem IO. `call` e `csh` são recusados.

Implementação própria. Não incorpora código de Blockbench, Blender ou outro
aplicativo. Three aparece somente como oráculo de teste para uma face suportada.
Não há triangulação, solda, troca de eixos, normalização, lookup de material,
conversão nativa, worker, gravação, UI ou aceite de perdas neste leitor.

## Arquitetura e limites

`objStatements` decodifica UTF-8 fatal, aceita BOM inicial, CR/LF/CRLF, tab/espaço,
comentários e continuação limitada. Linhas físicas são percorridas sem um array
do arquivo inteiro. Uma instrução guarda sua primeira linha física; espaços
internos em nome de objeto/material permanecem. Controles proibidos são recusados
inclusive em comentários. Continuação sem próximo dado falha. Não interpretar
aspas como shell ou fazer substituição de argumentos.

Política explícita de compatibilidade: nomes UTF-8, comentários inline e `s on`
como grupo 1 são aceitos. Faces exigem referências consistentes. Em polilinhas,
UV é opcional por canto; a flag do elemento indica presença em qualquer canto,
e cada ausência continua representada no buffer. Não inferir UV que faltou.
Formas livres, atributos de render não implementados, cores estendidas por ponto,
bibliotecas com aspas e instruções desconhecidas falham com `unsupported`,
sem retorno parcial. Sintaxe numérica, aridade e referências inválidas usam
`invalid`; limites de produto usam `budget`. Números são Double finitos, não
decimais de precisão arbitrária. Arquivo vazio/comentários pode ser fonte vazia;
erro de instrução não vira uma fonte vazia bem-sucedida.

Orçamentos fonte: 32 MiB; 65.536 caracteres por linha física/lógica; 1.048.576
linhas; 4.194.304 tokens/valores de atributos; 1.048.576 referências; 262.144
elementos; 65.536 estados e nomes de grupo agregados; 1.024 nomes de biblioteca;
4.096 caracteres por nome. Verificações precedem append/alocação correspondente.
Buffer compartilhado não é aceito. Limites fonte não substituem os limites nativos
que serão aplicados na conversão.

`readObjDocument` constrói Float64 de atributos e Int32 de referências em blocos
de 4.096 escalares e finaliza no comprimento exato. Posições guardam xyzw, UV
guarda uvw, normais têm três componentes. Referências ficam zero-based, com -1
para atributo opcional ausente; pontos repetidos continuam repetidos. Elementos
guardam offset/count, linha e índice de contexto. Estados retêm declarações sem
elementos; listas de grupos inalteradas são compartilhadas read-only. Isso evita
copiá-las em cada canto sem inventar parentesco. `objectLine` conserva a linha
da declaração de objeto (zero para o objeto inicial implícito). Assim, repetir
um nome não apaga a identidade da declaração nem cria objetos ao mudar material.

Saída não compartilha buffers com o arquivo. Blocos temporários e buffers finais
coexistem durante finalização; nenhuma alegação de pico RSS ou importação completa.

## Revisão e provas

12 testes de fonte incluem defaults/peso/UVW/normais, índices independentes e
negativos, ordem de pontos/linhas/faces, estados/bibliotecas/nome com espaços,
objetos vazios, índices futuros/incompletos/inseguros e layout inválido de face.
UTF-8, BOM, finais de linha, comentário, continuação, controles, shell/includes,
formas livres e sintaxe não suportada têm casos explícitos. Limites exatos e
excedidos de linha, token, elementos, referências, estado, nomes e bibliotecas
são exercitados sem truncar conteúdo. Blocos atravessados conferem todos os
atributos, inclusive o último bloco parcial. Bytes originais permanecem intactos.

Primeiro teste de linha revelou que o parser aplicava a regra de layout uniforme
também às polilinhas. A regra ficou restrita às faces; UV opcional permanece por
canto, com regressão. A fixture também foi corrigida para declarar normal antes
da face; referências futuras continuam inválidas em teste separado. O oráculo
Three confere posições/UV/normais e winding de uma face, com arredondamento F32
apenas na comparação com os buffers Three, não no leitor Double. Após a primeira
integral verde, review encontrou falta de identidade em declarações `o` com o
mesmo nome. Regressão vermelha/verde levou a `objectLine`, sem identificar objetos
por nome nem confundir mudanças de grupo/material com uma nova declaração.

O teste de pureza tinha uma heurística de mais de três módulos, incompatível com
um grafo válido de três arquivos. Não dividir código para satisfazer esse número.
O walker agora falha para qualquer import relativo não resolvido; raiz não vazia
e proibição transitiva de UI/Three permanecem. Antes ele ignorava a aresta ausente.
Focal com essa correção: 58 passes, zero falhas, 355 asserts/5,19 s, antes das
asserções adicionais de cada coordenada atravessando blocos.

## Medição e alteração localizada

A skill de otimização orientou medir antes, guardar perfis, mudar uma causa por
vez e comparar golden hashes. `scripts/bench-obj.ts`: três aquecimentos/dez
amostras, geração/GC/hashing fora do intervalo, mesmos bytes e hashes SHA-256 de
atributos, referências e metadados. Bun 1.3.11, Windows, Ryzen 5 5600G. Goldens
foram registrados antes da mudança e são obrigatórios no comando normal. Depois
da correção autoral `objectLine`, os hashes foram atualizados com revisão explícita
do novo metadado. O lexer foi recolocado temporariamente na versão sem a otimização
para repetir testes, benchmark e perfil; depois a otimização foi restaurada e as
mesmas verificações repetidas. Os hashes novos passaram nos dois lados dessa
comparação. Nenhuma mudança numérica ou de validação foi aceita como otimização.

Perfil anterior apontou 339.297 µs no loop de `objStatements`, em 1.087.154 µs
amostrados no script completo. A única mudança de desempenho foi não construir
paths/mensagens nem chamar helpers de erro em cada caractere válido. As mesmas
condições e ordem de erros permanecem; diagnóstico é construído no ramo de falha.

| Caso | Antes p50/p95 (ms) | Depois p50/p95 (ms) |
| --- | --- | --- |
| Triângulo, 32 bytes | 0,145 / 1,491 | 0,142 / 1,286 |
| Comentários, 1 MiB | 12,486 / 61,376 | 4,385 / 8,871 |
| Malha, 16.384 vértices | 56,013 / 77,281 | 55,439 / 62,938 |

Na comparação final, comentários melhoraram 2,85× na mediana, com um outlier
de 61 ms no p95 anterior; o perfil anterior separado mediu p95 de 17,558 ms.
Não anunciar o outlier como ganho garantido. Na primeira comparação, antes do
metadado adicional, comentários passaram de 11,823/16,594 para 4,259/8,311 ms
(2,78× na mediana), enquanto malha passou de 53,561 para 53,964 ms. Por isso,
a melhora geral da malha permanece inconclusiva. Hashes e originais ficaram
iguais nos três casos em cada comparação. RSS amostrado final da malha:
220.094.464 antes e 222.515.200 depois; aumentou, não é medição de pico nem
evidência de redução de memória. Perfis finais estão em
`obj-text-l161-final-before.cpuprofile` e `obj-text-l161-final-after.cpuprofile`.
Os perfis iniciais `obj-text-l161-before.cpuprofile` e
`obj-text-l161-after.cpuprofile` também foram preservados. Regex/tokenização e GC
continuam tendo custo; não foram modificados neste lote.

## Verificação final

Tipos passaram. Biome: 842 arquivos. Focal final do leitor: 12 passes, zero
falhas, 4.315 asserts/4,01 s; benchmark normal passou com os goldens finais.
Integral final: 1.974 passes, zero falhas, 274 arquivos, 8.233.105 asserts/118,97 s.
Vite: 1,09 s, com o aviso Three já conhecido. Kids: compilação 5,6 s, tipos 9,0 s,
59 páginas em 411 ms. Diff check passou, apenas avisos CRLF já existentes em
outros CLAUDE.md. Sem nova dependência, ativação pública ou código OBJ no bundle
de UI: a integração desse leitor ainda vem depois.

Não habilitar OBJ na UI como se materiais, conversão e revisão estivessem prontos.
O próximo estágio trata geometria nativa e adaptação explícita; MTL/recursos/worker/
adoção seguem pendentes, assim como as fases completas.
