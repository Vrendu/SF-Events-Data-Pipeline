/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_READ_API_KEY: string
  readonly VITE_MAPBOX_ACCESS_TOKEN: string
  /** @deprecated use VITE_MAPBOX_ACCESS_TOKEN */
  readonly VITE_MAPBOX_TOKEN?: string
  readonly VITE_MAPBOX_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
