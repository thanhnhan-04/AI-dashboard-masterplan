/* One project-relative route map for the hub and all sector dashboards. */
(() => {
  'use strict';
  const script = document.currentScript;
  const root = new URL('../', script.src);
  const version = script.dataset.release;
  const routes = {
    home: {path: '', label: 'Trang tổng'},
    oil: {path: 'Dau-khi/', label: 'Dầu khí'},
    sugar: {path: 'Sugar/', label: 'Đường'},
    bank: {path: 'Bank/', label: 'Ngân hàng'},
    plan: {path: 'Masterplan/', label: 'Master plan'}
  };
  const aliases = {'dau-khi':'oil', 'duong':'sugar', 'sugar':'sugar', 'ngan-hang':'bank', 'bank':'bank'};
  function href(key) {
    if (!routes[key]) throw new Error('Unknown dashboard route: '+key);
    const url = new URL(routes[key].path, root);
    if (version) url.searchParams.set('v', version);
    return url.href;
  }
  function redirectHubAlias() {
    const isHub = location.pathname === root.pathname || location.pathname === root.pathname+'index.html';
    const key = aliases[location.hash.slice(1).toLowerCase()];
    if (!isHub || !key) return false;
    document.documentElement.dataset.redirecting = 'true';
    location.replace(href(key));
    return true;
  }
  window.DashboardSite = Object.freeze({root: root.href, version, routes, aliases, href, redirectHubAlias});
  // Resolve historical /?v=...#ngan-hang links before rendering hub previews.
  redirectHubAlias();
  window.addEventListener('hashchange', redirectHubAlias);
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-site-navigation]').forEach(nav => {
      const active = nav.dataset.siteNavigation;
      nav.classList.add('site-navigation');
      nav.setAttribute('aria-label','Điều hướng dashboard ngành');
      nav.replaceChildren();
      for (const key of ['home','oil','sugar','bank']) {
        const link = document.createElement('a');
        link.href = href(key);
        link.dataset.siteRoute = key;
        link.textContent = routes[key].label;
        if (key === active) link.setAttribute('aria-current','page');
        nav.append(link);
      }
    });
    document.querySelectorAll('[data-site-route]').forEach(link => {
      link.href = href(link.dataset.siteRoute);
    });
    document.querySelectorAll('[data-release-label]').forEach(label => {
      label.textContent = 'Bản giao diện '+version+' · Kỳ dữ liệu ghi tại từng biểu đồ';
    });
  });
})();
