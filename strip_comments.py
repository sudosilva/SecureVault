import tokenize
import io
import re
import os

LICENSE_HEADER_PY = "# Copyright (c) 2026 SudoSilva. Licensed under Custom (Personal/Non-Commercial).\n"
LICENSE_HEADER_JS = "/* Copyright (c) 2026 SudoSilva. Licensed under Custom (Personal/Non-Commercial). */\n"
LICENSE_HEADER_HTML = "<!-- Copyright (c) 2026 SudoSilva. Licensed under Custom (Personal/Non-Commercial). -->\n"

def strip_python(content):
    pattern = r'("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|#.*)'
    def replacer(match):
        m = match.group(0)
        if m.startswith('#'):
            return ""
        return m
    
    out = re.sub(pattern, replacer, content)
    out = re.sub(r'^\s*("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\')\s*$', '', out, flags=re.MULTILINE)
    out = re.sub(r'\n\s*\n', '\n\n', out)
    return LICENSE_HEADER_PY + out.strip() + "\n"

def strip_js_css(content, header):
    pattern = r'("(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|`(?:\\.|[^`\\])*`|/\*[\s\S]*?\*/|//.*)'
    def replacer(match):
        m = match.group(0)
        if m.startswith('/') or m.startswith('/*'):
            return ""
        return m
    content = re.sub(pattern, replacer, content)
    content = re.sub(r'\n\s*\n', '\n\n', content)
    return header + content.strip() + "\n"

def strip_html(content):
    content = re.sub(r'<!--[\s\S]*?-->', '', content)
    content = re.sub(r'\n\s*\n', '\n\n', content)
    return LICENSE_HEADER_HTML + content.strip() + "\n"

def process_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    ext = os.path.splitext(path)[1]
    if ext == '.py':
        new_content = strip_python(content)
    elif ext in ['.js', '.css']:
        new_content = strip_js_css(content, LICENSE_HEADER_JS)
    elif ext == '.html':
        new_content = strip_html(content)
    else:
        return
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Processed {path}")

files = [
    "main.py",
    "modules/api.py",
    "modules/gui.py",
    "modules/locker.py",
    "modules/shredder.py",
    "modules/notes/notes.py",
    "modules/passwords/passwords.py",
    "shared/config.py",
    "shared/crypto.py",
    "shared/utils.py",
    "util/build.py",
    "web/main.js",
    "web/style.css",
    "web/index.html"
]

root = "."
for f in files:
    p = os.path.join(root, f)
    if os.path.exists(p):
        process_file(p)
    else:
        print(f"Warning: {p} not found")
