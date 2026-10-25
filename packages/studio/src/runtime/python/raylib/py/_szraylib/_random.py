"""GetRandomValue/SetRandomSeed do raylib: Xoshiro128** semeado por SplitMix64 (rprand.h).

Com a mesma semente, o Estúdio sorteia os mesmos números que o raylib do computador.
"""
_M32 = 0xFFFFFFFF
_M64 = 0xFFFFFFFFFFFFFFFF

_seed = 0xAABBCCDD
_state = [0x96EA83C1, 0x218B21E5, 0xAA91FEBD, 0x976414D4]


def _splitmix64():
    global _seed
    _seed = (_seed + 0x9E3779B97F4A7C15) & _M64
    z = _seed
    z = ((z ^ (z >> 30)) * 0xBF58476D1CE4E5B9) & _M64
    z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & _M64
    return z ^ (z >> 31)


def _rotl(x, k):
    return ((x << k) | (x >> (32 - k))) & _M32


def _xoshiro():
    s = _state
    result = (_rotl((s[1] * 5) & _M32, 7) * 9) & _M32
    t = (s[1] << 9) & _M32
    s[2] ^= s[0]
    s[3] ^= s[1]
    s[1] ^= s[2]
    s[0] ^= s[3]
    s[2] ^= t
    s[3] = _rotl(s[3], 11)
    return result


def set_seed(seed):
    global _seed
    _seed = seed & _M64
    _state[0] = _splitmix64() & _M32
    _state[1] = (_splitmix64() >> 32) & _M32
    _state[2] = _splitmix64() & _M32
    _state[3] = (_splitmix64() >> 32) & _M32


def get_value(low, high):
    if low > high:
        low, high = high, low
    span = abs(high - low) + 1
    value = _xoshiro() % (span & _M32 or 1) + low
    # int do C: o resultado volta para 32 bits com sinal.
    value &= _M32
    return value - (1 << 32) if value >= 1 << 31 else value
