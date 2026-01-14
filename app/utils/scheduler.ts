export type Process = {
  id: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
};

export type ProcessResult = Process & {
  startTime: number;
  endTime: number;
  turnaroundTime: number;
  waitingTime: number;
};

export type GanttBlock = {
  processId: string;
  startTime: number;
  endTime: number;
};

export type SchedulerOutput = {
  results: ProcessResult[];
  ganttChart: GanttBlock[];
  averageTurnaroundTime: number;
  averageWaitingTime: number;
  decisionLog: string[]; 
};

export const ALGORITHMS = [
  "FCFS",
  "SJF (Non-Preemptive)",
  "SRTF (Preemptive)",
  "Priority (Non-Preemptive)",
  "Priority (Preemptive)",
  "Round Robin",
  "LJF (Non-Preemptive)",
  "LRTF (Preemptive)",
  "HRRN",
  "Multilevel Queue",
  "Multilevel Feedback Queue (MLFQ)"
] as const;

export type AlgorithmType = (typeof ALGORITHMS)[number];

const calculateAverages = (results: ProcessResult[], ganttChart: GanttBlock[], decisionLog: string[]): SchedulerOutput => {
  const totalTAT = results.reduce((acc, curr) => acc + curr.turnaroundTime, 0);
  const totalWT = results.reduce((acc, curr) => acc + curr.waitingTime, 0);
  return {
    results: results.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })),
    ganttChart,
    averageTurnaroundTime: totalTAT / results.length || 0,
    averageWaitingTime: totalWT / results.length || 0,
    decisionLog
  };
};

const solveFCFS = (processes: Process[]): SchedulerOutput => {
  const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
  let currentTime = 0;
  const results: ProcessResult[] = [];
  const ganttChart: GanttBlock[] = [];
  const logs: string[] = [];

  logs.push("Algorithm Started: FCFS sorts strictly by Arrival Time.");

  sorted.forEach((process) => {
    if (currentTime < process.arrivalTime) {
        logs.push(`Time ${currentTime}: CPU is idle. Waiting for ${process.id} to arrive at ${process.arrivalTime}.`);
        currentTime = process.arrivalTime;
    }
    
    logs.push(`Time ${currentTime}: ${process.id} starts (Arrived: ${process.arrivalTime}, Burst: ${process.burstTime}). Selected because it is next in the arrival queue.`);
    
    const startTime = currentTime;
    const endTime = startTime + process.burstTime;
    results.push({
      ...process, startTime, endTime,
      turnaroundTime: endTime - process.arrivalTime,
      waitingTime: startTime - process.arrivalTime,
    });
    ganttChart.push({ processId: process.id, startTime, endTime });
    currentTime = endTime;
    logs.push(`Time ${endTime}: ${process.id} completed execution.`);
  });
  return calculateAverages(results, ganttChart, logs);
};

const solveSJF = (processes: Process[]): SchedulerOutput => {
  let currentTime = 0;
  let completed = 0;
  const n = processes.length;
  const isCompleted = new Array(n).fill(false);
  const results: ProcessResult[] = [];
  const ganttChart: GanttBlock[] = [];
  const logs: string[] = ["Algorithm Started: SJF checks the ready queue for the process with the smallest Burst Time."];
  const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);

  while (completed < n) {
    let idx = -1;
    let minBurst = Infinity;
    
    const candidates = [];
    for (let i = 0; i < n; i++) {
      if (sorted[i].arrivalTime <= currentTime && !isCompleted[i]) {
        candidates.push(`${sorted[i].id}(Burst:${sorted[i].burstTime})`);
        if (sorted[i].burstTime < minBurst) {
          minBurst = sorted[i].burstTime;
          idx = i;
        } else if (sorted[i].burstTime === minBurst) {
          if (sorted[i].arrivalTime < sorted[idx].arrivalTime) idx = i;
        }
      }
    }

    if (idx !== -1) {
      logs.push(`Time ${currentTime}: Ready Queue: [${candidates.join(", ")}]. Comparing bursts... ${sorted[idx].id} is the shortest.`);
      const p = sorted[idx];
      const startTime = currentTime;
      const endTime = startTime + p.burstTime;
      results.push({
        ...p, startTime, endTime,
        turnaroundTime: endTime - p.arrivalTime,
        waitingTime: startTime - p.arrivalTime,
      });
      ganttChart.push({ processId: p.id, startTime, endTime });
      isCompleted[idx] = true;
      completed++;
      currentTime = endTime;
      logs.push(`Time ${endTime}: ${p.id} completed.`);
    } else {
      logs.push(`Time ${currentTime}: CPU Idle. No process has arrived yet.`);
      currentTime++;
    }
  }
  return calculateAverages(results, ganttChart, logs);
};

