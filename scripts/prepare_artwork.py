#!/usr/bin/env python3
"""Derive Roku launch artwork from the generated 16:9 title card.

Run with: uv run --with pillow python scripts/prepare_artwork.py
"""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
source = root / 'output/imagegen/title-screen.png'
out = root / 'images/branding'
out.mkdir(parents=True, exist_ok=True)
image = Image.open(source).convert('RGB')
background = image.getpixel((0, 0))
for suffix, size in {'fhd': (1920, 1080), 'hd': (1280, 720), 'sd': (720, 480)}.items():
    splash = ImageOps.pad(image, size, method=Image.Resampling.LANCZOS, color=background)
    splash.save(out / f'splash-{suffix}.jpg', quality=93, optimize=True)
for suffix, size in {'fhd': (540, 405), 'hd': (290, 218), 'sd': (214, 144)}.items():
    icon = ImageOps.pad(image, size, method=Image.Resampling.LANCZOS, color=background)
    icon.save(out / f'icon-{suffix}.png', optimize=True)
print(out)
