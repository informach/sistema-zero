/** Private native Pygame Zero adapter. Assemble with the world, scene, and backend sources. */
export const pythonPgzeroRegional = `class CenarioRegionalPygameZero(_PintaSceneBackend):
    """Abra os bytes do PNG e desenhe no screen do Pygame Zero a cada quadro."""

    _criar_renderizador = _PintaPygameAffine

    def desenhar(self, screen, camera=(0, 0), frente=False, tempo=None):
        tela = screen.surface
        draw_affine = self._renderizador.desenhar(tela)
        if tempo is None:
            tempo = self.tempo_decorrido
        self.cena.desenhar(draw_affine, tela.get_size(), camera, frente, tempo)

    def recurso_imagem(self, referencia):
        renderizador = self._renderizador
        return renderizador.imagem(self.cena.recurso_imagem(referencia))
`
