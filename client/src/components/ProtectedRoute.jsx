import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// [TEMPORARY ROLLOUT INTEGRATION] - Remove after launch rollout completion
import { RolloutBlocked } from '../temporary-rollout';

/**
 * ProtectedRoute — declarative route guard component.
 *
 * Usage:
 *   <ProtectedRoute>                                    — requires login
 *   <ProtectedRoute roles={['admin', 'paymentAdmin']}>  — requires specific role(s)
 *   <ProtectedRoute disallowedRoles={['facultyCoordinator', 'faculty']}> — disallows specific role(s)
 *
 * Redirects:
 *   - Unauthenticated users → /login (or /admin-secret-login for admin routes)
 *   - Disallowed users → fallbackPath or /club-events/:clubId or /events
 *   - Authenticated users with wrong role → /login
 *   - Unreleased rollout cohorts → RolloutBlocked launch screen
 */
const ProtectedRoute = ({ children, roles, disallowedRoles, fallbackPath }) => {
  const { isAuthenticated, role, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Determine redirect target based on route context
    const isAdminRoute = location.pathname.includes('/admin');
    const redirectTo = isAdminRoute ? '/admin-secret-login' : '/login';
    return <Navigate to={redirectTo} replace />;
  }

  // [TEMPORARY ROLLOUT INTEGRATION] - Intercept unreleased users during phased rollout
  if (user?.rollout && user.rollout.enabled && user.rollout.allowed === false) {
    return <RolloutBlocked rollout={user.rollout} />;
  }

  // Disallowed roles check (e.g., faculty coordinators attempting to access event creation)
  if (disallowedRoles && disallowedRoles.length > 0) {
    const isFacultyUser = Boolean(
      role === 'facultyCoordinator' ||
      role === 'faculty' ||
      user?.principalType === 'FACULTY' ||
      user?.userType === 'faculty' ||
      user?.memberships?.some(
        (m) => m.role === 'FACULTY_COORDINATOR' || m.role === 'facultyCoordinator' || m.role === 'FACULTY'
      )
    );

    const matchesDisallowed =
      disallowedRoles.includes(role) ||
      (disallowedRoles.includes('facultyCoordinator') && isFacultyUser) ||
      (disallowedRoles.includes('faculty') && isFacultyUser);

    if (matchesDisallowed) {
      const redirectTarget = fallbackPath || (user?.clubId ? `/club-events/${user.clubId}` : '/events');
      return <Navigate to={redirectTarget} replace />;
    }
  }

  // Role check: if specific roles are required, verify current role is allowed
  if (roles && roles.length > 0 && !roles.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