const solveSRTF = (processes: Process[]): SchedulerOutput => {
  const n = processes.length;
  const remainingTime = processes.map(p => p.burstTime);
  const results: ProcessResult[] = processes.map(p => ({
    ...p, startTime: -1, endTime: 0, turnaroundTime: 0, waitingTime: 0
  }));
  let currentTime = 0;
  let completed = 0;
  const ganttChart: GanttBlock[] = [];
  const logs: string[] = ["Algorithm Started: SRTF checks every 1ms unit. If a new process arrives with a shorter remaining time than the current one, it preempts."];
  let lastProcessId = "";

  while (completed < n) {
    let idx = -1;
    let minTime = Infinity;
    const candidates = [];

    for (let i = 0; i < n; i++) {
      if (processes[i].arrivalTime <= currentTime && remainingTime[i] > 0) {
        candidates.push(`${processes[i].id}(Rem:${remainingTime[i]})`);
        if (remainingTime[i] < minTime) {
          minTime = remainingTime[i];
          idx = i;
        } else if (remainingTime[i] === minTime) {
          if (processes[i].arrivalTime < processes[idx].arrivalTime) idx = i;
        }
      }
    }

    if (idx !== -1) {
      if (lastProcessId !== processes[idx].id) {
        if (lastProcessId !== "") {
            const oldIdx = processes.findIndex(p => p.id === lastProcessId);
            const oldRem = oldIdx !== -1 ? remainingTime[oldIdx] : 0;
            logs.push(`Time ${currentTime}: ⚠️ PREEMPTION! ${processes[idx].id} (Rem:${remainingTime[idx]}) is shorter than ${lastProcessId} (Rem:${oldRem}). Switching context.`);
        } else {
            logs.push(`Time ${currentTime}: Starting ${processes[idx].id} (Remaining: ${remainingTime[idx]}). Candidates: [${candidates.join(", ")}].`);
        }
        
        ganttChart.push({ processId: processes[idx].id, startTime: currentTime, endTime: currentTime + 1 });
        lastProcessId = processes[idx].id;
      } else {
        ganttChart[ganttChart.length - 1].endTime++;
      }
      
      if (results[idx].startTime === -1) results[idx].startTime = currentTime;
      remainingTime[idx]--;
      currentTime++;
      
      if (remainingTime[idx] === 0) {
        completed++;
        results[idx].endTime = currentTime;
        results[idx].turnaroundTime = results[idx].endTime - results[idx].arrivalTime;
        results[idx].waitingTime = results[idx].turnaroundTime - results[idx].burstTime;
        logs.push(`Time ${currentTime}: ${processes[idx].id} finished execution.`);
        lastProcessId = ""; 
      }
    } else {
      currentTime++;
    }
  }
  return calculateAverages(results, ganttChart, logs);
};

