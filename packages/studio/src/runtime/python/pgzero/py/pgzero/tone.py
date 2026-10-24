"""Pygame Zero's tone generator needs numpy and is not available in the Studio."""


def _unavailable(*args, **kwargs):
    raise NotImplementedError(
        'tone ainda não existe no Pygame Zero do Estúdio. Use um som da pasta sounds/: '
        'sounds.nome.play().'
    )


play = create = _unavailable
