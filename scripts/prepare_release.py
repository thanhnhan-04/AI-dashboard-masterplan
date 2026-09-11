#!/usr/bin/env python3
"""Version the static site as one release before publishing to GitHub Pages.

Does not fetch financial data, commit, push or deploy. Local JS/CSS references
get content hashes; navigation gets a common release ID. The manifest lets QA
compare actual public bytes with this exact project build.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[1]
PAGES = ['index.html','Bank/index.html','Dau-khi/index.html','Sugar/index.html','duong/index.html','404.html']

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    cli=argparse.ArgumentParser()
    cli.add_argument('--version',required=True,help='Unique release ID, e.g. 20260911-r2')
    args=cli.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9._-]+',args.version):
        cli.error('Version must contain only letters, digits, dot, underscore or hyphen')
    public_files=set(PAGES)
    for name in PAGES:
        page=ROOT/name
        text=page.read_text()
        text=re.sub(r'data-release="[^"]*"',f'data-release="{args.version}"',text)
        def asset(match):
            attribute,url=match.groups()
            parsed=urlsplit(url)
            if parsed.scheme or parsed.netloc or not parsed.path.endswith(('.js','.css')):
                return match.group(0)
            local=(page.parent/unquote(parsed.path)).resolve()
            if not local.is_relative_to(ROOT) or not local.is_file():
                raise ValueError(f'{name}: missing local asset {url}')
            public_files.add(str(local.relative_to(ROOT)))
            return f'{attribute}="{parsed.path}?v={digest(local)[:12]}"'
        text=re.sub(r'\b(src|href)="([^"]+)"',asset,text)
        page.write_text(text)
    manifest={
        'version':args.version,
        'routes':{'home':'./','oil':'Dau-khi/','sugar':'Sugar/','bank':'Bank/'},
        'files':{name:digest(ROOT/name) for name in sorted(public_files)},
        'note':'Release identifies site files; observation dates remain in each data source.'
    }
    (ROOT/'data/site-release.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(f'Prepared {args.version}: {len(PAGES)} pages, {len(public_files)} files in release manifest')

if __name__=='__main__':main()
