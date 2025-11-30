"use client";

import { useState, useEffect } from 'react';
import { useChatContext } from '@/lib/chat-context';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  text: string;
  timestamp: Date;
  isTyping?: boolean;
  displayedText?: string;
  hasWhatsAppButton?: boolean;
}

export default function FloatingChat() {
  const { isChatOpen: isOpen, openChat, closeChat, toggleChat: toggleChatContext } = useChatContext();
  const [showFAQ, setShowFAQ] = useState(false);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCSFollowUp, setShowCSFollowUp] = useState(false);
  const [selectedFaqIds, setSelectedFaqIds] = useState<string[]>([]);

  // Helper function to strip markdown link syntax [text](url) to just text
  const stripMarkdownLinks = (text: string) => {
    return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  };

  // Helper function to parse markdown links [text](url) and convert to clickable links
  const renderTextWithLinks = (text: string) => {
    // Regular expression to match markdown links: [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Add the link
      const linkText = match[1];
      const linkUrl = match[2];
      parts.push(
        <a
          key={match.index}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 underline font-semibold"
        >
          {linkText}
        </a>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last link
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const toggleChat = (open: boolean) => {
    if (open) {
      openChat();
    } else {
      closeChat();
    }
  };

  // Load FAQs from API on component mount
  useEffect(() => {
    const loadFAQs = async () => {
      try {
        const response = await fetch('/api/support/faq');
        const data = await response.json();
        if (data.success) {
          setFaqs(data.data);
        }
      } catch (error) {
        console.error('Error loading FAQs:', error);
      }
    };

    loadFAQs();
  }, []);

  const handleFAQClick = async (faq: FAQ) => {
    setIsAnimating(true);

    // Mark this FAQ as selected
    setSelectedFaqIds(prev => [...prev, faq.id]);

    // Add user question to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: faq.question,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);

    // Wait for animation, then add bot response with typing effect
    setTimeout(() => {
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        text: faq.answer,
        timestamp: new Date(),
        isTyping: true,
        displayedText: ''
      };
      setChatMessages(prev => [...prev, botMessage]);
      setIsAnimating(false);
    }, 600);
  };

  // Typing animation effect
  useEffect(() => {
    const typingMessages = chatMessages.filter(msg => msg.isTyping && msg.type === 'bot');

    if (typingMessages.length === 0) return;

    const lastTypingMessage = typingMessages[typingMessages.length - 1];
    const fullText = lastTypingMessage.text;
    // Strip markdown for typing animation to avoid showing raw markdown syntax
    const strippedText = stripMarkdownLinks(fullText);
    const currentLength = lastTypingMessage.displayedText?.length || 0;

    if (currentLength < strippedText.length) {
      const timer = setTimeout(() => {
        setChatMessages(prev =>
          prev.map(msg =>
            msg.id === lastTypingMessage.id
              ? { ...msg, displayedText: strippedText.slice(0, currentLength + 1) }
              : msg
          )
        );
      }, 20); // Speed of typing (20ms per character)

      return () => clearTimeout(timer);
    } else {
      // Typing complete
      setChatMessages(prev =>
        prev.map(msg =>
          msg.id === lastTypingMessage.id
            ? { ...msg, isTyping: false }
            : msg
        )
      );

      // Show CS follow-up question after CS message typing is complete
      if (lastTypingMessage.hasWhatsAppButton) {
        setShowCSFollowUp(true);
      }
    }
  }, [chatMessages]);

  const resetChat = () => {
    setChatMessages([]);
    setShowFAQ(false);
    setShowCSFollowUp(false);
    setSelectedFaqIds([]);
  };

  const handleContactCS = () => {
    setIsAnimating(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: 'Hubungi Customer Service',
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);

    // Wait for animation, then add bot response
    setTimeout(() => {
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        text: 'Baik, sebagai informasi kami hanya menerima laporan melalui Email dan Whatsapp.\n\nEmail : help@meoris.id\n\natau hubungi kami via Whatsapp klik tombol dibawah',
        timestamp: new Date(),
        isTyping: true,
        displayedText: '',
        hasWhatsAppButton: true
      };
      setChatMessages(prev => [...prev, botMessage]);
      setIsAnimating(false);
    }, 600);
  };

  const handleCSFollowUpClick = () => {
    setIsAnimating(true);

    // Add user question to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: 'Berapa lama saya akan mendapatkan balasan terkait kendala yang saya laporkan?',
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);

    // Wait for animation, then add bot response with typing effect
    setTimeout(() => {
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        text: 'Biasanya kami akan membalas laporan terkait kendala yang Anda alami dalam waktu kurang dari 1 hari.',
        timestamp: new Date(),
        isTyping: true,
        displayedText: ''
      };
      setChatMessages(prev => [...prev, botMessage]);
      setIsAnimating(false);
      setShowCSFollowUp(false);
    }, 600);
  };

  // Lock body scroll when chat is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }

    return () => {
      // Cleanup on unmount
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Chat Popup */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 z-[80] transition-opacity duration-300 ease-out animate-fadeIn"
            onClick={() => toggleChat(false)}
          />

          {/* Chat Sidebar - Desktop: Right sidebar, Mobile: Full screen */}
          <div className="fixed inset-0 md:right-0 md:left-auto md:top-0 md:bottom-0 z-[90] md:w-96 md:max-w-[92%] transform transition-transform duration-500 ease-out animate-slideInRight">
            <div className="relative bg-white h-full shadow-2xl overflow-hidden flex flex-col">
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-md">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 18v-6a9 9 0 0 1 18 0v6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {/* Online indicator */}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-bold text-base font-cormorant">Bantuan Meoris</h3>
                    <p className="text-gray-500 text-[11px] font-belleza">Siap membantu pertanyaan dan kendala anda</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleChat(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-6 space-y-4">
                {/* Welcome Message - Always show */}
                <div className="flex gap-3 animate-fadeIn">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 18v-6a9 9 0 0 1 18 0v6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                      <p className="text-sm text-gray-800 font-belleza leading-relaxed">
                        Halo! Selamat datang di Meoris Support. Ada yang bisa kami bantu? 😊
                      </p>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5 ml-3 font-belleza">Baru saja</p>
                  </div>
                </div>

                {/* Chat Messages */}
                {chatMessages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 animate-slideInUp ${
                      message.type === 'user' ? 'flex-row-reverse' : ''
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {message.type === 'bot' && (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 18v-6a9 9 0 0 1 18 0v6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                    <div className="flex-1">
                      <div
                        className={`px-4 py-3 shadow-sm ${
                          message.type === 'user'
                            ? 'bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl rounded-tr-sm ml-auto max-w-[85%]'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-sm'
                        }`}
                      >
                        <div className="text-sm font-belleza leading-relaxed whitespace-pre-line">
                          {message.type === 'bot' && message.isTyping
                            ? message.displayedText
                            : message.type === 'user'
                            ? message.text
                            : renderTextWithLinks(message.text)}
                          {message.type === 'bot' && message.isTyping && (
                            <span className="inline-block w-0.5 h-4 ml-1 bg-gray-800 animate-pulse"></span>
                          )}
                        </div>

                        {/* WhatsApp Button inside bubble - Only show when typing is complete */}
                        {message.type === 'bot' && message.hasWhatsAppButton && !message.isTyping && (
                          <a
                            href="https://wa.me/6281234567890"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold font-belleza transition-all shadow-sm hover:shadow-md"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="currentColor"/>
                            </svg>
                            Hubungi via WhatsApp
                          </a>
                        )}
                      </div>
                      <p className={`text-[10px] text-gray-400 mt-1.5 font-belleza ${message.type === 'user' ? 'text-right mr-3' : 'ml-3'}`}>
                        {message.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Quick Actions or FAQ List */}
                {!showFAQ && chatMessages.length === 0 && (
                  <div className="space-y-3 animate-fadeIn">
                    <p className="text-xs text-gray-500 font-semibold ml-1 font-belleza">Pilih topik bantuan:</p>

                    <button
                      onClick={() => setShowFAQ(true)}
                      className="w-full bg-white hover:bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-left transition-all hover:shadow-md hover:border-red-300"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="12" y1="17" x2="12.01" y2="17" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-900 font-belleza">Pertanyaan Umum</p>
                          <p className="text-[10px] text-gray-500 font-belleza">FAQ & bantuan lainnya</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={handleContactCS}
                      className="w-full bg-white hover:bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-left transition-all hover:shadow-md hover:border-red-300"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-900 font-belleza">Hubungi Customer Service</p>
                          <p className="text-[10px] text-gray-500 font-belleza">Lapor terkait kendala dan bantuan</p>
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {/* FAQ List - Show when in FAQ mode and not animating */}
                {showFAQ && !isAnimating && (
                  <div className="space-y-3 animate-fadeIn">
                    {/* Back Button - Only show when no messages */}
                    {chatMessages.length === 0 && (
                      <button
                        onClick={resetChat}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-1 transition-colors"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-sm font-semibold font-belleza">Kembali</span>
                      </button>
                    )}

                    <p className="text-xs text-gray-500 font-semibold ml-1 font-belleza">Pertanyaan Umum:</p>

                    {faqs.length > 0 ? (
                      (() => {
                        // Filter out already selected FAQs
                        const availableFaqs = faqs.filter(faq => !selectedFaqIds.includes(faq.id));

                        if (availableFaqs.length === 0) {
                          return (
                            <div className="text-center py-4">
                              <p className="text-sm text-gray-400 font-belleza">Semua pertanyaan sudah dijawab</p>
                            </div>
                          );
                        }

                        return availableFaqs.map((faq) => (
                          <button
                            key={faq.id}
                            onClick={() => handleFAQClick(faq)}
                            className="w-full bg-white hover:bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-left transition-all hover:shadow-md hover:border-red-300"
                          >
                            <p className="text-sm text-gray-900 font-belleza">{faq.question}</p>
                          </button>
                        ));
                      })()
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-400 font-belleza">Memuat pertanyaan...</p>
                      </div>
                    )}
                  </div>
                )}

                {/* CS Follow-up Question - Show after CS contact response */}
                {showCSFollowUp && !isAnimating && (
                  <div className="space-y-3 animate-fadeIn">
                    <p className="text-xs text-gray-500 font-semibold ml-1 font-belleza">Pertanyaan lainnya:</p>
                    <button
                      onClick={handleCSFollowUpClick}
                      className="w-full bg-white hover:bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-left transition-all hover:shadow-md hover:border-red-300"
                    >
                      <p className="text-sm text-gray-900 font-belleza">Berapa lama saya akan mendapatkan balasan terkait kendala yang saya laporkan?</p>
                    </button>
                  </div>
                )}

                {/* New Chat Button - Show when there are messages */}
                {chatMessages.length > 0 && (
                  <div className="pt-2 animate-fadeIn">
                    <button
                      onClick={resetChat}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl px-4 py-3.5 text-sm font-semibold font-belleza transition-all shadow-md hover:shadow-lg"
                    >
                      ✨ Mulai Chat Baru
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </>
      )}

      {/* Floating Chat Icon */}
      <button
        onClick={toggleChatContext}
        className={`fixed bottom-6 right-6 z-[100] w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? 'bg-gray-800 hover:bg-gray-700 rotate-0'
            : 'bg-gradient-to-br from-red-500 to-red-600 hover:scale-110 hover:shadow-red-500/50'
        }`}
        aria-label="Chat Support"
      >
        {isOpen ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 6l12 12M18 6L6 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {/* Notification badge */}
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">1</span>
            </span>
            {/* Pulse animation */}
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span>
          </>
        )}
      </button>
    </>
  );
}
