import React from "react";

interface LossNotificationProps {
  show: boolean;
  onClose: () => void;
  period: string;
  lostAmount: number;
  drawnNum: number;
  drawnColor: string;
  drawnSize: string;
  timer: number;
}

export const LossNotification: React.FC<LossNotificationProps> = ({
  show,
  onClose,
  period,
  lostAmount,
  drawnNum,
  drawnColor,
  drawnSize,
  timer,
}) => {
  if (!show) return null;

  return (
    <div
      id="lossNotification"
      className="fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      ></div>

      <div className="relative z-20 w-full max-w-[400px] flex flex-col items-center px-6 loss-animation">
        <div className="relative w-full flex flex-col items-center">
          
          {/* SVG Blue Ribbon Top Decorations */}
          <div className="relative z-25 -mb-6 flex flex-col items-center">
            <div className="absolute top-2 w-64 h-24 flex justify-between px-2 opacity-80 pointer-events-none">
              <svg className="w-24 h-16 fill-blue-200 transform -scale-x-100" viewBox="0 0 100 50">
                <path d="M0,50 Q10,20 50,10 Q60,10 70,20 Q80,30 100,30 Q80,40 50,45 Q20,50 0,50Z"></path>
              </svg>
              <svg className="w-24 h-16 fill-blue-200" viewBox="0 0 100 50">
                <path d="M0,50 Q10,20 50,10 Q60,10 70,20 Q80,30 100,30 Q80,40 50,45 Q20,50 0,50Z"></path>
              </svg>
            </div>
            <div className="relative mt-8 w-80 h-16 flex justify-center items-center pointer-events-none">
              <svg className="absolute w-full h-full drop-shadow-md" viewBox="0 0 400 100">
                <path d="M20,60 Q20,30 60,30 L340,30 Q380,30 380,60 L360,80 L40,80 Z" fill="#D1D5DB"></path>
                <path d="M40,30 L40,80 M360,30 L360,80" stroke="#94A3B8" strokeWidth="1"></path>
              </svg>
            </div>
            
            {/* Top Rocket Icon as in the HTML */}
            <div className="absolute -top-12 w-28 h-28 rounded-full bg-gradient-to-b from-blue-100 to-blue-300 p-1 shadow-xl border-4 border-white/50">
              <div className="w-full h-full rounded-full border-2 border-blue-200/50 flex items-center justify-center bg-gradient-to-tr from-slate-200 to-blue-50">
                <span className="material-icons text-5xl text-blue-400">rocket_launch</span>
              </div>
            </div>
          </div>

          {/* Main Loss Modal Content block */}
          <div className="w-full bg-gradient-to-b from-blue-100 to-blue-200 rounded-[3rem] p-6 pt-16 flex flex-col items-center shadow-2xl z-10 border border-white/40">
            <h3 className="text-blue-900/60 text-xs font-bold tracking-[0.2em] uppercase mb-4">
              Better Luck Next Time
            </h3>

            {/* Lottery outcome specs */}
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-slate-500 text-xs font-semibold">Lottery results</span>
              <div className="flex items-center space-x-2">
                <span
                  id="lossResultColor"
                  className="px-2.5 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full shadow-xs uppercase"
                >
                  {drawnColor}
                </span>
                <span
                  id="lossResultNumber"
                  className="w-5 h-5 flex items-center justify-center bg-white text-slate-700 text-xs font-bold rounded-full shadow-xs"
                >
                  {drawnNum}
                </span>
                <span
                  id="lossResultSize"
                  className="px-2.5 py-0.5 bg-slate-400 text-white text-[10px] font-bold rounded-full shadow-xs uppercase font-sans"
                >
                  {drawnSize}
                </span>
              </div>
            </div>

            {/* Lost funds count details card */}
            <div className="w-full relative px-2">
              <div className="w-full h-8 bg-blue-300/30 rounded-full shadow-inner border border-blue-400/20"></div>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[90%] bg-white rounded-b-xl shadow-lg p-5 flex flex-col items-center border border-slate-100 z-10">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">
                  Loss
                </span>
                <span id="lossAmountDisplay" className="text-slate-800 text-3xl font-bold font-sans">
                  -₹{lostAmount.toFixed(2)}
                </span>
                <div className="absolute bottom-0 left-0 w-full h-1 border-b-2 border-dotted border-slate-200"></div>
              </div>
            </div>

            <div className="h-20"></div>

            {/* Simple ticking animations for lost cases */}
            <div className="flex items-center text-slate-500/80 text-xs font-medium select-none text-center">
              <span id="lossTimer" className="timer-animate font-semibold">
                {timer} seconds auto close
              </span>
            </div>
            <p className="text-slate-400/60 text-[9px] mt-1">Period: {period}</p>
          </div>

          {/* Dismiss control */}
          <button
            onClick={onClose}
            className="mt-6 w-12 h-12 rounded-full border-2 border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-90"
          >
            <span className="material-icons text-white text-3xl">close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
