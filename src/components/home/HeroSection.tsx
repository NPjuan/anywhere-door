'use client';

import { useEffect, useState, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CN_SUBS = [
  '口袋里装着整个梦想，你想去何方',
  '心中有许多愿望，能够实现有多棒',
  '每天过的都一样，偶尔会突发奇想',
  '找传说的宝藏，冒险到远方',
]

const LINES = [
  { title: '任意门',        sub: null },
  { title: 'Anywhere Door', sub: 'Open the door, explore and soar' },
  { title: 'どこでもドア',     sub: 'どこでもドアで、どこへでもドア！' },
  { title: 'La Porte Magique', sub: 'Ouvre la porte, pars à l\'aventure' },
  { title: '어디로든 문',      sub: '문을 열면 세상이 열려, 어디로든 가자' },
];

export const HeroSection = memo(() => {
  const [idx, setIdx] = useState(0);
  const cnIdxRef = useRef(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => {
        const next = (i + 1) % LINES.length;
        if (LINES[next].sub === null) {
          cnIdxRef.current = (cnIdxRef.current + 1) % CN_SUBS.length;
        }
        return next;
      });
    }, 2800);
    return () => clearInterval(t);
  }, []);

  const current = LINES[idx];
  // cnIdxRef 在 setIdx updater 里同步更新，render 时已是最新值
  const sub = current.sub ?? CN_SUBS[cnIdxRef.current];

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
            {sub}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
});

HeroSection.displayName = 'HeroSection';