const solvePriorityNP = (processes: Process[]): SchedulerOutput => {
  let currentTime = 0;
  let completed = 0;
  const n = processes.length;
  const isCompleted = new Array(n).fill(false);
  const results: ProcessResult[] = [];
  const ganttChart: GanttBlock[] = [];
  const logs: string[] = ["Algorithm Started: Non-Preemptive Priority. Lower Number = Higher Importance."];
  const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);

  while (completed < n) {
    let idx = -1;
    let highestPriority = Infinity;
    const candidates = [];

    for (let i = 0; i < n; i++) {
      if (sorted[i].arrivalTime <= currentTime && !isCompleted[i]) {
        candidates.push(`${sorted[i].id}(Prio:${sorted[i].priority})`);
        if (sorted[i].priority < highestPriority) {
          highestPriority = sorted[i].priority;
          idx = i;
        } else if (sorted[i].priority === highestPriority) {
          if (sorted[i].arrivalTime < sorted[idx].arrivalTime) idx = i;
        }
      }
    }

    if (idx !== -1) {
      logs.push(`Time ${currentTime}: Ready Queue: [${candidates.join(", ")}]. Selected ${sorted[idx].id} because it has the highest priority (Lowest number).`);
      const p = sorted[idx];
      const startTime = currentTime;
      const endTime = startTime + p.burstTime;
      results.push({
        ...p, startTime, endTime,
        turnaroundTime: endTime - p.arrivalTime,
        waitingTime: startTime - p.arrivalTime,
      });
      ganttChart.push({ processId: p.id, startTime, endTime });
      isCompleted[idx] = true;
      completed++;
      currentTime = endTime;
      logs.push(`Time ${endTime}: ${p.id} completed.`);
    } else {
      currentTime++;
    }
  }
  return calculateAverages(results, ganttChart, logs);
};

const solvePriorityP = (processes: Process[]): SchedulerOutput => {
  const n = processes.length;
  const remainingTime = processes.map(p => p.burstTime);
  const results: ProcessResult[] = processes.map(p => ({
    ...p, startTime: -1, endTime: 0, turnaroundTime: 0, waitingTime: 0
  }));
  let currentTime = 0;
  let completed = 0;
  const ganttChart: GanttBlock[] = [];
  const logs: string[] = ["Algorithm Started: Preemptive Priority. CPU immediately switches if a more important process arrives."];
  let lastProcessId = "";

  while (completed < n) {
    let idx = -1;
    let highestPriority = Infinity;
    
    for (let i = 0; i < n; i++) {
      if (processes[i].arrivalTime <= currentTime && remainingTime[i] > 0) {
        if (processes[i].priority < highestPriority) {
          highestPriority = processes[i].priority;
          idx = i;
        } else if (processes[i].priority === highestPriority) {
           if (processes[i].arrivalTime < processes[idx].arrivalTime) idx = i;
        }
      }
    }

    if (idx !== -1) {
      if (lastProcessId !== processes[idx].id) {
         if (lastProcessId !== "") logs.push(`Time ${currentTime}: ⚠️ INTERRUPT! ${processes[idx].id} (Prio ${processes[idx].priority}) is more important than ${lastProcessId}. Preempting.`);
         else logs.push(`Time ${currentTime}: ${processes[idx].id} starts (Prio ${processes[idx].priority}).`);
        ganttChart.push({ processId: processes[idx].id, startTime: currentTime, endTime: currentTime + 1 });
        lastProcessId = processes[idx].id;
      } else {
        ganttChart[ganttChart.length - 1].endTime++;
      }
      if (results[idx].startTime === -1) results[idx].startTime = currentTime;
      remainingTime[idx]--;
      currentTime++;
      if (remainingTime[idx] === 0) {
        completed++;
        results[idx].endTime = currentTime;
        results[idx].turnaroundTime = results[idx].endTime - results[idx].arrivalTime;
        results[idx].waitingTime = results[idx].turnaroundTime - results[idx].burstTime;
        logs.push(`Time ${currentTime}: ${processes[idx].id} finished.`);
        lastProcessId = "";
      }
    } else {
      currentTime++;
    }
  }
  return calculateAverages(results, ganttChart, logs);
};

