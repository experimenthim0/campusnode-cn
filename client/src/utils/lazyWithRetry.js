import { lazy } from 'react';

/**
 * lazyWithRetry — Resilient dynamic import wrapper for React.lazy().
 * Automatically recovers from stale chunk caches, network blips, or net::ERR_CACHE_READ_FAILURE.
 * 
 * @param {() => Promise<{ default: React.ComponentType<any> }>} componentImport
 * @returns {React.LazyExoticComponent<React.ComponentType<any>>}
 */
export const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        // Assume outdated chunk or cache read failure; reload the page once automatically
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        return { default: () => null };
      }
      // If we already refreshed and it still fails, bubble up the error
      throw error;
    }
  });

export default lazyWithRetry;
