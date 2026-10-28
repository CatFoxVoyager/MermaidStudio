# Self-hosted GitHub Actions runner pour MermaidStudio.
# Le tag suit la release courante de actions/runner (renovate manager: dockerfile).
FROM ghcr.io/actions/actions-runner:2.338.2

# Aligné avec @playwright/test de package.json — le regexManager Renovate
# (renovate.json, Task 3) mettra à jour ce ARG quand le repo bump playwright.
ARG PLAYWRIGHT_VERSION=1.63.0

USER root
# docker.io: CLI Docker pour le job docker-build (push GHCR) via le socket monté.
# jq: extraction du registration token. qemu-user-static: builds arm64 (multi-arch).
RUN apt-get update \
 && apt-get install -y --no-install-recommends docker.io jq curl qemu-user-static \
 && rm -rf /var/lib/apt/lists/*
# L'image actions-runner embarque node (externals/) sans l'exposer dans le PATH ;
# on l'ajoute pour la couche npx ci-dessous (install-deps Playwright).
ENV PATH=/home/runner/externals/node24/bin:${PATH}
# Dépendances système des navigateurs Playwright (chromium, firefox, webkit).
RUN npx -y playwright@${PLAYWRIGHT_VERSION} install-deps chromium firefox webkit

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
USER runner
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
