import React, { useState, useEffect, useRef } from "react";
import { X, Phone, MessageCircle, MapPin, MessageSquare, ExternalLink, Users, Heart, Shield, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AIResourceDiscovery from "@/components/ai/AIResourceDiscovery";

const EMERGENCY = "911";
const MENTAL = "988";
const COMMUNITY = "211";

export const EmergencySafetySystem = () => {
  const navigate = useNavigate();
  const [isTopBarVisible, setIsTopBarVisible] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLabelVisible, setIsLabelVisible] = useState(true);
  const [ringProgress, setRingProgress] = useState(0);
  const [showAIDiscovery, setShowAIDiscovery] = useState(false);
  
  const longPressRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const tapCountRef = useRef<number[]>([]);
  const pressingRef = useRef(false);

  // Handle topbar dismiss
  useEffect(() => {
    const hidden = localStorage.getItem("crisisBarHidden");
    if (hidden) {
      setIsTopBarVisible(false);
    }
  }, []);

  const dismissTopBar = () => {
    localStorage.setItem("crisisBarHidden", "1");
    setIsTopBarVisible(false);
  };

  // Long press functionality
  const startLongPress = () => {
    pressingRef.current = true;
    startTimeRef.current = Date.now();
    
    const updateProgress = () => {
      if (!pressingRef.current) return;
      
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(1, elapsed / 2000); // 2 second hold
      setRingProgress(progress);
      
      if (progress >= 1) {
        // Auto-dial emergency
        window.location.href = `tel:${EMERGENCY}`;
        stopLongPress();
        return;
      }
      
      requestAnimationFrame(updateProgress);
    };
    
    requestAnimationFrame(updateProgress);
  };

  const stopLongPress = () => {
    pressingRef.current = false;
    setRingProgress(0);
    if (longPressRef.current) {
      cancelAnimationFrame(longPressRef.current);
    }
  };

  // Triple-tap to toggle label
  const handleTripleTap = () => {
    const now = Date.now();
    tapCountRef.current = tapCountRef.current.filter(tap => now - tap < 450);
    tapCountRef.current.push(now);
    
    if (tapCountRef.current.length >= 3) {
      setIsLabelVisible(!isLabelVisible);
      tapCountRef.current = [];
    }
  };

  const handleEmergencyAction = (action: string) => {
    switch (action) {
      case "call":
        window.location.href = `tel:${EMERGENCY}`;
        break;
      case "mh":
        window.location.href = `tel:${MENTAL}`;
        break;
      case "211":
        window.location.href = `tel:${COMMUNITY}`;
        break;
      case "sms":
        window.location.href = `sms:?&body=${encodeURIComponent("I need help. My location: " + window.location.href)}`;
        break;
      case "loc":
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const url = `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`;
              if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(url);
              }
              alert("Location copied: " + url);
            },
            () => alert("Could not get location")
          );
        } else {
          alert("Location not available");
        }
        break;
      case "chat":
        // Open AI Navigator instead of trying to find chat button
        setShowAIDiscovery(true);
        break;
      case "collective":
        navigate("/learn");
        break;
      case "healing":
        navigate("/victim-services");
        break;
      case "exit":
        setShowAIDiscovery(false);
        setIsSheetOpen(false);
        navigate("/");
        break;
    }
    setIsSheetOpen(false);
  };

  return (
    <>
      {/* Crisis Top Bar */}
      {isTopBarVisible && (
        <div className="fixed top-0 left-0 w-full z-[10000] bg-destructive text-destructive-foreground shadow-sm">
          <div className="max-w-screen-xl mx-auto px-3 py-2 flex items-center justify-center gap-2 relative">
            <span className="text-sm font-medium text-center">
              ⚠️ <strong>Crisis?</strong> Call{" "}
              <a href={`tel:${EMERGENCY}`} className="underline hover:no-underline">
                {EMERGENCY}
              </a>{" "}
              • Community help:{" "}
              <a href={`tel:${COMMUNITY}`} className="underline hover:no-underline">
                {COMMUNITY}
              </a>{" "}
              • Mental health:{" "}
              <a href={`tel:${MENTAL}`} className="underline hover:no-underline">
                {MENTAL}
              </a>{" "}
              • Text <strong>HOME</strong> to <strong>741741</strong>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissTopBar}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-destructive-foreground/20"
              aria-label="Dismiss crisis bar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Safety Dock */}
      <div className="fixed right-4 bottom-24 z-[10001]">
        <Button
          onMouseDown={startLongPress}
          onMouseUp={stopLongPress}
          onMouseLeave={stopLongPress}
          onTouchStart={startLongPress}
          onTouchEnd={stopLongPress}
          onTouchCancel={stopLongPress}
          onClick={(e) => {
            e.stopPropagation();
            setShowAIDiscovery(true);
          }}
          aria-label="Emergency chat"
          className="rounded-full h-auto relative border-0 p-0 overflow-visible bg-transparent hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          style={{ boxShadow: 'none' }}
        >
          <div
            className="flex items-center gap-2.5 rounded-full transition-all duration-200"
            style={{
              background: 'rgba(27,27,27,0.96)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 6px 28px rgba(0,0,0,0.32), 0 1px 6px rgba(0,0,0,0.22)',
              padding: '6px 40px 6px 6px',
            }}
          >
            {/* Scarlet icon circle with progress ring */}
            <div
              className="relative flex-shrink-0 rounded-full flex items-center justify-center"
              style={{ width: 40, height: 40, background: '#BB0000' }}
            >
              <Phone className="h-4 w-4 text-white" />
              <svg
                className="absolute inset-0 -rotate-90"
                width="40" height="40"
                viewBox="0 0 40 40"
              >
                <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>
                <circle
                  cx="20" cy="20" r="18"
                  fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2"
                  strokeDasharray="113.1"
                  strokeDashoffset={113.1 - (ringProgress * 113.1)}
                  className="transition-all duration-75"
                  style={{ transitionTimingFunction: 'linear' }}
                />
              </svg>
            </div>

            {isLabelVisible && (
              <span
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.90)',
                  letterSpacing: '0.01em',
                  userSelect: 'none',
                }}
              >
                Chat
              </span>
            )}
          </div>

          {/* Three-dot menu trigger */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleTripleTap();
              setIsSheetOpen(!isSheetOpen);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTripleTap();
                setIsSheetOpen(!isSheetOpen);
              }
            }}
            aria-label="Open emergency actions"
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full cursor-pointer transition-all duration-150"
            style={{
              width: 28,
              height: 28,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.13)',
              color: 'rgba(255,255,255,0.65)',
              fontSize: '15px',
              fontWeight: 700,
              lineHeight: 1,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(187,0,0,0.55)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
          >
            ⋮
          </div>
        </Button>
      </div>

      {/* Backdrop and Sheet */}
      {isSheetOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000] transition-all duration-300"
          onClick={() => setIsSheetOpen(false)}
        >
          <div 
            className="absolute right-4 bottom-20 w-80 max-w-[calc(100vw-2rem)] backdrop-blur-md rounded-3xl p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              background: 'rgba(43,43,43,0.94)',
              border: '1px solid rgba(255,255,255,.08)',
              boxShadow: '0 12px 30px rgba(0,0,0,.25)',
              color: '#F4F4F4',
              animation: 'slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              animationFillMode: 'both'
            }}
          >
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => handleEmergencyAction("call")}
                className="flex flex-col items-center gap-3 p-2 bg-transparent border-0 cursor-pointer"
              >
                <span 
                  className="w-20 h-20 rounded-full flex items-center justify-center relative transition-all duration-200 md:hover:translate-y-[-2px] md:hover:scale-105"
                  style={{
                    background: '#BB0000',
                    boxShadow: '0 2px 8px rgba(43,43,43,0.16)'
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white opacity-95">
                    <path d="M22 16.92v3A2 2 0 0 1 19.82 22a19.8 19.8 0 0 1-8.63-3.07A19.5 19.5 0 0 1 3.16 9.81 19.8 19.8 0 0 1 .09 1.18 2 2 0 0 1 2.05 0h3a2 2 0 0 1 2 1.72c.12.89.31 1.76.57 2.6a2 2 0 0 1-.45 2.11L6.1 7.91a16 16 0 0 0 6 6l1.48-1.07a2 2 0 0 1 2.11-.45c.84.26 1.71.45 2.6.57A2 2 0 0 1 22 16.92Z" fill="currentColor"/>
                  </svg>
                </span>
                <span className="text-center leading-tight">
                  <strong className="block font-bold text-sm text-white">Call</strong>
                  <em className="block font-semibold text-xs text-[#F4F4F4] opacity-90 not-italic">{EMERGENCY}</em>
                </span>
              </button>
              
              <button
                onClick={() => handleEmergencyAction("mh")}
                className="flex flex-col items-center gap-3 p-2 bg-transparent border-0 cursor-pointer"
              >
                <span 
                  className="w-20 h-20 rounded-full flex items-center justify-center relative transition-all duration-200 md:hover:translate-y-[-2px] md:hover:scale-105"
                  style={{
                    background: '#666666',
                    boxShadow: '0 2px 8px rgba(43,43,43,0.16)'
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white opacity-95">
                    <path d="M8.5 3.5a3 3 0 0 0-3 3V9a3 3 0 0 0 3 3v6a2 2 0 0 0 2 2h1V8a4.5 4.5 0 0 0-3-4.24Z" fill="currentColor"/>
                    <path d="M15.5 3.5a3 3 0 0 1 3 3V9a3 3 0 0 1-3 3v6a2 2 0 0 1-2 2h-1V8a4.5 4.5 0 0 1 3-4.24Z" fill="currentColor"/>
                  </svg>
                </span>
                <span className="text-center leading-tight">
                  <strong className="block font-bold text-sm text-white">Mental</strong>
                  <em className="block font-semibold text-xs text-[#F4F4F4] opacity-90 not-italic">{MENTAL}</em>
                </span>
              </button>
              
              <button
                onClick={() => handleEmergencyAction("211")}
                className="flex flex-col items-center gap-3 p-2 bg-transparent border-0 cursor-pointer"
              >
                <span 
                  className="w-20 h-20 rounded-full flex items-center justify-center relative transition-all duration-200 md:hover:translate-y-[-2px] md:hover:scale-105"
                  style={{
                    background: '#BB0000',
                    boxShadow: '0 2px 8px rgba(43,43,43,0.16)'
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white opacity-95">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </span>
                <span className="text-center leading-tight">
                  <strong className="block font-bold text-sm text-white">Community</strong>
                  <em className="block font-semibold text-xs text-[#F4F4F4] opacity-90 not-italic">{COMMUNITY}</em>
                </span>
              </button>
              
              <button
                onClick={() => handleEmergencyAction("sms")}
                className="flex flex-col items-center gap-3 p-2 bg-transparent border-0 cursor-pointer"
              >
                <span 
                  className="w-20 h-20 rounded-full flex items-center justify-center relative transition-all duration-200 md:hover:translate-y-[-2px] md:hover:scale-105"
                  style={{
                    background: '#2B2B2B',
                    boxShadow: '0 2px 8px rgba(43,43,43,0.16)'
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white opacity-95">
                    <path d="M21 15a2 2 0 0 1-2 2H9l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
                    <circle cx="13" cy="10" r="1.5" fill="currentColor"/>
                    <circle cx="17" cy="10" r="1.5" fill="currentColor"/>
                  </svg>
                </span>
                <span className="text-center leading-tight">
                  <strong className="block font-bold text-sm text-white">SMS</strong>
                  <em className="block font-semibold text-xs text-[#F4F4F4] opacity-90 not-italic">Help</em>
                </span>
              </button>
              
              <button
                onClick={() => handleEmergencyAction("loc")}
                className="flex flex-col items-center gap-3 p-2 bg-transparent border-0 cursor-pointer"
              >
                <span 
                  className="w-20 h-20 rounded-full flex items-center justify-center relative transition-all duration-200 md:hover:translate-y-[-2px] md:hover:scale-105"
                  style={{
                    background: '#666666',
                    boxShadow: '0 2px 8px rgba(43,43,43,0.16)'
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white opacity-95">
                    <path d="M12 22s7-6.27 7-12a7 7 0 1 0-14 0c0 5.73 7 12 7 12Z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="10" r="3" fill="currentColor"/>
                  </svg>
                </span>
                <span className="text-center leading-tight">
                  <strong className="block font-bold text-sm text-white">Share</strong>
                  <em className="block font-semibold text-xs text-[#F4F4F4] opacity-90 not-italic">Location</em>
                </span>
              </button>
              
              <button
                onClick={() => handleEmergencyAction("chat")}
                className="flex flex-col items-center gap-3 p-2 bg-transparent border-0 cursor-pointer"
              >
                <span 
                  className="w-20 h-20 rounded-full flex items-center justify-center relative transition-all duration-200 md:hover:translate-y-[-2px] md:hover:scale-105"
                  style={{
                    background: '#BB0000',
                    boxShadow: '0 2px 8px rgba(43,43,43,0.16)'
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white opacity-95">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </span>
                <span className="text-center leading-tight">
                  <strong className="block font-bold text-sm text-white">Emergency</strong>
                  <em className="block font-semibold text-xs text-[#F4F4F4] opacity-90 not-italic">Chat</em>
                </span>
              </button>
              
              <button
                onClick={() => handleEmergencyAction("collective")}
                className="flex flex-col items-center gap-3 p-2 bg-transparent border-0 cursor-pointer"
              >
                <span
                  className="w-20 h-20 rounded-full flex items-center justify-center relative transition-all duration-200 md:hover:translate-y-[-2px] md:hover:scale-105"
                  style={{
                    background: '#666666',
                    boxShadow: '0 2px 8px rgba(43,43,43,0.16)'
                  }}
                >
                  <Users className="w-7 h-7 text-white opacity-95" />
                </span>
                <span className="text-center leading-tight">
                  <strong className="block font-bold text-sm text-white">The</strong>
                  <em className="block font-semibold text-xs text-[#F4F4F4] opacity-90 not-italic">Collective</em>
                </span>
              </button>

              <button
                onClick={() => handleEmergencyAction("healing")}
                className="flex flex-col items-center gap-3 p-2 bg-transparent border-0 cursor-pointer"
              >
                <span
                  className="w-20 h-20 rounded-full flex items-center justify-center relative transition-all duration-200 md:hover:translate-y-[-2px] md:hover:scale-105"
                  style={{
                    background: '#BB0000',
                    boxShadow: '0 2px 8px rgba(43,43,43,0.16)'
                  }}
                >
                  <Heart className="w-7 h-7 text-white opacity-95" />
                </span>
                <span className="text-center leading-tight">
                  <strong className="block font-bold text-sm text-white">Healing</strong>
                  <em className="block font-semibold text-xs text-[#F4F4F4] opacity-90 not-italic">Hub</em>
                </span>
              </button>

              <button
                onClick={() => handleEmergencyAction("exit")}
                className="flex flex-col items-center gap-3 p-2 bg-transparent border-0 cursor-pointer"
              >
                <span 
                  className="w-20 h-20 rounded-full flex items-center justify-center relative transition-all duration-200 md:hover:translate-y-[-2px] md:hover:scale-105"
                  style={{
                    background: '#2B2B2B',
                    boxShadow: '0 2px 8px rgba(43,43,43,0.16)'
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white opacity-95">
                    <path d="M10 3h6a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-6" stroke="currentColor" strokeWidth="2"/>
                    <path d="M13 12H4m0 0 3-3M4 12l3 3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </span>
                <span className="text-center leading-tight">
                  <strong className="block font-bold text-sm text-white">Quick</strong>
                  <em className="block font-semibold text-xs text-[#F4F4F4] opacity-90 not-italic">Exit</em>
                </span>
              </button>
            </div>
            
            <div className="text-center mt-4 pt-3">
              <p className="text-xs text-gray-400 leading-relaxed">
                Long-press the red pill to auto-dial • Triple-tap to hide the label
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Keyframes always present */}
      <style>{`
        @keyframes slideInUp {
          0%   { opacity: 0; transform: translateY(20px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>

      {/* Body padding for crisis bar */}
      {isTopBarVisible && (
        <style>{`
          body { padding-top: 52px !important; }
          @media (max-width: 480px) { body { padding-top: 64px !important; } }
        `}</style>
      )}

      {/* AI Resource Discovery Modal */}
      {showAIDiscovery && (
        <AIResourceDiscovery 
          isOpen={showAIDiscovery} 
          onClose={() => setShowAIDiscovery(false)} 
        />
      )}
    </>
  );
};