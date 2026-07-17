import os
needle = b'LazyKType'
descriptor = b'Lexpo/modules/kotlin/types/LazyKType;'
home = os.path.expanduser('~')
root = os.path.join(home, '.gradle', 'caches')
found = []
for dirpath, dirs, files in os.walk(root):
    if 'expo.modules.av-16.0.8' in dirpath:
        for fn in files:
            if fn.lower().endswith(('.dex', '.jar', '.aar', '.zip')):
                path = os.path.join(dirpath, fn)
                try:
                    with open(path, 'rb') as f:
                        data = f.read()
                    if needle in data or descriptor in data:
                        found.append(path)
                except Exception:
                    pass
print('TOTAL_FOUND:', len(found))
for p in found:
    print(p)
