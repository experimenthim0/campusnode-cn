import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getClubBySlugOrId, getClubs, updateClub, getClubMembers } from "../services/clubService";
import { invalidateCache } from "../lib/cacheManager";
import { useNotification } from "../context/NotificationContext";
import { Link } from "react-router-dom";
import WysiwygMarkdownEditor from "../components/WysiwygMarkdownEditor";
import ShimmerText from "../components/ShimmerText";
const slugifyClubName = (value = "") =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const EditClub = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { user, role, setSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [clubId, setClubId] = useState(id);
  const [clubSlug, setClubSlug] = useState("");
  const [roleStudentLeads, setRoleStudentLeads] = useState([]);
  const [formData, setFormData] = useState({
    clubName: "",
    category: "",
    clubGallery: "",
    clubSponsors: "",
    description: "",
    studentCoordinators: "",
    clubInstagram: "",
    clubLinkedin: "",
    clubX: "",
    clubWebsite: "",
    clubWhatsapp: "",
    clubEmail: "",
    motto: "",
    mission: "",
    establishedYear: "",
    facultyEmail: "",
    facultyName: "",
  });

  useEffect(() => {
    const applyClubData = (club, fetchedRoleLeads = []) => {
      setClubId(club._id || club.id);
      setClubSlug(club.slug || "");

      // Resolve student lead from club data or auto-fetched Student Lead role
      const storedCoords = Array.isArray(club.studentCoordinators) && club.studentCoordinators.length > 0
        ? club.studentCoordinators.join(", ")
        : (typeof club.studentCoordinators === "string" && club.studentCoordinators ? club.studentCoordinators : "");
      
      const resolvedStudentLead = storedCoords || (fetchedRoleLeads.length > 0 ? fetchedRoleLeads.join(", ") : "");

      setFormData({
        clubName: club.clubName || "",
        category: club.category || "",
        description: club.description || "",
        studentCoordinators: resolvedStudentLead,
        clubGallery: club.clubGallery?.join(", ") || "",
        clubSponsors: club.clubSponsors?.join(", ") || "",
        clubInstagram:
          club.socialLinks?.find((l) => l.platform === "instagram")?.url || "",
        clubLinkedin:
          club.socialLinks?.find((l) => l.platform === "linkedin")?.url || "",
        clubX: club.socialLinks?.find((l) => l.platform === "x")?.url || "",
        clubWebsite:
          club.socialLinks?.find((l) => l.platform === "website")?.url || "",
        clubWhatsapp:
          club.socialLinks?.find((l) => l.platform === "whatsapp")?.url || "",
        clubEmail: club.clubEmail || "",
        motto: club.motto || "",
        mission: club.mission || "",
        establishedYear: club.establishedYear || "",
        facultyEmail: club.facultyEmail || club.facultyCoordinator?.email || "",
        facultyName: club.facultyName || club.facultyCoordinator?.name || "",
      });
    };

    const fetchClub = async () => {
      try {
        // If id is 'id' or undefined, try to get from logged in user
        let targetId = id === "id" ? null : id;
        if (!targetId) {
          const storedUserData = localStorage.getItem("user");
          const storedUser =
            storedUserData && storedUserData !== "undefined"
              ? JSON.parse(storedUserData)
              : null;
          targetId = storedUser?.clubId;

          // Fallback: look for CLUB_HEAD or COORDINATOR role in memberships
          if (!targetId && storedUser?.memberships?.length > 0) {
            const mgmtMembership = storedUser.memberships.find(
              (m) => m.role === "CLUB_HEAD" || m.role === "COORDINATOR",
            );
            targetId =
              mgmtMembership?.clubId || storedUser.memberships[0].clubId;
          }
        }

        if (!targetId) {
          throw new Error("No club ID found.");
        }

        const [res, membersRes] = await Promise.all([
          getClubBySlugOrId(targetId),
          getClubMembers(targetId).catch(() => null),
        ]);

        if (!res.data.club) {
          throw new Error("Club data not found in response.");
        }

        const membersList = Array.isArray(membersRes?.data)
          ? membersRes.data
          : (membersRes?.data?.members || []);

        const headMembers = membersList.filter(
          (m) => !m.isClubAccount && (m.role === "CLUB_HEAD" || (m.role || "").toUpperCase() === "CLUB_HEAD" || (m.role || "").toLowerCase() === "clubhead" || (m.role || "").toUpperCase() === "STUDENT_LEAD")
        );

        const roleHeadNames = headMembers.map((m) => m.student?.name || m.name).filter(Boolean);
        const fetchedRoleLeads = roleHeadNames.length > 0 
          ? roleHeadNames 
          : (res.data.club.studentHeads || []);
        
        setRoleStudentLeads(fetchedRoleLeads);
        applyClubData(res.data.club, fetchedRoleLeads);
      } catch (err) {
        console.error("DEBUG: fetchClub error:", err);
        if (
          err.response?.status === 404 ||
          err.message === "No club ID found."
        ) {
          try {
            const storedUser = user;
            const storedRole = role;

            if (
              storedUser &&
              (storedRole === "club" || storedRole === "facultyCoordinator")
            ) {
              const clubsRes = await getClubs();
              const matchedClub = clubsRes.data.find(
                (club) =>
                  club._id === storedUser.clubId ||
                  (club.clubName || "").trim().toLowerCase() ===
                    (storedUser.clubName || "").trim().toLowerCase(),
              );

              if (matchedClub) {
                applyClubData(matchedClub, []);
                return;
              }
            }
          } catch (fallbackErr) {
            console.error("Fallback club lookup failed:", fallbackErr);
          }
        }

        showNotification("Failed to fetch club data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchClub();
  }, [id, showNotification]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Pack social links into array for the backend
      const socialLinks = [
        { platform: "instagram", url: formData.clubInstagram },
        { platform: "linkedin", url: formData.clubLinkedin },
        { platform: "x", url: formData.clubX },
        { platform: "website", url: formData.clubWebsite },
        { platform: "whatsapp", url: formData.clubWhatsapp },
      ].filter((link) => link.url && link.url.trim() !== "");

      const processedData = {
        ...formData,
        socialLinks,
        clubGallery: formData.clubGallery
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s !== ""),
        clubSponsors: formData.clubSponsors
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s !== ""),
        studentCoordinators: formData.studentCoordinators
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s !== ""),
      };

      // Cleanup the flattened fields before sending
      delete processedData.clubInstagram;
      delete processedData.clubLinkedin;
      delete processedData.clubX;
      delete processedData.clubWebsite;
      delete processedData.clubWhatsapp;
      delete processedData.clubLogo;
      const res = await updateClub(clubId, processedData);

      await invalidateCache(['/api/clubs/*', '/api/users/*']);

      if (user) {
        const updatedUser = {
          ...user,
          clubId: res.data.club._id,
          clubSlug: res.data.club.slug || "",
          clubName: res.data.club.clubName || user.clubName,
          isClubAdded: true,
        };
        setSession(updatedUser, role);
      }

      showNotification("Club information updated successfully", "success");
      navigate(`/club/${res.data.club.slug || clubSlug || clubId}`);
    } catch (err) {
      showNotification(err.response?.data?.message || "Update failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const inputCls =
    "w-full p-3 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 text-black dark:text-white font-medium text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder:text-neutral-400";

  if (loading) return (
    <div className="text-center py-20">
      <ShimmerText text="Loading club details..." className="text-sm font-semibold tracking-wide" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex justify-between items-center mb-6 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-black dark:text-white">
          Edit Club Profile
        </h1>
        <button
          onClick={() => navigate(`/club/${clubSlug || clubId}`)}
          className="text-xs font-semibold text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 md:p-10 space-y-10 rounded-2xl shadow-sm"
      >
        {/* Basic Info Section */}
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 mb-2 uppercase">
                Club Name
              </label>
              <input
                type="text"
                name="clubName"
                value={formData.clubName}
                onChange={handleChange}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 mb-2 uppercase">
                Category
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="Technical, Cultural, Sports..."
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 mb-2 uppercase">
                Faculty Coordinator
              </label>
              <input
                type="text"
                name="facultyName"
                value={formData.facultyName}
                onChange={handleChange}
                className={inputCls}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 uppercase">
                  Student Lead / Club Head
                </label>
                {roleStudentLeads.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, studentCoordinators: roleStudentLeads.join(", ") }))}
                    className="text-[10px] font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Auto-fill with name from active Student Lead role"
                  >
                    <i className="ri-refresh-line text-xs" /> Sync Role
                  </button>
                )}
              </div>
              <input
                type="text"
                name="studentCoordinators"
                value={formData.studentCoordinators}
                onChange={handleChange}
                placeholder="Student Lead Name"
                className={inputCls}
              />
              {roleStudentLeads.length > 0 && (
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1.5 flex items-center gap-1">
                  <i className="ri-shield-user-line text-xs text-orange-500" />
                  <span>Active Student Lead (from Team Roles): <strong className="text-neutral-700 dark:text-neutral-300 font-semibold">{roleStudentLeads.join(", ")}</strong></span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 mb-2 uppercase">
                Club Motto / Slogan
              </label>
              <input
                type="text"
                name="motto"
                value={formData.motto}
                onChange={handleChange}
                placeholder="e.g. Think. Express. Evolve."
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 mb-2 uppercase">
                Established Year
              </label>
              <input
                type="text"
                name="establishedYear"
                value={formData.establishedYear}
                onChange={handleChange}
                placeholder="e.g. 2018"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 mb-2 uppercase">
              Club Mission Statement
            </label>
            <input
              type="text"
              name="mission"
              value={formData.mission}
              onChange={handleChange}
              placeholder="e.g. Fostering literary excellence and critical debate across campus."
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 mb-2 uppercase">
              Club Mission / Description
            </label>
            <WysiwygMarkdownEditor
              value={formData.description || ""}
              onChange={(markdown) => setFormData(prev => ({ ...prev, description: markdown }))}
              placeholder="Write a rich description of the club, history, initiatives, and activities..."
              minHeight="280px"
            />
          </div>
        </div>

        {/* Visuals & Media */}
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <h3 className="font-semibold tracking-wide text-xs text-neutral-500 dark:text-neutral-400 uppercase">
              Media & Visuals
            </h3>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Logo is managed via <Link to="/profile" className="text-orange-600 dark:text-orange-400 font-semibold hover:underline">Profile</Link>
            </span>
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 mb-2 uppercase">
              Gallery Images (Comma separated URLs)
            </label>
            <textarea
              name="clubGallery"
              value={formData.clubGallery}
              onChange={handleChange}
              placeholder="https://url1.jpg, https://url2.jpg..."
              rows="4"
              className={`${inputCls} font-mono text-xs`}
            ></textarea>
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 mb-2 uppercase">
              Club Sponsors (Comma separated URLs)
            </label>
            <textarea
              name="clubSponsors"
              value={formData.clubSponsors}
              onChange={handleChange}
              placeholder="https://sponsor1-logo.jpg, https://sponsor2-logo.jpg..."
              rows="4"
              className={`${inputCls} font-mono text-xs`}
            ></textarea>
          </div>
        </div>

        {/* Social Links */}
        <div className="space-y-5">
          <h3 className="font-semibold tracking-wide text-xs text-neutral-500 dark:text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 pb-3 flex items-center gap-3 uppercase">
            Public Presence
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { name: "clubInstagram", label: "Instagram URL", placeholder: "https://instagram.com/club" },
              { name: "clubLinkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/company/club" },
              { name: "clubX", label: "X / Twitter URL", placeholder: "https://x.com/club" },
              { name: "clubWebsite", label: "Website URL", placeholder: "https://club.com" },
              { name: "clubWhatsapp", label: "WhatsApp Group/No.", placeholder: "Contact number or group link" },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-[11px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 mb-2 uppercase">
                  {field.label}
                </label>
                <input
                  type={field.name === "clubWhatsapp" ? "text" : "url"}
                  name={field.name}
                  value={formData[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className={`${inputCls} text-xs`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row gap-4 justify-end w-full pt-6 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => navigate(`/club/${clubSlug || clubId}`)}
              className="flex-1 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors font-semibold rounded-xl cursor-pointer text-sm"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`flex-1 py-3 text-white font-semibold tracking-wide transition-all rounded-xl cursor-pointer text-sm ${isSaving ? "bg-neutral-400 cursor-not-allowed" : "bg-orange-600 hover:bg-orange-700"}`}
            >
              {isSaving ? "Syncing..." : "Update Club"}
            </button>
          </div>
          <a
            className="text-xs text-orange-500 hover:text-orange-600 hover:underline transition-colors"
            href={`/club/${clubSlug || clubId}`}
          >
            View Club Page →
          </a>
        </div>
      </form>
    </div>
  );
};
export default EditClub;
