# Free Domain Browser - one-line installer for Windows.
#
#   irm https://free-domain-name.github.io/install.ps1 | iex
#
# It downloads the latest portable build, checks the SHA-256 against the
# published checksums.txt and unpacks it into your user profile. Nothing is
# installed system wide and no administrator rights are needed.
#
# Environment:
#   FDB_VERSION=v0.1.1   install a specific tag (default: the latest release)
#   FDB_DIR=<path>       install somewhere else
#                          (default: %LOCALAPPDATA%\Programs\FreeDomainBrowser)

$ErrorActionPreference = "Stop"
$repo = "free-domain-name/free-domain-browser-cef"
$base = "https://github.com/$repo/releases"
$tag = if ($env:FDB_VERSION) { $env:FDB_VERSION } else { "latest" }
$asset = "FreeDomainBrowser-CEF-windows-x64.zip"
$assetDir = "FreeDomainBrowser-CEF-windows-x64"

function Say($message) { Write-Host $message }

if ($tag -eq "latest") {
  Say "Looking up the latest release..."
  $response = Invoke-WebRequest -Uri "$base/latest" -MaximumRedirection 0 -ErrorAction SilentlyContinue
  $location = $null
  if ($response) { $location = $response.Headers.Location }
  if (-not $location) {
    try {
      $response = Invoke-WebRequest -Uri "$base/latest" -ErrorAction Stop
      $location = $response.BaseResponse.ResponseUri.AbsoluteUri
    } catch {
      $location = $_.Exception.Response.ResponseUri.AbsoluteUri
    }
  }
  if ($location -match "/tag/(.+)$") { $tag = $Matches[1] }
  if (-not $tag -or $tag -eq "latest") { throw "could not resolve the latest release" }
}

$installDir = if ($env:FDB_DIR) { $env:FDB_DIR } else { Join-Path $env:LOCALAPPDATA "Programs\FreeDomainBrowser" }
$work = Join-Path ([System.IO.Path]::GetTempPath()) ("fdn-install-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $work -Force | Out-Null

try {
  Say "Free Domain Browser $tag (windows/x64)"
  Say ""
  Say "Downloading the checksums..."
  $checksums = Join-Path $work "checksums.txt"
  Invoke-WebRequest -Uri "$base/download/$tag/checksums.txt" -OutFile $checksums

  $expected = $null
  foreach ($line in Get-Content $checksums) {
    if ($line -match "^([0-9a-fA-F]{64})\s+\.?\*/?$([regex]::Escape($asset))$") { $expected = $Matches[1].ToLower() }
  }
  if (-not $expected) { throw "$asset is not listed in checksums.txt" }

  Say "Downloading $asset..."
  $archive = Join-Path $work $asset
  Invoke-WebRequest -Uri "$base/download/$tag/$asset" -OutFile $archive

  Say "Verifying the checksum..."
  $actual = (Get-FileHash -Path $archive -Algorithm SHA256).Hash.ToLower()
  if ($actual -ne $expected) {
    throw "checksum mismatch for $asset`n  expected $expected`n  actual   $actual`nThe download was not installed."
  }
  Say "Checksum ok."

  Say "Installing into $installDir..."
  New-Item -ItemType Directory -Path $installDir -Force | Out-Null
  Expand-Archive -Path $archive -DestinationPath $installDir -Force

  $browser = Join-Path $installDir "$assetDir\free-domain-browser-cef.exe"
  if (-not (Test-Path $browser)) { throw "the browser is missing from the archive" }

  Say ""
  Say "Installed: $browser"
  Say ""
  Say "Run it:"
  Say "  `"$browser`""
  Say ""
  Say "The browser resolves .fdn names through the community registry and joins"
  Say "the project chat. Both happen on the first start."
  Say ""
  Say "Windows may show a SmartScreen notice because the build is not signed"
  Say "with an Authenticode certificate. Choose More info - Run anyway."
  Say ""
} finally {
  Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue
}
