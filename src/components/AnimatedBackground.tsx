/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from "react";
import { useTheme } from "./ThemeContext";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export default function AnimatedBackground() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Determine size and density of particles on resize
      const isMobile = window.innerWidth < 768;
      const targetCount = isMobile ? 15 : 45;

      if (particles.current.length === 0) {
        // Initialize particles
        const list: Particle[] = [];
        for (let i = 0; i < targetCount; i++) {
          list.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * (isMobile ? 0.3 : 0.6),
            vy: (Math.random() - 0.5) * (isMobile ? 0.3 : 0.6),
            radius: Math.random() * 2 + 1,
          });
        }
        particles.current = list;
      } else {
        // Adjust array size dynamically
        if (particles.current.length > targetCount) {
          particles.current = particles.current.slice(0, targetCount);
        } else if (particles.current.length < targetCount) {
          const needed = targetCount - particles.current.length;
          for (let i = 0; i < needed; i++) {
            particles.current.push({
              x: Math.random() * canvas.width,
              y: Math.random() * canvas.height,
              vx: (Math.random() - 0.5) * (isMobile ? 0.3 : 0.6),
              vy: (Math.random() - 0.5) * (isMobile ? 0.3 : 0.6),
              radius: Math.random() * 2 + 1,
            });
          }
        }

        // Clamp positions to the new canvas size to keep them in-bounds
        particles.current.forEach((p) => {
          if (p.x > canvas.width) p.x = Math.random() * canvas.width;
          if (p.y > canvas.height) p.y = Math.random() * canvas.height;
          if (p.x < 0) p.x = Math.random() * canvas.width;
          if (p.y < 0) p.y = Math.random() * canvas.height;
        });
      }
    };

    // Set initial size
    handleResize();

    window.addEventListener("resize", handleResize);

    let animationFrameId: number;

    const render = () => {
      const isMobile = window.innerWidth < 768;
      const currentMaxLineLength = isMobile ? 80 : 150;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const list = particles.current;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off bounds and keep strictly inside canvas boundaries
        if (p.x < 0) {
          p.x = 0;
          p.vx *= -1;
        } else if (p.x > canvas.width) {
          p.x = canvas.width;
          p.vx *= -1;
        }

        if (p.y < 0) {
          p.y = 0;
          p.vy *= -1;
        } else if (p.y > canvas.height) {
          p.y = canvas.height;
          p.vy *= -1;
        }

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = theme === "dark" ? "rgba(239, 68, 68, 0.7)" : "rgba(0, 200, 83, 0.4)";
        ctx.fill();

        // Draw connecting lines to neighboring particles
        for (let j = i + 1; j < list.length; j++) {
          const p2 = list[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < currentMaxLineLength) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            const opacity = (1 - dist / currentMaxLineLength) * 0.25;
            ctx.strokeStyle = theme === "dark" 
              ? `rgba(239, 68, 68, ${opacity})` 
              : `rgba(0, 200, 83, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <div className="fixed inset-0 -z-50 pointer-events-none select-none overflow-hidden">
      {/* Base static background color */}
      <div
        className={`absolute inset-0 transition-colors duration-300 ${
          theme === "light" ? "bg-[#F0F7F0]" : "bg-[#000000]"
        }`}
      />

      {theme === "light" ? (
        <>
          {/* Light Mode Subtle Grid Texture Overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), 
                linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
              backgroundSize: "45px 45px",
              color: "#111827",
            }}
          />

          {/* Light Mode Decorative Static Radial Glows */}
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[150px] opacity-10 bg-slate-300 pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full blur-[150px] opacity-10 bg-slate-400 pointer-events-none" />
        </>
      ) : (
        <canvas
          ref={canvasRef}
          className="pointer-events-none"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            overflow: "hidden",
            maxWidth: "100vw",
            maxHeight: "100vh",
            zIndex: -40,
          }}
        />
      )}
    </div>
  );
}


