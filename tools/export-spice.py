#!/usr/bin/env python3
"""Export the self-contained applet into a Cinnamon Spices checkout."""
import argparse
from pathlib import Path
import shutil

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('checkout', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
uuid = 'razer-battery@akasolace'
spice = args.checkout / uuid
spice.mkdir(parents=True, exist_ok=False)
for name in ('info.json', 'screenshot.png'):
    shutil.copy2(root / name, spice / name)
shutil.copy2(root / 'SPICES.md', spice / 'README.md')
shutil.copytree(root / 'files' / uuid, spice / 'files' / uuid,
                ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
shutil.copytree(root / 'tests', spice / 'tests',
                ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
print(spice)
