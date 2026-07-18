#!/bin/sh
set -eu

extension_dir="${1:-$(pwd)}"
project_dir="${2:-$(pwd)/dist/safari}"

if xcrun --find safari-web-extension-packager >/dev/null 2>&1; then
  packager="safari-web-extension-packager"
elif xcrun --find safari-web-extension-converter >/dev/null 2>&1; then
  packager="safari-web-extension-converter"
else
  echo "Safari's packager requires full Xcode. Safari 26 can load this folder temporarily without Xcode; see README.md." >&2
  exit 1
fi

mkdir -p "$project_dir"
xcrun "$packager" "$extension_dir" \
  --project-location "$project_dir" \
  --app-name "Reddit Slop Filter" \
  --bundle-identifier "com.christopherlyon.redditslopfilter" \
  --swift \
  --macos-only \
  --no-open
