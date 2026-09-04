import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  WifiOff,
  RefreshCw,
  Trophy,
  RotateCcw,
  Undo2,
  Gamepad2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Volume2,
  VolumeX,
  X,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useTheme } from "../context/ThemeContext";

// Simple Web Audio API Synthesizer for 100% offline sound effects
const playSound = (type, soundEnabled = true) => {
  if (!soundEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "move") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.06);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === "merge") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === "win") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.1);
      osc.frequency.setValueAtTime(659.25, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === "gameover") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.25);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {
    // Ignore audio errors if audio context is blocked
  }
};

const getEmptyBoard = () => [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
];

const spawnTile = (board) => {
  const emptyCells = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) {
        emptyCells.push({ r, c });
      }
    }
  }
  if (emptyCells.length === 0) return board;

  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const newBoard = board.map((row) => [...row]);
  newBoard[randomCell.r][randomCell.c] = Math.random() < 0.9 ? 2 : 4;
  return newBoard;
};

const initBoard = () => {
  let b = getEmptyBoard();
  b = spawnTile(b);
  b = spawnTile(b);
  return b;
};

const slideAndMergeRow = (row) => {
  let filtered = row.filter((x) => x !== 0);
  let scoreGained = 0;
  let merged = [];
  for (let i = 0; i < filtered.length; i++) {
    if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
      const newVal = filtered[i] * 2;
      merged.push(newVal);
      scoreGained += newVal;
      i++;
    } else {
      merged.push(filtered[i]);
    }
  }
  while (merged.length < 4) {
    merged.push(0);
  }
  return { newRow: merged, scoreGained };
};

const transpose = (matrix) =>
  matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));

const hasMovesAvailable = (board) => {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) return true;
      if (c < 3 && board[r][c] === board[r][c + 1]) return true;
      if (r < 3 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
};

const getTileStyles = (val) => {
  switch (val) {
    case 2:
      return "bg-[#FFF7ED] text-[#C2410C] dark:bg-[#2A1A0F] dark:text-[#FB923C] border border-[#FDBA74]/40 dark:border-[#9A3412]/40 text-base sm:text-xl font-bold shadow-xs";
    case 4:
      return "bg-[#FFEDD5] text-[#9A3412] dark:bg-[#3D1E0E] dark:text-[#FDBA74] border border-[#FB923C]/50 dark:border-[#EA580C]/40 text-base sm:text-xl font-bold shadow-xs";
    case 8:
      return "bg-[#FB923C] text-white dark:bg-[#EA580C] dark:text-white text-base sm:text-xl font-extrabold shadow-sm";
    case 16:
      return "bg-[#F97316] text-white dark:bg-[#F97316] dark:text-white text-base sm:text-xl font-extrabold shadow-sm";
    case 32:
      return "bg-[#EA580C] text-white dark:bg-[#C2410C] dark:text-white text-base sm:text-xl font-black shadow-md";
    case 64:
      return "bg-[#C2410C] text-white dark:bg-[#9A3412] dark:text-white text-base sm:text-xl font-black shadow-md";
    case 128:
      return "bg-[#9A3412] text-amber-100 dark:bg-[#7C2D12] dark:text-amber-200 text-sm sm:text-lg font-black shadow-lg ring-1 ring-amber-400/40";
    case 256:
      return "bg-[#7C2D12] text-amber-200 dark:bg-[#602008] dark:text-amber-200 text-sm sm:text-lg font-black shadow-lg ring-2 ring-amber-400/60";
    case 512:
      return "bg-gradient-to-br from-amber-500 to-brand-600 text-white text-sm sm:text-lg font-black shadow-xl ring-2 ring-amber-300";
    case 1024:
      return "bg-gradient-to-br from-amber-400 via-brand-500 to-rose-600 text-white text-xs sm:text-base font-black shadow-xl ring-2 ring-amber-300";
    case 2048:
      return "bg-gradient-to-br from-yellow-300 via-amber-500 to-brand-600 text-white text-xs sm:text-base font-black shadow-2xl ring-4 ring-yellow-400 animate-pulse";
    default:
      if (val > 2048) {
        return "bg-gradient-to-br from-purple-600 to-brand-600 text-white text-[11px] sm:text-sm font-black shadow-2xl ring-2 ring-purple-400";
      }
      return "bg-neutral-100/80 dark:bg-neutral-900/60 text-transparent border border-neutral-200/50 dark:border-neutral-800/60";
  }
};

