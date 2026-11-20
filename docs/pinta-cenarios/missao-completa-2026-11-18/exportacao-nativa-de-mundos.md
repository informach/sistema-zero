# Arquivo editável com mapas ligados

Na homologação autenticada de 20/11, a Vila chegou ao Estúdio com a cabana e o
percurso de ida e volta funcionou. A exportação editável usa outro caminho:
`assetBundleToJson` percorre referências por ID, mas ignora os destinos de portas
por nome. O arquivo pode conservar a porta e omitir seu mapa de destino.

A correção integra a etapa 7 e a aceitação da etapa 9, sem mudar o visual ou
ativar o gravador de nuvem. O documento nativo continua sendo a autoridade.

## Decisão

Extrair do resolvedor existente de mundos a resolução dos destinos das portas e
compartilhá-la com o pacote nativo. Incluir portas de camadas ocultas e conjuntos,
nomes legados, referências tipadas, ciclos e recursos de todos os mapas encontrados.
Não criar outra lógica de resolução nem impor ao backup o teto de execução de
16 mapas: o teto nativo continua sendo o orçamento existente de dependências e bytes.

O coletor de recursos será compartilhado entre exportação e reconhecimento do
pacote na importação. Reconhecer um mundo conectado completo permite o restauro
atômico já existente. A detecção trabalhará com IDs, sem codificar e decodificar
imagens repetidamente para cada raiz possível. Backups com desenhos independentes
conservam a política de importação existente.

`assetToJson` continua transportando exatamente um desenho para aulas e nuvem.
O envelope e os schemas não mudam: os recursos já são aceitos pelo leitor atual.
Destino configurado ausente ou ambíguo recusa o arquivo portátil completo, com
recado no componente existente. Portas ainda sem destino continuam editáveis.
O backup geral da galeria continua disponível para conservar trabalhos incompletos.

## Execução e aceite

1. Reproduzir com a fixture real da Vila: arquivo editável precisa conter os seis
   recursos e ambos os mapas, conservando integralmente seus documentos.
2. Compartilhar a resolução e o coletor, preservando ordem, ciclos e orçamentos.
3. Cobrir destino ausente/ambíguo, pacote conectado versus galeria independente,
   cadeia nativa acima de 16 mapas e os contratos legados de um desenho.
4. Executar regressões, tipos e suíte do Pinta. Repetir exportação e restauro no
   navegador e comparar os hashes completos dos seis recursos.
5. Registrar evidências e integrar o lote verificado. O rollout Python/nuvem e
   a publicação autenticada continuam como critérios separados da etapa 0b.
