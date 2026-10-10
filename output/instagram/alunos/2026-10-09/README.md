# Alunos · produção de 09/10/2026

Lote vigente: sete stories completos em `finais-ampliados`, 1080 × 1920. Ordem: AL01 → AL02 Rafael → AL03 Jeffrey → AL04 Débora → AL05 André → AL07 Fernando → AL06. Os arquivos de 01 a 07 indicam a ordem; os IDs do roteiro permanecem estáveis. A abertura reúne as cinco fotos e não fixa nomes ou quantidade na copy.

As cinco cenas de atividade são provisórias, geradas com as referências das crianças por solicitação do responsável, para receber vídeos depois. Não são registros documentais das aulas. A geração usou a ferramenta integrada image_gen. Prompts e referências: `prompts-cenas.json`, `prompts-fernando-jeffrey.json` e `prompt-ajuste-tela-debora.json`. A cena vigente da Débora termina em `-v2.png` e mostra uma captura do Farol personalizado. A abertura usa fotos reais; AL06 mostra a captura do jogo como demonstração da equipe.

`montar-stories.mjs` lê a copy do guia e o destino do sticker. `renderizar-e-conferir.mjs` exporta sete telas e cinco molduras e verifica copy, margens, imagens, identificação e transparência. As molduras vigentes estão em `molduras-ampliadas`, entregues na subpasta `molduras`. A janela mede 976 × 970, x 52, y 480, com raio 32. Conferir a ação e a legenda ao inserir cada vídeo.

A entrega está em `docs/marketing/kids/comunidade-dos-criadores/instagram/producao/destaques/alunos`. `publicacao.txt` contém a ordem, as legendas e o link do sticker da imagem 07. A conferência vigente é `conferencia-ampliada.png`; outras pastas de finais são versões anteriores. `verificar-entrega.mjs` confere dimensões, quantidade e hashes dos arquivos entregues.
