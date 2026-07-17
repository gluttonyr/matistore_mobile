import sys, zipfile, os
needle = b'LazyKType'
apk = sys.argv[1] if len(sys.argv)>1 else 'android/app/build/outputs/apk/debug/app-debug.apk'
apk = os.path.abspath(apk)
if not os.path.exists(apk):
    print('APK not found:', apk)
    sys.exit(2)

found = []
with zipfile.ZipFile(apk, 'r') as z:
    for name in z.namelist():
        if name.endswith('.dex'):
            data = z.read(name)
            if needle in data:
                found.append((name, data.count(needle)))

print('APK:', apk)
print('FOUND DEX COUNT:', len(found))
for n,c in found:
    print(n, 'occurrences=', c)
if len(found)==0:
    sys.exit(1)
else:
    sys.exit(0)
