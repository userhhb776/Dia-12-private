import { useState, useEffect } from "react";

interface CountdownProps {
  startDateStr?: string;
  theme: string;
}

export default function Countdown({ startDateStr, theme }: CountdownProps) {
  const [timeDiff, setTimeDiff] = useState({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isCountingUp: true,
  });

  useEffect(() => {
    if (!startDateStr) return;

    const calculateDifference = () => {
      const anniversary = new Date(startDateStr);
      const now = new Date();
      
      let diffMs = now.getTime() - anniversary.getTime();
      let isCountingUp = true;
      
      if (diffMs < 0) {
        // Future date, count down to it
        diffMs = Math.abs(diffMs);
        isCountingUp = false;
      }

      // Exact values
      const secondsTotal = Math.floor(diffMs / 1000);
      const minutesTotal = Math.floor(secondsTotal / 60);
      const hoursTotal = Math.floor(minutesTotal / 60);
      const daysTotal = Math.floor(hoursTotal / 24);

      // Breakdown in years, months, days
      let years = now.getFullYear() - anniversary.getFullYear();
      let months = now.getMonth() - anniversary.getMonth();
      let days = now.getDate() - anniversary.getDate();

      if (days < 0) {
        months -= 1;
        // Approximation of days in previous month
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
      }

      if (months < 0) {
        years -= 1;
        months += 12;
      }

      // If future date, just break down the totals for simplicity and accuracy
      if (!isCountingUp) {
        const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const h = Math.floor((diffMs / (100 * 60 * 60)) % 24);
        const m = Math.floor((diffMs / (1000 * 60)) % 60);
        const s = Math.floor((diffMs / 1000) % 60);
        
        setTimeDiff({
          years: 0,
          months: 0,
          days: d,
          hours: h,
          minutes: m,
          seconds: s,
          isCountingUp,
        });
        return;
      }

      const hours = now.getHours() - anniversary.getHours();
      const minutes = now.getMinutes() - anniversary.getMinutes();
      const seconds = now.getSeconds() - anniversary.getSeconds();

      const adjustedHours = hours < 0 ? hours + 24 : hours;
      const adjustedMinutes = minutes < 0 ? minutes + 60 : minutes;
      const adjustedSeconds = seconds < 0 ? seconds + 60 : seconds;

      setTimeDiff({
        years: Math.max(0, years),
        months: Math.max(0, months),
        days: Math.max(0, days),
        hours: adjustedHours,
        minutes: adjustedMinutes,
        seconds: adjustedSeconds,
        isCountingUp,
      });
    };

    calculateDifference();
    const interval = setInterval(calculateDifference, 1000);

    return () => clearInterval(interval);
  }, [startDateStr]);

  if (!startDateStr) return null;

  const labels = timeDiff.isCountingUp
    ? "Tempo compartilhando o amor:"
    : "Tempo restante para esse amor começar:";

  return (
    <div className="w-full text-center mt-6 p-4 rounded-2xl bg-white/40 backdrop-blur-md shadow-inner border border-white/30">
      <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3 font-semibold">
        {labels}
      </p>
      
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
        {timeDiff.years > 0 && (
          <div className="bg-white/80 rounded-xl p-2 shadow-xs border border-rose-100 flex flex-col justify-center">
            <span className="text-xl sm:text-2xl font-bold text-rose-500 font-mono">
              {timeDiff.years}
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400">
              {timeDiff.years === 1 ? "Ano" : "Anos"}
            </span>
          </div>
        )}
        
        {(timeDiff.months > 0 || timeDiff.years > 0) && (
          <div className="bg-white/80 rounded-xl p-2 shadow-xs border border-rose-100 flex flex-col justify-center">
            <span className="text-xl sm:text-2xl font-bold text-rose-500 font-mono">
              {timeDiff.months}
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400">
              {timeDiff.months === 1 ? "Mês" : "Meses"}
            </span>
          </div>
        )}

        <div className="bg-white/80 rounded-xl p-2 shadow-xs border border-rose-100 flex flex-col justify-center">
          <span className="text-xl sm:text-2xl font-bold text-rose-500 font-mono">
            {timeDiff.days}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400">
            {timeDiff.days === 1 ? "Dia" : "Dias"}
          </span>
        </div>

        <div className="bg-white/80 rounded-xl p-2 shadow-xs border border-rose-100 flex flex-col justify-center">
          <span className="text-xl sm:text-2xl font-bold text-rose-500 font-mono">
            {String(timeDiff.hours).padStart(2, '0')}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400">
            Horas
          </span>
        </div>

        <div className="bg-white/80 rounded-xl p-2 shadow-xs border border-rose-100 flex flex-col justify-center">
          <span className="text-xl sm:text-2xl font-bold text-rose-500 font-mono">
            {String(timeDiff.minutes).padStart(2, '0')}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400">
            Minutos
          </span>
        </div>

        <div className="bg-white/80 rounded-xl p-2 shadow-xs border border-rose-100 flex flex-col justify-center">
          <span className="text-xl sm:text-2xl font-bold text-rose-500 font-mono animate-pulse">
            {String(timeDiff.seconds).padStart(2, '0')}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400">
            Segundos
          </span>
        </div>
      </div>

      <p className="text-xs text-rose-400/80 italic mt-3 font-serif">
        {timeDiff.isCountingUp 
          ? "Cada segundo ao seu lado vale uma eternidade..." 
          : "Contando as pulsações até o nosso momento especial..."}
      </p>
    </div>
  );
}
