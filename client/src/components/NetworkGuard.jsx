import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import NoInternet from '../pages/NoInternet';
import { cacheCurrentPage, cacheOfflinePages } from '../utils/network';
import { refreshExpired } from '../lib/cacheManager';

/**
 * NetworkGuard.jsx
 * Global app-wide wrapper component for CampusNode.
 * 
 * Functions:
 * 1. Monitors network status via useNetworkStatus().
 * 2. Preserves active route (e.g. /events/123) when network drops.
 * 3. Shows full-screen NoInternet UI when offline.
 * 4. Automatically restores the preserved route when network recovers.
 * 5. Caches visited pages for offline access.
 * 
 * @param {{ children: React.ReactNode }} props
 */
const NetworkGuard = ({ children }) => {
  const { isOnline, checkStatus } = useNetworkStatus();
  const location = useLocation();
  const navigate = useNavigate();

  // Ref to preserve original location before network loss
  const preservedLocationRef = useRef(null);
  const wasOfflineRef = useRef(false);

  const fullPath = `${location.pathname}${location.search}${location.hash}`;

  // Preserve route when online and cache current route
  useEffect(() => {
    if (isOnline) {
      // Don't overwrite preserved location if we are in the middle of recovery
      if (!wasOfflineRef.current) {
        preservedLocationRef.current = fullPath;
      }
      // Cache pages for offline access
      cacheCurrentPage(location.pathname);
    } else {
      wasOfflineRef.current = true;
      if (!preservedLocationRef.current) {
        preservedLocationRef.current = fullPath;
      }
    }
  }, [isOnline, location.pathname, fullPath]);

  // Initial offline cache warm-up on mount
  useEffect(() => {
    cacheOfflinePages();
  }, []);

  // Handle Auto Recovery when network comes back
  useEffect(() => {
    if (isOnline && wasOfflineRef.current) {
      wasOfflineRef.current = false;
      
      // Trigger background refresh of expired API caches on reconnect
      refreshExpired().catch(console.warn);

      const targetPath = preservedLocationRef.current || '/';

      if (location.pathname === '/no-internet' || location.pathname !== targetPath.split('?')[0]) {
        navigate(targetPath, { replace: true });
      }
    }
  }, [isOnline, navigate, location.pathname]);

  const handleManualRetrySuccess = () => {
    wasOfflineRef.current = false;
    const targetPath = preservedLocationRef.current || '/';
    if (targetPath && targetPath !== fullPath) {
      navigate(targetPath, { replace: true });
    }
  };

  if (!isOnline) {
    return (
      <NoInternet
        onRetrySuccess={handleManualRetrySuccess}
        targetPath={preservedLocationRef.current || fullPath}
      />
    );
  }

  return <>{children}</>;
};

export default NetworkGuard;
