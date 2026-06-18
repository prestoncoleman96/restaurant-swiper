'use client';

import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from 'framer-motion';
import { Star, Info } from 'lucide-react'; 
import Image from 'next/image'; // Import Next.js Image component

interface Restaurant {
  id: string;
  name: string;
  image: string;
  rating: number;
  distance: string;
  reviews: { high: string; mid: string; low: string };
  dishes: string[];
}

interface SwipeCardProps {
  restaurant: Restaurant;
  onSwipe: (direction: 'left' | 'right') => void;
}

export default function SwipeCard({ restaurant, onSwipe }: SwipeCardProps) {
  const [showInfo, setShowInfo] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]); // Keep rotate for visual effect
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]); // Keep opacity for visual effect
  const yumOpacity = useTransform(x, [0, 100], [0, 1]);
  const nahOpacity = useTransform(x, [0, -100], [0, 1]);
  
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 100) onSwipe('right');
    else if (info.offset.x < -100) onSwipe('left');
  };

  return (
    <AnimatePresence>
      {!showInfo && ( // Only render the swipable card if details are not shown
        <motion.div
          key={restaurant.id} // Key is essential for AnimatePresence
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -50 }}
          style={{ x, rotate, opacity }} // Apply motion values for drag
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          className="absolute w-full max-w-sm aspect-[3/4] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing border-4 border-white"
        >
          {/* Background Image */}
          <Image 
            src={restaurant.image} 
            alt={restaurant.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority // Prioritize loading for the first few images
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
                onClick={() => setShowInfo(true)} // Toggle to show info
                className="p-3 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 transition-colors z-10"
              >
                <Info className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Visual Indicators */}
          <motion.div 
            style={{ opacity: yumOpacity }}
            className="absolute top-10 left-10 border-4 border-green-500 rounded-xl px-4 py-2 rotate-[-20deg] pointer-events-none"
          >
            <span className="text-green-500 text-4xl font-black uppercase tracking-tighter">YUM</span>
          </motion.div>
          <motion.div 
            style={{ opacity: nahOpacity }}
            className="absolute top-10 right-10 border-4 border-red-500 rounded-xl px-4 py-2 rotate-[20deg] pointer-events-none"
          >
            <span className="text-red-500 text-4xl font-black uppercase tracking-tighter">NAH</span>
          </motion.div>
        </motion.div>
      )}

      {showInfo && ( // Render details if showInfo is true
        <motion.div
          key={`${restaurant.id}-details`} // Unique key for details view
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: '0%' }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute inset-0 w-full max-w-sm aspect-[3/4] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden text-black flex flex-col justify-between p-8"
        >
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-4xl font-black uppercase italic mb-4 text-[#FF4D00]">{restaurant.name}</h3>
            <div className="flex items-center gap-2 text-xl font-semibold mb-4 text-gray-800">
              <Star className="w-6 h-6 text-[#FFB800] fill-current" /> {restaurant.rating}
            </div>
            
            <div className="mb-6">
              <p className="text-sm font-black uppercase tracking-widest text-gray-500 mb-2">Must Try Dishes</p>
              <div className="flex flex-wrap gap-2">
                {restaurant.dishes.map((dish: string) => (
                  <span key={dish} className="text-sm bg-gray-100 text-gray-800 px-3 py-1 rounded-full border border-gray-200">{dish}</span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Review snippet={restaurant.reviews.high} label="The Good" color="text-green-600" />
              <Review snippet={restaurant.reviews.mid} label="The Mid" color="text-yellow-600" />
              <Review snippet={restaurant.reviews.low} label="The Critical" color="text-red-600" />
            </div>
          </div>
          <button 
            onClick={() => setShowInfo(false)} 
            className="mt-6 w-full bg-[#FF4D00] text-white py-4 rounded-2xl font-black text-xl uppercase tracking-tighter shadow-lg hover:bg-[#FFB800] transition-all"
          >
            Back to Swiping
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Review({ snippet, label, color }: { snippet: string, label: string, color: string }) {
  return (
    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
      <div className={`text-xs font-black uppercase mb-1 ${color}`}>{label}</div>
      <p className="text-sm leading-tight italic text-gray-700">&quot;{snippet}&quot;</p>
    </div>
  );
}