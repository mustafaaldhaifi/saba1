import { RenderMode, ServerRoute } from '@angular/ssr';

// Firebase browser sessions cannot authenticate prerendered pages.
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Client },
  { path: 'login', renderMode: RenderMode.Client },
  { path: 'dashboard', renderMode: RenderMode.Client },
  { path: 'branch', renderMode: RenderMode.Client },
  { path: 'documentation', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Client }
];