const solveRR = (processes: Process[], timeQuantum: number): SchedulerOutput => {
  const n = processes.length;
  const remainingTime = processes.map(p => p.burstTime);
  const results: ProcessResult[] = processes.map(p => ({
    ...p, startTime: -1, endTime: 0, turnaroundTime: 0, waitingTime: 0
  }));
  let currentTime = 0;
  let completed = 0;
  const ganttChart: GanttBlock[] = [];
  const queue: number[] = [];
  const visited = new Array(n).fill(false);
  const logs: string[] = [`Algorithm Started: Round Robin with Time Quantum ${timeQuantum}ms.`];
  
  processes.forEach((p, i) => {
      if (p.arrivalTime === 0) { queue.push(i); visited[i] = true; logs.push(`Time 0: ${p.id} arrived and pushed to queue.`); }
  });

  while (completed < n) {
    if (queue.length === 0) {
        let nextArr = Infinity;
        let nextIdx = -1;
        for(let i=0; i<n; i++) {
            if (!visited[i] && processes[i].arrivalTime < nextArr) {
                nextArr = processes[i].arrivalTime;
                nextIdx = i;
            }
        }
        if (nextIdx !== -1) {
            currentTime = nextArr;
            queue.push(nextIdx);
            visited[nextIdx] = true;
            logs.push(`Time ${currentTime}: Queue empty. Fast-forward to ${processes[nextIdx].id} arrival.`);
        } else { break; }
    }

    const idx = queue.shift()!;
    if (results[idx].startTime === -1) results[idx].startTime = currentTime;
    
    const execTime = Math.min(timeQuantum, remainingTime[idx]);
    logs.push(`Time ${currentTime}: Popped ${processes[idx].id}. Executing for ${execTime}ms (Rem: ${remainingTime[idx]}ms).`);
    
    ganttChart.push({ processId: processes[idx].id, startTime: currentTime, endTime: currentTime + execTime });
    remainingTime[idx] -= execTime;
    currentTime += execTime;

    for (let i = 0; i < n; i++) {
      if (!visited[i] && processes[i].arrivalTime <= currentTime && remainingTime[i] > 0) {
        queue.push(i);
        visited[i] = true;
        logs.push(`Time ${Math.max(processes[i].arrivalTime, currentTime - execTime)}: ${processes[i].id} arrived. Added to back of queue.`);
      }
    }
    
    if (remainingTime[idx] > 0) {
      queue.push(idx);
      logs.push(`Time ${currentTime}: ${processes[idx].id} Quantum expired. Re-added to back of queue (Rem: ${remainingTime[idx]}).`);
    } else {
      completed++;
      results[idx].endTime = currentTime;
      results[idx].turnaroundTime = currentTime - processes[idx].arrivalTime;
      results[idx].waitingTime = results[idx].turnaroundTime - processes[idx].burstTime;
      logs.push(`Time ${currentTime}: ${processes[idx].id} finished.`);
    }
  }
  return calculateAverages(results, ganttChart, logs);
};

const solveLJF = (processes: Process[]): SchedulerOutput => {
    let currentTime = 0;
    let completed = 0;
    const n = processes.length;
    const isCompleted = new Array(n).fill(false);
    const results: ProcessResult[] = [];
    const ganttChart: GanttBlock[] = [];
    const logs: string[] = ["Algorithm Started: LJF selects the process with the Largest Burst Time."];
    const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
  
    while (completed < n) {
      let idx = -1;
      let maxBurst = -1;
      const candidates = [];

      for (let i = 0; i < n; i++) {
        if (sorted[i].arrivalTime <= currentTime && !isCompleted[i]) {
          candidates.push(`${sorted[i].id}(Burst:${sorted[i].burstTime})`);
          if (sorted[i].burstTime > maxBurst) {
            maxBurst = sorted[i].burstTime;
            idx = i;
          } else if (sorted[i].burstTime === maxBurst) {
             if (sorted[i].arrivalTime < sorted[idx].arrivalTime) idx = i;
          }
        }
      }
      if (idx !== -1) {
        logs.push(`Time ${currentTime}: Candidates: [${candidates.join(", ")}]. Selected ${sorted[idx].id} (Largest Burst: ${sorted[idx].burstTime}).`);
        const p = sorted[idx];
        const startTime = currentTime;
        const endTime = startTime + p.burstTime;
        results.push({
          ...p, startTime, endTime,
          turnaroundTime: endTime - p.arrivalTime,
          waitingTime: startTime - p.arrivalTime,
        });
        ganttChart.push({ processId: p.id, startTime, endTime });
        isCompleted[idx] = true;
        completed++;
        currentTime = endTime;
        logs.push(`Time ${endTime}: ${p.id} finished.`);
      } else {
        currentTime++;
      }
    }
    return calculateAverages(results, ganttChart, logs);
};

