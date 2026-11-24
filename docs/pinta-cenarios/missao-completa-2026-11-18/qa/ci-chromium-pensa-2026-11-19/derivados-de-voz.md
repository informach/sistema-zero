# Derivados de edição ausentes

O CI `44630859047`, na revisão `7842a980e`, passou nos ensaios de navegador,
inclusive Pensa e Community Kids. O job geral parou em `Falas ElevenLabs
atualizadas`: faltava o arquivo `.edicao.json` da aula 2 de
`como-ajudar-seu-filho-autista-nas-frustracoes`.

O inventário local confirmou que faltavam os cinco derivados de edição desse
curso. Foram gerados pelo comando existente, sem alterar roteiros, manifestos,
falas ou o gerador:

```powershell
bun docs/aulas-interativas-tecnico/qa/gerar-falas-elevenlabs.ts pais
bun docs/aulas-interativas-tecnico/qa/gerar-falas-elevenlabs.ts --check
```

O primeiro comando mudou apenas esses cinco arquivos antes ausentes. A
conferência completa terminou com código 0 no Windows em 19/11/2026. Os bytes
foram copiados para esta branch de CI e comparados por SHA-256; Biome conferiu
os dez arquivos JSON/texto elegíveis da pasta, sem correções. O check original
permanece obrigatório. Isso não substitui a nova execução do CI Linux.
