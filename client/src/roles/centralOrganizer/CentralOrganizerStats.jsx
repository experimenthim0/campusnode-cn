import React from "react";
import { Calendar, Clock, Users, CheckCircle, Shield } from "lucide-react";

const CentralOrganizerStats = ({ stats }) => {
  const statItems = [
    {
      label: "Total Events",
      value: stats?.totalEvents || 0,
      icon: Calendar,
      colSpan: "col-span-1",
    },
    {
      label: "Upcoming",
      value: stats?.upcomingEvents || 0,
      icon: Clock,
      colSpan: "col-span-1",
    },
    {
      label: "Registrations",
      value: stats?.totalRegistrations || 0,
      icon: Users,
      colSpan: "col-span-1",
    },
    {
      label: "Attended",
      value: stats?.totalAttendance || 0,
      icon: CheckCircle,
      colSpan: "col-span-1",
    },
    {
      label: "Active Staff",
      value: stats?.activeStaff || 0,
      icon: Shield,
      colSpan: "col-span-2 sm:col-span-1",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {statItems.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-xl shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all ${item.colSpan}`}
          >
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">{item.label}</span>
              <Icon size={18} className="text-brand-600 dark:text-brand-500" />
            </div>
            <p className="text-2xl font-black text-neutral-900 dark:text-neutral-50">{item.value}</p>
          </div>
        );
      })}
    </div>
  );
};

export default CentralOrganizerStats;
