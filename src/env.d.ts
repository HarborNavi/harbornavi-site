/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_REDDIT_PIXEL_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
