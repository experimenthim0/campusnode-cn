import React from "react";
import {
  Upload,
  Link2,
  X,
  Loader2,
  GraduationCap,
  Award,
  Trophy,
  Star,
  PlusCircle,
} from "lucide-react";
import WysiwygMarkdownEditor from "../../components/WysiwygMarkdownEditor";
import {
  PROGRAM_OPTIONS,
  PROGRAM_LABELS,
  ALL_BRANCH_CODES,
} from "../../constants/academicConstants";

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];
const BRANCHES = ALL_BRANCH_CODES;

const CentralEventForm = ({
  formData,
  setFormData,
  editingEventId,
  creating,
  uploadingPoster,
  allYears,
  setAllYears,
  allBranches,
  setAllBranches,
  availableVenues,
  onPosterFileChange,
  onSubmit,
  onCancel,
  onSwitchToCreate,
}) => {
  const handleProgramToggle = (prog) => {
    setFormData((prev) => {
      const current = prev.allowedPrograms || [];
      if (current.includes(prog)) {
        if (current.length <= 1) return prev; // keep at least one
        return { ...prev, allowedPrograms: current.filter((p) => p !== prog) };
      }
      return { ...prev, allowedPrograms: [...current, prog] };
    });
  };

  const handleYearToggle = (year) => {
    setFormData((prev) => {
      const current = prev.allowedYears || [];
      if (current.includes(year)) {
        return { ...prev, allowedYears: current.filter((y) => y !== year) };
      }
      return { ...prev, allowedYears: [...current, year] };
    });
  };

  const handleBranchToggle = (branch) => {
    setFormData((prev) => {
      const current = prev.allowedBranches || [];
      if (current.includes(branch)) {
        return { ...prev, allowedBranches: current.filter((b) => b !== branch) };
      }
      return { ...prev, allowedBranches: [...current, branch] };
    });
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-xs">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-black text-neutral-900 dark:text-neutral-100">
          {editingEventId ? "Edit College-Wide Central Event" : "Create College-Wide Central Event"}
        </h2>
        {editingEventId && (
          <button
            type="button"
            onClick={onSwitchToCreate}
            className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            <PlusCircle size={14} />
            Switch to Create New
          </button>
        )}
      </div>
      <p className="text-xs text-neutral-500 mb-6">
        {editingEventId
          ? "Update your central event details, registration rules, or publish status."
          : "This event will be owned centrally by the Central Organizer and can be published immediately or saved as a draft."}
      </p>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Registration Requirement Setting */}
        <div className="p-4 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/50 rounded-xl space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-orange-900 dark:text-orange-300">
            Registration Requirement *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <label
              className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                formData.registrationType === "none"
                  ? "bg-white dark:bg-neutral-900 border-orange-600 text-orange-600 dark:text-orange-400 shadow-xs"
                  : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
              }`}
            >
              <input
                type="radio"
                name="registrationType"
                value="none"
                checked={formData.registrationType === "none"}
                onChange={() => setFormData({ ...formData, registrationType: "none" })}
                className="hidden"
              />
              <span>No Registration (Open / Walk-in)</span>
            </label>

            <label
              className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                formData.registrationType === "individual"
                  ? "bg-white dark:bg-neutral-900 border-orange-600 text-orange-600 dark:text-orange-400 shadow-xs"
                  : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
              }`}
            >
              <input
                type="radio"
                name="registrationType"
                value="individual"
                checked={formData.registrationType === "individual"}
                onChange={() => setFormData({ ...formData, registrationType: "individual" })}
                className="hidden"
              />
              <span>Individual Registration (QR Pass)</span>
            </label>

            <label
              className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                formData.registrationType === "team"
                  ? "bg-white dark:bg-neutral-900 border-orange-600 text-orange-600 dark:text-orange-400 shadow-xs"
                  : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
              }`}
            >
              <input
                type="radio"
                name="registrationType"
                value="team"
                checked={formData.registrationType === "team"}
                onChange={() => setFormData({ ...formData, registrationType: "team" })}
                className="hidden"
              />
              <span>Team Registration</span>
            </label>
          </div>
          {formData.registrationType === "none" && (
            <p className="text-[11px] text-orange-700 dark:text-orange-400 pt-1">
              ℹ️ Attendees do not need to register on CampusNode. The event will appear with an "Open Event &bull; Walk-ins Welcome" badge.
            </p>
          )}
        </div>

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
              Event Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Freshers' Party 2026 / Annual Cultural Night"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
              Description
            </label>
            <WysiwygMarkdownEditor
              value={formData.description || ""}
              onChange={(markdown) => setFormData(prev => ({ ...prev, description: markdown }))}
              placeholder="Write a clear, attractive event description. Use the visual toolbar above to style headings, bold text, lists, and links..."
              minHeight="280px"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
              Venue *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                list="central-venue-suggestions"
                placeholder="Select or enter venue (e.g. Student Activity Centre)"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-orange-500 outline-none"
              />
              <datalist id="central-venue-suggestions">
                {availableVenues.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
          </div>

          {formData.registrationType !== "none" ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                Total Seats (0 = Unlimited)
              </label>
              <input
                type="number"
                min={0}
                value={formData.totalSeats}
                onChange={(e) => setFormData({ ...formData, totalSeats: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                Capacity
              </label>
              <input
                type="text"
                disabled
                value="Open / Unlimited Attendance"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/50 text-neutral-500 outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
              Start Time *
            </label>
            <input
              type="datetime-local"
              required
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
              End Time *
            </label>
            <input
              type="datetime-local"
              required
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          {formData.registrationType !== "none" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                Registration Deadline
              </label>
              <input
                type="datetime-local"
                value={formData.registrationDeadline}
                onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          )}

          {/* Event Poster: Upload File + Direct Image URL */}
          <div className="md:col-span-2 space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                Event Poster
              </label>
              <span className="text-[11px] text-neutral-500">
                Upload image (max 5MB) or enter image link
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* 1. File Upload Dropzone */}
              <div>
                <input
                  type="file"
                  id="central-poster-upload"
                  accept="image/*"
                  onChange={onPosterFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="central-poster-upload"
                  className={`flex flex-col items-center justify-center gap-2.5 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-5 text-center cursor-pointer hover:border-orange-500 hover:bg-orange-50/40 dark:hover:bg-orange-950/20 transition-all ${
                    uploadingPoster ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  {uploadingPoster ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Loader2 size={24} className="animate-spin text-orange-600" />
                      <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                        Uploading poster...
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center text-orange-600">
                        <Upload size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          <span className="text-orange-600 underline">Click to upload</span> or drag & drop
                        </p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">PNG, JPG, JPEG, WEBP (Max 5MB)</p>
                      </div>
                    </>
                  )}
                </label>
              </div>

              {/* 2. Direct Image URL Input & Live Preview */}
              <div className="space-y-3">
                <div className="relative">
                  <Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="url"
                    placeholder="Or paste direct image URL (https://...)"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                {/* Live Image Preview */}
                {formData.imageUrl ? (
                  <div className="relative border border-neutral-200 dark:border-neutral-800 rounded-xl p-2.5 bg-neutral-50 dark:bg-neutral-850 flex items-center gap-3">
                    <img
                      src={formData.imageUrl}
                      alt="Poster Preview"
                      className="w-14 h-14 object-cover rounded-lg shrink-0 border border-neutral-200 dark:border-neutral-700"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">
                        Poster Selected
                      </p>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                        {formData.imageUrl}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, imageUrl: "" }))}
                      className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full text-neutral-400 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                      title="Remove image"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-400 italic">
                    No poster selected. A default college banner will be displayed if left empty.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Academic Eligibility & Restrictions Card */}
          <div className="md:col-span-2 bg-neutral-50 dark:bg-neutral-950 p-5 sm:p-6 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-6">
            <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-200 dark:border-neutral-850">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                <GraduationCap size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                  Eligibility & Audience Restrictions
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Restrict who can register for this event by degree program, academic year, and branch.
                </p>
              </div>
            </div>

            {/* 1. Allowed Programs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                  Allowed Programs <span className="text-orange-600">*</span>
                </label>
                <span className="text-[11px] text-neutral-400">Select at least one</span>
              </div>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {PROGRAM_OPTIONS.map((prog) => {
                  const isChecked = formData.allowedPrograms?.includes(prog);
                  return (
                    <button
                      key={prog}
                      type="button"
                      onClick={() => handleProgramToggle(prog)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        isChecked
                          ? "bg-orange-600 border-orange-600 text-white shadow-xs"
                          : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300"
                      }`}
                    >
                      {PROGRAM_LABELS[prog] || prog}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Allowed Years */}
            <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-850">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                  Target Academic Years
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                    checked={allYears}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setAllYears(val);
                      if (val) setFormData((prev) => ({ ...prev, allowedYears: [] }));
                    }}
                  />
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Allow All Years (Open to all batches)
                  </span>
                </label>
              </div>

              {!allYears && (
                <div className="flex flex-wrap gap-2.5 p-3.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                  {YEARS.map((yr) => {
                    const isChecked = formData.allowedYears?.includes(yr);
                    return (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => handleYearToggle(yr)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                          isChecked
                            ? "bg-orange-600 border-orange-600 text-white"
                            : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-750 text-neutral-700 dark:text-neutral-300 hover:border-orange-400"
                        }`}
                      >
                        {yr}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Allowed Branches */}
            <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-850">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                  Eligible Branches / Departments
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                    checked={allBranches}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setAllBranches(val);
                      if (val) setFormData((prev) => ({ ...prev, allowedBranches: [] }));
                    }}
                  />
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Allow All Branches
                  </span>
                </label>
              </div>

              {!allBranches && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 p-3.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl max-h-48 overflow-y-auto">
                  {BRANCHES.map((branch) => {
                    const isChecked = formData.allowedBranches?.includes(branch);
                    return (
                      <button
                        key={branch}
                        type="button"
                        onClick={() => handleBranchToggle(branch)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border text-center truncate ${
                          isChecked
                            ? "bg-orange-600 border-orange-600 text-white"
                            : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-750 text-neutral-700 dark:text-neutral-300 hover:border-orange-400"
                        }`}
                        title={branch}
                      >
                        {branch}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Event Features: Certificates & Winner Announcements */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                formData.provideCertificate
                  ? "bg-orange-50/50 dark:bg-orange-950/20 border-orange-500"
                  : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
              }`}
            >
              <input
                type="checkbox"
                checked={formData.provideCertificate}
                onChange={(e) => setFormData({ ...formData, provideCertificate: e.target.checked })}
                className="mt-0.5 w-4 h-4 accent-orange-600 rounded cursor-pointer"
              />
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  <Award size={14} className="text-orange-600" />
                  Provide Digital Certificates
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Issue verified participation certificates to verified attendees.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                formData.showWinner
                  ? "bg-orange-50/50 dark:bg-orange-950/20 border-orange-500"
                  : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
              }`}
            >
              <input
                type="checkbox"
                checked={formData.showWinner}
                onChange={(e) => setFormData({ ...formData, showWinner: e.target.checked })}
                className="mt-0.5 w-4 h-4 accent-orange-600 rounded cursor-pointer"
              />
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  <Trophy size={14} className="text-orange-600" />
                  Announce Competition Winners
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Enable winner podium and leaderboard publication for this event.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                formData.feedbackEnabled !== false
                  ? "bg-orange-50/50 dark:bg-orange-950/20 border-orange-500"
                  : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
              }`}
            >
              <input
                type="checkbox"
                checked={formData.feedbackEnabled !== false}
                onChange={(e) => setFormData({ ...formData, feedbackEnabled: e.target.checked })}
                className="mt-0.5 w-4 h-4 accent-orange-600 rounded cursor-pointer"
              />
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  <Star size={14} className="text-orange-600 fill-orange-500" />
                  Collect Attendee Feedback
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Automatically ask attendees to rate this event for 72 hours after completion.
                </p>
              </div>
            </label>
          </div>

          {/* Publish Mode */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
              Publish Status
            </label>
            <select
              value={formData.reviewStatus}
              onChange={(e) => setFormData({ ...formData, reviewStatus: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
            >
              <option value="PUBLISHED">Publish Immediately (Live on Feed)</option>
              <option value="DRAFT">Save as Draft (Private)</option>
            </select>
          </div>
        </div>

        {/* Form Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md cursor-pointer transition-colors"
          >
            {creating
              ? (editingEventId ? "Saving Changes..." : "Creating Event...")
              : (editingEventId ? "Save Changes" : (formData.reviewStatus === "PUBLISHED" ? "Publish Central Event" : "Save as Draft"))}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CentralEventForm;
