import React, { useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useTheme } from "../context/ThemeContext";

const NoInternet = ({ onRetrySuccess, targetPath }) => {
  const { checkStatus } = useNetworkStatus();
  const [loading, setLoading] = useState(false);

  let isDark = false;

  try {
    const theme = useTheme();
    isDark =
      theme?.isDark ??
      document.documentElement.classList.contains("dark");
  } catch {
    isDark = document.documentElement.classList.contains("dark");
  }

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
    <div
      className="
      min-h-screen
      flex
      items-center
      justify-center
      px-6
      bg-white
      dark:bg-black
      transition-colors
      duration-300
    "
    >
      <div
        className="
        w-full
        max-w-md
        border
        border-neutral-200
        dark:border-neutral-800
        rounded-3xl
        p-10
        text-center
        bg-white
        dark:bg-neutral-950
        shadow-sm
      "
      >
        {/* Icon */}

        <div className="flex justify-center mb-8">
          <div
            className="
            w-20
            h-20
            rounded-full
            border
            border-neutral-300
            dark:border-neutral-700
            flex
            items-center
            justify-center
          "
          >
            <WifiOff
              size={34}
              className="text-neutral-900 dark:text-white"
            />
          </div>
        </div>

        {/* Heading */}

        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
          You're Offline
        </h1>

        <p className="mt-4 text-neutral-600 dark:text-neutral-400 leading-7">
          CampusNode can't connect to the internet.
          <br />
          Check your Wi-Fi or mobile data and try again.
        </p>

        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
          Don't worry. Everything will continue where you left off.
        </p>


        <button
          onClick={handleRetry}
          disabled={loading}
          className="
          mt-10
          w-full
          h-12
          rounded-xl
          bg-black
          dark:bg-white
          text-white
          dark:text-black
          font-semibold
          flex
          items-center
          justify-center
          gap-2
          hover:opacity-90
          transition
          disabled:opacity-70
          
        "
        >
          <RefreshCw
            size={18}
            className={loading ? "animate-spin" : ""}
          />

          {loading ? "Checking..." : "Try Again"}
        </button>

        {targetPath && (
          <p className="mt-5 text-xs text-neutral-500 truncate">
            Returning to{" "}
            <span className="font-mono">{targetPath}</span>
          </p>
        )}

        {/* Divider */}

        <div className="my-8 border-t border-neutral-200 dark:border-neutral-800" />

        {/* Branding */}

        <div>
          <h2 className="font-medium text-neutral-900 dark:text-white logofont tracking-wider">
            Campus<span className="text-orange-500">Node</span>
          </h2>

          
        </div>
      </div>
    </div>
  );
};

export default NoInternet;