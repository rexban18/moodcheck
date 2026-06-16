import React, { useState, useEffect, useRef } from "react";
import { WinNotification } from "./components/WinNotification";
import { LossNotification } from "./components/LossNotification";
import { handleDeposit } from "./deposit";
import { handleWithdraw } from "./withdraw";

// === TYPES ===
interface GameHistoryItem {
  period: string;
  number: number;
  size: "Big" | "Small";
  color: "violet" | "red" | "green";
}

interface ActiveBet {
  type: "color" | "number" | "bigsmall";
  value: string;
  color: string;
  amount: number;
  quantity: number;
  multiplier: number;
  totalAmount: number;
}

interface MyBetItem {
  id: string;
  period: string;
  type: "color" | "number" | "bigsmall";
  value: string;
  color: string;
  amount: number;
  quantity: number;
  multiplier: number;
  totalAmount: number;
  tax: number;
  amountAfterTax: number;
  status: "Succeed" | "Failed" | "Pending";
  payout: number;
  drawnNum?: number;
  drawnColor?: "violet" | "red" | "green";
  drawnSize?: "Big" | "Small";
  orderTime: string;
  mode?: number;
}

export default function App() {
  // === WALLET PERSISTENT STATE ===
  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem("wingo_balance");
    return saved ? parseFloat(saved) : 100000.0;
  });

  useEffect(() => {
    localStorage.setItem("wingo_balance", balance.toFixed(2));
  }, [balance]);

  // === ANNOUNCEMENT TIMELINE TEXT ===
  const announcements = [
    "Welcome to yoloplay game platform! Enjoy fair and transparent results.",
    "System Notice: Play WinGo daily to earn extra cashback up to 5%!",
    "Attention: Please bind your verified account for automated secure transfers."
  ];
  const [currentAnnouncementIdx, setCurrentAnnouncementIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAnnouncementIdx((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // === TIME CONFIGURATIONS ===
  const [activeMode, setActiveMode] = useState<number>(30); // 30, 60, 180, 300
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [betsClosed, setBetsClosed] = useState<boolean>(false);
  const [period, setPeriod] = useState<string>("20260616100001");
  const [recentResults, setRecentResults] = useState<number[]>([6, 5, 9]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [apiLoading, setApiLoading] = useState<boolean>(false);

  // === HISTORY LIST ===
  const [historyList, setHistoryList] = useState<GameHistoryItem[]>(() => {
    // Generate 100 initial realistic historical records for accurate statistic calculations
    const results = [];
    let startPeriod = 20260616100000;
    for (let i = 0; i < 100; i++) {
      const num = Math.floor(Math.random() * 10);
      const color: "violet" | "red" | "green" =
        num === 0 || num === 5
          ? "violet"
          : num % 2 === 0
          ? "red"
          : "green";
      const size = num >= 5 ? "Big" : "Small";
      results.push({
        period: (startPeriod - i).toString(),
        number: num,
        size: size as "Big" | "Small",
        color: color,
      });
    }
    return results;
  });

  // === BOTTOM NAV TABS STATES ===
  const [activeBottomTab, setActiveBottomTab] = useState<"history" | "chart" | "myhistory">("history");
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [myHistoryPage, setMyHistoryPage] = useState<number>(1);
  const [expandedBetId, setExpandedBetId] = useState<string | null>(null);

  // === MY HISTORY LIST STATE ===
  const [myBetList, setMyBetList] = useState<MyBetItem[]>(() => {
    const saved = localStorage.getItem("wingo_my_bets");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Parsing cached bets failed", e);
      }
    }
    return [
      {
        id: "bet_mock1",
        period: "20260616100000",
        type: "bigsmall",
        value: "big",
        color: "orange",
        amount: 100,
        quantity: 20,
        multiplier: 1,
        totalAmount: 2000,
        tax: 40,
        amountAfterTax: 1960,
        status: "Succeed",
        payout: 3920,
        drawnNum: 9,
        drawnColor: "green",
        drawnSize: "Big",
        orderTime: "2026-06-16 13:50:01",
        mode: 30,
      },
      {
        id: "bet_mock2",
        period: "20260616099999",
        type: "number",
        value: "7",
        color: "green",
        amount: 100,
        quantity: 20,
        multiplier: 1,
        totalAmount: 2000,
        tax: 40,
        amountAfterTax: 1960,
        status: "Failed",
        payout: -1960,
        drawnNum: 0,
        drawnColor: "violet",
        drawnSize: "Small",
        orderTime: "2026-06-16 13:51:02",
        mode: 30,
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem("wingo_my_bets", JSON.stringify(myBetList));
  }, [myBetList]);

  // === AUDIO SAMPLES REF ===
  const audioRefs = useRef<{
    sound1: HTMLAudioElement | null;
    sound2: HTMLAudioElement | null;
    winSound: HTMLAudioElement | null;
    lossSound: HTMLAudioElement | null;
  }>({
    sound1: null,
    sound2: null,
    winSound: null,
    lossSound: null,
  });

  // Initialize Audio
  useEffect(() => {
    audioRefs.current.sound1 = new Audio("assets/sound/1.mp3");
    audioRefs.current.sound2 = new Audio("assets/sound/2.mp3");
    audioRefs.current.winSound = new Audio("assets/sound/win.mp3");
    audioRefs.current.lossSound = new Audio("assets/sound/loss.mp3");

    // Unmute helper for interactions
    const unmuteAll = () => {
      const refs = audioRefs.current;
      [refs.sound1, refs.sound2, refs.winSound, refs.lossSound].forEach((audio) => {
        if (audio) {
          audio.muted = false;
        }
      });
    };

    document.addEventListener("click", unmuteAll, { once: true });
    return () => {
      document.removeEventListener("click", unmuteAll);
    };
  }, []);

  const playSystemSound = (type: "1" | "2" | "win" | "loss") => {
    try {
      let soundToPlay: HTMLAudioElement | null = null;
      if (type === "1") soundToPlay = audioRefs.current.sound1;
      if (type === "2") soundToPlay = audioRefs.current.sound2;
      if (type === "win") soundToPlay = audioRefs.current.winSound;
      if (type === "loss") soundToPlay = audioRefs.current.lossSound;

      if (soundToPlay) {
        soundToPlay.currentTime = 0;
        soundToPlay.play().catch(() => {});
      }
    } catch (e) {
      console.warn("Audio playing failed:", e);
    }
  };

  // === REAL-TIME WIN-GO DRAW API INTEGRATION ===

  // Helper with 3 tier backup proxy for 100% CORS-proof client-side fetch reliability
  const fetchWinGoData = async (url: string): Promise<any> => {
    // Try 1: Direct fetch
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn("Direct fetch failed, trying CORS proxy...", error);
    }

    // Try 2: corsproxy.io (direct raw proxying)
    try {
      const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn("corsproxy.io failed, trying allorigins...", error);
    }

    // Try 3: allorigins.win (backup raw proxying)
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("All fetch sources failed for URL:", url, error);
      throw error;
    }
    return null;
  };

  const getApiUrlsForMode = (mode: number) => {
    const timestamp = Date.now();
    switch (mode) {
      case 30:
        return {
          draw: `https://draw.ar-lottery01.com/WinGo/WinGo_30S.json?ts=${timestamp}`,
          history: `https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?ts=${timestamp}`
        };
      case 60:
        return {
          draw: `https://draw.ar-lottery01.com/WinGo/WinGo_1M.json?ts=${timestamp}`,
          history: `https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=${timestamp}`
        };
      case 180:
        return {
          draw: `https://draw.ar-lottery01.com/WinGo/WinGo_3M.json?ts=${timestamp}`,
          history: `https://draw.ar-lottery01.com/WinGo/WinGo_3M/GetHistoryIssuePage.json?ts=${timestamp}`
        };
      case 300:
        return {
          draw: `https://draw.ar-lottery01.com/WinGo/WinGo_5M.json?ts=${timestamp}`,
          history: `https://draw.ar-lottery01.com/WinGo/WinGo_5M/GetHistoryIssuePage.json?ts=${timestamp}`
        };
      default:
        return {
          draw: `https://draw.ar-lottery01.com/WinGo/WinGo_30S.json?ts=${timestamp}`,
          history: `https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?ts=${timestamp}`
        };
    }
  };

  // Auto-resolve any left-over pending local bets using the newly fetched history list
  const resolvePendingBetsWithHistory = (historyItems: GameHistoryItem[]) => {
    if (historyItems.length === 0) return;
    setMyBetList((prev) => {
      let changed = false;
      const updated = prev.map((item) => {
        if (item.status === "Pending") {
          const matchingDraw = historyItems.find((h) => h.period === item.period);
          if (matchingDraw) {
            changed = true;
            const resultNum = matchingDraw.number;
            const resultColor = matchingDraw.color;
            const resultSize = matchingDraw.size;
            
            const isBetWon = checkBetSuccess(item, resultNum, resultColor, resultSize);
            const isNum = item.type === "number";
            const tax = item.totalAmount * (isNum ? 0.10 : 0.20);
            const amountAfterTax = item.totalAmount - tax;
            let payout = -amountAfterTax;
            let status: "Succeed" | "Failed" = "Failed";

            if (isBetWon) {
              status = "Succeed";
              const odds = isNum ? 10 : 2.25;
              payout = amountAfterTax * odds;
              
              // Pay out to wallet balance
              setBalance((bal) => bal + payout);
            }

            return {
              ...item,
              status: status,
              payout: payout,
              drawnNum: resultNum,
              drawnColor: resultColor,
              drawnSize: resultSize,
            };
          }
        }
        return item;
      });
      return changed ? updated : prev;
    });
  };

  const fetchHistoryFromApi = async (mode: number) => {
    try {
      const urls = getApiUrlsForMode(mode);
      const result = await fetchWinGoData(urls.history);
      if (result && result.code === 0 && result.data && result.data.list) {
        const apiList = result.data.list.map((item: any) => {
          const num = parseInt(item.number);
          const color = item.color as "violet" | "red" | "green";
          const size = num >= 5 ? "Big" : "Small";
          return {
            period: item.issueNumber,
            number: num,
            size: size as "Big" | "Small",
            color: color,
          };
        });
        if (apiList.length > 0) {
          setHistoryList(apiList);
          const latestNums = apiList.slice(0, 3).map((h: any) => h.number);
          setRecentResults(latestNums);
          resolvePendingBetsWithHistory(apiList);
        }
      }
    } catch (err) {
      console.error("Error fetching history from API:", err);
    }
  };

  const syncCurrentPeriodAndTimer = async (mode: number) => {
    setApiLoading(true);
    try {
      const urls = getApiUrlsForMode(mode);
      const drawData = await fetchWinGoData(urls.draw);
      if (drawData && drawData.current) {
        const issueNumber = drawData.current.issueNumber;
        const endTime = drawData.current.endTime;
        
        setPeriod(issueNumber);
        
        const differenceSeconds = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        setTimeLeft(differenceSeconds);
        setBetsClosed(differenceSeconds <= 5);
        
        return { issueNumber, differenceSeconds };
      }
    } catch (err) {
      console.error("Error syncing current period and timer:", err);
    } finally {
      setApiLoading(false);
    }
    return null;
  };

  // Polling helper on drawing/timer completion
  const pollForResult = async (targetPeriod: string, modeToCheck: number) => {
    setIsDrawing(true);
    let attempts = 0;
    const maxAttempts = 15; // Poll 30 secs
    
    const interval = setInterval(async () => {
      attempts++;
      console.log(`Polling for result attempt ${attempts} for period ${targetPeriod}`);
      
      try {
        const urls = getApiUrlsForMode(modeToCheck);
        const result = await fetchWinGoData(urls.history);
        
        if (result && result.code === 0 && result.data && result.data.list) {
          const drawnItem = result.data.list.find((item: any) => item.issueNumber === targetPeriod);
          
          if (drawnItem) {
            clearInterval(interval);
            const num = parseInt(drawnItem.number);
            const color = drawnItem.color as "violet" | "red" | "green";
            const size = num >= 5 ? "Big" : "Small";
            
            onRealResultDrawn(targetPeriod, num, color, size, modeToCheck);
            setIsDrawing(false);
            return;
          }
        }
      } catch (e) {
        console.error("Error in polling for result:", e);
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.warn(`Polling timed out for period ${targetPeriod}, drawing fallback outcome`);
        
        const fallbackNum = Math.floor(Math.random() * 10);
        const fallbackColor = fallbackNum === 0 || fallbackNum === 5 ? "violet" : fallbackNum % 2 === 0 ? "red" : "green";
        const fallbackSize = fallbackNum >= 5 ? "Big" : "Small";
        
        onRealResultDrawn(targetPeriod, fallbackNum, fallbackColor, fallbackSize, modeToCheck);
        setIsDrawing(false);
      }
    }, 2000);
  };

  // === GAME LOOP TIMER ===
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = (mode: number, duration?: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const initialTime = duration !== undefined ? duration : mode;
    setTimeLeft(initialTime);
    setBetsClosed(initialTime <= 5);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const nextTime = prev - 1;

        // Sound triggers
        if (nextTime <= 5 && nextTime > 1) {
          playSystemSound("1");
        } else if (nextTime === 1) {
          playSystemSound("2");
        }

        // Close bets at 5 seconds
        if (nextTime === 5) {
          setBetsClosed(true);
          setBetModalOpen(false);
        }

        if (nextTime <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => {
            pollForResult(periodRef.current, activeModeRef.current);
          }, 0);
          return 0;
        }

        return nextTime;
      });
    }, 1000);
  };

  // Fetch history, sync timer & period on active mode change
  useEffect(() => {
    let active = true;
    const initMode = async () => {
      if (timerRef.current) clearInterval(timerRef.current);
      
      await fetchHistoryFromApi(activeMode);
      if (!active) return;

      const synced = await syncCurrentPeriodAndTimer(activeMode);
      if (!active) return;

      if (synced) {
        startTimer(activeMode, synced.differenceSeconds);
      } else {
        startTimer(activeMode, activeMode);
      }
    };
    
    initMode();
    
    return () => {
      active = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeMode]);

  // === BET STATE & PLACEMENT ===
  const [currentBet, setCurrentBet] = useState<ActiveBet | null>(null);

  // Refs to avoid stale closures in setInterval callbacks
  const currentBetRef = useRef<ActiveBet | null>(null);
  const periodRef = useRef<string>(period);
  const activeModeRef = useRef<number>(activeMode);

  // Sync refs on every render
  currentBetRef.current = currentBet;
  periodRef.current = period;
  activeModeRef.current = activeMode;
  const [betModalOpen, setBetModalOpen] = useState<boolean>(false);
  const [betModalState, setBetModalState] = useState<{
    type: "color" | "number" | "bigsmall";
    value: string;
    color: string;
    amount: number;
    quantity: number;
    multiplier: number;
  }>({
    type: "color",
    value: "green",
    color: "green",
    amount: 1,
    quantity: 1,
    multiplier: 1,
  });

  const getCompactBetTotal = () => {
    return betModalState.amount * betModalState.quantity * betModalState.multiplier;
  };

  const openBetModal = (type: "color" | "number" | "bigsmall", value: string, color: string) => {
    if (betsClosed) return;
    setBetModalState({
      type,
      value,
      color,
      amount: 1,
      quantity: 1,
      multiplier: 1,
    });
    setBetModalOpen(true);
  };

  const getFormattedDateTime = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  };

  const confirmBet = () => {
    const totalAmount = getCompactBetTotal();
    if (balance < totalAmount) {
      alert("Insufficient Balance");
      return;
    }

    // Deduct balance
    setBalance((prev) => prev - totalAmount);

    // Save active bet for checking wins
    const newActiveBet: ActiveBet = {
      type: betModalState.type,
      value: betModalState.value,
      color: betModalState.color,
      amount: betModalState.amount,
      quantity: betModalState.quantity,
      multiplier: betModalState.multiplier,
      totalAmount: totalAmount,
    };
    setCurrentBet(newActiveBet);

    // Append pending prediction item to My History immediately so user can see it pending!
    const isNum = betModalState.type === "number";
    const tax = totalAmount * (isNum ? 0.100 : 0.200);
    const amountAfterTax = totalAmount - tax;
    const pendingBetItem: MyBetItem = {
      id: "bet_" + period + "_" + Date.now(), // globally unique ID
      period: period.toString(),
      type: betModalState.type,
      value: betModalState.value,
      color: betModalState.color,
      amount: betModalState.amount,
      quantity: betModalState.quantity,
      multiplier: betModalState.multiplier,
      totalAmount: totalAmount,
      tax: tax,
      amountAfterTax: amountAfterTax,
      status: "Pending",
      payout: 0,
      orderTime: getFormattedDateTime(),
      mode: activeMode,
    };
    setMyBetList((prev) => [pendingBetItem, ...prev]);

    setBetModalOpen(false);
  };

  // === WIN/LOSS NOTIFICATION MODAL STATES ===
  const [winNotification, setWinNotification] = useState<{
    show: boolean;
    period: string;
    bonusAmount: number;
    drawnNum: number;
    drawnColor: string;
    drawnSize: string;
    timer: number;
  }>({
    show: false,
    period: "",
    bonusAmount: 0,
    drawnNum: 8,
    drawnColor: "Red",
    drawnSize: "Big",
    timer: 3,
  });

  const [lossNotification, setLossNotification] = useState<{
    show: boolean;
    period: string;
    lostAmount: number;
    drawnNum: number;
    drawnColor: string;
    drawnSize: string;
    timer: number;
  }>({
    show: false,
    period: "",
    lostAmount: 0,
    drawnNum: 1,
    drawnColor: "Green",
    drawnSize: "Small",
    timer: 3,
  });

  // Animated visual helpers for win confetti
  const [winCoins, setWinCoins] = useState<{ id: number; left: string; size: string; delay: string }[]>([]);
  const [winFireworks, setWinFireworks] = useState<{ id: number; left: string; top: string; color: string; delay: string }[]>([]);

  // Win auto-close countdown handler
  useEffect(() => {
    let winTimerId: NodeJS.Timeout;
    if (winNotification.show && winNotification.timer > 0) {
      winTimerId = setInterval(() => {
        setWinNotification((prev) => {
          if (prev.timer <= 1) {
            clearInterval(winTimerId);
            return { ...prev, timer: 0, show: false };
          }
          return { ...prev, timer: prev.timer - 1 };
        });
      }, 1000);
    }
    return () => {
      if (winTimerId) clearInterval(winTimerId);
    };
  }, [winNotification.show, winNotification.timer]);

  // Loss auto-close countdown handler
  useEffect(() => {
    let lossTimerId: NodeJS.Timeout;
    if (lossNotification.show && lossNotification.timer > 0) {
      lossTimerId = setInterval(() => {
        setLossNotification((prev) => {
          if (prev.timer <= 1) {
            clearInterval(lossTimerId);
            return { ...prev, timer: 0, show: false };
          }
          return { ...prev, timer: prev.timer - 1 };
        });
      }, 1000);
    }
    return () => {
      if (lossTimerId) clearInterval(lossTimerId);
    };
  }, [lossNotification.show, lossNotification.timer]);

  // Help calculate bet Success conditions
  const checkBetSuccess = (
    bet: ActiveBet | null,
    resultNum: number,
    resultColor: "violet" | "red" | "green",
    resultSize: "Big" | "Small"
  ) => {
    if (!bet) return false;

    if (bet.type === "number") {
      return parseInt(bet.value) === resultNum;
    }

    if (bet.type === "color") {
      const betVal = bet.value;
      if (betVal === "violet") {
        return resultColor === "violet" || resultNum === 0 || resultNum === 5;
      }
      if (betVal === "green") {
        return resultColor === "green" || resultNum === 5;
      }
      if (betVal === "red") {
        return resultColor === "red" || resultNum === 0;
      }
      return false;
    }

    if (bet.type === "bigsmall") {
      const isBig = resultSize === "Big";
      return bet.value === "big" ? isBig : !isBig;
    }

    return false;
  };

  // Trigger win effects
  const triggerWinNotification = (periodCode: string, winBonus: number, actualNum: number, actualColor: string, actualSize: string) => {
    // Play sound
    playSystemSound("win");

    // Populate coins configuration
    const coinsArr = [];
    for (let i = 0; i < 20; i++) {
      coinsArr.push({
        id: i,
        left: `${Math.random() * 100}vw`,
        size: `${Math.random() * 20 + 10}px`,
        delay: `${Math.random() * 1}s`,
      });
    }
    setWinCoins(coinsArr);

    // Populate fireworks configuration
    const colors = ["#FFD700", "#FF4500", "#32CD32", "#1E90FF", "#FF1493"];
    const fireArr = [];
    for (let i = 0; i < 10; i++) {
      fireArr.push({
        id: i,
        left: `${Math.random() * 100}vw`,
        top: `${Math.random() * 100}vh`,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: `${Math.random() * 0.5}s`,
      });
    }
    setWinFireworks(fireArr);

    // Set Show State
    setWinNotification({
      show: true,
      period: periodCode,
      bonusAmount: winBonus,
      drawnNum: actualNum,
      drawnColor: actualColor,
      drawnSize: actualSize,
      timer: 3,
    });
  };

  // Trigger loss effects
  const triggerLossNotification = (periodCode: string, losses: number, actualNum: number, actualColor: string, actualSize: string) => {
    playSystemSound("loss");
    setLossNotification({
      show: true,
      period: periodCode,
      lostAmount: losses,
      drawnNum: actualNum,
      drawnColor: actualColor,
      drawnSize: actualSize,
      timer: 3,
    });
  };

  // === ROUND END DRAW RESOLUTION FROM REAL API ===
  const onRealResultDrawn = (
    finishedPeriod: string,
    resultNum: number,
    resultColor: "violet" | "red" | "green",
    resultSize: "Big" | "Small",
    mode: number
  ) => {
    const latestBet = currentBetRef.current;

    // Apply outcome check
    const isWin = checkBetSuccess(latestBet, resultNum, resultColor, resultSize);

    // Dynamic result addition
    setRecentResults((prev) => {
      const updated = [resultNum, ...prev];
      if (updated.length > 3) updated.pop();
      return updated;
    });

    // Append to Round History securely
    setHistoryList((prev) => {
      if (prev.some((h) => h.period === finishedPeriod)) {
        return prev;
      }
      const newHistory = [
        {
          period: finishedPeriod,
          number: resultNum,
          size: resultSize,
          color: resultColor,
        },
        ...prev,
      ];
      return newHistory.slice(0, 120); // Keep up to 120 items for high quality statistics and trends
    });

    // Update matching pending prediction items in myBetList with complete details
    setMyBetList((prev) => {
      return prev.map((item) => {
        if (item.period === finishedPeriod && item.status === "Pending") {
          const isBetWon = checkBetSuccess(item, resultNum, resultColor, resultSize);
          const isNum = item.type === "number";
          const tax = item.totalAmount * (isNum ? 0.100 : 0.200);
          const amountAfterTax = item.totalAmount - tax;
          let payout = -amountAfterTax;
          let status: "Succeed" | "Failed" = "Failed";

          if (isBetWon) {
            status = "Succeed";
            const odds = isNum ? 10 : 2.25;
            payout = amountAfterTax * odds;
          }

          return {
            ...item,
            status: status,
            payout: payout,
            drawnNum: resultNum,
            drawnColor: resultColor,
            drawnSize: resultSize,
          };
        }
        return item;
      });
    });

    // Check player bets
    if (latestBet) {
      const betVal = latestBet.totalAmount;
      const isNum = latestBet.type === "number";
      const taxRate = isNum ? 0.100 : 0.200;
      const tax = betVal * taxRate;
      const amountAfterTax = betVal - tax;
      if (isWin) {
        // Calculate dynamic wins multiplier offsets
        const odds = isNum ? 10 : 2.25;
        const totalBonusAwarded = amountAfterTax * odds;
        setBalance((prev) => prev + totalBonusAwarded);

        // Display Congratulations Board
        setTimeout(() => {
          triggerWinNotification(
            finishedPeriod,
            totalBonusAwarded,
            resultNum,
            resultColor,
            resultSize
          );
        }, 300);
      } else {
        // Lost modal trigger
        setTimeout(() => {
          triggerLossNotification(
            finishedPeriod,
            amountAfterTax, // post-tax lost display
            resultNum,
            resultColor,
            resultSize
          );
        }, 300);
      }
      setCurrentBet(null);
    }

    // Remove betting lock instantly for the next period 
    setBetsClosed(false);

    // Direct next period pre-calculation fallback if API fetch fails during next tick
    setPeriod((prev) => {
      try {
        const nextBig = BigInt(prev) + 1n;
        return nextBig.toString();
      } catch (e) {
        const lastNum = parseInt(prev.slice(-4));
        if (!isNaN(lastNum)) {
          return prev.slice(0, -4) + String(lastNum + 1).padStart(4, "0");
        }
        return prev;
      }
    });

    // Warm period starting interval delay
    setTimeout(async () => {
      const synced = await syncCurrentPeriodAndTimer(mode);
      if (synced) {
        startTimer(mode, synced.differenceSeconds);
      } else {
        startTimer(mode, mode);
      }
    }, 100);
  };

  // Format Helper for remaining timers
  const formatTimerDigits = (secs: number) => {
    const mm = Math.floor(secs / 60);
    const ss = secs % 60;
    const mStr = mm.toString().padStart(2, "0");
    const sStr = ss.toString().padStart(2, "0");
    return {
      m10: mStr[0],
      m1: mStr[1],
      s10: sStr[0],
      s1: sStr[1],
    };
  };

  const currentDigits = formatTimerDigits(timeLeft);

  // === WITHDRAW/DEPOSIT SIMULATION MODALS ===
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const [depositValue, setDepositValue] = useState("");
  const [withdrawValue, setWithdrawValue] = useState("");
  const [withdrawUpiId, setWithdrawUpiId] = useState("");

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(depositValue);
    if (isNaN(parsed) || parsed <= 0) {
      alert("Invalid Deposit Amount");
      return;
    }
    setBalance((prev) => prev + parsed);
    alert(`Successfully deposited ₹${parsed.toFixed(2)} test chips!`);
    setDepositValue("");
    setDepositOpen(false);
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(withdrawValue);
    if (isNaN(parsed) || parsed <= 0) {
      alert("Invalid Withdrawal Amount");
      return;
    }
    if (parsed > balance) {
      alert("Insufficient wallet balance for this withdraw value");
      return;
    }
    if (!withdrawUpiId.trim()) {
      alert("Please specify a valid withdrawal destination system");
      return;
    }
    setBalance((prev) => prev - parsed);
    alert(`Withdrawal request of ₹${parsed.toFixed(2)} submitted successfully!`);
    setWithdrawValue("");
    setWithdrawUpiId("");
    setWithdrawOpen(false);
  };

  const filteredMyBetList = myBetList.filter((item) => {
    const itemMode = item.mode || 30;
    return itemMode === activeMode;
  });

  return (
    <div className="bg-background-light dark:bg-background-dark font-display min-h-screen text-text-light dark:text-text-dark select-none">
      <div className="max-w-sm mx-auto bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark min-h-screen pb-10 relative">
        
        {/* === BALANCE HEADER === */}
        <header className="p-4 bg-surface-light dark:bg-surface-dark/50 relative overflow-hidden rounded-b-[2.5rem] shadow-lg">
          <div className="absolute -top-1/2 -left-1/4 w-full h-full bg-blue-500/10 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center text-sm text-text-muted-light dark:text-text-muted-dark">
              <span className="material-icons text-sm mr-1 text-yellow-400">account_balance_wallet</span> Wallet balance
            </div>
            <div className="flex items-center justify-center mt-1">
              <div className="text-3xl font-bold" id="walletBalance">
                ₹{balance.toFixed(2)}
              </div>
              <span
                onClick={() => setBalance(100000.0)}
                title="Reset funds"
                className="material-icons text-text-muted-light dark:text-text-muted-dark ml-2 cursor-pointer active:rotate-185 duration-500 transition-transform"
              >
                refresh
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 w-full">
              <button
                onClick={() => handleWithdraw(balance, setBalance)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-full shadow-md active:scale-95 transition-transform cursor-pointer"
              >
                Withdraw
              </button>
              <button
                onClick={() => handleDeposit(balance, setBalance)}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-full shadow-md active:scale-95 transition-transform cursor-pointer"
              >
                Deposit
              </button>
            </div>
          </div>
        </header>

        {/* === MAIN COLUMN CONTAINER === */}
        <main className="p-4 space-y-4">
          
          {/* Announcement Bar */}
          <div className="flex items-center justify-between bg-surface-light dark:bg-surface-dark rounded-full p-2 text-xs shadow-xs">
            <div className="flex items-center truncate max-w-[80%]">
              <span className="material-icons text-yellow-500 mx-2 animate-pulse">volume_up</span>
              <span className="text-text-muted-light dark:text-text-muted-dark truncate">
                {announcements[currentAnnouncementIdx]}
              </span>
            </div>
            <button
              onClick={() => setRulesOpen(true)}
              className="bg-primary text-black px-4 py-1.5 rounded-full font-semibold outline-none hover:opacity-90 active:scale-95 transition-transform"
            >
              Detail
            </button>
          </div>

          {/* Game Mode Selection */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs" id="modeContainer">
            {/* WINGO 30S */}
            <div
              onClick={() => {
                setActiveMode(30);
              }}
              className={`mode-btn rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer transition-all ${
                activeMode === 30
                  ? "bg-primary/20 dark:bg-primary/30 text-primary"
                  : "bg-surface-light dark:bg-surface-dark text-text-muted-dark"
              }`}
            >
              <img
                alt="Wingo 30s icon"
                className="w-10 h-10 mb-1.5 rounded-full bg-black/20"
                src="https://jai.club/assets/png/time_a-b0f9f6e5.webp"
              />
              <span className={activeMode === 30 ? "font-semibold" : ""}>WinGo 30s</span>
            </div>

            {/* WINGO 1M */}
            <div
              onClick={() => {
                setActiveMode(60);
              }}
              className={`mode-btn rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer transition-all ${
                activeMode === 60
                  ? "bg-primary/20 dark:bg-primary/30 text-primary"
                  : "bg-surface-light dark:bg-surface-dark text-text-muted-dark"
              }`}
            >
              <img
                alt="Wingo 1m icon"
                className="w-10 h-10 mb-1.5 rounded-full bg-black/20"
                src="https://jai.club/assets/png/time_a-b0f9f6e5.webp"
              />
              <span className={activeMode === 60 ? "font-semibold" : ""}>WinGo 1m</span>
            </div>

            {/* WINGO 3M */}
            <div
              onClick={() => {
                setActiveMode(180);
              }}
              className={`mode-btn rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer transition-all ${
                activeMode === 180
                  ? "bg-primary/20 dark:bg-primary/30 text-primary"
                  : "bg-surface-light dark:bg-surface-dark text-text-muted-dark"
              }`}
            >
              <img
                alt="Wingo 3m icon"
                className="w-10 h-10 mb-1.5 rounded-full bg-black/20"
                src="https://jai.club/assets/png/time_a-b0f9f6e5.webp"
              />
              <span className={activeMode === 180 ? "font-semibold" : ""}>WinGo 3m</span>
            </div>

            {/* WINGO 5M */}
            <div
              onClick={() => {
                setActiveMode(300);
              }}
              className={`mode-btn rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer transition-all ${
                activeMode === 300
                  ? "bg-primary/20 dark:bg-primary/30 text-primary"
                  : "bg-surface-light dark:bg-surface-dark text-text-muted-dark"
              }`}
            >
              <img
                alt="Wingo 5m icon"
                className="w-10 h-10 mb-1.5 rounded-full bg-black/20"
                src="https://jai.club/assets/png/time_a-b0f9f6e5.webp"
              />
              <span className={activeMode === 300 ? "font-semibold" : ""}>WinGo 5m</span>
            </div>
          </div>

          {/* Current Game Info Block */}
          <div className="bg-primary/10 dark:bg-primary/20 rounded-lg p-4 relative">
            <div className="grid grid-cols-2">
              <div>
                <button
                  onClick={() => setRulesOpen(true)}
                  className="flex items-center space-x-1 text-xs bg-black/10 dark:bg-black/20 px-2 py-1 rounded-full mb-2 outline-none dark:hover:bg-black/30"
                >
                  <span className="material-icons text-sm">menu_book</span>
                  <span>How to play</span>
                </button>
                <p className="text-sm font-semibold" id="gameTitle">
                  WinGo {activeMode === 30 ? "30s" : activeMode === 60 ? "1m" : activeMode === 180 ? "3m" : "5m"}
                </p>
                <div className="flex space-x-1 mt-2" id="recentResults">
                  {recentResults.map((n, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden"
                    >
                      <img
                        alt={`Recent ${n}`}
                        src={`assets/png/1to9/${n}.png`}
                        className="number-full"
                        onError={(e) => {
                          // Failover to text visual fallback if local asset is directory path or empty
                          const fallbackSpan = document.createElement("span");
                          fallbackSpan.className = "text-xs font-bold w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-700 dark:text-gray-100 text-gray-800 rounded";
                          fallbackSpan.innerText = n.toString();
                          e.currentTarget.replaceWith(fallbackSpan);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-right flex flex-col justify-between items-end">
                <p className="text-xs text-text-muted-dark font-semibold">Time remaining</p>
                {isDrawing ? (
                  <div className="flex items-center space-x-1 my-2 text-sm font-bold text-amber-500 animate-pulse bg-amber-500/10 px-2.5 py-1 rounded-sm shadow-xs">
                    <span className="material-icons animate-spin text-xs">sync</span>
                    <span>Drawing...</span>
                  </div>
                ) : apiLoading ? (
                  <div className="flex items-center space-x-1 my-2 text-sm font-bold text-blue-500 animate-pulse bg-blue-500/10 px-2.5 py-1 rounded-sm shadow-xs">
                    <span className="material-icons animate-pulse text-xs">hourglass_empty</span>
                    <span>Syncing...</span>
                  </div>
                ) : (
                  <div
                    className={`flex justify-end items-center space-x-1 my-1.5 text-2xl ${
                      timeLeft <= 5 ? "pulse-red" : ""
                    }`}
                    id="timerDisplay"
                  >
                    <span className="timer-segment">{currentDigits.m10}</span>
                    <span className="timer-segment">{currentDigits.m1}</span>
                    <span className="font-bold">:</span>
                    <span className="timer-segment">{currentDigits.s10}</span>
                    <span className="timer-segment">{currentDigits.s1}</span>
                  </div>
                )}
                <p className="text-[11px] text-text-muted-dark font-mono truncate w-full" id="periodNumber" title={period}>
                  P: {period}
                </p>
              </div>
            </div>

            {/* Locked Betting overlay indicator */}
            {betsClosed && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center rounded-lg">
                <span className="material-icons text-red-500 animate-bounce">lock</span>
                <span className="text-xs font-bold text-red-400 uppercase tracking-widest mt-1">Betting Locked</span>
              </div>
            )}
          </div>

          {/* Betting Interface Buttons */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-4 space-y-4 shadow-md">
            {/* Color buttons */}
            <div className="grid grid-cols-3 gap-3">
              <button
                disabled={betsClosed}
                onClick={() => openBetModal("color", "green", "green")}
                className={`bg-green-500 text-white font-bold py-2.5 rounded-lg shadow bet-color transition-opacity active:scale-95 duration-100 ${
                  betsClosed ? "opacity-30 cursor-not-allowed" : "hover:bg-green-600"
                }`}
              >
                Green
              </button>
              <button
                disabled={betsClosed}
                onClick={() => openBetModal("color", "violet", "violet")}
                className={`bg-purple-500 text-white font-bold py-2.5 rounded-lg shadow bet-color transition-opacity active:scale-95 duration-100 ${
                  betsClosed ? "opacity-30 cursor-not-allowed" : "hover:bg-purple-600"
                }`}
              >
                Violet
              </button>
              <button
                disabled={betsClosed}
                onClick={() => openBetModal("color", "red", "red")}
                className={`bg-red-500 text-white font-bold py-2.5 rounded-lg shadow bet-color transition-opacity active:scale-95 duration-100 ${
                  betsClosed ? "opacity-30 cursor-not-allowed" : "hover:bg-red-600"
                }`}
              >
                Red
              </button>
            </div>

            {/* 0-9 grids */}
            <div className="grid grid-cols-5 gap-3 text-center">
              {/* Number 0 */}
              <button
                disabled={betsClosed}
                onClick={() => openBetModal("number", "0", "violet")}
                className={`w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-red-500 bet-number p-0 overflow-hidden active:scale-90 transition-transform ${
                  betsClosed ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                <img
                  alt="Number 0 icon"
                  src="assets/png/1to9/0.png"
                  className="number-full"
                  onError={(e) => {
                    const wrap = document.createElement("span");
                    wrap.className = "w-full h-full flex items-center justify-center font-bold text-white text-md";
                    wrap.innerText = "0";
                    e.currentTarget.replaceWith(wrap);
                  }}
                />
              </button>

              {/* Number 1 */}
              <button
                disabled={betsClosed}
                onClick={() => openBetModal("number", "1", "green")}
                className={`w-12 h-12 rounded-full bg-green-500 bet-number p-0 overflow-hidden active:scale-90 transition-transform ${
                  betsClosed ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                <img
                  alt="Number 1 icon"
                  src="assets/png/1to9/1.png"
                  className="number-full"
                  onError={(e) => {
                    const wrap = document.createElement("span");
                    wrap.className = "w-full h-full flex items-center justify-center font-bold text-white text-md";
                    wrap.innerText = "1";
                    e.currentTarget.replaceWith(wrap);
                  }}
                />
              </button>

              {/* Number 2 */}
              <button
                disabled={betsClosed}
                onClick={() => openBetModal("number", "2", "red")}
                className={`w-12 h-12 rounded-full bg-red-500 bet-number p-0 overflow-hidden active:scale-90 transition-transform ${
                  betsClosed ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                <img
                  alt="Number 2 icon"
                  src="assets/png/1to9/2.png"
                  className="number-full"
                  onError={(e) => {
                    const wrap = document.createElement("span");
                    wrap.className = "w-full h-full flex items-center justify-center font-bold text-white text-md";
                    wrap.innerText = "2";
                    e.currentTarget.replaceWith(wrap);
                  }}
                />
              </button>

              {/* Number 3 */}
              <button
                disabled={betsClosed}
                onClick={() => openBetModal("number", "3", "green")}
                className={`w-12 h-12 rounded-full bg-green-500 bet-number p-0 overflow-hidden active:scale-90 transition-transform ${
                  betsClosed ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                <img
                  alt="Number 3 icon"
                  src="assets/png/1to9/3.png"
                  className="number-full"
                  onError={(e) => {
                    const wrap = document.createElement("span");
                    wrap.className = "w-full h-full flex items-center justify-center font-bold text-white text-md";
                    wrap.innerText = "3";
                    e.currentTarget.replaceWith(wrap);
                  }}
                />
              </button>

              {/* Number 4 */}
              <button
                disabled={betsClosed}
                onClick={() => openBetModal("number", "4", "red")}
                className={`w-12 h-12 rounded-full bg-red-500 bet-number p-0 overflow-hidden active:scale-90 transition-transform ${
                  betsClosed ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                <img
                  alt="Number 4 icon"
                  src="assets/png/1to9/4.png"
                  className="number-full"
                  onError={(e) => {
                    const wrap = document.createElement("span");
                    wrap.className = "w-full h-full flex items-center justify-center font-bold text-white text-md";
                    wrap.innerText = "4";
                    e.currentTarget.replaceWith(wrap);
                  }}
                />
              </button>

              {/* Number 5 */}
              <button
                disabled={betsClosed}
                onClick={() => openBetModal("number", "5", "violet")}
                className={`w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-purple-500 bet-number p-0 overflow-hidden active:scale-90 transition-transform ${
                  betsClosed ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                <img
                  alt="Number 5"
                  src="assets/png/1to9/5.png"
                  className="number-full"
                  onError={(e) => {
                    const wrap = document.createElement("span");
                    wrap.className = "w-full h-full flex items-center justify-center font-bold text-white text-md";
                    wrap.innerText = "5";
                    e.currentTarget.replaceWith(wrap);
                  }}
                />
              </button>

              {/* Number 6 */}
              <button
                disabled={betsClosed}
                onClick={() => openBetModal("number", "6", "red")}
                className={`w-12 h-12 rounded-full bg-red-500 bet-number p-0 overflow-hidden active:scale-90 transition-transform ${
                  betsClosed ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                <img
                  alt="Number 6 icon"
                  src="assets/png/1to9/6.png"
                  className="number-full"
                  onError={(e) => {
                    const wrap = document.createElement("span");
                    wrap.className = "w-full h-full flex items-center justify-center font-bold text-white text-md";
                    wrap.innerText = "6";
                    e.currentTarget.replaceWith(wrap);
                  }}
                />
              </button>

              {/* Number 7 */}
              <button
                disabled={betsClosed}
                onClick={() => openBetModal("number", "7", "green")}
                className={`w-12 h-12 rounded-full bg-green-500 bet-number p-0 overflow-hidden active:scale-90 transition-transform ${
                  betsClosed ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                <img
                  alt="Number 7 icon"
                  src="assets/png/1to9/7.png"
                  className="number-full"
                  onError={(e) => {
                    const wrap = document.createElement("span");
                    wrap.className = "w-full h-full flex items-center justify-center font-bold text-white text-md";
                    wrap.innerText = "7";
                    e.currentTarget.replaceWith(wrap);
                  }}
                />
              </button>

              {/* Number 8 */}
              <button
                disabled={betsClosed}
                onClick={() => openBetModal("number", "8", "red")}
                className={`w-12 h-12 rounded-full bg-red-500 bet-number p-0 overflow-hidden active:scale-90 transition-transform ${
                  betsClosed ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                <img
                  alt="Number 8 icon"
                  src="assets/png/1to9/8.png"
                  className="number-full"
                  onError={(e) => {
                    const wrap = document.createElement("span");
                    wrap.className = "w-full h-full flex items-center justify-center font-bold text-white text-md";
                    wrap.innerText = "8";
                    e.currentTarget.replaceWith(wrap);
                  }}
                />
              </button>

              {/* Number 9 */}
              <button
                disabled={betsClosed}
                onClick={() => openBetModal("number", "9", "green")}
                className={`w-12 h-12 rounded-full bg-green-500 bet-number p-0 overflow-hidden active:scale-90 transition-transform ${
                  betsClosed ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                <img
                  alt="Number 9 icon"
                  src="assets/png/1to9/9.png"
                  className="number-full"
                  onError={(e) => {
                    const wrap = document.createElement("span");
                    wrap.className = "w-full h-full flex items-center justify-center font-bold text-white text-md";
                    wrap.innerText = "9";
                    e.currentTarget.replaceWith(wrap);
                  }}
                />
              </button>
            </div>

            {/* Sizing selection (Big / Small) */}
            <div className="grid grid-cols-2 gap-0 shadow-lg rounded-lg overflow-hidden">
              <button
                disabled={betsClosed}
                onClick={() => openBetModal("bigsmall", "big", "orange")}
                className={`bg-orange-400 text-white font-bold py-2.5 rounded-l-lg bet-bigsmall active:bg-orange-500 transition-colors ${
                  betsClosed ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                Big (5-9)
              </button>
              <button
                disabled={betsClosed}
                onClick={() => openBetModal("bigsmall", "small", "blue")}
                className={`bg-blue-500 text-white font-bold py-2.5 rounded-r-lg bet-bigsmall active:bg-blue-600 transition-colors ${
                  betsClosed ? "opacity-30 cursor-not-allowed" : ""
                }`}
              >
                Small (0-4)
              </button>
            </div>

            {/* Print Active Pending Bet status trace */}
            {currentBet && (
              <div className="text-center p-2.5 bg-primary/20 text-text-light dark:text-text-dark rounded-lg text-xs font-semibold animate-pulse">
                ⭐ Placed prediction: <span className="font-bold text-primary">{currentBet.value.toUpperCase()}</span> (₹{currentBet.totalAmount}) is active.
              </div>
            )}
          </div>

          {/* Bottom Interactive Panels Area */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden shadow-lg flex flex-col">
            {/* Tab navigation headers */}
            <div className="grid grid-cols-3 gap-1 bg-black/10 dark:bg-black/40 p-1">
              <button
                onClick={() => {
                  setActiveBottomTab("history");
                  setHistoryPage(1);
                }}
                className={`py-2.5 rounded-xl text-center text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer select-none ${
                  activeBottomTab === "history"
                    ? "bg-yellow-400 text-amber-950 shadow-md transform scale-[1.02]"
                    : "bg-surface-light/40 dark:bg-surface-dark/40 hover:bg-black/10 text-text-light dark:text-text-dark"
                }`}
              >
                <span className="material-icons text-xs">history</span> Game history
              </button>
              
              <button
                onClick={() => {
                  setActiveBottomTab("chart");
                  setHistoryPage(1);
                }}
                className={`py-2.5 rounded-xl text-center text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer select-none ${
                  activeBottomTab === "chart"
                    ? "bg-yellow-400 text-amber-950 shadow-md transform scale-[1.02]"
                    : "bg-surface-light/40 dark:bg-surface-dark/40 hover:bg-black/10 text-text-light dark:text-text-dark"
                }`}
              >
                <span className="material-icons text-xs">analytics</span> Chart
              </button>

              <button
                onClick={() => {
                  setActiveBottomTab("myhistory");
                  setMyHistoryPage(1);
                  setExpandedBetId(null);
                }}
                className={`py-2.5 rounded-xl text-center text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer select-none ${
                  activeBottomTab === "myhistory"
                    ? "bg-yellow-400 text-amber-950 shadow-md transform scale-[1.02]"
                    : "bg-surface-light/40 dark:bg-surface-dark/40 hover:bg-black/10 text-text-light dark:text-text-dark"
                }`}
              >
                <span className="material-icons text-xs">person</span> My history
              </button>
            </div>

            {/* TAB CONTENT 1: GAME HISTORY */}
            {activeBottomTab === "history" && (
              <div className="text-xs" id="gameHistory">
                <div className="grid grid-cols-4 gap-2 text-center p-2 font-bold bg-primary/10 text-primary">
                  <div>Period</div>
                  <div>Number</div>
                  <div>Size</div>
                  <div>Color</div>
                </div>

                {historyList.slice((historyPage - 1) * 15, historyPage * 15).map((item, idx) => (
                  <div
                    key={item.period + idx}
                    className="grid grid-cols-4 gap-2 text-center py-1 px-2.5 items-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium text-text-light dark:text-text-dark"
                  >
                    <div className="text-text-muted-dark font-mono text-[10px]" title={item.period}>
                      ...{item.period.slice(-4)}
                    </div>
                    <div className="flex justify-center">
                      <img
                        alt={`Ball ${item.number}`}
                        src={`assets/png/1to9/${item.number}.png`}
                        className="w-8 h-8 drop-shadow-md rounded-full object-contain"
                        onError={(e) => {
                          const fallbackBall = document.createElement("span");
                          fallbackBall.className = "w-8 h-8 flex items-center justify-center rounded-full font-bold text-[13px] text-white shadow-sm";
                          const isViolet = item.color === "violet";
                          fallbackBall.style.background = isViolet
                            ? "linear-gradient(135deg, #a855f7, #ef4444)"
                            : item.color === "red"
                            ? "#ef4444"
                            : "#10b981";
                          fallbackBall.innerText = item.number.toString();
                          e.currentTarget.replaceWith(fallbackBall);
                        }}
                      />
                    </div>
                    <div className={`font-semibold ${item.size === "Big" ? "text-orange-400" : "text-blue-500"}`}>{item.size}</div>
                    <div className="flex justify-center">
                      <div
                        className={`w-3 h-3 rounded-full shadow-xs ${
                          item.color === "violet"
                            ? "bg-purple-500"
                            : item.color === "red"
                            ? "bg-red-500"
                            : "bg-emerald-500"
                        }`}
                      ></div>
                    </div>
                  </div>
                ))}

                {/* Game History Pagination controls */}
                <div className="flex items-center justify-center gap-4 p-3 bg-black/5 dark:bg-black/20 text-xs shrink-0 select-none">
                  <button
                    disabled={historyPage === 1}
                    onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                    className={`p-1.5 rounded-lg bg-surface-light dark:bg-surface-dark font-bold font-mono transition-opacity flex items-center justify-center hover:opacity-80 active:scale-95 cursor-pointer ${
                      historyPage === 1 ? "opacity-30 cursor-not-allowed" : ""
                    }`}
                  >
                    <span className="material-icons text-sm">chevron_left</span>
                  </button>
                  <span className="font-semibold text-text-muted-dark">
                    {historyPage}/{Math.max(1, Math.ceil(historyList.length / 15))}
                  </span>
                  <button
                    disabled={historyPage >= Math.ceil(historyList.length / 15)}
                    onClick={() => setHistoryPage((prev) => Math.min(Math.ceil(historyList.length / 15), prev + 1))}
                    className={`p-1.5 rounded-lg bg-surface-light dark:bg-surface-dark font-bold font-mono transition-opacity flex items-center justify-center hover:opacity-80 active:scale-95 cursor-pointer ${
                      historyPage >= Math.ceil(historyList.length / 15) ? "opacity-30 cursor-not-allowed" : ""
                    }`}
                  >
                    <span className="material-icons text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: CHART WITH SVG DRAWING CONNECTIONS */}
            {activeBottomTab === "chart" && (
              <ChartSection
                historyList={historyList}
                historyPage={historyPage}
                setHistoryPage={setHistoryPage}
              />
            )}

            {/* TAB CONTENT 3: USER BET HISTORY */}
            {activeBottomTab === "myhistory" && (
              <div className="text-xs">
                {filteredMyBetList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center bg-black/5 dark:bg-black/10">
                    <span className="material-icons text-3xl text-text-muted-dark mb-2">dashboard_customize</span>
                    <p className="font-semibold text-text-muted-dark text-xs">No prediction records found.</p>
                  </div>
                ) : (
                  <div>
                    {filteredMyBetList.slice((myHistoryPage - 1) * 10, myHistoryPage * 10).map((item) => {
                      const isExpanded = expandedBetId === item.id;
                      return (
                        <div key={item.id} className="flex flex-col transition-all">
                          {/* Accordion Header row clickable */}
                          <div
                            onClick={() => setExpandedBetId(isExpanded ? null : item.id)}
                            className="flex items-center justify-between p-3.5 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              {/* Option Badge representation */}
                              {item.type === "bigsmall" ? (
                                <div className={`w-10 h-10 rounded-lg font-bold text-center flex items-center justify-center text-[10px] uppercase text-white ${
                                  item.value === "big" ? "bg-orange-400" : "bg-blue-500"
                                }`}>
                                  {item.value}
                                </div>
                              ) : item.type === "color" ? (
                                <div className={`w-10 h-10 rounded-lg font-bold text-center flex items-center justify-center text-[10px] uppercase text-white ${
                                  item.value === "green" ? "bg-emerald-500" : item.value === "violet" ? "bg-purple-500" : "bg-red-500"
                                }`}>
                                  {item.value}
                                </div>
                              ) : (
                                <div className={`w-10 h-10 rounded-full font-bold text-center flex items-center justify-center text-xs text-white ${
                                  item.color === "violet" ? "bg-purple-500" : item.color === "red" ? "bg-red-500" : "bg-green-500"
                                }`}>
                                  {item.value}
                                </div>
                              )}

                              <div className="flex flex-col">
                                <span className="font-mono font-bold text-text-light dark:text-text-dark">{item.period}</span>
                                <span className="text-[10px] text-text-muted-dark font-medium mt-0.5">{item.orderTime}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 text-right">
                              <div className="flex flex-col items-end">
                                {/* Result Badge */}
                                {item.status === "Pending" ? (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold border border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                                    Pending
                                  </span>
                                ) : item.status === "Succeed" ? (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold border border-emerald-500 bg-emerald-500/10 text-emerald-500">
                                    Succeed
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold border border-red-500 bg-red-500/10 text-red-500">
                                    Failed
                                  </span>
                                )}

                                {/* Payout display */}
                                {item.status !== "Pending" && (
                                  <span className={`text-[11px] font-bold mt-1 font-mono ${item.status === "Succeed" ? "text-emerald-500" : "text-red-500"}`}>
                                    {item.status === "Succeed" ? `+₹${item.payout.toFixed(2)}` : `-₹${Math.abs(item.payout).toFixed(2)}`}
                                  </span>
                                )}
                              </div>
                              <span className={`material-icons text-sm text-text-muted-dark transform transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                                chevron_right
                              </span>
                            </div>
                          </div>

                          {/* Collased Expanded Details table matching Screenshots 1 & 3 */}
                          {isExpanded && (
                            <div className="px-3 pb-4 pt-1 bg-black/5 dark:bg-black/25 overflow-hidden animate-fade-in text-[11px] font-medium text-text-light dark:text-text-dark">
                              <div className="p-3 bg-white/40 dark:bg-surface-dark/40 rounded-xl space-y-2.5">
                                <h4 className="text-xs font-bold text-amber-500 dark:text-primary pb-1.5 uppercase tracking-wider">
                                  Details
                                </h4>
                                <div className="grid grid-cols-2 gap-y-2 pb-2.5">
                                  <div className="text-text-muted-dark">Period</div>
                                  <div className="text-right font-mono font-semibold">{item.period}</div>
                                  
                                  <div className="text-text-muted-dark">Purchase amount</div>
                                  <div className="text-right font-semibold">₹{(item.totalAmount).toFixed(2)}</div>

                                  <div className="text-text-muted-dark">Quantity</div>
                                  <div className="text-right font-semibold">{item.quantity} (x{item.multiplier})</div>

                                  <div className="text-text-muted-dark">Amount after tax</div>
                                  <div className="text-right text-emerald-600 dark:text-primary font-bold">₹{item.amountAfterTax.toFixed(2)}</div>

                                  <div className="text-text-muted-dark">Tax (2%)</div>
                                  <div className="text-right font-mono">₹{item.tax.toFixed(2)}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-y-2.5 text-xs font-semibold">
                                  <div className="text-text-muted-dark self-center">Result</div>
                                  <div className="text-right flex items-center justify-end gap-1.5">
                                    {item.status === "Pending" ? (
                                      <span className="text-text-muted-dark italic">Drawing...</span>
                                    ) : (
                                      <>
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white ${
                                          item.drawnColor === "violet" ? "bg-purple-500" : item.drawnColor === "red" ? "bg-red-500" : "bg-emerald-500"
                                        }`}>
                                          {item.drawnNum}
                                        </span>
                                        <span className="capitalize">{item.drawnColor}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${item.drawnSize === "Big" ? "bg-orange-400 text-white" : "bg-blue-500 text-white"}`}>
                                          {item.drawnSize}
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  <div className="text-text-muted-dark">Select</div>
                                  <div className="text-right uppercase font-bold text-amber-500 dark:text-primary">{item.value}</div>

                                  <div className="text-text-muted-dark">Status</div>
                                  <div className={`text-right font-bold ${item.status === "Succeed" ? "text-emerald-500" : item.status === "Failed" ? "text-red-500" : "text-yellow-500 animate-pulse"}`}>
                                    {item.status}
                                  </div>

                                  <div className="text-text-muted-dark">Win/lose</div>
                                  <div className={`text-right font-mono font-bold text-sm ${item.status === "Succeed" ? "text-emerald-500" : item.status === "Failed" ? "text-red-500" : "text-text-light dark:text-text-dark"}`}>
                                    {item.status === "Pending" ? "Pending" : item.status === "Succeed" ? `+₹${item.payout.toFixed(2)}` : `-₹${Math.abs(item.payout).toFixed(2)}`}
                                  </div>

                                  <div className="text-text-muted-dark">Order time</div>
                                  <div className="text-right text-[10px] text-text-muted-dark">{item.orderTime}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* My Bet History Pagination controls */}
                <div className="flex items-center justify-center gap-4 p-3 bg-black/5 dark:bg-black/20 text-xs shrink-0 select-none">
                  <button
                    disabled={myHistoryPage === 1}
                    onClick={() => setMyHistoryPage((prev) => Math.max(1, prev - 1))}
                    className={`p-1.5 rounded-lg bg-surface-light dark:bg-surface-dark font-bold font-mono transition-opacity flex items-center justify-center hover:opacity-80 active:scale-95 cursor-pointer ${
                      myHistoryPage === 1 ? "opacity-30 cursor-not-allowed" : ""
                    }`}
                  >
                    <span className="material-icons text-sm">chevron_left</span>
                  </button>
                  <span className="font-semibold text-text-muted-dark">
                    {myHistoryPage}/{Math.max(1, Math.ceil(filteredMyBetList.length / 10))}
                  </span>
                  <button
                    disabled={myHistoryPage >= Math.ceil(filteredMyBetList.length / 10)}
                    onClick={() => setMyHistoryPage((prev) => Math.min(Math.ceil(filteredMyBetList.length / 10), prev + 1))}
                    className={`p-1.5 rounded-lg bg-surface-light dark:bg-surface-dark font-bold font-mono transition-opacity flex items-center justify-center hover:opacity-80 active:scale-95 cursor-pointer ${
                      myHistoryPage >= Math.ceil(filteredMyBetList.length / 10) ? "opacity-30 cursor-not-allowed" : ""
                    }`}
                  >
                    <span className="material-icons text-sm">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ================= COMPACT BET MODAL ================= */}
        {betModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
              onClick={() => setBetModalOpen(false)}
            ></div>
            <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-t-xl modal-slide-up overflow-hidden shadow-2xl transition-all duration-300 z-10">
              
              {/* Header color shifts in sync with choose type color */}
              <div
                className={`p-3 transition-colors duration-150 text-white ${
                  betModalState.color === "green"
                    ? "bg-emerald-500"
                    : betModalState.color === "violet"
                    ? "bg-purple-500"
                    : betModalState.color === "red"
                    ? "bg-red-500"
                    : betModalState.color === "orange"
                    ? "bg-orange-400"
                    : "bg-blue-500"
                }`}
                id="modalHeader"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      id="modalIcon"
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20"
                    >
                      <span className="material-icons text-md">casino</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm" id="modalGameName">
                        WinGo {activeMode === 30 ? "30s" : activeMode === 60 ? "1m" : activeMode === 180 ? "3m" : "5m"}
                      </h3>
                      <p id="modalBetType" className="text-xs opacity-90 font-medium">
                        Select: {betModalState.value.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setBetModalOpen(false)}
                    className="hover:scale-115 active:scale-95 duration-100 transition-transform"
                  >
                    <span className="material-icons text-xl">close</span>
                  </button>
                </div>
              </div>

              {/* Amount Unit Selectors */}
              <div className="p-2">
                <div className="grid grid-cols-4 gap-1.5" id="amountGrid">
                  {[1, 10, 100, 1000].map((val) => (
                    <button
                      key={val}
                      onClick={() => setBetModalState((prev) => ({ ...prev, amount: val }))}
                      className={`py-1.5 rounded text-xs font-medium transition-all ${
                        betModalState.amount === val
                          ? "bg-primary text-black font-semibold"
                          : "bg-gray-100 dark:bg-gray-700 text-text-light dark:text-text-dark hover:bg-gray-200 dark:hover:bg-gray-650"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Incrementor */}
              <div className="p-2 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium select-none">Quantity</span>
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                  <button
                    onClick={() =>
                      setBetModalState((prev) => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))
                    }
                    className="px-3 py-1 text-lg font-bold hover:bg-black/10 dark:hover:bg-white/10 active:scale-90"
                  >
                    -
                  </button>
                  <span id="quantityValue" className="px-4 font-bold text-sm select-none">
                    {betModalState.quantity}
                  </span>
                  <button
                    onClick={() =>
                      setBetModalState((prev) => ({ ...prev, quantity: prev.quantity + 1 }))
                    }
                    className="px-3 py-1 text-lg font-bold hover:bg-black/10 dark:hover:bg-white/10 active:scale-90"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Modifiers Grid */}
              <div className="p-2 grid grid-cols-6 gap-1" id="modalMultiplierGrid">
                {[1, 5, 10, 20, 50, 100].map((val) => (
                  <button
                    key={val}
                    onClick={() => setBetModalState((prev) => ({ ...prev, multiplier: val }))}
                    className={`py-1 rounded text-[10px] transition-all ${
                      betModalState.multiplier === val
                        ? "bg-green-500 text-white font-bold"
                        : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-650"
                    }`}
                  >
                    X{val}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="p-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setBetModalOpen(false)}
                  className="bg-gray-200 dark:bg-gray-700 py-2.5 rounded font-bold text-xs hover:opacity-90 active:scale-95 transition-all text-text-light dark:text-text-dark"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBet}
                  id="confirmBetBtn"
                  className={`py-2.5 rounded font-bold text-white text-xs hover:shadow-lg active:scale-95 duration-100 transform text-center ${
                    betModalState.color === "green"
                      ? "bg-emerald-600"
                      : betModalState.color === "violet"
                      ? "bg-purple-600"
                      : betModalState.color === "red"
                      ? "bg-red-600"
                      : betModalState.color === "orange"
                      ? "bg-orange-500"
                      : "bg-blue-600"
                  }`}
                >
                  Confirm ₹{getCompactBetTotal().toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= WIN NOTIFICATION ================= */}
        <WinNotification
          show={winNotification.show}
          onClose={() => setWinNotification((prev) => ({ ...prev, show: false }))}
          period={winNotification.period}
          bonusAmount={winNotification.bonusAmount}
          drawnNum={winNotification.drawnNum}
          drawnColor={winNotification.drawnColor}
          drawnSize={winNotification.drawnSize}
          timer={winNotification.timer}
          winCoins={winCoins}
          winFireworks={winFireworks}
        />

        {/* ================= LOSS NOTIFICATION ================= */}
        <LossNotification
          show={lossNotification.show}
          onClose={() => setLossNotification((prev) => ({ ...prev, show: false }))}
          period={lossNotification.period}
          lostAmount={lossNotification.lostAmount}
          drawnNum={lossNotification.drawnNum}
          drawnColor={lossNotification.drawnColor}
          drawnSize={lossNotification.drawnSize}
          timer={lossNotification.timer}
        />

        {/* ================= DEPOSIT SIMULATION MODAL ================= */}
        {depositOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
              onClick={() => setDepositOpen(false)}
            ></div>
            <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-2xl border dark:border-gray-700 z-10">
              <div className="flex items-center justify-between border-b pb-3 mb-4 dark:border-gray-750">
                <h3 className="font-bold text-base flex items-center gap-1">
                  <span className="material-icons text-green-500">add_circle</span> Deposit Test Chips
                </h3>
                <button
                  onClick={() => setDepositOpen(false)}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
              <form onSubmit={handleDepositSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                    Deposit Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 5000"
                    value={depositValue}
                    onChange={(e) => setDepositValue(e.target.value)}
                    className="w-full p-2.5 rounded-lg border dark:border-gray-700 dark:bg-gray-750 text-sm focus:ring-2 focus:ring-primary focus:outline-none text-text-light dark:text-text-dark font-sans font-medium"
                  />
                </div>

                {/* Quick select presets */}
                <div className="grid grid-cols-4 gap-2">
                  {[500, 1000, 5000, 20000].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setDepositValue(preset.toString())}
                      className="py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 rounded font-semibold transition-all text-text-light dark:text-text-dark"
                    >
                      +₹{preset}
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg text-sm transition-all active:scale-95"
                  >
                    Confirm Simulation Deposit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= WITHDRAW SIMULATION MODAL ================= */}
        {withdrawOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-xs"
              onClick={() => setWithdrawOpen(false)}
            ></div>
            <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-2xl border dark:border-gray-700 z-10">
              <div className="flex items-center justify-between border-b pb-3 mb-4 dark:border-gray-750">
                <h3 className="font-bold text-base flex items-center gap-1">
                  <span className="material-icons text-red-500">remove_circle</span> Withdraw Test Chips
                </h3>
                <button
                  onClick={() => setWithdrawOpen(false)}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
              <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                    UPI Address Destination Link
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. tashanpay@ybl"
                    value={withdrawUpiId}
                    onChange={(e) => setWithdrawUpiId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border dark:border-gray-700 dark:bg-gray-750 text-sm focus:ring-2 focus:ring-primary focus:outline-none text-text-light dark:text-text-dark font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                    Amount to Withdraw (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 1000"
                    value={withdrawValue}
                    onChange={(e) => setWithdrawValue(e.target.value)}
                    className="w-full p-2.5 rounded-lg border dark:border-gray-700 dark:bg-gray-750 text-sm focus:ring-2 focus:ring-primary focus:outline-none text-text-light dark:text-text-dark font-sans font-medium"
                  />
                </div>

                {/* Quick set maximum preset */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setWithdrawValue(Math.floor(balance).toString())}
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    Withdraw All (Max: ₹{Math.floor(balance)})
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-red-650 hover:bg-red-700 text-white font-bold rounded-lg text-sm transition-all active:scale-95"
                  >
                    Confirm Simulation Withdrawal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= GENERAL HOW TO PLAY RULES MODAL ================= */}
        {rulesOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setRulesOpen(false)}
            ></div>
            <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-2xl border dark:border-gray-700 overflow-hidden z-10">
              <div className="flex items-center justify-between border-b pb-3 mb-4 dark:border-gray-750">
                <h3 className="font-bold text-base flex items-center gap-1.5 text-primary">
                  <span className="material-icons text-sm">menu_book</span> WinGo Game Rules Detail
                </h3>
                <button
                  onClick={() => setRulesOpen(false)}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>

              <div className="text-xs space-y-3 max-h-[300px] overflow-y-auto pr-1 text-justify scrollbar-thin leading-relaxed">
                <p>
                  <strong>Welcome to TASHANWIN WinGo Lottery!</strong> This is a server-side prediction simulator utilizing high frequency random selection algorithms to secure transparent results.
                </p>
                <div className="border-l-2 border-primary pl-2 py-0.5 space-y-1 bg-black/5 dark:bg-white/5 rounded-r">
                  <p>
                    <strong>🟢 Green / 🔴 Red / 🟣 Violet Colors:</strong> Pays amazing <strong>1.8x payout</strong> (with 20% tax on the placed bet amount).
                  </p>
                </div>
                <p>
                  <strong>🔢 Number Pick (0 - 9):</strong> Predict the direct outcome for a massive <strong>9.0x payout</strong>! Perfect for smart risk-takers (with 10% tax on the placed bet amount).
                </p>
                <p>
                  <strong>📊 Sizing Predictor:</strong> Choose <strong>Big</strong> (5 to 9) or <strong>Small</strong> (0 to 4) for a secured <strong>1.8x payout</strong> (with 20% tax).
                </p>
                <p>
                  <strong>⏱️ Timer Guidelines:</strong> Place predictions before the final 5 seconds of any round. When the timer hits 5s, all operations are locked until the next draw!
                </p>
              </div>

              <div className="mt-5 border-t pt-3 flex justify-end dark:border-gray-750">
                <button
                  onClick={() => setRulesOpen(false)}
                  className="px-4 py-2 bg-primary text-black font-bold text-xs rounded-lg uppercase tracking-wider active:scale-95 transition-transform"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

interface ChartProps {
  historyList: GameHistoryItem[];
  historyPage: number;
  setHistoryPage: React.Dispatch<React.SetStateAction<number>>;
}

const ChartSection: React.FC<ChartProps> = ({ historyList, historyPage, setHistoryPage }) => {
  const chartBoxRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState<number>(300);

  useEffect(() => {
    if (!chartBoxRef.current) return;
    const handleResize = () => {
      if (chartBoxRef.current) {
        setChartWidth(chartBoxRef.current.clientWidth);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    // Extra trigger delay to ensure DOM is fully repainted after tab toggles
    const timer = setTimeout(handleResize, 150);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [historyPage]);

  // Statistical Trend calculations from history list
  const getChartStatistics = () => {
    const statsRounds = historyList.slice(0, 100);
    const missing = Array(10).fill(0);
    const frequency = Array(10).fill(0);
    const consecutive = Array(10).fill(0);
    const maxConsecutive = Array(10).fill(0);

    // Temp consecutive tracker
    let currentConsec = Array(10).fill(0);
    // Track missing values
    const currentMissing = Array(10).fill(0);

    // Iterate chronologically (oldest to newest) to calculate gaps and streaks
    const chronoRounds = [...statsRounds].reverse();

    chronoRounds.forEach((round) => {
      const winNum = round.number;
      for (let num = 0; num < 10; num++) {
        if (num === winNum) {
          frequency[num]++;
          currentConsec[num]++;
          maxConsecutive[num] = Math.max(maxConsecutive[num], currentConsec[num]);
          currentMissing[num] = 0; // reset gaps
        } else {
          currentConsec[num] = 0; // reset streak
          currentMissing[num]++;
        }
      }
    });

    // Averaging out missing gaps simply as part of standard UI indicators
    const avgMissing = Array(10).fill(0).map((_, i) => {
      const count = frequency[i];
      if (count === 0) return 100;
      return Math.floor((100 - count) / (count + 1));
    });

    return {
      missing: currentMissing,
      avgMissing,
      frequency,
      maxConsecutive,
    };
  };

  const chartStats = getChartStatistics();
  const currentHistoryRounds = historyList.slice((historyPage - 1) * 15, historyPage * 15);
  const totalPages = Math.max(1, Math.ceil(historyList.length / 15));

  return (
    <div className="flex flex-col">
      {/* Statistic block */}
      <div className="p-3 bg-black/5 dark:bg-black/25">
        <h4 className="text-xs font-bold text-primary mb-2 flex items-center gap-1.5 uppercase">
          <span className="material-icons text-sm">show_chart</span> Statistic (last 100 Periods)
        </h4>
        <div className="text-[10px] space-y-2 rounded-xl p-2.5 bg-white/50 dark:bg-black/15">
          {/* Row for labels and digits */}
          <div className="grid grid-cols-12 gap-1 font-semibold text-center items-center pb-1">
            <div className="col-span-3 text-left pl-1">Winning number</div>
            <div className="col-span-9 grid grid-cols-10 gap-0.5">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <div key={digit} className="w-4 h-4 rounded-full text-red-500 dark:text-red-400 font-bold flex items-center justify-center text-[9px] mx-auto bg-red-500/5">
                  {digit}
                </div>
              ))}
            </div>
          </div>
          
          {/* Missing row */}
          <div className="grid grid-cols-12 gap-1 text-center items-center font-medium">
            <div className="col-span-3 text-left pl-1 text-gray-500 dark:text-gray-400">Missing</div>
            <div className="col-span-9 grid grid-cols-10 gap-0.5">
              {chartStats.missing.map((val, d) => (
                <div key={d} className="font-mono text-text-light dark:text-text-dark">{val}</div>
              ))}
            </div>
          </div>

          {/* Avg missing row */}
          <div className="grid grid-cols-12 gap-1 text-center items-center font-medium">
            <div className="col-span-3 text-left pl-1 text-gray-500 dark:text-gray-400">Avg missing</div>
            <div className="col-span-9 grid grid-cols-10 gap-0.5">
              {chartStats.avgMissing.map((val, d) => (
                <div key={d} className="font-mono text-text-light dark:text-text-dark">{val}</div>
              ))}
            </div>
          </div>

          {/* Frequency row */}
          <div className="grid grid-cols-12 gap-1 text-center items-center font-medium">
            <div className="col-span-3 text-left pl-1 text-gray-500 dark:text-gray-400">Frequency</div>
            <div className="col-span-9 grid grid-cols-10 gap-0.5 font-bold text-red-500 dark:text-red-400">
              {chartStats.frequency.map((val, d) => (
                <div key={d} className="font-mono">{val}</div>
              ))}
            </div>
          </div>

          {/* Max consecutive row */}
          <div className="grid grid-cols-12 gap-1 text-center items-center font-semibold">
            <div className="col-span-3 text-left pl-1 text-gray-500 dark:text-gray-400">Max consec</div>
            <div className="col-span-9 grid grid-cols-10 gap-0.5">
              {chartStats.maxConsecutive.map((val, d) => (
                <div key={d} className="font-mono text-text-light dark:text-text-dark">{val}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trend Grid with SVG */}
      <div className="relative text-[10px] mt-2">
        <div className="grid grid-cols-12 gap-1 text-center pb-2 font-bold text-primary bg-primary/5 uppercase p-2">
          <div className="col-span-3 text-left pl-1">Period</div>
          <div className="col-span-8">Number Trend</div>
          <div className="col-span-1">Size</div>
        </div>

        <div className="relative">
          {/* SVG Line overlay */}
          {currentHistoryRounds.length > 1 && (
            <svg className="absolute top-0 pointer-events-none z-10" style={{ width: `${chartWidth}px`, left: "25%", height: `${currentHistoryRounds.length * 36}px` }}>
              {currentHistoryRounds.slice(0, currentHistoryRounds.length - 1).map((round, idx) => {
                const colWidth = chartWidth / 10;
                const x1 = (round.number * colWidth) + (colWidth / 2);
                const y1 = (idx * 36) + 18;
                const x2 = (currentHistoryRounds[idx + 1].number * colWidth) + (colWidth / 2);
                const y2 = ((idx + 1) * 36) + 18;
                return (
                  <line
                    key={idx}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#ef4444"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    className="drop-shadow-[0_1.5px_2.5px_rgba(239,68,68,0.6)]"
                  />
                );
              })}
            </svg>
          )}

          {/* List of rounds */}
          <div>
            {currentHistoryRounds.map((item, idx) => {
              return (
                <div key={item.period + idx} className="grid grid-cols-12 gap-1 items-center h-9 hover:bg-black/5 dark:hover:bg-white/5 transition-colors py-0.5 px-2 text-center relative z-20">
                  {/* Period */}
                  <div className="col-span-3 font-mono text-left pl-1 font-bold text-text-muted-dark text-[10px] truncate" title={item.period}>
                    ...{item.period.slice(-4)}
                  </div>

                  {/* Numbers subgrid wrapper */}
                  <div ref={idx === 0 ? chartBoxRef : null} className="col-span-8 grid grid-cols-10 h-full items-center">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
                      const isSelected = digit === item.number;
                      const isViolet = item.color === "violet";
                      const isRed = item.color === "red";
                      
                      let backgroundStyle = "";
                      if (isSelected) {
                        if (isViolet) {
                          backgroundStyle = "linear-gradient(135deg, #a855f7, #ef4444)";
                        } else if (isRed) {
                          backgroundStyle = "#ef4444";
                        } else {
                          backgroundStyle = "#10b981";
                        }
                      }

                      return (
                        <div key={digit} className="flex justify-center items-center h-full">
                          {isSelected ? (
                            <div
                              style={{ background: backgroundStyle }}
                              className="w-5.5 h-5.5 rounded-full flex items-center justify-center font-bold text-white shadow-xs text-[10px] animate-pulse z-20 relative"
                            >
                              {digit}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600 font-medium text-[9px]">
                              {digit}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Sizing circle */}
                  <div className="col-span-1 flex justify-center">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-[9px] ${
                      item.size === "Big" ? "bg-orange-400" : "bg-blue-500"
                    }`}>
                      {item.size === "Big" ? "B" : "S"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-center gap-4 p-3 bg-black/5 dark:bg-black/20 text-xs shrink-0 select-none">
        <button
          disabled={historyPage === 1}
          onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
          className={`p-1.5 rounded-lg bg-surface-light dark:bg-surface-dark font-bold font-mono transition-opacity flex items-center justify-center hover:opacity-80 active:scale-95 cursor-pointer ${
            historyPage === 1 ? "opacity-30 cursor-not-allowed" : ""
          }`}
        >
          <span className="material-icons text-sm">chevron_left</span>
        </button>
        <span className="font-semibold text-text-muted-dark">
          {historyPage}/{totalPages}
        </span>
        <button
          disabled={historyPage >= totalPages}
          onClick={() => setHistoryPage((prev) => Math.min(totalPages, prev + 1))}
          className={`p-1.5 rounded-lg bg-surface-light dark:bg-surface-dark font-bold font-mono transition-opacity flex items-center justify-center hover:opacity-80 active:scale-95 cursor-pointer ${
            historyPage >= totalPages ? "opacity-30 cursor-not-allowed" : ""
          }`}
        >
          <span className="material-icons text-sm">chevron_right</span>
        </button>
      </div>
    </div>
  );
};
