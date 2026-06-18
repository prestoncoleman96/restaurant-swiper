'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Utensils, Search, Heart, MapPin, Users, CheckCircle2, Clock, Calendar, ChevronDown, ChevronUp, DollarSign, Navigation2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [zipCode, setZipCode] = useState("");
  const [hostName, setHostName] = useState("");
  const [mode, setMode] = useState<"discovery" | "preference" | null>(null);
  const [matchLogic, setMatchLogic] = useState<"unanimous" | "majority">("unanimous");
  const [radius, setRadius] = useState(5);
  const [priceLevels, setPriceLevels] = useState<number[]>([]);
  const [isAsync, setIsAsync] = useState(false);
  const [openNow, setOpenNow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const handleCreateSession = async () => {
    if (!zipCode || zipCode.length < 5 || !hostName.trim()) {
      alert("Please enter a ZIP code and your name!");
      return;
    }
    
    setIsLoading(true);

    // Runtime check for environment variables
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || url === 'undefined' || !anon || anon === 'undefined') {
      alert(
        "Missing Supabase Keys at Runtime!\n\n" +
        "1. Go to Vercel Settings -> Environment Variables.\n" +
        "2. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set correctly.\n" +
        "3. Check for leading/trailing spaces in the keys.\n" +
        "3. YOU MUST REDEPLOY the app for these to take effect."
      );
      setIsLoading(false);
      return;
    }

    try {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert([{ 
          zip_code: zipCode, 
          session_type: mode,
          match_logic: matchLogic,
          is_async: isAsync,
          open_now: openNow,
          radius: radius,
          price_levels: priceLevels
        }])
        .select()
        .single();

      if (sessionError) throw sessionError;

      const { error: participantError } = await supabase.from('participants').insert([{
        session_id: session.id,
        guest_name: hostName
      }]);

      if (participantError) throw participantError;

      console.log("Redirecting to session:", session.id);
      router.push(`/session/${session.id}`);
    } catch (error: unknown) {
      console.error("Session Creation Error:", error);
      
      // Extract as much info as possible from the Supabase error object
      const err = error as { message?: string; details?: string; hint?: string };
      const message = err.message || err.details || "An unknown error occurred.";
      const hint = err.hint ? `\nHint: ${err.hint}` : "";

      alert(`Database Error: ${message}${hint}\n\n1. Ensure your Supabase Env Vars are correct in Vercel.\n2. Ensure RLS is disabled in your Supabase SQL Editor.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FF4D00] text-white font-sans overflow-hidden">
      <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="mb-12">
          <div className="bg-white p-4 rounded-full inline-block shadow-2xl">
            <Utensils className="w-12 h-12 text-[#FF4D00]" />
          </div>
          <h1 className="text-5xl font-black mt-4 tracking-tighter italic uppercase">
            Munch Match
          </h1>
        </div>

        <div className="w-full max-w-sm space-y-8 bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/20">
          <div className="space-y-2 text-left">
            <label className="text-sm font-bold uppercase tracking-widest ml-1 text-white/80">Your Name</label>
            <input
              type="text"
              placeholder="e.g. Big Hungry"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              className="w-full bg-white text-black py-4 px-6 rounded-2xl font-bold text-lg focus:ring-4 focus:ring-[#FFB800] outline-none transition-all"
            />
          </div>

          <div className="space-y-2 text-left">
            <label className="text-sm font-bold uppercase tracking-widest ml-1 text-white/80">Where are we eating?</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FF4D00] w-5 h-5" />
              <input
                type="text"
                placeholder="Enter ZIP Code"
                maxLength={5}
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-white text-black py-4 pl-12 pr-4 rounded-2xl font-bold text-lg focus:ring-4 focus:ring-[#FFB800] outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-4 text-left">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-bold uppercase tracking-widest text-white/80 flex items-center gap-2">
                <Navigation2 className="w-4 h-4" /> Distance: {radius} miles
              </label>
            </div>
            <input 
              type="range" 
              min="3" 
              max="30" 
              value={radius} 
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#FFB800]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode("discovery")}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl border-4 transition-all ${
                mode === "discovery" 
                ? "border-[#FFB800] bg-[#FFB800] text-[#FF4D00] scale-105 shadow-lg" 
                : "border-white/20 bg-white/5 hover:bg-white/10"
              }`}
            >
              <Search className="w-8 h-8 mb-2" />
              <span className="font-black uppercase text-[10px]">New Discovery</span>
            </button>

            <button
              onClick={() => setMode("preference")}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl border-4 transition-all ${
                mode === "preference" 
                ? "border-[#FFB800] bg-[#FFB800] text-[#FF4D00] scale-105 shadow-lg" 
                : "border-white/20 bg-white/5 hover:bg-white/10"
              }`}
            >
              <Heart className="w-8 h-8 mb-2" />
              <span className="font-black uppercase text-[10px]">Pick a Place</span>
            </button>
          </div>

          <div className="space-y-3 text-left">
            <label className="text-sm font-bold uppercase tracking-widest ml-1 text-white/80 flex items-center gap-2">
              <Users className="w-4 h-4" /> Squad Rules
            </label>
            <div className="bg-white/5 rounded-2xl p-1 flex border border-white/10">
              <button
                onClick={() => setMatchLogic("unanimous")}
                className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-tighter transition-all flex items-center justify-center gap-2 ${
                  matchLogic === "unanimous" 
                  ? "bg-white text-[#FF4D00] shadow-md" 
                  : "text-white/60 hover:text-white"
                }`}
              >
                {matchLogic === "unanimous" && <CheckCircle2 className="w-3 h-3" />} Unanimous
              </button>
              <button
                onClick={() => setMatchLogic("majority")}
                className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-tighter transition-all flex items-center justify-center gap-2 ${
                  matchLogic === "majority" 
                  ? "bg-white text-[#FF4D00] shadow-md" 
                  : "text-white/60 hover:text-white"
                }`}
              >
                {matchLogic === "majority" && <CheckCircle2 className="w-3 h-3" />} Majority
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setIsAsync(!isAsync)}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                isAsync 
                ? "border-[#FFB800] bg-[#FFB800]/20 text-white" 
                : "border-white/10 bg-white/5 text-white/40"
              }`}
            >
              {isAsync ? <Calendar className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              <div className="text-left">
                <p className="text-[10px] font-black uppercase leading-none">Timing</p>
                <p className="text-[9px] font-bold">{isAsync ? "Async" : "Live"}</p>
              </div>
            </button>

            <button
              onClick={() => setOpenNow(!openNow)}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                openNow 
                ? "border-[#FFB800] bg-[#FFB800]/20 text-white" 
                : "border-white/10 bg-white/5 text-white/40"
              }`}
            >
              <Clock className="w-4 h-4" />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase leading-none">Filter</p>
                <p className="text-[9px] font-bold">{openNow ? "Open Now" : "Any Time"}</p>
              </div>
            </button>
          </div>

          <button
            onClick={handleCreateSession}
            disabled={!mode || zipCode.length < 5 || isLoading}
            className="w-full bg-white text-[#FF4D00] py-5 rounded-2xl font-black text-xl uppercase tracking-tighter shadow-xl hover:bg-[#FFB800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {isLoading ? "Creating..." : "Let's Swipe"}
          </button>
        </div>

        <p className="mt-12 text-white/60 text-sm font-medium">
          Finding the perfect spot, <br />
          <span className="text-white italic">one swipe at a time.</span>
        </p>
      </main>
    </div>
  );
}