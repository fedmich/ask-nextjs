/// <reference types="react" />
/// <reference types="react/jsx-runtime" />

declare global {
  namespace JSX {
    // Re-export from React to make JSX available globally
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
    interface IntrinsicAttributes extends React.JSX.IntrinsicAttributes {}
    interface Element extends React.JSX.Element {}
  }
}

export {};
