'use client';

import { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  // Position state for the ring (lerped)
  const [ringPos, setRingPos] = useState({ x: -100, y: -100 });
  const [dotPos, setDotPos] = useState({ x: -100, y: -100 });
  
  // Real mouse position
  const mousePos = useRef({ x: -100, y: -100 });
  const requestRef = useRef<number>(0);
  const isHovering = useRef(false);

  useEffect(() => {
    // Hide default cursor across the document
    document.body.style.cursor = 'none';

    const onMouseMove = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
      setDotPos({ x: e.clientX, y: e.clientY });
    };

    const updateRingPosition = () => {
      setRingPos((prev) => {
        // Easing / Lerp factor for smooth lag
        const lerpFactor = 0.15;
        const targetX = mousePos.current.x;
        const targetY = mousePos.current.y;

        const newX = prev.x + (targetX - prev.x) * lerpFactor;
        const newY = prev.y + (targetY - prev.y) * lerpFactor;

        return { x: newX, y: newY };
      });

      requestRef.current = requestAnimationFrame(updateRingPosition);
    };

    // Add event listeners for hover state
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if hovering over clickable elements
      if (
        window.getComputedStyle(target).cursor === 'pointer' ||
        target.tagName.toLowerCase() === 'a' ||
        target.tagName.toLowerCase() === 'button' ||
        target.closest('a') ||
        target.closest('button')
      ) {
        if (!isHovering.current) {
          isHovering.current = true;
          if (ringRef.current && dotRef.current) {
            ringRef.current.style.transform = 'translate(-50%, -50%) scale(1.5)';
            ringRef.current.style.borderColor = '#7c3aed';
            ringRef.current.style.boxShadow = '0 0 15px rgba(124, 58, 237, 0.4)';
            dotRef.current.style.background = '#7c3aed';
          }
        }
      } else {
        if (isHovering.current) {
          isHovering.current = false;
          if (ringRef.current && dotRef.current) {
            ringRef.current.style.transform = 'translate(-50%, -50%) scale(1)';
            ringRef.current.style.borderColor = '#2563EB';
            ringRef.current.style.boxShadow = '0 0 15px rgba(37, 99, 235, 0.4)';
            dotRef.current.style.background = '#2563EB';
          }
        }
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    requestRef.current = requestAnimationFrame(updateRingPosition);

    return () => {
      document.body.style.cursor = 'auto';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {/* Outer Ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 h-10 w-10 rounded-full border-2 border-blue-600 transition-transform duration-200 ease-out"
        style={{
          transform: 'translate(-50%, -50%) scale(1)',
          left: `${ringPos.x}px`,
          top: `${ringPos.y}px`,
          boxShadow: '0 0 15px rgba(37, 99, 235, 0.4)',
        }}
      />
      {/* Inner Dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 h-2.5 w-2.5 rounded-full bg-blue-600 transition-colors duration-200"
        style={{
          transform: 'translate(-50%, -50%)',
          left: `${dotPos.x}px`,
          top: `${dotPos.y}px`,
          boxShadow: '0 0 10px rgba(255, 255, 255, 0.8)',
        }}
      />
    </div>
  );
}
