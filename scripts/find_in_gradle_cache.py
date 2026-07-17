import os
import sys

needle = b'LazyKType'
home = os.path.expanduser('~')
root = os.path.join(home, '.gradle', 'caches', 'modules-2', 'files-2.1')
found = []
if not os.path.isdir(root):
    print('Gradle cache not found at', root)
    sys.exit(2)

for dirpath, dirs, files in os.walk(root):
    for fn in files:
        if fn.lower().endswith(('.aar', '.jar', '.zip')):
            path = os.path.join(dirpath, fn)
            try:
                with open(path, 'rb') as f:
                    data = f.read()
                if needle in data:
                    found.append(path)
                    print('FOUND', path)
            except Exception:
                pass
print('TOTAL_FOUND:', len(found))
if len(found)==0:
    sys.exit(2)
