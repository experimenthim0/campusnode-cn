import React, { useState, useEffect, useRef } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import * as lostFoundService from '../services/lostFoundService';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import ShimmerText from '../components/ShimmerText';


const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

  :root {
    --accent:       #E8500A;
    --accent-light: #FFF0E8;
    --accent-dark:  #C23F06;
    --surface:      #FAFAF9;
    --surface-card: #FFFFFF;
    --border:       #E5E4E0;
    --text-primary: #1A1917;
    --text-secondary: #6B6963;
    --text-muted:   #A8A49D;
    --lost-bg:      #FFFBEB;
    --lost-text:    #92400E;
    --lost-border:  #FDE68A;
    --found-bg:     #ECFDF5;
    --found-text:   #065F46;
    --found-border: #A7F3D0;
    --reunited-bg:  #F8FAFC;
    --reunited-text:#475569;
    --shadow-card:  0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
    --shadow-hover: 0 4px 12px rgba(0,0,0,0.10), 0 16px 40px rgba(0,0,0,0.07);
    --radius-card:  16px;
    --radius-pill:  999px;
  }

  .dark {
    --surface:      #0D0D0C;
    --surface-card: #161614;
    --border:       #2A2A27;
    --text-primary: #F5F4F0;
    --text-secondary:#9E9990;
    --text-muted:   #5C5A55;
    --lost-bg:      #2A1A08;
    --lost-text:    #FCD34D;
    --lost-border:  rgba(232,80,10,0.2);
    --found-bg:     #052E1A;
    --found-text:   #6EE7B7;
    --found-border: rgba(10,185,129,0.2);
    --shadow-card:  0 1px 3px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.25);
    --shadow-hover: 0 4px 12px rgba(0,0,0,0.4), 0 16px 40px rgba(0,0,0,0.35);
  }
  .lf-modal::-webkit-scrollbar { width: 6px; }
  .lf-modal::-webkit-scrollbar-track { background: transparent; }
  .lf-modal::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
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
      <div className="myfont min-h-screen bg-[#FAFAF9] dark:bg-[#0D0D0C] text-[#1A1917] dark:text-[#F5F4F0] relative overflow-hidden flex flex-col justify-between">
        
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-60 dark:opacity-45 blur-[3px] scale-[1.01] transition-all">
          <header className="bg-white/80 dark:bg-[#161614]/80 border-b border-[#E5E4E0] dark:border-[#2A2A27] py-10 px-6 text-center">
            <h1 className="font-myfont text-5xl font-normal text-[#1A1917] dark:text-[#F5F4F0]">
              Lost <em className="italic text-[#E8500A]">&amp;</em> Found
            </h1>
          </header>

          <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {mockPreviewItems.map((item) => (
              <div key={item.id} className="bg-white dark:bg-[#161614] border border-[#E5E4E0] dark:border-[#2A2A27] rounded-2xl p-5 flex flex-col gap-3 shadow-md">
                <div className="aspect-video bg-[#FAFAF9] dark:bg-[#0D0D0C] rounded-xl flex items-center justify-center text-[#A8A49D] border border-[#E5E4E0]/60 dark:border-[#2A2A27]/60">
                  <i className="ri-image-line text-2xl opacity-40" />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wider ${item.type === 'LOST' ? 'bg-[#FFFBEB] dark:bg-[#2A1A08] text-[#92400E] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#78350F]' : 'bg-[#ECFDF5] dark:bg-[#052E1A] text-[#065F46] dark:text-[#6EE7B7] border border-[#A7F3D0] dark:border-[#065F46]'}`}>
                    ● {item.type}
                  </span>
                  <span className="text-xs text-[#A8A49D] dark:text-[#5C5A55] font-mono">{item.date}</span>
                </div>
                <h3 className="font-bold text-sm text-[#1A1917] dark:text-[#F5F4F0]">{item.title}</h3>
                <p className="text-xs text-[#6B6963] dark:text-[#9E9990]">{item.location}</p>
              </div>
            ))}
          </main>
        </div>

        {/* Soft Ambient Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAFAF9]/40 via-[#FAFAF9]/75 to-[#FAFAF9]/95 dark:from-[#0D0D0C]/40 dark:via-[#0D0D0C]/75 dark:to-[#0D0D0C]/95 pointer-events-none" />

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 my-auto">
          <div className="bg-white/85 dark:bg-[#161614]/85 backdrop-blur-md border border-[#E5E4E0] dark:border-[#2A2A27] rounded-3xl p-8 sm:p-10 max-w-md w-full text-center shadow-[0_12px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] transition-all">
            
            {/* Minimal Headline */}
            <h2 className="font-myfont text-3xl sm:text-4xl font-normal text-[#1A1917] dark:text-[#F5F4F0] mb-3 leading-tight">
              Lost <em className="italic text-[#E8500A]">&amp;</em> Found
            </h2>

            {/* Student Friendly Body */}
            <p className="text-sm text-[#6B6963] dark:text-[#9E9990] mb-8 leading-relaxed">
              Log in or create an account with your NITJ credentials to report lost items, browse campus posts, and connect with fellow students.
            </p>

            {/* Dual Call-To-Action (CTA) */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Primary CTA: Log In */}
              <button
                onClick={() => navigate('/login')}
                className="flex-1 py-3 px-6 bg-[#E8500A] text-white hover:bg-[#C23F06] rounded-xl text-sm font-bold cursor-pointer transition-all shadow-[0_2px_10px_rgba(232,80,10,0.25)] hover:shadow-[0_4px_18px_rgba(232,80,10,0.35)] active:translate-y-0 hover:-translate-y-0.5 font-myfont"
              >
                Log In
              </button>

              {/* Secondary CTA: Register / Sign Up */}
              <button
                onClick={() => navigate('/register')}
                className="flex-1 py-3 px-6 bg-[#FAFAF9] dark:bg-[#0D0D0C] text-[#1A1917] dark:text-[#F5F4F0] border border-[#E5E4E0] dark:border-[#2A2A27] hover:border-[#E8500A] dark:hover:border-[#E8500A] hover:bg-white dark:hover:bg-[#161614] rounded-xl text-sm font-bold cursor-pointer transition-all active:translate-y-0 hover:-translate-y-0.5 font-myfont"
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
    <div className="myfont min-h-screen bg-[#FAFAF9] dark:bg-[#0D0D0C] text-[#1A1917] dark:text-[#F5F4F0] transition-colors duration-300">
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

      <header className="bg-white dark:bg-[#161614] border-b border-[#E5E4E0] dark:border-[#2A2A27] py-16 px-6 md:px-8 relative overflow-hidden">
        {/* Glow / Pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] bg-[size:28px_28px] opacity-50 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.12em] uppercase text-[#E8500A] bg-[#FFF0E8] dark:bg-[#E8500A]/12 px-3 py-1.5 rounded-full mb-5">
            <i className="ri-map-pin-line" />
            CampusNode Community
          </div>
          <h1 className="font-myfont text-[clamp(48px,8vw,88px)] font-normal leading-[0.95] tracking-[-0.02em] text-[#1A1917] dark:text-[#F5F4F0] mb-5">
            Lost <em className="italic text-[#E8500A]">&amp;</em> Found
          </h1>
          <p className="text-sm md:text-base font-light leading-relaxed text-[#6B6963] dark:text-[#9E9990] max-w-lg">
            A community space to reunite lost belongings with their owners across the CampusNode network.
          </p>
        </div>
      </header>

      <div className="sticky top-0 z-40 bg-white dark:bg-[#161614] border-b border-[#E5E4E0] dark:border-[#2A2A27] backdrop-blur-md bg-opacity-95 dark:bg-opacity-95">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center gap-3 flex-wrap">
          <div className="flex bg-[#FAFAF9] dark:bg-[#0D0D0C] border border-[#E5E4E0] dark:border-[#2A2A27] rounded-xl p-1 gap-0.5">
            <button
              className={`px-4.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer border-none bg-transparent text-[#6B6963] dark:text-[#9E9990] hover:text-[#1A1917] dark:hover:text-[#F5F4F0] transition-all duration-150 whitespace-nowrap ${activeTab === 'browse' ? 'bg-white dark:bg-[#252522] text-[#1A1917] dark:text-[#F5F4F0] shadow-sm' : ''}`}
              onClick={() => setActiveTab('browse')}
            >
              Browse All
            </button>
            <button
              className={`px-4.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer border-none bg-transparent text-[#6B6963] dark:text-[#9E9990] hover:text-[#1A1917] dark:hover:text-[#F5F4F0] transition-all duration-150 whitespace-nowrap ${activeTab === 'my-items' ? 'bg-white dark:bg-[#252522] text-[#1A1917] dark:text-[#F5F4F0] shadow-sm' : ''}`}
              onClick={() => setActiveTab('my-items')}
            >
              My Posts
            </button>
          </div>

          <button className="ml-auto inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#E8500A] text-white text-xs font-semibold rounded-full hover:bg-[#C23F06] transition-all hover:-translate-y-0.5 shadow-[0_2px_8px_rgba(232,80,10,0.25)] hover:shadow-[0_4px_16px_rgba(232,80,10,0.35)] active:translate-y-0 whitespace-nowrap cursor-pointer" onClick={() => setShowModal(true)}>
            <i className="ri-add-line" />
            Post an Item
          </button>
        </div>
      </div>

      <div className="bg-[#FAFAF9] dark:bg-[#0D0D0C] border-b border-[#E5E4E0] dark:border-[#2A2A27]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] font-semibold tracking-wider uppercase text-[#A8A49D] dark:text-[#5C5A55] mr-1">Filter</span>

          <button
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all duration-150 cursor-pointer ${
              typeFilter === 'ALL'
                ? 'bg-[#1A1917] dark:bg-[#F5F4F0] text-white dark:text-[#161614] border-[#1A1917] dark:border-[#F5F4F0]'
                : 'bg-white dark:bg-[#161614] text-[#6B6963] dark:text-[#9E9990] border-[#E5E4E0] dark:border-[#2A2A27] hover:border-[#A8A49D] dark:hover:border-[#5C5A55] hover:text-[#1A1917] dark:hover:text-[#F5F4F0]'
            }`}
            onClick={() => setTypeFilter('ALL')}
          >
            All Posts
          </button>
          <button
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all duration-150 cursor-pointer ${
              typeFilter === 'LOST'
                ? 'bg-[#FFFBEB] dark:bg-[#2A1A08]/60 text-[#92400E] dark:text-[#FCD34D] border-[#FDE68A] dark:border-[#78350F]'
                : 'bg-white dark:bg-[#161614] text-[#6B6963] dark:text-[#9E9990] border-[#E5E4E0] dark:border-[#2A2A27] hover:border-[#A8A49D] dark:hover:border-[#5C5A55] hover:text-[#1A1917] dark:hover:text-[#F5F4F0]'
            }`}
            onClick={() => setTypeFilter('LOST')}
          >
            Lost
          </button>
          <button
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all duration-150 cursor-pointer ${
              typeFilter === 'FOUND'
                ? 'bg-[#ECFDF5] dark:bg-[#052E1A]/60 text-[#065F46] dark:text-[#6EE7B7] border-[#A7F3D0] dark:border-[#065F46]'
                : 'bg-white dark:bg-[#161614] text-[#6B6963] dark:text-[#9E9990] border-[#E5E4E0] dark:border-[#2A2A27] hover:border-[#A8A49D] dark:hover:border-[#5C5A55] hover:text-[#1A1917] dark:hover:text-[#F5F4F0]'
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
            <div className={`w-[34px] h-5 rounded-full bg-[#E5E4E0] dark:bg-[#2A2A27] relative transition-colors duration-200 shrink-0 ${activeOnly ? 'bg-[#E8500A]' : ''}`}>
              <div className={`absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 shadow-sm ${activeOnly ? 'translate-x-[14px]' : ''}`} />
            </div>
            <span className="text-xs font-semibold text-[#6B6963] dark:text-[#9E9990] whitespace-nowrap">Active only</span>
          </label>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-10 pb-20">

        {/* Section label */}
        <div className="font-mono text-[11px] font-semibold tracking-[0.1em] uppercase text-[#A8A49D] dark:text-[#5C5A55] mb-5 flex items-center gap-3">
          {activeTab === 'browse' ? 'Community feed' : 'Your posts'}
          {!fetching && (
            <span className="font-mono text-[11px] text-[#A8A49D] dark:text-[#5C5A55]">
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
            </span>
          )}
          <div className="flex-grow h-px bg-[#E5E4E0] dark:bg-[#2A2A27]" />
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {fetching ? (
            <div className="col-span-full py-20 px-6 flex flex-col items-center justify-center">
              <ShimmerText text="Loading posts…" className="text-xs font-mono" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-20 px-6 text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#FAFAF9] dark:bg-[#0D0D0C] border border-[#E5E4E0] dark:border-[#2A2A27] flex items-center justify-center text-3xl text-[#A8A49D] dark:text-[#5C5A55] mx-auto mb-5">
                <i className="ri-search-2-line" />
              </div>
              <h3 className="font-myfont text-2xl font-normal text-[#1A1917] dark:text-[#F5F4F0] mb-2">Nothing here yet</h3>
              <p className="text-sm text-[#A8A49D] dark:text-[#5C5A55]">
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

        <div className="mt-14 p-9 bg-white dark:bg-[#161614] border border-[#E5E4E0] dark:border-[#2A2A27] rounded-2xl">
          <div className="flex items-start justify-between gap-4 mb-7">
            <div className="flex flex-col">
              <div className="font-mono text-[10px] font-semibold tracking-wider uppercase text-[#A8A49D] dark:text-[#5C5A55] mb-1.5">
                <i className="ri-shield-check-line" style={{ marginRight: 4 }} />
                Community Standards
              </div>
              <h2 className="font-myfont text-2xl font-normal text-[#1A1917] dark:text-[#F5F4F0] leading-none">Rules &amp; Guidelines</h2>
            </div>
            <Link to="/lost-found/guide" className="text-xs font-semibold text-[#E8500A] hover:translate-x-1 transition-transform inline-flex items-center gap-1 shrink-0 mt-1 cursor-pointer">
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
              <div className="p-5 bg-[#FAFAF9] dark:bg-[#0D0D0C] border border-[#E5E4E0] dark:border-[#2A2A27] rounded-xl hover:border-[#A8A49D] dark:hover:border-[#5C5A55] hover:shadow-sm transition-all duration-150" key={rule.title}>
                <div className="w-9 h-9 border border-[#E5E4E0] dark:border-[#2A2A27] bg-white dark:bg-[#161614] rounded-lg flex items-center justify-center text-base text-[#6B6963] dark:text-[#9E9990] mb-3.5">
                  <i className={rule.icon} />
                </div>
                <h4 className="text-xs font-bold text-[#1A1917] dark:text-[#F5F4F0] mb-2">{rule.title}</h4>
                <p className="text-xs leading-relaxed text-[#6B6963] dark:text-[#9E9990]">{rule.body()}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      {showModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-200" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] rounded-2xl w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col transition-colors">
            <div className="px-6 py-4 border-b border-[#F0F0F0] dark:border-[#2A2A2A] flex items-center justify-between shrink-0">
              <div>
                <p className="text-base sm:text-lg font-bold text-[#111111] dark:text-[#F5F5F5] leading-tight">Post an Item</p>
                <p className="text-xs text-[#888888] dark:text-[#808080] font-normal mt-0.5">Help the community find what's been lost or claimed.</p>
              </div>
              <button className="w-8 h-8 rounded-xl flex items-center justify-center text-[#555555] dark:text-[#B5B5B5] hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] transition-colors cursor-pointer shrink-0" onClick={() => setShowModal(false)} title="Close">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-6 text-[#555555] dark:text-[#B5B5B5]">
              <form onSubmit={handleSubmit} className="space-y-4">

                <div>
                  <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">Item type</label>
                  <div className="flex gap-2">
                    {['Lost', 'Found'].map(t => (
                      <button
                        key={t}
                        type="button"
                        className={`flex-grow p-2.5 text-center rounded-xl text-xs font-bold transition-colors cursor-pointer border ${formData.type === t ? (t === 'Lost' ? 'bg-[#FFF7ED] dark:bg-[#2A1A0F] text-[#F97316] dark:text-[#FB923C] border-orange-200/80 dark:border-orange-900/60' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40') : 'bg-white dark:bg-[#222222] border-[#E5E5E5] dark:border-[#303030] text-[#555555] dark:text-[#B5B5B5] hover:bg-[#F5F5F5] dark:hover:bg-[#2A2A2A]'}`}
                        onClick={() => setFormData(p => ({ ...p, type: t }))}
                      >
                        <i className={t === 'Lost' ? 'ri-question-mark' : 'ri-checkbox-circle-line'} style={{ marginRight: 6 }} />
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">Title <span className="text-[#F97316]">*</span></label>
                  <input
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl text-xs sm:text-[13px] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] outline-none transition-colors focus:border-[#F97316] dark:focus:border-[#FB923C]"
                    type="text" name="title"
                    value={formData.title} onChange={handleChange}
                    placeholder="e.g. Blue water bottle at Library"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">Description <span className="text-[#F97316]">*</span></label>
                  <textarea
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl text-xs sm:text-[13px] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] outline-none transition-colors focus:border-[#F97316] dark:focus:border-[#FB923C] resize-none h-24"
                    name="description"
                    value={formData.description} onChange={handleChange}
                    placeholder="Where, when, and any unique identifying marks…"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">
                    WhatsApp number
                    <span className="font-normal text-xs text-[#888888] dark:text-[#808080] ml-1">(optional)</span>
                  </label>
                  <input
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl text-xs sm:text-[13px] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] outline-none transition-colors focus:border-[#F97316] dark:focus:border-[#FB923C]"
                    type="text" name="whatsapp"
                    value={formData.whatsapp} onChange={handleChange}
                    placeholder="e.g. 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">
                    Photo
                    <span className="font-normal text-xs text-[#888888] dark:text-[#808080] ml-1">(max 5 MB)</span>
                  </label>
                  <input type="file" id="lf-file-input" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                  <label
                    htmlFor="lf-file-input"
                    className="w-full border border-dashed border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors text-[#555555] dark:text-[#B5B5B5] text-xs hover:border-[#F97316] dark:hover:border-[#FB923C] hover:bg-[#FFF7ED] dark:hover:bg-[#2A1A0F]"
                    style={uploading ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                  >
                    <i className={`mb-1.5 text-lg ${uploading ? 'ri-loader-4-line animate-spin text-[#F97316]' : 'ri-cloud-upload-line'}`} />
                    {uploading ? 'Uploading…' : formData.image_url ? 'Replace image' : 'Click to select an image'}
                  </label>
                  {formData.image_url && (
                    <div className="w-full h-[140px] flex items-center justify-center bg-[#FAFAFA] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#303030] rounded-xl overflow-hidden mt-3 relative">
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
                  className="w-full py-2.5 bg-[#F97316] hover:bg-[#EA580C] dark:bg-[#FB923C] dark:hover:bg-[#F97316] dark:text-[#111111] text-white font-bold rounded-xl text-xs cursor-pointer transition-colors shadow-xs mt-2 disabled:opacity-50"
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
          <div className="bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] rounded-2xl w-full max-w-sm shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col transition-colors">
            <div className="px-6 py-4 border-b border-[#F0F0F0] dark:border-[#2A2A2A] flex items-center justify-between shrink-0">
              <div>
                <p className="text-base sm:text-lg font-bold text-[#111111] dark:text-[#F5F5F5] leading-tight">Contact Details</p>
                <p className="text-xs text-[#888888] dark:text-[#808080] font-normal mt-0.5">Reach out to the post owner directly.</p>
              </div>
              <button className="w-8 h-8 rounded-xl flex items-center justify-center text-[#555555] dark:text-[#B5B5B5] hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] transition-colors cursor-pointer shrink-0" onClick={() => setSelectedContact(null)} title="Close">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-6 text-[#555555] dark:text-[#B5B5B5]">
              <div className="mb-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#888888] dark:text-[#808080] mb-0.5">Posted by</div>
                <div className="text-sm font-bold text-[#111111] dark:text-[#F5F5F5] break-all">{selectedContact.contact_info.name}</div>
              </div>
              <div className="mb-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#888888] dark:text-[#808080] mb-0.5">Email</div>
                <div className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F5] break-all">{selectedContact.contact_info.email}</div>
              </div>

              {selectedContact.contact_info.whatsapp ? (
                <>
                  <div className="mb-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#888888] dark:text-[#808080] mb-0.5">Phone</div>
                    <div className="text-sm font-semibold text-[#111111] dark:text-[#F5F5F5] font-mono break-all">+91 {selectedContact.contact_info.whatsapp}</div>
                  </div>
                  <div className="flex gap-2 mt-5">
                    <a
                      href={`https://wa.me/91${selectedContact.contact_info.whatsapp}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-grow p-2.5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-decoration-none border-none shadow-xs"
                    >
                      <i className="ri-whatsapp-line" /> Message
                    </a>
                    <a href={`tel:+91${selectedContact.contact_info.whatsapp}`} className="flex-grow p-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-decoration-none border-none text-center shadow-xs">
                      <i className="ri-phone-line" /> Call
                    </a>
                  </div>
                </>
              ) : (
                <p className="text-xs text-[#888888] dark:text-[#808080] italic mt-3">
                  No phone number provided — reach out via email.
                </p>
              )}

              <button
                className="w-full px-4 py-2.5 bg-transparent hover:bg-[#F5F5F5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] text-[#111111] dark:text-[#F5F5F5] border border-[#E5E5E5] dark:border-[#303030] rounded-xl text-xs font-bold cursor-pointer transition-colors mt-5"
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
          <div className="bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] rounded-2xl w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col transition-colors">
            <div className="px-6 py-4 border-b border-[#F0F0F0] dark:border-[#2A2A2A] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg shrink-0">
                  <i className="ri-flag-line" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-bold text-[#111111] dark:text-[#F5F5F5] leading-tight">Report Post</p>
                  <p className="text-xs text-[#888888] dark:text-[#808080] font-normal mt-0.5">The post owner will be notified with your reason.</p>
                </div>
              </div>
              <button className="w-8 h-8 rounded-xl flex items-center justify-center text-[#555555] dark:text-[#B5B5B5] hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] transition-colors cursor-pointer shrink-0" onClick={() => { setReportModalItem(null); setReportReason(''); }} title="Close">
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-6 text-[#555555] dark:text-[#B5B5B5]">
              {REPORT_REASONS.map(reason => (
                <label key={reason} className={`flex items-center gap-2.5 p-3.5 bg-white dark:bg-[#222222] border rounded-xl text-xs cursor-pointer transition-all mb-2 select-none ${reportReason === reason ? 'bg-rose-50/60 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-900/50' : 'border-[#E5E5E5] dark:border-[#303030] text-[#555555] dark:text-[#B5B5B5] hover:bg-[#FAFAFA] dark:hover:bg-[#252525]'}`}>
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={reportReason === reason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="accent-[#F97316]"
                    style={{ width: 15, height: 15, flexShrink: 0 }}
                  />
                  {reason}
                </label>
              ))}

              <div className="mb-4 mt-3">
                <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">Or describe your concern</label>
                <textarea
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl text-xs sm:text-[13px] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] outline-none transition-colors focus:border-[#F97316] dark:focus:border-[#FB923C] resize-none h-[76px]"
                  value={!REPORT_REASONS.includes(reportReason) ? reportReason : ''}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Tell us why you're reporting this post…"
                />
              </div>

              <div className="flex gap-3">
                <button
                  className="flex-grow px-4 py-2.5 bg-transparent hover:bg-[#F5F5F5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] text-[#111111] dark:text-[#F5F5F5] border border-[#E5E5E5] dark:border-[#303030] rounded-xl text-xs font-bold cursor-pointer transition-colors text-center"
                  onClick={() => { setReportModalItem(null); setReportReason(''); }}
                >
                  Cancel
                </button>
                <button
                  className={`flex-grow px-5 py-2.5 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer text-center shadow-xs ${!reportReason.trim() || reportSubmitting ? 'bg-rose-400 dark:bg-rose-900/50 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700'}`}
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
          <div className="bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] rounded-2xl w-full max-w-sm shadow-2xl relative max-h-[90vh] overflow-y-auto p-6 text-center transition-colors">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl mx-auto mb-3" style={{
              background: confirmModal.isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(249, 115, 22, 0.1)',
              color: confirmModal.isDanger ? '#EF4444' : '#F97316',
            }}>
              <i className={confirmModal.isDanger ? 'ri-alert-line' : 'ri-checkbox-circle-line'} />
            </div>
            <p className="text-base sm:text-lg font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">{confirmModal.title}</p>
            <p className="text-xs text-[#888888] dark:text-[#808080] mb-6 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2.5 bg-transparent hover:bg-[#F5F5F5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] text-[#111111] dark:text-[#F5F5F5] border border-[#E5E5E5] dark:border-[#303030] rounded-xl text-xs font-bold cursor-pointer transition-colors text-center"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              >
                {confirmModal.cancelText}
              </button>
              <button
                className={`flex-1 px-5 py-2.5 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors text-center shadow-xs ${confirmModal.isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#F97316] hover:bg-[#EA580C] dark:bg-[#FB923C] dark:hover:bg-[#F97316] dark:text-[#111111]'}`}
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
    <article className={`bg-white dark:bg-[#161614] border border-[#E5E4E0] dark:border-[#2A2A27] rounded-2xl overflow-hidden flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.06),_0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),_0_4px_16px_rgba(0,0,0,0.25)] transition-all duration-200 hover:-translate-y-1 hover:border-[#A8A49D] dark:hover:border-[#5C5A55] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),_0_16px_40px_rgba(0,0,0,0.07)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.4),_0_16px_40px_rgba(0,0,0,0.35)] cursor-default ${isReunited ? 'opacity-80 hover:opacity-100' : ''}`}>
      {/* Image */}
      <div className="aspect-video bg-[#FAFAF9] dark:bg-[#0D0D0C] relative overflow-hidden">
        {item.imageUrl
          ? <img className="w-full h-full object-contain transition-transform duration-500 hover:scale-105" src={item.imageUrl} alt={item.title} loading="lazy" />
          : (
            <div className="w-full h-full flex items-center justify-center text-[#E5E4E0] dark:text-[#2A2A27] text-4xl">
              <i className="ri-image-line" />
            </div>
          )
        }

        {/* Type badge */}
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full font-mono text-[10px] font-medium tracking-[0.08em] uppercase backdrop-blur-md ${isLost ? 'bg-[#FFFBEB]/95 dark:bg-[#2A1A08]/92 text-[#92400E] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#78350F]' : 'bg-[#ECFDF5]/95 dark:bg-[#052E1A]/92 text-[#065F46] dark:text-[#6EE7B7] border border-[#A7F3D0] dark:border-[#065F46]'}`}>
          {isLost ? '● Lost' : '● Found'}
        </span>

        {/* Reunited overlay */}
        {isReunited && (
          <div className="absolute inset-0 bg-white/35 dark:bg-black/35 backdrop-blur-[3px] flex flex-col items-center justify-center gap-2 z-10">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-[#0F1F18] text-[#065F46] dark:text-[#6EE7B7] border border-[#A7F3D0] dark:border-[#065F46] rounded-full text-xs font-bold shadow-md shadow-black/5">
              <i className="ri-check-double-line" />
              Reunited
            </span>
            
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-sm font-bold text-[#1A1917] dark:text-[#F5F4F0] line-clamp-1 mb-1.5">{item.title}</h3>
        <p className="text-xs font-light leading-relaxed text-[#6B6963] dark:text-[#9E9990] line-clamp-2 mb-4 flex-grow">{item.description}</p>

        {/* Metadata */}
        <div className="flex items-center gap-1 text-xs text-[#A8A49D] dark:text-[#5C5A55] flex-wrap mb-3.5">
          <i className="ri-calendar-line" />
          <span>{new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          <span className="text-[#E5E4E0] dark:text-[#2A2A27] text-sm">·</span>
          <i className="ri-user-line" />
          <span>{activeTab === 'browse' ? (item.user?.name || 'Anonymous') : 'You'}</span>

          {activeTab === 'my-items' && item.reportedBy?.length > 0 && (
            <>
              <span className="text-[#E5E4E0] dark:text-[#2A2A27] text-sm">·</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFFBEB] dark:bg-[#2A1A08]/60 text-[#92400E] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#78350F] text-[11px] font-semibold">
                <i className="ri-flag-line" />
                {item.reportedBy.length} {item.reportedBy.length === 1 ? 'report' : 'reports'}
              </span>
            </>
          )}
        </div>

        <div className="flex gap-2">
          {activeTab === 'my-items' && item.status === 'ACTIVE' && (
            <button className="flex-grow px-3 py-2 bg-[#1A1917] dark:bg-[#F5F4F0] text-white dark:text-[#161614] text-xs font-bold text-center rounded-lg hover:opacity-85 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer" onClick={() => onResolve(item.id)}>
              <i className="ri-check-line" style={{ marginRight: 5 }} />
              Mark Reunited
            </button>
          )}

          {activeTab === 'browse' && user && item.userId !== user.id && item.status === 'ACTIVE' && (
            <>
              <button className="flex-grow px-3 py-2 bg-transparent text-[#E8500A] border border-[#E8500A] text-xs font-bold text-center rounded-lg hover:bg-[#FFF0E8] dark:hover:bg-[#E8500A]/12 transition-all cursor-pointer whitespace-nowrap" onClick={() => onClaim(item)}>
                {isLost ? 'I found this' : "It's mine"}
              </button>
              <button className="p-2 bg-[#FAFAF9] dark:bg-[#0D0D0C] text-[#6B6963] dark:text-[#9E9990] border border-[#E5E4E0] dark:border-[#2A2A27] rounded-lg text-sm flex items-center justify-center hover:border-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer" onClick={() => onReport(item.id)} title="Report post">
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