const solveLRTF = (processes: Process[]): SchedulerOutput => {
    const n = processes.length;
    const remainingTime = processes.map(p => p.burstTime);
    const results: ProcessResult[] = processes.map(p => ({
      ...p, startTime: -1, endTime: 0, turnaroundTime: 0, waitingTime: 0
    }));
    let currentTime = 0;
    let completed = 0;
    const ganttChart: GanttBlock[] = [];
    const logs: string[] = ["Algorithm Started: LRTF preemptively selects process with Longest Remaining Time to balance load."];
    let lastProcessId = "";
  
    while (completed < n) {
      let idx = -1;
      let maxTime = -1;
      
      for (let i = 0; i < n; i++) {
        if (processes[i].arrivalTime <= currentTime && remainingTime[i] > 0) {
          if (remainingTime[i] > maxTime) {
            maxTime = remainingTime[i];
            idx = i;
          } else if (remainingTime[i] === maxTime) {
             if (processes[i].arrivalTime < processes[idx].arrivalTime) idx = i;
          }
        }
      }
      if (idx !== -1) {
          if (lastProcessId !== processes[idx].id) {
              logs.push(`Time ${currentTime}: Switched to ${processes[idx].id} because it has the most work left (Rem: ${remainingTime[idx]}).`);
              ganttChart.push({ processId: processes[idx].id, startTime: currentTime, endTime: currentTime + 1 });
              lastProcessId = processes[idx].id;
          } else {
              ganttChart[ganttChart.length - 1].endTime++;
          }
          if (results[idx].startTime === -1) results[idx].startTime = currentTime;
          remainingTime[idx]--;
          currentTime++;
          if (remainingTime[idx] === 0) {
              completed++;
              results[idx].endTime = currentTime;
              results[idx].turnaroundTime = results[idx].endTime - results[idx].arrivalTime;
              results[idx].waitingTime = results[idx].turnaroundTime - results[idx].burstTime;
              logs.push(`Time ${currentTime}: ${processes[idx].id} finished.`);
          }
      } else {
          currentTime++;
      }
    }
    return calculateAverages(results, ganttChart, logs);
};

const solveHRRN = (processes: Process[]): SchedulerOutput => {
    let currentTime = 0;
    let completed = 0;
    const n = processes.length;
    const isCompleted = new Array(n).fill(false);
    const results: ProcessResult[] = [];
    const ganttChart: GanttBlock[] = [];
    const logs: string[] = ["Algorithm Started: HRRN. Ratio = (Wait + Burst) / Burst. Longer wait = Higher priority."];
    const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);

    while (completed < n) {
        let idx = -1;
        let maxRatio = -1;
        const candidates = [];

        for (let i = 0; i < n; i++) {
            if (sorted[i].arrivalTime <= currentTime && !isCompleted[i]) {
                const waitingTime = currentTime - sorted[i].arrivalTime;
                const ratio = (waitingTime + sorted[i].burstTime) / sorted[i].burstTime;
                candidates.push(`${sorted[i].id}(Wait:${waitingTime}, Ratio:${ratio.toFixed(2)})`);
                if (ratio > maxRatio) {
                    maxRatio = ratio;
                    idx = i;
                }
            }
        }
        if (idx !== -1) {
            logs.push(`Time ${currentTime}: Candidates [${candidates.join(", ")}]. Selected ${sorted[idx].id} (Highest Ratio).`);
            const p = sorted[idx];
            const startTime = currentTime;
            const endTime = startTime + p.burstTime;
            results.push({
                ...p, startTime, endTime,
                turnaroundTime: endTime - p.arrivalTime,
                waitingTime: startTime - p.arrivalTime,
            });
            ganttChart.push({ processId: p.id, startTime, endTime });
            isCompleted[idx] = true;
            completed++;
            currentTime = endTime;
            logs.push(`Time ${endTime}: ${p.id} finished.`);
        } else {
            currentTime++;
        }
    }
    return calculateAverages(results, ganttChart, logs);
};

