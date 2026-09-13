import React from 'react';
import CentralFeaturedEvents from '../../centralOrganizer/CentralFeaturedEvents';

/**
 * FeaturedEventsTab
 * Integrates the full featured events spotlight, rotation mode, reordering,
 * and live preview into the main Admin Dashboard under System Admin.
 */
const FeaturedEventsTab = () => {
  return (
    <div className="w-full">
      <CentralFeaturedEvents />
    </div>
  );
};

export default FeaturedEventsTab;
