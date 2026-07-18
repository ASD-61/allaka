import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from '@workspace/api-zod';
import express, { Router, type IRouter, type Request, type Response } from 'express';

import { ObjectPermission } from '../lib/objectAcl';
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../lib/objectStorage';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

// --- Local filesystem storage (dev only) -----------------------------------
// Replit's object storage relies on a sidecar (127.0.0.1:1106) that doesn't
// exist when running locally, so uploads silently fail off-Replit. When
// LOCAL_STORAGE_DIR is set (local .env only), images are stored on disk instead
// so the whole add-image flow works without Replit. Production/Replit leaves
// this unset and keeps using object storage unchanged.
const LOCAL_STORAGE_DIR = process.env.LOCAL_STORAGE_DIR;
function localStorageEnabled(): boolean {
  return !!LOCAL_STORAGE_DIR;
}
// Resolves a stored relative object path (e.g. "uploads/xyz") to an absolute
// path, guarding against traversal outside the storage dir.
function resolveLocalPath(relPath: string): string | null {
  const base = path.resolve(LOCAL_STORAGE_DIR!);
  const full = path.resolve(base, relPath);
  if (full !== base && !full.startsWith(base + path.sep)) return null;
  return full;
}
function serveLocalObject(res: Response, relPath: string): boolean {
  const full = resolveLocalPath(relPath);
  if (!full || !fs.existsSync(full) || !fs.statSync(full).isFile()) return false;
  const typeFile = `${full}.type`;
  const contentType = fs.existsSync(typeFile)
    ? fs.readFileSync(typeFile, 'utf8').trim()
    : 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  fs.createReadStream(full).pipe(res);
  return true;
}

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 * This app has no user accounts, so the endpoint is open to whoever is
 * adding a product from the store admin screen.
 */
router.post(
  '/storage/uploads/request-url',
  async (req: Request, res: Response) => {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid required fields' });
      return;
    }

    try {
      const { name, size, contentType } = parsed.data;

      // Local dev: hand back a PUT URL on this same server that writes to disk.
      if (localStorageEnabled()) {
        const objectId = randomUUID();
        const base = `${req.protocol}://${req.get('host')}`;
        res.json(
          RequestUploadUrlResponse.parse({
            uploadURL: `${base}/api/storage/local-upload/${objectId}`,
            objectPath: `/objects/uploads/${objectId}`,
            metadata: { name, size, contentType },
          }),
        );
        return;
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath =
        objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, 'Error generating upload URL');
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },
);

/**
 * PUT /storage/local-upload/:id
 *
 * Local dev only: receives the raw image bytes and writes them to disk under
 * LOCAL_STORAGE_DIR/uploads/:id, alongside a ".type" file holding the MIME type
 * so the object can later be served with the right Content-Type.
 */
router.put(
  '/storage/local-upload/:id',
  express.raw({ type: '*/*', limit: '25mb' }),
  async (req: Request, res: Response) => {
    if (!localStorageEnabled()) {
      res.status(404).json({ error: 'Local storage disabled' });
      return;
    }
    const id = String(req.params.id);
    if (!/^[a-zA-Z0-9._-]+$/.test(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    try {
      const dir = path.join(path.resolve(LOCAL_STORAGE_DIR!), 'uploads');
      await fs.promises.mkdir(dir, { recursive: true });
      const contentType = req.get('content-type') || 'application/octet-stream';
      await fs.promises.writeFile(path.join(dir, id), req.body as Buffer);
      await fs.promises.writeFile(path.join(dir, `${id}.type`), contentType);
      res.sendStatus(200);
    } catch (error) {
      req.log.error({ err: error }, 'Error saving local upload');
      res.status(500).json({ error: 'Failed to save upload' });
    }
  },
);

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get(
  '/storage/public-objects/*filePath',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join('/') : raw;

      if (localStorageEnabled()) {
        if (!serveLocalObject(res, filePath)) {
          res.status(404).json({ error: 'File not found' });
        }
        return;
      }

      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const response = await objectStorageService.downloadObject(file);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      req.log.error({ err: error }, 'Error serving public object');
      res.status(500).json({ error: 'Failed to serve public object' });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get('/storage/objects/*path', async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;

    if (localStorageEnabled()) {
      if (!serveLocalObject(res, wildcardPath)) {
        res.status(404).json({ error: 'Object not found' });
      }
      return;
    }

    const objectPath = `/objects/${wildcardPath}`;
    const objectFile =
      await objectStorageService.getObjectEntityFile(objectPath);

    // --- Protected route example (uncomment when using replit-auth) ---
    // if (!req.isAuthenticated()) {
    //   res.status(401).json({ error: "Unauthorized" });
    //   return;
    // }
    // const canAccess = await objectStorageService.canAccessObjectEntity({
    //   userId: req.user.id,
    //   objectFile,
    //   requestedPermission: ObjectPermission.READ,
    // });
    // if (!canAccess) {
    //   res.status(403).json({ error: "Forbidden" });
    //   return;
    // }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(
        response.body as ReadableStream<Uint8Array>,
      );
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, 'Object not found');
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    req.log.error({ err: error }, 'Error serving object');
    res.status(500).json({ error: 'Failed to serve object' });
  }
});

export default router;
