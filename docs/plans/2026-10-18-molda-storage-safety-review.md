# Revisão da proteção de armazenamento do Molda

## Resultado

A oficina passa a guardar recuperação independente do autosave principal, com dois pontos por sessão, blocos comprimidos de 64 KiB, deduplicação e limite próprio. O fechamento de um aviso mantém a cópia disponível; descartá-la exige confirmação. A gravação principal usa capacidade estimada da origem e margem de segurança em vez do teto fixo de 96 MiB.

O acúmulo de pixels foi corrigido no caminho real da galeria: gravação legada com índice, promoção com originais e lápides, convivência com texturas legadas e salvamentos subsequentes. A limpeza também considera blobs antigos sem referência, preservando originais e registros desconhecidos.

## Achados corrigidos durante a revisão

1. Índices legados com `formatVersion: 1` e índices dentro dos originais também precisavam ser reconhecidos como dados inline. Regressão com mil alterações usa o escritor real da galeria.
2. A consulta assíncrona de capacidade não pode preceder a captura dos dados do caller. A preparação agora captura a cena antes da consulta; o escritor legado também possui os dados antes de aguardar a estimativa.
3. Trocar o documento de um editor não pode criar recuperação sob outro ID nem gastar o token de outra criação.
4. Miniaturas e carimbos de gravação não alteram a revisão autoral protegida. Uma gravação derivada feita pela própria sessão não invalida a recuperação, e commits anteriores que terminam em voo atualizam corretamente sua revisão base.
5. Arrastos e prévias não devem criar um worker por movimento. `committedRevision` distingue operações terminadas; a drenagem explícita ainda protege o snapshot que pode ser salvo.
6. Cópias preparadas são reutilizadas durante a saída. Isso evita o erro de acesso do worker iniciado desnecessariamente durante o recarregamento no WebKit.
7. Descartes usam comparação do checkpoint capturado e preservam trabalho mais recente de outra aba. Recuperar um ponto anterior válido não apaga o ponto mais recente corrompido.
8. Falha na troca do checkpoint reverte também gravações dos blocos e preserva o ponto completo anterior. O pool tem teto próprio, contado antes das mutações.
9. DEFLATE pode ter representações diferentes dos mesmos bytes. A deduplicação compara os pixels originais quando os pacotes diferem; RGB sob transparência e dados pouco compressíveis permanecem exatos.
10. Falha ao limpar uma recuperação antiga não pode rotular uma gravação principal bem-sucedida como não salva. Avisos de conflito entre abas também mantêm sua mensagem própria.
11. A criação legada e a promoção para a nova oficina precisam compartilhar a política de capacidade. O cálculo considera o espaço já ocupado pela própria galeria; na ausência da API de estimativa, usa o fallback sem uma leitura adicional do banco.

## Evidências

- Reprodução isolada com o teto antigo de 96 MiB: modelo de aproximadamente 1 MiB permaneceu nesse tamanho após 100 gravações. A versão anterior recusava a 96ª gravação após acumular aproximadamente 95 MiB.
- Mil alterações de pintura mantêm somente os blobs ativos e preservam os originais; um blob acumulado previamente também é coletado.
- 128 traços mantêm dois checkpoints e três blocos usados, em vez de conservar todas as versões.
- Falha do autosave principal e recarga real: o trabalho encontrado pode ser baixado e retomado, mantendo geometria, pixels e animações. Fechar/reabrir o diálogo preserva a recuperação.
- Seis cenários de navegador passaram: Chromium, Firefox e WebKit, nos temas claro e escuro. Capturas dos dois avisos foram inspecionadas.
- Typecheck do Molda e do consumidor `community-kids`, build do playground e lint dos 44 arquivos de código alterados passaram.
- A suíte completa passou com 3.387 testes. Após alinhar a política de criação/promoção, a terceira partição foi repetida: 1.121 testes passaram, elevando o conjunto a 3.389. Os 379 testes de estado também passaram isoladamente, incluindo duas novas regressões para quota e contagem do espaço próprio.
- Doze cenários complementares passaram nos três navegadores: criar/promover/voltar/reabrir, recuperação em claro e escuro e animação/exportação GLB. Uma atualização do servidor durante a primeira execução interrompeu o teste de miniatura no WebKit; os quatro fluxos desse navegador passaram na repetição sem edições em paralelo.

Não restam falhas conhecidas nos fluxos verificados.

## Limites e migração

O banco pessoal do navegador não foi inspecionado ou apagado por ferramentas. A coleta é aplicada pelo escritor da oficina ao salvar e só remove recursos cuja ausência de referências foi comprovada na transação. Dados desconhecidos e cópias corrompidas permanecem preservados.

A recuperação usa a mesma origem e continua sujeita à quota física. Quando não pode ser gravada, o editor avisa e oferece baixar o conteúdo em memória. O aviso de saída é complementar, não a fonte principal de proteção. Esta entrega protege novas edições; não inventa estados completos de trabalho já perdido antes da existência dos checkpoints.

Este relatório registra a etapa local anterior à publicação. A revisão posterior está em
`2026-10-18-molda-release-full-review.md`.
