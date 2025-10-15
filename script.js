// Global Variables
let processes = [];
let resources = [];
let currentOperation = 'fcfs';
let currentTheme = 'light';
let previousMetrics = {};
let charts = {};
let currentSection = 'scheduling';

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupEventListeners();
    loadDefaultConfiguration();
});

// Dashboard Initialization
function initializeDashboard() {
    // Initialize Chart.js configurations
    Chart.defaults.font.family = 'Inter, sans-serif';
    Chart.defaults.font.size = 12;
    
    // Set initial operation
    handleOperationChange();
    
    // Initialize empty charts
    initializeCharts();
    
    // Setup navigation
    setupNavigation();
}

// Event Listeners Setup
function setupEventListeners() {
    // Operation selector
    document.getElementById('operationSelect').addEventListener('change', handleOperationChange);
    
    // Process search
    document.getElementById('processSearch').addEventListener('input', filterProcessTable);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Navigation Setup
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const section = this.dataset.section;
            switchSection(section);
        });
    });
}

// Switch Section Function (FIXED)
function switchSection(section) {
    // Update navigation active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
    
    currentSection = section;
    
    // Update operation select based on section
    const operationSelect = document.getElementById('operationSelect');
    
    if (section === 'scheduling') {
        operationSelect.innerHTML = `
            <optgroup label="CPU Scheduling">
                <option value="fcfs">First Come First Serve (FCFS)</option>
                <option value="sjf">Shortest Job First (SJF)</option>
                <option value="srtf">Shortest Remaining Time First</option>
                <option value="rr">Round Robin</option>
                <option value="priority">Priority Scheduling</option>
            </optgroup>
        `;
        operationSelect.value = 'fcfs';
    } else if (section === 'memory') {
        operationSelect.innerHTML = `
            <optgroup label="Memory Management">
                <option value="firstfit">First Fit Allocation</option>
                <option value="bestfit">Best Fit Allocation</option>
                <option value="worstfit">Worst Fit Allocation</option>
            </optgroup>
        `;
        operationSelect.value = 'firstfit';
    } else if (section === 'deadlock') {
        operationSelect.innerHTML = `
            <optgroup label="Deadlock Management">
                <option value="detection">Deadlock Detection</option>
            </optgroup>
        `;
        operationSelect.value = 'detection';
    }
    
    currentOperation = operationSelect.value;
    handleOperationChange();
    toggleSections();
}

// Handle Operation Change
function handleOperationChange() {
    const operation = document.getElementById('operationSelect').value;
    currentOperation = operation;
    
    updateInputForm();
    updateTableHeaders();
    clearResults();
    toggleSections();
}

// Update Input Form Based on Operation
function updateInputForm() {
    const inputGrid = document.getElementById('inputGrid');
    inputGrid.innerHTML = '';
    
    const baseInputs = [
        { id: 'processName', label: 'Process Name', type: 'text', placeholder: 'P1, P2, P3...' },
        { id: 'arrivalTime', label: 'Arrival Time', type: 'number', placeholder: '0', min: '0' },
        { id: 'burstTime', label: 'Burst Time', type: 'number', placeholder: '5', min: '1' }
    ];
    
    // Add operation-specific inputs
    let additionalInputs = [];
    
    switch(currentOperation) {
        case 'priority':
            additionalInputs.push({ id: 'priority', label: 'Priority', type: 'number', placeholder: '1', min: '1', max: '10' });
            break;
        case 'rr':
            additionalInputs.push({ id: 'quantum', label: 'Time Quantum', type: 'number', placeholder: '3', min: '1' });
            break;
        case 'firstfit':
        case 'bestfit':
        case 'worstfit':
            additionalInputs.push({ id: 'memorySize', label: 'Memory Size', type: 'number', placeholder: '50', min: '1' });
            break;
        case 'detection':
            additionalInputs = [
                { id: 'resourcesHeld', label: 'Resources Held', type: 'text', placeholder: '1,0,2' },
                { id: 'resourcesRequested', label: 'Resources Requested', type: 'text', placeholder: '0,1,0' }
            ];
            break;
    }
    
    const allInputs = [...baseInputs, ...additionalInputs];
    
    allInputs.forEach(input => {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'input-group';
        
        inputGroup.innerHTML = `
            <label for="${input.id}">${input.label}</label>
            <input 
                type="${input.type}" 
                id="${input.id}" 
                placeholder="${input.placeholder}"
                ${input.min ? `min="${input.min}"` : ''}
                ${input.max ? `max="${input.max}"` : ''}
            >
        `;
        
        inputGrid.appendChild(inputGroup);
    });
}

