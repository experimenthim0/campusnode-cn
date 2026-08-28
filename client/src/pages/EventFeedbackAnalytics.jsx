import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getEventById } from '../services/eventService';
import {
  getEventFeedbackAnalytics,
  getAIReviews,
  generateAIReview,
  downloadAIReviewPDF,
  downloadAIReviewJSON,
} from '../services/feedbackService';
import ShimmerText from '../components/ShimmerText';

// Modular Feedback Analytics Subcomponents
import EventHeader from '../components/feedback/EventHeader';
import CoreMetrics from '../components/feedback/CoreMetrics';
import AIReviewModule from '../components/feedback/AIReviewModule';
import CategoryRatings from '../components/feedback/CategoryRatings';
import RatingDistribution from '../components/feedback/RatingDistribution';
import AttendanceIntent from '../components/feedback/AttendanceIntent';
import RawAttendeeResponses from '../components/feedback/RawAttendeeResponses';
import ZeroFeedbackState from '../components/feedback/ZeroFeedbackState';

const EventFeedbackAnalytics = () => {
  const { id } = useParams();
  const [eventData, setEventData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // AI Feedback Review State
  const [aiState, setAiState] = useState({
    loading: false,
    generating: false,
    downloadingPdf: false,
    error: '',
    data: null,
    selectedReviewIndex: 0,
  });

  const fetchAIReviews = useCallback(async () => {
    try {
      setAiState((prev) => ({ ...prev, loading: true, error: '' }));
      const res = await getAIReviews(id);
      const reviews = res.data?.reviews || [];
      setAiState((prev) => ({
        ...prev,
        loading: false,
        data: res.data,
        selectedReviewIndex: reviews.length > 0 ? reviews.length - 1 : 0,
      }));
    } catch (err) {
      console.error('Failed to load AI reviews:', err);
      setAiState((prev) => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || 'Failed to load AI review history.',
      }));
    }
  }, [id]);

  const handleGenerateAIReview = async () => {
    if (aiState.data?.completedCount >= 2) {
      setAiState((prev) => ({
        ...prev,
        error: 'Maximum AI review limit reached (2 / 2 reviews used).',
      }));
      return;
    }

    try {
      setAiState((prev) => ({ ...prev, generating: true, error: '' }));
      const res = await generateAIReview(id);
      await fetchAIReviews();
      const updatedReviews = res.data?.review?.reviewNumber || 1;
      setAiState((prev) => ({
        ...prev,
        generating: false,
        selectedReviewIndex: Math.max(0, updatedReviews - 1),
      }));
    } catch (err) {
      console.error('AI Review Generation Error:', err);
      setAiState((prev) => ({
        ...prev,
        generating: false,
        error: err.response?.data?.message || 'Failed to generate AI review. Your review quota was not used.',
      }));
    }
  };

  const handleDownloadPDF = async (reviewNumber) => {
    try {
      setAiState((prev) => ({ ...prev, downloadingPdf: true }));
      const res = await downloadAIReviewPDF(id, reviewNumber);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const sanitizedTitle = (eventData?.title || 'event').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.setAttribute('download', `CampusNode_AI_Review_${sanitizedTitle}_R${reviewNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      setAiState((prev) => ({
        ...prev,
        error: 'Failed to download PDF report. Please try again.',
      }));
    } finally {
      setAiState((prev) => ({ ...prev, downloadingPdf: false }));
    }
  };

  const handleDownloadJSON = async (reviewNumber) => {
    try {
      const res = await downloadAIReviewJSON(id, reviewNumber);
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(res.data, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `CampusNode_AI_Review_R${reviewNumber}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Failed to export JSON:', err);
    }
  };

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [eventRes, analyticsRes] = await Promise.all([
        getEventById(id),
        getEventFeedbackAnalytics(id, { filter: 'all' }),
      ]);

      setEventData(eventRes.data);
      setAnalytics(analyticsRes.data);
      setError('');
    } catch (err) {
      console.error('Failed to load feedback analytics:', err);
      setError(err.response?.data?.message || 'Failed to load feedback analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    fetchAIReviews();
  }, [fetchData, fetchAIReviews]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-neutral-50 dark:bg-[#0a0a0a]">
        <ShimmerText text="Loading event feedback analytics..." className="text-sm font-semibold tracking-wide" />
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-white dark:bg-[#0a0a0a] px-4">
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 p-8 rounded-3xl text-center text-rose-700 dark:text-rose-300 font-bold max-w-md space-y-4">
          <i className="ri-error-warning-line text-4xl block text-rose-500" aria-hidden="true" />
          <p className="text-sm">{error}</p>
          <Link
            to="/my-events"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const isCompleted = eventData?.endTime && new Date(eventData.endTime) < new Date();
  const totalResponses = analytics?.overview?.totalResponses || 0;
  const totalAttendees = analytics?.overview?.totalAttendees || 0;
  const responseRate = analytics?.overview?.responseRate || 0;
  const overallScore = analytics?.averageRatings?.overall || 0;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a] transition-colors duration-300">
      <main className="max-w-[95vw] xl:max-w-[1300px] mx-auto px-4 md:px-6 py-10">
        
        {/* A. Event Header */}
        <EventHeader
          eventData={eventData}
          isCompleted={isCompleted}
          refreshing={refreshing}
          onRefresh={() => fetchData(true)}
          eventId={id}
        />

        {/* Zero Feedback Empty State */}
        {!analytics || totalResponses === 0 ? (
          <ZeroFeedbackState isCompleted={isCompleted} />
        ) : (
          <div className="space-y-8">
            
            {/* B. Core Performance Metrics */}
            <CoreMetrics
              totalResponses={totalResponses}
              totalAttendees={totalAttendees}
              responseRate={responseRate}
              overallScore={overallScore}
            />

            {/* C. AI Feedback Review & Intelligence Module (Verdict, Insights, Recommendations, Quotes) */}
            <AIReviewModule
              aiState={aiState}
              setAiState={setAiState}
              totalResponses={totalResponses}
              analytics={analytics}
              onGenerateReview={handleGenerateAIReview}
              onDownloadPDF={handleDownloadPDF}
              onDownloadJSON={handleDownloadJSON}
            />

            {/* D. Category Performance & Rating Distribution Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Ratings Breakdown (0-5 scale & Biggest Gap) */}
              <CategoryRatings averageRatings={analytics.averageRatings} />

              {/* Rating Distribution & Attendance Intent */}
              <div className="space-y-6">
                <RatingDistribution ratingDistribution={analytics.ratingDistribution} />
                <AttendanceIntent
                  recommendationAnalytics={analytics.recommendationAnalytics}
                  totalResponses={totalResponses}
                />
              </div>
            </div>

            {/* E. Raw Attendee Written Responses Feed (Search, Sentiment Filter, Sorter) */}
            <RawAttendeeResponses responses={analytics.writtenResponses} />

          </div>
        )}
      </main>
    </div>
  );
};

export default EventFeedbackAnalytics;
