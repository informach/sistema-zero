import re
from warnings import warn

from .constants import keys

DEPRECATED_KEY_RE = re.compile(r'[A-Z]')
PREFIX_RE = re.compile(r'^K_(?!\d$)')


class _MissingKey(KeyError):
    """KeyError with a readable message (a plain KeyError shows its text between quotes)."""

    def __str__(self):
        return self.args[0]


class Keyboard:
    """The current state of the keyboard.

    Each attribute represents a key. For example, ::

        keyboard.a

    is True if the 'A' key is depressed, and False otherwise.

    """
    # The current key state. This may as well be a class attribute - there's
    # only one keyboard.
    _pressed = set()

    def __getattr__(self, kname):
        if DEPRECATED_KEY_RE.match(kname):
            warn(
                "Uppercase keyboard attributes (eg. keyboard.%s) are "
                "deprecated." % kname,
                DeprecationWarning,
                2
            )
            kname = PREFIX_RE.sub('', kname)
        try:
            key = keys[kname.upper()]
        except KeyError:
            # Same exception as Pygame Zero 1.2.1, with a message a child can read.
            raise _MissingKey(
                'A tecla keyboard.%s não existe. Confira o nome: por exemplo keyboard.space, '
                'keyboard.left ou keyboard.a.' % kname
            ) from None
        return key.value in self._pressed

    def _press(self, key):
        """Called by Game to mark the key as pressed."""
        self._pressed.add(key)

    def _release(self, key):
        """Called by Game to mark the key as released."""
        self._pressed.discard(key)

    def __getitem__(self, k):
        if isinstance(k, keys):
            return k.value in self._pressed
        else:
            warn(
                "String lookup in keyboard (eg. keyboard[%r]) is "
                "deprecated." % k,
                DeprecationWarning,
                2
            )
            return getattr(self, k)


keyboard = Keyboard()