const NoInternet = ({ onRetrySuccess, targetPath }) => {
  const { checkStatus } = useNetworkStatus();
  const [loading, setLoading] = useState(false);
  const [gameModalOpen, setGameModalOpen] = useState(false);

  // 2048 Game State
  const [board, setBoard] = useState(initBoard);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem("campusnode_2048_best") || "0", 10);
    } catch {
      return 0;
    }
  });
  const [prevGameState, setPrevGameState] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem("campusnode_2048_sound") !== "false";
    } catch {
      return true;
    }
  });

  const boardRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("campusnode_2048_sound", String(next));
      } catch {}
      return next;
    });
  };

  const startNewGame = () => {
    const newB = initBoard();
    setBoard(newB);
    setScore(0);
    setPrevGameState(null);
    setGameOver(false);
    setHasWon(false);
    setKeepPlaying(false);
  };

  const handleUndo = () => {
    if (!prevGameState) return;
    setBoard(prevGameState.board);
    setScore(prevGameState.score);
    setPrevGameState(null);
    setGameOver(false);
  };

  const move = useCallback(
    (direction) => {
      if (gameOver) return;

      let currentBoard = board;
      let scoreToAdd = 0;
      let changed = false;
      let newBoard = getEmptyBoard();

      if (direction === "left") {
        for (let r = 0; r < 4; r++) {
          const { newRow, scoreGained } = slideAndMergeRow(currentBoard[r]);
          newBoard[r] = newRow;
          scoreToAdd += scoreGained;
          if (newRow.some((val, idx) => val !== currentBoard[r][idx])) {
            changed = true;
          }
        }
      } else if (direction === "right") {
        for (let r = 0; r < 4; r++) {
          const reversed = [...currentBoard[r]].reverse();
          const { newRow, scoreGained } = slideAndMergeRow(reversed);
          const restored = newRow.reverse();
          newBoard[r] = restored;
          scoreToAdd += scoreGained;
          if (restored.some((val, idx) => val !== currentBoard[r][idx])) {
            changed = true;
          }
        }
      } else if (direction === "up") {
        const transposed = transpose(currentBoard);
        let tempTransposed = getEmptyBoard();
        for (let r = 0; r < 4; r++) {
          const { newRow, scoreGained } = slideAndMergeRow(transposed[r]);
          tempTransposed[r] = newRow;
          scoreToAdd += scoreGained;
        }
        newBoard = transpose(tempTransposed);
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (newBoard[r][c] !== currentBoard[r][c]) {
              changed = true;
            }
          }
        }
      } else if (direction === "down") {
        const transposed = transpose(currentBoard);
        let tempTransposed = getEmptyBoard();
        for (let r = 0; r < 4; r++) {
          const reversed = [...transposed[r]].reverse();
          const { newRow, scoreGained } = slideAndMergeRow(reversed);
          tempTransposed[r] = newRow.reverse();
          scoreToAdd += scoreGained;
        }
        newBoard = transpose(tempTransposed);
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (newBoard[r][c] !== currentBoard[r][c]) {
              changed = true;
            }
          }
        }
      }

      if (changed) {
        setPrevGameState({
          board: currentBoard.map((row) => [...row]),
          score,
        });

        const updatedBoard = spawnTile(newBoard);
        setBoard(updatedBoard);

        const newScore = score + scoreToAdd;
        setScore(newScore);

        if (newScore > bestScore) {
          setBestScore(newScore);
          try {
            localStorage.setItem("campusnode_2048_best", String(newScore));
          } catch {}
        }

        if (scoreToAdd > 0) {
          playSound("merge", soundEnabled);
        } else {
          playSound("move", soundEnabled);
        }

        if (!hasWon && !keepPlaying) {
          const reached2048 = updatedBoard.some((row) =>
            row.some((val) => val >= 2048)
          );
          if (reached2048) {
            setHasWon(true);
            playSound("win", soundEnabled);
          }
        }

        if (!hasMovesAvailable(updatedBoard)) {
          setGameOver(true);
          playSound("gameover", soundEnabled);
        }
      }
    },
    [board, gameOver, score, bestScore, hasWon, keepPlaying, soundEnabled]
  );

  // Keyboard controls active when game modal is open
  useEffect(() => {
    if (!gameModalOpen) return;

    const handleKeyDown = (e) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          e.code
        )
      ) {
        e.preventDefault();
      }

      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          move("left");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          move("right");
          break;
        case "ArrowUp":
        case "w":
        case "W":
          move("up");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          move("down");
          break;
        case "r":
        case "R":
          startNewGame();
          break;
        case "u":
        case "U":
          handleUndo();
          break;
        case "Escape":
          setGameModalOpen(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameModalOpen, move]);

  // Touch Swipe Handlers for mobile
  const handleTouchStart = (e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const diffX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const diffY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    const minSwipeDistance = 30;

    if (Math.max(absX, absY) > minSwipeDistance) {
      if (absX > absY) {
        if (diffX > 0) {
          move("right");
        } else {
          move("left");
        }
      } else {
        if (diffY > 0) {
          move("down");
        } else {
          move("up");
        }
      }
    }
  };

  const handleRetry = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const online = await checkStatus();
      if (online) {
        toast.success("Connection restored.");
        if (onRetrySuccess) onRetrySuccess();
      } else {
        toast.error("Still offline.");
      }
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-white dark:bg-black transition-colors duration-300">
      {/* Classic / Original Offline Card */}
      <div className="w-full max-w-md border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 sm:p-10 text-center bg-white dark:bg-neutral-950 shadow-sm transition-colors">
        {/* Wifi Off Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center">
            <WifiOff size={34} className="text-neutral-900 dark:text-white" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">
          You're Offline
        </h1>

        <p className="mt-4 text-neutral-600 dark:text-neutral-400 leading-7 text-sm sm:text-base">
          CampusNode can't connect to the internet.
          <br />
          Check your Wi-Fi or mobile data and try again.
        </p>

        <p className="mt-3 text-xs sm:text-sm text-neutral-500 dark:text-neutral-500">
          Don't worry. Everything will continue where you left off.
        </p>

        {/* Try Again Button */}
        <button
          onClick={handleRetry}
          disabled={loading}
          className="mt-8 w-full h-12 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-70 cursor-pointer text-sm"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          {loading ? "Checking..." : "Try Again"}
        </button>

        {/* Easter Egg 2048 Game Launcher Button */}
        <div className="mt-4">
          <button
            onClick={() => setGameModalOpen(true)}
            className="w-full py-3 px-4 rounded-xl border border-[#FDBA74]/70 dark:border-[#9A3412]/60 bg-[#FFF7ED] dark:bg-[#2A1A0F] text-[#C2410C] dark:text-[#FB923C] hover:bg-[#FFEDD5] dark:hover:bg-[#382012] font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs group"
          >
            <div className="w-6 h-6 rounded-lg bg-[#F97316] text-white flex items-center justify-center text-xs group-hover:scale-110 transition-transform">
              <Gamepad2 size={14} />
            </div>
            <span>Play 2048 while you wait</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#F97316] text-white font-mono uppercase tracking-wider">
              Game
            </span>
          </button>
        </div>

        {targetPath && (
          <p className="mt-5 text-xs text-neutral-500 truncate">
            Returning to <span className="font-mono">{targetPath}</span>
          </p>
        )}

        {/* Divider */}
        <div className="my-8 border-t border-neutral-200 dark:border-neutral-800" />

        {/* Branding */}
        <div>
          <h2 className="font-medium text-neutral-900 dark:text-white logofont tracking-wider">
            Campus<span className="text-brand-500">Node</span>
          </h2>
        </div>
      </div>

      {/* 2048 Game Popup Modal */}
      {gameModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={(e) => e.target === e.currentTarget && setGameModalOpen(false)}
        >
          <div className="bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] rounded-2xl max-w-sm sm:max-w-md w-full shadow-2xl overflow-hidden flex flex-col transition-colors max-h-[95vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-[#F0F0F0] dark:border-[#2A2A2A] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FFF7ED] dark:bg-[#2A1A0F] text-[#F97316] dark:text-[#FB923C] flex items-center justify-center shrink-0">
                  <Gamepad2 size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111111] dark:text-[#F5F5F5] leading-tight">
                    2048 Offline Arcade
                  </h3>
                  <p className="text-[11px] text-[#888888] dark:text-[#808080] font-normal">
                    Join tiles to reach 2048!
                  </p>
                </div>
              </div>

              <button
                onClick={() => setGameModalOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[#555555] dark:text-[#B5B5B5] hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Game Content */}
            <div className="p-4 sm:p-5 flex flex-col items-center select-none">
              {/* Scoreboard & Actions Bar */}
              <div className="w-full flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-[#FAFAFA] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#303030] rounded-xl px-3 py-1 text-center min-w-[65px]">
                    <span className="block text-[9px] font-bold text-[#888888] dark:text-[#808080] uppercase tracking-wider">
                      Score
                    </span>
                    <span className="block text-sm font-black text-[#111111] dark:text-[#F5F5F5]">
                      {score}
                    </span>
                  </div>

                  <div className="bg-[#FAFAFA] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#303030] rounded-xl px-3 py-1 text-center min-w-[65px]">
                    <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-[#888888] dark:text-[#808080] uppercase tracking-wider">
                      <Trophy size={10} className="text-[#F97316]" /> Best
                    </div>
                    <span className="block text-sm font-black text-[#111111] dark:text-[#F5F5F5]">
                      {bestScore}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={toggleSound}
                    className="p-2 rounded-xl bg-transparent hover:bg-[#F5F5F5] dark:hover:bg-[#222222] text-[#555555] dark:text-[#B5B5B5] border border-[#E5E5E5] dark:border-[#303030] transition-colors cursor-pointer"
                    title={soundEnabled ? "Mute" : "Unmute"}
                  >
                    {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                  </button>

                  <button
                    onClick={handleUndo}
                    disabled={!prevGameState}
                    className="px-2.5 py-1.5 rounded-xl bg-transparent hover:bg-[#F5F5F5] dark:hover:bg-[#222222] text-[#555555] dark:text-[#B5B5B5] border border-[#E5E5E5] dark:border-[#303030] font-bold text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                    title="Undo"
                  >
                    <Undo2 size={13} />
                    <span className="hidden xs:inline">Undo</span>
                  </button>

                  <button
                    onClick={startNewGame}
                    className="px-3 py-1.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] dark:bg-[#FB923C] dark:hover:bg-[#F97316] dark:text-[#111111] text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                    title="New Game"
                  >
                    <RotateCcw size={13} />
                    <span>New</span>
                  </button>
                </div>
              </div>

              {/* 4x4 Grid Board */}
              <div
                ref={boardRef}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: "none" }}
                className="relative w-full aspect-square bg-neutral-200/90 dark:bg-[#222222] p-2 sm:p-2.5 rounded-2xl border border-[#E5E5E5] dark:border-[#303030] shadow-sm grid grid-cols-4 grid-rows-4 gap-1.5 sm:gap-2 overflow-hidden"
              >
                {board.map((row, r) =>
                  row.map((val, c) => (
                    <div
                      key={`${r}-${c}`}
                      className="w-full h-full rounded-xl flex items-center justify-center transition-all duration-100 relative"
                    >
                      <div className="absolute inset-0 rounded-xl bg-neutral-100 dark:bg-[#181818]/90 border border-neutral-200/50 dark:border-neutral-800/60" />

                      {val > 0 && (
                        <div
                          className={`absolute inset-0 rounded-xl flex items-center justify-center transition-transform duration-100 animate-in zoom-in-75 ${getTileStyles(
                            val
                          )}`}
                        >
                          {val}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* Victory Overlay */}
                {hasWon && !keepPlaying && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-200 z-20">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400 text-black flex items-center justify-center text-xl font-black mb-2 shadow-lg animate-bounce">
                      🏆
                    </div>
                    <h3 className="text-lg font-black text-white leading-tight">
                      You Reached 2048!
                    </h3>
                    <p className="text-xs text-amber-200 mt-1 mb-4 font-medium">
                      Awesome skills while waiting!
                    </p>
                    <div className="flex gap-2 w-full max-w-xs">
                      <button
                        onClick={() => setKeepPlaying(true)}
                        className="flex-1 py-2 px-2.5 bg-white text-[#111111] hover:bg-neutral-100 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        Keep Going
                      </button>
                      <button
                        onClick={startNewGame}
                        className="flex-1 py-2 px-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        New Game
                      </button>
                    </div>
                  </div>
                )}

                {/* Game Over Overlay */}
                {gameOver && (
                  <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-200 z-20">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-lg mb-2">
                      <WifiOff size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-white leading-tight">
                      Game Over!
                    </h3>
                    <p className="text-xs text-neutral-300 mt-0.5 mb-4">
                      Score: <strong>{score}</strong>
                    </p>
                    <div className="flex gap-2 w-full max-w-xs">
                      {prevGameState && (
                        <button
                          onClick={handleUndo}
                          className="flex-1 py-2 px-2.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          Undo Move
                        </button>
                      )}
                      <button
                        onClick={startNewGame}
                        className="flex-1 py-2 px-3 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Screen Virtual D-Pad */}
              <div className="w-full flex flex-col items-center mt-3 sm:hidden">
                <button
                  onClick={() => move("up")}
                  aria-label="Move Up"
                  className="w-10 h-9 rounded-xl bg-[#FAFAFA] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#303030] text-[#555555] dark:text-[#B5B5B5] active:bg-[#F5F5F5] flex items-center justify-center shadow-xs cursor-pointer mb-1"
                >
                  <ArrowUp size={16} />
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => move("left")}
                    aria-label="Move Left"
                    className="w-10 h-9 rounded-xl bg-[#FAFAFA] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#303030] text-[#555555] dark:text-[#B5B5B5] active:bg-[#F5F5F5] flex items-center justify-center shadow-xs cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <button
                    onClick={() => move("down")}
                    aria-label="Move Down"
                    className="w-10 h-9 rounded-xl bg-[#FAFAFA] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#303030] text-[#555555] dark:text-[#B5B5B5] active:bg-[#F5F5F5] flex items-center justify-center shadow-xs cursor-pointer"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    onClick={() => move("right")}
                    aria-label="Move Right"
                    className="w-10 h-9 rounded-xl bg-[#FAFAFA] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#303030] text-[#555555] dark:text-[#B5B5B5] active:bg-[#F5F5F5] flex items-center justify-center shadow-xs cursor-pointer"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {/* Controls Tip */}
              <div className="mt-2.5 text-center">
                <p className="text-[10px] sm:text-[11px] text-[#888888] dark:text-[#808080] font-medium">
                  Use Arrow keys / WASD or swipe on board to move.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoInternet;