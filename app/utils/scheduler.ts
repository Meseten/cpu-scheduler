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

const calculateAverages = (results: ProcessResult[], ganttChart: GanttBlock[]): SchedulerOutput => {
  const totalTAT = results.reduce((acc, curr) => acc + curr.turnaroundTime, 0);
  const totalWT = results.reduce((acc, curr) => acc + curr.waitingTime, 0);
  return {
    results: results.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })),
    ganttChart,
    averageTurnaroundTime: totalTAT / results.length || 0,
    averageWaitingTime: totalWT / results.length || 0,
  };
};

const solveFCFS = (processes: Process[]): SchedulerOutput => {
  const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
  let currentTime = 0;
  const results: ProcessResult[] = [];
  const ganttChart: GanttBlock[] = [];

  sorted.forEach((process) => {
    if (currentTime < process.arrivalTime) currentTime = process.arrivalTime;
    const startTime = currentTime;
    const endTime = startTime + process.burstTime;
    results.push({
      ...process, startTime, endTime,
      turnaroundTime: endTime - process.arrivalTime,
      waitingTime: startTime - process.arrivalTime,
    });
    ganttChart.push({ processId: process.id, startTime, endTime });
    currentTime = endTime;
  });
  return calculateAverages(results, ganttChart);
};

const solveSJF = (processes: Process[]): SchedulerOutput => {
  let currentTime = 0;
  let completed = 0;
  const n = processes.length;
  const isCompleted = new Array(n).fill(false);
  const results: ProcessResult[] = [];
  const ganttChart: GanttBlock[] = [];
  const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);

  while (completed < n) {
    let idx = -1;
    let minBurst = Infinity;
    for (let i = 0; i < n; i++) {
      if (sorted[i].arrivalTime <= currentTime && !isCompleted[i]) {
        if (sorted[i].burstTime < minBurst) {
          minBurst = sorted[i].burstTime;
          idx = i;
        } else if (sorted[i].burstTime === minBurst) {
          if (sorted[i].arrivalTime < sorted[idx].arrivalTime) idx = i;
        }
      }
    }
    if (idx !== -1) {
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
    } else {
      currentTime++;
    }
  }
  return calculateAverages(results, ganttChart);
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
  let lastProcessId = "";

  while (completed < n) {
    let idx = -1;
    let minTime = Infinity;
    for (let i = 0; i < n; i++) {
      if (processes[i].arrivalTime <= currentTime && remainingTime[i] > 0) {
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
      }
    } else {
      currentTime++;
    }
  }
  return calculateAverages(results, ganttChart);
};

const solvePriorityNP = (processes: Process[]): SchedulerOutput => {
  let currentTime = 0;
  let completed = 0;
  const n = processes.length;
  const isCompleted = new Array(n).fill(false);
  const results: ProcessResult[] = [];
  const ganttChart: GanttBlock[] = [];
  const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);

  while (completed < n) {
    let idx = -1;
    let highestPriority = Infinity;
    for (let i = 0; i < n; i++) {
      if (sorted[i].arrivalTime <= currentTime && !isCompleted[i]) {
        if (sorted[i].priority < highestPriority) {
          highestPriority = sorted[i].priority;
          idx = i;
        } else if (sorted[i].priority === highestPriority) {
          if (sorted[i].arrivalTime < sorted[idx].arrivalTime) idx = i;
        }
      }
    }
    if (idx !== -1) {
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
    } else {
      currentTime++;
    }
  }
  return calculateAverages(results, ganttChart);
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
      }
    } else {
      currentTime++;
    }
  }
  return calculateAverages(results, ganttChart);
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
  
  processes.forEach((p, i) => {
      if (p.arrivalTime === 0) { queue.push(i); visited[i] = true; }
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
        } else { break; }
    }

    const idx = queue.shift()!;
    if (results[idx].startTime === -1) results[idx].startTime = currentTime;
    const execTime = Math.min(timeQuantum, remainingTime[idx]);
    ganttChart.push({ processId: processes[idx].id, startTime: currentTime, endTime: currentTime + execTime });
    remainingTime[idx] -= execTime;
    currentTime += execTime;

    for (let i = 0; i < n; i++) {
      if (!visited[i] && processes[i].arrivalTime <= currentTime && remainingTime[i] > 0) {
        queue.push(i);
        visited[i] = true;
      }
    }
    if (remainingTime[idx] > 0) {
      queue.push(idx);
    } else {
      completed++;
      results[idx].endTime = currentTime;
      results[idx].turnaroundTime = currentTime - processes[idx].arrivalTime;
      results[idx].waitingTime = results[idx].turnaroundTime - processes[idx].burstTime;
    }
  }
  return calculateAverages(results, ganttChart);
};

