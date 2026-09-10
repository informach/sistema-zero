# Documento glTF nativo e relatório, lote 158

## Contrato e arquitetura

`convertGltfDocument` recebe fonte já lida, índice de cena explícito, identidade
do host e opções de animação/pesos. Não usa relógio, RNG, IO ou persistência.
Cena null só vale para biblioteca sem scenes; default do arquivo não decide pelo
usuário. Um documento vazio nativo valida identidade antes de atravessar a fonte;
miniatura e campos desconhecidos do host não são herdados.

Planejador de materiais agora concentra IDs esparsos, fallback, UV compartilhado,
imagens retidas e recusas MASK/força normal/conjuntos UV/falta de imagem core.
É usado também pelo conversor do lote 156, sem segunda política de IDs ou UVs.
Imagens usadas somente por emissivo/oclusão não são decodificadas; perdas continuam
relatadas. O leitor fonte ainda valida referências e recursos do arquivo inteiro.

Plano de geometria expõe o custo que já calculava, não implementa outra regra de
topologia. Cópias visíveis somam seus triângulos antes de valores/pixels. Índices
repetidos removidos não contam; faces colineares mantidas contam, mesmo sem draw.
Formas sem POSITION continuam vazias e relatadas. Orçamentos de formas, nós,
instâncias, materiais e metadados de clipes precedem a decodificação de imagem.
Orçamentos de pixels, skins e união cúbica exata seguem nos respectivos estágios.
Não afirmar que todos os limites são resolvidos antes de qualquer alocação.

Resultado completo passa pelo leitor nativo: referências, materiais, pixels,
clipes, skins, custo agregado e bounds. Essa cópia defensiva custa memória e CPU;
32 MiB de pixels autorais não equivalem ao pico RSS de fonte/accessors/rasters/
conversão/leitor. Planos pequenos são recalculados em conversores independentes;
não se adicionou cache global nem bypass de validação por suposta performance.

## Relatório e fidelidade

União discriminada conserva stage, código, caminho e contadores/métricas próprios
de cada diagnóstico. Escopo informa cena, nós/cenas externos, extensões globais e
ocorrências (inclusive fora da cena), chunks GLB desconhecidos e custos finais.
Relatório não retém JSON, buffers, mapas de fonte ou payloads de extensões/extras.
Declara que arquivo original e metadados auxiliares — incluindo copyright e
generator — não estão arquivados/persistidos no retorno. O host deverá manter o
original disponível e tornar essa limitação visível na revisão; não remover uma
atribuição silenciosamente ao adotar o resultado. `review: required` permanece
mesmo sem avisos: conversão não constitui aceite, salvamento ou importação na UI.

Não é promessa de fidelidade visual integral: normais planas, tangentes, vertex
colors, sampler, emissivo/oclusão, morphs e outras perdas mantêm seus contratos.
MASK, força normal fora do intervalo e UVs incompatíveis seguem não suportados.
Extensões obrigatórias já são recusadas no leitor; opcionais ficam inertes.

## Review e regressões

Teste integrado reproduziu RangeError sem classificação: skin planner compunha
mundos antes do leitor final, até em cenas sem skin. Agora a composição da
hierarquia passa por gate antes dos pixels; RangeError/SceneValidationError vira
`unsupported` com caminho nativo e causa. Não mascarar erros internos arbitrários.
Regressão vermelha 0dc51f, verde 5084d5. Teste distinto mantém mundo finito e
estoura apenas pontos transformados, exercitando o leitor final e seus bounds.

Outro ajuste foi apenas da fixture: exportação local-delta gera três apoios além
das três formas, então custo de seis nós é correto. Primeiro typecheck encontrou
duas opções de teste chamadas `losses` em vez de `allowLosses`; corrigidas usando
a API real, sem afrouxar tipos ou alterar o encoder.

Nove testes novos: GLB real com imagem/clipe e reexportação Khronos, identidade,
seleção explícita/vazia, 20.000 triângulos exatos por instância e excesso antes de
getters, política de degenerados/POSITION, gates/opções, imagens omitidas sem
decode, inventário global/sem executar extras e overflow. Walker de referências
comprova que saída não compartilha objetos nem backing de buffers com a fonte;
duas conversões são determinísticas e independentemente editáveis.

Oráculo do lote 157 agora chama a montagem de produção, não compõe um documento
manual no teste. Mesmas três fixtures de juntas com formas, assistência local e
local-delta, skins, espelhos e seeks fora de ordem contra GLTFLoader/AnimationMixer.
Vértices são os do documento final, inclusive após o leitor nativo. Contadores de
vínculos/pontos pesados são conferidos. Tolerância 1e-6 não foi alterada.

## Evidência final

Focal documento/clipes: 20 passes, zero falhas, 810 asserts, 1,133 s. Biome:
821 arquivos, sem correções. Tipos passaram. Importação/pureza: 302 passes,
zero falhas, 29 arquivos, 32.330 asserts, 7,95 s. Integral: 1.935 passes, zero
falhas, 269 arquivos, 8.228.412 asserts, 102,36 s. Vite: 1,15 s. Kids: compilação
5,2 s, tipos 8,1 s, 59 páginas em 469 ms. Diff check passou.
Pureza inclui o ponto de montagem. Sem dependência nova, formato público continua
1 e oficina v2 permanece interna. Worker, UI de aceite e homologação ainda abertos.
