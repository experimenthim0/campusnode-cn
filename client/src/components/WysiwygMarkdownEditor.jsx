import React, { useState, useRef, useEffect, useCallback } from 'react';
import { markdownToHtml, htmlToMarkdown } from '../utils/htmlMarkdownConverter';
import './WysiwygMarkdownEditor.css';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Quote,
  Minus,
  Table as TableIcon,
  RemoveFormatting,
  Undo2,
  Redo2,
  ChevronDown,
  Trash2,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Unlink
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

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
    } catch (e) {}
  }, []);

  const updateFloatingBubble = useCallback(() => {
    const selection = window.getSelection();
    if (
      !selection ||
      selection.isCollapsed ||
      !editorRef.current ||
      !editorRef.current.contains(selection.anchorNode)
    ) {
      setBubbleToolbar({ visible: false, top: 0, left: 0 });
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      setBubbleToolbar({ visible: false, top: 0, left: 0 });
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      let top = rect.top - containerRect.top - 46;
      let left = rect.left - containerRect.left + (rect.width / 2) - 150;

      if (top < 10) {
        top = rect.bottom - containerRect.top + 10;
      }
      left = Math.max(10, Math.min(containerRect.width - 310, left));

      setBubbleToolbar({
        visible: true,
        top,
        left,
      });
    } catch (e) {
      setBubbleToolbar({ visible: false, top: 0, left: 0 });
    }
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      updateActiveFormats();
      updateFloatingBubble();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [updateActiveFormats, updateFloatingBubble]);

  const execCommand = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const setBlockFormat = (tag) => {
    setIsHeadingMenuOpen(false);
    editorRef.current?.focus();

    if (tag === 'blockquote') {
      execCommand('formatBlock', 'blockquote');
    } else if (['h1', 'h2', 'h3'].includes(tag)) {
      execCommand('formatBlock', tag);
    } else {
      execCommand('formatBlock', 'p');
    }
  };

  const openLinkPopover = () => {
    setBubbleToolbar({ visible: false, top: 0, left: 0 });
    setImagePopover((prev) => ({ ...prev, isOpen: false }));

    const selection = window.getSelection();
    let selectedStr = '';
    let existingHref = '';
    let isExisting = false;

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      savedSelectionRange.current = range.cloneRange();
      selectedStr = range.toString().trim();

      let node = selection.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName.toLowerCase() === 'a') {
          existingHref = node.getAttribute('href') || '';
          isExisting = true;
          if (!selectedStr) selectedStr = node.textContent || '';
          break;
        }
        node = node.parentNode;
      }

      if (containerRef.current) {
        const rangeRect = range.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        let top = rangeRect.bottom - containerRect.top + 6;
        let left = rangeRect.left - containerRect.left;

        if (top + 140 > containerRect.height && rangeRect.top - containerRect.top > 140) {
          top = Math.max(8, rangeRect.top - containerRect.top - 130);
        }

        left = Math.max(12, Math.min(containerRect.width - 320, left));

        setLinkPopover({
          isOpen: true,
          top,
          left,
          hasSelectedText: Boolean(selectedStr),
          isExistingLink: isExisting,
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

    setLinkText(selectedStr);
    setLinkUrl(existingHref);
    setLinkError('');

    setTimeout(() => {
      linkUrlInputRef.current?.focus();
    }, 40);
  };

  const handleApplyLink = () => {
    if (!linkUrl.trim()) {
      setLinkError('Please enter a URL');
      return;
    }

    let url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url) && !url.startsWith('mailto:') && !url.startsWith('#')) {
      url = `https://${url}`;
    }

    editorRef.current?.focus();
    if (savedSelectionRange.current) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelectionRange.current);
    }

    if (!linkPopover.hasSelectedText && linkText.trim()) {
      const anchorHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText.trim()}</a>`;
      execCommand('insertHTML', anchorHtml);
    } else {
      execCommand('createLink', url);
    }

    setLinkPopover({ isOpen: false, top: 0, left: 0, hasSelectedText: false, isExistingLink: false });
    setLinkText('');
    setLinkUrl('');
    handleEditorInput();
  };

  const handleUnlink = () => {
    editorRef.current?.focus();
    if (savedSelectionRange.current) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedSelectionRange.current);
    }
    execCommand('unlink');
    setLinkPopover({ isOpen: false, top: 0, left: 0, hasSelectedText: false, isExistingLink: false });
    handleEditorInput();
  };

  const clearSelectedImageHighlight = () => {
    if (selectedImgRef.current) {
      selectedImgRef.current.classList.remove('editor-img-selected');
      selectedImgRef.current = null;
    }
  };

  const openImagePopoverForElement = (imgNode) => {
    clearSelectedImageHighlight();
    selectedImgRef.current = imgNode;
    imgNode.classList.add('editor-img-selected');

    setBubbleToolbar({ visible: false, top: 0, left: 0 });
    setLinkPopover((prev) => ({ ...prev, isOpen: false }));

    const currentSrc = imgNode.getAttribute('src') || '';
    const currentAlt = imgNode.getAttribute('alt') || '';
    const currentWidth = imgNode.getAttribute('width') || imgNode.style.width || '100%';
    const currentHeight = imgNode.getAttribute('height') || imgNode.style.height || '';
    const currentAlign = imgNode.getAttribute('align') || 'center';

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

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openLinkPopover();
    }
  };

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

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    handleEditorInput();
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-card border border-border rounded-xl shadow-xs transition-all overflow-hidden ${className}`}
    >
      {showToolbar && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1 px-3 py-1.5 border-b border-border bg-card/95 backdrop-blur-md">
          {/* Headings Dropdown */}
          <div className="relative" ref={headingMenuRef}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setIsHeadingMenuOpen((prev) => !prev)}
              className="h-7 text-xs font-semibold gap-1.5 px-2.5"
            >
              <span>
                {activeFormats.blockType === 'h1'
                  ? 'Heading 1'
                  : activeFormats.blockType === 'h2'
                  ? 'Heading 2'
                  : activeFormats.blockType === 'h3'
                  ? 'Heading 3'
                  : activeFormats.blockType === 'blockquote'
                  ? 'Quote'
                  : 'Normal'}
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </Button>

            {isHeadingMenuOpen && (
              <Card className="absolute top-full left-0 mt-1 w-44 shadow-lg z-30 py-1 p-1 space-y-0.5">
                {[
                  { tag: 'p', label: 'Normal Paragraph', mono: 'P' },
                  { tag: 'h1', label: 'Heading 1', mono: 'H1' },
                  { tag: 'h2', label: 'Heading 2', mono: 'H2' },
                  { tag: 'h3', label: 'Heading 3', mono: 'H3' },
                  { tag: 'blockquote', label: 'Quote Box', mono: '“' },
                ].map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setBlockFormat(item.tag)}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md flex items-center justify-between transition-colors cursor-pointer ${
                      activeFormats.blockType === item.tag
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{item.mono}</span>
                  </button>
                ))}
              </Card>
            )}
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Inline Styles: Bold, Italic, Underline, Strikethrough */}
          <Button
            type="button"
            variant={activeFormats.bold ? 'default' : 'ghost'}
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('bold')}
            className="h-7 w-7"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant={activeFormats.italic ? 'default' : 'ghost'}
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('italic')}
            className="h-7 w-7"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant={activeFormats.underline ? 'default' : 'ghost'}
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('underline')}
            className="h-7 w-7"
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant={activeFormats.strikeThrough ? 'default' : 'ghost'}
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('strikeThrough')}
            className="h-7 w-7"
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Lists */}
          <Button
            type="button"
            variant={activeFormats.unorderedList ? 'default' : 'ghost'}
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('insertUnorderedList')}
            className="h-7 w-7"
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant={activeFormats.orderedList ? 'default' : 'ghost'}
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('insertOrderedList')}
            className="h-7 w-7"
            title="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Link & Image */}
          <Button
            type="button"
            variant={activeFormats.isLink || linkPopover.isOpen ? 'default' : 'ghost'}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={openLinkPopover}
            className="h-7 px-2 text-xs gap-1 font-semibold"
            title="Insert Link (Ctrl+K)"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Link</span>
          </Button>

          <Button
            type="button"
            variant={imagePopover.isOpen ? 'default' : 'ghost'}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={openImagePopover}
            className="h-7 px-2 text-xs gap-1 font-semibold"
            title="Insert Image"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Image</span>
          </Button>

          <Button
            type="button"
            variant={activeFormats.blockType === 'blockquote' ? 'default' : 'ghost'}
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setBlockFormat('blockquote')}
            className="h-7 w-7"
            title="Important Note / Callout"
          >
            <Quote className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('insertHorizontalRule')}
            className="h-7 w-7"
            title="Divider Line"
          >
            <Minus className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={insertTable}
            className="h-7 w-7"
            title="Insert Table"
          >
            <TableIcon className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('removeFormat')}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Clear Formatting"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </Button>

          {/* Undo / Redo */}
          <div className="ml-auto flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execCommand('undo')}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execCommand('redo')}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Floating Selection Bubble */}
      {bubbleToolbar.visible && !linkPopover.isOpen && !imagePopover.isOpen && (
        <Card
          className="absolute z-30 flex items-center gap-0.5 p-1 shadow-xl border-border bg-card/95 backdrop-blur-md"
          style={{
            top: `${bubbleToolbar.top}px`,
            left: `${bubbleToolbar.left}px`,
          }}
        >
          <Button
            type="button"
            variant={activeFormats.blockType === 'h2' ? 'default' : 'ghost'}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setBlockFormat(activeFormats.blockType === 'h2' ? 'p' : 'h2')}
            className="h-6 px-1.5 text-[11px] font-bold"
          >
            H2
          </Button>
          <Button
            type="button"
            variant={activeFormats.blockType === 'h3' ? 'default' : 'ghost'}
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setBlockFormat(activeFormats.blockType === 'h3' ? 'p' : 'h3')}
            className="h-6 px-1.5 text-[11px] font-bold"
          >
            H3
          </Button>

          <div className="h-4 w-px bg-border mx-0.5" />

          <Button
            type="button"
            variant={activeFormats.bold ? 'default' : 'ghost'}
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('bold')}
            className="h-6 w-6"
          >
            <Bold className="w-3 h-3" />
          </Button>
          <Button
            type="button"
            variant={activeFormats.italic ? 'default' : 'ghost'}
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('italic')}
            className="h-6 w-6"
          >
            <Italic className="w-3 h-3" />
          </Button>
          <Button
            type="button"
            variant={activeFormats.underline ? 'default' : 'ghost'}
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('underline')}
            className="h-6 w-6"
          >
            <Underline className="w-3 h-3" />
          </Button>
          <Button
            type="button"
            variant={activeFormats.strikeThrough ? 'default' : 'ghost'}
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand('strikeThrough')}
            className="h-6 w-6"
          >
            <Strikethrough className="w-3 h-3" />
          </Button>

          <div className="h-4 w-px bg-border mx-0.5" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onMouseDown={(e) => e.preventDefault()}
            onClick={openLinkPopover}
            className="h-6 w-6"
          >
            <LinkIcon className="w-3 h-3" />
          </Button>
        </Card>
      )}

      {/* Link Popover */}
      {linkPopover.isOpen && (
        <Card
          ref={linkPopoverRef}
          className="absolute z-40 p-2.5 shadow-2xl flex flex-col gap-2 min-w-[280px] max-w-[360px]"
          style={{
            top: `${linkPopover.top}px`,
            left: `${linkPopover.left}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {!linkPopover.hasSelectedText && (
            <Input
              type="text"
              placeholder="Text to display..."
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              className="h-8 text-xs"
            />
          )}

          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Input
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
                className={`h-8 pl-7 text-xs ${linkError ? 'border-destructive' : ''}`}
              />
              <LinkIcon className="w-3.5 h-3.5 absolute left-2 top-2.5 text-muted-foreground" />
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleApplyLink}
              className="h-8 px-2.5 text-xs font-semibold"
            >
              Apply
            </Button>

            {linkPopover.isExistingLink && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleUnlink}
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                title="Remove Link"
              >
                <Unlink className="w-3.5 h-3.5" />
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setLinkPopover((prev) => ({ ...prev, isOpen: false }))}
              className="h-8 w-8 text-muted-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          {linkError && (
            <span className="text-[10px] font-semibold text-destructive px-1">
              {linkError}
            </span>
          )}
        </Card>
      )}

      {/* Image Popover */}
      {imagePopover.isOpen && (
        <Card
          ref={imagePopoverRef}
          className="absolute z-40 p-3 shadow-2xl flex flex-col gap-2.5 min-w-[320px] max-w-[400px]"
          style={{
            top: `${imagePopover.top}px`,
            left: `${imagePopover.left}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-1 border-b border-border">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-primary" />
              <span>{imagePopover.isExistingImage ? 'Edit Image & Sizing' : 'Insert Image via Link'}</span>
            </span>

            <div className="flex items-center gap-1">
              {imagePopover.isExistingImage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteImage}
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  title="Delete Image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setImagePopover((prev) => ({ ...prev, isOpen: false }));
                  clearSelectedImageHighlight();
                }}
                className="h-7 w-7 text-muted-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <Input
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
              className={`h-8 pl-7 text-xs ${imageError ? 'border-destructive' : ''}`}
            />
            <LinkIcon className="w-3.5 h-3.5 absolute left-2 top-2.5 text-muted-foreground" />
          </div>

          <Input
            type="text"
            placeholder="Alt text / Caption"
            value={imageAlt}
            onChange={(e) => setImageAlt(e.target.value)}
            className="h-8 text-xs"
          />

          {/* Width Presets */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Width Presets</span>
              <span className="font-mono">{imageWidth}</span>
            </div>
            
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: '25%', val: '25%' },
                { label: '50%', val: '50%' },
                { label: '75%', val: '75%' },
                { label: 'Full', val: '100%' },
              ].map((p) => (
                <Button
                  key={p.val}
                  type="button"
                  variant={imageWidth === p.val ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSizePresetSelect(p.val)}
                  className="h-6 text-[10px] font-semibold px-1"
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Dimensions & Alignment */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Width</label>
              <Input
                type="text"
                placeholder="100%"
                value={imageWidth}
                onChange={(e) => {
                  setImageWidth(e.target.value);
                  setSizePreset('custom');
                }}
                className="h-7 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Height</label>
              <Input
                type="text"
                placeholder="auto"
                value={imageHeight}
                onChange={(e) => setImageHeight(e.target.value)}
                className="h-7 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Align</label>
              <div className="flex rounded-md border border-border overflow-hidden">
                {[
                  { align: 'left', icon: AlignLeft },
                  { align: 'center', icon: AlignCenter },
                  { align: 'right', icon: AlignRight },
                ].map((a) => {
                  const AlignIcon = a.icon;
                  return (
                    <button
                      key={a.align}
                      type="button"
                      onClick={() => setImageAlign(a.align)}
                      className={`flex-1 py-1 flex items-center justify-center transition-colors cursor-pointer ${
                        imageAlign === a.align
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-muted-foreground'
                      }`}
                      title={`Align ${a.align}`}
                    >
                      <AlignIcon className="w-3 h-3" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {imageError && (
            <span className="text-[10px] font-semibold text-destructive px-1">
              {imageError}
            </span>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setImagePopover((prev) => ({ ...prev, isOpen: false }));
                clearSelectedImageHighlight();
              }}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleInsertOrUpdateImage}
              className="h-7 text-xs font-semibold"
            >
              {imagePopover.isExistingImage ? 'Update Image' : 'Insert Image'}
            </Button>
          </div>
        </Card>
      )}

      {/* Editable Area */}
      <div className="relative bg-card">
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
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-muted/30 border-t border-border text-xs text-muted-foreground select-none">
          <div className="flex items-center gap-3 flex-wrap">
            <span>
              <strong className="text-foreground">{stats.words}</strong> words
            </span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span>
              <strong className="text-foreground">{stats.characters}</strong> characters
            </span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span>~{stats.readTime} min read</span>
          </div>

          <div className="text-[11px] text-muted-foreground font-mono">
            Markdown Engine
          </div>
        </div>
      )}
    </div>
  );
};

export default WysiwygMarkdownEditor;
