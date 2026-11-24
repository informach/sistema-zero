# Parte 3.6 — Montagens no palco, seleção e composição

Checkpoint de desenvolvimento. **A parte 3.6 continua aberta; não fecha o lote 3.** Base publicada anteriormente: `36b8a1293`.

## Resultado deste recorte

O palco mantém o documento autoral e sua projeção expandida separados. Uma composição aparece como peças nos lotes instanciados existentes, mas tocar numa peça retorna a raiz da montagem. Seleção por área, Ctrl+A, enquadramento, contorno e cadeados usam essa unidade. As alças trabalham na transformação da raiz e atualizam as matrizes das peças, sem criar clones autorais ou novos materiais/geometrias por cópia.

O painel permite nome, lugar, giro XYZ, tamanho uniforme, cadeado, visibilidade e separação da cópia em peças independentes. Duplicar conserva a definição e dá nome distinto à cópia. Desfazer/refazer e reabertura usam o controlador/histórico existentes. A árvore distingue conjuntos com seu ícone e nome acessível, e suas pastas selecionam raízes corretamente.

Alinhamento, distribuição, repetição em fila/círculo e variação de giro/tamanho aceitam montagens como unidades. Seus volumes são a união dos volumes das peças após as transformações, com a mesma composição usada na expansão. Espelho/troca de modelo e acabamento individual continuam sendo operações das peças; os controles correspondentes não fingem editar uma montagem. A interface orienta separar as peças. Não há alteração silenciosa de uma revisão fixada.

O apoio de um objeto sobre uma montagem usa o contrato `objeto` existente e um ponto no espaço da raiz. Ao mover a raiz, o contato acompanha sua transformação. A projeção e a desvinculação preservam a posição visível sem deixar referências a uma raiz que virou pasta. O teste vermelho inicial reproduziu `Apoio ausente`; o fluxo completo passou após a implementação.

O pincel considera as peças dos conjuntos tanto na ocupação quanto no limite total de 20.000 objetos. A receita e o gesto continuam associados ao documento autoral real. A leitura de modelos/texturas reúne os recursos da projeção com os da prévia, sem confundir aliases. Destruir o palco libera também mapas e referências de edição.

## Verificação local

- Núcleo: **155 testes / 3.954 asserções**; motor: **45 / 1.665**; oficina: **59 / 406**. Tipagem dos três pacotes aprovada.
- Teste com o `LoteDoModelo` real compara matrizes renderizadas com a expansão canônica em 20 transformações XYZ, sem acúmulo de erro. Geometria/material continuam compartilhados. Outras provas cobrem apoio externo, desfazer, separação, volume, organização, contagem e limite do pincel.
- Postgres: **33 testes / 300 asserções** aprovados novamente após as alterações do núcleo. As provas de publicação, conflito, rollback até o commit, histórico e coleta continuam passando.
- `node packages/molda-cenarios/playground/oficina/verificar-conjuntos.mjs`: aprovado em 1.440 px claro/escuro, 1.024 px claro e 390 px escuro com toque emulado. GLB real do poço, seleção da raiz por toque/clique, transformação pelos campos, tamanho uniforme, duplicação, separação/desfazer e reabertura. Documento continua sem clones; conteúdo fixado não mudou. Sem erros de página/console.
- O primeiro ensaio encontrou dois seletores inadequados no teste: sufixo decorativo não faz parte do nome acessível do número; orçamento é oculto no layout de celular. Foram corrigidas as verificações, sem mudar o produto para satisfazer o teste. A presença do GLB pronto é verificada pelo orçamento de triângulos, antes das capturas.
- Build aprovado: oficina 97,15 kB (27,27 kB gzip), entrada 436,44 kB (131,22 kB gzip), motor 768,16 kB (203,52 kB gzip). Persiste o aviso do chunk acima de 500 kB. Sem afirmação de desempenho em aparelhos físicos.

## Evidências

As capturas mostram um ensaio de ferramenta. A base geométrica serve para conferir composição/contato; **não é acabamento artístico aprovado da Faísca**. Claro/escuro abaixo é o tema da interface, não comparação de iluminação diurna/noturna do mundo.

| Configuração | Antes da transformação | Depois |
|---|---|---|
| 1.440 px, claro | [Antes](evidencias/lote3-conjuntos/conjunto-antes-light-1440.png) | [Depois](evidencias/lote3-conjuntos/conjunto-depois-light-1440.png) |
| 1.440 px, escuro | [Antes](evidencias/lote3-conjuntos/conjunto-antes-dark-1440.png) | [Depois](evidencias/lote3-conjuntos/conjunto-depois-dark-1440.png) |
| 1.024 px, claro | [Antes](evidencias/lote3-conjuntos/conjunto-antes-light-1024.png) | [Depois](evidencias/lote3-conjuntos/conjunto-depois-light-1024.png) |
| 390 px, escuro | [Antes](evidencias/lote3-conjuntos/conjunto-antes-dark-390.png) | [Depois](evidencias/lote3-conjuntos/conjunto-depois-dark-390.png) |

[Vídeo da edição](evidencias/lote3-conjuntos/edicao-conjunto.webm) · [Resultados sanitizados](evidencias/lote3-conjuntos/resultados.json). Os GLBs e o catálogo privado do acervo não foram versionados. Logs em `output/cenarios-reforma/conjuntos-palco-*`.

## Falta para fechar 3.6

- Biblioteca/gaveta: salvar seleção, listar/buscar/organizar conjuntos, escolher e colocar cópias pela interface.
- Abrir a definição na mesma oficina, indicar rascunho versus publicado e oferecer atualização explícita das cópias. Preservar contexto ao voltar e ao recarregar o endereço.
- Fotografia representativa da definição, vinculada à revisão correta, com cancelamento de resposta atrasada e sem depender de uma câmera que fotografa o restante da cena.
- Ensaiar alças por arraste e seu cancelamento em troca de documento/recusa, prévia de apoios externos, atualização visível entre cenários, iluminação, ciclos de recursos e regressões finais do conjunto completo. O ensaio acima prova as transformações pelos campos; não substitui esses testes.
- Repetir tipagem global Members/member-shell após concluir as alterações paralelas do Pinta apontadas no checkpoint anterior. Não declarar essas verificações aprovadas enquanto houver falha externa.

Continuar na **parte 3.6**. As partes 3.7/3.8 e os lotes 4–10 permanecem pendentes; implantação e validação remotas continuam reservadas para o encerramento global.
