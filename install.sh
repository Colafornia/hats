#!/bin/sh
set -eu

case "$(uname -s)" in
  Darwin) os=darwin ;;
  Linux) os=linux ;;
  *) echo "hats: unsupported OS: $(uname -s)" >&2; exit 1 ;;
esac

case "$(uname -m)" in
  arm64|aarch64) arch=arm64 ;;
  x86_64|amd64) arch=x64 ;;
  *) echo "hats: unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

asset="hats-$os-$arch.tar.gz"
if [ -n "${HATS_VERSION:-}" ]; then
  version=${HATS_VERSION#v}
  base="https://github.com/Colafornia/hats/releases/download/v$version"
else
  base="https://github.com/Colafornia/hats/releases/latest/download"
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT HUP INT TERM
curl -fsSL "$base/$asset" -o "$tmp/$asset"
curl -fsSL "$base/SHA256SUMS" -o "$tmp/SHA256SUMS"

expected=$(awk -v file="$asset" '$2 == file { print $1 }' "$tmp/SHA256SUMS")
[ -n "$expected" ] || { echo "hats: checksum missing for $asset" >&2; exit 1; }
if command -v sha256sum >/dev/null 2>&1; then
  actual=$(sha256sum "$tmp/$asset" | awk '{ print $1 }')
else
  actual=$(shasum -a 256 "$tmp/$asset" | awk '{ print $1 }')
fi
[ "$actual" = "$expected" ] || { echo "hats: checksum verification failed" >&2; exit 1; }

tar xzf "$tmp/$asset" -C "$tmp" hats
install_dir=${HATS_INSTALL_DIR:-"$HOME/.local/bin"}
mkdir -p "$install_dir"
install -m 755 "$tmp/hats" "$install_dir/hats"
echo "installed hats to $install_dir/hats"
