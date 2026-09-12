import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, CalendarDays, Compass } from "lucide-react";

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
    <div className="min-h-[85vh] bg-cn-bg text-cn-text flex items-center justify-center px-4 py-12 transition-colors duration-200">
      <div className="max-w-md w-full text-center space-y-6">
        
        {/* Subtle Brand Tag */}
        <div className="inline-flex items-center gap-2">
          <Badge variant="outline" className="border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px] px-2.5 py-0.5">
            <Compass className="size-3 text-primary mr-1" />
            Error 404 • Destination Unknown
          </Badge>
        </div>

        {/* Clean Institutional 404 Heading */}
        <div className="space-y-1">
          <h1 className="text-7xl md:text-8xl font-black tracking-tight text-foreground select-none font-mono">
            404
          </h1>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Page Not Found
          </p>
        </div>

        {/* Humorous Campus Quote Card */}
        <Card className="border-border bg-card shadow-xs text-left">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Campus Dispatch
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Live Status
              </span>
            </div>
            <p className={`text-sm text-foreground/90 leading-relaxed font-medium min-h-[44px] flex items-center transition-opacity duration-200 ${fade ? 'opacity-100' : 'opacity-0'}`}>
              {message}
            </p>
          </CardContent>
        </Card>

        {/* Auto Redirect Notice */}
        <p className="text-xs text-muted-foreground font-medium flex items-center justify-center gap-1.5">
          Redirecting to home in{' '}
          <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 font-bold">
            {countdown}s
          </Badge>
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            onClick={() => navigate('/')}
            className="gap-2 cursor-pointer font-semibold shadow-xs"
          >
            <Home className="size-4" />
            Take Me Home
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/events')}
            className="gap-2 cursor-pointer font-semibold"
          >
            <CalendarDays className="size-4" />
            Browse Events
          </Button>
        </div>

        <p className="pt-6 text-[10px] text-muted-foreground tracking-wider uppercase font-medium">
          CampusNode Platform • National Institute of Technology Jalandhar
        </p>
      </div>
    </div>
  );
};

export default NotFound;
