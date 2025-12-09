"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Play, Plus, Trash2, BarChart2, RefreshCw, Cpu, Clock, Activity, 
  Layers, Settings, Sun, Moon, Monitor, Info, Shuffle, CheckCircle2, AlertCircle, BookOpen, Trophy, XCircle, ArrowRight
} from "lucide-react";
import { ALGORITHMS, AlgorithmType, solve, SchedulerOutput, GanttBlock } from "./utils/scheduler";
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
      description: "Ready queue is partitioned into separate queues (e.g., System vs User), each with its own specific scheduling algorithm.", 
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

  const getNumericProcesses = useCallback(() => {
    return processes.map(p => ({
        id: p.id,
        arrivalTime: Number(p.arrivalTime) || 0,
        burstTime: Number(p.burstTime) || 0,
        priority: Number(p.priority) || 0
    }));
  }, [processes]);

  const handleRun = useCallback(() => {
    const numProcesses = getNumericProcesses();
    const quantum = Number(timeQuantum) || 1;
    const res = solve(selectedAlgo, numProcesses, quantum);
    setOutput(res);
    setView('simulate');
  }, [selectedAlgo, timeQuantum, getNumericProcesses]);

  const handleCompare = () => {
    const numProcesses = getNumericProcesses();
    const quantum = Number(timeQuantum) || 1;
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
    const nextId = `P${processes.length + 1}`;
    setProcesses([...processes, { id: nextId, arrivalTime: 0, burstTime: 2, priority: 1 }]);
  };

  const handleRandomize = () => {
      const count = Math.floor(Math.random() * 4) + 3; 
      const newProcs: ProcessInput[] = [];
      for(let i=0; i<count; i++) {
          newProcs.push({
              id: `P${i+1}`,
              arrivalTime: Math.floor(Math.random() * 8),
              burstTime: Math.floor(Math.random() * 8) + 1,
              priority: Math.floor(Math.random() * 5) + 1 
          });
      }
      setProcesses(newProcs);
  };

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

  useEffect(() => { handleRun(); }, [handleRun]); 

  const showPriority = selectedAlgo.includes("Priority") || selectedAlgo.includes("Multilevel");
  const analysis = comparisonData ? getComparisonAnalysis(comparisonData[0], comparisonData[comparisonData.length - 1]) : null;


  return (
    <div className="min-h-screen font-sans p-4 md:p-8 transition-colors duration-500">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        <header className="glass-card p-6 flex flex-col xl:flex-row justify-between items-center gap-6 shadow-2xl">
          <div className="flex items-center gap-5 w-full xl:w-auto">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 text-white">
              <Cpu size={36} />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                OS Scheduler <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Ultima</span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 font-medium mt-1">Advanced Algorithmic Visualization</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 items-center justify-center xl:justify-end">
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
                        {t === 'light' ? <Sun size={22}/> : t === 'dark' ? <Moon size={22}/> : <Monitor size={22}/>}
                    </button>
                ))}
            </div>

            <button onClick={handleRun} className={clsx("px-8 py-3.5 rounded-xl font-bold text-lg transition-all flex items-center gap-2 shadow-lg active:scale-95", view === 'simulate' ? "bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-700" : "bg-white dark:bg-slate-800/50 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-slate-700/80 backdrop-blur-md")}>
                <Play size={22} /> Simulate
            </button>
            <button onClick={handleCompare} className={clsx("px-8 py-3.5 rounded-xl font-bold text-lg transition-all flex items-center gap-2 shadow-lg active:scale-95", view === 'compare' ? "bg-indigo-600 text-white shadow-indigo-500/30 hover:bg-indigo-700" : "bg-white dark:bg-slate-800/50 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-slate-700/80 backdrop-blur-md")}>
                <BarChart2 size={22} /> Compare
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          <div className="xl:col-span-4 space-y-8 flex flex-col">
            <div className="glass-card p-8 shadow-2xl space-y-8">
              <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 mb-2">
                <Settings size={28} />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Configuration</h2>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block pl-1">Algorithm Selection</label>
                <div className="relative group">
                  <select 
                    value={selectedAlgo}
                    onChange={(e) => setSelectedAlgo(e.target.value as AlgorithmType)}
                    className="w-full bg-white/50 dark:bg-slate-950/50 border-2 border-gray-200 dark:border-slate-700/50 text-gray-900 dark:text-white text-lg rounded-xl p-4 appearance-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer shadow-sm hover:border-blue-400/50 dark:hover:border-blue-500/50 font-medium"
                  >
                    {ALGORITHMS.map(algo => (
                        <option key={algo} value={algo} className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white py-3 text-lg">{algo}</option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover:text-blue-500 transition-colors"><RefreshCw size={20} /></div>
                </div>
              </div>

              {(selectedAlgo.includes("Round Robin") || selectedAlgo.includes("Multilevel")) && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-2">
                  <label className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block pl-1">Time Quantum</label>
                  <div className="flex items-center gap-4 bg-white dark:bg-slate-950/50 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl p-4 focus-within:ring-4 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm">
                    <Clock size={24} className="text-gray-400" />
                    <input type="number" min="1" value={timeQuantum} onChange={(e) => setTimeQuantum(e.target.value)} className="bg-transparent font-mono text-xl w-full outline-none text-gray-900 dark:text-white font-bold" />
                    <span className="text-sm font-bold text-gray-400 tracking-wider">MS</span>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-500/20 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 text-blue-500/10 dark:text-blue-500/5"><Info size={120} /></div>
                <div className="relative z-10">
                    <div className="flex gap-3 items-center mb-5">
                    <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400 shadow-sm">
                        <BookOpen size={24} />
                    </div>
                    <h3 className="text-blue-900 dark:text-blue-100 font-bold text-xl">{selectedAlgo}</h3>
                    </div>
                    
                    <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed mb-6 font-medium">{ALGO_DETAILS[selectedAlgo].description}</p>
                    
                    <div className="space-y-6">
                        <div className="bg-white/80 dark:bg-slate-900/60 p-4 rounded-xl border border-blue-100/50 dark:border-blue-500/10 shadow-sm">
                            <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase block mb-2 tracking-widest flex items-center gap-2"><Cpu size={14}/> Basis of Computation</span>
                            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {ALGO_DETAILS[selectedAlgo].basis}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase block mb-2 tracking-widest pl-1">Real-World Analogy</span>
                            <div className="text-sm italic text-gray-800 dark:text-gray-300 pl-4 border-l-4 border-indigo-400/50 leading-relaxed font-medium py-1">
                                "{ALGO_DETAILS[selectedAlgo].example}"
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="space-y-3 bg-emerald-50/80 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200/50 dark:border-emerald-500/10">
                                <span className="flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider"><CheckCircle2 size={16}/> Pros</span>
                                <ul className="text-sm text-gray-800 dark:text-gray-300 space-y-2 font-medium">
                                    {ALGO_DETAILS[selectedAlgo].pros.map(p => <li key={p} className="leading-snug flex items-start gap-2"><span className="text-emerald-500 mt-1">▪</span>{p}</li>)}
                                </ul>
                            </div>
                            <div className="space-y-3 bg-rose-50/80 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200/50 dark:border-rose-500/10">
                                <span className="flex items-center gap-2 text-sm font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider"><XCircle size={16}/> Cons</span>
                                <ul className="text-sm text-gray-800 dark:text-gray-300 space-y-2 font-medium">
                                    {ALGO_DETAILS[selectedAlgo].cons.map(c => <li key={c} className="leading-snug flex items-start gap-2"><span className="text-rose-500 mt-1">▪</span>{c}</li>)}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 shadow-2xl flex-1 flex flex-col min-h-[500px]">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                  <Layers size={28} />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Processes</h2>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleRandomize} className="p-3 bg-gray-100 dark:bg-slate-800/50 hover:bg-gray-200 dark:hover:bg-slate-700/50 rounded-xl transition-colors border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 shadow-sm" title="Randomize"><Shuffle size={22} /></button>
                    <button onClick={addProcess} className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/30 active:scale-95" title="Add"><Plus size={22} /></button>
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden relative rounded-2xl border-2 border-gray-200 dark:border-slate-800/50 bg-white dark:bg-slate-950/30">
                <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white/95 dark:bg-slate-900/90 z-10 text-sm font-bold text-gray-600 dark:text-gray-500 uppercase border-b-2 border-gray-200 dark:border-slate-800/50">
                      <tr>
                        <th className="p-5 pl-6 tracking-wider">ID</th>
                        <th className="p-5 text-center tracking-wider">Arrival</th>
                        <th className="p-5 text-center tracking-wider">Burst</th>
                        {showPriority && <th className="p-5 text-center tracking-wider">Prio</th>}
                        <th className="p-5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-gray-200 dark:divide-slate-800/30">
                      {processes.map((p, i) => (
                        <tr key={i} className="group hover:bg-blue-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-4 pl-6"><input value={p.id} onChange={(e) => updateProcess(i, 'id', e.target.value)} className="w-16 bg-transparent font-extrabold outline-none text-gray-900 dark:text-white focus:text-blue-600 dark:focus:text-blue-400 text-lg transition-colors" /></td>
                          <td className="p-4"><input type="number" min="0" value={p.arrivalTime} onChange={(e) => updateProcess(i, 'arrivalTime', e.target.value)} className="w-full bg-white dark:bg-slate-900/70 rounded-xl px-3 py-2.5 text-center font-mono border-2 border-gray-200 dark:border-slate-700/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 dark:text-white text-base shadow-sm transition-all font-bold" /></td>
                          <td className="p-4"><input type="number" min="1" value={p.burstTime} onChange={(e) => updateProcess(i, 'burstTime', e.target.value)} className="w-full bg-white dark:bg-slate-900/70 rounded-xl px-3 py-2.5 text-center font-mono border-2 border-gray-200 dark:border-slate-700/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 dark:text-white text-base shadow-sm transition-all font-bold" /></td>
                          {showPriority && <td className="p-4"><input type="number" value={p.priority} onChange={(e) => updateProcess(i, 'priority', e.target.value)} className="w-full bg-white dark:bg-slate-900/70 rounded-xl px-3 py-2.5 text-center font-mono border-2 border-gray-200 dark:border-slate-700/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 dark:text-white text-base shadow-sm transition-all font-bold" /></td>}
                          <td className="p-4 text-right pr-6"><button onClick={() => removeProcess(i)} className="text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-2.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-xl"><Trash2 size={20} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="xl:col-span-8 space-y-8">
            
            {view === 'simulate' && output && (
              <>
                <div className="glass-card p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mt-6 -mr-6 text-purple-500/5 dark:text-purple-500/10"><Activity size={150} /></div>
                  <div className="flex items-center gap-4 mb-10 text-purple-600 dark:text-purple-400 relative z-10">
                    <Activity size={32} />
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Execution Timeline</h2>
                  </div>

                  <div className="relative h-40 bg-white dark:bg-slate-950/50 rounded-3xl border-2 border-gray-200 dark:border-slate-800/50 mb-12 overflow-hidden flex items-center px-4 shadow-inner z-10">
                    {output.ganttChart.map((block, i) => {
                      const maxTime = output.ganttChart[output.ganttChart.length-1].endTime;
                      const width = ((block.endTime - block.startTime) / maxTime) * 100;
                      const left = (block.startTime / maxTime) * 100;
                      const colorIndex = parseInt(block.processId.replace(/\D/g,'')) || 0;
                      
                      return (
                        <div key={i} style={{ left: `${left}%`, width: `${width}%` }} className={`absolute top-6 bottom-6 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/30 group hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 cursor-help ${COLORS[colorIndex % COLORS.length]}`}>
                          <span className="text-lg font-extrabold text-white drop-shadow-sm truncate px-3 tracking-wider">{block.processId}</span>
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

                  <div className="relative h-10 w-full -mt-10 px-4 z-10">
                     {Array.from(new Set([0, ...output.ganttChart.map(b => b.endTime)])).sort((a,b)=>a-b).map((time, idx, arr) => {
                       const maxTime = arr[arr.length-1];
                       if (maxTime === 0) return null;
                       const left = (time / maxTime) * 100;
                       if (idx > 0 && (time - arr[idx-1]) / maxTime < 0.04) return null; 
                       return (
                         <div key={time} style={{ left: `${left}%` }} className="absolute transform -translate-x-1/2 flex flex-col items-center group">
                           <div className="h-4 w-0.5 bg-gray-300 dark:bg-slate-600 mb-2 group-hover:bg-blue-500 transition-colors"></div>
                           <span className="text-xs font-mono text-gray-500 dark:text-gray-400 font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{time}</span>
                         </div>
                       )
                     })}
                     <div className="absolute left-0 transform -translate-x-1/2 flex flex-col items-center group">
                        <div className="h-4 w-0.5 bg-gray-300 dark:bg-slate-600 mb-2 group-hover:bg-blue-500 transition-colors"></div>
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400 font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">0</span>
                     </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="glass-card p-8 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden group transition-all hover:scale-[1.02]">
                       <div className="absolute top-0 left-0 w-2 h-full bg-blue-500 group-hover:w-4 transition-all"></div>
                       <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Avg Turnaround Time</p>
                       <div className="flex items-baseline gap-3">
                           <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 tracking-tighter">{output.averageTurnaroundTime.toFixed(2)}</span>
                           <span className="text-xl font-bold text-gray-400 tracking-wider">ms</span>
                       </div>
                   </div>
                   <div className="glass-card p-8 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden group transition-all hover:scale-[1.02]">
                       <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500 group-hover:w-4 transition-all"></div>
                       <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Avg Waiting Time</p>
                       <div className="flex items-baseline gap-3">
                           <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 tracking-tighter">{output.averageWaitingTime.toFixed(2)}</span>
                           <span className="text-xl font-bold text-gray-400 tracking-wider">ms</span>
                       </div>
                   </div>
                </div>

                <div className="glass-card p-10 shadow-2xl">
                  <div className="flex items-center gap-3 mb-10 text-gray-900 dark:text-white">
                    <BookOpen size={32} className="text-blue-600 dark:text-blue-400"/>
                    <h3 className="text-3xl font-bold">Deep Dive Analysis</h3>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-slate-900/50 border-l-4 border-blue-500 rounded-2xl p-8 mb-10 shadow-sm relative overflow-hidden">
                     <div className="absolute right-0 top-0 -mt-6 -mr-6 text-blue-500/10"><BookOpen size={100} /></div>
                     <h4 className="font-bold text-xl mb-6 text-blue-900 dark:text-blue-100 relative z-10">Step-by-Step Execution Report</h4>
                     <div className="space-y-6 relative z-10 font-medium">
                         {output.results.map((r) => (
                             <div key={r.id} className="text-base leading-relaxed flex gap-4 items-start group">
                                 <div className="pt-1.5"><ArrowRight size={18} className="text-blue-400 group-hover:translate-x-1 transition-transform"/></div>
                                 <span className="text-gray-700 dark:text-gray-300">
                                     <strong className="text-blue-700 dark:text-blue-300 text-lg">Process {r.id}</strong> arrived at {r.arrivalTime}ms. 
                                     It finished at <strong className="text-emerald-600 dark:text-emerald-400">{r.endTime}ms</strong>. 
                                     Total time in system (TAT): <strong>{r.turnaroundTime}ms</strong>. 
                                     Total wait time: <strong>{r.waitingTime}ms</strong>.
                                 </span>
                             </div>
                         ))}
                     </div>
                  </div>

                  <div className="overflow-x-auto custom-scrollbar rounded-2xl border-2 border-gray-200 dark:border-slate-800/50">
                    <table className="w-full text-left bg-white dark:bg-slate-950/40">
                      <thead className="text-sm font-black text-gray-600 dark:text-gray-400 uppercase border-b-2 border-gray-200 dark:border-slate-800/50 bg-gray-50 dark:bg-slate-900/50">
                        <tr>
                          <th className="py-5 pl-8 tracking-wider">Process</th>
                          <th className="py-5 text-center tracking-wider">Arrival</th>
                          <th className="py-5 text-center tracking-wider">Burst</th>
                          <th className="py-5 text-center text-emerald-600 dark:text-emerald-400 tracking-wider">End Time</th>
                          <th className="py-5 text-center text-blue-600 dark:text-blue-400 tracking-wider">Turnaround</th>
                          <th className="py-5 text-center text-orange-500 tracking-wider">Waiting</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-2 divide-gray-200 dark:divide-slate-800/30 font-bold">
                        {output.results.map((r, i) => (
                          <tr key={r.id} className="hover:bg-blue-50 dark:hover:bg-slate-800/50 transition-colors text-lg">
                            <td className="py-5 pl-8 flex items-center gap-4 text-gray-900 dark:text-white">
                               <div className={`w-3 h-3 rounded-full shadow-sm ${COLORS[i % COLORS.length]}`}></div>
                               {r.id}
                            </td>
                            <td className="py-5 text-center font-mono text-gray-600 dark:text-gray-300">{r.arrivalTime}</td>
                            <td className="py-5 text-center font-mono text-gray-600 dark:text-gray-300">{r.burstTime}</td>
                            <td className="py-5 text-center font-mono text-emerald-600 dark:text-emerald-400">{r.endTime}</td>
                            <td className="py-5 text-center font-mono text-blue-600 dark:text-blue-400">{r.turnaroundTime}</td>
                            <td className="py-5 text-center font-mono text-orange-500">{r.waitingTime}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {view === 'compare' && comparisonData && analysis && (
              <div className="glass-card p-10 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 text-purple-500/5 dark:text-purple-500/10"><BarChart2 size={200} /></div>
                <div className="flex items-center gap-4 mb-12 text-purple-600 dark:text-purple-400 relative z-10">
                    <BarChart2 size={36} />
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Performance Comparison</h2>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border border-emerald-200 dark:border-emerald-500/20 rounded-3xl p-8 mb-12 flex gap-8 shadow-lg relative overflow-hidden z-10">
                    <div className="absolute left-0 bottom-0 -ml-4 -mb-4 text-emerald-500/10"><Trophy size={120} /></div>
                    <div className="p-5 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl h-fit text-white shadow-md relative z-10">
                        <Trophy size={40} />
                    </div>
                    <div className="relative z-10 flex-1">
                        <h4 className="font-extrabold text-gray-900 dark:text-white mb-6 text-2xl flex items-center gap-3">
                            Winner Analysis: <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-400">{comparisonData[0].algo}</span>
                        </h4>
                        <div className="space-y-6 text-base text-gray-700 dark:text-gray-200 leading-relaxed font-medium">
                            <div>
                                <strong className="text-emerald-700 dark:text-emerald-300 block mb-2 text-lg">Why it won:</strong>
                                <p className="pl-4 border-l-4 border-emerald-400/50 py-1">{analysis.winnerText}</p>
                            </div>
                            <div className="pt-6 border-t border-emerald-200 dark:border-emerald-800/30">
                                <strong className="text-rose-700 dark:text-rose-300 block mb-2 text-lg">Why {comparisonData[comparisonData.length-1].algo} lost:</strong>
                                <p className="pl-4 border-l-4 border-rose-400/50 py-1">{analysis.loserText}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar rounded-3xl border-2 border-gray-200 dark:border-slate-800/50 relative z-10">
                    <table className="w-full text-left bg-white dark:bg-slate-950/40">
                        <thead className="text-sm font-black text-gray-600 dark:text-gray-400 uppercase border-b-2 border-gray-200 dark:border-slate-800/50 bg-gray-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="py-5 pl-8 tracking-wider">Algorithm</th>
                                <th className="py-5 w-2/5 tracking-wider px-6">Avg Turnaround</th>
                                <th className="py-5 w-1/4 tracking-wider">Avg Waiting</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-gray-200 dark:divide-slate-800/30 font-bold">
                            {comparisonData.map((data, idx) => {
                                const maxTat = Math.max(...comparisonData.map(d => d.tat));
                                const width = (data.tat / maxTat) * 100;
                                return (
                                    <tr key={data.algo} className={clsx("transition-all duration-300 text-lg group", idx === 0 ? "bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30" : "hover:bg-blue-50 dark:hover:bg-slate-800/50")}>
                                        <td className="py-6 pl-8 text-gray-900 dark:text-white relative">
                                            <div className="flex items-center gap-4">
                                                {idx === 0 ? <Trophy size={24} className="text-emerald-500" /> : <Activity size={24} className="text-gray-400 group-hover:text-blue-500 transition-colors"/> }
                                                {data.algo}
                                            </div>
                                            {idx === 0 && <span className="absolute top-2 left-8 text-[10px] bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1 rounded-full font-black tracking-widest shadow-sm">WINNER</span>}
                                        </td>
                                        <td className="py-6 px-6">
                                            <div className="flex flex-col gap-3 w-full">
                                                <div className="flex justify-between text-sm items-end">
                                                    <span className={clsx("font-black text-xl font-mono", idx === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400")}>{data.tat.toFixed(2)}</span>
                                                    <span className="text-gray-400 font-bold text-xs tracking-wider">MS</span>
                                                </div>
                                                <div className="h-4 w-full bg-gray-200 dark:bg-slate-700/50 rounded-full overflow-hidden shadow-inner p-0.5">
                                                    <div style={{ width: `${width}%` }} className={clsx("h-full rounded-full transition-all duration-1000 ease-out shadow-sm relative overflow-hidden group-hover:brightness-110", idx === 0 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-gradient-to-r from-blue-500 to-indigo-400")}>
                                                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-6 font-mono text-lg text-gray-600 dark:text-gray-300">{data.wt.toFixed(2)} ms</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}