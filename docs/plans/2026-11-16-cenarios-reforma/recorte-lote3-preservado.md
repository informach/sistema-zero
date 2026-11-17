# Recorte do lote 3 preservado

A usuária corrigiu a sequência de execução: fechar os lotes um por vez, começando pelo 1 e depois pelo 2. Este recorte já estava iniciado; fica preservado, sem significar encerramento do lote 3. Sua expansão foi interrompida.

Há funções puras para alinhar volumes, distribuir centros/vãos, repetir objetos em fila/círculo e variar giro/tamanho com semente. O painel usa o mesmo controlador de comandos e histórico. As medidas locais do modelo podem acompanhar sua referência fixada por hash; referências anteriores podem receber as medidas do GLB já carregado, no mesmo lote da operação, sem escrita automática ao abrir.

O apoio pela base do volume considera pivô, escala por eixo e rotação. Modelos novos usam esse apoio; mudar seu tamanho sem deslocamento vertical conserva a distância entre a base e o chão. O alinhamento leva em conta os limites do volume transformado. A seleção de todos os objetos visíveis usa Ctrl+A. Não foram implementadas todas as ferramentas do lote.

Testes locais: 51 no núcleo, 33 na oficina e dez no motor. Tipagem do núcleo, motor e oficina conferida. O script `playground/oficina/verificar-organizacao.mjs` passou no Chrome claro/escuro: pôr três modelos reais, alinhar, distribuir, criar seis cópias, desfazer/refazer, variar, sair, reabrir e desfazer. Nenhum erro de página. As capturas e o resultado estão no diretório local `output/cenarios-reforma/organizacao`, sem GLBs no Git.

**Revisão ainda necessária quando o lote 3 for retomado:** combinações de rotação XYZ na repetição circular, apoios entre objetos/água, desempenho de seleções extensas, ciclo completo por toque/celular e todos os requisitos restantes do lote (conjuntos, espalhar, espelhar, trocar, materiais, hierarquia/camadas, laço, clipboard e ensaio jogável). O ensaio local não comprova persistência remota nem qualidade artística da Faísca.

O foco volta exclusivamente às pendências e à revisão final do lote 1. Só após seu fechamento será retomado o lote 2.
