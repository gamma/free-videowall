# Build with: docker build --platform linux/amd64 -f Dockerfile.tizen -t tizen-sdk:10.0 .
FROM ubuntu:22.04
RUN test "$(uname -m)" = x86_64
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates wget unzip zip pciutils locales libssl-dev libncurses5 python3 \
    && rm -rf /var/lib/apt/lists/*
RUN useradd --create-home developer
ENV HOME=/home/developer
USER developer
WORKDIR /home/developer
ARG TIZEN_SDK_VERSION=10.0
RUN wget -q --https-only -O /tmp/tizen-installer.bin \
    "https://download.tizen.org/sdk/Installer/tizen-sdk_${TIZEN_SDK_VERSION}/web-cli_Tizen_SDK_${TIZEN_SDK_VERSION}_ubuntu-64.bin" \
    && chmod +x /tmp/tizen-installer.bin \
    && /tmp/tizen-installer.bin --accept-license /home/developer/tizen-studio \
    && rm /tmp/tizen-installer.bin
ENV PATH=/home/developer/tizen-studio/tools:/home/developer/tizen-studio/tools/ide/bin:/home/developer/tizen-studio/package-manager:$PATH
RUN sdb version && tizen version
WORKDIR /workspace
CMD ["bash"]
