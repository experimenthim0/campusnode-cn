import React, { useState, useEffect, useRef } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import * as lostFoundService from '../services/lostFoundService';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import ShimmerText from '../components/ShimmerText';


const GLOBAL_STYLES = `
  .lf-modal::-webkit-scrollbar { width: 6px; }
  .lf-modal::-webkit-scrollbar-track { background: transparent; }
  .lf-modal::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.3); border-radius: 3px; }
`;

let stylesInjected = false;
function ensureStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.id = 'lf-styles';
  el.textContent = GLOBAL_STYLES;
  document.head.appendChild(el);
  stylesInjected = true;
}

const LostAndFound = () => {
  ensureStyles();

  const [items,           setItems          ] = useState([]);
  const [myItems,         setMyItems        ] = useState([]);
  const [activeTab,       setActiveTab      ] = useState('browse');
  const [showModal,       setShowModal      ] = useState(false);
  const [loading,         setLoading        ] = useState(false);
  const [uploading,       setUploading      ] = useState(false);
  const [formData,        setFormData       ] = useState({
    title: '', description: '', type: 'Lost',
    image_url: '', image_public_id: '', whatsapp: ''
  });
  const [selectedContact, setSelectedContact] = useState(null);
  const [reportModalItem, setReportModalItem] = useState(null);
  const [reportReason,    setReportReason   ] = useState('');
  const [reportSubmitting,setReportSubmitting] = useState(false);
  const [fetching,        setFetching       ] = useState(false);
  const [typeFilter,      setTypeFilter     ] = useState('ALL');
  const [activeOnly,      setActiveOnly     ] = useState(false);
  const [confirmModal,    setConfirmModal   ] = useState({
    isOpen: false, title: '', message: '', onConfirm: null,
    confirmText: 'Confirm', cancelText: 'Cancel', isDanger: false
  });

  const navigate = useNavigate();
  const { user } = useAuth();

  const triggerConfirm = ({ title, message, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false }) => {
    setConfirmModal({
      isOpen: true, title, message, isDanger, confirmText, cancelText,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const getFilteredItems = () => {
    const list = activeTab === 'browse' ? items : myItems;
    return list.filter(item => {
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
      if (activeOnly && item.status === 'REUNITED') return false;
      return true;
    });
  };

  useEffect(() => {
    if (!user) return;
    fetchItems();
    if (user) fetchMyItems();
  }, [activeTab]);

  const fetchItems = async () => {
    setFetching(true);
    try {
      const res = await lostFoundService.getLostFoundItems();
      setItems(res.data);
    } catch { toast.error('Failed to load items'); }
    finally { setFetching(false); }
  };

  const fetchMyItems = async () => {
    setFetching(true);
    try {
      const res = await lostFoundService.getMyPosts();
      setMyItems(res.data);
    } catch (err) { console.error(err); }
    finally { setFetching(false); }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Please login to post');
    setLoading(true);
    try {
      await lostFoundService.createLostFoundItem(formData);
      toast.success('Post created successfully!');
      setShowModal(false);
      setFormData({ title: '', description: '', type: 'Lost', image_url: '', image_public_id: '', whatsapp: '' });
      fetchItems(); fetchMyItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create post');
    } finally { setLoading(false); }
  };

  const handleResolve = (id) => {
    triggerConfirm({
      title: 'Mark as Reunited?',
      message: 'This item will remain visible in the browse feed for 24 hours before auto-hiding.',
      confirmText: 'Mark Reunited', isDanger: false,
      onConfirm: async () => {
        try {
          await lostFoundService.reuniteItem(id);
          toast.success('Marked as Reunited');
          fetchItems(); fetchMyItems();
        } catch { toast.error('Failed to update status'); }
      }
    });
  };

  const handleClaim = (item) => {
    triggerConfirm({
      title: item.type === 'LOST' ? 'Found this item?' : 'Is this yours?',
      message: 'False claims can lead to temporary or permanent account restrictions.',
      confirmText: 'Yes, Claim', isDanger: false,
      onConfirm: async () => {
        try {
          const res = await lostFoundService.claimItem(item.id);
          setSelectedContact({ ...item, contact_info: res.data.contact });
          toast.success('Claim initiated!');
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to claim item'); }
      }
    });
  };

  const handleReport = (itemId) => { setReportModalItem(itemId); setReportReason(''); };

  const submitReport = async () => {
    if (!reportReason.trim()) return toast.error('Please select or enter a reason.');
    setReportSubmitting(true);
    try {
      await lostFoundService.reportItem(reportModalItem, { reason: reportReason.trim() });
      toast.success('Report submitted. The post owner has been notified.');
      setReportModalItem(null); setReportReason('');
      fetchItems();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to report'); }
    finally { setReportSubmitting(false); }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('File size exceeds 5 MB limit.');
    setUploading(true);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const { data } = await lostFoundService.uploadLostFoundImage(fd);
      setFormData(prev => ({ ...prev, image_url: data.secure_url, image_public_id: data.public_id }));
      toast.success('Image uploaded!');
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const totalActive  = items.filter(i => i.status === 'ACTIVE').length;
  const totalLost    = items.filter(i => i.type === 'LOST').length;
  const totalReunited = items.filter(i => i.status === 'REUNITED').length;

  if (!user) {
    const mockPreviewItems = [
      { id: 1, type: 'LOST', title: 'Boat Airdopes 141 Case', location: 'CS Department, Lab 3', date: 'Today' },
      { id: 2, type: 'FOUND', title: 'NITJ Student ID Card', location: 'Main Canteen Area', date: 'Yesterday' },
      { id: 3, type: 'LOST', title: 'Casio Scientific Calculator fx-991EX', location: 'LT-102 Lecture Hall', date: '2 days ago' },
      { id: 4, type: 'FOUND', title: 'Hostel 7 Room Keys with Blue Lanyard', location: 'Near Sports Complex', date: '3 days ago' },
      { id: 5, type: 'LOST', title: 'Black HP Laptop Charger (65W)', location: 'Central Library, 2nd Floor', date: '4 days ago' },
      { id: 6, type: 'FOUND', title: 'Stainless Steel Water Bottle (Milton)', location: 'Mega Boy\'s Hostel Campus', date: '5 days ago' },
    ];

    return (
      <div className="myfont min-h-screen bg-cn-bg text-neutral-900 dark:text-neutral-100 relative overflow-hidden flex flex-col justify-between">
        
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-60 dark:opacity-45 blur-[3px] scale-[1.01] transition-all">
          <header className="bg-white/80 dark:bg-zinc-900/80 border-b border-neutral-200/90 dark:border-zinc-800/90 py-10 px-6 text-center">
            <h1 className="font-myfont text-5xl font-normal text-neutral-900 dark:text-neutral-100">
              Lost <em className="italic text-brand-600 dark:text-brand-400">&amp;</em> Found
            </h1>
          </header>

          <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {mockPreviewItems.map((item) => (
              <div key={item.id} className="bg-white dark:bg-zinc-900 border border-neutral-200/90 dark:border-zinc-800/90 rounded-2xl p-5 flex flex-col gap-3 shadow-2xs">
                <div className="aspect-video bg-neutral-50 dark:bg-zinc-950 rounded-xl flex items-center justify-center text-neutral-400 dark:text-neutral-600 border border-neutral-200/60 dark:border-zinc-800/60">
                  <i className="ri-image-line text-2xl opacity-40" />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wider ${item.type === 'LOST' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'}`}>
                    ● {item.type}
                  </span>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">{item.date}</span>
                </div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{item.title}</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{item.location}</p>
              </div>
            ))}
          </main>
        </div>

        {/* Soft Ambient Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-50/40 via-neutral-50/75 to-neutral-50/95 dark:from-black/40 dark:via-black/75 dark:to-black/95 pointer-events-none" />

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 my-auto">
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-neutral-200/90 dark:border-zinc-800/90 rounded-3xl p-8 sm:p-10 max-w-md w-full text-center shadow-lg dark:shadow-neutral-950/60 transition-all">
            
            {/* Minimal Headline */}
            <h2 className="font-myfont text-3xl sm:text-4xl font-normal text-neutral-900 dark:text-neutral-100 mb-3 leading-tight">
              Lost <em className="italic text-brand-600 dark:text-brand-400">&amp;</em> Found
            </h2>

            {/* Student Friendly Body */}
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-8 leading-relaxed">
              Log in or create an account with your NITJ credentials to report lost items, browse campus posts, and connect with fellow students.
            </p>

            {/* Dual Call-To-Action (CTA) */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Primary CTA: Log In */}
              <button
                onClick={() => navigate('/login')}
                className="flex-1 py-3 px-6 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-neutral-950 rounded-xl text-xs font-bold mysans cursor-pointer transition-all duration-200 shadow-xs shadow-brand-500/20 hover:shadow-sm active:scale-95 hover:-translate-y-0.5"
              >
                Log In
              </button>

              {/* Secondary CTA: Register / Sign Up */}
              <button
                onClick={() => navigate('/register')}
                className="flex-1 py-3 px-6 bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200/90 dark:border-zinc-700 hover:border-brand-500 dark:hover:border-brand-400 rounded-xl text-xs font-bold mysans cursor-pointer transition-all duration-200 active:scale-95 hover:-translate-y-0.5 shadow-2xs"
              >
                Register / Sign Up
              </button>
            </div>

          </div>
        </div>

      </div>
    );
  }

  const REPORT_REASONS = [
    'This item is not real / fake post',
    'Inappropriate or offensive content',
    'Spam or promotional post',
    'Misleading description or image',
    'Duplicate post',
    'Suspicious activity / potential scam',
  ];

  const filtered = getFilteredItems();

  return (
    <div className="myfont min-h-screen bg-cn-bg text-neutral-900 dark:text-neutral-100 transition-colors duration-300">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            fontSize: '13px',
            fontFamily: "'myfont', sans-serif",
          }
        }}
      />

      <header className="bg-white dark:bg-zinc-900/80 border-b border-neutral-200/90 dark:border-zinc-800/90 py-16 px-6 md:px-8 relative overflow-hidden">
        {/* Glow / Pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(150,150,150,0.15)_1px,transparent_0)] bg-[size:28px_28px] opacity-50 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.12em] uppercase text-brand-600 dark:text-brand-400 bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200/50 dark:border-brand-900/40 px-3 py-1.5 rounded-full mb-5">
            <i className="ri-map-pin-line" />
            CampusNode Community
          </div>
          <h1 className="font-myfont text-[clamp(48px,8vw,88px)] font-normal leading-[0.95] tracking-[-0.02em] text-neutral-900 dark:text-neutral-100 mb-5">
            Lost <em className="italic text-brand-600 dark:text-brand-400">&amp;</em> Found
          </h1>
          <p className="text-sm md:text-base font-light leading-relaxed text-neutral-600 dark:text-neutral-400 max-w-lg">
            A community space to reunite lost belongings with their owners across the CampusNode network.
          </p>
        </div>
      </header>

      <div className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 border-b border-neutral-200/90 dark:border-zinc-800/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center gap-3 flex-wrap">
          <div className="flex bg-neutral-100 dark:bg-neutral-950 border border-neutral-200/80 dark:border-zinc-800 rounded-xl p-1 gap-0.5">
            <button
              className={`px-4.5 py-1.5 text-xs font-semibold mysans rounded-lg cursor-pointer border-none bg-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-all duration-150 whitespace-nowrap ${activeTab === 'browse' ? 'bg-white dark:bg-zinc-800 text-neutral-900 dark:text-neutral-100 shadow-2xs' : ''}`}
              onClick={() => setActiveTab('browse')}
            >
              Browse All
            </button>
            <button
              className={`px-4.5 py-1.5 text-xs font-semibold mysans rounded-lg cursor-pointer border-none bg-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-all duration-150 whitespace-nowrap ${activeTab === 'my-items' ? 'bg-white dark:bg-zinc-800 text-neutral-900 dark:text-neutral-100 shadow-2xs' : ''}`}
              onClick={() => setActiveTab('my-items')}
            >
              My Posts
            </button>
          </div>

          <button className="ml-auto inline-flex items-center gap-1.5 px-4.5 py-2 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-neutral-950 text-xs font-bold mysans rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-xs shadow-brand-500/20 hover:shadow-sm whitespace-nowrap cursor-pointer" onClick={() => setShowModal(true)}>
            <i className="ri-add-line text-sm" />
            Post an Item
          </button>
        </div>
      </div>

      <div className="bg-cn-bg border-b border-neutral-200/90 dark:border-zinc-800/90">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] font-semibold tracking-wider uppercase text-neutral-400 dark:text-neutral-500 mr-1">Filter</span>

          <button
            className={`px-3.5 py-1.5 text-xs font-semibold mysans rounded-full border transition-all duration-150 cursor-pointer shadow-2xs ${
              typeFilter === 'ALL'
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-neutral-900 dark:border-neutral-100'
                : 'bg-white dark:bg-zinc-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-zinc-800 hover:border-neutral-300 dark:hover:border-zinc-700 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
            onClick={() => setTypeFilter('ALL')}
          >
            All Posts
          </button>
          <button
            className={`px-3.5 py-1.5 text-xs font-semibold mysans rounded-full border transition-all duration-150 cursor-pointer shadow-2xs ${
              typeFilter === 'LOST'
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                : 'bg-white dark:bg-zinc-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-zinc-800 hover:border-neutral-300 dark:hover:border-zinc-700 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
            onClick={() => setTypeFilter('LOST')}
          >
            Lost
          </button>
          <button
            className={`px-3.5 py-1.5 text-xs font-semibold mysans rounded-full border transition-all duration-150 cursor-pointer shadow-2xs ${
              typeFilter === 'FOUND'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-white dark:bg-zinc-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-zinc-800 hover:border-neutral-300 dark:hover:border-zinc-700 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
            onClick={() => setTypeFilter('FOUND')}
          >
            Found
          </button>

          <label
            className="ml-auto flex items-center gap-2 cursor-pointer select-none"
            onClick={() => setActiveOnly(v => !v)}
            style={{ cursor: 'pointer' }}
          >
            <div className={`w-[34px] h-5 rounded-full bg-neutral-200 dark:bg-zinc-800 relative transition-colors duration-200 shrink-0 ${activeOnly ? 'bg-brand-600 dark:bg-brand-500' : ''}`}>
              <div className={`absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 shadow-sm ${activeOnly ? 'translate-x-[14px]' : ''}`} />
            </div>
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 whitespace-nowrap">Active only</span>
          </label>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-10 pb-20">

        {/* Section label */}
        <div className="font-mono text-[11px] font-semibold tracking-[0.1em] uppercase text-cn-text-muted mb-5 flex items-center gap-3">
          {activeTab === 'browse' ? 'Community feed' : 'Your posts'}
          {!fetching && (
            <span className="font-mono text-[11px] text-cn-text-muted">
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
            </span>
          )}
          <div className="flex-grow h-px bg-cn-border" />
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {fetching ? (
            <div className="col-span-full py-20 px-6 flex flex-col items-center justify-center">
              <ShimmerText text="Loading posts…" className="text-xs font-mono" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-20 px-6 text-center">
              <div className="w-20 h-20 rounded-2xl bg-cn-surface-muted border border-cn-border flex items-center justify-center text-3xl text-cn-text-muted mx-auto mb-5">
                <i className="ri-search-2-line" />
              </div>
              <h3 className="font-myfont text-2xl font-normal text-cn-text mb-2">Nothing here yet</h3>
              <p className="text-sm text-cn-text-muted">
                {activeTab === 'browse'
                  ? 'No posts match your current filters.'
                  : "You haven't posted anything yet."}
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                activeTab={activeTab}
                user={user}
                onResolve={handleResolve}
                onClaim={handleClaim}
                onReport={handleReport}
              />
            ))
          )}
        </div>

        <div className="mt-14 p-9 bg-cn-surface border border-cn-border rounded-2xl">
          <div className="flex items-start justify-between gap-4 mb-7">
            <div className="flex flex-col">
              <div className="font-mono text-[10px] font-semibold tracking-wider uppercase text-cn-text-muted mb-1.5">
                <i className="ri-shield-check-line" style={{ marginRight: 4 }} />
                Community Standards
              </div>
              <h2 className="font-myfont text-2xl font-normal text-cn-text leading-none">Rules &amp; Guidelines</h2>
            </div>
            <Link to="/lost-found/guide" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:translate-x-1 transition-transform inline-flex items-center gap-1 shrink-0 mt-1 cursor-pointer">
              Full guide <i className="ri-arrow-right-line" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: 'ri-edit-line',
                title: 'Daily Post Limit',
                body: () => <>To prevent spam, each user may post a maximum of <strong>2 items per day</strong> across all categories.</>
              },
              {
                icon: 'ri-flag-line',
                title: 'Post Report Limits',
                body: () => <><strong>3+ reports</strong> on a post flags it as fraud (poster suspended <strong>7 days</strong>). Two false reports suspends you for <strong>2 days</strong>.</>
              },
              {
                icon: 'ri-error-warning-line',
                title: 'Strict Suspensions',
                body: () => <>Falsely claiming items results in <strong>permanent suspension</strong>. For appeals, email <strong>clubsetu@nikhim.me</strong>.</>
              },
              {
                icon: 'ri-time-line',
                title: 'Reunited Visibility',
                body: () => <>Reunited posts stay visible in the browse feed for <strong>24 hours</strong> with reduced opacity before auto-hiding.</>
              },
            ].map((rule) => (
              <div className="p-5 bg-cn-surface-muted border border-cn-border rounded-xl hover:border-cn-border-subtle hover:shadow-sm transition-all duration-150" key={rule.title}>
                <div className="w-9 h-9 border border-cn-border bg-cn-surface rounded-lg flex items-center justify-center text-base text-cn-text-secondary mb-3.5">
                  <i className={rule.icon} />
                </div>
                <h4 className="text-xs font-bold text-cn-text mb-2">{rule.title}</h4>
                <p className="text-xs leading-relaxed text-cn-text-secondary">{rule.body()}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      {showModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-cn-surface border border-cn-border rounded-2xl w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col transition-colors">
            <div className="px-6 py-4 border-b border-cn-border-subtle flex items-center justify-between shrink-0">
              <div>
                <p className="text-base sm:text-lg font-bold text-cn-text leading-tight">Post an Item</p>
                <p className="text-xs text-cn-text-muted font-normal mt-0.5">Help the community find what's been lost or claimed.</p>
              </div>
              <button className="w-8 h-8 rounded-xl flex items-center justify-center text-cn-text-secondary hover:text-cn-text hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0" onClick={() => setShowModal(false)} title="Close">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-6 text-cn-text-secondary">
              <form onSubmit={handleSubmit} className="space-y-4">

                <div>
                  <label className="block text-xs font-bold text-cn-text mb-1.5">Item type</label>
                  <div className="flex gap-2">
                    {['Lost', 'Found'].map(t => (
                      <button
                        key={t}
                        type="button"
                        className={`flex-grow p-2.5 text-center rounded-xl text-xs font-bold transition-colors cursor-pointer border ${formData.type === t ? (t === 'Lost' ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-500 border-brand-200/80 dark:border-brand-900/60' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40') : 'bg-cn-surface border border-cn-border text-cn-text-secondary hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                        onClick={() => setFormData(p => ({ ...p, type: t }))}
                      >
                        <i className={t === 'Lost' ? 'ri-question-mark' : 'ri-checkbox-circle-line'} style={{ marginRight: 6 }} />
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-cn-text mb-1.5">Title <span className="text-brand-500">*</span></label>
                  <input
                    className="w-full px-3.5 py-2.5 bg-cn-surface border border-cn-border rounded-xl text-xs sm:text-[13px] text-cn-text placeholder-cn-text-muted outline-none transition-colors focus:border-brand-500"
                    type="text" name="title"
                    value={formData.title} onChange={handleChange}
                    placeholder="e.g. Blue water bottle at Library"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-cn-text mb-1.5">Description <span className="text-brand-500">*</span></label>
                  <textarea
                    className="w-full px-3.5 py-2.5 bg-cn-surface border border-cn-border rounded-xl text-xs sm:text-[13px] text-cn-text placeholder-cn-text-muted outline-none transition-colors focus:border-brand-500 resize-none h-24"
                    name="description"
                    value={formData.description} onChange={handleChange}
                    placeholder="Where, when, and any unique identifying marks…"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-cn-text mb-1.5">
                    WhatsApp number
                    <span className="font-normal text-xs text-cn-text-muted ml-1">(optional)</span>
                  </label>
                  <input
                    className="w-full px-3.5 py-2.5 bg-cn-surface border border-cn-border rounded-xl text-xs sm:text-[13px] text-cn-text placeholder-cn-text-muted outline-none transition-colors focus:border-brand-500"
                    type="text" name="whatsapp"
                    value={formData.whatsapp} onChange={handleChange}
                    placeholder="e.g. 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-cn-text mb-1.5">
                    Photo
                    <span className="font-normal text-xs text-cn-text-muted ml-1">(max 5 MB)</span>
                  </label>
                  <input type="file" id="lf-file-input" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                  <label
                    htmlFor="lf-file-input"
                    className="w-full border border-dashed border-cn-border rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors text-cn-text-secondary text-xs hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/30"
                    style={uploading ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                  >
                    <i className={`mb-1.5 text-lg ${uploading ? 'ri-loader-4-line animate-spin text-brand-500' : 'ri-cloud-upload-line'}`} />
                    {uploading ? 'Uploading…' : formData.image_url ? 'Replace image' : 'Click to select an image'}
                  </label>
                  {formData.image_url && (
                    <div className="w-full h-[140px] flex items-center justify-center bg-cn-surface-muted border border-cn-border rounded-xl overflow-hidden mt-3 relative">
                      <img className="w-full h-full object-contain" src={formData.image_url} alt="Preview" />
                      <button
                        type="button"
                        className="absolute top-2 right-2 w-7 h-7 bg-black/65 hover:bg-black/90 text-white rounded-full flex items-center justify-center text-xs transition-colors cursor-pointer border-none"
                        onClick={() => setFormData(p => ({ ...p, image_url: '', image_public_id: '' }))}
                      >
                        <i className="ri-close-line" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-neutral-950 font-bold mysans rounded-xl text-xs cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-xs shadow-brand-500/20 hover:shadow-sm mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  disabled={loading || uploading}
                >
                  {loading
                    ? <><i className="ri-loader-4-line animate-spin" style={{ marginRight: 6 }} />Publishing…</>
                    : 'Publish Post'
                  }
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedContact?.contact_info && (
        <div className="fixed inset-0 z-[60] bg-black/50 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200" onClick={(e) => e.target === e.currentTarget && setSelectedContact(null)}>
          <div className="bg-cn-surface border border-cn-border rounded-2xl w-full max-w-sm shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col transition-colors">
            <div className="px-6 py-4 border-b border-cn-border-subtle flex items-center justify-between shrink-0">
              <div>
                <p className="text-base sm:text-lg font-bold text-cn-text leading-tight">Contact Details</p>
                <p className="text-xs text-cn-text-muted font-normal mt-0.5">Reach out to the post owner directly.</p>
              </div>
              <button className="w-8 h-8 rounded-xl flex items-center justify-center text-cn-text-secondary hover:text-cn-text hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0" onClick={() => setSelectedContact(null)} title="Close">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-6 text-cn-text-secondary">
              <div className="mb-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-cn-text-muted mb-0.5">Posted by</div>
                <div className="text-sm font-bold text-cn-text break-all">{selectedContact.contact_info.name}</div>
              </div>
              <div className="mb-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-cn-text-muted mb-0.5">Email</div>
                <div className="text-sm font-semibold text-cn-text break-all">{selectedContact.contact_info.email}</div>
              </div>

              {selectedContact.contact_info.whatsapp ? (
                <>
                  <div className="mb-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-cn-text-muted mb-0.5">Phone</div>
                    <div className="text-sm font-semibold text-cn-text font-mono break-all">+91 {selectedContact.contact_info.whatsapp}</div>
                  </div>
                  <div className="flex gap-2 mt-5">
                    <a
                      href={`https://wa.me/91${selectedContact.contact_info.whatsapp}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-grow p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-decoration-none border-none shadow-xs"
                    >
                      <i className="ri-whatsapp-line" /> Message
                    </a>
                    <a href={`tel:+91${selectedContact.contact_info.whatsapp}`} className="flex-grow p-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-decoration-none border-none text-center shadow-xs">
                      <i className="ri-phone-line" /> Call
                    </a>
                  </div>
                </>
              ) : (
                <p className="text-xs text-cn-text-muted italic mt-3">
                  No phone number provided — reach out via email.
                </p>
              )}

              <button
                className="w-full px-4 py-2.5 bg-transparent hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-cn-text border border-cn-border rounded-xl text-xs font-bold cursor-pointer transition-colors mt-5"
                onClick={() => setSelectedContact(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {reportModalItem && (
        <div className="fixed inset-0 z-[60] bg-black/50 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200" onClick={(e) => e.target === e.currentTarget && (setReportModalItem(null), setReportReason(''))}>
          <div className="bg-cn-surface border border-cn-border rounded-2xl w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col transition-colors">
            <div className="px-6 py-4 border-b border-cn-border-subtle flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg shrink-0">
                  <i className="ri-flag-line" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-bold text-cn-text leading-tight">Report Post</p>
                  <p className="text-xs text-cn-text-muted font-normal mt-0.5">The post owner will be notified with your reason.</p>
                </div>
              </div>
              <button className="w-8 h-8 rounded-xl flex items-center justify-center text-cn-text-secondary hover:text-cn-text hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0" onClick={() => { setReportModalItem(null); setReportReason(''); }} title="Close">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-6 text-cn-text-secondary">
              {REPORT_REASONS.map(reason => (
                <label key={reason} className={`flex items-center gap-2.5 p-3.5 bg-cn-surface border rounded-xl text-xs cursor-pointer transition-all mb-2 select-none ${reportReason === reason ? 'bg-rose-50/60 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-900/50' : 'border-cn-border text-cn-text-secondary hover:bg-cn-surface-muted'}`}>
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={reportReason === reason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="accent-brand-500"
                    style={{ width: 15, height: 15, flexShrink: 0 }}
                  />
                  {reason}
                </label>
              ))}

              <div className="mb-4 mt-3">
                <label className="block text-xs font-bold text-cn-text mb-1.5">Or describe your concern</label>
                <textarea
                  className="w-full px-3.5 py-2.5 bg-cn-surface border border-cn-border rounded-xl text-xs sm:text-[13px] text-cn-text placeholder-cn-text-muted outline-none transition-colors focus:border-brand-500 resize-none h-[76px]"
                  value={!REPORT_REASONS.includes(reportReason) ? reportReason : ''}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Tell us why you're reporting this post…"
                />
              </div>

              <div className="flex gap-3">
                <button
                  className="flex-grow px-4 py-2.5 bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 text-neutral-900 dark:text-neutral-100 border border-neutral-200/90 dark:border-zinc-700 rounded-xl text-xs font-bold mysans cursor-pointer transition-all duration-200 active:scale-95 shadow-2xs text-center"
                  onClick={() => { setReportModalItem(null); setReportReason(''); }}
                >
                  Cancel
                </button>
                <button
                  className={`flex-grow px-5 py-2.5 text-white rounded-xl text-xs font-bold mysans transition-all duration-200 active:scale-95 cursor-pointer text-center shadow-xs ${!reportReason.trim() || reportSubmitting ? 'bg-rose-400 dark:bg-rose-900/50 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700'}`}
                  onClick={submitReport}
                  disabled={!reportReason.trim() || reportSubmitting}
                >
                  {reportSubmitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200">
          <div className="bg-cn-surface border border-cn-border rounded-2xl w-full max-w-sm shadow-2xl relative max-h-[90vh] overflow-y-auto p-6 text-center transition-colors">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl mx-auto mb-3 ${confirmModal.isDanger ? 'bg-danger-50 dark:bg-danger-950/30 text-danger-500' : 'bg-brand-50 dark:bg-brand-950/30 text-brand-500'}`}>
              <i className={confirmModal.isDanger ? 'ri-alert-line' : 'ri-checkbox-circle-line'} />
            </div>
            <p className="text-base sm:text-lg font-bold text-cn-text mb-1.5">{confirmModal.title}</p>
            <p className="text-xs text-cn-text-muted mb-6 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2.5 bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 text-neutral-900 dark:text-neutral-100 border border-neutral-200/90 dark:border-zinc-700 rounded-xl text-xs font-bold mysans cursor-pointer transition-all duration-200 active:scale-95 shadow-2xs text-center"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              >
                {confirmModal.cancelText}
              </button>
              <button
                className={`flex-1 px-5 py-2.5 rounded-xl text-xs font-bold mysans cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-95 text-center shadow-xs ${confirmModal.isDanger ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 text-white dark:text-neutral-950'}`}
                onClick={confirmModal.onConfirm}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ItemCard = ({ item, activeTab, user, onResolve, onClaim, onReport }) => {
  const isReunited = item.status === 'REUNITED';
  const isLost     = item.type === 'LOST';

  return (
    <article className={`bg-white dark:bg-zinc-900 border border-neutral-200/90 dark:border-zinc-800/90 rounded-2xl overflow-hidden flex flex-col shadow-2xs hover:shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 dark:hover:border-zinc-700 cursor-default ${isReunited ? 'opacity-80 hover:opacity-100' : ''}`}>
      {/* Image */}
      <div className="aspect-video bg-cn-surface-muted relative overflow-hidden">
        {item.imageUrl
          ? <img className="w-full h-full object-contain transition-transform duration-500 hover:scale-105" src={item.imageUrl} alt={item.title} loading="lazy" />
          : (
            <div className="w-full h-full flex items-center justify-center text-cn-border text-4xl">
              <i className="ri-image-line" />
            </div>
          )
        }

        {/* Type badge */}
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full font-mono text-[10px] font-medium tracking-[0.08em] uppercase backdrop-blur-md ${isLost ? 'bg-warning-50/95 dark:bg-warning-950/90 text-warning-800 dark:text-warning-300 border border-warning-200 dark:border-warning-900' : 'bg-success-50/95 dark:bg-success-950/90 text-success-800 dark:text-success-300 border border-success-200 dark:border-success-900'}`}>
          {isLost ? '● Lost' : '● Found'}
        </span>

        {/* Reunited overlay */}
        {isReunited && (
          <div className="absolute inset-0 bg-white/35 dark:bg-black/35 backdrop-blur-[3px] flex flex-col items-center justify-center gap-2 z-10">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-cn-surface text-success-700 dark:text-success-300 border border-success-200 dark:border-success-900 rounded-full text-xs font-bold shadow-md shadow-black/5">
              <i className="ri-check-double-line" />
              Reunited
            </span>
            
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-sm font-bold text-cn-text line-clamp-1 mb-1.5">{item.title}</h3>
        <p className="text-xs font-light leading-relaxed text-cn-text-secondary line-clamp-2 mb-4 flex-grow">{item.description}</p>

        {/* Metadata */}
        <div className="flex items-center gap-1 text-xs text-cn-text-muted flex-wrap mb-3.5">
          <i className="ri-calendar-line" />
          <span>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          <span className="text-cn-border text-sm">·</span>
          <i className="ri-user-line" />
          <span>{activeTab === 'browse' ? (item.user?.name || 'Anonymous') : 'You'}</span>

          {activeTab === 'my-items' && item.reportedBy?.length > 0 && (
            <>
              <span className="text-cn-border text-sm">·</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-50 dark:bg-warning-950/60 text-warning-800 dark:text-warning-300 border border-warning-200 dark:border-warning-900 text-[11px] font-semibold">
                <i className="ri-flag-line" />
                {item.reportedBy.length} {item.reportedBy.length === 1 ? 'report' : 'reports'}
              </span>
            </>
          )}
        </div>

        <div className="flex gap-2">
          {activeTab === 'my-items' && item.status === 'ACTIVE' && (
            <button className="flex-grow px-3 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold mysans text-center rounded-lg hover:opacity-90 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-xs cursor-pointer" onClick={() => onResolve(item.id)}>
              <i className="ri-check-line" style={{ marginRight: 5 }} />
              Mark Reunited
            </button>
          )}

          {activeTab === 'browse' && user && item.userId !== user.id && item.status === 'ACTIVE' && (
            <>
              <button className="flex-grow px-3 py-2 bg-brand-50/70 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200/80 dark:border-brand-900/60 text-xs font-bold mysans text-center rounded-lg hover:bg-brand-100/80 dark:hover:bg-brand-900/50 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap" onClick={() => onClaim(item)}>
                {isLost ? 'I found this' : "It's mine"}
              </button>
              <button className="p-2 bg-white dark:bg-zinc-900 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-zinc-800 rounded-lg text-sm flex items-center justify-center hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-2xs cursor-pointer" onClick={() => onReport(item.id)} title="Report post">
                <i className="ri-flag-line" />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
};

export default LostAndFound;