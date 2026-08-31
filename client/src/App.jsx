import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import AdminLayout from './components/AdminLayout';
import RouteLoader from './components/RouteLoader';
import PageLoader from './components/PageLoader';
import NetworkGuard from './components/NetworkGuard';
import ProtectedRoute from './components/ProtectedRoute';
import { lazyWithRetry as lazy } from './utils/lazyWithRetry';

// Lazy loaded page components (with auto-retry on stale cache/network error)
const EventFeed = lazy(() => import('./pages/EventFeed'));
const RegisterStudent = lazy(() => import('./pages/RegisterStudent'));
const Team = lazy(() => import('./pages/Team'));
const Login = lazy(() => import('./pages/Login'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const CreateEvent = lazy(() => import('./pages/CreateEvent'));
const Profile = lazy(() => import('./pages/Profile'));
const MyEvents = lazy(() => import('./pages/MyEvents'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const EditEvent = lazy(() => import('./pages/EditEvent'));
const EventRegistrations = lazy(() => import('./pages/EventRegistrations'));
const EventFeedbackAnalytics = lazy(() => import('./pages/EventFeedbackAnalytics'));
const CheckIn = lazy(() => import('./pages/CheckIn'));

const ClubsPage = lazy(() => import('./pages/Clubspage'));
const ClubDetails = lazy(() => import('./pages/ClubDetails'));
const EditClub = lazy(() => import('./pages/EditClub'));
const ClubMembers = lazy(() => import('./pages/ClubMembers'));
const ClubEvents = lazy(() => import('./pages/ClubEvents'));
const Maintainance = lazy(() => import('./pages/Maintainance'));
const Maintenance = Maintainance;
const Home = lazy(() => import('./pages/Home'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'));
const PaymentPolicy = lazy(() => import('./pages/PaymentPolicy'));
const DataPrivacy = lazy(() => import('./pages/DataPrivacy'));
const PaymentTracking = lazy(() => import('./pages/PaymentTracking'));
const EventGuide = lazy(() => import('./pages/EventGuide'));
const Contribute = lazy(() => import('./pages/Contribute'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const FAQ = lazy(() => import('./pages/FAQ'));

const CertificateDesigner = lazy(() => import('./pages/CertificateDesigner'));
const LostAndFound = lazy(() => import('./pages/LostAndFound'));
const LostFoundAdminDashboard = lazy(() => import('./pages/LostFoundAdminDashboard'));
const ExportCenter = lazy(() => import('./pages/ExportCenter'));
const LostFoundGuide = lazy(() => import('./pages/LostFoundGuide'));
const SendNotification = lazy(() => import('./pages/SendNotification'));
const Notifications = lazy(() => import('./pages/Notifications'));
const CentralOrganizerDashboard = lazy(() => import('./pages/CentralOrganizerDashboard'));
const CentralOrganizerGuide = lazy(() => import('./pages/CentralOrganizerGuide'));
const EventStaffDashboard = lazy(() => import('./pages/EventStaffDashboard'));
const StaffAttendanceView = lazy(() => import('./pages/StaffAttendanceView'));
const EventCalendarPage = lazy(() => import('./pages/EventCalendarPage'));
const FeedbackSurveyPreview = lazy(() => import('./pages/FeedbackSurveyPreview'));
const LeaderboardGuide = lazy(() => import('./pages/LeaderboardGuide'));

import { NotificationProvider } from './context/NotificationContext';
import { SocketProvider } from './context/SocketContext';
import { FeedbackPromptProvider } from './context/FeedbackPromptContext';

function App() {

   const isMaintenance = import.meta.env.VITE_MAINTENANCE_MODE === 'true';
  if (isMaintenance) {
    return <Maintainance />;
  }
  return (
    <NotificationProvider>
      <SocketProvider>
        <FeedbackPromptProvider>
          <NetworkGuard>
            <RouteLoader>
              <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route element={
                  <ProtectedRoute roles={['admin', 'paymentAdmin', 'lostFoundAdmin']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }>
                  <Route path="/admin-dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/export-center" element={<ExportCenter />} />
                  <Route path="/admin/lost-found" element={<LostFoundAdminDashboard />} />
                </Route>

                <Route element={<AppLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/clubs" element={<ClubsPage />} />
                  <Route path="/club/:slug" element={<ClubDetails />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password/:token" element={<ResetPassword />} />
                  <Route path="/events" element={<EventFeed />} />
                  <Route path="/event/:slug" element={<EventDetails />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<RegisterStudent />} />
                  <Route path="/admin-secret-login" element={<AdminLogin />} />
                  <Route path="/maintenance" element={<Maintenance />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsAndConditions />} />
                  <Route path="/payment-policy" element={<PaymentPolicy />} />
                  <Route path="/data-privacy" element={<DataPrivacy />} />
                  <Route path="/event-guide" element={<EventGuide />} />
                  <Route path="/contribute" element={<Contribute />} />
                  <Route path="/verify-email/:token" element={<VerifyEmail />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/lost-found" element={<LostAndFound />} />
                  <Route path="/lost-found/guide" element={<LostFoundGuide />} />
                  <Route path="/ranking-guide" element={<LeaderboardGuide />} />

                  {/* Protected routes (require login) */}
                  <Route path="/create" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/my-events" element={<ProtectedRoute><MyEvents /></ProtectedRoute>} />
                  <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
                  <Route path="/events/edit/:id" element={<ProtectedRoute><EditEvent /></ProtectedRoute>} />
                  <Route path="/club/edit/:id" element={<ProtectedRoute><EditClub /></ProtectedRoute>} />
                  <Route path="/club/:clubId/team" element={<ProtectedRoute><ClubMembers /></ProtectedRoute>} />
                  <Route path="/club-events/:clubId" element={<ProtectedRoute><ClubEvents /></ProtectedRoute>} />
                  <Route path="/send-notification" element={<ProtectedRoute><SendNotification /></ProtectedRoute>} />
                  <Route path="/event/:id/registrations" element={<ProtectedRoute><EventRegistrations /></ProtectedRoute>} />
                  <Route path="/event/:id/feedback" element={<ProtectedRoute><EventFeedbackAnalytics /></ProtectedRoute>} />
                  <Route path="/event/:id/check-in" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
                  <Route path="/event/:id/design-certificate" element={<ProtectedRoute><CertificateDesigner /></ProtectedRoute>} />
                  <Route path="/payments" element={<ProtectedRoute><PaymentTracking /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  <Route path="/central-organizer" element={<ProtectedRoute><CentralOrganizerDashboard /></ProtectedRoute>} />
                  <Route path="/central-organizer/guide" element={<ProtectedRoute><CentralOrganizerGuide /></ProtectedRoute>} />
                  <Route path="/central-organizer-guide" element={<ProtectedRoute><CentralOrganizerGuide /></ProtectedRoute>} />
                  <Route path="/event-staff" element={<ProtectedRoute><EventStaffDashboard /></ProtectedRoute>} />
                  <Route path="/event-staff/:eventId/attendance" element={<ProtectedRoute><StaffAttendanceView /></ProtectedRoute>} />
                  <Route path="/event-calendar" element={<ProtectedRoute><EventCalendarPage readOnly /></ProtectedRoute>} />
                  <Route path="/feedback-questions" element={<ProtectedRoute><FeedbackSurveyPreview /></ProtectedRoute>} />
                  <Route path="/feedback-survey-preview" element={<ProtectedRoute><FeedbackSurveyPreview /></ProtectedRoute>} />

                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
              </Suspense>
            </RouteLoader>
          </NetworkGuard>
        </FeedbackPromptProvider>
      </SocketProvider>
    </NotificationProvider>
  );
}

export default App;
