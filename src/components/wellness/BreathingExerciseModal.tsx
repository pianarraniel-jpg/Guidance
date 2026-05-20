"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Pause,
  RotateCcw,
  X,
  CheckCircle2,
  Sparkles,
  Award,
  Heart,
  Timer
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BreathingExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  duration: number; // in seconds (e.g. 600 for 10 mins)
  title: string;
  onComplete?: () => void;
}

type BreathPhase = 'inhale' | 'holdIn' | 'exhale' | 'holdOut';

const MINDFULNESS_QUOTES = [
  "Quiet the mind and the soul will speak. — Ma Jaya Sati Bhagavati",
  "Breathe in deeply to bring your mind home to your body. — Thich Nhat Hanh",
  "Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor. — Thich Nhat Hanh",
  "Within you, there is a stillness and a sanctuary to which you can retreat at any time. — Hermann Hesse",
  "The present moment is filled with joy and happiness. If you are attentive, you will see it. — Thich Nhat Hanh",
  "Inhale the future, exhale the past."
];

export default function BreathingExerciseModal({
  isOpen,
  onClose,
  duration,
  title,
  onComplete
}: BreathingExerciseModalProps) {
  const { toast } = useToast();
  
  // Timer States
  const [isActive, setIsActive] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('inhale');
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(4); // 4-second box breathing
  const [isCompleted, setIsCompleted] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState('');

  // Refs for intervals to prevent duplicate timers
  const mainIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const phaseIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setSecondsLeft(duration);
      setIsActive(false);
      setBreathPhase('inhale');
      setPhaseSecondsLeft(4);
      setIsCompleted(false);
      setSelectedQuote(MINDFULNESS_QUOTES[Math.floor(Math.random() * MINDFULNESS_QUOTES.length)]);
    }
    return () => {
      clearTimers();
    };
  }, [isOpen, duration]);

  const clearTimers = () => {
    if (mainIntervalRef.current) clearInterval(mainIntervalRef.current);
    if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
    mainIntervalRef.current = null;
    phaseIntervalRef.current = null;
  };

  // Start / Pause control
  const togglePlay = () => {
    setIsActive(!isActive);
  };

  // Reset exercise
  const resetExercise = () => {
    clearTimers();
    setIsActive(false);
    setSecondsLeft(duration);
    setBreathPhase('inhale');
    setPhaseSecondsLeft(4);
    setIsCompleted(false);
  };

  // Skip / Dev Trigger Completion
  const triggerCompletion = () => {
    clearTimers();
    setIsActive(false);
    setSecondsLeft(0);
    setIsCompleted(true);
    if (onComplete) {
      onComplete();
    }
    toast({
      title: "Mindfulness Accomplished!",
      description: "You have completed your daily breathing session.",
    });
  };

  // Timer Effect
  useEffect(() => {
    if (isActive && secondsLeft > 0) {
      // Main countdown interval (1s tick)
      mainIntervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            triggerCompletion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Phase countdown interval (1s tick)
      phaseIntervalRef.current = setInterval(() => {
        setPhaseSecondsLeft((prev) => {
          if (prev <= 1) {
            // Cycle through Box Breathing Phases: Inhale (4s) -> Hold In (4s) -> Exhale (4s) -> Hold Out (4s)
            setBreathPhase((currentPhase) => {
              switch (currentPhase) {
                case 'inhale': return 'holdIn';
                case 'holdIn': return 'exhale';
                case 'exhale': return 'holdOut';
                case 'holdOut': return 'inhale';
                default: return 'inhale';
              }
            });
            return 4; // Reset phase duration to 4 seconds
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearTimers();
    }

    return () => clearTimers();
  }, [isActive, secondsLeft]);

  // Helper formatting for MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Dynamic CSS styling properties based on breathing phases
  const getPhaseStyles = () => {
    switch (breathPhase) {
      case 'inhale':
        return {
          scale: 'scale-[1.25]',
          bgGradient: 'from-[#0ea5e9] to-[#10b981]', // Teal-Blue glow
          shadow: 'shadow-[0_0_50px_rgba(14,165,233,0.5)]',
          label: 'Inhale',
          desc: 'Breath in slowly through your nose...',
        };
      case 'holdIn':
        return {
          scale: 'scale-[1.25]',
          bgGradient: 'from-[#0284c7] to-[#3b82f6]', // Deep Ocean Blue glow
          shadow: 'shadow-[0_0_70px_rgba(2,132,199,0.75)] border-white/20',
          label: 'Hold',
          desc: 'Hold your breath gently...',
        };
      case 'exhale':
        return {
          scale: 'scale-[0.9]',
          bgGradient: 'from-[#10b981] to-[#f59e0b]', // Golden Green calming glow
          shadow: 'shadow-[0_0_40px_rgba(16,185,129,0.4)]',
          label: 'Exhale',
          desc: 'Exhale slowly through your mouth...',
        };
      case 'holdOut':
        return {
          scale: 'scale-[0.9]',
          bgGradient: 'from-[#64748b] to-[#475569]', // Slate quiet rest
          shadow: 'shadow-[0_0_20px_rgba(100,116,139,0.2)]',
          label: 'Rest & Focus',
          desc: 'Hold empty and find your center...',
        };
      default:
        return {
          scale: 'scale-[1.0]',
          bgGradient: 'from-[#248F7D] to-[#10b981]',
          shadow: 'shadow-md',
          label: 'Get Ready',
          desc: 'Prepare to begin your session.',
        };
    }
  };

  const activeStyles = getPhaseStyles();
  const progressPercent = Math.min(100, Math.max(0, ((duration - secondsLeft) / duration) * 100));

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl bg-slate-950/95 border-slate-800 text-white rounded-[2.5rem] p-0 overflow-hidden shadow-2xl backdrop-blur-xl">
        
        {/* Upper Header Nav / Dev Shortcut */}
        <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-20">
          <Badge className="bg-slate-900 border-slate-800 text-teal-400 font-bold px-3 py-1 flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5" /> Guided Mindfulness
          </Badge>

          <div className="flex items-center gap-3">
            {/* Developer Fast Forward / Simulation Completion Button */}
            {!isCompleted && isActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={triggerCompletion}
                className="h-8 text-[10px] uppercase font-black tracking-widest text-emerald-400 hover:text-white hover:bg-emerald-500/20 rounded-xl"
              >
                <Sparkles className="h-3 w-3 mr-1 inline" /> Complete Now (Test)
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 bg-slate-900/60 hover:bg-slate-800 border-none text-slate-400 hover:text-white rounded-full transition-all"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isCompleted ? (
          /* ACTIVE EXERCISE VIEW */
          <div className="p-8 pt-20 flex flex-col items-center justify-center min-h-[500px] text-center relative overflow-hidden">
            {/* Immersive background decoration */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="mb-4">
              <h3 className="text-xl font-black text-slate-100 tracking-tight">{title}</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">Focus on your breathing and allow stress to melt away.</p>
            </div>

            {/* PULSING BOX BREATHING CIRCLE CONTAINER */}
            <div className="h-72 flex items-center justify-center w-full my-6">
              <div 
                className={`w-48 h-48 rounded-full bg-gradient-to-tr ${activeStyles.bgGradient} ${activeStyles.shadow} ${activeStyles.scale} flex flex-col items-center justify-center relative`}
                style={{
                  transition: 'transform 4s ease-in-out, box-shadow 4s ease-in-out, background-color 4s ease-in-out',
                }}
              >
                {/* Secondary pulsing overlay */}
                {isActive && (
                  <span className={`absolute inset-0 rounded-full bg-inherit opacity-25 animate-ping duration-1000 pointer-events-none`} />
                )}
                
                {/* Inner White Matte Ring */}
                <div className="w-[88%] h-[88%] rounded-full bg-slate-950/85 flex flex-col items-center justify-center p-4">
                  {isActive ? (
                    <>
                      <span className="text-[10px] uppercase font-black tracking-widest text-teal-400/80 mb-1">
                        {activeStyles.label}
                      </span>
                      <span className="text-4xl font-black text-white tracking-tighter leading-none mb-1">
                        {phaseSecondsLeft}s
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold max-w-[120px] leading-tight">
                        {formatTime(secondsLeft)} left
                      </span>
                    </>
                  ) : (
                    <>
                      <Heart className="h-8 w-8 text-rose-500 fill-current mb-2 animate-pulse" />
                      <span className="text-xs font-black uppercase text-slate-300 tracking-wider">Ready?</span>
                      <span className="text-[10px] text-slate-400 mt-1">Click Start to Begin</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Instruction description prompt */}
            <div className="h-12 max-w-sm flex items-center justify-center mb-6">
              <p className="text-sm font-semibold text-slate-200 animate-pulse leading-snug">
                {isActive ? activeStyles.desc : "Find a comfortable sitting position and close your eyes."}
              </p>
            </div>

            {/* Progress Bar Indicator */}
            <div className="w-full max-w-xs bg-slate-900 h-1.5 rounded-full overflow-hidden mb-8 border border-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-teal-500 to-sky-500 rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Main Media Action Controllers */}
            <div className="flex items-center gap-6 z-10">
              <Button
                variant="outline"
                size="icon"
                onClick={resetExercise}
                disabled={secondsLeft === duration && !isActive}
                className="h-12 w-12 rounded-full border-slate-800 bg-slate-900 hover:bg-slate-800 hover:text-white text-slate-400 disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>

              <Button
                onClick={togglePlay}
                size="lg"
                className={`h-16 w-16 rounded-full text-white font-black shadow-xl transition-all hover:scale-105 ${
                  isActive 
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10' 
                    : 'bg-primary hover:bg-primary/95 shadow-primary/20'
                }`}
              >
                {isActive ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-1" />}
              </Button>

              <div className="h-12 w-12 flex items-center justify-center text-sm font-black text-slate-400">
                {formatTime(secondsLeft)}
              </div>
            </div>
          </div>
        ) : (
          /* DYNAMIC CELEBRATORY COMPLETION CARD */
          <div className="p-8 pt-20 flex flex-col items-center justify-center min-h-[500px] text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-slate-950 pointer-events-none" />
            {/* Sparkles / Confetti Backdrop */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[350px] bg-teal-500/20 rounded-full blur-3xl opacity-60 pointer-events-none" />
            
            <div className="h-20 w-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center mb-6 animate-bounce shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <Award className="h-10 w-10 text-emerald-400" />
            </div>

            <h3 className="text-3xl font-black text-slate-100 tracking-tight mb-2 flex items-center gap-2">
              Well Done! <Sparkles className="h-6 w-6 text-yellow-400 fill-current animate-pulse" />
            </h3>
            
            <p className="text-sm font-bold text-teal-400 mb-6 uppercase tracking-wider">Mindfulness Accomplished</p>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 max-w-md mb-8">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-3">Today's Affirmation</p>
              <p className="text-sm font-medium text-slate-200 leading-relaxed italic">
                "{selectedQuote}"
              </p>
            </div>

            <p className="text-xs text-slate-400 font-medium mb-8 max-w-xs">
              This wellness exercise has been completed successfully and logged in your Daily Wellness Checklist.
            </p>

            <Button
              onClick={onClose}
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-xl px-10 h-12 hover:scale-105 transition-all"
            >
              Back to Dashboard
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
