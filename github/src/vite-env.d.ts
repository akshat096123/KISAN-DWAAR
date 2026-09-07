/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AGMARKNET_API_URL: string;
  readonly VITE_AGMARKNET_API_KEY: string;
  readonly VITE_DATA_GOV_IN_API_URL: string;
  readonly VITE_DATA_GOV_IN_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}