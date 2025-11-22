'use client'

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Mic, Loader, Copy, Check } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Home() {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const URL_API = "https://rack.fedmich.com/api/ask-ai/";
  interface HistoryItem {
    query: string;
    answer: string;
    timestamp: number;
    displayedAnswer: string;
    id: string;
  }

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [displayedAnswer, setDisplayedAnswer] = useState("");
  const [isAnswerLoading, setIsAnswerLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          finalTranscriptRef.current = "";
        };

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscriptRef.current += transcript;
              setInput((prev) => prev + transcript);
            } else {
              interimTranscript += transcript;
            }
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          // If we captured final transcript, send query
          const q = finalTranscriptRef.current.trim();
          if (q) {
            sendQuery(q);
            finalTranscriptRef.current = "";
          }
        };
      }
    }
  }, []);

  // Handle query parameter on page load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const queryParam = params.get("q");
        // Trim and validate query parameter
        const trimmedQuery = queryParam ? String(queryParam).trim() : null;
        if (trimmedQuery && trimmedQuery.length > 0) {
          typeQueryAndSubmit(trimmedQuery);
        }
      }
    }, 300); // 0.3 second delay
    return () => clearTimeout(timer);
  }, []);

  // Function to handle query with typing animation
  function typeQueryAndSubmit(query: string) {
    // Sanitize input: trim and validate
    const sanitizedQuery = String(query).trim();
    if (!sanitizedQuery) return;

    const charDelay = 30; // milliseconds between each character
    let currentIndex = 0;
    let displayedText = "";

    // Typing animation
    const typingInterval = setInterval(() => {
      if (currentIndex < sanitizedQuery.length) {
        displayedText += sanitizedQuery[currentIndex];
        setInput(displayedText);
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        // After typing is done, wait 0.5s and submit
        setTimeout(() => {
          sendQuery(sanitizedQuery);
        }, 500);
      }
    }, charDelay);
  }

  const handleMicClick = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  

  async function sendQuery(q: string) {
    if (!q || !q.trim()) return;
    setIsAnswerLoading(true);
    setCurrentAnswer("");
    setDisplayedAnswer("");
    setCurrentQuery(q);
    try {
      const res = await fetch(URL_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, domain: typeof window !== "undefined" ? window.location.hostname : "server" }),
      });
      const data = await res.json();
      if (data?.status === "not_found") {
        setCurrentAnswer("No results available for that query.");
      } else {
        const ans = data?.answer ?? data?.answer_text ?? JSON.stringify(data);
        setCurrentAnswer(ans);
        document.title = `${q.substring(0, 50)} - Ask Fed`;
      }
    } catch (err) {
      console.error(err);
      setCurrentAnswer("Error: Failed to fetch answer from API.");
    } finally {
      setIsAnswerLoading(false);
    }
  }

  // Typewriter effect for answer
  useEffect(() => {
    if (!currentAnswer) return;
    setDisplayedAnswer("");
    const chunkSize = 40; // characters per chunk
    const intervalMs = 25; // fast animation
    let index = 0;
    const timer = setInterval(() => {
      const next = currentAnswer.slice(index, index + chunkSize);
      setDisplayedAnswer((prev) => prev + next);
      index += chunkSize;
      if (index >= currentAnswer.length) {
        clearInterval(timer);
        // Once typewriter finishes, prepend to history
        const newId = `history-${Date.now()}`;
        setHistory((prev) => [
          {
            query: currentQuery,
            answer: currentAnswer,
            timestamp: Date.now(),
            displayedAnswer: currentAnswer,
            id: newId,
          },
          ...prev,
        ]);
        // Make newly added item expanded by default so first-3 behaviour is consistent
        setExpandedItems((prev) => {
          const s = new Set(prev);
          s.add(newId);
          return s;
        });
        setCurrentAnswer("");
        setDisplayedAnswer("");
        setCurrentQuery("");
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [currentAnswer, currentQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) {
      textareaRef.current?.focus();
      return;
    }
    const q = input.trim();
    setInput("");
    sendQuery(q);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!input.trim()) {
        textareaRef.current?.focus();
        return;
      }
      const q = input.trim();
      setInput("");
      sendQuery(q);
      textareaRef.current?.focus();
    }
    // ESC to clear
    if (e.key === "Escape") {
      e.preventDefault();
      setInput("");
      textareaRef.current?.focus();
    }
  };

  const handleBlur = () => {
    // Trim text on blur
    setInput((prev) => prev.trim());
  };

  const handleCopyAnswer = async (text: string, id: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const [collapsingItems, setCollapsingItems] = useState<Set<string>>(new Set());

  const toggleAccordion = (itemId: string) => {
    // Toggle: if currently expanded -> collapse (with animation), else expand
    if (expandedItems.has(itemId)) {
      // collapsing
      setCollapsingItems((prev) => {
        const s = new Set(prev);
        s.add(itemId);
        return s;
      });
      // remove from expanded after animation
      setTimeout(() => {
        setExpandedItems((prev) => {
          const s = new Set(prev);
          s.delete(itemId);
          return s;
        });
        setCollapsingItems((prev) => {
          const s = new Set(prev);
          s.delete(itemId);
          return s;
        });
      }, 200);
    } else {
      // expanding
      setExpandedItems((prev) => {
        const s = new Set(prev);
        s.add(itemId);
        return s;
      });
    }
  };

  

  // legacy: kept for reference but not used (we use highlightChildren instead)
  const highlightMatches = (text: string, query: string): string => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")})`, "gi");
    return text.replace(regex, "<strong>$1</strong>");
  };

  // Helper to highlight matches inside React children produced by ReactMarkdown
  const highlightChildren = (children: any, query: string): any => {

    if (!query || !String(query).trim()) return children;
    const q = String(query).trim();
    // Don't highlight long or multi-word queries
    if (q.length > 30 || /\s/.test(q)) return children;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")})`, "gi");

    const process = (child: any): any => {
        if (typeof child === "string") {
        const parts = child.split(regex);
        return parts.map((part, i) => {
          if (part && regex.test(part)) {
            // Render a styled span instead of raw <strong>
            return React.createElement(
              "span",
              { key: i, className: "query-highlight" },
              part
            );
          }
          return part;
        });
      }
      if (React.isValidElement(child)) {
        const element = child as React.ReactElement<any>;
        const childChildren = element.props ? element.props.children : undefined;
        return React.cloneElement(element, { ...element.props, key: Math.random() }, highlightChildren(childChildren, query));
      }
      return child;
    };

    if (Array.isArray(children)) {
      return children.map((c, i) => React.createElement(React.Fragment, { key: i }, process(c)));
    }
    return process(children);
  };

  return (
    <div className="app ask-ai min-h-screen flex flex-col items-center justify-start p-4 md:p-8">
      {/* Header */}
      <h1 className="text-4xl md:text-6xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
        Ask Fed
      </h1>

      {/* Chat Area */}
      <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-4">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="Ask anything... (Ctrl+Enter to submit, ESC to clear)"
            className="min-h-24 pl-12 pr-20 rounded-xl bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/60"
            autoFocus
          />
          <button
            type="button"
            onClick={handleMicClick}
            className={`absolute left-3 top-3 transition-colors ${
              isListening ? "text-red-500 animate-pulse" : "text-white/70 hover:text-white"
            }`}
          >
            {isListening ? <Loader className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
          </button>
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-3 top-3 text-white/70 hover:text-white transition-colors disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>

      {/* Current answer being typed out */}
      <div className="w-full max-w-4xl mt-6">
        {isAnswerLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader className="h-4 w-4 animate-spin" />
            Fetching answer...
          </div>
        )}

        {displayedAnswer && currentQuery && (
          <div className="mt-4 rounded-lg bg-white/10 p-8 max-w-full text-lg leading-relaxed relative">
            <button
              onClick={() => handleCopyAnswer(displayedAnswer, "current")}
              className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors"
              title="Copy to clipboard"
            >
              {copiedId === "current" ? (
                <Check className="h-5 w-5 text-green-400" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
            <div className="mb-3">
              <p className="text-base md:text-lg text-blue-300 font-semibold mb-1">{currentQuery}</p>
              <p className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</p>
            </div>
            <div className="prose prose-invert max-w-full text-gray-100">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ node, ...props }) => <p {...props}>{highlightChildren(props.children, currentQuery)}</p>,
                  li: ({ node, ...props }) => <li {...props}>{highlightChildren(props.children, currentQuery)}</li>,
                }}
              >
                {displayedAnswer}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* History of previous answers */}
      <div className="w-full max-w-4xl mt-8 space-y-3">
        {history.map((item, idx) => {
          const isExpanded = expandedItems.has(item.id);
          const isCollapsing = collapsingItems.has(item.id);
          // Show header (collapsed view) when the item is not expanded.
          // Removed special-case for 4th+ items so any item can be collapsed by the user.
          const shouldShowHeader = !isExpanded;
          const fullDateTime = new Date(item.timestamp).toLocaleString();

          return (
            <div key={item.id}>
              {shouldShowHeader ? (
                // Collapsed header for 4th+ items
                <>
                  <button
                    onClick={() => toggleAccordion(item.id)}
                    className={`w-full text-left rounded-lg bg-gradient-to-r from-white/15 to-white/10 hover:from-white/20 hover:to-white/15 transition-all p-4 flex items-center justify-between border border-white/10 hover:border-white/20 ${
                      isCollapsing ? "accordion-collapse" : ""
                    }`}
                  >
                    <div className="flex-1">
                      <p className="ask-ai-query text-sm md:text-base text-blue-300 font-semibold">
                        {item.query}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "#d9dde3" }} title={fullDateTime}>
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="w-8 flex items-center justify-center text-white/70">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                      </svg>
                    </div>
                  </button>
                </>
              ) : (
                // Full card for first 3 or expanded items
                <div className={`rounded-lg bg-white/10 border border-white/10 max-w-full text-lg leading-relaxed ${
                  isCollapsing ? "accordion-collapse" : ""
                }`}>
                  {/* Header with close button */}
                  <div className="bg-gradient-to-r from-white/15 to-white/10 p-4 flex items-start justify-between border-b border-white/10 rounded-t-lg">
                    <button onClick={() => toggleAccordion(item.id)} className="flex-1 text-left text-left">
                      <p className="ask-ai-query text-sm md:text-base text-blue-300 font-semibold">
                        {item.query}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "#d9dde3" }} title={fullDateTime}>
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </p>
                    </button>
                    <div className="w-8 flex items-center justify-center">
                      <button
                        onClick={() => toggleAccordion(item.id)}
                        className="text-white/70 hover:text-white transition-colors"
                        title="Collapse"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Content body */}
                  <div className="p-8 relative">
                    <button
                      onClick={() => handleCopyAnswer(item.displayedAnswer, item.id)}
                      className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-5 w-5 text-green-400" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </button>
                    <div className="prose prose-invert max-w-full text-gray-100">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ node, ...props }) => <p {...props}>{highlightChildren(props.children, item.query)}</p>,
                          li: ({ node, ...props }) => <li {...props}>{highlightChildren(props.children, item.query)}</li>,
                        }}
                      >
                        {item.displayedAnswer}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}

              {/* Expanded content for collapsed headers */}
              
            </div>
          );
        })}
      </div>
    </div>
  );
}