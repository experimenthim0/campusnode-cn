import React, { useState, useRef, useEffect, useCallback } from 'react';
import { markdownToHtml, htmlToMarkdown } from '../utils/htmlMarkdownConverter';
import './WysiwygMarkdownEditor.css';

const WysiwygMarkdownEditor = ({
  value = '',
  onChange,
  placeholder = 'Start typing your event description here...\nFormat using the visual toolbar above or select text to see the floating formatting popup.',
  minHeight = '360px',
  className = '',
  showToolbar = true,
  showStats = false,
}) => {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const isInternalChangeRef = useRef(false);

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    blockType: 'p', // 'p' | 'h1' | 'h2' | 'h3' | 'blockquote'
    unorderedList: false,
    orderedList: false,
    isLink: false,
  });

  // Floating selection bubble popup state
  const [bubbleToolbar, setBubbleToolbar] = useState({
    visible: false,
    top: 0,
    left: 0,
  });

  const [linkPopover, setLinkPopover] = useState({
    isOpen: false,
    top: 0,
    left: 0,
    hasSelectedText: false,
    isExistingLink: false,
  });
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState('');
  const linkPopoverRef = useRef(null);
  const linkUrlInputRef = useRef(null);
  const savedSelectionRange = useRef(null);

  const [imagePopover, setImagePopover] = useState({
    isOpen: false,
    isExistingImage: false,
    top: 0,
    left: 0,
  });
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [imageWidth, setImageWidth] = useState('100%');
  const [imageHeight, setImageHeight] = useState('');
  const [imageAlign, setImageAlign] = useState('center'); // 'left' | 'center' | 'right'
  const [sizePreset, setSizePreset] = useState('100%'); // '25%' | '50%' | '75%' | '100%' | 'custom'
  const [imageError, setImageError] = useState('');
  const imagePopoverRef = useRef(null);
  const imageUrlInputRef = useRef(null);
  const savedImageRange = useRef(null);
  const selectedImgRef = useRef(null);

  // Heading dropdown
  const [isHeadingMenuOpen, setIsHeadingMenuOpen] = useState(false);
  const headingMenuRef = useRef(null);

  // Stats
  const [stats, setStats] = useState({ words: 0, characters: 0, readTime: 1 });

  // Initialize and synchronize HTML when external markdown value changes
  useEffect(() => {
    if (!editorRef.current) return;
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }

    const currentEditorMarkdown = htmlToMarkdown(editorRef.current);
    if (value !== currentEditorMarkdown) {
      const html = markdownToHtml(value);
      editorRef.current.innerHTML = html;
      calculateStats(editorRef.current.innerText || '');
    }
  }, [value]);

  // Update statistics
  const calculateStats = (text) => {
    const trimmed = (text || '').trim();
    const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
    const characters = (text || '').length;
    const readTime = Math.max(1, Math.ceil(words / 200));
    setStats({ words, characters, readTime });
  };

  // Emit changes to parent
  const handleEditorInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChangeRef.current = true;

    const currentHtml = editorRef.current.innerHTML;
    const markdown = htmlToMarkdown(editorRef.current);
    calculateStats(editorRef.current.innerText || '');
    updateActiveFormats();

    onChange?.(markdown, currentHtml);
  }, [onChange]);

  // Query selection format states for toolbar active lighting
  const updateActiveFormats = useCallback(() => {
    if (!editorRef.current) return;

    try {
      const bold = document.queryCommandState('bold');
      const italic = document.queryCommandState('italic');
      const underline = document.queryCommandState('underline');
      const strikeThrough = document.queryCommandState('strikeThrough');
      const unorderedList = document.queryCommandState('insertUnorderedList');
      const orderedList = document.queryCommandState('insertOrderedList');

      // Check current block tag (H1, H2, H3, Blockquote, P, A)
      let blockType = 'p';
      let isLink = false;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let node = selection.anchorNode;
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = node.tagName.toLowerCase();
            if (['h1', 'h2', 'h3', 'h4', 'blockquote'].includes(tag) && blockType === 'p') {
              blockType = tag;
            }
            if (tag === 'a') {
              isLink = true;
            }
          }
          node = node.parentNode;
        }
      }

      setActiveFormats({
        bold,
        italic,
        underline,
        strikeThrough,
        blockType,
        unorderedList,
        orderedList,
        isLink,
      });
    } catch (e) {
      // Browser selection error fallback
    }
  }, []);

  const updateFloatingBubble = useCallback(() => {
    if (!containerRef.current || !editorRef.current || linkPopover.isOpen || imagePopover.isOpen) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setBubbleToolbar((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      setBubbleToolbar((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      setBubbleToolbar((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    const rangeRect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    const top = rangeRect.top - containerRect.top - 52;
    const left = rangeRect.left - containerRect.left + rangeRect.width / 2;

    setBubbleToolbar({
      visible: true,
      top: Math.max(10, top),
      left: Math.max(140, Math.min(containerRect.width - 140, left)),
    });
  }, [linkPopover.isOpen, imagePopover.isOpen]);

  // Listen for selection changes across the document
  useEffect(() => {
    const handleDocSelectionChange = () => {
      updateActiveFormats();
      updateFloatingBubble();
    };

    document.addEventListener('selectionchange', handleDocSelectionChange);
    return () => document.removeEventListener('selectionchange', handleDocSelectionChange);
  }, [updateActiveFormats, updateFloatingBubble]);

  const clearSelectedImageHighlight = () => {
    if (editorRef.current) {
      const imgs = editorRef.current.querySelectorAll('img.selected-editor-image');
      imgs.forEach((img) => img.classList.remove('selected-editor-image'));
    }
    selectedImgRef.current = null;
  };

  // Close dropdowns / popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (headingMenuRef.current && !headingMenuRef.current.contains(e.target)) {
        setIsHeadingMenuOpen(false);
      }
      if (linkPopoverRef.current && !linkPopoverRef.current.contains(e.target)) {
        setLinkPopover((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
      }
      if (imagePopoverRef.current && !imagePopoverRef.current.contains(e.target)) {
        if (!e.target.closest('.wysiwyg-editor-area img')) {
          setImagePopover((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
          clearSelectedImageHighlight();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Execute standard formatting command without losing selection focus
  const execCommand = (cmd, arg = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    handleEditorInput();
    updateFloatingBubble();
  };

  // Set block format (Heading 1, 2, 3, Paragraph, Quote)
  const setBlockFormat = (tag) => {
    setIsHeadingMenuOpen(false);
    editorRef.current?.focus();
    if (tag === 'p') {
      document.execCommand('formatBlock', false, '<p>');
    } else if (['h1', 'h2', 'h3'].includes(tag)) {
      document.execCommand('formatBlock', false, `<${tag}>`);
    } else if (tag === 'blockquote') {
      document.execCommand('formatBlock', false, '<blockquote>');
    }
    handleEditorInput();
    updateFloatingBubble();
  };

  const openLinkPopover = () => {
    setBubbleToolbar({ visible: false, top: 0, left: 0 });
    setImagePopover((prev) => ({ ...prev, isOpen: false }));
    clearSelectedImageHighlight();

    const selection = window.getSelection();
    let selectedText = '';
    let existingUrl = '';
    let isExistingLink = false;

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      savedSelectionRange.current = range.cloneRange();
      selectedText = selection.toString();

      // Check if cursor/selection is on an existing link
      let node = selection.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'a') {
          existingUrl = node.getAttribute('href') || '';
          if (!selectedText) selectedText = node.textContent || '';
          isExistingLink = true;
          break;
        }
        node = node.parentNode;
      }

      if (containerRef.current) {
        const rangeRect = range.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        let top = rangeRect.bottom - containerRect.top + 6;
        let left = rangeRect.left - containerRect.left;

        if (top + 90 > containerRect.height && rangeRect.top - containerRect.top > 90) {
          top = Math.max(8, rangeRect.top - containerRect.top - 65);
        }

        left = Math.max(12, Math.min(containerRect.width - 340, left));

        setLinkPopover({
          isOpen: true,
          top,
          left,
          hasSelectedText: Boolean(selectedText.trim()),
          isExistingLink,
        });
      }
    } else {
      savedSelectionRange.current = null;
      setLinkPopover({
        isOpen: true,
        top: 48,
        left: 16,
        hasSelectedText: false,
        isExistingLink: false,
      });
    }

    setLinkText(selectedText);
    setLinkUrl(existingUrl);
    setLinkError('');

    setTimeout(() => {
      linkUrlInputRef.current?.focus();
      linkUrlInputRef.current?.select();
    }, 40);
  };

  const handleApplyLink = (e) => {
    e?.preventDefault();
    if (!linkUrl.trim()) {
      setLinkError('Enter a URL');
      return;
    }

    let url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url) && !url.startsWith('mailto:')) {
      url = `https://${url}`;
    }

    editorRef.current?.focus();

    if (savedSelectionRange.current) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelectionRange.current);
    }

    if (linkText.trim() && (!savedSelectionRange.current || savedSelectionRange.current.collapsed)) {
      const a = document.createElement('a');
      a.href = url;
      a.textContent = linkText.trim();
      a.target = '_blank';
      a.rel = 'noopener noreferrer';

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.insertNode(a);
        range.setStartAfter(a);
        range.collapse(true);
      } else {
        editorRef.current?.appendChild(a);
      }
    } else {
      document.execCommand('createLink', false, url);
    }

    handleEditorInput();
    setLinkPopover({ isOpen: false, top: 0, left: 0, hasSelectedText: false, isExistingLink: false });
    setLinkText('');
    setLinkUrl('');
    setLinkError('');
  };

  const handleUnlink = () => {
    editorRef.current?.focus();
    if (savedSelectionRange.current) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelectionRange.current);
    }
    document.execCommand('unlink', false, null);
    handleEditorInput();
    setLinkPopover({ isOpen: false, top: 0, left: 0, hasSelectedText: false, isExistingLink: false });
  };

  const openImagePopoverForElement = (imgNode) => {
    clearSelectedImageHighlight();
    imgNode.classList.add('selected-editor-image');
    selectedImgRef.current = imgNode;

    setBubbleToolbar({ visible: false, top: 0, left: 0 });
    setLinkPopover((prev) => ({ ...prev, isOpen: false }));

    const currentSrc = imgNode.getAttribute('src') || '';
    const currentAlt = imgNode.getAttribute('alt') || '';
    const currentWidth = imgNode.getAttribute('width') || imgNode.style.width || '100%';
    const currentHeight = imgNode.getAttribute('height') || imgNode.style.height || '';
    const currentAlign = imgNode.getAttribute('align') || (imgNode.parentElement?.style?.textAlign) || 'center';

    setImageUrl(currentSrc);
    setImageAlt(currentAlt);
    setImageWidth(currentWidth);
    setImageHeight(currentHeight);
    setImageAlign(currentAlign);

    if (['25%', '50%', '75%', '100%'].includes(currentWidth)) {
      setSizePreset(currentWidth);
    } else {
      setSizePreset('custom');
    }

    if (containerRef.current) {
      const rect = imgNode.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      let top = rect.bottom - containerRect.top + 8;
      let left = rect.left - containerRect.left + (rect.width / 2) - 170;

      if (top + 260 > containerRect.height && rect.top - containerRect.top > 260) {
        top = Math.max(8, rect.top - containerRect.top - 250);
      }

      left = Math.max(12, Math.min(containerRect.width - 380, left));

      setImagePopover({
        isOpen: true,
        isExistingImage: true,
        top,
        left,
      });
    }

    setImageError('');
    setTimeout(() => {
      imageUrlInputRef.current?.focus();
    }, 40);
  };

  const openImagePopover = () => {
    clearSelectedImageHighlight();
    setBubbleToolbar({ visible: false, top: 0, left: 0 });
    setLinkPopover((prev) => ({ ...prev, isOpen: false }));

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      savedImageRange.current = range.cloneRange();

      if (containerRef.current) {
        const rangeRect = range.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        let top = rangeRect.bottom - containerRect.top + 6;
        let left = rangeRect.left - containerRect.left;

        if (top + 260 > containerRect.height && rangeRect.top - containerRect.top > 260) {
          top = Math.max(8, rangeRect.top - containerRect.top - 250);
        }

        left = Math.max(12, Math.min(containerRect.width - 380, left));

        setImagePopover({
          isOpen: true,
          isExistingImage: false,
          top,
          left,
        });
      }
    } else {
      savedImageRange.current = null;
      setImagePopover({
        isOpen: true,
        isExistingImage: false,
        top: 48,
        left: 16,
      });
    }

    setImageUrl('');
    setImageAlt('');
    setImageWidth('100%');
    setImageHeight('');
    setImageAlign('center');
    setSizePreset('100%');
    setImageError('');

    setTimeout(() => {
      imageUrlInputRef.current?.focus();
    }, 40);
  };

  const handleSizePresetSelect = (preset) => {
    setSizePreset(preset);
    if (preset === '100%') {
      setImageWidth('100%');
      setImageHeight('');
    } else if (preset === '75%') {
      setImageWidth('75%');
      setImageHeight('');
    } else if (preset === '50%') {
      setImageWidth('50%');
      setImageHeight('');
    } else if (preset === '25%') {
      setImageWidth('25%');
      setImageHeight('');
    }
  };

  // Insert new image OR update existing image
  const handleInsertOrUpdateImage = (e) => {
    e?.preventDefault();
    if (!imageUrl.trim()) {
      setImageError('Please enter an image URL');
      return;
    }

    let url = imageUrl.trim();
    if (!/^https?:\/\//i.test(url) && !url.startsWith('data:image/')) {
      url = `https://${url}`;
    }

    const alt = imageAlt.trim() || 'Event image';
    const widthVal = imageWidth.trim();
    const heightVal = imageHeight.trim();
    const alignVal = imageAlign;

    // Build style and attributes
    const styleRules = ['max-width: 100%'];
    if (heightVal && heightVal !== 'auto') {
      styleRules.push(`height: ${heightVal}`);
    } else {
      styleRules.push('height: auto');
    }

    if (alignVal === 'center') {
      styleRules.push('margin-left: auto', 'margin-right: auto', 'display: block');
    } else if (alignVal === 'left') {
      styleRules.push('margin-right: auto', 'display: block');
    } else if (alignVal === 'right') {
      styleRules.push('margin-left: auto', 'display: block');
    }

    if (widthVal && widthVal !== '100%') {
      styleRules.push(`width: ${widthVal}`);
    }

    // If updating existing image
    if (imagePopover.isExistingImage && selectedImgRef.current) {
      const imgNode = selectedImgRef.current;
      imgNode.setAttribute('src', url);
      imgNode.setAttribute('alt', alt);

      if (widthVal && widthVal !== '100%') {
        imgNode.setAttribute('width', widthVal);
        imgNode.style.width = widthVal;
      } else {
        imgNode.removeAttribute('width');
        imgNode.style.width = '100%';
      }

      if (heightVal && heightVal !== 'auto') {
        imgNode.setAttribute('height', heightVal);
        imgNode.style.height = heightVal;
      } else {
        imgNode.removeAttribute('height');
        imgNode.style.height = 'auto';
      }

      imgNode.setAttribute('align', alignVal);
      if (imgNode.parentElement && imgNode.parentElement.tagName.toLowerCase() === 'p') {
        imgNode.parentElement.style.textAlign = alignVal;
      }

      imgNode.style.cssText = styleRules.join('; ');
      clearSelectedImageHighlight();
      handleEditorInput();
      setImagePopover({ isOpen: false, isExistingImage: false, top: 0, left: 0 });
      return;
    }

    // If creating a new image
    editorRef.current?.focus();
    if (savedImageRange.current) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedImageRange.current);
    }

    let imgTag = `<img src="${url}" alt="${alt}" loading="lazy" style="${styleRules.join('; ')}"`;
    if (widthVal && widthVal !== '100%') {
      imgTag += ` width="${widthVal}"`;
    }
    if (heightVal && heightVal !== 'auto') {
      imgTag += ` height="${heightVal}"`;
    }
    if (alignVal) {
      imgTag += ` align="${alignVal}"`;
    }
    imgTag += ' />';

    const imgContainerHtml = `<p style="text-align: ${alignVal};">${imgTag}</p><p><br></p>`;
    execCommand('insertHTML', imgContainerHtml);

    handleEditorInput();
    clearSelectedImageHighlight();
    setImagePopover({ isOpen: false, isExistingImage: false, top: 0, left: 0 });
    setImageUrl('');
    setImageAlt('');
    setImageWidth('100%');
    setImageHeight('');
    setImageAlign('center');
    setSizePreset('100%');
    setImageError('');
  };

  // Delete selected image
  const handleDeleteImage = () => {
    if (selectedImgRef.current) {
      const parent = selectedImgRef.current.parentElement;
      selectedImgRef.current.remove();
      if (parent && parent.tagName.toLowerCase() === 'p' && !parent.innerText.trim() && !parent.querySelector('img')) {
        parent.remove();
      }
      clearSelectedImageHighlight();
      handleEditorInput();
    }
    setImagePopover({ isOpen: false, isExistingImage: false, top: 0, left: 0 });
  };

  // Click handler inside editor (opens image popover when image is clicked)
  const handleEditorClick = (e) => {
    const target = e.target;
    if (target && target.tagName && target.tagName.toLowerCase() === 'img') {
      e.preventDefault();
      e.stopPropagation();
      openImagePopoverForElement(target);
    } else if (imagePopover.isOpen && imagePopover.isExistingImage) {
      clearSelectedImageHighlight();
      setImagePopover((prev) => ({ ...prev, isOpen: false, isExistingImage: false }));
    }
  };

  // Keyboard shortcut handler (Ctrl+K inside editor)
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openLinkPopover();
    }
  };

  // Insert Table Template
  const insertTable = () => {
    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Phase / Milestone</th>
            <th>Timing</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Registration & Check-in</td>
            <td>09:00 AM</td>
            <td>Main Desk</td>
          </tr>
          <tr>
            <td>Keynote Session</td>
            <td>10:30 AM</td>
            <td>Auditorium</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `;
    execCommand('insertHTML', tableHtml);
  };

  // Handle Clean Paste (strip dirty external styles while keeping structure)
  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleEditorInput();
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-white dark:bg-[#0a0a0a] border border-neutral-300 dark:border-neutral-800 rounded-2xl shadow-xs transition-all ${className}`}
    >
      
      {showToolbar && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-[#0c0c0c]/95 backdrop-blur-md text-neutral-700 dark:text-neutral-300 rounded-t-2xl shadow-xs">
          
          {/* Headings & Block Types Dropdown */}
          <div className="relative" ref={headingMenuRef}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setIsHeadingMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-bold border border-neutral-200 dark:border-neutral-800 transition-colors cursor-pointer"
              title="Paragraph and Heading Styles"
            >
              <span>
                {activeFormats.blockType === 'h1'
                  ? 'Heading 1'
                  : activeFormats.blockType === 'h2'
                  ? 'Heading 2'
                  : activeFormats.blockType === 'h3'
                  ? 'Heading 3'
                  : activeFormats.blockType === 'blockquote'
                  ? 'Quote Box'
                  : 'Normal Text'}
              </span>
              <i className="ri-arrow-down-s-line text-neutral-400" />
            </button>

            {isHeadingMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-30 py-1.5 animate-fadeIn">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setBlockFormat('p')}
                  className={`w-full text-left px-3.5 py-2 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between cursor-pointer ${
                    activeFormats.blockType === 'p' ? 'text-brand-600 font-bold bg-brand-50 dark:bg-brand-950/20' : 'text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <span>Normal Paragraph</span>
                  <span className="text-[10px] text-neutral-400 font-mono">P</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setBlockFormat('h1')}
                  className={`w-full text-left px-3.5 py-2 text-sm font-black hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between cursor-pointer ${
                    activeFormats.blockType === 'h1' ? 'text-brand-600 font-bold bg-brand-50 dark:bg-brand-950/20' : 'text-neutral-900 dark:text-white'
                  }`}
                >
                  <span>Heading 1</span>
                  <span className="text-[10px] text-neutral-400 font-mono font-normal">H1</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setBlockFormat('h2')}
                  className={`w-full text-left px-3.5 py-2 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between cursor-pointer ${
                    activeFormats.blockType === 'h2' ? 'text-brand-600 font-bold bg-brand-50 dark:bg-brand-950/20' : 'text-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  <span>Heading 2</span>
                  <span className="text-[10px] text-neutral-400 font-mono font-normal">H2</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setBlockFormat('h3')}
                  className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between cursor-pointer ${
                    activeFormats.blockType === 'h3' ? 'text-brand-600 font-bold bg-brand-50 dark:bg-brand-950/20' : 'text-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  <span>Heading 3</span>
                  <span className="text-[10px] text-neutral-400 font-mono font-normal">H3</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setBlockFormat('blockquote')}
                  className={`w-full text-left px-3.5 py-2 text-xs italic hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between cursor-pointer ${
                    activeFormats.blockType === 'blockquote' ? 'text-brand-600 font-bold bg-brand-50 dark:bg-brand-950/20' : 'text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <span>Important Note / Quote</span>
                  <span className="text-[10px] text-neutral-400 font-mono font-normal">&ldquo;</span>
                </button>
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

          {/* Inline Styles: Bold, Italic, Underline, Strikethrough */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('bold')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm cursor-pointer transition-colors ${
              activeFormats.bold
                ? 'bg-brand-600 text-white shadow-xs'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
            }`}
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('italic')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center italic font-serif text-sm cursor-pointer transition-colors ${
              activeFormats.italic
                ? 'bg-brand-600 text-white shadow-xs'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
            }`}
            title="Italic (Ctrl+I)"
          >
            <em>I</em>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('underline')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center underline text-sm cursor-pointer transition-colors ${
              activeFormats.underline
                ? 'bg-brand-600 text-white shadow-xs'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
            }`}
            title="Underline (Ctrl+U)"
          >
            <u>U</u>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('strikeThrough')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center line-through text-sm cursor-pointer transition-colors ${
              activeFormats.strikeThrough
                ? 'bg-brand-600 text-white shadow-xs'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
            }`}
            title="Strikethrough"
          >
            S
          </button>

          <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

          {/* Lists */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('insertUnorderedList')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-base cursor-pointer transition-colors ${
              activeFormats.unorderedList
                ? 'bg-brand-600 text-white shadow-xs'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
            }`}
            title="Bullet List"
          >
            <i className="ri-list-unordered" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('insertOrderedList')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-base cursor-pointer transition-colors ${
              activeFormats.orderedList
                ? 'bg-brand-600 text-white shadow-xs'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
            }`}
            title="Numbered List"
          >
            <i className="ri-list-ordered" />
          </button>

          <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={openLinkPopover}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeFormats.isLink || linkPopover.isOpen
                ? 'bg-brand-600 text-white shadow-xs'
                : 'hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950/30 text-neutral-700 dark:text-neutral-300'
            }`}
            title="Insert Link (Ctrl+K)"
          >
            <i className="ri-link text-sm" />
            <span className="hidden sm:inline">Link</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={openImagePopover}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              imagePopover.isOpen
                ? 'bg-brand-600 text-white shadow-xs'
                : 'hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950/30 text-neutral-700 dark:text-neutral-300'
            }`}
            title="Insert Image by URL with Size & Alignment"
          >
            <i className="ri-image-add-line text-sm" />
            <span className="hidden sm:inline">Image</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setBlockFormat('blockquote')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-base cursor-pointer transition-colors ${
              activeFormats.blockType === 'blockquote'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
            }`}
            title="Important Note Callout"
          >
            <i className="ri-double-quotes-l" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('insertHorizontalRule')}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm cursor-pointer transition-colors"
            title="Divider Line"
          >
            <i className="ri-separator" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={insertTable}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-base cursor-pointer transition-colors"
            title="Insert Table"
          >
            <i className="ri-table-line" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('removeFormat')}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 text-sm cursor-pointer transition-colors"
            title="Clear Formatting"
          >
            <i className="ri-format-clear" />
          </button>

          {/* Undo / Redo */}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execCommand('undo')}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-sm transition-colors cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <i className="ri-arrow-go-back-line" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execCommand('redo')}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-sm transition-colors cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <i className="ri-arrow-go-forward-line" />
            </button>
          </div>
        </div>
      )}

      {bubbleToolbar.visible && !linkPopover.isOpen && !imagePopover.isOpen && (
        <div
          className="floating-bubble-toolbar absolute z-30 flex items-center gap-1 p-1 bg-neutral-100/95 dark:bg-black/95 text-white backdrop-blur-md rounded-xl border border-neutral-300 dark:border-neutral-700 shadow-2xl"
          style={{
            top: `${bubbleToolbar.top}px`,
            left: `${bubbleToolbar.left}px`,
          }}
        >
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setBlockFormat(activeFormats.blockType === 'h2' ? 'p' : 'h2')}
            className={`px-2 py-1 rounded-lg text-xs font-black transition-colors cursor-pointer ${
              activeFormats.blockType === 'h2' ? 'text-brand-600' : 'hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200'
            }`}
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setBlockFormat(activeFormats.blockType === 'h3' ? 'p' : 'h3')}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeFormats.blockType === 'h3' ? 'text-brand-600 ' : 'hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200'
            }`}
            title="Heading 3"
          >
            H3
          </button>

          <div className="h-4 w-px bg-neutral-700 mx-0.5" />

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('bold')}
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs transition-colors cursor-pointer ${
              activeFormats.bold ? 'text-brand-600' : 'hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200'
            }`}
            title="Bold"
          >
            <strong>B</strong>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('italic')}
            className={`w-7 h-7 rounded-lg flex items-center justify-center italic font-serif text-xs transition-colors cursor-pointer ${
              activeFormats.italic ? 'text-brand-600' : 'hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200'
            }`}
            title="Italic"
          >
            <em>I</em>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('underline')}
            className={`w-7 h-7 rounded-lg flex items-center justify-center underline text-xs transition-colors cursor-pointer ${
              activeFormats.underline ? 'text-brand-600 ' : 'hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200'
            }`}
            title="Underline"
          >
            <u>U</u>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('strikeThrough')}
            className={`w-7 h-7 rounded-lg flex items-center justify-center line-through text-xs transition-colors cursor-pointer ${
              activeFormats.strikeThrough ? 'text-brand-600 ' : 'hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200'
            }`}
            title="Strikethrough"
          >
            S
          </button>

          <div className="h-4 w-px bg-neutral-700 mx-0.5" />

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('insertUnorderedList')}
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors cursor-pointer ${
              activeFormats.unorderedList ? 'text-brand-600 ' : 'hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200'
            }`}
            title="Bullet List"
          >
            <i className="ri-list-unordered" />
          </button>

          {/* Minimal in-place link trigger */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={openLinkPopover}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm hover:bg-neutral-200  text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
            title="Insert Link"
          >
            <i className="ri-link" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={openImagePopover}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
            title="Insert Image"
          >
            <i className="ri-image-add-line" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setBlockFormat('blockquote')}
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors cursor-pointer ${
              activeFormats.blockType === 'blockquote' ? 'text-brand-600' : 'hover:bg-neutral-200  text-neutral-700 dark:text-neutral-200'
            }`}
            title="Quote"
          >
            <i className="ri-double-quotes-l" />
          </button>

          <div className="bubble-arrow bg-neutral-100 dark:bg-neutral-900 border-r border-b border-neutral-300 dark:border-neutral-700" />
        </div>
      )}

      {linkPopover.isOpen && (
        <div
          ref={linkPopoverRef}
          className="absolute z-40 bg-white dark:bg-[#141414] border border-neutral-300 dark:border-neutral-700 rounded-xl shadow-2xl p-2 animate-fadeIn flex flex-col gap-2 min-w-[280px] max-w-[360px]"
          style={{
            top: `${linkPopover.top}px`,
            left: `${linkPopover.left}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {!linkPopover.hasSelectedText && (
            <input
              type="text"
              placeholder="Text to display..."
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:border-brand-600 focus:outline-none text-neutral-900 dark:text-neutral-100"
            />
          )}

          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <input
                ref={linkUrlInputRef}
                type="text"
                placeholder="Paste link (e.g. https://...)"
                value={linkUrl}
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                  if (linkError) setLinkError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyLink();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setLinkPopover((prev) => ({ ...prev, isOpen: false }));
                    editorRef.current?.focus();
                  }
                }}
                className={`w-full pl-7 pr-2.5 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-900 border rounded-lg focus:border-brand-600 focus:outline-none text-neutral-900 dark:text-neutral-100 ${
                  linkError ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'
                }`}
              />
              <i className="ri-link absolute left-2 top-1.5 text-neutral-400 text-xs" />
            </div>

            <button
              type="button"
              onClick={handleApplyLink}
              className="px-3 py-1.5 bg-black hover:bg-brand-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
              title="Apply Link (Enter)"
            >
              Apply
            </button>

            {linkPopover.isExistingLink && (
              <button
                type="button"
                onClick={handleUnlink}
                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                title="Remove Link"
              >
                <i className="ri-link-unlink-m text-sm" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setLinkPopover((prev) => ({ ...prev, isOpen: false }))}
              className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-md transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <i className="ri-close-line text-sm" />
            </button>
          </div>

          {linkError && (
            <span className="text-[10px] font-semibold text-red-600 px-1">
              {linkError}
            </span>
          )}
        </div>
      )}

      {imagePopover.isOpen && (
        <div
          ref={imagePopoverRef}
          className="absolute z-40 bg-white dark:bg-[#141414] border border-neutral-300 dark:border-neutral-700 rounded-xl shadow-2xl p-3 animate-fadeIn flex flex-col gap-2.5 min-w-[320px] max-w-[400px]"
          style={{
            top: `${imagePopover.top}px`,
            left: `${imagePopover.left}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100 dark:border-neutral-800">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <i className="ri-image-line text-brand-600 font-light" />
              {imagePopover.isExistingImage ? 'Edit Image & Sizing' : 'Insert Image via Link'}
            </span>

            <div className="flex items-center gap-1">
              {imagePopover.isExistingImage && (
                <button
                  type="button"
                  onClick={handleDeleteImage}
                  className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors cursor-pointer"
                  title="Delete Image"
                >
                  <i className="ri-delete-bin-line text-sm" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setImagePopover((prev) => ({ ...prev, isOpen: false }));
                  clearSelectedImageHighlight();
                }}
                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-md transition-colors cursor-pointer"
                title="Close"
              >
                <i className="ri-close-line text-sm" />
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              ref={imageUrlInputRef}
              type="text"
              placeholder="Image URL (e.g. https://.../poster.jpg)"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                if (imageError) setImageError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleInsertOrUpdateImage();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setImagePopover((prev) => ({ ...prev, isOpen: false }));
                  clearSelectedImageHighlight();
                  editorRef.current?.focus();
                }
              }}
              className={`w-full pl-7 pr-2.5 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-900 border rounded-lg focus:border-brand-600 focus:outline-none text-neutral-900 dark:text-neutral-100 ${
                imageError ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'
              }`}
            />
            <i className="ri-link absolute left-2 top-1.5 text-neutral-400 text-xs" />
          </div>

          {/* Alt / Caption Text */}
          <input
            type="text"
            placeholder="Alt text / Caption (e.g. Workshop schedule)"
            value={imageAlt}
            onChange={(e) => setImageAlt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleInsertOrUpdateImage();
              }
            }}
            className="w-full px-2.5 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:border-brand-600 focus:outline-none text-neutral-900 dark:text-neutral-100"
          />

          {/* Width & Size Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              <span>Display Width Presets</span>
              <span>{imageWidth}</span>
            </div>
            
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: '25%', val: '25%' },
                { label: '50%', val: '50%' },
                { label: '75%', val: '75%' },
                { label: '100% (Full)', val: '100%' },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => handleSizePresetSelect(p.val)}
                  className={`py-1 text-[11px] font-semibold rounded-md border transition-colors cursor-pointer ${
                    imageWidth === p.val
                      ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 border-brand-300 dark:border-brand-800 font-bold'
                      : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Width & Height Inputs + Alignment */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">Width</label>
              <input
                type="text"
                placeholder="100%, 400px"
                value={imageWidth}
                onChange={(e) => {
                  setImageWidth(e.target.value);
                  setSizePreset('custom');
                }}
                className="w-full px-2 py-1 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md focus:border-brand-600 focus:outline-none text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">Height (Opt)</label>
              <input
                type="text"
                placeholder="auto, 280px"
                value={imageHeight}
                onChange={(e) => setImageHeight(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md focus:border-brand-600 focus:outline-none text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-neutral-500 mb-0.5">Align</label>
              <div className="flex rounded-md border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-neutral-50 dark:bg-neutral-900">
                {[
                  { align: 'left', icon: 'ri-align-left' },
                  { align: 'center', icon: 'ri-align-center' },
                  { align: 'right', icon: 'ri-align-right' },
                ].map((a) => (
                  <button
                    key={a.align}
                    type="button"
                    onClick={() => setImageAlign(a.align)}
                    className={`flex-1 py-1 flex items-center justify-center text-xs transition-colors cursor-pointer ${
                      imageAlign === a.align
                        ? 'bg-brand-600 text-white'
                        : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                    title={`Align ${a.align}`}
                  >
                    <i className={a.icon} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {imageError && (
            <span className="text-[10px] font-semibold text-red-600 px-1">
              {imageError}
            </span>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => {
                setImagePopover((prev) => ({ ...prev, isOpen: false }));
                clearSelectedImageHighlight();
              }}
              className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInsertOrUpdateImage}
              className="px-3.5 py-1.5 bg-black hover:bg-brand-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              {imagePopover.isExistingImage ? 'Update Image' : 'Insert Image'}
            </button>
          </div>
        </div>
      )}

      <div className="relative bg-white dark:bg-[#0a0a0a] rounded-b-2xl">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onClick={handleEditorClick}
          onInput={handleEditorInput}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          data-placeholder={placeholder}
          style={{ minHeight }}
          className="wysiwyg-editor-area focus:outline-none"
        />
      </div>

      {showStats && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 select-none rounded-b-2xl">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-medium">
              <strong className="text-neutral-900 dark:text-neutral-100">{stats.words}</strong> words
            </span>
            <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            <span className="font-medium">
              <strong className="text-neutral-900 dark:text-neutral-100">{stats.characters}</strong> characters
            </span>
            <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            <span>~{stats.readTime} min read</span>
          </div>

          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
            <i className="ri-heart-line text-sm" />
            <span>Made with <i className="ri-arrow-left-s-line text-sm" />3</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WysiwygMarkdownEditor;
