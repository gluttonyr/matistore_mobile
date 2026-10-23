import type { ReactNode } from 'react';

// Native: renders the app as is. The web build picks WebFrame.web.tsx (centered column on wide screens).
export function WebFrame({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