const solveMLQ = (processes: Process[], timeQuantum: number): SchedulerOutput => {
    const n = processes.length;
    const remainingTime = processes.map(p => p.burstTime);
    const results: ProcessResult[] = processes.map(p => ({
        ...p, startTime: -1, endTime: 0, turnaroundTime: 0, waitingTime: 0
    }));
    let currentTime = 0;
    let completed = 0;
    const ganttChart: GanttBlock[] = [];
    const q1: number[] = [];
    const q2: number[] = [];
    const visited = new Array(n).fill(false);
    const logs: string[] = ["Algorithm Started: Multilevel Queue. Q1 (System/Prio<=2, RR) > Q2 (User/Prio>2, FCFS)."];

    while(completed < n) {
        for(let i=0; i<n; i++) {
            if(!visited[i] && processes[i].arrivalTime <= currentTime) {
                if(processes[i].priority <= 2) {
                    q1.push(i);
                    logs.push(`Time ${currentTime}: ${processes[i].id} enters Queue 1 (System - High Priority).`);
                }
                else {
                    q2.push(i);
                    logs.push(`Time ${currentTime}: ${processes[i].id} enters Queue 2 (User - Low Priority).`);
                }
                visited[i] = true;
            }
        }
        
        if(q1.length > 0) {
            const idx = q1.shift()!;
            if (results[idx].startTime === -1) results[idx].startTime = currentTime;
            const exec = Math.min(timeQuantum, remainingTime[idx]);
            
            logs.push(`Time ${currentTime}: Q1 has processes. Running ${processes[idx].id} (RR).`);
            ganttChart.push({ processId: processes[idx].id, startTime: currentTime, endTime: currentTime + exec });
            remainingTime[idx] -= exec;
            currentTime += exec;
            
            for(let i=0; i<n; i++) {
                if(!visited[i] && processes[i].arrivalTime <= currentTime) {
                    if(processes[i].priority <= 2) q1.push(i);
                    else q2.push(i);
                    visited[i] = true;
                }
            }
            if(remainingTime[idx] > 0) q1.push(idx);
            else {
                completed++;
                results[idx].endTime = currentTime;
                results[idx].turnaroundTime = currentTime - processes[idx].arrivalTime;
                results[idx].waitingTime = results[idx].turnaroundTime - processes[idx].burstTime;
                logs.push(`Time ${currentTime}: ${processes[idx].id} finished.`);
            }
        } else if (q2.length > 0) {
            const idx = q2[0];
            logs.push(`Time ${currentTime}: Q1 empty. Running ${processes[idx].id} from Q2 (FCFS).`);
            
            if (results[idx].startTime === -1) results[idx].startTime = currentTime;
            ganttChart.push({ processId: processes[idx].id, startTime: currentTime, endTime: currentTime + 1 });
            remainingTime[idx]--;
            currentTime++;
            
            if(remainingTime[idx] === 0) {
                completed++;
                results[idx].endTime = currentTime;
                results[idx].turnaroundTime = currentTime - processes[idx].arrivalTime;
                results[idx].waitingTime = results[idx].turnaroundTime - processes[idx].burstTime;
                q2.shift(); 
                logs.push(`Time ${currentTime}: ${processes[idx].id} finished.`);
            }
        } else {
            currentTime++;
        }
    }
    return calculateAverages(results, ganttChart, logs);
};

