/// <reference types="vite/client" />

declare module '*.svg' {
  const content: string;
  export default content;
}

interface PackageJson {
  version: string;
  devDependencies?: Record<string, string>;
  dependencies?: Record<string, string>;
}

declare module '*/package.json' {
  const content: PackageJson;
  export default content;
}
