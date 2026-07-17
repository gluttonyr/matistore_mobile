import os
needle = b'LazyKType'
home = os.path.expanduser('~')
root = os.path.join(home, '.gradle', 'caches')
found = []
for dirpath, dirs, files in os.walk(root):
    for fn in files:
        if fn.lower().endswith(('.aar', '.jar', '.zip', '.dex')):
            path = os.path.join(dirpath, fn)
            try:
                with open(path, 'rb') as f:
                    data = f.read()
                if needle in data:
                    print('FOUND', path)
                    found.append(path)
            except Exception:
                pass
print('TOTAL_FOUND:', len(found))
