import sys
import os

def find_descriptors(path, needle=b'LazyKType'):
    with open(path, 'rb') as f:
        data = f.read()
    res = []
    i = 0
    while True:
        idx = data.find(needle, i)
        if idx == -1:
            break
        # find nearest 'L' before idx
        start = data.rfind(b'L', 0, idx)
        end = data.find(b';', idx)
        context = data[start:end+1] if start!=-1 and end!=-1 else data[max(0,idx-60):idx+60]
        res.append(context)
        i = idx + len(needle)
    return res

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: inspect_dex.py <path_to_dex>')
        sys.exit(2)
    path = sys.argv[1]
    contexts = find_descriptors(path)
    print('FILE:', path)
    for c in contexts:
        try:
            print(c.decode('utf-8', errors='replace'))
        except Exception:
            print(repr(c))
