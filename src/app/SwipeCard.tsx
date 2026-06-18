'use client';

import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Star, Info, X, Heart, UtensilsCrossed } from 'lucide-react';

interface SwipeCardProps {
  restaurant: any;
  onSwipe: (direction: 'left' | 'right') => void;
}

export default function SwipeCard({ restaurant, onSwipe }: SwipeCardProps) {
  const [showInfo, setShowInfo] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  
  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) onSwipe('right');
    else if (info.offset.x < -100) onSwipe('left');
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <motion.div
        style={{ x, rotate, opacity }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        className="relative w-full max-w-sm aspect-[3/4] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing border-4 border-white"
      >
        {/* Background Image */}
        <img 
          src={restaurant.image} 
          alt={restaurant.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-[#FFB800] text-[#FF4D00] text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  {restaurant.distance}
                </span>
                <div className="flex items-center text-[#FFB800]">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="text-xs font-bold ml-1">{restaurant.rating}</span>
                </div>
              </div>
              <h2 className="text-3xl font-black uppercase italic leading-none tracking-tighter">
                {restaurant.name}
              </h2>
            </div>
            <button 
              onClick={() => setShowInfo(!showInfo)}
              className="p-3 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 transition-colors"
            >
              <Info className="w-6 h-6" />
            </button>
          </div>

          {/* Profile Details (Toggled) */}
          {showInfo && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 pt-4 border-t border-white/20 space-y-4"
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#FFB800] mb-2">Must Try Dishes</p>
                <div className="flex flex-wrap gap-2">
                  {restaurant.dishes.map((dish: string) => (
                    <span key={dish} className="text-xs bg-white/10 px-3 py-1 rounded-lg border border-white/10">{dish}</span>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <Review snippet={restaurant.reviews.high} label="The Good" color="text-green-400" />
                <Review snippet={restaurant.reviews.mid} label="The Mid" color="text-yellow-400" />
                <Review snippet={restaurant.reviews.low} label="The Critical" color="text-red-400" />
              </div>
            </motion.div>
          )}
        </div>

        {/* Visual Indicators */}
        <motion.div 
          style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
          className="absolute top-10 left-10 border-4 border-green-500 rounded-xl px-4 py-2 rotate-[-20deg] pointer-events-none"
        >
          <span className="text-green-500 text-4xl font-black uppercase tracking-tighter">YUM</span>
        </motion.div>
        <motion.div 
          style={{ opacity: useTransform(x, [0, -100], [0, 1]) }}
          className="absolute top-10 right-10 border-4 border-red-500 rounded-xl px-4 py-2 rotate-[20deg] pointer-events-none"
        >
          <span className="text-red-500 text-4xl font-black uppercase tracking-tighter">NAH</span>
        </motion.div>
      </motion.div>
    </div>
  );
}

function Review({ snippet, label, color }: { snippet: string, label: string, color: string }) {
  return (
    <div className="bg-black/40 p-3 rounded-2xl border border-white/5">
      <div className={`text-[9px] font-black uppercase mb-1 ${color}`}>{label}</div>
      <p className="text-xs leading-tight italic text-white/90">"{snippet}"</p>
    </div>
  );
}