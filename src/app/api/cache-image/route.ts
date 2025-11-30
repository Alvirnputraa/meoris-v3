import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const CACHE_DIR = path.join(process.cwd(), 'public', 'images', 'cache');

const EXT_FROM_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

const CONTENT_TYPE_FROM_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};

function hashUrl(url: string): string {
  return crypto.createHash('sha1').update(url).digest('hex');
}

function getExtFromContentType(ct: string | null): string | null {
  if (!ct) return null;
  const key = ct.toLowerCase().split(';')[0].trim();
  return EXT_FROM_CONTENT_TYPE[key] || null;
}

function getExtFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const ext = path.extname(u.pathname).toLowerCase();
    if (CONTENT_TYPE_FROM_EXT[ext]) {
      return ext;
    }
    return null;
  } catch {
    // if not a full URL, try plain path
    const ext = path.extname(url).toLowerCase();
    if (CONTENT_TYPE_FROM_EXT[ext]) {
      return ext;
    }
    return null;
  }
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function findExistingForHash(hash: string): Promise<{ path: string; ext: string } | null> {
  const exts = Object.keys(CONTENT_TYPE_FROM_EXT);
  for (const ext of exts) {
    const p = path.join(CACHE_DIR, `${hash}${ext}`);
    if (existsSync(p)) {
      return { path: p, ext };
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const rawParam = req.nextUrl.searchParams.get('url');
    const urlParam = (rawParam || '').trim();
    if (!urlParam) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Normalize: decode once to avoid double-encoding issues (e.g. %2520 from %20)
    let sourceUrl = urlParam;
    try {
      sourceUrl = decodeURIComponent(urlParam);
    } catch {
      // keep as-is if decode fails
    }

    // If already local path, just stream it
    if (sourceUrl.startsWith('/')) {
      const localPath = path.join(process.cwd(), 'public', sourceUrl);
      const exists = await fileExists(localPath);
      if (exists) {
        const data = await fs.readFile(localPath);
        const ext = path.extname(localPath).toLowerCase();
        const ct = CONTENT_TYPE_FROM_EXT[ext] || 'application/octet-stream';
        const uint8 = new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength);
        return new NextResponse(uint8, {
          headers: {
            'Content-Type': ct,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } else {
        return NextResponse.json({ error: 'Local file not found' }, { status: 404 });
      }
    }

    const hash = hashUrl(sourceUrl);

    // Serve from cache if exists
    const existing = await findExistingForHash(hash);
    if (existing) {
      const data = await fs.readFile(existing.path);
      const ct = CONTENT_TYPE_FROM_EXT[existing.ext] || 'application/octet-stream';
      const uint8 = new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength);
      return new NextResponse(uint8, {
        headers: {
          'Content-Type': ct,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // Fetch remote image
    const res = await fetch(sourceUrl, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch remote image' }, { status: 502 });
    }
    const arrayBuf = await res.arrayBuffer();
    const contentTypeHeader = res.headers.get('content-type');
    const extGuess = getExtFromContentType(contentTypeHeader) || getExtFromUrl(sourceUrl) || '.jpg';
    const ct = CONTENT_TYPE_FROM_EXT[extGuess] || 'image/jpeg';

    await ensureDir(CACHE_DIR);
    const filePath = path.join(CACHE_DIR, `${hash}${extGuess}`);
    await fs.writeFile(filePath, Buffer.from(arrayBuf));

    return new NextResponse(arrayBuf, {
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('cache-image error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}