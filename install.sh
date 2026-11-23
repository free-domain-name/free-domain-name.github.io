#!/bin/sh
# Free Domain Browser - one-line installer for macOS and Linux.
#
#   curl -fsSL https://free-domain-name.github.io/install.sh | sh
#
# It downloads the latest portable build, checks the SHA-256 against the
# published checksums.txt and unpacks it. Nothing is written outside your
# home directory and nothing needs root.
#
# Environment:
#   FDB_VERSION=v0.1.1   install a specific tag (default: the latest release)
#   FDB_DIR=<path>       install somewhere else (default: ~/Applications on
#                        macOS, ~/.local/share/free-domain-browser on Linux)
set -eu

REPO="free-domain-name/free-domain-browser-cef"
TAG="${FDB_VERSION:-latest}"
BASE="https://github.com/$REPO/releases"

say() { printf '%s\n' "$*"; }
die() { printf 'install.sh: %s\n' "$*" >&2; exit 1; }

command -v curl >/dev/null 2>&1 || die "curl is required"
command -v tar >/dev/null 2>&1 || die "tar is required"

os=$(uname -s)
arch=$(uname -m)
case "$arch" in
  arm64 | aarch64) arch="arm64" ;;
  x86_64 | amd64) arch="x86_64" ;;
  *) die "unsupported architecture: $arch" ;;
esac

case "$os" in
  Darwin) os="macos" ;;
  Linux) os="linux" ;;
  *) die "unsupported operating system: $os" ;;
esac

case "$os/$arch" in
  macos/arm64)
    asset="FreeDomainBrowser-CEF.zip"
    asset_dir="free-domain-browser-cef.app"
    default_dir="$HOME/Applications"
    extract="zip"
    ;;
  linux/x86_64)
    asset="FreeDomainBrowser-CEF-linux-x86_64.tar.gz"
    asset_dir="FreeDomainBrowser-CEF-linux-x86_64"
    default_dir="$HOME/.local/share/free-domain-browser"
    extract="tar"
    ;;
  *)
    say ""
    say "There is no portable build for $os/$arch yet."
    say "The browser also ships as installers for every desktop platform:"
    say "  https://github.com/$REPO/releases"
    say ""
    exit 1
    ;;
esac

if [ "$TAG" = "latest" ]; then
  # The releases are prereleases, so /releases/latest does not point at them.
  # The API lists them, newest first.
  say "Looking up the latest release..."
  TAG=$(curl -fsSL "https://api.github.com/repos/$REPO/releases" |
    sed -n 's/^[[:space:]]*"tag_name":[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
  [ -n "$TAG" ] || die "could not resolve the latest release; set FDB_VERSION=v0.1.1"
fi

install_dir="${FDB_DIR:-$default_dir}"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

say "Free Domain Browser $TAG ($os/$arch)"
say ""

say "Downloading the checksums..."
curl -fsSL -o "$work/checksums.txt" "$BASE/download/$TAG/checksums.txt" ||
  die "could not download the checksums for $TAG"

expected=$(awk -v name="$asset" '$2 ~ name { print $1 }' "$work/checksums.txt" | tail -1)
[ -n "$expected" ] || die "$asset is not listed in checksums.txt"

say "Downloading $asset..."
curl -fL --progress-bar -o "$work/$asset" "$BASE/download/$TAG/$asset" ||
  die "could not download $asset"

say "Verifying the checksum..."
if command -v sha256sum >/dev/null 2>&1; then
  actual=$(sha256sum "$work/$asset" | awk '{print $1}')
elif command -v shasum >/dev/null 2>&1; then
  actual=$(shasum -a 256 "$work/$asset" | awk '{print $1}')
else
  die "no sha256sum or shasum found to verify the download"
fi
if [ "$actual" != "$expected" ]; then
  die "checksum mismatch for $asset
  expected $expected
  actual   $actual
The download was not installed."
fi
say "Checksum ok."

say "Installing into $install_dir..."
mkdir -p "$install_dir"
case "$extract" in
  tar)
    tar -xzf "$work/$asset" -C "$install_dir"
    ;;
  zip)
    command -v ditto >/dev/null 2>&1 ||
      die "ditto is required to unpack the macOS bundle"
    ditto -x -k "$work/$asset" "$install_dir"
    ;;
esac

if [ "$extract" = "zip" ]; then
  app="$install_dir/$asset_dir"
  [ -d "$app" ] || die "the bundle is missing from the archive"
  say ""
  say "Installed: $app"
  say ""
  say "Open it:"
  say "  open \"$app\""
else
  browser="$install_dir/$asset_dir/free-domain-browser-cef"
  [ -x "$browser" ] || die "the browser is missing from the archive"
  say ""
  say "Installed: $browser"
  say ""
  say "Run it:"
  say "  \"$browser\""
fi

say ""
say "The browser resolves .fdn names through the community registry and joins"
say "the project chat. Both happen on the first start."
say ""
if [ "$extract" = "tar" ]; then
  say "The Linux package runs without the setuid sandbox helper, because a"
  say "tarball cannot ship it as root. To enable the sandbox:"
  say "  sudo chown root:root \"$install_dir/$asset_dir/chrome-sandbox\""
  say "  sudo chmod 4755 \"$install_dir/$asset_dir/chrome-sandbox\""
  say ""
fi
