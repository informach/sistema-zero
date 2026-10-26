# Receber as artes finais do Molda

Os projetos editáveis continuam em `docs/design/ilha-do-farol-molda/projetos/`. O curso consome esses projetos pelo mapa `ILHA_ART_SOURCES`, em `qa/ilha-do-farol-assets.ts`. Os nomes de jogo (`personagem`, `chave`, `farol`, `farolAceso` etc.) ficam separados dos nomes de arquivos.

1. Guardar os arquivos devolvidos pelo responsável e comparar as alterações. Não executar a exportação do protótipo sobre eles: ela recria as artes iniciais.
2. Atualizar cada fonte correspondente no mapa. Se houve reposicionamento na cena completa, reconciliar também o posicionamento dos objetos em `ilha-do-farol-projeto.ts`. A cena completa sozinha não substitui automaticamente os projetos individuais.
3. Preservar os rótulos dos grupos principais usados nas experiências: `Chave`, `Aventureiro` e `Pedras`. Conferir também os demais grupos da cena. As experiências usam a cena completa; o jogo usa os modelos individuais.
4. Regenerar os GLBs e manifestos. A exportação mede centro e tamanho; o Jogo 3D centraliza os modelos, e o gerador compensa essa transformação. Esferas de exibição usam 16 × 8 segmentos; weld/dedup/quantização reduzem o arquivo. Fontes editáveis não são alteradas por essa otimização. Conferir o resultado visual e os limites de importação, sem aumentar tetos para esconder um arquivo excessivo.
5. Rever a caixa de contato do personagem/chave no jogo e as caixas pedagógicas em `ISLAND_CONTACT`, caso tamanho ou silhueta tenham mudado. A posição alcançável precisa ser testada novamente. Conferir os dois faróis no mesmo lugar, a chave escondida na vista inicial, a ponte, o barco e o reinício.
6. Executar os comandos de verificação do mapa técnico. Regenerar também o PDF para atualizar as ilustrações. Atualizar o roteiro se a montagem visível tiver mudado. Nenhum áudio antigo deve ser associado a um texto diferente.

O jogo final incorpora os GLBs: não depende de um caminho de arquivo local nem de rede para buscar as artes. A única extensão instalada é Jogo 3D; o carregamento oficial de Three.js continua seguindo o contrato da plataforma.
