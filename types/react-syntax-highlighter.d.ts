declare module "react-syntax-highlighter" {
  import { ComponentType, HTMLProps } from "react";

  interface SyntaxHighlighterProps extends HTMLProps<HTMLElement> {
    language?: string;
    style?: any;
    customStyle?: any;
    codeTagProps?: HTMLProps<HTMLElement>;
    useInlineStyles?: boolean;
    showLineNumbers?: boolean;
    showInlineLineNumbers?: boolean;
    startingLineNumber?: number;
    lineNumberContainerStyle?: any;
    lineNumberStyle?: any;
    wrapLines?: boolean;
    wrapLongLines?: boolean;
    lineProps?: lineTagPropsFunction | HTMLProps<HTMLElement>;
    renderer?: (props: rendererProps) => JSX.Element;
    PreTag?: ComponentType<any> | string;
    CodeTag?: ComponentType<any> | string;
    [spread: string]: any;
  }

  type lineTagPropsFunction = (lineNumber: number) => HTMLProps<HTMLElement>;

  interface rendererProps {
    rows: any[];
    stylesheet: any;
    useInlineStyles: boolean;
  }

  export const Prism: ComponentType<SyntaxHighlighterProps>;
  export const Light: ComponentType<SyntaxHighlighterProps>; // Example if there are other exports
  // Add other specific exports if you use them, e.g., LightAsync, PrismAsync
}

declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  const style: any; // General type for a style object
  export default style; // If styles are default exported
  export const vscDarkPlus: any; // Specific style export
  // Add declarations for other styles you might import from this path
  // e.g., export const coy: any;
}
