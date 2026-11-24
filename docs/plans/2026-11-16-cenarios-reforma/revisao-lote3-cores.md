# Lote 3 — Tonalidade por objeto

17/11/2026, `staging`, continuação de `56bd8ce1f`. **Parte 3.3 em andamento: textura por objeto ainda não está implementada.**

## Implementado

- Tonalidade em `instancia.aparencia.cor`, validada como hexadecimal, sem alterar o arquivo ou a definição do acervo. A cor combina com a paleta e as texturas originais.
- Painel Aparência para uma ou várias instâncias, com o próprio seletor HSV/hexadecimal do Molda. Um adaptador público de UI compartilha o componente existente, sem duplicar seu motor ou acessar o estado de modelagem.
- Escolha preliminar e botão Aplicar tonalidade: um passo de histórico por aplicação, mesmo com vários objetos. Trocar a seleção ou restaurar outra cor invalida a escolha preliminar anterior. Cadeados próprios e herdados são respeitados; seleção maior que 500 informa o limite da ação.
- Restaurar cores originais, desfazer/refazer, espelhar, trocar modelo e reabrir conservam os dados corretos.
- `instanceColor` no lote existente: cópias coloridas continuam compartilhando malha, geometria e materiais. Objetos sem tonalidade não criam atributo extra; limpar/reordenar cópias não herda a cor de outra instância. A análise da seleção é reaproveitada durante o gesto de escolher cor.

## Verificação e revisão

| Grupo | Testes | Asserções |
|---|---:|---:|
| Núcleo integrado | 104 | 3.160 |
| Motor | 33 | 504 |
| Oficina e hosts | 40 | 270 |
| Controles/acessibilidade do Molda | 13 | 635 |
| Postgres descartável | 18 | 135 |

Nenhuma falha. Tipagem de núcleo, motor, oficina, Molda e Members aprovada, sequencialmente. Biome dos arquivos alterados e conferência do diff aprovados. Os 30 testes adicionais do núcleo são os módulos isolados recebidos da sessão paralela, sem ligação antecipada à oficina.

Testes conferem isolamento entre cópias, compartilhamento real de material/geometria, valores do atributo de cor, limpeza de slots, recusa de hexadecimal inválido, histórico e persistência JSONB. Nenhum novo blob é criado pela cor.

Ensaios Chrome claro/escuro em 1440 px e escuro em 390 px: quatro formas com cores distintas, aplicação múltipla, restauração, undo e reentrada; poço/banco reais do acervo com espelho e troca de modelo, preservando a tonalidade. Nenhum erro de página ou rolagem horizontal. Capturas inspecionadas visualmente. Não representa aprovação artística da Faísca nem teste em aparelhos físicos.

Reprodução: `verificar-formas.mjs <saída> --cores` e `verificar-espelho-troca.mjs <saída> --cores`. Evidências em [evidencias/lote3-cores](evidencias/lote3-cores).

## Continuidade

Implementar a textura de biblioteca por objeto, com referências autorizadas, escala física, proteção no histórico/armazenamento e descarte. A parte 3.3 e o lote 3 não estão concluídos. Os demais itens do lote seguem no plano detalhado; implantação e validação remota ficam no encerramento global.
