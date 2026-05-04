/// <reference types="vite/client" />

declare module '*.svg' {
  import { FC, SVGProps } from 'react';
  export const ReactComponent: FC<SVGProps<SVGSVGElement> & { title?: string }>;
  const src: string;
  export default src;
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
