import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const timeBasedMessages = {
  earlyMorning: [
    "Bro, even the Fruit Shop bhaiya hasn't opened his shutter yet.",
    "8 AM class? Page is still debating between Nescafe coffee and 5 more minutes of sleep.",
    "Page woke up, looked at the 8 AM timetable, and immediately went back to sleep.",
    "Mess breakfast is over and Yadav Canteen hasn't opened yet. Page is starving.",
    "Hostel Wi-Fi is awake. This page and your roommate are definitely not.",
    "Page snoozed 7 alarms and blamed the hostel mattress.",
    "The whole hostel is sleeping. Why are you even awake right now? 💀",
    "Page is sprinting to the department because morning attendance closes in 2 mins.",
    "Page is waiting outside Nescafe for the morning caffeine survival kit.",
    "Hostel corridor is dead silent, and this page is in deep REM sleep."
  ],

  collegeMorning: [
    "Page bunked the lecture and is currently chilling at Nescafe with an iced latte.",
    "Page got caught in the front row by the professor. Pray for it. 💀",
    "Page has 0% attendance and a permanently reserved table at Snackers.",
    "Page was spotted near Yadav Canteen with 4 other bunking legends.",
    "Assignment deadline is in 5 mins. Page panicked and rushed to Campus Cafe.",
    "Page is sitting at Rimjhim Bakery pretending to study for the mid-sem.",
    "Professor said 'Surprise Quiz' and this page evacuated the department.",
    "Page is calculating minimum attendance percentage on the last bench.",
    "Page left the lecture hall to 'fill water' and ended up at Snackers.",
    "Page went to get a lab manual signed and got lost in the department."
  ],

  afternoon: [
    "Post-lunch coma hit hard. Page is taking the legendary 3-hour power nap.",
    "Page ate parathas at Yadav Canteen and productivity.exe immediately crashed. 😴",
    "Page went to Fruit Shop for a 'healthy fitness diet' and is now fast asleep.",
    "Curtains drawn, cooler on full blast. Page has entered another dimension.",
    "Page said: 'I will just close my eyes for 10 minutes.' It has been 4 hours. 💀",
    "Page is currently cooling off with an Oreo shake in the Snackers AC.",
    "Afternoon lectures are a myth. Page is in deep hostel hibernation mode.",
    "Hostel is so quiet right now even the warden is taking a power nap.",
    "Mess rajma-chawal was too heavy. Page has officially entered airplane mode.",
    "Page is chilling at Campus Cafe avoiding the brutal afternoon heat."
  ],

  evening: [
    "Page went to Nescafe for a 5-minute chai break and started an entire startup discussion.",
    "Page is at Rimjhim Bakery treating friends because 'intern lag gayi (almost)'.",
    "Evening campus walk turned into a 2-hour gossip session outside Snackers.",
    "Page is standing in line waiting for hot patties at Yadav Canteen.",
    "Page is at Fruit Shop pretending to be in its fitness and hydration era.",
    "Campus is bustling, chai is flowing, and this page is nowhere to be found. 💀",
    "Page was spotted near Campus Cafe avoiding eye contact with faculty.",
    "Page went for an evening campus stroll and got caught in a 5-way squad meetup.",
    "Club meeting at 5 PM? Page is definitely sitting at Nescafe instead.",
    "Page is busy pretending tomorrow's assignment submission doesn't exist."
  ],

  night: [
    "Page went on a late-night campus round. Won't return alone for sure. 👀",
    "Page is at Night Canteen ordering double-cheese Maggi with extra butter at 1 AM.",
    "Page got lost between the night campus round and a situationship. 💀",
    "Page is sitting outside Nescafe having 2 AM deep existential crisis talks.",
    "Page went to Snackers with its crush. Please do not disturb.",
    "Page is on its 7th campus round pretending hostel curfew doesn't exist.",
    "Page and the server are taking a break. It's complicated.",
    "Page was spotted near Rimjhim Bakery with someone special after hours. 👀",
    "Late-night Night Canteen run > Studying for tomorrow's 9 AM exam.",
    "Page went looking for love under the campus streetlights. Got left on Seen. 💀",
    "Page is currently third-wheeling near Campus Cafe. Send immediate help.",
    "Hostel guard is blowing the in-time whistle. Page is sprinting for its life.",
    "Page is at Yadav Canteen having midnight kulhad chai with the squad."
  ]
};

function getTimeBasedFunnyMessage(prevMessage = '') {
  const hour = new Date().getHours();

  let messages;
  if (hour < 8) {
    messages = timeBasedMessages.earlyMorning;
  } else if (hour < 13) {
    messages = timeBasedMessages.collegeMorning;
  } else if (hour < 16) {
    messages = timeBasedMessages.afternoon;
  } else if (hour < 20) {
    messages = timeBasedMessages.evening;
  } else {
    messages = timeBasedMessages.night;
  }

  const pool = messages.length > 1 ? messages.filter(m => m !== prevMessage) : messages;
  return pool[Math.floor(Math.random() * pool.length)];
}

const NotFound = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState(() => getTimeBasedFunnyMessage());
  const [fade, setFade] = useState(true);
  const [countdown, setCountdown] = useState(30);

  // Auto-redirect countdown
  useEffect(() => {
    if (countdown <= 0) {
      navigate('/');
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  // Refresh / rotate message every 7 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMessage(prev => getTimeBasedFunnyMessage(prev));
        setFade(true);
      }, 200);
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a] flex items-center justify-center px-6 py-12 transition-colors duration-300 relative overflow-hidden">

      {/* Background dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]"
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      <div className="relative z-10 max-w-md w-full text-center">

        {/* Giant 404 */}
        <div className="relative mb-6">
          <h1
            className="text-[130px] md:text-[160px] font-black leading-none tracking-tighter text-neutral-900 dark:text-white select-none transition-all duration-100"
            style={{
              textShadow: '4px 4px 0px #EA580C',
            }}
          >
            404
          </h1>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">
              Page Not Found
            </p>
            {/* <span className="flex items-center gap-1 text-[9px] font-medium text-neutral-400 dark:text-neutral-500">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
              Live Campus Humor
            </span> */}
          </div>
          <p className={`text-sm md:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed font-medium min-h-[48px] flex items-center justify-center transition-opacity duration-200 ${fade ? 'opacity-100' : 'opacity-0'}`}>
            {message}
          </p>
        </div>

        <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium mb-6 tracking-wide flex items-center justify-center gap-1.5">
          Auto-redirecting to home in{' '}
          <span className="inline-flex items-center justify-center w-7 h-7 bg-brand-600 text-white text-[11px] font-extrabold rounded-full shadow-sm">
            {countdown}
          </span>{' '}
          seconds
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <i className="ri-home-4-line mr-2" />
            Take Me Home
          </button>
          <button
            onClick={() => navigate('/events')}
            className="px-6 py-3 bg-white dark:bg-neutral-900 text-neutral-850 dark:text-neutral-200 text-xs font-bold uppercase tracking-wider border border-neutral-200 dark:border-neutral-850 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all cursor-pointer shadow-sm"
          >
            <i className="ri-calendar-event-line mr-2" />
            Browse Events
          </button>
        </div>

        <p className="mt-10 text-[10px] text-neutral-300 dark:text-neutral-700 tracking-widest font-bold uppercase flex items-center justify-center gap-1.5 flex-wrap">
          Error 404 • <span className="logofont font-light normal-case text-neutral-400 dark:text-neutral-500">Campus<span className="text-[#F97316] dark:text-[#FB923C]">Node</span></span> • You're off the map 🗺️
        </p>
      </div>
    </div>
  );
};

export default NotFound;
