/** Private JSON.stringify-equivalent projection/UTF-8 meter for parsed JSON snapshots.
 * Not JCS (no property sorting; ordinary JSON.stringify maps non-finite numbers to null).
 */
export const pythonJsonWire = `import math

def _pinta_json_number(value):
    try:
        number=float(value)
    except OverflowError:
        return 'null'
    if not math.isfinite(number):
        return 'null'
    if number==0:
        return '0'
    sign='-' if number<0 else ''
    number=abs(number)
    mantissa,separator,exponent=repr(number).partition('e')
    whole,dot,fraction=mantissa.partition('.')
    digits=(whole+fraction).lstrip('0')
    power=(int(exponent) if separator else 0)-len(fraction)
    trimmed=digits.rstrip('0')
    power+=len(digits)-len(trimmed)
    digits=trimmed
    if 1e-6<=number<1e21:
        point=len(digits)+power
        if point<=0:
            text='0.'+'0'*(-point)+digits
        elif point>=len(digits):
            text=digits+'0'*(point-len(digits))
        else:
            text=digits[:point]+'.'+digits[point:]
    else:
        exponent=power+len(digits)-1
        text=digits[0]+('.'+digits[1:] if len(digits)>1 else '')+'e'+('+' if exponent>=0 else '')+str(exponent)
    return sign+text

def _pinta_json_string_bytes(text,maximum):
    # Fast path for PNG data URIs and IDs; do not allocate escaped image strings.
    if text.isascii() and text.isprintable() and '"' not in text and chr(92) not in text:
        size=len(text)+2
        if size>maximum:
            raise ValueError('JSON budget exceeded')
        return size
    size,index=2,0
    while index<len(text):
        code=ord(text[index])
        if code in (34,92) or code in (8,9,10,12,13):
            size+=2
        elif code<32:
            size+=6
        elif 0xd800<=code<=0xdbff and index+1<len(text) and 0xdc00<=ord(text[index+1])<=0xdfff:
            size+=4
            index+=1
        elif 0xd800<=code<=0xdfff:
            size+=6
        elif code<128:
            size+=1
        elif code<2048:
            size+=2
        elif code<65536:
            size+=3
        else:
            size+=4
        if size>maximum:
            raise ValueError('JSON budget exceeded')
        index+=1
    if size>maximum:
        raise ValueError('JSON budget exceeded')
    return size

def _pinta_json_project(value,maximum):
    """Private parsed snapshot only: measure/project like JSON.parse(JSON.stringify(value)).
    Mutates only this caller-owned tree; no wire string or dense map is allocated.
    """
    if type(maximum) is not int or maximum<0:
        raise ValueError('Invalid JSON budget')
    used=0
    def add(size):
        nonlocal used
        used+=size
        if used>maximum:
            raise ValueError('JSON budget exceeded')
    def visit(item):
        kind=type(item)
        if item is None:
            add(4)
        elif kind is bool:
            add(4 if item else 5)
        elif kind in (int,float):
            text=_pinta_json_number(item)
            add(len(text))
            return None if text=='null' else (0.0 if item==0 else float(item))
        elif kind is str:
            add(_pinta_json_string_bytes(item,maximum-used))
        elif kind is list:
            add(2+max(0,len(item)-1))
            for index in range(len(item)):
                item[index]=visit(item[index])
        elif kind is dict:
            add(2+max(0,len(item)-1)+len(item))
            for key in item:
                if type(key) is not str:
                    raise ValueError('JSON object keys must be strings')
                add(_pinta_json_string_bytes(key,maximum-used))
                item[key]=visit(item[key])
        else:
            raise ValueError('Unsupported JSON value')
        return item
    projected=visit(value)
    return projected,used
`
