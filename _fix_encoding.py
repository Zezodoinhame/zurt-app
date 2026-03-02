import re

files = [
    'app/(tabs)/cards.tsx',
    'app/(tabs)/index.tsx',
    'app/(auth)/biometric.tsx',
    'app/(tabs)/profile.tsx',
    'app/budget.tsx',
    'app/news.tsx',
    'app/diary.tsx',
    'src/utils/currencyRates.ts',
    'src/stores/cryptoStore.ts',
]

# Accented chars that sed left with stray backslash
ACCENTED = 'àáâãçèéêíóôõúüÀÁÂÃÇÉÊÍÓÔÕÚ£¥Ð©®·'

# Regex for remaining \u00XX patterns
UNESCAPE_RE = re.compile(r'\u(00[0-9A-Fa-f]{2})')

def fix_escape(m):
    return chr(int(m.group(1), 16))

for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as fh:
            content = fh.read()
        original = content

        # Step 1: Remove stray backslash before accented characters
        for ch in ACCENTED:
            content = content.replace('\' + ch, ch)

        # Step 2: Replace any remaining \u00XX patterns
        content = UNESCAPE_RE.sub(fix_escape, content)

        if content != original:
            with open(f, 'w', encoding='utf-8') as fh:
                fh.write(content)
            diff = len(original) - len(content)
            print(f'Fixed: {f} (removed {diff} chars)')
        else:
            print(f'No changes: {f}')
    except Exception as e:
        print(f'Error in {f}: {e}')
