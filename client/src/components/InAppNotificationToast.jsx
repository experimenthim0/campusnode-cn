import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Megaphone, X, ArrowRight } from 'lucide-react';

export const SAMPLE_TOAST_PRESETS = [
  {
    id: 'club_with_logo',
    label: 'Club Broadcast (With Logo)',
    data: {
      id: 'toast-club-1',
      title: 'Annual Debate Championship 2026 Announced!',
      message: 'Registrations are now live for the flagship parliamentary debate. Form teams, submit slots, and compete for ₹50,000 cash prizes.',
      url: '/events',
      type: 'BROADCAST',
      clubId: 'club-preview-123',
      sender: {
        name: 'Literary and Debating Club',
        clubName: 'Literary and Debating Club',
        clubLogo: 'https://res.cloudinary.com/dphudd2z1/image/upload/v1789059738/campusnode/staging/club-banners/club-banner-262c2dd93bd0d6db2f7fc3a9-1789059736155.webp',
      },
    },
  },
  {
    id: 'club_no_logo',
    label: 'Club Broadcast (Fallback Icon)',
    data: {
      id: 'toast-club-2',
      title: 'Robotics Workshop: Microcontrollers 101',
      message: 'Join us tomorrow at 5 PM in Room 302 for hands-on sessions with ESP32 microcontrollers and sensors.',
      url: '/events',
      type: 'BROADCAST',
      clubId: 'club-preview-456',
      sender: {
        name: 'Robotics & Automation Society',
        clubName: 'Robotics & Automation Society',
        clubLogo: null,
      },
    },
  },
  {
    id: 'event_announcement',
    label: 'Event Announcement',
    data: {
      id: 'toast-event-1',
      title: 'HackNITJ 2026 Round 1 Results Published',
      message: 'Shortlisted teams for the 24-hour hackathon finals have been selected. Check your dashboard to view problem statements.',
      url: '/events',
      type: 'EVENT_ANNOUNCEMENT',
      eventId: 'evt-hacknitj-123',
      sender: {
        name: 'Technical Affairs Council',
        clubName: 'Technical Affairs Council',
      },
    },
  },
  {
    id: 'team_invite',
    label: 'Team Invitation',
    data: {
      id: 'toast-team-1',
      title: 'You received a Team Invitation',
      message: 'Nikhil Yadav invited you to join "Nexus Innovators" for the Web3 Hackathon.',
      url: '/notifications',
      type: 'TEAM_INVITATION',
      teamId: 'team-789',
      sender: {
        name: 'CampusNode',
        clubName: 'CampusNode',
      },
    },
  },
];

export const DEFAULT_PREVIEW_TOAST = SAMPLE_TOAST_PRESETS[0].data;

/**
 * InAppNotificationToast — High-visibility real-time in-app notification popup banner.
 *
 * Appears when a real-time notification arrives via Socket.io or Polling while the user is inside CampusNode.
 */
const InAppNotificationToast = ({ toast, onClose, preview = false, inline = false }) => {
  const activeToast = toast || DEFAULT_PREVIEW_TOAST;
  const isPreviewMode = preview || !toast;

  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (activeToast) {
      setIsVisible(true);
    }
  }, [activeToast]);

  useEffect(() => {
    // In preview mode or when no onClose callback is provided, don't auto-dismiss
    if (!activeToast || isHovered || isPreviewMode || !onClose) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Auto-dismiss after 5.5 seconds in live mode
    timerRef.current = setTimeout(() => {
      handleClose();
    }, 5500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeToast, isHovered, isPreviewMode, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
      // If preview mode, keep visible for previewing
      if (isPreviewMode) {
        setIsVisible(true);
      }
    }, 300);
  };

  const handleNavigate = () => {
    if (activeToast?.url) {
      try {
        navigate(activeToast.url);
      } catch (err) {
        window.location.href = activeToast.url;
      }
    }
    if (!isPreviewMode) {
      handleClose();
    }
  };

  const isTeam =
    activeToast.type === 'TEAM_INVITATION' ||
    activeToast.type === 'TEAM_RESPONSE' ||
    Boolean(activeToast.teamId) ||
    activeToast.title?.toLowerCase().includes('team') ||
    activeToast.title?.toLowerCase().includes('invitation');

  const clubName = activeToast.club?.clubName || activeToast.sender?.clubName || (activeToast.sender?.name && !activeToast.sender.name.includes('@') ? activeToast.sender.name : null);
  const clubLogo = activeToast.club?.clubLogo || activeToast.sender?.clubLogo || null;
  const isClubBroadcast = Boolean(activeToast.clubId || clubName);

  const displaySender = isTeam
    ? 'CampusNode'
    : (clubName || 'CampusNode');

  return (
    <div
      className={
        inline
          ? `w-full max-w-[380px] mx-auto transition-all duration-300 transform ${
              isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-0 scale-95'
            }`
          : `fixed z-50 bottom-5 right-5 left-5 sm:left-auto sm:w-[380px] transition-all duration-300 transform ${
              isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-6 opacity-0 scale-95 pointer-events-none'
            }`
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card className="relative overflow-hidden shadow-xl border-border bg-card/95 backdrop-blur-md">
        {/* Subtle accent top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-amber-500 to-brand-600" />

        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900/50 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0 overflow-hidden shadow-xs">
                {clubLogo ? (
                  <img src={clubLogo} alt={displaySender} className="w-full h-full object-cover" />
                ) : isClubBroadcast ? (
                  <Megaphone className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                ) : (
                  <Bell className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                )}
              </div>
              <div className="min-w-0 flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {displaySender}
                  </span>
                  {isClubBroadcast && (
                    <Badge variant="outline" className="text-[9px] font-semibold tracking-wide px-1.5 py-0 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-900/50 bg-brand-50/50 dark:bg-brand-950/30">
                      Club
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  Official Campus Notification
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Notification Title */}
          <h4
            onClick={handleNavigate}
            className="text-sm font-semibold text-foreground leading-snug mb-1 cursor-pointer hover:text-brand-600 dark:hover:text-brand-400 transition-colors line-clamp-2"
          >
            {activeToast.title}
          </h4>

          {/* Notification Message */}
          <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-3 break-words">
            {activeToast.message}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Button
              size="sm"
              onClick={handleNavigate}
              className="h-7 px-3 bg-brand-500 hover:bg-brand-600 text-white rounded-md text-xs font-medium gap-1.5 shadow-xs cursor-pointer"
            >
              <span>View</span>
              <ArrowRight className="w-3 h-3" />
            </Button>

            <span className="text-[10px] text-muted-foreground font-medium">
              Just now
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InAppNotificationToast;
