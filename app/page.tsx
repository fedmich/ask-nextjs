'use client'

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Mic, Loader } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Home() {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>("");

  interface HistoryItem {
    query: string;
    answer: string;
    timestamp: number;
    displayedAnswer: string;
  }

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [displayedAnswer, setDisplayedAnswer] = useState("");
  const [isAnswerLoading, setIsAnswerLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");

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
      const res = await fetch("https://st24.fedmich.com/api/ask-ai/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, domain: typeof window !== "undefined" ? window.location.hostname : "server" }),
      });
      const data = await res.json();
      const ans = data?.answer ?? data?.answer_text ?? JSON.stringify(data);
      setCurrentAnswer(ans);
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
        setHistory((prev) => [
          {
            query: currentQuery,
            answer: currentAnswer,
            timestamp: Date.now(),
            displayedAnswer: currentAnswer,
          },
          ...prev,
        ]);
        setCurrentAnswer("");
        setDisplayedAnswer("");
        setCurrentQuery("");
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [currentAnswer, currentQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const q = input.trim();
    setInput("");
    sendQuery(q);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 md:p-8">
      {/* Header */}
      <h1 className="text-4xl md:text-6xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
        Ask A.I.
      </h1>

      {/* Chat Area */}
      <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-4">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
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
      <div className="w-full max-w-2xl mt-6">
        {isAnswerLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader className="h-4 w-4 animate-spin" />
            Fetching answer...
          </div>
        )}

        {displayedAnswer && currentQuery && (
          <div className="mt-4 rounded-lg bg-white/5 p-6">
            <div className="mb-3">
              <p className="text-sm text-gray-300 font-semibold mb-1">{currentQuery}</p>
              <p className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</p>
            </div>
            <div className="prose prose-invert max-w-full">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayedAnswer}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* History of previous answers */}
      <div className="w-full max-w-2xl mt-8 space-y-6">
        {history.map((item, idx) => (
          <div key={idx} className="rounded-lg bg-white/5 p-6">
            <div className="mb-3">
              <p className="text-sm text-gray-300 font-semibold mb-1">{item.query}</p>
              <p className="text-xs text-gray-500">
                {new Date(item.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <div className="prose prose-invert max-w-full">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.displayedAnswer}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}