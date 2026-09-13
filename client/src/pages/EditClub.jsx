import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getClubBySlugOrId,
  getClubs,
  updateClub,
  getClubMembers,
  uploadClubLogo,
  deleteClubLogo,
  deleteClubBanner,
  uploadClubImage,
} from "../services/clubService";
import { invalidateCache } from "../lib/cacheManager";
import { useNotification } from "../context/NotificationContext";
import WysiwygMarkdownEditor from "../components/WysiwygMarkdownEditor";
import ShimmerText from "../components/ShimmerText";
import BannerCropModal from "../components/BannerCropModal";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";
import {
  Palette,
  Image as ImageIcon,
  Crop,
  Upload,
  Trash2,
  Camera,
  ExternalLink,
  ZoomIn,
  Plus,
  Handshake,
  Info,
  Globe,
  Check,
  RefreshCw,
  X,
  Building2,
  Mail,
  Instagram,
  Linkedin,
  Twitter,
  Github,
  MessageCircle,
} from "lucide-react";

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

  // Image Uploading States
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [selectedBannerFileSrc, setSelectedBannerFileSrc] = useState(null);

  // Gallery List
  const [galleryList, setGalleryList] = useState([]);
  const [newGalleryUrl, setNewGalleryUrl] = useState("");

  // Lightbox Preview
  const [lightboxImage, setLightboxImage] = useState(null);

  // File Input Refs
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const [formData, setFormData] = useState({
    clubName: "",
    category: "",
    clubLogo: "",
    bannerImage: "",
    description: "",
    studentCoordinators: "",
    clubInstagram: "",
    clubLinkedin: "",
    clubX: "",
    clubWebsite: "",
    clubWhatsapp: "",
    clubGithub: "",
    clubEmail: "",
    motto: "",
    mission: "",
    establishedYear: "",
    facultyEmail: "",
    facultyName: "",
  });

  const applyClubData = (club, fetchedRoleLeads = []) => {
    const resolvedId = club._id || club.id;
    setClubId(resolvedId);
    setClubSlug(club.slug || "");

    // Resolve student lead from club data or auto-fetched Student Lead role
    const rawCoords = club.studentCoordinators || club.studentcoordinators;
    const storedCoords =
      Array.isArray(rawCoords) && rawCoords.length > 0
        ? rawCoords.join(", ")
        : typeof rawCoords === "string" && rawCoords
        ? rawCoords
        : "";

    const resolvedStudentLead =
      storedCoords || (fetchedRoleLeads.length > 0 ? fetchedRoleLeads.join(", ") : "");

    // Process Gallery Media
    const rawGallery =
      club.clubGallery ||
      club.mediaList?.map((m) => m.url) ||
      club.media?.map((m) => m.url) ||
      [];
    const parsedGallery = Array.isArray(rawGallery)
      ? rawGallery
      : typeof rawGallery === "string" && rawGallery
      ? rawGallery.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    setGalleryList(parsedGallery);

    setFormData({
      clubName: club.clubName || "",
      category: club.category || "",
      clubLogo: club.clubLogo || "",
      bannerImage: club.bannerImage || club.coverImage || "",
      description: club.description || "",
      studentCoordinators: resolvedStudentLead,
      clubInstagram:
        club.socialLinks?.find((l) => l.platform === "instagram")?.url || "",
      clubLinkedin:
        club.socialLinks?.find((l) => l.platform === "linkedin")?.url || "",
      clubX:
        club.socialLinks?.find((l) => l.platform === "x" || l.platform === "twitter")?.url || "",
      clubWebsite:
        club.socialLinks?.find((l) => l.platform === "website")?.url || "",
      clubWhatsapp:
        club.socialLinks?.find((l) => l.platform === "whatsapp")?.url || "",
      clubGithub:
        club.socialLinks?.find((l) => l.platform === "github")?.url || "",
      clubEmail: club.clubEmail || "",
      motto: club.motto || "",
      mission: club.mission || "",
      establishedYear: club.establishedYear || "",
      facultyEmail: club.facultyEmail || club.facultyCoordinator?.email || "",
      facultyName: club.facultyName || club.facultyCoordinator?.name || "",
    });
  };

  useEffect(() => {
    const fetchClub = async () => {
      try {
        let targetId = id === "id" ? null : id;
        if (!targetId) {
          const storedUserData = localStorage.getItem("user");
          const storedUser =
            storedUserData && storedUserData !== "undefined"
              ? JSON.parse(storedUserData)
              : null;
          targetId = storedUser?.clubId;

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
          : membersRes?.data?.members || [];

        const headMembers = membersList.filter(
          (m) =>
            !m.isClubAccount &&
            (m.role === "CLUB_HEAD" ||
              (m.role || "").toUpperCase() === "CLUB_HEAD" ||
              (m.role || "").toLowerCase() === "clubhead" ||
              (m.role || "").toUpperCase() === "STUDENT_LEAD"),
        );

        const roleHeadNames = headMembers
          .map((m) => m.student?.name || m.name)
          .filter(Boolean);
        const fetchedRoleLeads =
          roleHeadNames.length > 0
            ? roleHeadNames
            : res.data.club.studentHeads || [];

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

  // --- LOGO ACTIONS ---
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showNotification("Please select a JPG, PNG, or WEBP image.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification("Image size must be less than 5MB.", "error");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await uploadClubLogo(clubId, fd);
      const newLogo = res.data?.clubLogo || res.data?.club?.clubLogo;
      if (newLogo) {
        setFormData((prev) => ({ ...prev, clubLogo: newLogo }));
        await invalidateCache(["/api/clubs/*", "/api/users/*"]);
        if (
          user &&
          (user.clubId === clubId ||
            user.club?._id === clubId ||
            user.club?.id === clubId)
        ) {
          setSession(
            {
              ...user,
              clubLogo: newLogo,
              club: { ...user.club, clubLogo: newLogo },
            },
            role,
          );
        }
        showNotification("Club logo updated successfully!", "success");
      }
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Failed to upload logo",
        "error",
      );
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm("Are you sure you want to remove the club logo?")) return;
    setIsUploadingLogo(true);
    try {
      await deleteClubLogo(clubId);
      setFormData((prev) => ({ ...prev, clubLogo: "" }));
      await invalidateCache(["/api/clubs/*", "/api/users/*"]);
      if (
        user &&
        (user.clubId === clubId ||
          user.club?._id === clubId ||
          user.club?.id === clubId)
      ) {
        setSession(
          {
            ...user,
            clubLogo: "",
            club: { ...user.club, clubLogo: "" },
          },
          role,
        );
      }
      showNotification("Club logo removed.", "success");
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Failed to remove logo",
        "error",
      );
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // --- BANNER ACTIONS ---
  const handleDirectBannerUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showNotification("Please select a JPG, PNG, or WEBP image.", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showNotification("Image size must be less than 10MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedBannerFileSrc(reader.result);
      setBannerModalOpen(true);
    };
    reader.readAsDataURL(file);
    if (bannerInputRef.current) bannerInputRef.current.value = "";
  };

  const handleRemoveBanner = async () => {
    if (!window.confirm("Are you sure you want to remove the cover banner?"))
      return;
    setIsUploadingBanner(true);
    try {
      await deleteClubBanner(clubId);
      setFormData((prev) => ({ ...prev, bannerImage: "" }));
      await invalidateCache(["/api/clubs/*"]);
      showNotification("Cover banner removed. Default banner restored.", "success");
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Failed to remove banner",
        "error",
      );
    } finally {
      setIsUploadingBanner(false);
    }
  };

  // --- GALLERY ACTIONS ---
  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingGallery(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          showNotification(
            `Skipping ${file.name}: invalid image format.`,
            "error",
          );
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          showNotification(
            `Skipping ${file.name}: file exceeds 10MB limit.`,
            "error",
          );
          continue;
        }
        const fd = new FormData();
        fd.append("image", file);
        const res = await uploadClubImage(clubId, fd, "club-gallery");
        const url = res.data?.secure_url || res.data?.url;
        if (url) uploadedUrls.push(url);
      }

      if (uploadedUrls.length > 0) {
        setGalleryList((prev) => [...prev, ...uploadedUrls]);
        showNotification(
          `Added ${uploadedUrls.length} photo${
            uploadedUrls.length > 1 ? "s" : ""
          } to gallery!`,
          "success",
        );
      }
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Failed to upload gallery images",
        "error",
      );
    } finally {
      setIsUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const handleAddGalleryUrl = () => {
    const url = newGalleryUrl.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      showNotification(
        "Please enter a valid URL starting with http:// or https://",
        "error",
      );
      return;
    }
    if (galleryList.includes(url)) {
      showNotification("This image is already in the gallery.", "error");
      return;
    }
    setGalleryList((prev) => [...prev, url]);
    setNewGalleryUrl("");
  };

  const handleRemoveGalleryImage = (index) => {
    setGalleryList((prev) => prev.filter((_, idx) => idx !== index));
  };

  // --- SAVE ALL SETTINGS ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const socialLinks = [
        { platform: "instagram", url: formData.clubInstagram },
        { platform: "linkedin", url: formData.clubLinkedin },
        { platform: "x", url: formData.clubX },
        { platform: "website", url: formData.clubWebsite },
        { platform: "whatsapp", url: formData.clubWhatsapp },
        { platform: "github", url: formData.clubGithub },
      ].filter((link) => link.url && link.url.trim() !== "");

      const processedData = {
        ...formData,
        clubLogo: formData.clubLogo || null,
        bannerImage: formData.bannerImage || null,
        socialLinks,
        clubGallery: galleryList.filter(Boolean),
        studentCoordinators: formData.studentCoordinators
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s !== ""),
      };

      // Cleanup flattened fields before sending
      delete processedData.clubInstagram;
      delete processedData.clubLinkedin;
      delete processedData.clubX;
      delete processedData.clubWebsite;
      delete processedData.clubWhatsapp;
      delete processedData.clubGithub;

      const res = await updateClub(clubId, processedData);
      await invalidateCache(["/api/clubs/*", "/api/users/*"]);

      if (user) {
        const updatedUser = {
          ...user,
          clubId: res.data.club._id || res.data.club.id,
          clubSlug: res.data.club.slug || "",
          clubName: res.data.club.clubName || user.clubName,
          clubLogo: res.data.club.clubLogo || user.clubLogo,
          isClubAdded: true,
        };
        setSession(updatedUser, role);
      }

      showNotification("Club settings saved successfully!", "success");
      navigate(`/club/${res.data.club.slug || clubSlug || clubId}`);
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Failed to update club settings",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const clubInitials = (formData.clubName || "Club")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (loading) {
    return (
      <div className="text-center py-24 flex flex-col items-center justify-center min-h-[60vh]">
        <ShimmerText
          text="Loading club settings & visual assets..."
          className="text-sm font-semibold tracking-wide text-neutral-600 dark:text-neutral-400"
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="secondary" className="font-semibold text-xs text-primary">
              {formData.category || "Club Management"}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              ID: {clubSlug || clubId}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Club Settings & Brand Hub
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your club's visual branding, cover photo, media gallery, and identity in one place.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-1.5"
          >
            <Link to={`/club/${clubSlug || clubId}`}>
              <ExternalLink className="w-3.5 h-3.5" />
              View Live Page
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => navigate(`/club/${clubSlug || clubId}`)}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ========================================================= */}
        {/* 1. VISUAL IDENTITY STUDIO (BANNER & LOGO) */}
        {/* ========================================================= */}
        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-semibold">Visual Identity & Branding</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Upload your official club logo and wide cover banner. These appear on your club page, event badges, and search results.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 sm:pt-5 space-y-4 sm:space-y-5">
            {/* Banner Container */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-primary" />
                  Cover Banner (1400×450 High-DPI Recommended)
                </label>
                {formData.bannerImage && (
                  <Badge variant="outline" className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 gap-1">
                    <Check className="w-3 h-3" /> Custom Banner Active
                  </Badge>
                )}
              </div>

              <div className="relative w-full h-44 sm:h-60 rounded-xl overflow-hidden border border-border bg-muted/40 shadow-inner group">
                <img
                  src={formData.bannerImage || "/mainbuilding.jpeg"}
                  alt="Club Banner Preview"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-101"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/collegeimg.jpeg";
                  }}
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent pointer-events-none" />

                {/* Uploading Banner Spinner */}
                {isUploadingBanner && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20">
                    <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin mb-2" />
                    <span className="text-xs font-semibold tracking-wide">Uploading banner…</span>
                  </div>
                )}

                {/* Banner Action Buttons Overlay */}
                <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setSelectedBannerFileSrc(null);
                      setBannerModalOpen(true);
                    }}
                    className="h-8 gap-1.5 bg-black/70 hover:bg-black/90 text-white backdrop-blur-md text-xs font-semibold"
                    title="Open Canvas Crop & Position Editor"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    Crop & Adjust
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => bannerInputRef.current?.click()}
                    className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
                    title="Upload image directly"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </Button>

                  {formData.bannerImage && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={handleRemoveBanner}
                      className="h-8 w-8 bg-destructive/80 hover:bg-destructive text-destructive-foreground backdrop-blur-md"
                      title="Remove custom banner"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                {/* Hidden file input for banner */}
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleDirectBannerUpload}
                  className="hidden"
                  aria-hidden="true"
                />

                {/* Overlay: Logo positioning */}
                <div className="absolute bottom-3 left-4 sm:bottom-4 sm:left-6 flex items-end gap-3 sm:gap-4 z-10">
                  <div
                    className="relative group/logo w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-background bg-card shadow-lg flex items-center justify-center cursor-pointer shrink-0 transition-transform duration-200 hover:scale-102"
                    onClick={() => !isUploadingLogo && logoInputRef.current?.click()}
                    title="Click to change club logo"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && logoInputRef.current?.click()}
                  >
                    {formData.clubLogo ? (
                      <img
                        src={formData.clubLogo}
                        alt={formData.clubName || "Club Logo"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/collegeimg.jpeg";
                        }}
                      />
                    ) : (
                      <span className="text-2xl sm:text-3xl font-black text-foreground select-none">
                        {clubInitials}
                      </span>
                    )}

                    {/* Logo Hover Overlay */}
                    {!isUploadingLogo && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/logo:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white p-1 text-center">
                        <Camera className="w-4 h-4 mb-0.5" />
                        <span className="text-[10px] font-bold leading-tight">
                          Change
                        </span>
                      </div>
                    )}

                    {/* Logo Uploading Spinner */}
                    {isUploadingLogo && (
                      <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="text-[9px] font-bold mt-1">Uploading…</span>
                      </div>
                    )}

                    {/* Hidden logo file input */}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="text-white drop-shadow-sm pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-bold tracking-tight">
                        {formData.clubName || "Club Logo"}
                      </span>
                      {formData.clubLogo && (
                        <Badge variant="secondary" className="text-[10px] bg-white/20 text-white backdrop-blur-xs font-normal">
                          Custom
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-200">
                      Click avatar to upload official logo (JPG/PNG/WebP, max 5MB)
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Logo Management Options */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {formData.clubLogo ? "Replace Logo" : "Upload Logo"}
                  </Button>

                  {formData.clubLogo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      disabled={isUploadingLogo}
                      className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove Logo
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  You can also paste an external image URL below if preferred.
                </p>
              </div>
            </div>

            {/* Direct URL Inputs for Logo & Banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Club Logo URL (Alternative)
                </label>
                <Input
                  type="url"
                  name="clubLogo"
                  value={formData.clubLogo}
                  onChange={handleChange}
                  placeholder="https://.../logo.png"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Cover Banner URL (Alternative)
                </label>
                <Input
                  type="url"
                  name="bannerImage"
                  value={formData.bannerImage}
                  onChange={handleChange}
                  placeholder="https://.../banner.jpg"
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========================================================= */}
        {/* 2. MEDIA & PHOTO GALLERY MANAGER */}
        {/* ========================================================= */}
        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base font-semibold">Media Gallery</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {galleryList.length} photo{galleryList.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-0.5">
                  Showcase your club's hackathons, flagship events, team photos, and workshops.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={isUploadingGallery}
                  className="gap-1.5 h-8 text-xs font-semibold"
                >
                  {isUploadingGallery ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Upload Photos
                    </>
                  )}
                </Button>
                <input
                  ref={galleryInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleGalleryUpload}
                  className="hidden"
                  aria-hidden="true"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4 sm:pt-5 space-y-3 sm:space-y-4">
            {/* Add via URL Bar */}
            <div className="flex gap-2">
              <Input
                type="url"
                value={newGalleryUrl}
                onChange={(e) => setNewGalleryUrl(e.target.value)}
                placeholder="Or paste an image URL (https://example.com/photo.jpg)…"
                className="text-xs flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddGalleryUrl();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddGalleryUrl}
                className="text-xs font-semibold h-9 shrink-0"
              >
                Add URL
              </Button>
            </div>

            {/* Gallery Thumbnails Grid */}
            {galleryList.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 pt-1">
                {galleryList.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-muted/30 shadow-xs"
                  >
                    <img
                      src={url}
                      alt={`Gallery item ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                      onClick={() => setLightboxImage(url)}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/collegeimg.jpeg";
                      }}
                    />

                    {/* Gradient shade */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

                    {/* Action Buttons */}
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setLightboxImage(url)}
                        className="w-7 h-7 bg-black/60 hover:bg-black/90 text-white backdrop-blur-md rounded-lg"
                        title="Preview full size"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        onClick={() => handleRemoveGalleryImage(idx)}
                        className="w-7 h-7 bg-destructive/80 hover:bg-destructive text-destructive-foreground backdrop-blur-md rounded-lg"
                        title="Remove from gallery"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white/90 bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-border rounded-xl p-8 text-center flex flex-col items-center justify-center bg-muted/20">
                <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mb-3">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  No Gallery Photos Uploaded
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Upload pictures from workshops, fests, and club activities to create an engaging visual story for prospective members.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => galleryInputRef.current?.click()}
                  className="mt-4 gap-1.5 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Upload First Photo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========================================================= */}
        {/* 3. BASIC INFORMATION & ACADEMIC LEADERSHIP */}
        {/* ========================================================= */}
        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-semibold">Club Information & Leadership</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Core identification, category, coordinators, and foundational mission.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 sm:pt-5 space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Club Name *
                </label>
                <Input
                  type="text"
                  name="clubName"
                  value={formData.clubName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Category
                </label>
                <Input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="Technical, Cultural, Sports, Social, Literary…"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Faculty Coordinator Name
                </label>
                <Input
                  type="text"
                  name="facultyName"
                  value={formData.facultyName}
                  onChange={handleChange}
                  placeholder="Prof. / Dr. Full Name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Faculty Coordinator Email
                </label>
                <Input
                  type="email"
                  name="facultyEmail"
                  value={formData.facultyEmail}
                  onChange={handleChange}
                  placeholder="faculty@college.edu"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Student Lead / Club Head
                  </label>
                  {roleStudentLeads.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          studentCoordinators: roleStudentLeads.join(", "),
                        }))
                      }
                      className="h-6 text-[11px] text-primary hover:text-primary gap-1 px-1.5"
                      title="Auto-fill with name from active Student Lead role"
                    >
                      <RefreshCw className="w-3 h-3" /> Sync Role
                    </Button>
                  )}
                </div>
                <Input
                  type="text"
                  name="studentCoordinators"
                  value={formData.studentCoordinators}
                  onChange={handleChange}
                  placeholder="Student Lead Name (or multiple comma separated)"
                />
                {roleStudentLeads.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Active Student Lead (from Team Roles):{" "}
                    <strong className="text-foreground font-semibold">
                      {roleStudentLeads.join(", ")}
                    </strong>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Official Club Email
                </label>
                <Input
                  type="email"
                  name="clubEmail"
                  value={formData.clubEmail}
                  onChange={handleChange}
                  placeholder="club@campusnode.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Club Motto / Slogan
                </label>
                <Input
                  type="text"
                  name="motto"
                  value={formData.motto}
                  onChange={handleChange}
                  placeholder="e.g. Think. Build. Inspire."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Established Year
                </label>
                <Input
                  type="text"
                  name="establishedYear"
                  value={formData.establishedYear}
                  onChange={handleChange}
                  placeholder="e.g. 2020"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mission Statement
              </label>
              <Input
                type="text"
                name="mission"
                value={formData.mission}
                onChange={handleChange}
                placeholder="A concise, inspiring summary of what your club aims to achieve…"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Detailed Description & Activities
              </label>
              <WysiwygMarkdownEditor
                value={formData.description || ""}
                onChange={(markdown) =>
                  setFormData((prev) => ({ ...prev, description: markdown }))
                }
                placeholder="Write a rich description of the club, history, initiatives, activities, meeting times…"
                minHeight="280px"
              />
            </div>
          </CardContent>
        </Card>

        {/* ========================================================= */}
        {/* 4. SOCIAL LINKS & PUBLIC PRESENCE */}
        {/* ========================================================= */}
        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-semibold">Social Media & Online Presence</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Connect students directly with your social accounts, community groups, and repositories.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4 sm:pt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  name: "clubInstagram",
                  label: "Instagram URL",
                  placeholder: "https://instagram.com/yourclub",
                  icon: Instagram,
                },
                {
                  name: "clubLinkedin",
                  label: "LinkedIn URL",
                  placeholder: "https://linkedin.com/company/yourclub",
                  icon: Linkedin,
                },
                {
                  name: "clubX",
                  label: "X / Twitter URL",
                  placeholder: "https://x.com/yourclub",
                  icon: Twitter,
                },
                {
                  name: "clubWebsite",
                  label: "Official Website",
                  placeholder: "https://yourclub.org",
                  icon: Globe,
                },
                {
                  name: "clubWhatsapp",
                  label: "WhatsApp Community Link",
                  placeholder: "https://chat.whatsapp.com/…",
                  icon: MessageCircle,
                },
                {
                  name: "clubGithub",
                  label: "GitHub Organization",
                  placeholder: "https://github.com/yourclub",
                  icon: Github,
                },
              ].map((field) => {
                const IconComponent = field.icon;
                return (
                  <div key={field.name} className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <IconComponent className="w-3.5 h-3.5 text-primary" />
                      {field.label}
                    </label>
                    <Input
                      type={field.name === "clubWhatsapp" ? "text" : "url"}
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      className="text-xs"
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ========================================================= */}
        {/* BOTTOM ACTION BAR */}
        {/* ========================================================= */}
        <Card className="sticky bottom-4 z-20 border-border bg-card/90 backdrop-blur-md shadow-lg">
          <CardContent className="p-4 sm:p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground text-center sm:text-left">
              Changes will be reflected immediately on your public club page and event listings.
            </p>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/club/${clubSlug || clubId}`)}
                className="flex-1 sm:flex-none text-xs font-semibold"
              >
                Discard Changes
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="flex-1 sm:flex-none text-xs font-semibold gap-2 shadow-xs"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Saving Settings…
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Save Club Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Banner Cropping Modal */}
      <BannerCropModal
        isOpen={bannerModalOpen}
        onClose={() => {
          setBannerModalOpen(false);
          setSelectedBannerFileSrc(null);
        }}
        clubId={clubId}
        initialImageSrc={selectedBannerFileSrc}
        currentBannerUrl={formData.bannerImage || "/mainbuilding.jpeg"}
        onSuccess={(newBannerUrl) => {
          if (newBannerUrl) {
            setFormData((prev) => ({ ...prev, bannerImage: newBannerUrl }));
            invalidateCache(["/api/clubs/*"]);
          }
          showNotification("Cover banner updated successfully!", "success");
        }}
      />

      {/* Lightbox Modal for Gallery Preview */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            className="relative max-w-4xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage}
              alt="Gallery Lightbox"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-white/80 gap-1"
            >
              <X className="w-4 h-4" /> Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditClub;
