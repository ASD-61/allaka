---
name: Orval zod v4 URL format bug
description: Why OpenAPI string fields with format:uri fail typecheck after orval codegen in this workspace.
---

Do not use `format: uri` on `type: string` OpenAPI schema properties (e.g. presigned upload URLs, image URLs).

**Why:** orval v8's zod client generates `zod.url()` for `format: uri`, which is a zod v4 top-level API. This workspace pins `zod: ^3.25.76` via the pnpm catalog, so `zod.url()` does not exist on the imported namespace and `pnpm -w run typecheck:libs` fails after codegen with `Property 'url' does not exist on type ...`.

**How to apply:** When adding endpoints/schemas to `lib/api-spec/openapi.yaml` with URL-like string fields, just use `type: string` without `format: uri`. This includes the object-storage skill's `UploadUrlResponse.uploadURL` field — override its reference example if copying it in.
