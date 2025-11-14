// Provide a minimal JSX namespace so third-party typings that reference
// `JSX` (e.g. react-markdown) don't error during builds that can't
// implicitly find the React JSX types.

import * as React from "react";

declare global {
  // Basic mapping so JSX.Element resolves correctly
  namespace JSX {
    type Element = React.ReactElement;
    interface IntrinsicAttributes extends React.Attributes {}
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};
