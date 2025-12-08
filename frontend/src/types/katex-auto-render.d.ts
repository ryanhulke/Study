declare module "katex/contrib/auto-render" {
  export interface RenderMathInElementOptions {
    delimiters?: {
      left: string;
      right: string;
      display: boolean;
    }[];
    throwOnError?: boolean;
    errorColor?: string;
  }

  export default function renderMathInElement(
    element: HTMLElement,
    options?: RenderMathInElementOptions
  ): void;
}
