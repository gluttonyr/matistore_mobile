import os
needle1 = b'expo/modules/kotlin'
needle2 = b'expo.modules.kotlin'
home = os.path.expanduser('~')
root = os.path.join(home, '.gradle', 'caches')
found = []
for dirpath, dirs, files in os.walk(root):
    for fn in files:
        if fn.lower().endswith(('.aar', '.jar', '.zip', '.dex', '.class')):
            path = os.path.join(dirpath, fn)
            try:
                with open(path, 'rb') as f:
                    data = f.read()
                if needle1 in data or needle2 in data:
                    found.append(path)
            except Exception:
                pass
print('FOUND:', len(found))
for p in found:
    print(p)
