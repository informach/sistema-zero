# Armazenamento e recuperação do Molda

Proposta aprovada pelo responsável em 18/10/2026. Preservar as alterações locais anteriores de UV, animação e exportação.

## Entrega

1. Corrigir a classificação dos originais conhecidos e lápides legadas. Coletar pixels sem referência somente após verificar todos os documentos e raízes conhecidos na transação. Registros desconhecidos continuam preservados e impedem coleta insegura. Limpar também o acúmulo anterior.
2. Manter recuperação independente do sucesso do autosave principal, com revisões, identidade da sessão e conteúdo comprimido sem perdas. Oferecer continuar o trabalho recuperado ao reabrir; conflitos não sobrescrevem alterações de outra aba.
3. Trocar o teto padrão rígido de 96 MiB por política de capacidade com estimativa do navegador e margem de segurança. Manter limites explícitos de teste/importação e tratamento de quota física.
4. Apresentar falhas imediatamente, com baixar projeto e tentar novamente. Proteger navegação/recarregamento enquanto houver conteúdo sem gravação confirmada. Não depender do evento de saída para persistir.
5. Avaliar compressão e blocos pequenos com medidas de tamanho e tempo. Usar compressão sem perdas na recuperação; não modificar UV, dimensões, cores nem formato autoral dos projetos existentes.

## Verificação

- Regressão: modelo migrado, milhares de alterações de pintura, espaço estável e originais intactos.
- Coleta: recursos compartilhados, registros opacos, índice inválido, transações concorrentes e falha de escrita.
- Recuperação: falha do autosave, reabrir, gravação posterior, descarte explícito, duas abas e corrupção.
- Interface: aviso de falha, backup do conteúdo em memória e recuperação no navegador real.
- Typecheck, lint dos arquivos alterados e suites de persistência/host/exportação.

Não prometer espaço ilimitado nem recuperação após apagamento deliberado dos dados pelo navegador/usuário. A quota do navegador é compartilhada pela origem; um segundo registro não cria espaço físico.

## Implementação

- A coleta certifica originais legados conhecidos, índices legados e lápides. Verifica os manifestos reais de outras criações e recupera também blobs antigos sem referência. Formatos desconhecidos continuam preservados.
- A recuperação usa namespace próprio no mesmo IndexedDB, dois pontos por sessão, blocos de 64 KiB com DEFLATE sem perdas e SHA-256 sobre os pixels originais. A compactação acontece em worker; a troca do checkpoint e a coleta de blocos são atômicas.
- O pool de recuperação é limitado a 256 MiB. Ele permite preservar alterações quando o teto lógico principal impede salvar, mas continua sujeito à quota física da origem.
- O orçamento principal usa estimativa da origem, desconta o consumo estimado de outras ferramentas e reserva até 64 MiB (10% em origens menores). Há teto de segurança de 2 GiB e fallback de 512 MiB quando estimativas não estão disponíveis. Limites explícitos de callers/testes são respeitados.
- A criação de modelos e a promoção de projetos antigos seguem a mesma capacidade adaptativa. O consumo da própria galeria é contado separadamente do consumo das outras ferramentas da origem.
- Documentos decodificados/importações continuam limitados separadamente a 96 MiB; aumentar capacidade da galeria não amplia inadvertidamente os parsers.
- `committedRevision` distingue operações terminadas de arrastos e prévias. A recuperação não compacta cada movimento do ponteiro. Revisões de armazenamento podem avançar por miniaturas sem transformar uma recuperação válida em conflito.
- Ao falhar, há aviso com baixar projeto e tentar novamente. A reabertura oferece continuar, baixar ou escolher a versão salva. Fechar o diálogo preserva a recuperação; descartar exige confirmação. Conflitos de outra aba oferecem preservar ambas as versões em vez de sobrescrever.
- `beforeunload` avisa sobre mudanças pendentes; `visibilitychange` solicita drenagem. A proteção não depende desses eventos. Cópias já preparadas são reutilizadas, evitando iniciar workers desnecessários durante a saída no WebKit.

## Medidas

Reprodução isolada mantendo o teto antigo de 96 MiB: antes da correção, um modelo de 1.055.352 bytes guardou 99.624.932 bytes após 95 gravações; a 96ª foi recusada. Depois, 100 gravações guardaram 1.058.788 bytes e dois blobs, preservando originais. Há também regressão com mil alterações e limpeza de um blob antigo previamente acumulado.

Uma pintura indexada de 1024×1024 uniforme ocupa menos de 2 KiB de blocos comprimidos/deduplicados na recuperação. Um pixel alterado acrescenta um bloco; 128 traços mantêm somente os blocos usados pelos dois checkpoints. RGBA com RGB transparente e dados pouco compressíveis conserva todos os bytes.
