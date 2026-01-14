"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Play, Plus, Trash2, BarChart2, RefreshCw, Cpu, Clock, Activity, 
  Settings, Sun, Moon, Monitor, Info, Shuffle, CheckCircle2, 
  AlertCircle, BookOpen, Trophy, XCircle, ArrowRight, ShieldCheck, Terminal
} from "lucide-react";
import { ALGORITHMS, AlgorithmType, solve, SchedulerOutput } from "./utils/scheduler";
import { clsx } from "clsx";

type ComparisonResult = {
  algo: string;
  tat: number;
  wt: number;
};

type ProcessInput = {
    id: string;
    arrivalTime: string | number;
    burstTime: string | number;
    priority: string | number;
};

const MAX_PROCESSES = 20;
const MAX_BURST_TIME = 100;
const MAX_PRIORITY = 100;
const MAX_ARRIVAL_TIME = 100;
const ID_REGEX = /^[a-zA-Z0-9_-]+$/; 

const ALGO_DETAILS: Record<AlgorithmType, { 
    description: string; 
    basis: string;
    example: string; 
    pros: string[]; 
    cons: string[]; 
}> = {
  "FCFS": { 
      description: "First-Come, First-Served executes processes in the exact sequence they arrive in the ready queue, like a real-world line.", 
      basis: "FIFO (First-In, First-Out). Sorted purely by Arrival Time.",
      example: "A grocery checkout line: The first customer is served first, regardless of cart size.", 
      pros: ["Simple logic to understand.", "Fair in terms of arrival order.", "No starvation."], 
      cons: ["Convoy Effect: Short jobs get stuck behind long ones.", "High average wait time."] 
  },
  "SJF (Non-Preemptive)": { 
      description: "Shortest Job First selects the waiting process with the absolute smallest Burst Time. Once started, it runs to completion without interruption.", 
      basis: "Greedy Algorithm: min(Burst Time).",
      example: "Doing quick tasks (washing a cup) before long ones (cooking a meal) to clear your to-do list faster.", 
      pros: ["Optimal mathematical Average Waiting Time.", "High throughput for short jobs."], 
      cons: ["Starvation risk for long processes.", "Requires knowing burst time in advance."] 
  },
  "SRTF (Preemptive)": { 
      description: "Shortest Remaining Time First is the preemptive version of SJF. If a new job arrives that can finish faster than the current one, the CPU switches.", 
      basis: "Dynamic Greedy: min(Remaining Time).",
      example: "Pausing a long report to answer a quick, urgent email that just arrived.", 
      pros: ["Lowest possible average wait time.", "Highly responsive to short jobs."], 
      cons: ["High overhead from frequent context switching.", "Complex to implement."] 
  },
  "Priority (Non-Preemptive)": { 
      description: "Processes are assigned a numeric priority. The CPU selects the highest priority (lowest number) available process to run next.", 
      basis: "Rank/Importance Sorting.",
      example: "VIPs boarding a plane before economy passengers, regardless of arrival time.", 
      pros: ["Ensures critical tasks are handled first.", "Flexible policy definition."], 
      cons: ["Indefinite blocking (Starvation) of low priority jobs."] 
  },
  "Priority (Preemptive)": { 
      description: "Like standard Priority, but a currently running process is immediately stopped if a higher priority process enters the queue.", 
      basis: "Real-time Urgency/Interrupts.",
      example: "An ambulance siren forcing regular traffic to pull over immediately.", 
      pros: ["Immediate response for critical tasks."], 
      cons: ["Frequent interruptions.", "Starvation risk is high."] 
  },
  "Round Robin": { 
      description: "Each process gets a fixed time slice (Quantum). If not finished, it moves to the back of the queue to wait for its next turn.", 
      basis: "Time Sharing / Cyclical.",
      example: "A turn-based board game where each player gets a strict 1-minute turn limit.", 
      pros: ["Fair CPU allocation.", "Excellent response time for interactive systems."], 
      cons: ["Performance depends heavily on Quantum size.", "High Turnaround Time for long jobs."] 
  },
  "LJF (Non-Preemptive)": { 
      description: "Longest Job First selects the process with the largest burst time from the queue.", 
      basis: "Max(Burst Time).",
      example: "Tackling your biggest, hardest project first to 'get it out of the way'.", 
      pros: ["Prevents short processes from dominating I/O queues."], 
      cons: ["Worst possible Average Waiting Time.", "Short jobs starve horribly."] 
  },
  "LRTF (Preemptive)": { 
      description: "Longest Remaining Time First preemptively switches to the job with the most work left to do.", 
      basis: "Max(Remaining Time) Load Balancing.",
      example: "Constantly switching between piles of work to keep them all roughly the same size.", 
      pros: ["Balances remaining work among large tasks."], 
      cons: ["Extremely inefficient.", "Maximizes context switching overhead."] 
  },
  "HRRN": { 
      description: "Highest Response Ratio Next. Priority is dynamic: it increases the longer a process waits in the queue.", 
      basis: "Aging Formula: Ratio = (Wait + Burst) / Burst.",
      example: "A customer waiting 1 hour for a simple coffee gets served before a new customer ordering a feast.", 
      pros: ["No starvation (due to aging).", "Balances short(SJF) and long jobs."], 
      cons: ["Complex calculation needed at every scheduling step."] 
  },
  "Multilevel Queue": { 
      description: "Ready queue is partitioned into separate queues (System vs User), each with its own specific scheduling algorithm.", 
      basis: "Static Process Classification.",
      example: "Airport security lanes: Crew lane (fast) vs. General boarding lane (slow).", 
      pros: ["Organized scheduling structure.", "Low overhead."], 
      cons: ["Inflexible.", "Lower priority queues may starve."] 
  },
  "Multilevel Feedback Queue (MLFQ)": { 
      description: "Processes move between queues based on behavior. CPU-hungry tasks sink to lower priorities; I/O tasks stay high.", 
      basis: "Dynamic History-based Adjustment.",
      example: "A tiered support system: Simple issues stay in Tier 1; complex ones are escalated to Tier 2.", 
      pros: ["Highly flexible.", "Prevents starvation via aging.", "Favors I/O tasks."], 
      cons: ["Most complex to implement and tune parameters."] 
  }
};

const COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-orange-500", "bg-pink-500", 
  "bg-cyan-500", "bg-indigo-500", "bg-rose-500", "bg-amber-500", "bg-lime-500"
];

const getComparisonAnalysis = (winner: ComparisonResult, loser: ComparisonResult) => {
    let winnerText = "";
    if (winner.algo.includes("SJF") || winner.algo.includes("SRTF")) {
        winnerText = "By aggressively prioritizing shorter jobs, it minimized queue build-up, significantly reducing average wait times for the majority of processes.";
    } else if (winner.algo.includes("Priority")) {
        winnerText = "Its logic aligned perfectly with your process priorities, ensuring critical tasks finished fast, which improved the overall average.";
    } else if (winner.algo.includes("Round Robin")) {
        winnerText = "The time quantum was well-suited to this workload, allowing for fair sharing and preventing any single process from blocking others.";
    } else {
        winnerText = "Based on the specific arrival times and burst lengths of your workload, this algorithm's logic happened to be the most efficient fit.";
    }

    let loserText = "";
    if (loser.algo.includes("LJF") || loser.algo.includes("LRTF")) {
        loserText = "By prioritizing long jobs, it forced shorter processes to wait excessively, drastically inflating the average turnaround time.";
    } else if (loser.algo.includes("FCFS")) {
        loserText = "It likely suffered from the 'Convoy Effect,' where a long process arrived early and blocked many shorter subsequent processes.";
    } else {
        loserText = "Its scheduling logic was inefficient for this particular set of processes, likely causing unnecessary waiting or context switching overhead.";
    }

    return { winnerText, loserText };
};

const Tooltip = ({ text, subtext }: { text: string, subtext?: React.ReactNode }) => (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block bg-slate-900/95 backdrop-blur-md text-white text-xs p-3 rounded-xl w-64 z-50 shadow-2xl border border-white/10 pointer-events-none text-left leading-relaxed animate-in fade-in zoom-in-95 duration-200">
        <div className="font-bold mb-1 text-blue-300">{text}</div>
        {subtext && <div className="text-slate-300 font-mono text-[10px]">{subtext}</div>}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95"></div>
    </div>
);

