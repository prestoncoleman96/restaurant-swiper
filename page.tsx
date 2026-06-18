'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Utensils, Users, Share2, Play, CheckCircle2, X, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SwipeCard from "@/app/SwipeCard";
import { AnimatePresence, motion } from "framer-motion";

export default function SessionRoom() {
  const params = useParams();
  const sessionId = params?.id as string;

  const [participants, setParticipants] = useState<any[]>([]);
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<'waiting' | 'swiping' | 'finished'>('waiting');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [restaurants, setRestaurants] = useState<any[]>(MOCK_RESTAURANTS);
  const [sessionData, setSessionData] = useState<any>(null);
  const [winner, setWinner] = useState<any>(null);

  useEffect(() => {
    if (!sessionId) return;

    const initSession = async () => {
      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (session) {
        setSessionData(session);
        if (session.is_active) setView('swiping');
      }

      const { data } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionId);
      
      if (data) setParticipants(data);
    };

    initSession();

    const channel = supabase
      .channel(`session_room_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'participants', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setParticipants((current) => [...current, payload.new]);
        }
      )
      .subscribe();

    const sessionChannel = supabase
      .channel(`session_updates_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          if (payload.new.is_active === true && view === 'waiting') {
            setView('swiping');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(sessionChannel);
    };
  }, [sessionId, view]);

  const handleJoin = async () => {
    if (!guestName.trim()) return;

    const { data, error } = await supabase.from('participants').insert([
      { session_id: sessionId, guest_name: guestName }
    ]).select().single();

    if (!error && data) {
      setCurrentParticipantId(data.id);
      setHasJoined(true);
    }
  };

  const handleStartSwiping = async () => {
    await supabase.from('sessions').update({ is_active: true }).eq('id', sessionId);
    setView('swiping');
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    const restaurant = restaurants[currentIndex];
    
    let voteType = '';
    if (sessionData?.session_type === 'discovery') {
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
      setView('finished');
      calculateWinner();
    }
  };

  const calculateWinner = async () => {
    const { data: allVotes } = await supabase
      .from('votes')
      .select('*')
      .eq('session_id', sessionId);

    if (!allVotes) return;

    const participantCount = participants.length;
    const threshold = sessionData?.match_logic === 'unanimous' ? participantCount : Math.ceil(participantCount / 2);
    const positiveType = sessionData?.session_type === 'discovery' ? 'not_been_here' : 'like';

    // Count positive votes per restaurant
    const counts: Record<string, number> = {};
    allVotes.forEach(vote => {
      if (vote.vote_type === positiveType) {
        counts[vote.restaurant_id] = (counts[vote.restaurant_id] || 0) + 1;
      }
    });

    // Find all restaurants that met the threshold
    const matches = Object.entries(counts)
      .filter(([_, count]) => count >= threshold)
      .map(([id]) => id);

    // Pick the winner (highest count, then random if tied)
    const winningId = matches.length > 0 
      ? matches.sort((a, b) => counts[b] - counts[a])[0] 
      : restaurants[0]?.id; // Fallback to first restaurant if no match found

    const win = restaurants.find(r => r.id === winningId);
    setWinner(win);
  };

  const copyLink = () => {
    const url = window.location.href;
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

  if (view === 'finished') {
    return (
      <div className="flex flex-col min-h-screen bg-[#FF4D00] text-white items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm space-y-8 bg-white/10 p-10 rounded-[3rem] backdrop-blur-md border border-white/20">
          <div className="bg-[#FFB800] w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-2xl">
            <Utensils className="w-10 h-10 text-[#FF4D00]" />
          </div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">It's a Match!</h1>
          <div className="space-y-2">
            <p className="text-white/60 font-bold uppercase tracking-widest text-xs">You should head to:</p>
            <h2 className="text-5xl font-black uppercase italic text-[#FFB800] leading-none">{winner?.name || "Loading..."}</h2>
          </div>
          <button onClick={() => window.location.reload()} className="w-full bg-white text-[#FF4D00] py-4 rounded-2xl font-black text-xl uppercase tracking-tighter">Try Again</button>
        </motion.div>
      </div>
    );
  }

  if (view === 'swiping') {
    return (
      <div className="flex flex-col min-h-screen bg-[#FF4D00] overflow-hidden">
        <header className="p-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-2"><div className="bg-white p-2 rounded-full"><Utensils className="w-4 h-4 text-[#FF4D00]" /></div><span className="font-black italic uppercase tracking-tighter text-white">Matching...</span></div>
          <div className="bg-white/20 px-4 py-1 rounded-full text-xs font-bold text-white uppercase tracking-widest">{currentIndex + 1} / {restaurants.length}</div>
        </header>
        <div className="flex-1 relative flex items-center justify-center">
          <AnimatePresence>{restaurants.slice(currentIndex, currentIndex + 1).map((restaurant) => (<SwipeCard key={restaurant.id} restaurant={restaurant} onSwipe={handleSwipe} />))}</AnimatePresence>
        </div>
        <div className="p-10 flex justify-center items-center gap-8 z-10">
          <button onClick={() => handleSwipe('left')} className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl text-red-500 hover:scale-110 transition-transform active:scale-90"><X className="w-8 h-8 stroke-[3]" /></button>
          <button onClick={() => handleSwipe('right')} className="w-20 h-20 bg-[#FFB800] rounded-full flex items-center justify-center shadow-xl text-[#FF4D00] hover:scale-110 transition-transform active:scale-90 border-4 border-white"><Heart className="w-10 h-10 fill-current" /></button>
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
          <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4"><Users className="w-5 h-5 text-[#FFB800]" /><h3 className="font-black uppercase tracking-widest text-sm">Squad ({participants.length})</h3></div>
          <ul className="space-y-4">
            {participants.map((p, i) => (
              <li key={p.id} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl"><div className="w-10 h-10 bg-[#FFB800] rounded-full flex items-center justify-center font-black text-[#FF4D00]">{p.guest_name ? p.guest_name[0].toUpperCase() : '?'}</div><span className="font-bold text-lg">{p.guest_name} {i === 0 && <span className="text-[10px] bg-white/20 px-2 py-1 rounded-full ml-2 uppercase">Host</span>}</span></li>
            ))}
          </ul>
        </div>
        <button onClick={handleStartSwiping} className="w-full bg-[#FFB800] text-[#FF4D00] py-6 rounded-3xl font-black text-2xl uppercase tracking-tighter shadow-2xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-3"><Play className="w-8 h-8 fill-current" />Start Swiping</button>
      </main>
    </div>
  );
}

const MOCK_RESTAURANTS = [
  {
    id: "1",
    name: "Burger Heaven",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop",
    rating: 4.8,
    distance: "0.4 mi",
    reviews: {
      high: "Best wagyu burger in the city. The truffle aioli is liquid gold.",
      mid: "Great food, but the line was wrapping around the block.",
      low: "Portion sizes are a bit small for the price point."
    },
    dishes: ["Wagyu Smash", "Truffle Fries", "Spiced Shake"]
  },
  {
    id: "2",
    name: "Taco Loco",
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=800&auto=format&fit=crop",
    rating: 4.5,
    distance: "1.2 mi",
    reviews: {
      high: "The Al Pastor tacos are authentic and incredibly juicy.",
      mid: "Solid tacos, but the salsa bar was a bit messy when I visited.",
      low: "Way too spicy even for the 'mild' options."
    },
    dishes: ["Al Pastor", "Street Corn", "Horchata"]
  }
];