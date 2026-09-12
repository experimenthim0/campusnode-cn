import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { sendNotification, getSentNotifications } from "../services/notificationService";
import { getClubManagedEvents } from "../services/eventService";
import { getClubById } from "../services/clubService";
import ClubAnnouncementsSection from "../components/ClubAnnouncementsSection";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Bell,
  Megaphone,
  Send,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  Building,
  Loader2,
  Radio,
  Clock,
  Compass
} from "lucide-react";

const formatRelativeTime = (dateStr) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  if (diffDay === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const SendNotification = () => {
  const { user, role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tab state: "notifications" | "announcements"
  const currentTab = searchParams.get("tab") === "announcements" ? "announcements" : "notifications";
  const urlClubId = searchParams.get("clubId");

  const handleTabChange = (tab) => {
    const params = {};
    if (tab === "announcements") params.tab = "announcements";
    if (selectedClubId) params.clubId = selectedClubId;
    setSearchParams(params);
  };

  const [targetType, setTargetType] = useState("ALL_STUDENTS");
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [history, setHistory] = useState([]);

  const [managedClubs, setManagedClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState(urlClubId || null);
  const [activeClubData, setActiveClubData] = useState(null);
  const [loadingClub, setLoadingClub] = useState(false);

  useEffect(() => {
    if (urlClubId && urlClubId !== selectedClubId) {
      setSelectedClubId(urlClubId);
    }
  }, [urlClubId]);

  useEffect(() => {
    if (user) {
      const clubs = [];
      if (user.clubId) {
        clubs.push({
          id: user.clubId,
          name: user.name || "Club",
          logo: user.clubLogo || user.profileImage,
        });
      } else if (role === "club") {
        clubs.push({
          id: user.id || user._id,
          name: user.name || "Club",
          logo: user.clubLogo || user.profileImage,
        });
      }

      if (user.memberships && Array.isArray(user.memberships)) {
        user.memberships.forEach((m) => {
          if (
            (m.role === "CLUB_HEAD" || m.role === "COORDINATOR" || m.role === "facultyCoordinator" || m.canEditEvents) &&
            m.clubId &&
            !clubs.some((c) => c.id === m.clubId)
          ) {
            clubs.push({
              id: m.clubId,
              name: m.clubName || "Club",
              logo: m.clubLogo,
            });
          }
        });
      }

      setManagedClubs(clubs);
      if (clubs.length > 0 && !selectedClubId) {
        setSelectedClubId(urlClubId || clubs[0].id);
      }
    }
  }, [user, role, selectedClubId, urlClubId]);

  const fetchActiveClubDetails = useCallback(async (clubIdToFetch) => {
    const targetId = clubIdToFetch || selectedClubId;
    if (!targetId) return;

    setLoadingClub(true);
    try {
      const res = await getClubById(targetId);
      const fetchedClub = res.data?.club || res.data;
      if (fetchedClub) {
        setActiveClubData(fetchedClub);
      }
    } catch (err) {
      console.error("Error fetching club details for announcements:", err);
    } finally {
      setLoadingClub(false);
    }
  }, [selectedClubId]);

  useEffect(() => {
    if (selectedClubId) {
      fetchActiveClubDetails(selectedClubId);
    }
  }, [selectedClubId, fetchActiveClubDetails]);

  useEffect(() => {
    if (user && (user.id || user.clubId || user._id)) {
      const isCentral = role === "central_organizer" || user?.principalType === "INSTITUTIONAL";
      const targetClubId = selectedClubId || user.clubId;

      if (isCentral) {
        import("../services/api").then(({ default: api }) => {
          api.get("/api/central-organizer/events")
            .then((res) => setEvents(res.data.events || []))
            .catch((err) => console.error("Could not fetch central events", err));
        });
      } else if (targetClubId) {
        getClubManagedEvents(targetClubId)
          .then((res) => {
            setEvents(res.data || []);
          })
          .catch((err) => console.error("Could not fetch events", err));
      }

      getSentNotifications(targetClubId ? { clubId: targetClubId } : undefined)
        .then((res) => setHistory(res.data || []))
        .catch((err) => console.error("Could not fetch history", err));
    }
  }, [user, role, selectedClubId]);

  const handleSubmitNotification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    const targetClubId = selectedClubId || user.clubId;

    if (!targetClubId && role !== "admin" && user?.principalType !== "ADMIN") {
      setErrorMsg("Please select an authorized club before broadcasting.");
      setLoading(false);
      return;
    }

    try {
      const res = await sendNotification({
        title,
        message,
        targetType,
        clubId: targetClubId,
        eventId:
          targetType === "REGISTERED_STUDENTS" || targetType === "EVENT_PARTICIPANTS"
            ? selectedEventId
            : undefined,
      });

      setSuccessMsg("Club broadcast dispatched successfully!");
      setHistory((prev) => [res.data, ...prev]);
      setTitle("");
      setMessage("");
      setTargetType("ALL_STUDENTS");
      setSelectedEventId("");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to send notification.");
    } finally {
      setLoading(false);
    }
  };

  const currentClubName =
    activeClubData?.clubName ||
    managedClubs.find((c) => c.id === selectedClubId)?.name ||
    user?.name ||
    "Club";

  const currentClubLogo =
    activeClubData?.clubLogo ||
    managedClubs.find((c) => c.id === selectedClubId)?.logo ||
    null;

  // Access Control: regular students without club coordinator roles cannot broadcast
  const isStudent = role === "student" || role === "member" || user?.principalType === "STUDENT";
  const hasNoClubAuth = managedClubs.length === 0 && role !== "admin" && user?.principalType !== "ADMIN" && role !== "club";

  if (isStudent && hasNoClubAuth) {
    return (
      <div className="max-w-[650px] mx-auto px-4 py-10 text-center">
        <Card className="p-5 sm:p-6 space-y-3">
          <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20">
            <Shield className="w-7 h-7" />
          </div>
          <CardTitle className="text-xl">Authorized Club Leadership Required</CardTitle>
          <CardDescription className="text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Broadcasting is restricted to official student club heads, coordinators, and faculty. Personal student broadcasts are not permitted.
          </CardDescription>
          <div className="pt-2">
            <Button asChild className="font-semibold gap-2">
              <Link to="/clubs">
                <Compass className="w-4 h-4" />
                <span>Browse Clubs</span>
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-primary border-primary/30">
            Broadcasts & Communication
          </Badge>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Broadcast Center
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Dispatch real-time notifications to student feeds and post official club announcements.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-muted rounded-xl border border-border">
        <Button
          type="button"
          variant={currentTab === "notifications" ? "default" : "ghost"}
          size="sm"
          onClick={() => handleTabChange("notifications")}
          className={`flex-1 gap-2 font-semibold ${currentTab === "notifications" ? "shadow-xs" : "text-muted-foreground"}`}
        >
          <Bell className="w-4 h-4" />
          <span>Push Notification</span>
        </Button>

        <Button
          type="button"
          variant={currentTab === "announcements" ? "default" : "ghost"}
          size="sm"
          onClick={() => handleTabChange("announcements")}
          className={`flex-1 gap-2 font-semibold ${currentTab === "announcements" ? "shadow-xs" : "text-muted-foreground"}`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Club Announcements</span>
          {activeClubData?.announcements?.length > 0 && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-bold">
              {activeClubData.announcements.length}
            </Badge>
          )}
        </Button>
      </div>

      {currentTab === "notifications" && (
        <div className="space-y-6">
          <Card className="p-4 sm:p-6">
            {/* Multiple Managed Clubs Selector if applicable */}
            {managedClubs.length > 1 && (
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/40 border border-border rounded-xl">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold">
                    Broadcasting on behalf of:
                  </span>
                </div>
                <select
                  value={selectedClubId || ""}
                  onChange={(e) => {
                    setSelectedClubId(e.target.value);
                    setSearchParams({ ...(currentTab === "announcements" ? { tab: "announcements" } : {}), clubId: e.target.value });
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary"
                >
                  {managedClubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Official Club Broadcast Identity Banner */}
            {(selectedClubId || currentClubName !== "Club") && (
              <div className="mb-6 flex items-center gap-3.5 p-3.5 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="w-11 h-11 rounded-lg overflow-hidden bg-background border border-border flex items-center justify-center shrink-0">
                  {currentClubLogo ? (
                    <img src={currentClubLogo} alt={currentClubName} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Sending As Official Club
                    </span>
                    <Badge variant="outline" className="text-[9px] font-bold text-primary border-primary/30 py-0">
                      <ShieldCheck className="w-3 h-3 mr-1 text-primary" /> Verified
                    </Badge>
                  </div>
                  <div className="text-sm font-bold truncate mt-0.5">
                    {currentClubName}
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <span className="text-[11px] text-muted-foreground">
                    Sender email protected
                  </span>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold text-xs sm:text-sm rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="mb-6 p-3.5 bg-destructive/10 border border-destructive/20 text-destructive font-semibold text-xs sm:text-sm rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitNotification} className="space-y-5">
              {/* Target Audience */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Target Audience
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  {[
                    { value: "ALL_STUDENTS", label: "All Students" },
                    { value: "REGISTERED_STUDENTS", label: "Registered Students" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border cursor-pointer transition-all flex-1 ${
                        targetType === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-border/80"
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetType"
                        value={opt.value}
                        checked={targetType === opt.value}
                        onChange={() => setTargetType(opt.value)}
                        className="accent-primary"
                      />
                      <span className="text-xs sm:text-sm font-medium">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Event Selector (Conditional) */}
              {targetType === "REGISTERED_STUDENTS" && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Select Event
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    required
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-xs sm:text-sm bg-background text-foreground outline-none focus:border-primary transition-all"
                  >
                    <option value="" disabled>
                      -- Select an event --
                    </option>
                    {events.map((evt) => (
                      <option key={evt.id || evt._id} value={evt.id || evt._id}>
                        {evt.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    Only students registered for this event will receive the notification.
                  </p>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Notification Title
                </label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g., Important Venue Change"
                  className="text-xs sm:text-sm"
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Message
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  placeholder="Write your broadcast message here..."
                  className="text-xs sm:text-sm resize-y"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full font-semibold uppercase tracking-wider text-xs gap-2 py-5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Broadcast...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Notification</span>
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* History */}
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight mb-4">
              Notification History
            </h2>
            {history.length === 0 ? (
              <Card className="border-dashed p-10 text-center flex flex-col items-center gap-2">
                <Bell className="w-8 h-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">No notifications sent yet.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {history.map((notif) => (
                  <Card
                    key={notif.id || notif._id}
                    className="p-4 hover:border-border/80 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2 gap-3 flex-wrap">
                      <Badge
                        variant={notif.targetType === "ALL_STUDENTS" ? "secondary" : "outline"}
                        className="text-[10px] font-semibold"
                      >
                        {notif.targetType === "ALL_STUDENTS"
                          ? "Sent to all students"
                          : `Event: ${notif.eventId?.title || "Event Participants"}`}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground font-mono" title={new Date(notif.createdAt).toLocaleString()}>
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold mb-1">{notif.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{notif.message}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {currentTab === "announcements" && (
        <div className="space-y-6">
          {/* Multiple Managed Clubs Selector if applicable */}
          {managedClubs.length > 1 && (
            <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Club to Manage:
              </label>
              <select
                value={selectedClubId || ""}
                onChange={(e) => setSelectedClubId(e.target.value)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary"
              >
                {managedClubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Card>
          )}

          {loadingClub && !activeClubData ? (
            <Card className="p-6 sm:p-8 text-center flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading club announcements...</p>
            </Card>
          ) : selectedClubId ? (
            <ClubAnnouncementsSection
              clubId={selectedClubId}
              clubName={currentClubName}
              initialAnnouncements={activeClubData?.announcements || []}
              canManage={true}
              onUpdate={() => fetchActiveClubDetails(selectedClubId)}
            />
          ) : (
            <Card className="border-dashed p-6 sm:p-8 text-center">
              <Building className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-semibold">
                No club assigned to manage announcements.
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                You must be a club account or hold a leadership role (Club Head / Coordinator) to post announcements.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default SendNotification;
