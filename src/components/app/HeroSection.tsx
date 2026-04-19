'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Calendar, Users, FlaskConical, UserCheck, Trophy, Activity,
  BarChart3, ScrollText, Sparkles, MonitorSmartphone, Settings, Zap, CheckCircle2, ChevronRight, Blocks, ArrowRight,
  ShieldCheck, FastForward, Scale, XCircle, Mail, MessageSquare, MapPin
} from 'lucide-react';
import { RainbowButton } from '@/components/ui/RainbowButton';

/* ------------------------------------------------------------------ */
/*  Module data for Premium Slider                                    */
/* ------------------------------------------------------------------ */

interface ModuleItem {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const topRowModules: ModuleItem[] = [
  { id: 't1', name: 'Events', icon: <Calendar className="w-4 h-4" /> },
  { id: 't2', name: 'Teams', icon: <Users className="w-4 h-4" /> },
  { id: 't3', name: 'Labs', icon: <FlaskConical className="w-4 h-4" /> },
  { id: 't4', name: 'Users', icon: <UserCheck className="w-4 h-4" /> },
  { id: 't5', name: 'Settings', icon: <Settings className="w-4 h-4" /> },
  { id: 't6', name: 'Export', icon: <BarChart3 className="w-4 h-4" /> },
];

const bottomRowModules: ModuleItem[] = [
  { id: 'b1', name: 'Live Monitor', icon: <Activity className="w-4 h-4" /> },
  { id: 'b2', name: 'Smart Judging', icon: <CheckCircle2 className="w-4 h-4" /> },
  { id: 'b3', name: 'AI Review Assistant', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'b4', name: 'Results', icon: <Trophy className="w-4 h-4" /> },
  { id: 'b5', name: 'Audit Logs', icon: <ScrollText className="w-4 h-4" /> },
];

/* Duplicate items multiple times to ensure seamless infinite looping */
const buildLoop = (items: ModuleItem[]) => [
  ...items, ...items.map(i => ({...i, id: i.id+'_2'})), ...items.map(i => ({...i, id: i.id+'_3'}))
];

const topRowLoop = buildLoop(topRowModules);
const bottomRowLoop = buildLoop(bottomRowModules);

/* ------------------------------------------------------------------ */
/*  Pill Card for Slider                                               */
/* ------------------------------------------------------------------ */
function PillCard({ item, variant }: { item: ModuleItem; variant: 'muted' | 'sharp' }) {
  const isMuted = variant === 'muted';
  return (
    <div
      className={`hero-pill relative flex-shrink-0 flex items-center gap-2.5 px-5 py-3 rounded-full cursor-pointer select-none border border-white/5 bg-[#111] ${isMuted ? 'text-white/50 opacity-70 blur-[0.5px]' : 'text-white/80'}`}
    >
      <span className="relative z-10 flex items-center gap-2.5">
        {item.icon}
        <span className="text-sm font-medium whitespace-nowrap tracking-wide">{item.name}</span>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Slider Rows                                                        */
/* ------------------------------------------------------------------ */
function SliderRow({ items, direction, variant }: { items: ModuleItem[]; direction: 'left' | 'right'; variant: 'muted' | 'sharp' }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const animClass = direction === 'left' ? 'hero-slider-left' : 'hero-slider-right';

  return (
    <div className="relative w-full overflow-hidden py-2" >
      {/* Edge gradient masks for smooth entry/exit */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-32 z-10 bg-gradient-to-r from-[#000000] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 z-10 bg-gradient-to-l from-[#000000] to-transparent" />

      <div ref={trackRef} className={`flex gap-4 w-max ${animClass}`}>
        {items.map((item) => <PillCard key={item.id} item={item} variant={variant} />)}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated Counters                                                  */
/* ------------------------------------------------------------------ */
function CountUp({ end, suffix = "" }: { end: number, suffix?: string }) {
  const [count, setCount] = useState(0);
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 2000;
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        const step = (timestamp: number) => {
          if (!startTime) startTime = timestamp;
          const progress = Math.min((timestamp - startTime) / duration, 1);
          setCount(Math.floor(progress * end));
          if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
        observer.disconnect();
      }
    });

    if (nodeRef.current) observer.observe(nodeRef.current);
    return () => observer.disconnect();
  }, [end]);

  return <div ref={nodeRef} className="text-4xl sm:text-5xl font-bold text-white mb-2">{count}{suffix}</div>;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30 font-sans">
      
      {/* 1. NAVBAR (Sticky Glass) */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/60 backdrop-blur-md border-b border-white/10 py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer font-bold text-lg tracking-tight" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Blocks className="w-4 h-4 text-white" />
            </div>
            <span>ReviewFlow</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="hover:text-white transition-colors relative group">
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-white transition-all group-hover:w-full"></span>
            </button>
            <button onClick={() => scrollTo('features')} className="hover:text-white transition-colors relative group">
              Features
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-white transition-all group-hover:w-full"></span>
            </button>
            <button onClick={() => scrollTo('how-it-works')} className="hover:text-white transition-colors relative group">
              How It Works
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-white transition-all group-hover:w-full"></span>
            </button>
            <button onClick={() => scrollTo('about')} className="hover:text-white transition-colors relative group">
              About
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-white transition-all group-hover:w-full"></span>
            </button>
            <button onClick={() => scrollTo('contact')} className="hover:text-white transition-colors relative group">
              Contact
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-white transition-all group-hover:w-full"></span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/login')} className="text-sm font-medium text-gray-400 hover:text-white transition-colors hidden sm:block">Log in</button>
            <RainbowButton onClick={() => router.push('/dashboard')}>Go to Dashboard</RainbowButton>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-0 overflow-hidden" id="hero">
        {/* Background glow blobs */}
        <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] rounded-full opacity-30 blur-[120px] bg-blue-600/30 pointer-events-none" />
        <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full opacity-20 blur-[100px] bg-purple-600/30 pointer-events-none" />

        {/* Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <span key={i} className="absolute rounded-full bg-blue-400/20 hero-particle" style={{
              width: Math.random() * 3 + 1, height: Math.random() * 3 + 1,
              left: (Math.random() * 100) + '%', top: (Math.random() * 100) + '%',
              animationDelay: (Math.random() * 5) + 's', animationDuration: (Math.random() * 10 + 10) + 's'
            }} />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center w-full max-w-5xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Professional Event QA Platform
            </span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold leading-[1.05] tracking-tight mb-6">
            Manage Events. Teams.<br />
            <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-purple-400 bg-clip-text text-transparent">Reviews. Seamlessly.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="max-w-2xl text-lg md:text-xl text-gray-400 mb-10 leading-relaxed">
            The premium platform for technical assessment, hackathon judging, and event management. Real-time insights, zero friction.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="flex flex-col sm:flex-row gap-4 items-center mb-24">
            <RainbowButton onClick={() => router.push('/dashboard')} size="lg" className="w-full sm:w-auto text-base">
              Get Started <ArrowRight className="ml-2 w-4 h-4" />
            </RainbowButton>
            <button onClick={() => scrollTo('features')} className="px-8 py-3 rounded-xl text-base font-medium text-white/70 border border-white/10 hover:bg-white/5 hover:text-white transition-all w-full sm:w-auto">
              How it works
            </button>
          </motion.div>
        </div>

        {/* 3. PREMIUM DUAL-ROW SLIDER (Strictly below hero content) */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.6 }} className="w-full mt-auto mb-12 flex flex-col gap-4">
          <SliderRow items={topRowLoop} direction="left" variant="muted" />
          <SliderRow items={bottomRowLoop} direction="right" variant="sharp" />
        </motion.div>
      </section>

      {/* 4. FEATURES SECTION (Background shift for depth) */}
      <section className="py-32 px-6 lg:px-8 bg-[#050505] relative" id="features">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.6 }} className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Everything you need to run flawless events</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">Replace chaotic spreadsheets and manual tracking with a unified, real-time command center designed for modern teams.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {[
              { icon: <Calendar className="w-6 h-6 text-blue-400" />, title: "Event Management", desc: "Create, schedule, and manage multi-stage events with full visibility and control over all participants." },
              { icon: <Users className="w-6 h-6 text-purple-400" />, title: "Team Coordination", desc: "Organize students, assign mentors, allocate lab space, and track attendance strictly in real-time." },
              { icon: <Zap className="w-6 h-6 text-yellow-400" />, title: "Smart Assessment", desc: "Equip judges and mentors with customized rubrics, instant scoring, and AI-assisted preliminary reviews." },
              { icon: <Activity className="w-6 h-6 text-green-400" />, title: "Live Dashboards", desc: "Monitor submissions, track review progress, and instantly generate dynamic leaderboards and exportable analytics." }
            ].map((feature, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} className="card-spotlight p-8 flex flex-col h-full">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm md:text-base">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section className="py-32 px-6 lg:px-8 bg-black relative" id="how-it-works">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Built for speed. Designed for transparency.</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">A simple 3-step workflow that scales from classroom project evaluations to massive multi-college hackathons.</p>
          </motion.div>

          <div className="relative max-w-5xl mx-auto">
            {/* Visual connecting line for desktop */}
            <div className="hidden md:block absolute top-[45px] left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent z-0" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
              {[
                { step: "01", title: "Setup Event & Staff", desc: "Administrators quickly define rounds, rubrics, and assign coordinators and mentors." },
                { step: "02", title: "Teams Check In", desc: "Participants hit their assigned labs. Coordinators instantly verify attendance via live portal." },
                { step: "03", title: "Review & Publish", desc: "Mentors grade live. Analytics aggregate instantly into a unified event leaderboard." }
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.2 }} className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full bg-[#111] border border-white/10 flex items-center justify-center text-2xl font-bold text-blue-400 mb-6 shadow-[0_0_30px_rgba(37,99,235,0.1)]">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. STATS SECTION */}
      <section className="py-32 px-6 lg:px-8 bg-[#050505] relative border-t border-white/5" id="stats">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[ { label: "Events Managed", val: 500, suf: "+" }, { label: "Participants", val: 10000, suf: "+" }, { label: "Uptime guarantee", val: 99, suf: "%" }, { label: "Partner Organizations", val: 50, suf: "+" } ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} className="card-spotlight p-8 text-center flex flex-col items-center justify-center">
                <CountUp end={stat.val} suffix={stat.suf} />
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. ABOUT SECTION */}
      <section className="py-32 px-6 lg:px-8 bg-black relative border-t border-white/5" id="about">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Left Content */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="flex flex-col">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide uppercase w-fit mb-6">
                About ReviewFlow
              </span>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-[1.1]">
                Built for the people who run the hardest part of every hackathon.
              </h2>
              <div className="text-gray-400 text-lg leading-relaxed flex flex-col gap-4 mb-10">
                <p>
                  We saw the chaos first-hand: coordinators shouting across giant halls, judges frantically scribbling on paper scorecards, and teams waiting hours just to know if their labs were evaluated. Spreadsheets break, communication siloes, and the developer experience for hackathon participants plummets.
                </p>
                <p>
                  ReviewFlow fixes this. We provide a single, real-time command center that links administrators, mentors, and students. By replacing fragmented tools with a strict, role-based pipeline, you can execute flawless multi-stage evaluations at unprecedented scale.
                </p>
              </div>

              {/* Value Pillars */}
              <div className="flex flex-col gap-6 mb-10">
                {[
                  { icon: <ShieldCheck className="text-green-400" />, title: "Transparency", desc: "Every score, check-in, and audit event is instantly logged and visible in real-time." },
                  { icon: <FastForward className="text-blue-400" />, title: "Speed", desc: "Automate mentor assignments, auto-balance lab loads, and calculate leaderboards on the fly." },
                  { icon: <Scale className="text-purple-400" />, title: "Fairness", desc: "Guarantee blind grading structures and compliance checks using our strict judging rubrics." }
                ].map((pillar, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-1">
                      {pillar.icon}
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-lg">{pillar.title}</h4>
                      <p className="text-gray-400 text-sm mt-1 leading-relaxed">{pillar.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="w-fit">
                <button onClick={() => scrollTo('how-it-works')} className="px-6 py-2.5 rounded-lg text-sm font-medium text-white border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center gap-2">
                  Learn How the System Works <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>

            {/* Right Visual / Stats (Reusing visually striking stats from earlier but stacked as cards) */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="col-span-1 sm:col-span-2 p-8 rounded-2xl bg-[#111]/80 border border-white/5 backdrop-blur-sm card-spotlight">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                    <Trophy className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-4xl font-bold text-white mb-2">1.5M+</h3>
                  <p className="text-gray-400 font-medium">Evaluations Processed</p>
               </div>
               <div className="p-8 rounded-2xl bg-[#111]/80 border border-white/5 backdrop-blur-sm card-spotlight">
                  <h3 className="text-4xl font-bold text-white mb-2">98%</h3>
                  <p className="text-gray-400 font-medium text-sm">Time Saved Sorting</p>
               </div>
               <div className="p-8 rounded-2xl bg-[#111]/80 border border-white/5 backdrop-blur-sm card-spotlight">
                  <h3 className="text-4xl font-bold text-white mb-2">Zero</h3>
                  <p className="text-gray-400 font-medium text-sm">Lost Paper Scorecards</p>
               </div>
            </motion.div>
          </div>

          {/* Trusted By Strip */}
          <div className="mt-24 pt-12 border-t border-white/5">
            <p className="text-center text-sm font-medium text-gray-500 uppercase tracking-widest mb-8">Trusted by premier tech institutions</p>
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 opacity-40 grayscale pointer-events-none">
              {/* Placeholders for logos */}
              {['TechNova', 'HackIndia', 'BuildSpace', 'FutureHacks', 'DevGrid'].map((brand) => (
                <span key={brand} className="text-2xl font-bold tracking-tighter">{brand}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. WHY REVIEWFLOW */}
      <section className="py-32 px-6 lg:px-8 bg-[#050505] relative border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Night & Day Difference</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-lg">Stop managing events with duct-taped tools.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Without ReviewFlow */}
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="bg-[#111] border border-red-500/10 rounded-2xl p-8 lg:p-12 shadow-[0_0_50px_rgba(239,68,68,0.03)] relative overflow-hidden flex flex-col h-full">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-[80px]" />
              <h3 className="text-2xl font-bold text-white mb-8 border-b border-white/5 pb-6">Without ReviewFlow</h3>
              <ul className="space-y-6 relative z-10 flex-1">
                {[
                  "Mentors manually typing scores into shared spreadsheets",
                  "No live visibility into which labs are falling behind",
                  "Hours spent assigning teams manually to specific judges",
                  "Zero audit trail when teams dispute scores",
                  "Setting up every single event completely from scratch"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <div className="mt-1 shrink-0"><XCircle className="w-5 h-5 text-red-400/80" /></div>
                    <span className="text-gray-400 text-[15px] leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* With ReviewFlow */}
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-[#111] border border-green-500/10 rounded-2xl p-8 lg:p-12 shadow-[0_0_50px_rgba(34,197,94,0.03)] relative overflow-hidden transform md:-translate-y-4 flex flex-col h-full">
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-[80px]" />
              <h3 className="text-2xl font-bold text-white mb-8 border-b border-white/5 pb-6 flex items-center justify-between">
                With ReviewFlow
                <span className="px-2.5 py-1 rounded bg-green-500/10 text-green-400 text-xs tracking-wider uppercase font-semibold">Solution</span>
              </h3>
              <ul className="space-y-6 relative z-10 flex-1">
                {[
                  "Strict, structured scoring with instant automated leaderboards",
                  "Live Monitor module tracking every submission real-time",
                  "Automated team dispatch and load-balanced lab workflows",
                  "Immutable technical Audit Logs for complete accountability",
                  "Reusable event templates and instantly cloned scorecards"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <div className="mt-1 shrink-0"><CheckCircle2 className="w-5 h-5 text-green-400" /></div>
                    <span className="text-gray-300 text-[15px] font-medium leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 9. TESTIMONIALS */}
      <section className="py-32 px-6 lg:px-8 bg-black relative border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Don't just take our word for it</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-lg">Event coordinators and judges relying on ReviewFlow.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { text: "ReviewFlow completely eliminated our grading bottleneck. We processed 400 team submissions flawlessly without a single Excel crash.", author: "Sarah Jenkins", role: "Head Organizer, HackIndia", initials: "SJ", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
              { text: "The Live Monitor feature is an absolute gamechanger. As a coordinator, I could see exactly which labs were stalling and dispatch mentors immediately.", author: "David Chen", role: "Operations Lead, BuildSpace", initials: "DC", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
              { text: "Blind grading and immutable audit logs meant zero disputes at the end of our hackathon. Our most peaceful closing ceremony yet.", author: "Elena Rodriguez", role: "Chief Judge, TechNova", initials: "ER", color: "bg-green-500/20 text-green-400 border-green-500/30" },
            ].map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} className="card-spotlight p-8 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
                <div className="mb-8">
                  <div className="flex gap-1 mb-6 text-yellow-500/80">
                    {/* 5 stars */}
                    {[...Array(5)].map((_, idx) => <svg key={idx} className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}
                  </div>
                  <p className="text-white/90 text-[17px] leading-relaxed font-normal">"{t.text}"</p>
                </div>
                <div className="flex items-center gap-4 mt-auto">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border ${t.color}`}>
                    {t.initials}
                  </div>
                  <div>
                    <h5 className="font-semibold text-white text-sm">{t.author}</h5>
                    <p className="text-gray-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Soft CTA Divider */}
      <section className="py-16 bg-[#050505] border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xl md:text-2xl font-medium text-white mb-6">Ready to bring order to your next technical event?</p>
          <RainbowButton onClick={() => router.push('/dashboard')} size="lg">Start Your First Event</RainbowButton>
        </div>
      </section>

      {/* 10. CONTACT SECTION */}
      <section className="py-32 px-6 lg:px-8 bg-[#020202] relative border-t border-white/5 overflow-hidden" id="contact">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="mb-16">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs font-semibold tracking-wide uppercase w-fit mb-6">
              Get in touch
            </span>
            <h2 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">Let's talk about<br/>your next event.</h2>
            <p className="text-gray-400 text-lg max-w-xl">Whether you're hosting a 50-person classroom review or a 5,000-person international hackathon, we have the architecture to support it.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8">
            {/* Left Box (Contact Cards) */}
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="lg:col-span-5 flex flex-col gap-4">
              {[
                { icon: <Mail className="w-5 h-5 text-gray-300" />, label: "Email", val: "hello@reviewflow.io", sub: "Replies within 24 hours" },
                { icon: <MessageSquare className="w-5 h-5 text-gray-300" />, label: "Live Chat", val: "Available in Dashboard", sub: "For active users" },
                { icon: <MapPin className="w-5 h-5 text-gray-300" />, label: "Headquarters", val: "Hyderabad, India", sub: "T-Hub Block A" },
                { icon: <Calendar className="w-5 h-5 text-gray-300" />, label: "Enterprise Demo", val: "Book a Walkthrough", sub: "Talk to an engineer", isLink: true }
              ].map((c, i) => (
                <div key={i} className="p-6 rounded-2xl bg-[#080808] border border-white/5 flex items-start gap-5 hover:border-white/10 hover:bg-[#111] transition-colors cursor-pointer group card-spotlight">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    {c.icon}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium mb-1">{c.label}</p>
                    <p className={`text-white font-semibold flex items-center gap-2 ${c.isLink ? 'text-blue-400 group-hover:text-blue-300' : ''}`}>
                      {c.val} {c.isLink && <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{c.sub}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Right Box (Form) */}
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }} className="lg:col-span-7 bg-[#080808] border border-white/5 rounded-2xl p-8 md:p-10 card-spotlight">
              <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-300">Full Name</label>
                    <input type="text" className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all" placeholder="Jane Doe" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-300">Work Email</label>
                    <input type="email" className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all" placeholder="jane@organization.org" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-300">Organization</label>
                    <input type="text" className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all" placeholder="University or Company" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-300">Event Size</label>
                    <select className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none cursor-pointer">
                      <option>&lt; 100 Participants</option>
                      <option>100 - 500 Participants</option>
                      <option>500 - 1,000+ Participants</option>
                      <option>Large Scale Enterprise</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-300">How can we help?</label>
                  <textarea rows={4} className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none" placeholder="Tell us about the structure and timeline of your next event..."></textarea>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-gray-500">No spam. Fast replies guaranteed.</p>
                  <RainbowButton className="w-full sm:w-auto">Send Message</RainbowButton>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-black py-12 px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Blocks className="w-5 h-5 text-blue-500" />
            <span className="font-bold text-white tracking-tight">ReviewFlow</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
          </div>
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} ReviewFlow. All rights reserved.</p>
        </div>
      </footer>
      
    </div>
  );
}
