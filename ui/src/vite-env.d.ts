/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the Relay agent service. Empty when the console is served by it. */
  readonly VITE_AGENT_API?: string;
  /** Set when building a front end with no agent behind it. */
  readonly VITE_STATIC_ONLY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
