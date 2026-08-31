import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getPendingFeedback } from '../services/feedbackService';
import EventFeedbackModal from '../components/EventFeedbackModal';

const FeedbackPromptContext = createContext(null);

export const useFeedbackPrompt = () => {
  const context = useContext(FeedbackPromptContext);
  if (!context) {
    throw new Error('useFeedbackPrompt must be used within a FeedbackPromptProvider');
  }
  return context;
};

export const FeedbackPromptProvider = ({ children }) => {
  const { user, isAuthenticated, role } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [nextPending, setNextPending] = useState(null);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const studentId = user?.id || user?._id || user?.userId;
  const isStudent = isAuthenticated && (role === 'student' || role === 'member' || user?.rollNo);

  const fetchPending = useCallback(async (autoPrompt = false) => {
    if (!isStudent || !studentId) {
      setPendingCount(0);
      setNextPending(null);
      setPendingEvents([]);
      return;
    }

    try {
      setLoading(true);
      const res = await getPendingFeedback();
      const count = res.data?.pendingFeedbackCount || 0;
      const next = res.data?.nextPendingFeedback || null;
      const events = res.data?.pendingEvents || [];

      setPendingCount(count);
      setNextPending(next);
      setPendingEvents(events);

      if (autoPrompt && count > 0) {
        const sessionDismissedKey = `feedback_dismissed_${studentId}`;
        const isDismissed = sessionStorage.getItem(sessionDismissedKey);
        if (!isDismissed) {
          setTimeout(() => {
            setIsModalOpen(true);
          }, 1200);
        }
      }
    } catch (err) {
      console.warn('Could not check pending feedback:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isStudent, studentId]);

  // Initial check on mount or when user changes
  useEffect(() => {
    if (isStudent && studentId) {
      fetchPending(true);
    } else {
      setPendingCount(0);
      setNextPending(null);
      setPendingEvents([]);
    }
  }, [isStudent, studentId, fetchPending]);

  const openFeedbackModal = () => {
    if (pendingEvents.length > 0) {
      setIsModalOpen(true);
    }
  };

  const closeFeedbackModal = () => {
    setIsModalOpen(false);
    if (studentId) {
      sessionStorage.setItem(`feedback_dismissed_${studentId}`, 'true');
    }
  };

  const handleFeedbackSubmitted = (eventId) => {
    setPendingEvents((prev) => prev.filter((e) => (e.id || e.eventId) !== eventId));
    setPendingCount((prev) => Math.max(0, prev - 1));
    fetchPending(false);
  };

  return (
    <FeedbackPromptContext.Provider
      value={{
        pendingCount,
        nextPending,
        pendingEvents,
        loading,
        openFeedbackModal,
        closeFeedbackModal,
        refreshPending: () => fetchPending(false),
      }}
    >
      {children}
      {isStudent && (
        <EventFeedbackModal
          isOpen={isModalOpen}
          onClose={closeFeedbackModal}
          pendingEvents={pendingEvents}
          onFeedbackSubmitted={handleFeedbackSubmitted}
        />
      )}
    </FeedbackPromptContext.Provider>
  );
};
