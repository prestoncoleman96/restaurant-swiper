'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Utensils, Search, Heart, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [zipCode, setZipCode] = useState("");
  const [mode, setMode] = useState<"discovery" | "preference" | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateSession = async () => {
    if (!zipCode || zipCode.length < 5) {
      alert("Please enter a valid ZIP code first!");
      return;
    }
    
    setIsLoading(true);

    try {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert([{ 
          zip_code: zipCode, 
          session_type: mode,
          match_logic: 'unanimous' 
        }])
        .select()
        .single();

      if (sessionError) throw sessionError;

      const { error: participantError } = await supabase.from('participants').insert([{
        session_id: session.id,
        guest_name: 'Host'
      }]);

      if (participantError) throw participantError;

      router.push(`/session/${session.id}`);
    } catch (error: any) {
      console.error("Error creating session:", error);
      alert(`Error: ${error.message || "Make sure your Supabase tables are set up!"}`);
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