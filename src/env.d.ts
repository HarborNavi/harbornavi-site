/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_GOOGLE_TAG_MANAGER_ID?: string;
  readonly PUBLIC_REDDIT_PIXEL_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
