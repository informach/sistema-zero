# Operações em regiões autorais: primeiro lote

Leitor com índice limitado aos chunks ocupados e visita que não varre as
lacunas. O índice é do chamador, sem cache global que retenha o histórico.
Gestos conferem valores/coordenadas e orçamento antes de alocar buffers;
copiam cada chunk alterado uma vez, compartilham os intactos e removem
chunks vazios. Última escrita vence; voltar ao valor inicial é um no-op.
O custo final admite trocar um chunk por outro independentemente da ordem.

Limite de 65.536 edições por gesto, separado do teto global de 2.048 chunks.
Um gesto espalhado em regiões vazias examina suas edições, sem varrer 1.024
células inexistentes por região. Conversões densas exigem extensão e orçamento
explícitos; dados fora da extensão são recusados, sem recorte silencioso.

32 testes focados/211 verificações. Regressão com operações densas existentes:
88 testes/584 verificações; inclui 30 gestos determinísticos com igualdade
completa das grades e estados anteriores preservados. Core completo: 3.171
testes, sem falhas/omissões. Tipos completos Pinta/Core e Biome: saída 0.

As operações ainda não substituem os acessos do documento/editor. Schema 8,
protocolo local 3, UI, cena e motores continuam nas tarefas seguintes. Nenhum
gravador novo foi ativado. Este lote não conclui 8a e não comprova desempenho
em navegador ou novos dispositivos físicos.
