'use client';

import { useEffect, useRef } from 'react';

export default function TubesCursor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<any>(null);
  
  useEffect(() => {
    let active = true;

    const initCursor = async () => {
      try {
        // Bypass next.js bundler to natively load the ES module from the CDN
        const dynamicImport = new Function('url', 'return import(url)');
        const module = await dynamicImport('https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js');
        const TubesCursor = module.default;

        if (active && containerRef.current && !cursorRef.current) {
          // Initialize the cursor using the default export function
          cursorRef.current = TubesCursor(containerRef.current, {
             color1: '#2563EB',
             color2: '#7c3aed',
             lightIntensity: 180
          });
        }
      } catch (err) {
        console.error("TubesCursor failed to load:", err);
      }
    };

    initCursor();

    return () => {
      active = false;
      if (cursorRef.current && cursorRef.current.dispose) {
        cursorRef.current.dispose();
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      cursorRef.current = null;
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 pointer-events-none z-0" 
    />
  );
}
