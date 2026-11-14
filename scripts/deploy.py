#!/usr/bin/env python3
"""Build and deploy to the local Roku. Installation launches the app."""
import argparse
import getpass
import os
from pathlib import Path
import subprocess
import urllib.request
import urllib.error
import uuid

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--host', required=True, help='IP address of your Roku')
parser.add_argument('--include-local-frames', action='store_true', help='Bundle local frame images for this device only')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
build = ['python3', str(root / 'scripts/build.py')]
if args.include_local_frames:
    build.append('--include-local-frames')
subprocess.run(build, check=True)
password = os.environ.get('ROKU_PASSWORD') or getpass.getpass('Roku developer password: ')
url = 'http://' + args.host + '/plugin_install'
manager = urllib.request.HTTPPasswordMgrWithDefaultRealm()
manager.add_password('rokudev', url, 'rokudev', password)
digest = urllib.request.HTTPDigestAuthHandler(manager)
opener = urllib.request.build_opener(digest)
boundary = uuid.uuid4().hex
body = ('--' + boundary + '\r\nContent-Disposition: form-data; name="mysubmit"\r\n\r\nInstall\r\n'
        '--' + boundary + '\r\nContent-Disposition: form-data; name="archive"; filename="free-videowall.zip"\r\n'
        'Content-Type: application/zip\r\n\r\n').encode()
body += (root / 'dist/free-videowall.zip').read_bytes()
body += ('\r\n--' + boundary + '--\r\n').encode()
request = urllib.request.Request(url, data=body, headers={'Content-Type': 'multipart/form-data; boundary=' + boundary})
# Roku can close an unauthenticated upload before a large body is sent,
# resulting in BrokenPipeError. Obtain the digest challenge with a small GET
# and authenticate the initial POST rather than waiting to resend its body.
try:
    with urllib.request.urlopen(url, timeout=10):
        challenge = None
except urllib.error.HTTPError as error:
    if error.code != 401:
        raise
    challenge = error.headers.get('WWW-Authenticate', '')
if challenge:
    scheme, value = challenge.split(' ', 1)
    if scheme.lower() != 'digest':
        raise RuntimeError('Roku installer did not offer Digest authentication')
    fields = urllib.request.parse_keqv_list(urllib.request.parse_http_list(value))
    authorization = digest.get_authorization(request, fields)
    if not authorization:
        raise RuntimeError('Could not authenticate Roku installer upload')
    request.add_unredirected_header('Authorization', 'Digest ' + authorization)
response = opener.open(request, timeout=60).read().decode()
(root / 'dist/deploy-response.html').write_text(response)
# HTTP 200 alone does not mean the Roku accepted/compiled the package.
import re
match = re.search(r'var params = JSON.parse\(\'(.*?)\'\);', response)
if match:
    import json
    params = json.loads(match.group(1))
    print(json.dumps(params.get('messages'), ensure_ascii=False))
else:
    print('Response saved to dist/deploy-response.html; inspect installation status.')
