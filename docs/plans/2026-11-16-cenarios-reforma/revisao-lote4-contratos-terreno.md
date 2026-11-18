# Lote 4 — Contratos e persistência do terreno

Data: 17/11/2026. Continuação após o fechamento do lote 3 (`97961f1bc`, integrado em `e7b4ce604`). **Recorte interno 4.1–4.2; o lote 4 permanece aberto.** Não é entrega das ferramentas visuais nem aprovação artística da Faísca.

## Implementado

Os algoritmos puros do Claude foram integrados à API do núcleo: pincéis de altura, receitas, pintura e PNG. A base aceita até oito camadas de solo com nome, cor e textura da tabela existente, pintura por peça/hash e buracos por célula. Identidades e posições das peças são validadas independentemente das camadas de organização dos objetos. Recortes poligonais importados continuam preservados.

Os três formatos são distinguíveis e conferidos pelos bytes: alturas SZHT já existentes (8.474 bytes), pintura SZHP (4.233 a 33.808 bytes) e buracos SZHO (520 bytes, incluindo cabeçalho e 512 bytes de bits). Metadados da confirmação identificam intervalo ou quantidade de camadas. O cabeçalho e os pesos são conferidos, não apenas tamanho/nome declarado pelo navegador.

O campo transitório abre recursos, prepara somente regiões sujas, inclui as duas peças numa divisa e conserva hashes que não mudaram. Regravar o mesmo conteúdo conserva a identidade da base, sem revisão artificial. Redimensionamento reamostra em coordenadas de mundo, conserva a soma 255 dos pesos e usa cobertura conservadora de buracos para não fechar aberturas pequenas ao reduzir a resolução. Novas áreas usam fundo e primeira camada. A UI ainda precisará expor e explicar essas decisões.

Pintura e buracos seguem a mesma reserva, cota, isolamento por espaço, upload condicional e confirmação transacional usados pelas alturas. A aplicação verifica o papel real de cada digest e o número de camadas antes de aceitar a base. Uma confirmação incompatível reverte arquivos e revisão. Cabeça, snapshots, lotes, inversos e cópias protegem recursos; apagar o último dono permite a coleta. Texturas de solo também não podem ser removidas enquanto usadas.

A migration **0162**, gerada por `bun run db:generate`, estende a restrição dos metadados de terreno. Foi aplicada ao banco QA descartável na porta 55439; nenhum banco remoto foi alterado. Ela preserva o formato SZHT e suas provas anteriores. Não houve alteração manual do SQL gerado.

## Correções da revisão

- O campo de trabalho Float32 perdia valores Uint16 em faixas estreitas próximas de alturas elevadas. O teste reproduziu milhares de bytes diferentes ao simplesmente abrir/regravar. O campo passou a Float64; o binário persistido continua Uint16, com ida e volta idêntica. Uma grade máxima de 4097² usa aproximadamente 128 MiB para alturas de trabalho; isso não é tamanho de upload e precisa ser considerado na integração/worker.
- Medidas não finitas eram aceitas pelo construtor do campo. Teste vermelho/verde cobre passo infinito, origem NaN e altura inválida, com os mesmos limites do documento.
- A ordenação das referências podia transformar uma gravação sem alteração em uma base nova. O mapa agora preserva a ordem existente e devolve a referência original quando nada muda.
- A inversão precisa soltar referências da base antes de remover texturas recém-adicionadas. A ordem foi corrigida e o ciclo de desfazer confere a identidade completa do documento anterior.
- O SQL de arquivos ainda só conhecia `base.pecas`. O teste de apagar o último dono de pintura/buracos ficou vermelho. Os caminhos estruturais de cabeça, comandos e inversos agora incluem `base.solo.pecas` e `base.buracos`, sem tratar propriedades livres do usuário como referências.
- A identidade de leitura da base passou a incluir solo e buracos, mantendo independência da ordem das propriedades JSON recebidas do banco.

## Verificação do recorte

| Verificação local | Resultado |
|---|---|
| Núcleo completo | 165 testes / 8.229 asserções |
| Oficina/hosts completos | 68 testes / 454 asserções |
| Members serviço e histórico | 32 testes / 104 asserções |
| Members HTTP | 18 testes / 132 asserções |
| Conteúdo BFF | 8 testes / 38 asserções |
| BFF rotas e endereços | 29 testes / 159 asserções |
| Postgres real, migrations até 0162 | 36 testes / 325 asserções |
| Tipagem núcleo, motor, oficina, Members e member-shell | Aprovada |

O teste SQL novo cobre confirmação ausente, número de camadas incompatível com rollback, confirmação válida, desfazer/reabrir, cópia, exclusão de um dos donos e coleta após o último. Os casos anteriores continuam cobrindo conflito, intervalo e falha transacional até o COMMIT. No host local, oito camadas e buracos percorrem cota, autoria, undo/redo, cópia e coleta. No BFF, bytes reais são lidos em stream e cabeçalhos corrompidos são recusados.

Não há evidência visual nova neste recorte de contratos. Próximo: malha e material de solo, prévia dos gestos e ferramentas da aba Terreno, seguido da verificação completa do lote. Água/caminhos e demais lotes continuam na ordem original. Implantação e prova remota ficam para o encerramento global.