const solveLJF = (processes: Process[]): SchedulerOutput => {
  let currentTime = 0;
  let completed = 0;
  const n = processes.length;
  const isCompleted = new Array(n).fill(false);
  const results: ProcessResult[] = [];
  const ganttChart: GanttBlock[] = [];
  const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);

  while (completed < n) {
    let idx = -1;
    let maxBurst = -1;
    for (let i = 0; i < n; i++) {
      if (sorted[i].arrivalTime <= currentTime && !isCompleted[i]) {
        if (sorted[i].burstTime > maxBurst) {
          maxBurst = sorted[i].burstTime;
          idx = i;
        } else if (sorted[i].burstTime === maxBurst) {
           if (sorted[i].arrivalTime < sorted[idx].arrivalTime) idx = i;
        }
      }
    }
    if (idx !== -1) {
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
    } else {
      currentTime++;
    }
  }
  return calculateAverages(results, ganttChart);
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
        }
    } else {
        currentTime++;
    }
  }
  return calculateAverages(results, ganttChart);
};

const solveHRRN = (processes: Process[]): SchedulerOutput => {
    let currentTime = 0;
    let completed = 0;
    const n = processes.length;
    const isCompleted = new Array(n).fill(false);
    const results: ProcessResult[] = [];
    const ganttChart: GanttBlock[] = [];
    const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);

    while (completed < n) {
        let idx = -1;
        let maxRatio = -1;
        for (let i = 0; i < n; i++) {
            if (sorted[i].arrivalTime <= currentTime && !isCompleted[i]) {
                const waitingTime = currentTime - sorted[i].arrivalTime;
                const ratio = (waitingTime + sorted[i].burstTime) / sorted[i].burstTime;
                if (ratio > maxRatio) {
                    maxRatio = ratio;
                    idx = i;
                }
            }
        }
        if (idx !== -1) {
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
        } else {
            currentTime++;
        }
    }
    return calculateAverages(results, ganttChart);
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

    while(completed < n) {
        for(let i=0; i<n; i++) {
            if(!visited[i] && processes[i].arrivalTime <= currentTime) {
                if(processes[i].priority <= 2) q1.push(i);
                else q2.push(i);
                visited[i] = true;
            }
        }
        if(q1.length > 0) {
            const idx = q1.shift()!;
            if (results[idx].startTime === -1) results[idx].startTime = currentTime;
            const exec = Math.min(timeQuantum, remainingTime[idx]);
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
            }
        } else if (q2.length > 0) {
            const idx = q2[0]; 
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
            }
        } else {
            currentTime++;
        }
    }
    return calculateAverages(results, ganttChart);
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
    
    while(completed < n) {
        for(let i=0; i<n; i++) {
            if(!visited[i] && processes[i].arrivalTime <= currentTime) {
                q0.push(i);
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
            if (results[idx].startTime === -1) results[idx].startTime = currentTime;
            const runTime = (queueLevel === 2) ? 1 : Math.min(remainingTime[idx], quantum);
            ganttChart.push({ processId: processes[idx].id, startTime: currentTime, endTime: currentTime + runTime });
            remainingTime[idx] -= runTime;
            currentTime += runTime;
            for(let i=0; i<n; i++) {
                if(!visited[i] && processes[i].arrivalTime <= currentTime) {
                    q0.push(i);
                    visited[i] = true;
                }
            }
            if (remainingTime[idx] === 0) {
                completed++;
                results[idx].endTime = currentTime;
                results[idx].turnaroundTime = currentTime - processes[idx].arrivalTime;
                results[idx].waitingTime = results[idx].turnaroundTime - processes[idx].burstTime;
                if(queueLevel === 2) q2.shift();
            } else {
                if(queueLevel === 0) q1.push(idx);
                else if(queueLevel === 1) q2.push(idx);
            }
        } else {
            currentTime++;
        }
    }
    return calculateAverages(results, ganttChart);
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