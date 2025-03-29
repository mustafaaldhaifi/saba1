
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "route": "/"
  },
  {
    "renderMode": 2,
    "route": "/dashboard"
  },
  {
    "renderMode": 2,
    "route": "/login"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 489, hash: '8d0c8e0474e16ae360a46cdcd646c1e3d5daa7e9480825ca43f32105017abfc8', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1002, hash: 'b68fb24d78ad4de7d3aac2a359f0b7ee1dda353ccd874ea05af08d0869418134', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'index.html': {size: 8122, hash: '1ecb9135d31a92269d68bf52e4f14fbddc027b6f59a069beced95dcc1c6de0d4', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'dashboard/index.html': {size: 8122, hash: '1ecb9135d31a92269d68bf52e4f14fbddc027b6f59a069beced95dcc1c6de0d4', text: () => import('./assets-chunks/dashboard_index_html.mjs').then(m => m.default)},
    'login/index.html': {size: 8122, hash: '1ecb9135d31a92269d68bf52e4f14fbddc027b6f59a069beced95dcc1c6de0d4', text: () => import('./assets-chunks/login_index_html.mjs').then(m => m.default)},
    'styles-5INURTSO.css': {size: 0, hash: 'menYUTfbRu8', text: () => import('./assets-chunks/styles-5INURTSO_css.mjs').then(m => m.default)}
  },
};