export default function OSProject() {
  const [processes, setProcesses] = useState<ProcessInput[]>([
    { id: "P1", arrivalTime: 0, burstTime: 5, priority: 2 },
    { id: "P2", arrivalTime: 2, burstTime: 3, priority: 1 },
    { id: "P3", arrivalTime: 4, burstTime: 1, priority: 3 },
    { id: "P4", arrivalTime: 6, burstTime: 4, priority: 2 },
  ]);
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmType>("FCFS");
  const [timeQuantum, setTimeQuantum] = useState<number | string>(2);
  const [output, setOutput] = useState<SchedulerOutput | null>(null);
  const [view, setView] = useState<'simulate' | 'compare'>('simulate');
  const [comparisonData, setComparisonData] = useState<ComparisonResult[] | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [error, setError] = useState<string | null>(null);

  const logContainerRef = useRef<HTMLDivElement>(null);

  const validateProcess = (p: ProcessInput, idx: number): string | null => {
      if (!ID_REGEX.test(p.id)) return `Row ${idx + 1}: Invalid ID. Use alphanumeric only.`;
      if (Number(p.burstTime) <= 0 || Number(p.burstTime) > MAX_BURST_TIME) return `Row ${idx + 1}: Burst time must be 1-${MAX_BURST_TIME}.`;
      if (Number(p.priority) < 0 || Number(p.priority) > MAX_PRIORITY) return `Row ${idx + 1}: Priority must be 0-${MAX_PRIORITY}.`;
      if (Number(p.arrivalTime) < 0 || Number(p.arrivalTime) > MAX_ARRIVAL_TIME) return `Row ${idx + 1}: Arrival time must be 0-${MAX_ARRIVAL_TIME}.`;
      return null;
  };

  const getNumericProcesses = useCallback(() => {
    return processes.map(p => ({
        id: p.id.replace(/[^a-zA-Z0-9_-]/g, ""), 
        arrivalTime: Math.min(Math.max(0, Number(p.arrivalTime) || 0), MAX_ARRIVAL_TIME),
        burstTime: Math.min(Math.max(1, Number(p.burstTime) || 1), MAX_BURST_TIME),
        priority: Math.min(Math.max(0, Number(p.priority) || 0), MAX_PRIORITY)
    }));
  }, [processes]);

  const handleRun = useCallback(() => {
    setError(null);
    for (let i = 0; i < processes.length; i++) {
        const err = validateProcess(processes[i], i);
        if (err) {
            setError(err);
            return;
        }
    }

    const numProcesses = getNumericProcesses();
    const quantum = Math.min(Math.max(1, Number(timeQuantum) || 1), 20);
    
    try {
        const res = solve(selectedAlgo, numProcesses, quantum);
        setOutput(res);
    } catch (e) {
        console.error(e);
        setError("Simulation failed. Check inputs.");
    }
  }, [selectedAlgo, timeQuantum, getNumericProcesses, processes]);

  const handleCompare = () => {
    setError(null);
    const numProcesses = getNumericProcesses();
    const quantum = Math.min(Math.max(1, Number(timeQuantum) || 1), 20);
    
    try {
        const data = ALGORITHMS.map(algo => {
        const res = solve(algo, numProcesses, quantum);
        return {
            algo,
            tat: res.averageTurnaroundTime,
            wt: res.averageWaitingTime,
        };
        }).sort((a, b) => a.tat - b.tat);
        setComparisonData(data);
        setView('compare');
    } catch (e) {
        setError("Comparison failed due to input errors.");
    }
  };

  const updateProcess = (index: number, field: keyof ProcessInput, value: string) => {
    const newProcesses = [...processes];
    newProcesses[index] = { ...newProcesses[index], [field]: value };
    setProcesses(newProcesses);
  };

  const removeProcess = (index: number) => {
    if (processes.length > 1) {
        setProcesses(processes.filter((_, i) => i !== index));
    }
  };

  const addProcess = () => {
    if (processes.length >= MAX_PROCESSES) {
        setError(`Max process limit (${MAX_PROCESSES}) reached.`);
        return;
    }
    const nextId = `P${processes.length + 1}`;
    setProcesses([...processes, { id: nextId, arrivalTime: 0, burstTime: 2, priority: 1 }]);
    setError(null);
  };

  const handleRandomize = () => {
      const count = Math.floor(Math.random() * 5) + 3; 
      const newProcs: ProcessInput[] = [];
      for(let i=0; i<count; i++) {
          newProcs.push({
              id: `P${i+1}`,
              arrivalTime: Math.floor(Math.random() * 10),
              burstTime: Math.floor(Math.random() * 10) + 1,
              priority: Math.floor(Math.random() * 10) + 1 
          });
      }
      setProcesses(newProcs);
      setError(null);
  };

  useEffect(() => {
      if (processes.length > 0) {
          handleRun();
      }
  }, [handleRun]);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (t: 'light' | 'dark' | 'system') => {
        const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) root.classList.add('dark');
        else root.classList.remove('dark');
    };
    applyTheme(theme);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => { if (theme === 'system') applyTheme('system'); };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const showPriority = selectedAlgo.includes("Priority") || selectedAlgo.includes("Multilevel");
  const analysis = comparisonData ? getComparisonAnalysis(comparisonData[0], comparisonData[comparisonData.length - 1]) : null;

  return (
    <div className="min-h-screen font-sans p-4 md:p-8 transition-colors duration-500 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-[1920px] mx-auto space-y-6 md:space-y-8">
        
        <header className="glass-card p-6 flex flex-col xl:flex-row justify-between items-center gap-6 shadow-2xl border-b-4 border-blue-500">
          <div className="flex items-center gap-5 w-full xl:w-auto">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 text-white relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
              <Cpu size={36} className="relative z-10" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Scheduler <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Ultima</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <ShieldCheck size={14} className="text-emerald-500"/>
                 <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium">Secure Algorithmic Simulator</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 items-center justify-center xl:justify-end w-full xl:w-auto">
            <div className="flex bg-white/80 dark:bg-slate-800/50 p-1.5 rounded-xl border border-gray-200 dark:border-white/5 backdrop-blur-md shadow-sm">
                {(['light', 'system', 'dark'] as const).map((t) => (
                    <button 
                        key={t}
                        onClick={() => setTheme(t)} 
                        className={clsx(
                            "p-3 rounded-lg transition-all duration-300",
                            theme === t ? "bg-blue-50 dark:bg-slate-700 shadow-inner text-blue-600 dark:text-blue-400 scale-105" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        )}
                    >
                        {t === 'light' ? <Sun size={20}/> : t === 'dark' ? <Moon size={20}/> : <Monitor size={20}/>}
                    </button>
                ))}
            </div>

            <button onClick={() => setView('simulate')} className={clsx("flex-1 xl:flex-none justify-center px-8 py-3.5 rounded-xl font-bold text-lg transition-all flex items-center gap-2 shadow-lg active:scale-95", view === 'simulate' ? "bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-700" : "bg-white dark:bg-slate-800/50 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-slate-700/80 backdrop-blur-md")}>
                <Play size={20} /> Simulate
            </button>
            <button onClick={handleCompare} className={clsx("flex-1 xl:flex-none justify-center px-8 py-3.5 rounded-xl font-bold text-lg transition-all flex items-center gap-2 shadow-lg active:scale-95", view === 'compare' ? "bg-indigo-600 text-white shadow-indigo-500/30 hover:bg-indigo-700" : "bg-white dark:bg-slate-800/50 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-slate-700/80 backdrop-blur-md")}>
                <BarChart2 size={20} /> Compare
            </button>
          </div>
        </header>

        {error && (
            <div className="bg-rose-50 dark:bg-rose-950/50 border-l-4 border-rose-500 p-4 rounded-r-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="text-rose-600 dark:text-rose-400" />
                <span className="font-bold text-rose-800 dark:text-rose-200">{error}</span>
            </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">
          
          <div className="xl:col-span-4 space-y-6 md:space-y-8 flex flex-col">
            
            <div className="glass-card p-6 md:p-8 shadow-2xl space-y-6">
              <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 mb-2">
                <Settings size={24} />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configuration</h2>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block pl-1">Strategy</label>
                <div className="relative group">
                  <select 
                    value={selectedAlgo}
                    onChange={(e) => setSelectedAlgo(e.target.value as AlgorithmType)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white text-base rounded-xl p-3 appearance-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all cursor-pointer shadow-sm hover:border-blue-400/50 font-medium"
                  >
                    {ALGORITHMS.map(algo => (
                        <option key={algo} value={algo} className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white py-2">{algo}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-blue-500 transition-colors"><RefreshCw size={16} /></div>
                </div>
              </div>

              {(selectedAlgo.includes("Round Robin") || selectedAlgo.includes("Multilevel")) && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block pl-1">Time Quantum</label>
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 transition-all shadow-sm">
                    <Clock size={20} className="text-gray-400" />
                    <input 
                        type="number" 
                        min="1" 
                        max="20"
                        value={timeQuantum} 
                        onChange={(e) => setTimeQuantum(e.target.value)} 
                        className="bg-transparent font-mono text-lg w-full outline-none text-gray-900 dark:text-white font-bold" 
                    />
                    <span className="text-xs font-bold text-gray-400 tracking-wider">MS</span>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-slate-900 dark:to-blue-900/10 rounded-2xl p-5 border border-blue-100 dark:border-blue-900/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 text-blue-500/10 dark:text-blue-500/5"><Info size={100} /></div>
                <div className="relative z-10 space-y-4">
                    <div className="flex gap-2 items-center">
                       <div className="p-1.5 bg-blue-100 dark:bg-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400">
                           <BookOpen size={18} />
                       </div>
                       <h3 className="text-blue-900 dark:text-blue-100 font-bold text-lg">{selectedAlgo.split(" ")[0]}</h3>
                    </div>
                    
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{ALGO_DETAILS[selectedAlgo].description}</p>
                    
                    <div className="space-y-3 pt-2">
                        <div className="bg-white/60 dark:bg-slate-950/40 p-3 rounded-lg border border-blue-50 dark:border-blue-500/10">
                            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase block mb-1 tracking-widest"><Cpu size={10} className="inline mr-1"/> Basis</span>
                            <div className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                {ALGO_DETAILS[selectedAlgo].basis}
                            </div>
                        </div>
                        <div>
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase block mb-1 tracking-widest pl-1">Analogy</span>
                            <div className="text-xs italic text-gray-600 dark:text-gray-400 pl-3 border-l-2 border-indigo-400/50 leading-relaxed">
                                "{ALGO_DETAILS[selectedAlgo].example}"
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="bg-emerald-50/80 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-500/10">
                                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1"><CheckCircle2 size={10}/> Pros</span>
                                <ul className="text-[10px] text-gray-700 dark:text-gray-300 space-y-1 font-medium">
                                    {ALGO_DETAILS[selectedAlgo].pros.map(p => <li key={p} className="leading-tight flex items-start gap-1"><span className="text-emerald-500">•</span>{p}</li>)}
                                </ul>
                            </div>
                            <div className="bg-rose-50/80 dark:bg-rose-950/20 p-3 rounded-lg border border-rose-100 dark:border-rose-500/10">
                                <span className="flex items-center gap-1 text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-1"><XCircle size={10}/> Cons</span>
                                <ul className="text-[10px] text-gray-700 dark:text-gray-300 space-y-1 font-medium">
                                    {ALGO_DETAILS[selectedAlgo].cons.map(c => <li key={c} className="leading-tight flex items-start gap-1"><span className="text-rose-500">•</span>{c}</li>)}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 md:p-8 shadow-2xl flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                  <Activity size={24} />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Processes</h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleRandomize} className="p-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300" title="Randomize"><Shuffle size={18} /></button>
                    <button onClick={addProcess} className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all shadow-lg shadow-emerald-500/20 active:scale-95" title="Add Process"><Plus size={18} /></button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 max-h-[500px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-gray-50/95 dark:bg-slate-900/95 z-10 text-xs font-bold text-gray-500 dark:text-gray-500 uppercase backdrop-blur-sm border-b border-gray-200 dark:border-slate-800">
                      <tr>
                        <th className="p-4 pl-6">ID</th>
                        <th className="p-4 text-center">Arrival</th>
                        <th className="p-4 text-center">Burst</th>
                        {showPriority && <th className="p-4 text-center">Prio</th>}
                        <th className="p-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50">
                      {processes.map((p, i) => (
                        <tr key={i} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 pl-6">
                              <span className="font-extrabold text-gray-900 dark:text-white text-base">{p.id}</span>
                          </td>
                          <td className="p-3">
                              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1.5 border border-transparent focus-within:border-blue-500 transition-colors">
                                <input type="number" min="0" value={p.arrivalTime} onChange={(e) => updateProcess(i, 'arrivalTime', e.target.value)} className="w-full bg-transparent text-center font-mono outline-none text-gray-900 dark:text-white font-bold" />
                              </div>
                          </td>
                          <td className="p-3">
                              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1.5 border border-transparent focus-within:border-blue-500 transition-colors">
                                <input type="number" min="1" value={p.burstTime} onChange={(e) => updateProcess(i, 'burstTime', e.target.value)} className="w-full bg-transparent text-center font-mono outline-none text-gray-900 dark:text-white font-bold" />
                              </div>
                          </td>
                          {showPriority && <td className="p-3">
                              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1.5 border border-transparent focus-within:border-blue-500 transition-colors">
                                <input type="number" value={p.priority} onChange={(e) => updateProcess(i, 'priority', e.target.value)} className="w-full bg-transparent text-center font-mono outline-none text-gray-900 dark:text-white font-bold" />
                              </div>
                          </td>}
                          <td className="p-3 text-right pr-6"><button onClick={() => removeProcess(i)} className="text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"><Trash2 size={16} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
            </div>
          </div>

          <div className="xl:col-span-8 space-y-6 md:space-y-8">
            
            {view === 'simulate' && output && (
              <>
                <div className="glass-card p-6 md:p-8 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center gap-4 mb-8 text-purple-600 dark:text-purple-400">
                    <Clock size={28} />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">CPU Timeline</h2>
                  </div>

                  <div className="relative h-32 md:h-40 bg-slate-100 dark:bg-slate-950/50 rounded-2xl border border-gray-200 dark:border-slate-800 mb-10 overflow-hidden flex items-center px-4 shadow-inner">
                    {output.ganttChart.map((block, i) => {
                      const maxTime = output.ganttChart[output.ganttChart.length-1].endTime;
                      const width = ((block.endTime - block.startTime) / maxTime) * 100;
                      const left = (block.startTime / maxTime) * 100;
                      const colorIndex = parseInt(block.processId.replace(/\D/g,'')) || 0;
                      
                      return (
                        <div key={i} style={{ left: `${left}%`, width: `${width}%` }} className={`absolute top-4 bottom-4 md:top-6 md:bottom-6 rounded-xl flex items-center justify-center shadow-md border border-white/20 group hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 cursor-help ${COLORS[colorIndex % COLORS.length]}`}>
                          <span className="text-xs md:text-sm font-black text-white drop-shadow-sm truncate px-1">{block.processId}</span>
                          <Tooltip 
                            text={`Process ${block.processId}`} 
                            subtext={
                                <span className="block mt-2 space-y-1">
                                    <span className="grid grid-cols-2 gap-2"><span className="opacity-70">Start:</span> <b className="text-white font-mono text-sm">{block.startTime}s</b></span>
                                    <span className="grid grid-cols-2 gap-2"><span className="opacity-70">End:</span> <b className="text-white font-mono text-sm">{block.endTime}s</b></span>
                                    <span className="grid grid-cols-2 gap-2 pt-1 border-t border-white/20"><span className="opacity-70">Duration:</span> <b className="text-emerald-300 font-mono text-sm">{block.endTime - block.startTime}ms</b></span>
                                </span>
                            } 
                          />
                        </div>
                      )
                    })}
                  </div>

                  <div className="relative h-8 w-full -mt-8 px-4">
                     {Array.from(new Set([0, ...output.ganttChart.map(b => b.endTime)])).sort((a,b)=>a-b).map((time, idx, arr) => {
                       const maxTime = arr[arr.length-1];
                       if (maxTime === 0) return null;
                       const left = (time / maxTime) * 100;
                       if (idx > 0 && (time - arr[idx-1]) / maxTime < 0.04) return null; 
                       return (
                         <div key={time} style={{ left: `${left}%` }} className="absolute transform -translate-x-1/2 flex flex-col items-center group">
                           <div className="h-3 w-px bg-gray-400 dark:bg-slate-600 mb-1 group-hover:bg-blue-500 transition-colors"></div>
                           <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 font-bold">{time}</span>
                         </div>
                       )
                     })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <div className="glass-card p-6 shadow-xl flex items-center justify-between relative overflow-hidden group">
                       <div className="absolute right-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity transform translate-x-1/4 translate-y-1/4 text-blue-500"><Activity size={120} /></div>
                       <div>
                           <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Avg Turnaround Time</p>
                           <div className="flex items-baseline gap-2">
                               <span className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white">{output.averageTurnaroundTime.toFixed(2)}</span>
                               <span className="text-sm font-bold text-gray-400">ms</span>
                           </div>
                       </div>
                       <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                           <Clock size={24} />
                       </div>
                   </div>
                   <div className="glass-card p-6 shadow-xl flex items-center justify-between relative overflow-hidden group">
                       <div className="absolute right-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity transform translate-x-1/4 translate-y-1/4 text-emerald-500"><Clock size={120} /></div>
                       <div>
                           <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Avg Waiting Time</p>
                           <div className="flex items-baseline gap-2">
                               <span className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white">{output.averageWaitingTime.toFixed(2)}</span>
                               <span className="text-sm font-bold text-gray-400">ms</span>
                           </div>
                       </div>
                       <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                           <Activity size={24} />
                       </div>
                   </div>
                </div>

                <div className="glass-card p-0 overflow-hidden shadow-2xl flex flex-col h-[500px]">
                    <div className="p-6 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Terminal size={20} className="text-slate-500"/>
                            <h3 className="font-bold text-gray-700 dark:text-gray-200">Algorithm Logic Log</h3>
                        </div>
                        <span className="text-xs font-mono text-gray-400 bg-gray-200 dark:bg-slate-800 px-2 py-1 rounded">Read-Only</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-950 text-slate-300 font-mono text-sm leading-relaxed" ref={logContainerRef}>
                        {output.decisionLog.map((log, idx) => (
                            <div key={idx} className="flex gap-4 border-b border-slate-900/50 pb-2 last:border-0 hover:bg-slate-900/50 p-2 rounded transition-colors items-start">
                                <span className="text-slate-600 select-none w-6 text-right shrink-0 mt-0.5">{idx + 1}.</span>
                                <span dangerouslySetInnerHTML={{ __html: log.replace(/(Process \w+|P\d+)/g, '<span class="text-emerald-400 font-bold">$1</span>').replace(/Time (\d+)/g, '<span class="text-blue-400">Time $1</span>').replace(/⚠️/g, '<span class="text-amber-500">⚠️</span>') }}></span>
                            </div>
                        ))}
                    </div>
                </div>
              </>
            )}

            {view === 'compare' && comparisonData && analysis && (
              <div className="glass-card p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 text-purple-500/5 dark:text-purple-500/10"><BarChart2 size={200} /></div>
                <div className="flex items-center gap-4 mb-10 text-purple-600 dark:text-purple-400 relative z-10">
                    <BarChart2 size={28} />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Ranking</h2>
                </div>

                <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/30 border border-emerald-500/30 rounded-2xl p-6 mb-10 flex gap-6 shadow-lg relative overflow-hidden z-10">
                    <div className="p-4 bg-emerald-500 rounded-2xl h-fit text-white shadow-md relative z-10 shrink-0">
                        <Trophy size={32} />
                    </div>
                    <div className="relative z-10 flex-1 space-y-4">
                        <div className="border-b border-emerald-500/20 pb-4">
                            <h4 className="font-extrabold text-white text-xl flex items-center gap-2 mb-2">
                                Winner Analysis: <span className="text-emerald-400">{comparisonData[0].algo}</span>
                            </h4>
                            <div className="space-y-1">
                                <strong className="text-emerald-500 text-sm uppercase tracking-wider block">Why it won:</strong>
                                <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-emerald-500/50 pl-3">{analysis.winnerText}</p>
                            </div>
                        </div>
                        <div>
                             <div className="space-y-1">
                                <strong className="text-rose-400 text-sm uppercase tracking-wider block">Why {comparisonData[comparisonData.length-1].algo} lost:</strong>
                                <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-rose-500/50 pl-3">{analysis.loserText}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 relative z-10">
                     {comparisonData.map((data, idx) => {
                         const maxTat = Math.max(...comparisonData.map(d => d.tat));
                         const width = (data.tat / maxTat) * 100;
                         return (
                            <div key={data.algo} className="space-y-2 group">
                                <div className="flex justify-between text-sm font-bold text-gray-600 dark:text-gray-400">
                                    <span className={clsx("flex items-center gap-2", idx === 0 && "text-emerald-600 dark:text-emerald-400")}>
                                        {idx === 0 && <Trophy size={14} />} {data.algo}
                                        {idx === 0 && <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full">WINNER</span>}
                                    </span>
                                    <span>{data.tat.toFixed(2)}ms TAT</span>
                                </div>
                                <div className="h-8 md:h-10 w-full bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-center p-1">
                                    <div 
                                        style={{ width: `${width}%` }} 
                                        className={clsx(
                                            "h-full rounded-md flex items-center justify-end px-3 transition-all duration-1000 ease-out", 
                                            idx === 0 ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-slate-600"
                                        )}
                                    >
                                        {width > 20 && <span className="text-[10px] font-black text-white/90 uppercase tracking-wider">Avg TAT</span>}
                                    </div>
                                </div>
                            </div>
                         )
                     })}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}