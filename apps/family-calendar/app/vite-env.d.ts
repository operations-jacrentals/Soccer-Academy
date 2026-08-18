/**
 * Types for the build-time constants Vite injects.
 *
 * These have to be declared rather than inferred: `import.meta.env.DEV` is
 * replaced statically at build time, so it must appear literally in the source.
 * Reading it through a variable would turn it into a runtime lookup, which the
 * dev module runner rejects and which would leave development-only branches in
 * a production bundle.
 */
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
