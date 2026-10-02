HADOLINT ?= hadolint
TRIVY ?= trivy
IMAGE ?= orpheus-space-web:local
DOCKERFILE := .docker/app/prod/Dockerfile

.PHONY: install dev api-update api-verify generate generate-check lint lint-api lint-docker deadcode audit vuln build check test-e2e test-integration docker-build
install:
	npm ci
dev:
	npm run dev
api-update:
	@test -n "$$REF" || { echo 'Usage: make api-update REF=<space-tag-or-commit> [FROM=../orpheus-space]' >&2; exit 1; }
	@if [ -n "$$FROM" ]; then npm run api:update -- --ref "$$REF" --from "$$FROM"; else npm run api:update -- --ref "$$REF"; fi
api-verify:
	npm run api:verify
generate:
	npm run generate:api
generate-check:
	npm run api:check
lint: lint-api lint-docker
	npm run lint
lint-api:
	npm run lint:api
lint-docker:
	$(HADOLINT) $(DOCKERFILE)
deadcode:
	npm run knip
audit:
	npm run audit
vuln: audit
	$(TRIVY) fs --no-progress --db-repository ghcr.io/aquasecurity/trivy-db:2 --db-repository mirror.gcr.io/aquasec/trivy-db:2 --scanners vuln,misconfig --exit-code 1 --severity HIGH,CRITICAL --skip-dirs .git --skip-dirs node_modules --skip-dirs dist --skip-dirs test-results --skip-dirs playwright-report --skip-dirs .integration-auth --skip-dirs .core .
build:
	npm run build
check: generate-check lint
	npm run test:tools
	npm test
	$(MAKE) deadcode
	$(MAKE) vuln
	$(MAKE) build
test-e2e:
	npm run e2e
test-integration:
	npm run test:integration
docker-build:
	docker build -f $(DOCKERFILE) -t $(IMAGE) .
