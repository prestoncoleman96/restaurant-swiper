'use client';

import { useEffect, useState, useCallback } from "react"; // Removed useMemo
import { useParams } from "next/navigation";
import { Utensils, Users, Share2, Play, CheckCircle2, Navigation, AlertTriangle, HelpCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SwipeCard from "@/app/SwipeCard";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";

interface Session {
  id: string;
  zip_code: string;
  session_type: 'discovery' | 'preference';
  match_logic: 'unanimous' | 'majority';
  is_active: boolean;
  is_async: boolean;
  open_now: boolean;
  results_revealed: boolean;
}

interface Participant {
  id: string;
  session_id: string;
  guest_name: string;
}

interface Vote {
  id: string;
  session_id: string;
  participant_id: string;
  restaurant_id: string;
  vote_type: 'like' | 'dislike' | 'not_been_here' | 'been_here' | 'star';
}

interface Restaurant {
  id: string;
  name: string;
  image: string;
  rating: number;
  distance: string;
  reviews: { high: string; mid: string; low: string };
  dishes: string[];
}

export default function SessionRoom() {
  const params = useParams();
  const sessionId = params?.id as string;

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<'waiting' | 'swiping' | 'finished'>('waiting');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(true);
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const [winner, setWinner] = useState<Restaurant | null>(null);
  const [hasUsedStar, setHasUsedStar] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [potentialWinners, setPotentialWinners] = useState<Restaurant[]>([]);

  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const calculateWinner = useCallback(async () => {
    const { data: allVotes } = await supabase
      .from('votes')
      .select('*')
      .eq('session_id', sessionId);

    if (!allVotes) return;

    const participantCount = participants.length;
    const threshold = sessionData?.match_logic === 'unanimous' ? participantCount : Math.ceil(participantCount / 2);
    const positiveType = sessionData?.session_type === 'discovery' ? 'not_been_here' : 'like';

    const counts: Record<string, number> = {};
    allVotes.forEach((vote: Vote) => {
      const weight = vote.vote_type === 'star' ? 2 : 1;
      if (vote.vote_type === positiveType || vote.vote_type === 'star') {
        counts[vote.restaurant_id] = (counts[vote.restaurant_id] || 0) + weight;
      }
    });

    const matches = Object.entries(counts)
      .filter(([, count]) => count >= threshold);

    if (matches.length === 0) {
      // If unanimity failed, gather top 3 for the "Undecided?!" fallback
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
      const top3 = sorted.map(([id]) => restaurants.find(r => r.id === id)).filter(Boolean) as Restaurant[];
      setPotentialWinners(top3);
      setWinner(null);
      return;
    }

    // Find Max Score
    const maxScore = Math.max(...matches.map(([, count]) => count));
    const contenders = matches
      .filter(([, count]) => count === maxScore)
      .map(([id]) => id);

    // Random Tiebreaker
    const winningId = contenders[Math.floor(Math.random() * contenders.length)];

    const win = restaurants.find(r => r.id === winningId);
    if (win) {
      triggerHaptic([100, 50, 100]);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF4D00', '#FFB800', '#ffffff']
      });
    }
    setWinner(win || null);
  }, [sessionId, participants, sessionData, restaurants]);

  useEffect(() => {
    if (!sessionId) return;

    const initSession = async () => {
      // Listen for session changes (Reveal / Start)
      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (session) {
        setSessionData(session);
        // fetchRestaurants will be called after currentParticipantId is determined, or if no participantId is found
        if (session.is_active || session.is_async) setView('swiping');
        if (session.results_revealed) setView('finished');
      }
      
      const { data } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionId);
      
      if (data) setParticipants(data);
      
      // Check localStorage for an existing participant ID for this session
      const savedId = localStorage.getItem(`munch_match_participant_${sessionId}`);
      if (savedId) {
        setCurrentParticipantId(savedId);
        setHasJoined(true);
        // If a savedId exists, fetch restaurants and recover progress using that ID
        if (session) await fetchRestaurants(session, savedId); 
      }
    };

    const fetchRestaurants = async (session: Session, participantIdForRecovery: string | null) => {
      try {
        const res = await fetch(`/api/restaurants?zipCode=${session.zip_code}&openNow=${session.open_now}&radius=${session.radius}&priceLevels=${session.price_levels?.join(',') || ''}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          console.log("Setting restaurants:", data.length); // Added for debugging
          setRestaurants(data);
          
          // Recover progress if user has already joined
          if (participantIdForRecovery && data.length > 0) { // Only recover if there are restaurants
            const { count } = await supabase
              .from('votes')
              .select('*', { count: 'exact', head: true })
              .match({ participant_id: participantIdForRecovery, session_id: sessionId });
            if (count) {
              console.log("Recovered progress, setting currentIndex to:", count); // Added for debugging
              setCurrentIndex(count);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load restaurants", err);
      } finally {
        setIsLoadingRestaurants(false);
      }
    };
    
    // Initial fetch of restaurants if no participantId is found initially, or if sessionData changes
    // This ensures restaurants are loaded even if the user hasn't joined yet or has no saved ID.
    if (sessionData && !localStorage.getItem(`munch_match_participant_${sessionId}`)) fetchRestaurants(sessionData, null);
    
    initSession();

    // Keyboard Listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view !== 'swiping') return;
      if (e.key === 'ArrowLeft') handleSwipe('left');
      if (e.key === 'ArrowRight') handleSwipe('right');
      if (e.key === 'ArrowUp' && !hasUsedStar) handleSwipe('star');
    };
    window.addEventListener('keydown', handleKeyDown);

    // Progress Syncing
    const syncProgress = async () => {
      const { data: votes } = await supabase.from('votes').select('participant_id').eq('session_id', sessionId);
      const counts: any = {};
      votes?.forEach(v => counts[v.participant_id] = (counts[v.participant_id] || 0) + 1);
      setProgress(counts);
    };
    syncProgress();

    const channel = supabase
      .channel(`session_room_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'participants', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setParticipants((current) => [...current, payload.new as Participant]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes', filter: `session_id=eq.${sessionId}` },
        () => syncProgress()
      )
      .subscribe();

    const sessionChannel = supabase
      .channel(`session_updates_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          const update = payload.new as Session;
          if (update.results_revealed) {
            setView('finished');
            calculateWinner();
          } else if (update.is_active === true && view === 'waiting') {
            setView('swiping');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(sessionChannel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [sessionId, view, currentParticipantId, calculateWinner, hasUsedStar, sessionData]);

  const handleJoin = async () => {
    if (!guestName.trim()) return;

    const { data, error } = await supabase.from('participants').insert([
      { session_id: sessionId, guest_name: guestName }
    ]).select().single();

    if (!error && data) {
      localStorage.setItem(`munch_match_participant_${sessionId}`, data.id);
      setCurrentParticipantId(data.id);
      
      // Check for star usage
      const { data: starVote } = await supabase
        .from('votes')
        .select('*')
        .match({ participant_id: data.id, vote_type: 'star' });
      if (starVote && starVote.length > 0) setHasUsedStar(true);

      setHasJoined(true);
      // After joining, fetch restaurants and recover progress
      if (sessionData && data) { // Ensure data is available from the insert
        await fetchRestaurants(sessionData, data.id);
      }
    }
  };

  const handleStartSwiping = async () => {
    await supabase.from('sessions').update({ is_active: true }).eq('id', sessionId);
    setView('swiping');
  };

  const handleRevealResults = async () => {
    await supabase.from('sessions').update({ results_revealed: true }).eq('id', sessionId);
  };

  const handleSwipe = async (direction: 'left' | 'right' | 'star') => {
    if (restaurants.length === 0 || !currentParticipantId) return;

    const restaurant = restaurants[currentIndex];

    // Double-vote prevention
    const { count } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .match({ participant_id: currentParticipantId, restaurant_id: restaurant.id });

    if (count && count > 0) return;

    let voteType: Vote['vote_type'];
    if (direction === 'star') {
      voteType = 'star';
      triggerHaptic(150);
      setHasUsedStar(true);
    } else if (sessionData?.session_type === 'discovery') {
      voteType = direction === 'right' ? 'not_been_here' : 'been_here';
    } else {
      voteType = direction === 'right' ? 'like' : 'dislike';
    }

    if (currentParticipantId) {
      await supabase.from('votes').insert([{
        session_id: sessionId,
        participant_id: currentParticipantId,
        restaurant_id: restaurant.id,
        vote_type: voteType
      }]);
    }

    setCurrentIndex(prev => prev + 1);
    
    if (currentIndex >= restaurants.length - 1) {
      // If async, we just wait. If live, we wait for reveal.
      if (!sessionData?.is_async) {
        calculateWinner(); // Local preview for host, or wait for reveal signal
      }
      setView('waiting'); // Show waiting for others screen
    }
  };

  const copyLink = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Munch Match Squad',
          text: `Join my ${sessionData?.session_type} squad and let's find somewhere to eat!`,
          url: url,
        });
        return;
      } catch (err) {
        console.log("Share cancelled or failed", err);
      }
    }

    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!hasJoined) {
    return (
      <div className="flex flex-col min-h-screen bg-[#FF4D00] text-white items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/20 text-center">
          <h2 className="text-3xl font-black uppercase italic">Join the Group</h2>
          <p className="text-white/80">Enter your name to start matching with your friends!</p>
          <input
            type="text"
            placeholder="Your Name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full bg-white text-black py-4 px-6 rounded-2xl font-bold text-lg focus:ring-4 focus:ring-[#FFB800] outline-none"
          />
          <button
            onClick={handleJoin}
            className="w-full bg-white text-[#FF4D00] py-4 rounded-2xl font-black text-xl uppercase tracking-tighter shadow-xl hover:bg-[#FFB800] transition-all"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  if (isLoadingRestaurants) {
    return (
      <div className="flex flex-col min-h-screen bg-[#FF4D00] text-white items-center justify-center p-6 text-center font-black uppercase italic tracking-tighter">
        <Utensils className="w-12 h-12 animate-spin mb-4" />
        Finding Food...
      </div>
    );
  }

  if (view === 'finished') {
    return (
      <div className="flex flex-col min-h-screen bg-[#FF4D00] text-white p-6">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2"><div className="bg-white p-2 rounded-full"><Utensils className="w-6 h-6 text-[#FF4D00]" /></div><span className="font-black italic uppercase tracking-tighter text-xl">Munch Match</span></div>
          <button onClick={copyLink} className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors flex items-center gap-2">
            {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Share2 className="w-5 h-5" />}
            <span className="text-xs font-bold uppercase">{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </header>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-sm mx-auto space-y-8 bg-white/10 p-10 rounded-[3rem] backdrop-blur-md border border-white/20">
          <div className="bg-[#FFB800] w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-2xl">
            <Utensils className="w-10 h-10 text-[#FF4D00]" />
          </div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">It&apos;s a Match!</h1>
          <div className="space-y-2">
            <p className="text-white/60 font-bold uppercase tracking-widest text-xs">You should head to:</p>
            <h2 className="text-5xl font-black uppercase italic text-[#FFB800] leading-none">{winner.name}</h2>
          </div>
          <button 
            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(winner.name)}&query_place_id=${winner.id}`, '_blank')}
            className="w-full bg-[#FFB800] text-[#FF4D00] py-4 rounded-2xl font-black text-xl uppercase flex items-center justify-center gap-2"
          >
            <Navigation className="w-6 h-6" /> Get Directions
          </button>
          <button onClick={() => typeof window !== 'undefined' && window.location.reload()} className="w-full bg-white text-[#FF4D00] py-4 rounded-2xl font-black text-xl uppercase tracking-tighter">Try Again</button>
        </motion.div>
      </div>
    );
  }

  if (view === 'finished' && !winner && potentialWinners.length > 0) {
    return (
      <div className="flex flex-col min-h-screen bg-[#FF4D00] text-white p-6 text-center">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto space-y-6">
          <AlertTriangle className="w-16 h-16 text-[#FFB800]" />
          <h1 className="text-5xl font-black italic uppercase leading-tight tracking-tighter">Undecided?!</h1>
          <p className="text-white/80 font-bold">Unanimity failed. Here are the top contenders. Pick one fast!</p>
          
          <div className="w-full space-y-4">
            {potentialWinners.map((p) => (
              <button 
                key={p.id}
                onClick={() => setWinner(p)}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 p-6 rounded-3xl text-left flex justify-between items-center group"
              >
                <span className="text-2xl font-black italic uppercase group-hover:text-[#FFB800] transition-colors">{p.name}</span>
                <HelpCircle className="w-6 h-6 text-white/40" />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'swiping') {
    return (
      <div className="flex flex-col min-h-screen bg-[#FF4D00] overflow-hidden">
        <header className="p-6 flex justify-between items-center z-20">
          <div className="flex items-center gap-2"><div className="bg-white p-2 rounded-full"><Utensils className="w-4 h-4 text-[#FF4D00]" /></div><span className="font-black italic uppercase tracking-tighter text-white">Munch Match</span></div>
          <div className="flex items-center gap-4">
            <button onClick={copyLink} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors flex items-center gap-2">
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
              <span className="text-[10px] font-bold uppercase">{copied ? 'Copied!' : 'Share'}</span>
            </button>
            <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">{currentIndex + 1} / {restaurants.length}</div>
          </div>
        </header>
        <div className="flex-1 relative flex items-center justify-center">
          <AnimatePresence>
            <SwipeCard 
              key={restaurants[currentIndex].id} 
              restaurant={restaurants[currentIndex]} 
              onSwipe={handleSwipe} 
              hasUsedStar={hasUsedStar}
            />
          </AnimatePresence>
        </div>
        <div className="p-10 flex justify-center items-center gap-8 z-10">
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FF4D00] text-white p-6">
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-2"><div className="bg-white p-2 rounded-full"><Utensils className="w-6 h-6 text-[#FF4D00]" /></div><span className="font-black italic uppercase tracking-tighter text-xl">Munch Match</span></div>
        <button onClick={copyLink} className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors flex items-center gap-2">
          {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Share2 className="w-5 h-5" />}
          <span className="text-xs font-bold uppercase">{copied ? 'Copied!' : 'Share'}</span>
        </button>
      </header>
      <main className="flex-1 max-w-md mx-auto w-full space-y-8">
        <div className="text-center"><h1 className="text-4xl font-black uppercase italic mb-2 tracking-tighter">Waiting Room</h1><p className="text-white/60 font-medium">Invite your friends. When everyone is here, start the match!</p></div>
        <div className="bg-white/10 rounded-3xl p-6 border border-white/20 min-h-[300px]">
          <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#FFB800]" />
              <h3 className="font-black uppercase tracking-widest text-sm">Squad ({participants.length})</h3>
            </div>
            <span className="text-[10px] font-black uppercase text-white/40">Progress</span>
          </div>
          <ul className="space-y-4">
            {participants.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#FFB800] rounded-full flex items-center justify-center font-black text-[#FF4D00]">{p.guest_name ? p.guest_name[0].toUpperCase() : '?'}</div>
                  <span className="font-bold text-lg">{p.guest_name} {i === 0 && <span className="text-[10px] bg-white/20 px-2 py-1 rounded-full ml-2 uppercase">Host</span>}</span>
                </div>
                <div className="text-xs font-black text-[#FFB800]">
                  {progress[p.id] || 0}/{restaurants.length}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {currentIndex >= restaurants.length && !sessionData?.results_revealed && (
           <div className="text-center p-4 bg-white/10 rounded-2xl border border-[#FFB800]">
              <p className="font-black italic uppercase text-[#FFB800]">You&apos;re done swiping!</p>
              <p className="text-xs text-white/60 uppercase">Waiting for the host to reveal results...</p>
           </div>
        )}

        {/* Desktop-Friendly Share Section */}
        <div className="bg-white/5 rounded-3xl p-4 border border-white/10 flex flex-col gap-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Invite Link</p>
          <div className="flex gap-2">
            <div className="flex-1 bg-black/20 rounded-xl px-4 py-3 text-xs font-mono truncate text-white/60 border border-white/5">
              {typeof window !== 'undefined' ? window.location.href : 'Loading...'}
            </div>
            <button 
              onClick={copyLink}
              className="bg-white text-[#FF4D00] px-4 rounded-xl font-bold text-xs uppercase hover:bg-[#FFB800] transition-colors"
            >
              {copied ? 'Saved!' : 'Copy'}
            </button>
          </div>
        </div>

        {participants[0]?.id === currentParticipantId && !sessionData?.is_active && !sessionData?.is_async && (
           <button onClick={handleStartSwiping} disabled={participants.length === 0} className="w-full bg-[#FFB800] text-[#FF4D00] py-6 rounded-3xl font-black text-2xl uppercase tracking-tighter shadow-2xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"><Play className="w-8 h-8 fill-current" />Start Swiping</button>
        )}
        {participants[0]?.id === currentParticipantId && (sessionData?.is_active || sessionData?.is_async) && !sessionData?.results_revealed && (
           <button onClick={handleRevealResults} className="w-full bg-white text-[#FF4D00] py-6 rounded-3xl font-black text-2xl uppercase tracking-tighter shadow-2xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-3"><CheckCircle2 className="w-8 h-8" />Reveal Results</button>
        )}
      </main>
    </div>
  );
}
