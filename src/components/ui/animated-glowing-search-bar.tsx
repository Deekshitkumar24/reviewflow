'use client';

import React, { forwardRef } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface AnimatedGlowingSearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isSearching?: boolean;
}

export const AnimatedGlowingSearchBar = forwardRef<HTMLInputElement, AnimatedGlowingSearchBarProps>(
  ({ className = '', isSearching = false, ...props }, ref) => {
    return (
      <div className={`relative group w-full ${className}`}>
        {/* Glowing Animated Border - Only intense on focus */}
        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-focus-within:opacity-50 transition-opacity duration-300 blur" />
        
        {/* Actual Input Container */}
        <div className="relative flex items-center h-10 w-full min-w-[240px] md:w-64 lg:w-96 rounded-xl bg-[#111] overflow-hidden border border-white/10 group-focus-within:border-white/20 transition-colors">
          <div className="flex-shrink-0 pl-3 flex items-center justify-center">
            {isSearching ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
              />
            ) : (
              <Search className="w-4 h-4 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
            )}
          </div>
          <input
            ref={ref}
            className="w-full bg-transparent text-sm text-white px-3 py-2 outline-none placeholder:text-gray-500"
            spellCheck="false"
            autoComplete="off"
            {...props}
          />
          <div className="flex-shrink-0 pr-3 flex items-center">
            <kbd className="hidden sm:inline-block text-[10px] font-medium text-gray-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded transition-opacity group-focus-within:opacity-0 pointer-events-none">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>
    );
  }
);

AnimatedGlowingSearchBar.displayName = 'AnimatedGlowingSearchBar';