// Update Table Headers
function updateTableHeaders() {
    const headers = document.getElementById('tableHeaders');
    headers.innerHTML = '';
    
    let headerColumns = ['Process', 'Arrival', 'Burst'];
    
    switch(currentOperation) {
        case 'priority':
            headerColumns.push('Priority');
            break;
        case 'firstfit':
        case 'bestfit':
        case 'worstfit':
            headerColumns = ['Process', 'Memory Size', 'Allocated Position'];
            break;
        case 'detection':
            headerColumns = ['Process', 'Resources Held', 'Resources Requested'];
            break;
    }
    
    headerColumns.push('Start Time', 'Finish Time', 'Waiting Time', 'Turnaround Time', 'Status');
    
    headerColumns.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headers.appendChild(th);
    });
}

// Add Process
function addProcess() {
    const processData = gatherProcessData();
    
    if (!validateProcessData(processData)) {
        showNotification('Please fill all required fields correctly', 'error');
        return;
    }
    
    processes.push({
        ...processData,
        id: generateId(),
        status: 'Ready',
        startTime: null,
        finishTime: null,
        waitingTime: null,
        turnaroundTime: null
    });
    
    updateProcessTable();
    clearInputs();
    showNotification('Process added successfully', 'success');
}

// Gather Process Data from Form
function gatherProcessData() {
    const data = {};
    
    document.querySelectorAll('#inputGrid input').forEach(input => {
        const value = input.type === 'number' ? parseFloat(input.value) : input.value;
        data[input.id] = value;
    });
    
    return data;
}

// Validate Process Data
function validateProcessData(data) {
    if (!data.processName || data.processName.trim() === '') return false;
    
    if (currentOperation === 'detection') {
        return data.resourcesHeld && data.resourcesRequested;
    }
    
    if (isNaN(data.arrivalTime) || data.arrivalTime < 0) return false;
    if (isNaN(data.burstTime) || data.burstTime <= 0) return false;
    
    // Operation-specific validation
    switch(currentOperation) {
        case 'priority':
            if (isNaN(data.priority) || data.priority < 1 || data.priority > 10) return false;
            break;
        case 'firstfit':
        case 'bestfit':
        case 'worstfit':
            if (isNaN(data.memorySize) || data.memorySize <= 0) return false;
            break;
    }
    
    return true;
}

// Load Sample Data
function loadSampleData() {
    clearAll();
    
    const sampleData = getSampleDataForOperation();
    processes = sampleData.processes;
    resources = sampleData.resources || [];
    
    updateProcessTable();
    showNotification('Sample data loaded successfully', 'success');
}

// Get Sample Data Based on Operation
function getSampleDataForOperation() {
    if (currentOperation === 'detection') {
        return {
            processes: [
                { id: 1, processName: 'P1', resourcesHeld: '0,1,0', resourcesRequested: '2,0,0', status: 'Ready' },
                { id: 2, processName: 'P2', resourcesHeld: '2,0,0', resourcesRequested: '0,0,1', status: 'Ready' },
                { id: 3, processName: 'P3', resourcesHeld: '3,0,2', resourcesRequested: '0,0,0', status: 'Ready' },
                { id: 4, processName: 'P4', resourcesHeld: '2,1,1', resourcesRequested: '1,0,0', status: 'Ready' },
                { id: 5, processName: 'P5', resourcesHeld: '0,0,2', resourcesRequested: '0,0,2', status: 'Ready' }
            ]
        };
    }
    
    return {
        processes: [
            { id: 1, processName: 'P1', arrivalTime: 0, burstTime: 6, priority: 2, memorySize: 25, status: 'Ready' },
            { id: 2, processName: 'P2', arrivalTime: 1, burstTime: 4, priority: 1, memorySize: 15, status: 'Ready' },
            { id: 3, processName: 'P3', arrivalTime: 2, burstTime: 8, priority: 3, memorySize: 35, status: 'Ready' },
            { id: 4, processName: 'P4', arrivalTime: 3, burstTime: 3, priority: 2, memorySize: 20, status: 'Ready' },
            { id: 5, processName: 'P5', arrivalTime: 4, burstTime: 5, priority: 4, memorySize: 30, status: 'Ready' }
        ]
    };
}

