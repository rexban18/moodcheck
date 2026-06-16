import React from "react";

interface WinNotificationProps {
  show: boolean;
  onClose: () => void;
  period: string;
  bonusAmount: number;
  drawnNum: number;
  drawnColor: string;
  drawnSize: string;
  timer: number;
  winCoins: { id: number; left: string; size: string; delay: string }[];
  winFireworks: { id: number; left: string; top: string; color: string; delay: string }[];
}

export const WinNotification: React.FC<WinNotificationProps> = ({
  show,
  onClose,
  period,
  bonusAmount,
  drawnNum,
  drawnColor,
  drawnSize,
  timer,
  winCoins,
  winFireworks,
}) => {
  if (!show) return null;

  return (
    <div
      id="winNotification"
      className="fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xs cursor-pointer"
        onClick={onClose}
      ></div>

      {/* Animated coins floating configuration */}
      <div id="coinContainer" className="pointer-events-none select-none">
        {winCoins.map((coin) => (
          <div
            key={coin.id}
            className="coin absolute pointer-events-none"
            style={{
              left: coin.left,
              fontSize: coin.size,
              animationDelay: coin.delay,
            }}
          >
            💰
          </div>
        ))}
      </div>

      {/* Animated fireworks floating configuration */}
      <div id="fireworkContainer" className="pointer-events-none select-none">
        {winFireworks.map((fire) => (
          <div
            key={fire.id}
            className="firework absolute pointer-events-none"
            style={{
              left: fire.left,
              top: fire.top,
              backgroundColor: fire.color,
              animationDelay: fire.delay,
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-20 w-full max-w-[430px] flex flex-col items-center px-6 win-animation">
        {/* Top Rocket Launcher Accent */}
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-20">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center -z-10">
              <div className="w-40 h-20 bg-gradient-to-r from-orange-400/0 via-yellow-400/40 to-orange-400/0 blur-xl"></div>
            </div>
            <div className="w-24 h-24 bg-gradient-to-b from-yellow-300 to-yellow-600 rounded-full border-4 border-yellow-200 flex items-center justify-center gold-glow">
              <span className="material-icons text-white text-5xl">rocket_launch</span>
            </div>
          </div>
        </div>

        {/* Main Ticket Modal */}
        <div className="modal-gradient w-full rounded-[40px] pt-16 pb-8 px-6 text-center shadow-2xl border-4 border-white/20 relative">
          
          {/* Congratulations Banner with clip path polygon */}
          <div
            className="absolute top-8 left-[-12px] right-[-12px] h-12 bg-gradient-to-b from-orange-400 to-orange-600 flex items-center justify-center shadow-lg z-10"
            style={{
              clipPath: "polygon(5% 0, 95% 0, 100% 50%, 95% 100%, 5% 100%, 0 50%)",
            }}
          >
            <h2 className="text-white text-xl font-black uppercase tracking-wider italic">
              Congratulations
            </h2>
          </div>

          <div className="mt-10 space-y-6">
            {/* Results row */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-white/90 text-xs font-medium mr-1 select-none">
                Lottery results
              </span>
              <div
                id="winResultColor"
                className="bg-primary/50 text-white border border-white/30 px-3 py-1 rounded-md text-[10px] font-bold uppercase"
              >
                {drawnColor}
              </div>
              <div
                id="winResultNumber"
                className="bg-white/30 text-white border border-white/30 px-3 py-1 rounded-full text-[10px] font-bold"
              >
                {drawnNum}
              </div>
              <div
                id="winResultSize"
                className="bg-primary/50 text-white border border-white/30 px-3 py-1 rounded-md text-[10px] font-bold uppercase"
              >
                {drawnSize}
              </div>
            </div>

            {/* Cut-out ticket display */}
            <div className="bg-white ticket-cut pt-4 pb-8 px-4 shadow-inner relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-200/50"></div>
              <p className="text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
                Bonus Received
              </p>
              <h3 id="winBonusDisplay" className="text-primary text-4xl font-black mb-2">
                ₹{bonusAmount.toFixed(2)}
              </h3>
              <p className="text-slate-400 text-[9px] font-medium">
                Period: <span id="winPeriodNumberDisplay">{period}</span>
              </p>
              <div className="absolute bottom-1 left-0 right-0 flex justify-around opacity-10">
                <div className="w-2 h-2 rounded-full bg-slate-900"></div>
                <div className="w-2 h-2 rounded-full bg-slate-900"></div>
                <div className="w-2 h-2 rounded-full bg-slate-900"></div>
                <div className="w-2 h-2 rounded-full bg-slate-900"></div>
                <div className="w-2 h-2 rounded-full bg-slate-900"></div>
              </div>
            </div>

            {/* Auto close delay indicators list */}
            <div className="flex items-center justify-center gap-2 text-white/90">
              <div className="w-5 h-5 border-2 border-white/30 rounded-full flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></div>
              </div>
              <span id="winTimer" className="text-xs font-medium">
                {timer} seconds auto close
              </span>
            </div>
          </div>
        </div>

        {/* Close board triggers */}
        <button
          onClick={onClose}
          className="mt-8 w-12 h-12 bg-black/20 hover:bg-black/40 border-2 border-white/60 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-sm active:scale-90"
        >
          <span className="material-icons text-2xl">close</span>
        </button>
      </div>
    </div>
  );
};
