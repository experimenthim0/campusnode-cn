import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Share2,
} from 'lucide-react';

const QUESTION = 'What is CampusNode?';

const RESPONSE =
  'CampusNode is your digital campus hub, built to bring the different parts of college life together. Discover events happening around campus, explore clubs and activities, stay updated with important announcements, and access useful student resources. Everything is organized in one place, so you spend less time searching and more time being part of what is happening on campus.';

const CampusNodeIntroAnimation = () => {
  const [displayedQuestion, setDisplayedQuestion] = useState('');
  const [displayedResponse, setDisplayedResponse] = useState('');
  const [isSendTriggered, setIsSendTriggered] = useState(false);
  const [hasSent, setHasSent] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'typing_prompt' | 'prompt_typed' | 'thinking' | 'streaming_response' | 'done'
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setDisplayedQuestion(QUESTION);
      setDisplayedResponse(RESPONSE);
      setHasSent(true);
      setStatus('done');
      return;
    }

    let cancelled = false;
    let timers = [];

    const wait = (callback, delay) => {
      const timer = setTimeout(() => {
        if (!cancelled) callback();
      }, delay);

      timers.push(timer);
      return timer;
    };

    const runAnimation = () => {
      if (cancelled) return;

      setDisplayedQuestion('');
      setDisplayedResponse('');
      setIsSendTriggered(false);
      setHasSent(false);
      setStatus('idle');
      setCopied(false);
      setLiked(false);
      setDisliked(false);
      setShared(false);

      // Small pause before typing prompt
      wait(() => {
        if (cancelled) return;

        setStatus('typing_prompt');

        let qIndex = 0;
        const promptTypingInterval = setInterval(() => {
          if (cancelled) {
            clearInterval(promptTypingInterval);
            return;
          }

          qIndex += 1;
          setDisplayedQuestion(QUESTION.slice(0, qIndex));

          if (qIndex >= QUESTION.length) {
            clearInterval(promptTypingInterval);
            setStatus('prompt_typed');

            // Wait after prompt typing finishes
            wait(() => {
              if (cancelled) return;

              // Trigger Send action
              setIsSendTriggered(true);
              setHasSent(true);

              // Button press duration
              wait(() => {
                if (cancelled) return;

                setIsSendTriggered(false);
                setStatus('thinking');

                // Thinking state duration
                wait(() => {
                  if (cancelled) return;

                  // Start ChatGPT-style streaming response typing
                  setStatus('streaming_response');

                  let rIndex = 0;
                  const responseStreamingInterval = setInterval(() => {
                    if (cancelled) {
                      clearInterval(responseStreamingInterval);
                      return;
                    }

                    // Stream 2 characters per tick for fluid, natural AI generation
                    rIndex = Math.min(rIndex + 2, RESPONSE.length);
                    setDisplayedResponse(RESPONSE.slice(0, rIndex));

                    if (rIndex >= RESPONSE.length) {
                      clearInterval(responseStreamingInterval);
                      setStatus('done');

                      // Keep response visible for user to read, then restart loop
                      wait(() => {
                        if (cancelled) return;
                        runAnimation();
                      }, 6500);
                    }
                  }, 20);

                  timers.push(() => clearInterval(responseStreamingInterval));
                }, 1200);
              }, 180);
            }, 600);
          }
        }, 45);

        timers.push(() => clearInterval(promptTypingInterval));
      }, 600);
    };

    runAnimation();

    return () => {
      cancelled = true;
      timers.forEach((timer) => {
        if (typeof timer === 'function') {
          timer();
        } else {
          clearTimeout(timer);
        }
      });
    };
  }, []);

  const handleCopy = () => {
    if (!displayedResponse) return;
    navigator.clipboard?.writeText(displayedResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLike = () => {
    setLiked((prev) => !prev);
    setDisliked(false);
  };

  const handleDislike = () => {
    setDisliked((prev) => !prev);
    setLiked(false);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'CampusNode',
          text: displayedResponse,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col justify-center select-none h-[70vh]">
      {/* Brand */}
      <div>
        <div className="flex items-center gap-2.5 ">
          <span className="font-light text-2xl sm:text-3xl lg:text-[32px] xl:text-[38px] tracking-wider text-zinc-900 dark:text-white leading-none logofont">
            Cam
            <span className="uppercase text-[22px] sm:text-[24px] lg:text-[26px] xl:text-[28px] font-bold">
              P
            </span>
            usnode
          </span>
        </div>

        {/* <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed">
          &ldquo;Everything happening on campus, in one place.&rdquo;
        </p> */}
      </div>

      {/* Interactive Prompt */}
      <div className="mt-4 sm:mt-5 lg:mt-4 xl:mt-5">
        <div
          role="region"
          aria-label="CampusNode interactive demonstration"
          className="w-full flex items-center justify-between gap-3 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-white dark:bg-zinc-900/90 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-xs"
        >
          <div className="flex items-center min-w-0 flex-1">
            <span className="text-xs sm:text-sm text-zinc-900 dark:text-white font-normal break-words">
              {displayedQuestion || (
                <span className="text-zinc-400 dark:text-zinc-500 font-light">
                 Ask anything...
                </span>
              )}
            </span>

            {status === 'typing_prompt' && (
              <span
                className="inline-block w-[2px] h-4 ml-0.5 bg-brand-500 animate-pulse shrink-0 align-middle"
                aria-hidden="true"
              />
            )}
          </div>

          <button
            type="button"
            disabled
            tabIndex={-1}
            aria-label="Send prompt"
            className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              isSendTriggered
                ? 'bg-brand-700 text-white scale-95 shadow-inner'
                : hasSent
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
                : 'bg-brand-600 text-white shadow-xs'
            }`}
          >
            <span>Send</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Response area */}
        <div className="mt-2.5 sm:mt-3 min-h-[95px] sm:min-h-[105px] lg:min-h-[110px] flex flex-col justify-start">
          {status === 'thinking' && (
            <div
              className="flex items-center gap-2 py-1 text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400"
              aria-live="polite"
            >
              <span>Thinking...</span>

              <span
                className="inline-flex items-center gap-1"
                aria-hidden="true"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />

                <span
                  className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />

                <span
                  className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </span>
            </div>
          )}

          {(status === 'streaming_response' || status === 'done') && (
            <div
              className="py-0.5 sm:py-1 transition-opacity duration-300 ease-out opacity-100"
              aria-live="polite"
            >
              <p className="text-xs sm:text-xs lg:text-[13px] xl:text-[13.5px] leading-relaxed text-zinc-700 dark:text-zinc-300 font-normal">
                {displayedResponse}
                {status === 'streaming_response' && (
                  <span
                    className="inline-block w-[2px] h-4 ml-1 bg-brand-500 dark:bg-brand-400 animate-pulse align-middle"
                    aria-hidden="true"
                  />
                )}
              </p>

              {status === 'done' && (
                <div className="flex items-center gap-0.5 mt-2.5 text-zinc-400 dark:text-zinc-500 transition-opacity duration-300">
                  <button
                    type="button"
                    onClick={handleCopy}
                    aria-label="Copy response"
                    title={copied ? 'Copied' : 'Copy'}
                    className={`p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
                      copied
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'hover:text-zinc-700 dark:hover:text-zinc-200'
                    }`}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 stroke-[1.75]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 stroke-[1.75]" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleLike}
                    aria-label="Good response"
                    title="Good response"
                    className={`p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
                      liked
                        ? 'text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800'
                        : 'hover:text-zinc-700 dark:hover:text-zinc-200'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5 stroke-[1.75]" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDislike}
                    aria-label="Bad response"
                    title="Bad response"
                    className={`p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
                      disliked
                        ? 'text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800'
                        : 'hover:text-zinc-700 dark:hover:text-zinc-200'
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5 stroke-[1.75]" />
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    aria-label="Share response"
                    title={shared ? 'Link copied' : 'Share'}
                    className={`p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${
                      shared
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'hover:text-zinc-700 dark:hover:text-zinc-200'
                    }`}
                  >
                    {shared ? (
                      <Check className="w-3.5 h-3.5 stroke-[1.75]" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5 stroke-[1.75]" />
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampusNodeIntroAnimation;
