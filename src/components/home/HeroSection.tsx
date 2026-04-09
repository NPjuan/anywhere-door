'use client';

import { useEffect, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LINES = [
  { title: '任意门',       sub: '打开任意门，寻找你的世界' },
  { title: 'Anywhere Door', sub: 'Open the door, find your world' },
  { title: 'どこでもドア',  sub: 'どこでもドアで、夢の旅へ出発！' },
  { title: 'Porte Magique', sub: 'Ouvre la porte, explore le monde' },
  { title: '어디든 문',    sub: '이 문을 열면, 꿈의 여행이 시작돼' },
  { title: 'Puerta Mágica', sub: 'Abre la puerta, vive la aventura' },
  { title: 'Porta Magica',  sub: 'Ogni porta apre un nuovo viaggio' },
];

export const HeroSection = memo(() => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % LINES.length);
    }, 2800);
    return () => clearInterval(t);
  }, []);

  const current = LINES[idx];

  return (
    <div className="text-center py-8 md:py-10">
      <h1
        className="font-black"
        style={{ fontSize: 'clamp(2.8rem, 10vw, 5rem)', lineHeight: 1.15 }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={idx}
            className="hero-title-text"
            initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0,  filter: 'blur(0px)' }}
            exit={{    opacity: 0, y: -12, filter: 'blur(8px)' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'inline-block' }}
          >
            {current.title}
          </motion.span>
        </AnimatePresence>
      </h1>

      {/* 同步轮播副标题 */}
      <div className="mt-2" style={{ height: 24 }}>
        <AnimatePresence mode="wait">
          <motion.p
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0, y: -6 }}
            transition={{ duration: 0.4, delay: 0.05, ease: 'easeInOut' }}
            className="text-sm"
            style={{ color: '#94A3B8', lineHeight: 1.6 }}
          >
            {current.sub}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
});

HeroSection.displayName = 'HeroSection';
