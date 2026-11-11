#!/usr/bin/env bash
# Build script for Cloudflare Workers/Pages (the build image has no .NET SDK).
# Build command: ./build.sh   Output: output/wwwroot (see wrangler.jsonc for Workers).
set -euo pipefail

# Skip if already built in this run (e.g. a dashboard build command ran before wrangler deploy).
if [ -f output/wwwroot/_framework/blazor.webassembly.js ]; then
  echo "Build output already present, skipping .NET build."
  exit 0
fi
# Build machines may lack ICU; the app does not need culture data to build.
export DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1
export DOTNET_CLI_TELEMETRY_OPTOUT=1
curl -sSL https://dot.net/v1/dotnet-install.sh -o dotnet-install.sh
chmod +x dotnet-install.sh
./dotnet-install.sh --channel 8.0 --install-dir ./.dotnet
./.dotnet/dotnet publish src/ProductionIntelligence.Web -c Release -o output
