#!/usr/bin/env bash
# Build script for Cloudflare Pages (its build image has no .NET SDK).
# Cloudflare Pages settings: Build command `./build.sh`, Build output directory `output/wwwroot`.
set -euo pipefail
curl -sSL https://dot.net/v1/dotnet-install.sh -o dotnet-install.sh
chmod +x dotnet-install.sh
./dotnet-install.sh --channel 8.0 --install-dir ./.dotnet
./.dotnet/dotnet publish src/ProductionIntelligence.Web -c Release -o output