const solveMLFQ = (processes: Process[], timeQuantum: number): SchedulerOutput => {
    const n = processes.length;
    const remainingTime = processes.map(p => p.burstTime);
    const results: ProcessResult[] = processes.map(p => ({
        ...p, startTime: -1, endTime: 0, turnaroundTime: 0, waitingTime: 0
    }));
    let currentTime = 0;
    let completed = 0;
    const ganttChart: GanttBlock[] = [];
    const q0: number[] = [];
    const q1: number[] = [];
    const q2: number[] = [];
    const visited = new Array(n).fill(false);
    const logs: string[] = ["Algorithm Started: MLFQ. Q0(RR, TQ) -> Q1(RR, TQ*2) -> Q2(FCFS). Processes downgrade if they use full quantum."];
    
    while(completed < n) {
        for(let i=0; i<n; i++) {
            if(!visited[i] && processes[i].arrivalTime <= currentTime) {
                q0.push(i);
                logs.push(`Time ${currentTime}: ${processes[i].id} Arrived. Added to Top Priority Q0.`);
                visited[i] = true;
            }
        }
        let idx = -1;
        let queueLevel = -1;
        let quantum = 0;
        
        if(q0.length > 0) { idx = q0.shift()!; queueLevel = 0; quantum = timeQuantum; } 
        else if (q1.length > 0) { idx = q1.shift()!; queueLevel = 1; quantum = timeQuantum * 2; } 
        else if (q2.length > 0) { idx = q2[0]; queueLevel = 2; quantum = Infinity; }
        
        if (idx !== -1) {
            logs.push(`Time ${currentTime}: Executing ${processes[idx].id} from Q${queueLevel}.`);
            if (results[idx].startTime === -1) results[idx].startTime = currentTime;
            
            const runTime = (queueLevel === 2) ? 1 : Math.min(remainingTime[idx], quantum);
            ganttChart.push({ processId: processes[idx].id, startTime: currentTime, endTime: currentTime + runTime });
            remainingTime[idx] -= runTime;
            currentTime += runTime;
            
            for(let i=0; i<n; i++) {
                if(!visited[i] && processes[i].arrivalTime <= currentTime) {
                    q0.push(i);
                    logs.push(`Time ${currentTime}: ${processes[i].id} Arrived during exec. Added to Q0.`);
                    visited[i] = true;
                }
            }
            
            if (remainingTime[idx] === 0) {
                completed++;
                results[idx].endTime = currentTime;
                results[idx].turnaroundTime = currentTime - processes[idx].arrivalTime;
                results[idx].waitingTime = results[idx].turnaroundTime - processes[idx].burstTime;
                if(queueLevel === 2) q2.shift();
                logs.push(`Time ${currentTime}: ${processes[idx].id} Finished.`);
            } else {
                if(queueLevel === 0) {
                    q1.push(idx);
                    logs.push(`Time ${currentTime}: ${processes[idx].id} used full Q0 slice. Demoted to Q1.`);
                }
                else if(queueLevel === 1) {
                    q2.push(idx);
                    logs.push(`Time ${currentTime}: ${processes[idx].id} used full Q1 slice. Demoted to Q2.`);
                }
            }
        } else {
            currentTime++;
        }
    }
    return calculateAverages(results, ganttChart, logs);
};

export const solve = (algorithm: AlgorithmType, processes: Process[], timeQuantum: number): SchedulerOutput => {
  switch (algorithm) {
    case "FCFS": return solveFCFS(processes);
    case "SJF (Non-Preemptive)": return solveSJF(processes);
    case "SRTF (Preemptive)": return solveSRTF(processes);
    case "Priority (Non-Preemptive)": return solvePriorityNP(processes);
    case "Priority (Preemptive)": return solvePriorityP(processes);
    case "Round Robin": return solveRR(processes, timeQuantum);
    case "LJF (Non-Preemptive)": return solveLJF(processes);
    case "LRTF (Preemptive)": return solveLRTF(processes);
    case "HRRN": return solveHRRN(processes);
    case "Multilevel Queue": return solveMLQ(processes, timeQuantum);
    case "Multilevel Feedback Queue (MLFQ)": return solveMLFQ(processes, timeQuantum);
    default: return solveFCFS(processes);
  }
};