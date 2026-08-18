/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { setWorkerEnv } from "../app/worker-env";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

async function addViewportFit(response: Response) {
  if (!response.headers.get("content-type")?.startsWith("text/html")) return response;
  const html = await response.text();
  if (html.includes("viewport-fit=cover")) return new Response(html, response);
  const updated = html.replace(
    /(<meta(?=[^>]*\bname=["']viewport["'])(?=[^>]*\bcontent=["'])(?:[^>]*\bcontent=["']))([^"']*)(["'][^>]*>)/i,
    "$1$2, viewport-fit=cover$3",
  );
  return new Response(updated, response);
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Publish the environment before routing so route handlers can read their
    // bindings and settings without importing `cloudflare:workers`.
    setWorkerEnv(env);
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return addViewportFit(await handler.fetch(request, env, ctx));
  },
};

export default worker;
