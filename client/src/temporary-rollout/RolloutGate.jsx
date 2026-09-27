import React from 'react';
import { useAuth } from '../context/AuthContext';
import RolloutBlocked from './RolloutBlocked';

/**
 * RolloutGate — Wraps protected routes or application screens to prevent
 * unreleased users from accessing CampusNode before their scheduled stage.
 *
 * Behavior:
 * - If rollout is inactive or user is permitted: renders children normally.
 * - If user's rollout stage is not yet open: renders RolloutBlocked screen.
 */
export const RolloutGate = ({ children }) => {
  const { user } = useAuth();

  // If user object carries an explicit rollout block, intercept
  if (user?.rollout && user.rollout.enabled && user.rollout.allowed === false) {
    return <RolloutBlocked rollout={user.rollout} />;
  }

  return children;
};

export default RolloutGate;
