# Recursos de buffers e imagens GLB/glTF, lote 145

## Contrato e decisões

`readGltfResources` planeja buffers, views e imagens antes de copiar/decodificar
bytes. `readGltfBuffers` mantém o contrato anterior usando o mesmo planejamento.
Não há leitor de imagem com orçamento isolado que permita dobrar o teto combinado.

Uma cópia própria por caminho normalizado ou Data URI exata, somente na chamada.
Imagens em views usam subarrays do buffer contado; imagens externas podem usar
o arquivo inteiro, inclusive quando um buffer declara apenas seu prefixo. Dados
compartilhados são somente leitura por contrato: editar exige materialização
posterior. Não deduplicar por conteúdo nem afirmar que isto é persistência por hash.

32 MiB conjuntos de recursos e 1.024 recursos únicos, incluindo BIN e imagens;
65.536 descritores de imagem não implicam 65.536 cópias. O orçamento é de bytes
dos recursos, não pico total de RAM (JSON, strings, planos e futuros pixels têm
custos adicionais). Arquivos escolhidos mas não referenciados não leem bytes.

Data URI de imagem aceita PNG/JPEG, base64 ou octetos percent-encoded. Os bytes
0–255 não passam por UTF-8; `%2520` continua três octetos `%20`, não espaço.
Cabeçalhos com parâmetros e outros MIME ficam explicitamente unsupported nesta
etapa. Nenhum URI externo é baixado, nenhum script é interpretado. Base64 reaproveita
a mesma inspeção/decodificação dos buffers; a restrição MIME dos buffers permanece.

Faltantes são caminhos exatos únicos, sem resultado parcial. MIME do descritor
e MIME da Data URI ficam separados para conferir com o raster depois. Esta é
resolução de bytes, não prova de imagem/documento válidos: ler accessors e aparência
depois ainda precisa conferir roles numéricos (inclusive sparse), UVs e extensões.

## Review

- Regressões de paths, BIN/padding, tipos de views, ownership, recursos ausentes
  e limites do leitor anterior continuam cobertas, sem alterar suas expectativas.
- Testes novos conferem memória compartilhada explicitamente, inclusive Buffer
  recortado: saída não retém backing do chamador nem expõe seu prefixo/sufixo.
- Prova com GLB texturado real passa no validador Khronos; bytes PNG em BIN,
  Data URI e arquivo escolhido ficam iguais e decodificam igualmente no oracle
  de testes. Esse oracle não foi promovido a decoder de produção.
- Investigada a hipótese de newline final burlar regex base64. Experimento em
  Bun com LF/CR/CRLF/U+2028/U+2029 rejeitou todos na inspeção; hipótese descartada,
  sem modificar código para corrigir um problema não reproduzido.
- Typecheck inicial encontrou getter de fixture inferido como void e comparação
  com union não estreitada. Correção apenas de tipagem da fixture e narrowing;
  nada de casts/supressões ou alteração de produção para agradar ao teste.

## Evidência

10 testes de domínio e um de pureza novos. Focais: 144 testes, zero falhas,
12 arquivos, 8.942 expectativas, 2,52 s. Integral após correção das fixtures:
1.767 testes, zero falhas, 250 arquivos, 8.204.928 expectativas, 90,81 s.
Tipos e Biome/756 passaram. Vite/799 ms e Kids: compilação/3,7 s, tipos/7,6 s,
59 páginas/473 ms passaram. Diff check passou, com avisos CRLF alheios.
Three ainda em 579,29 kB; sem ativação pública ou homologação visual/GPU.

Fontes: [glTF 2.0, §3.8.3](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)
e [RFC 2397, §§2–3](https://www.rfc-editor.org/info/rfc2397/).
