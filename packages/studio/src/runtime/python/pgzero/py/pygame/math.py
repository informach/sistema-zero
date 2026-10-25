"""pygame.math.Vector2: a 2D vector for positions, speeds and directions (pygame-ce's API)."""
import math as _math


def _number(value):
    return f'{value:g}' if isinstance(value, float) else str(value)


def _pair(value):
    if isinstance(value, Vector2):
        return value.x, value.y
    x, y = value
    return x, y


class Vector2:
    __slots__ = ('x', 'y')

    def __init__(self, x=0, y=None):
        if y is None:
            if isinstance(x, (int, float)):
                x, y = x, x
            else:
                x, y = _pair(x)
        self.x = float(x)
        self.y = float(y)

    # Sequence -----------------------------------------------------------------------------
    def __iter__(self):
        yield self.x
        yield self.y

    def __len__(self):
        return 2

    def __getitem__(self, index):
        return (self.x, self.y)[index]

    def __setitem__(self, index, value):
        if index in (0, -2):
            self.x = float(value)
        elif index in (1, -1):
            self.y = float(value)
        else:
            raise IndexError('Vector2 index out of range')

    def __repr__(self):
        return f'Vector2({_number(self.x)}, {_number(self.y)})'

    def __str__(self):
        return f'[{_number(self.x)}, {_number(self.y)}]'

    def __eq__(self, other):
        try:
            return (self.x, self.y) == tuple(map(float, _pair(other)))
        except (TypeError, ValueError):
            return NotImplemented

    __hash__ = None

    # Arithmetic ---------------------------------------------------------------------------
    def __add__(self, other):
        x, y = _pair(other)
        return Vector2(self.x + x, self.y + y)

    __radd__ = __add__

    def __sub__(self, other):
        x, y = _pair(other)
        return Vector2(self.x - x, self.y - y)

    def __rsub__(self, other):
        x, y = _pair(other)
        return Vector2(x - self.x, y - self.y)

    def __mul__(self, other):
        if isinstance(other, (int, float)):
            return Vector2(self.x * other, self.y * other)
        x, y = _pair(other)
        return self.x * x + self.y * y

    __rmul__ = __mul__

    def __truediv__(self, other):
        return Vector2(self.x / other, self.y / other)

    def __floordiv__(self, other):
        return Vector2(self.x // other, self.y // other)

    def __neg__(self):
        return Vector2(-self.x, -self.y)

    def __pos__(self):
        return Vector2(self.x, self.y)

    def __bool__(self):
        return self.x != 0 or self.y != 0

    # Vector operations ---------------------------------------------------------------------
    def copy(self):
        return Vector2(self.x, self.y)

    def dot(self, other):
        x, y = _pair(other)
        return self.x * x + self.y * y

    def cross(self, other):
        x, y = _pair(other)
        return self.x * y - self.y * x

    def length(self):
        return _math.hypot(self.x, self.y)

    magnitude = length

    def length_squared(self):
        return self.x * self.x + self.y * self.y

    magnitude_squared = length_squared

    def normalize(self):
        length = self.length()
        if length == 0:
            raise ValueError("Can't normalize Vector of length zero")
        return Vector2(self.x / length, self.y / length)

    def normalize_ip(self):
        normal = self.normalize()
        self.x, self.y = normal.x, normal.y

    def is_normalized(self):
        return abs(self.length_squared() - 1) < 1e-6

    def scale_to_length(self, value):
        length = self.length()
        if length == 0:
            raise ValueError('Cannot scale a vector with zero length')
        self.x, self.y = self.x * value / length, self.y * value / length

    def distance_to(self, other):
        x, y = _pair(other)
        return _math.hypot(self.x - x, self.y - y)

    def distance_squared_to(self, other):
        x, y = _pair(other)
        return (self.x - x) ** 2 + (self.y - y) ** 2

    def angle_to(self, other):
        x, y = _pair(other)
        return _math.degrees(_math.atan2(y, x) - _math.atan2(self.y, self.x))

    def rotate(self, angle):
        radians = _math.radians(angle)
        c, s = _math.cos(radians), _math.sin(radians)
        x, y = self.x * c - self.y * s, self.x * s + self.y * c
        # pygame-ce snaps the quarter turns to exact values.
        if angle % 90 == 0:
            x, y = round(x), round(y)
        return Vector2(x, y)

    def rotate_ip(self, angle):
        turned = self.rotate(angle)
        self.x, self.y = turned.x, turned.y

    def lerp(self, other, value):
        x, y = _pair(other)
        return Vector2(self.x + (x - self.x) * value, self.y + (y - self.y) * value)

    def as_polar(self):
        return self.length(), _math.degrees(_math.atan2(self.y, self.x))

    def update(self, x=0, y=None):
        fresh = Vector2(x, y)
        self.x, self.y = fresh.x, fresh.y


__all__ = ['Vector2']
