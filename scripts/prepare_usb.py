#!/usr/bin/env python3
"""Extract one cached end-frame per local video referenced by an M3U."""
import argparse
from pathlib import Path
import subprocess


def prepare(playlist):
    playlist = playlist.resolve()
    # Keep generated assets on the same USB tree; never follow arbitrary URLs.
    for entry in playlist.read_text(encoding='utf-8-sig').splitlines():
        entry = entry.strip().replace('\\', '/')
        if not entry or entry.startswith('#'):
            continue
        if ':' in entry or entry.startswith('/'):
            raise ValueError('Use relative paths when preparing the stick: ' + entry)
        video = (playlist.parent / entry).resolve()
        if not video.is_relative_to(playlist.parent):
            raise ValueError('Video is outside the playlist directory: ' + entry)
        if video.suffix.lower() not in ('.mp4', '.m4v', '.mov', '.mkv', '.ts'):
            continue
        first = video.with_name(video.name + '.start.jpg')
        if not first.exists() or first.stat().st_mtime < video.stat().st_mtime:
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(video), '-an',
                            '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
                            '-frames:v', '1', '-q:v', '2', str(first)], check=True)
            if not first.is_file():
                raise RuntimeError('No start frame produced: ' + str(video))
            print(first)
        image = video.with_name(video.name + '.end.jpg')
        if not video.is_file():
            raise FileNotFoundError(video)
        if image.exists() and image.stat().st_mtime >= video.stat().st_mtime:
            continue
        # Decode only the last half second, reverse, then retain the final frame.
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                        '-sseof', '-0.5', '-i', str(video), '-an',
                        '-vf', 'reverse,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
                        '-frames:v', '1', '-q:v', '2', str(image)], check=True)
        if not image.is_file():
            raise RuntimeError('No end frame produced: ' + str(video))
        print(image)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('playlist', type=Path)
    prepare(parser.parse_args().playlist)