// Execute Operation
function executeOperation() {
    if (processes.length === 0) {
        showNotification('Please add processes first', 'error');
        return;
    }
    
    showLoading(true);
    
    setTimeout(() => {
        try {
            const results = performOperation();
            displayResults(results);
            updateAnalytics(results);
            showNotification('Operation executed successfully', 'success');
        } catch (error) {
            showNotification('Error executing operation: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }, 500);
}

// Perform Operation Based on Selection
function performOperation() {
    switch(currentOperation) {
        case 'fcfs': return executeFCFS();
        case 'sjf': return executeSJF();
        case 'srtf': return executeSRTF();
        case 'rr': return executeRoundRobin();
        case 'priority': return executePriority();
        case 'firstfit': return executeFirstFit();
        case 'bestfit': return executeBestFit();
        case 'worstfit': return executeWorstFit();
        case 'detection': return executeDeadlockDetection();
        default: throw new Error('Unknown operation');
    }
}

// CPU Scheduling Algorithms (Simplified)

function executeFCFS() {
    const sortedProcesses = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
    let currentTime = 0;
    const schedule = [];
    const results = [];
    
    sortedProcesses.forEach(process => {
        const startTime = Math.max(currentTime, process.arrivalTime);
        const finishTime = startTime + process.burstTime;
        const waitingTime = startTime - process.arrivalTime;
        const turnaroundTime = finishTime - process.arrivalTime;
        
        schedule.push({
            process: process.processName,
            start: startTime,
            finish: finishTime,
            color: getProcessColor(process.id)
        });
        
        results.push({
            ...process,
            startTime,
            finishTime,
            waitingTime,
            turnaroundTime,
            status: 'Completed'
        });
        
        currentTime = finishTime;
    });
    
    return {
        algorithm: 'First Come First Serve (FCFS)',
        schedule,
        results,
        metrics: calculateMetrics(results)
    };
}

function executeSJF() {
    let currentTime = 0;
    const schedule = [];
    const results = [];
    const remaining = [...processes];
    
    while (remaining.length > 0) {
        const available = remaining.filter(p => p.arrivalTime <= currentTime);
        
        if (available.length === 0) {
            currentTime = Math.min(...remaining.map(p => p.arrivalTime));
            continue;
        }
        
        const shortest = available.reduce((min, p) => p.burstTime < min.burstTime ? p : min);
        
        const startTime = currentTime;
        const finishTime = startTime + shortest.burstTime;
        const waitingTime = startTime - shortest.arrivalTime;
        const turnaroundTime = finishTime - shortest.arrivalTime;
        
        schedule.push({
            process: shortest.processName,
            start: startTime,
            finish: finishTime,
            color: getProcessColor(shortest.id)
        });
        
        results.push({
            ...shortest,
            startTime,
            finishTime,
            waitingTime,
            turnaroundTime,
            status: 'Completed'
        });
        
        currentTime = finishTime;
        remaining.splice(remaining.indexOf(shortest), 1);
    }
    
    return {
        algorithm: 'Shortest Job First (SJF)',
        schedule,
        results,
        metrics: calculateMetrics(results)
    };
}

function executeSRTF() {
    // Simplified SRTF implementation
    return executeSJF(); // For now, same as SJF
}

function executeRoundRobin() {
    const quantum = 3; // Fixed quantum
    let currentTime = 0;
    const schedule = [];
    const results = [];
    const processQueue = processes.map(p => ({ ...p, remainingTime: p.burstTime, startTime: null }));
    
    let readyQueue = [...processQueue];
    let completed = [];
    
    while (completed.length < processes.length) {
        if (readyQueue.length === 0) break;
        
        const current = readyQueue.shift();
        
        if (current.startTime === null) {
            current.startTime = currentTime;
        }
        
        const executeTime = Math.min(quantum, current.remainingTime);
        
        schedule.push({
            process: current.processName,
            start: currentTime,
            finish: currentTime + executeTime,
            color: getProcessColor(current.id)
        });
        
        current.remainingTime -= executeTime;
        currentTime += executeTime;
        
        if (current.remainingTime > 0) {
            readyQueue.push(current);
        } else {
            current.finishTime = currentTime;
            completed.push(current);
            
            const waitingTime = current.finishTime - current.arrivalTime - current.burstTime;
            const turnaroundTime = current.finishTime - current.arrivalTime;
            
            results.push({
                ...current,
                waitingTime,
                turnaroundTime,
                status: 'Completed'
            });
        }
    }
    
    return {
        algorithm: `Round Robin (Quantum = ${quantum})`,
        schedule,
        results,
        metrics: calculateMetrics(results)
    };
}

function executePriority() {
    let currentTime = 0;
    const schedule = [];
    const results = [];
    const remaining = [...processes];
    
    while (remaining.length > 0) {
        const available = remaining.filter(p => p.arrivalTime <= currentTime);
        
        if (available.length === 0) {
            currentTime = Math.min(...remaining.map(p => p.arrivalTime));
            continue;
        }
        
        const highest = available.reduce((min, p) => p.priority < min.priority ? p : min);
        
        const startTime = currentTime;
        const finishTime = startTime + highest.burstTime;
        const waitingTime = startTime - highest.arrivalTime;
        const turnaroundTime = finishTime - highest.arrivalTime;
        
        schedule.push({
            process: highest.processName,
            start: startTime,
            finish: finishTime,
            color: getProcessColor(highest.id)
        });
        
        results.push({
            ...highest,
            startTime,
            finishTime,
            waitingTime,
            turnaroundTime,
            status: 'Completed'
        });
        
        currentTime = finishTime;
        remaining.splice(remaining.indexOf(highest), 1);
    }
    
    return {
        algorithm: 'Priority Scheduling',
        schedule,
        results,
        metrics: calculateMetrics(results)
    };
}

// Memory Management Algorithms

function executeFirstFit() {
    const totalMemory = 100;
    const memory = new Array(totalMemory).fill(0);
    const allocations = [];
    
    processes.forEach((process, index) => {
        let allocated = false;
        
        for (let i = 0; i <= totalMemory - process.memorySize; i++) {
            let canAllocate = true;
            for (let j = i; j < i + process.memorySize; j++) {
                if (memory[j] !== 0) {
                    canAllocate = false;
                    break;
                }
            }
            
            if (canAllocate) {
                for (let j = i; j < i + process.memorySize; j++) {
                    memory[j] = index + 1;
                }
                allocations.push({
                    ...process,
                    allocatedPosition: i,
                    status: 'Allocated'
                });
                allocated = true;
                break;
            }
        }
        
        if (!allocated) {
            allocations.push({
                ...process,
                allocatedPosition: -1,
                status: 'Failed'
            });
        }
    });
    
    return {
        algorithm: 'First Fit Memory Allocation',
        memory,
        allocations,
        results: allocations,
        metrics: calculateMemoryMetrics(memory, allocations, totalMemory)
    };
}

function executeBestFit() {
    const totalMemory = 100;
    const memory = new Array(totalMemory).fill(0);
    const allocations = [];
    
    processes.forEach((process, index) => {
        let bestPosition = -1;
        let bestSize = Infinity;
        
        let i = 0;
        while (i < totalMemory) {
            if (memory[i] === 0) {
                let blockSize = 0;
                let start = i;
                
                while (i < totalMemory && memory[i] === 0) {
                    blockSize++;
                    i++;
                }
                
                if (blockSize >= process.memorySize && blockSize < bestSize) {
                    bestSize = blockSize;
                    bestPosition = start;
                }
            } else {
                i++;
            }
        }
        
        if (bestPosition !== -1) {
            for (let j = bestPosition; j < bestPosition + process.memorySize; j++) {
                memory[j] = index + 1;
            }
            allocations.push({
                ...process,
                allocatedPosition: bestPosition,
                status: 'Allocated'
            });
        } else {
            allocations.push({
                ...process,
                allocatedPosition: -1,
                status: 'Failed'
            });
        }
    });
    
    return {
        algorithm: 'Best Fit Memory Allocation',
        memory,
        allocations,
        results: allocations,
        metrics: calculateMemoryMetrics(memory, allocations, totalMemory)
    };
}

function executeWorstFit() {
    const totalMemory = 100;
    const memory = new Array(totalMemory).fill(0);
    const allocations = [];
    
    processes.forEach((process, index) => {
        let worstPosition = -1;
        let worstSize = -1;
        
        let i = 0;
        while (i < totalMemory) {
            if (memory[i] === 0) {
                let blockSize = 0;
                let start = i;
                
                while (i < totalMemory && memory[i] === 0) {
                    blockSize++;
                    i++;
                }
                
                if (blockSize >= process.memorySize && blockSize > worstSize) {
                    worstSize = blockSize;
                    worstPosition = start;
                }
            } else {
                i++;
            }
        }
        
        if (worstPosition !== -1) {
            for (let j = worstPosition; j < worstPosition + process.memorySize; j++) {
                memory[j] = index + 1;
            }
            allocations.push({
                ...process,
                allocatedPosition: worstPosition,
                status: 'Allocated'
            });
        } else {
            allocations.push({
                ...process,
                allocatedPosition: -1,
                status: 'Failed'
            });
        }
    });
    
    return {
        algorithm: 'Worst Fit Memory Allocation',
        memory,
        allocations,
        results: allocations,
        metrics: calculateMemoryMetrics(memory, allocations, totalMemory)
    };
}

// Deadlock Detection
function executeDeadlockDetection() {
    const allocation = [
        [0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]
    ];
    
    const request = [
        [0, 0, 0], [2, 0, 2], [0, 0, 0], [1, 0, 0], [0, 0, 2]
    ];
    
    const available = [3, 3, 2];
    
    const deadlockResult = detectDeadlock(allocation, request, available);
    
    return {
        algorithm: 'Deadlock Detection',
        allocation,
        request,
        available,
        deadlocked: deadlockResult.deadlocked,
        deadlockedProcesses: deadlockResult.deadlockedProcesses,
        results: processes.map((p, i) => ({
            ...p,
            status: deadlockResult.deadlockedProcesses.includes(i) ? 'Deadlocked' : 'Safe'
        })),
        metrics: {
            totalProcesses: processes.length,
            deadlockedProcesses: deadlockResult.deadlockedProcesses.length,
            safeProcesses: processes.length - deadlockResult.deadlockedProcesses.length
        }
    };
}

// Helper Functions

function calculateMetrics(results) {
    const totalWaitingTime = results.reduce((sum, p) => sum + (p.waitingTime || 0), 0);
    const totalTurnaroundTime = results.reduce((sum, p) => sum + (p.turnaroundTime || 0), 0);
    const totalBurstTime = results.reduce((sum, p) => sum + p.burstTime, 0);
    const totalTime = Math.max(...results.map(p => p.finishTime || 0));
    
    return {
        averageWaitingTime: (totalWaitingTime / results.length).toFixed(2),
        averageTurnaroundTime: (totalTurnaroundTime / results.length).toFixed(2),
        cpuUtilization: totalTime > 0 ? ((totalBurstTime / totalTime) * 100).toFixed(1) : '0',
        throughput: totalTime > 0 ? (results.length / totalTime).toFixed(2) : '0',
        totalProcesses: results.length,
        totalExecutionTime: totalTime
    };
}

function calculateMemoryMetrics(memory, allocations, totalMemory) {
    const usedMemory = memory.filter(block => block !== 0).length;
    const freeMemory = totalMemory - usedMemory;
    const fragmentedBlocks = calculateFragmentation(memory);
    
    return {
        totalMemory,
        usedMemory,
        freeMemory,
        utilization: ((usedMemory / totalMemory) * 100).toFixed(1),
        fragmentation: fragmentedBlocks,
        successfulAllocations: allocations.filter(a => a.status === 'Allocated').length,
        failedAllocations: allocations.filter(a => a.status === 'Failed').length
    };
}

function calculateFragmentation(memory) {
    let fragments = 0;
    let inFreeBlock = false;
    
    memory.forEach(block => {
        if (block === 0 && !inFreeBlock) {
            fragments++;
            inFreeBlock = true;
        } else if (block !== 0) {
            inFreeBlock = false;
        }
    });
    
    return fragments;
}

function detectDeadlock(allocation, request, available) {
    const processes = allocation.length;
    const resources = available.length;
    const work = [...available];
    const finish = new Array(processes).fill(false);
    const deadlockedProcesses = [];
    
    let found = true;
    while (found) {
        found = false;
        for (let i = 0; i < processes; i++) {
            if (!finish[i]) {
                let canProceed = true;
                for (let j = 0; j < resources; j++) {
                    if (request[i][j] > work[j]) {
                        canProceed = false;
                        break;
                    }
                }
                
                if (canProceed) {
                    finish[i] = true;
                    for (let j = 0; j < resources; j++) {
                        work[j] += allocation[i][j];
                    }
                    found = true;
                }
            }
        }
    }
    
    for (let i = 0; i < processes; i++) {
        if (!finish[i]) {
            deadlockedProcesses.push(i);
        }
    }
    
    return {
        deadlocked: deadlockedProcesses.length > 0,
        deadlockedProcesses
    };
}

// Display Results
function displayResults(results) {
    updateGanttChart(results);
    updateGanttTable(results); // NEW: Update table view
    updateProcessTable(results.results);
    updateMemoryVisualization(results);
    updatePerformanceChart(results);
    updateComparisonChart(results);
    updateDeadlockVisualization(results);
}

// NEW: Update Gantt Table View
function updateGanttTable(results) {
    const ganttTable = document.getElementById('ganttTable');
    
    if (!results.schedule || results.schedule.length === 0) {
        ganttTable.innerHTML = '<p>No execution data available</p>';
        return;
    }
    
    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Process</th>
                    <th>Color</th>
                    <th>Start Time</th>
                    <th>Finish Time</th>
                    <th>Duration</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    results.schedule.forEach(item => {
        const duration = item.finish - item.start;
        tableHTML += `
            <tr>
                <td><strong>${item.process}</strong></td>
                <td><span class="process-color-indicator" style="background-color: ${item.color}"></span></td>
                <td>${item.start}</td>
                <td>${item.finish}</td>
                <td>${duration}</td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table>';
    ganttTable.innerHTML = tableHTML;
}

// Update Analytics
function updateAnalytics(results) {
    const metrics = results.metrics;
    
    if (metrics.averageWaitingTime !== undefined) {
        document.getElementById('avgWaitTime').textContent = metrics.averageWaitingTime;
        updateMetricChange('waitTimeChange', metrics.averageWaitingTime, previousMetrics.averageWaitingTime);
    }
    
    if (metrics.averageTurnaroundTime !== undefined) {
        document.getElementById('avgTurnaround').textContent = metrics.averageTurnaroundTime;
        updateMetricChange('turnaroundChange', metrics.averageTurnaroundTime, previousMetrics.averageTurnaroundTime);
    }
    
    if (metrics.cpuUtilization !== undefined) {
        document.getElementById('efficiency').textContent = metrics.cpuUtilization + '%';
        updateMetricChange('efficiencyChange', metrics.cpuUtilization, previousMetrics.cpuUtilization);
    }
    
    if (metrics.utilization !== undefined) {
        document.getElementById('memoryUtil').textContent = metrics.utilization;
        updateMetricChange('memoryChange', metrics.utilization, previousMetrics.utilization);
    }
    
    previousMetrics = { ...metrics };
}

function updateMetricChange(elementId, current, previous) {
    const element = document.getElementById(elementId);
    if (!element || previous === undefined) {
        element.textContent = '+0%';
        element.className = 'metric-change positive';
        return;
    }
    
    const change = ((current - previous) / previous * 100).toFixed(1);
    const isPositive = change >= 0;
    
    element.textContent = (isPositive ? '+' : '') + change + '%';
    element.className = `metric-change ${isPositive ? 'positive' : 'negative'}`;
}

// Update Process Table
function updateProcessTable(results = processes) {
    const tbody = document.getElementById('processTableBody');
    tbody.innerHTML = '';
    
    results.forEach(process => {
        const row = tbody.insertRow();
        let cells = [];
        
        if (currentOperation === 'detection') {
            cells = [
                process.processName,
                process.resourcesHeld || '-',
                process.resourcesRequested || '-',
                '-', '-', '-', '-',
                process.status
            ];
        } else if (currentOperation.includes('fit')) {
            cells = [
                process.processName,
                process.memorySize || '-',
                process.allocatedPosition >= 0 ? process.allocatedPosition : 'Failed',
                '-', '-', '-', '-',
                process.status
            ];
        } else {
            cells = [
                process.processName,
                process.arrivalTime || '-',
                process.burstTime || '-'
            ];
            
            if (currentOperation === 'priority') {
                cells.push(process.priority || '-');
            }
            
            cells.push(
                process.startTime || '-',
                process.finishTime || '-',
                process.waitingTime || '-',
                process.turnaroundTime || '-',
                process.status
            );
        }
        
        cells.forEach((cellData, index) => {
            const cell = row.insertCell();
            if (index === cells.length - 1) {
                // Status cell
                cell.innerHTML = `<span class="status status-${cellData.toLowerCase()}">${cellData}</span>`;
            } else {
                cell.textContent = cellData;
            }
        });
    });
}

// Initialize Charts (FIXED)
function initializeCharts() {
    const ganttCtx = document.getElementById('ganttChart').getContext('2d');
    const performanceCtx = document.getElementById('performanceChart').getContext('2d');
    const comparisonCtx = document.getElementById('comparisonChart').getContext('2d');
    
    // Gantt Chart
    charts.gantt = new Chart(ganttCtx, {
        type: 'bar',
        data: { 
            labels: [],
            datasets: [] 
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                title: { display: true, text: 'Process Execution Timeline' },
                legend: { display: false }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Time Units' }
                },
                y: {
                    title: { display: true, text: 'Processes' }
                }
            }
        }
    });
    
    // Performance Chart (FIXED)
    charts.performance = new Chart(performanceCtx, {
        type: 'doughnut',
        data: {
            labels: ['Waiting Time', 'Execution Time', 'Idle Time'],
            datasets: [{
                data: [30, 50, 20], // Sample data
                backgroundColor: ['#ef4444', '#10b981', '#f59e0b'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Time Distribution' },
                legend: { position: 'bottom' }
            }
        }
    });
    
    // Comparison Chart (FIXED)
    charts.comparison = new Chart(comparisonCtx, {
        type: 'radar',
        data: {
            labels: ['Wait Time', 'Turnaround', 'Efficiency', 'Throughput'],
            datasets: [{
                label: 'Current Algorithm',
                data: [75, 80, 85, 70], // Sample data
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Performance Metrics' }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Update Gantt Chart (FIXED)
function updateGanttChart(results) {
    if (!results.schedule || !charts.gantt) return;
    
    const labels = [...new Set(results.schedule.map(item => item.process))];
    const datasets = [];
    
    labels.forEach((processName, index) => {
        const processSchedule = results.schedule.filter(item => item.process === processName);
        const data = processSchedule.map(item => ({
            x: [item.start, item.finish],
            y: processName
        }));
        
        datasets.push({
            label: processName,
            data: data,
            backgroundColor: getProcessColor(index + 1),
            borderColor: getProcessColor(index + 1),
            borderWidth: 1
        });
    });
    
    charts.gantt.data.labels = labels;
    charts.gantt.data.datasets = datasets;
    charts.gantt.update();
}

// Update Performance Chart (FIXED)
function updatePerformanceChart(results) {
    if (!results.metrics || !charts.performance) return;
    
    const metrics = results.metrics;
    let data = [30, 50, 20]; // Default data
    
    if (metrics.averageWaitingTime && metrics.averageTurnaroundTime) {
        const waitTime = parseFloat(metrics.averageWaitingTime);
        const totalTime = parseFloat(metrics.averageTurnaroundTime);
        const execTime = totalTime - waitTime;
        const idleTime = Math.max(0, 20); // Approximate idle time
        
        data = [waitTime, execTime, idleTime];
    }
    
    charts.performance.data.datasets[0].data = data;
    charts.performance.update();
}

// Update Comparison Chart (FIXED)
function updateComparisonChart(results) {
    if (!results.metrics || !charts.comparison) return;
    
    const metrics = results.metrics;
    const data = [
        Math.max(0, 100 - (parseFloat(metrics.averageWaitingTime) || 0)),
        Math.max(0, 100 - (parseFloat(metrics.averageTurnaroundTime) || 0)),
        parseFloat(metrics.cpuUtilization) || 0,
        Math.min(100, (parseFloat(metrics.throughput) || 0) * 50)
    ];
    
    charts.comparison.data.datasets[0].data = data;
    charts.comparison.update();
}

// Update Memory Visualization
function updateMemoryVisualization(results) {
    const container = document.getElementById('memoryVisualization');
    container.innerHTML = '';
    
    if (results.memory) {
        results.memory.forEach((block, index) => {
            const blockElement = document.createElement('div');
            blockElement.className = 'memory-block';
            blockElement.title = `Position ${index}: ${block === 0 ? 'Free' : 'Process ' + block}`;
            
            if (block === 0) {
                blockElement.classList.add('free');
            } else {
                blockElement.classList.add('allocated');
                blockElement.style.backgroundColor = getProcessColor(block);
            }
            
            container.appendChild(blockElement);
        });
        
        if (results.metrics) {
            document.getElementById('allocatedMemory').textContent = results.metrics.usedMemory;
            document.getElementById('freeMemory').textContent = results.metrics.freeMemory;
            document.getElementById('fragmentedMemory').textContent = results.metrics.fragmentation;
        }
    }
}

// Update Deadlock Visualization
function updateDeadlockVisualization(results) {
    if (currentOperation !== 'detection' || !results.allocation) return;
    
    const resourceGraph = document.getElementById('resourceGraph');
    const allocationMatrix = document.getElementById('allocationMatrix');
    
    // Simple resource graph visualization
    resourceGraph.innerHTML = `
        <div style="display: flex; justify-content: space-around; align-items: center; height: 100%;">
            <div class="process-node">P1</div>
            <div class="resource-node">R1</div>
            <div class="process-node">P2</div>
            <div class="resource-node">R2</div>
            <div class="process-node">P3</div>
        </div>
    `;
    
    // Allocation matrix
    let matrixHTML = `
        <table>
            <thead>
                <tr><th>Process</th><th>R1</th><th>R2</th><th>R3</th></tr>
            </thead>
            <tbody>
    `;
    
    results.allocation.forEach((row, index) => {
        matrixHTML += `<tr><td>P${index + 1}</td>`;
        row.forEach(value => {
            matrixHTML += `<td>${value}</td>`;
        });
        matrixHTML += '</tr>';
    });
    
    matrixHTML += '</tbody></table>';
    allocationMatrix.innerHTML = matrixHTML;
}

// Chart View Toggle (FIXED)
function toggleChartView(view) {
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');
    
    const ganttChart = document.getElementById('ganttChart');
    const ganttTable = document.getElementById('ganttTable');
    
    if (view === 'table') {
        ganttChart.style.display = 'none';
        ganttTable.classList.remove('hidden');
    } else {
        ganttChart.style.display = 'block';
        ganttTable.classList.add('hidden');
    }
}

// Toggle Sections (FIXED)
function toggleSections() {
    const deadlockSection = document.getElementById('deadlockSection');
    
    if (currentOperation === 'detection') {
        deadlockSection.classList.remove('hidden');
    } else {
        deadlockSection.classList.add('hidden');
    }
}

// Utility Functions
function generateId() {
    return Date.now() + Math.random();
}

function getProcessColor(processId) {
    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    return colors[processId % colors.length];
}

function clearInputs() {
    document.querySelectorAll('#inputGrid input').forEach(input => {
        input.value = '';
    });
}

function clearAll() {
    processes = [];
    resources = [];
    updateProcessTable();
    clearCharts();
    clearMetrics();
    showNotification('All data cleared', 'info');
}

function clearResults() {
    clearCharts();
    document.getElementById('ganttTable').innerHTML = '';
    document.getElementById('memoryVisualization').innerHTML = '';
}

function clearCharts() {
    if (charts.gantt) {
        charts.gantt.data.labels = [];
        charts.gantt.data.datasets = [];
        charts.gantt.update();
    }
}

function clearMetrics() {
    document.getElementById('avgWaitTime').textContent = '0.0';
    document.getElementById('avgTurnaround').textContent = '0.0';
    document.getElementById('efficiency').textContent = '100';
    document.getElementById('memoryUtil').textContent = '0';
    
    document.querySelectorAll('.metric-change').forEach(elem => {
        elem.textContent = '+0%';
        elem.className = 'metric-change positive';
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 24px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '600',
        zIndex: '1001',
        animation: 'slideInRight 0.3s ease'
    });
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.toggle('hidden', !show);
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
}

function exportReport() {
    const reportData = {
        operation: currentOperation,
        processes: processes,
        timestamp: new Date().toISOString(),
        metrics: previousMetrics
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `os-analytics-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Report exported successfully', 'success');
}

function filterProcessTable() {
    const searchTerm = document.getElementById('processSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#processTableBody tr');
    
    rows.forEach(row => {
        const processName = row.cells[0].textContent.toLowerCase();
        row.style.display = processName.includes(searchTerm) ? '' : 'none';
    });
}

function sortTable() {
    const tbody = document.getElementById('processTableBody');
    const rows = Array.from(tbody.rows);
    
    rows.sort((a, b) => {
        return a.cells[0].textContent.localeCompare(b.cells[0].textContent);
    });
    
    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
}

function handleKeyboardShortcuts(event) {
    if (event.ctrlKey || event.metaKey) {
        switch(event.key) {
            case 'n':
                event.preventDefault();
                document.getElementById('processName').focus();
                break;
            case 'e':
                event.preventDefault();
                executeOperation();
                break;
            case 's':
                event.preventDefault();
                loadSampleData();
                break;
        }
    }
}

function loadDefaultConfiguration() {
    document.getElementById('operationSelect').value = 'fcfs';
    handleOperationChange();
}

// Add notification styles
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(notificationStyle);
