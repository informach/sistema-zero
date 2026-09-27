# Envelope bbmodel e JSON compartilhado, lote 175

## Referências e escopo

Conferidas a [documentação primária de bbmodel](https://www.blockbench.net/wiki/docs/bbmodel/)
e a [implementação de referência fixada no commit estudado](https://github.com/JannisX11/blockbench/blob/47e633e4a1338f957ee7baa0acbcf54da11e77df/js/formats/bbmodel.js).
Não há especificação completa publicada. Revisões 4.9, 4.10 e 5.0 têm diferenças
documentadas em tamanho UV por textura, caminhos relativos, hierarquia/grupos e
sinais de canais de animação. Não comparar essas versões como números decimais.
O codec também pode produzir um contêiner com assinatura `<lz>`; este não é JSON
direto e não entra no leitor implementado neste lote.

Firecrawl foi usado para consultar fontes primárias e manter cópias de consulta em
`.firecrawl/`, agora ignorado pelo Git. São dados externos de pesquisa, nunca
código executado ou incorporado. Implementação do produto é própria; não foi
copiado código GPL. Fixtures são autoradas à mão, não arquivos exportados por
uma execução real do Blockbench; isso limita a evidência de interoperabilidade.

## Implementação e revisão

`readImportJson` extrai o preflight já existente de glTF, sem mudar algoritmo,
contagem ou mensagens. Recebe tetos e factory de erros; não conhece formatos,
domínio, IO ou UI. O chamador confere tamanho e ArrayBuffer exclusivo antes de
entrar. UTF-8 fatal com BOM opcional, JSON.parse como autoridade de gramática e
chaves duplicadas. Limites de profundidade/estrutura antes da string/parse.
Adapter glTF conserva seu erro e validação de versão específicos.

`readBbmodelEnvelope` limita 32 MiB de arquivo, profundidade 128 e um milhão de
tokens estruturais. Assinatura comprimida é identificada sem descompactar; scan
de whitespace usa comparações, sem alocação por byte. SAB é unsupported e buffer
vazio/destacado é invalid. Intervalos de Uint8Array/Buffer são respeitados e o
resultado não retém bytes do arquivo. Este teto não estima memória de pico.

Cabeçalho exige meta objeto, format_version textual e model_format textual não
vazio (até 4.096 unidades UTF-16). Só as três strings publicadas são aceitas;
revisões diferentes, inclusive patch/zeros adicionais, são unsupported, não
compatibilidade inferida. Sintaxe inválida, inclusive terminadores Unicode,
é invalid. Não usar meta.format legado nem inventar um formato ausente.

O formato declarado pode ser Minecraft ou plugin desconhecido: devolvê-lo como
identificador não aprova suas capacidades. JSON permanece bruto e próprio;
campos desconhecidos, editor_state, scripts, URLs, Molang e chaves __proto__ são
dados inertes. Não resolve caminhos, executa expressões, instala plugins, busca
imagens, migra eixos/hierarquia nem valida números/elementos. JSON.parse pode
produzir Infinity para 1e400; leitores numéricos posteriores precisam recusá-lo
em campos de modelo. Preservar esse dado no envelope não é aprovação nativa.

Revisão conferiu separação do módulo neutro, identidade dos erros glTF, limites
exatos, ordem de gates e ausência de IO/execução. Testes de pureza percorrem
também os novos módulos. Sem fallback, dependência nova, adoção de documento
ou mudança pública. Conversão completa e UI bbmodel seguem em lotes posteriores.

## Evidências finais

Focal envelope glTF/bbmodel e pureza: 75 passes, zero falhas, 709 asserts,
três arquivos, 2,69 s. Tipos passaram; Biome 937 arquivos sem alterações.
Focal ampliado de importação/workers: 476 passes, zero falhas, 40.864 asserts,
50 arquivos, 32,71 s. Integral: **2.132 passes, zero falhas, 294 arquivos,
8.237.311 asserts, 145,07 s**. Vite passou em 1,41 s; worker glTF 181,97 kB
(+0,11 kB pelo adapter comum), OBJ 157,01 kB e Three 579,29 kB. bbmodel ainda
não está alcançável na UI. Aviso Three >500 kB permanece; sem alegação de ganho.
Kids terminou com exit 0: compilação 6,6 s, tipos 10,0 s, 59 páginas em 800 ms.
Diff check passou com avisos CRLF prévios em três CLAUDEs de outros pacotes.

Casos incluem dados equivalentes nas três revisões, fontes intactas, versões
enormes e malformadas, metadata ausente/nula, formato plugin inerte, UTF-8 ruim,
BOM/JSON duplicado, contêiner comprimido, Buffer subrange/SAB/detach, 32 MiB
exatos, profundidade exata, um milhão de tokens exatos e pontuação entre aspas.
Casos sintaticamente inválidos acima do limite falham por orçamento antes do
parse. Nenhum destes testes equivale a homologação GPU/toque/crianças.
