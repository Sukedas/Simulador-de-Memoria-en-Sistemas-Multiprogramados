// Constantes
const TOTAL_MEMORY = 16 * 1024 * 1024; // 16 MiB en bytes
const MAX_TIME = 6;
const PROGRAM_COLORS = [
    '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', 
    '#1abc9c', '#d35400', '#34495e', '#7f8c8d', '#27ae60'
];

// Proceso del Sistema Operativo (permanente)
const OS_PROCESS = {
    id: "OS",
    name: "Sistema Operativo",
    size: 1024, // 1 MB
    color: "#2c3e50",
    activeTimes: [1,2,3,4,5,6],
    permanent: true
};

// Variables globales
let memoryManager = null;
let programs = [OS_PROCESS]; // Incluye el SO por defecto
let applications = [];
let processes = [OS_PROCESS]; // Incluye el SO por defecto
let currentTime = 1;
let memorySnapshots = {};
let nextAppId = 1;

// Funciones utilitarias
function generateRandomColor() {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Clase base para administradores de memoria
class MemoryManager {
    constructor(allocationAlgorithm = 'first-fit') {
        this.allocationAlgorithm = allocationAlgorithm;
        this.partitions = [];
    }
    
    initializeMemory() {}
    allocate(program) { return false; }
    deallocate(programId) { return false; }
    compact() {}
    
    getMemoryTableData(time) {
        return this.partitions.map(partition => {
            return {
                start: partition.start,
                end: partition.end,
                size: (partition.end - partition.start + 1) / 1024,
                status: partition.program ? "Ocupado" : "Libre",
                program: partition.program ? partition.program.name : "-"
            };
        });
    }
    
    getProgramColor(programId) {
        return PROGRAM_COLORS[programId % PROGRAM_COLORS.length];
    }
    
    updateStats(time) {
        const totalMemoryKB = TOTAL_MEMORY / 1024;
        const usedMemoryKB = this.partitions
            .filter(p => p.program)
            .reduce((sum, p) => sum + (p.end - p.start + 1) / 1024, 0);
        const freeMemoryKB = totalMemoryKB - usedMemoryKB;
        const fragmentation = this.calculateFragmentation(time);
        
        // Actualizar elementos del DOM
        document.getElementById('totalMemory').textContent = `${totalMemoryKB} KB`;
        document.getElementById('usedMemory').textContent = `${usedMemoryKB} KB`;
        document.getElementById('freeMemory').textContent = `${freeMemoryKB} KB`;
        document.getElementById('usedPercent').textContent = `(${(usedMemoryKB/totalMemoryKB*100).toFixed(1)}%)`;
        document.getElementById('freePercent').textContent = `(${(freeMemoryKB/totalMemoryKB*100).toFixed(1)}%)`;
        document.getElementById('fragmentation').textContent = `${fragmentation.external.toFixed(0)}/${fragmentation.internal.toFixed(0)} KB`;
    }
    
    calculateFragmentation(time) {
        let external = 0;
        let internal = 0;
        
        // Fragmentación externa: bloques libres no asignados
        external = this.partitions
            .filter(p => !p.program)
            .reduce((sum, p) => sum + (p.end - p.start + 1) / 1024, 0);
        
        // Fragmentación interna: espacio desperdiciado en particiones ocupadas
        internal = this.partitions
            .filter(p => p.program && p.fixedSize)
            .reduce((sum, p) => sum + (p.fixedSize - p.program.size), 0);
        
        return { external, internal };
    }
    
    updateAppList() {
        const appList = document.getElementById('appList');
        appList.innerHTML = '';
        
        applications.forEach(app => {
            const appItem = document.createElement('div');
            appItem.className = 'app-item';
            
            const colorBox = document.createElement('div');
            colorBox.className = 'app-color';
            colorBox.style.backgroundColor = app.color;
            
            const appInfo = document.createElement('span');
            appInfo.textContent = `${app.name} (${app.size} KB)`;
            
            const appButtons = document.createElement('div');
            appButtons.className = 'app-buttons';
            
            const executeButton = document.createElement('button');
            executeButton.textContent = 'Ejecutar';
            executeButton.addEventListener('click', () => this.executeApplication(app.id));
            
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Eliminar';
            deleteButton.style.backgroundColor = '#e74c3c';
            deleteButton.addEventListener('click', () => this.deleteApplication(app.id));
            
            appButtons.appendChild(executeButton);
            appButtons.appendChild(deleteButton);
            
            appItem.appendChild(colorBox);
            appItem.appendChild(appInfo);
            appItem.appendChild(appButtons);
            
            appList.appendChild(appItem);
        });
    }
    
    updateProcessList() {
        const processList = document.getElementById('processList');
        processList.innerHTML = '<h3>Procesos en Ejecución</h3>';
        
        processes.forEach(process => {
            const processItem = document.createElement('div');
            processItem.className = 'process-item';
            if (process.permanent) {
                processItem.classList.add('os-process');
            }
            
            const colorBox = document.createElement('div');
            colorBox.className = 'app-color';
            colorBox.style.backgroundColor = process.color;
            
            const processInfo = document.createElement('span');
            processInfo.textContent = `${process.name} (${process.size} KB)`;
            
            processItem.appendChild(colorBox);
            processItem.appendChild(processInfo);
            
            if (!process.permanent) {
                const stopButton = document.createElement('button');
                stopButton.textContent = 'Detener';
                stopButton.style.backgroundColor = '#e74c3c';
                stopButton.addEventListener('click', () => this.stopApplication(process.id));
                processItem.appendChild(stopButton);
            }
            
            processList.appendChild(processItem);
        });
    }

    visualizeMemory(time) {
        const visualization = document.getElementById('memoryVisualization');
        if (!visualization) return;
        visualization.innerHTML = '';
        
        this.partitions.forEach(partition => {
            const block = document.createElement('div');
            block.className = 'memory-block';
            
            const startPercent = (partition.start / TOTAL_MEMORY) * 100;
            const endPercent = (partition.end / TOTAL_MEMORY) * 100;
            const heightPercent = endPercent - startPercent;
            
            block.style.bottom = `${startPercent}%`;
            block.style.height = `${heightPercent}%`;
            
            // Verificar si el programa está activo en este tiempo
            const isActive = partition.program && partition.program.activeTimes.includes(time);
            
            if (partition.program) {
                block.style.backgroundColor = partition.program.color || this.getProgramColor(partition.program.id);
                block.title = `${partition.program.name} (${partition.program.size} KB)`;
                block.textContent = `${partition.program.name} (${(partition.end - partition.start + 1)/1024} KB)`;
            } else {
                block.style.backgroundColor = '#ecf0f1';
                block.style.color = '#7f8c8d';
                const sizeKB = (partition.end - partition.start + 1)/1024;
                block.title = `Bloque libre (${sizeKB} KB)`;
                block.textContent = `Libre (${sizeKB} KB)`;
            }
            
            visualization.appendChild(block);
        });
    }

    updateMemoryTable(time) {
        const tableBody = document.querySelector('#memoryTable tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        
        const data = this.getMemoryTableData(time);
        data.forEach(row => {
            const tr = document.createElement('tr');
            
            const startAddr = `0x${row.start.toString(16).padStart(6, '0').toUpperCase()}`;
            const endAddr = `0x${row.end.toString(16).padStart(6, '0').toUpperCase()}`;
            
            let status = row.status;
            let programName = row.program;
            
            const progObj = programs.find(p => p.name === programName);
            if (progObj) {
                if (progObj.activeTimes.includes(time)) {
                    status = "Ocupado";
                } else {
                    status = "Inactivo";
                }
            }
            
            tr.innerHTML = `
                <td>${startAddr}</td>
                <td>${endAddr}</td>
                <td>${row.size}</td>
                <td>${status}</td>
                <td>${programName}</td>
            `;
            
            tableBody.appendChild(tr);
        });
    }

    isAllocated(programId) {
        return this.partitions.some(p => p.program && p.program.id === programId);
    }

    // Actualiza todos los tiempos y guarda snapshots
    updateAll() {
        // Limpiar snapshots anteriores
        memorySnapshots = {};
        
        for (let time = 1; time <= MAX_TIME; time++) {
            // 1) Liberar automáticamente los procesos que ya no están activos en este 'time'
            programs
                .filter(p => !p.permanent) // No liberar procesos permanentes
                .forEach(prog => {
                    if (!prog.activeTimes.includes(time) && this.isAllocated(prog.id)) {
                        this.deallocate(prog.id);
                    }
                });

            // 2) Asignar procesos que sí están activos y aún no asignados
            programs.forEach(prog => {
                if (prog.activeTimes.includes(time) && !this.isAllocated(prog.id)) {
                    this.allocate(prog);
                }
            });
            
            // Guardar snapshot del estado actual
            memorySnapshots[time] = JSON.parse(JSON.stringify({
                partitions: this.partitions,
                stats: this.calculateStats(time)
            }));
        }
        
        // Actualizar visualización para el tiempo actual
        this.updateForTime(currentTime);
        
        // Actualizar gráfica de uso de memoria
        updateUsageGraph();
    }
    
    // Actualiza solo para un tiempo específico (usando snapshots)
    updateForTime(time) {
        if (memorySnapshots[time]) {
            // Restaurar desde snapshot
            const snapshot = memorySnapshots[time];
            this.partitions = snapshot.partitions;
            
            // Actualizar UI
            this.visualizeMemory(time);
            this.updateMemoryTable(time);
            this.updateStats(time);
        }
    }
    
    // Calcular estadísticas para un tiempo específico
    calculateStats(time) {
        const totalMemoryKB = TOTAL_MEMORY / 1024;
        const usedMemoryKB = this.partitions
            .filter(p => p.program)
            .reduce((sum, p) => sum + (p.end - p.start + 1) / 1024, 0);
        const freeMemoryKB = totalMemoryKB - usedMemoryKB;
        const fragmentation = this.calculateFragmentation(time);
        
        return {
            totalMemoryKB,
            usedMemoryKB,
            freeMemoryKB,
            fragmentation
        };
    }
    
    // Funciones para gestionar aplicaciones
    addApplication() {
        const name = document.getElementById('appName').value.trim();
        const size = parseInt(document.getElementById('appSize').value);
        
        if (name && !isNaN(size) && size > 0) {
            const isNameUnique = applications.every(app => app.name.toLowerCase() !== name.toLowerCase());
            
            if (isNameUnique) {
                const appId = `A${nextAppId++}`;
                const color = generateRandomColor();
                const app = { id: appId, name, size, color };
                applications.push(app);
                this.updateAppList();
                document.getElementById('appName').value = '';
                document.getElementById('appSize').value = '';
            } else {
                alert("Este nombre de aplicación ya existe, por favor elija un nombre único.");
            }
        } else {
            alert("Ingrese un nombre y tamaño válidos para la aplicación.");
        }
    }
    
    addRandomApplication() {
        const names = ["Editor", "Navegador", "Reproductor", "Juego", "Calculadora", "Antivirus", "Compilador"];
        const randomName = names[Math.floor(Math.random() * names.length)];
        const randomSize = Math.floor(Math.random() * 4096) + 128;
        
        document.getElementById('appName').value = randomName;
        document.getElementById('appSize').value = randomSize;
        this.addApplication();
    }
    
    deleteApplication(appId) {
        // Detener todos los procesos de esta aplicación
        processes.filter(p => p.appId === appId).forEach(p => {
            this.stopApplication(p.id);
        });
        
        // Eliminar la aplicación
        applications = applications.filter(app => app.id !== appId);
        this.updateAppList();
    }
    
    executeApplication(appId) {
        const app = applications.find(a => a.id === appId);
        if (!app) return;
        
        // Crear proceso para esta aplicación
        const processId = `P${processes.length + 1}`;
        const activeTimes = Array.from({length: MAX_TIME}, (_, i) => i + 1); // Activo en todos los tiempos
        
        const process = {
            id: processId,
            appId: app.id,
            name: app.name,
            size: app.size,
            color: app.color,
            activeTimes: activeTimes
        };
        
        programs.push(process);
        processes.push(process);
        
        // Actualizar memoria
        this.updateAll();
        this.updateProcessList();
        updateProgramTimeMatrix();
    }
    
    stopApplication(processId) {
        // No detener procesos permanentes
        const process = processes.find(p => p.id === processId);
        if (process && process.permanent) return;
        
        // Eliminar de programas y procesos
        programs = programs.filter(p => p.id !== processId);
        processes = processes.filter(p => p.id !== processId);
        
        // Liberar memoria
        if (memoryManager) {
            memoryManager.deallocate(processId);
            this.updateAll();
            this.updateProcessList();
            updateProgramTimeMatrix();
        }
    }
    
    removeAllPrograms() {
        // Mantener solo el proceso del SO
        programs = programs.filter(p => p.permanent);
        processes = processes.filter(p => p.permanent);
        
        if (memoryManager) {
            memoryManager.partitions.forEach(partition => {
                if (partition.program && !partition.program.permanent) {
                    partition.program = null;
                }
            });
            this.updateAll();
            this.updateProcessList();
            updateProgramTimeMatrix();
        }
    }
}

// Implementaciones específicas de gestores de memoria
class FixedSizeMemoryManager extends MemoryManager {
    constructor(partitionSizeKB, allocationAlgorithm) {
        super(allocationAlgorithm);
        this.partitionSizeBytes = partitionSizeKB * 1024;
        this.initializeMemory();
    }
    
    initializeMemory() {
        this.partitions = [];
        const numPartitions = Math.floor(TOTAL_MEMORY / this.partitionSizeBytes);
        
        // Reservar la primera partición para el SO
        this.partitions.push({
            start: 0,
            end: OS_PROCESS.size * 1024 - 1,
            fixedSize: this.partitionSizeBytes / 1024,
            program: OS_PROCESS
        });
        
        // Crear el resto de particiones
        for (let i = 1; i < numPartitions; i++) {
            const start = i * this.partitionSizeBytes;
            const end = start + this.partitionSizeBytes - 1;
            
            this.partitions.push({
                start,
                end,
                fixedSize: this.partitionSizeBytes / 1024,
                program: null
            });
        }
    }
    
    allocate(program) {
        const sizeKB = program.size;
        const sizeBytes = sizeKB * 1024;
        
        if (sizeBytes > this.partitionSizeBytes) {
            alert(`El programa ${program.name} (${sizeKB} KB) es demasiado grande para las particiones de ${this.partitionSizeBytes/1024} KB`);
            return false;
        }
        
        let partitionToAllocate = null;
        
        switch (this.allocationAlgorithm) {
            case 'first-fit':
                partitionToAllocate = this.partitions.find(p => !p.program);
                break;
            case 'best-fit':
                partitionToAllocate = this.partitions
                    .filter(p => !p.program)
                    .sort((a, b) => (a.end - a.start) - (b.end - b.start))
                    [0];
                break;
            case 'worst-fit':
                partitionToAllocate = this.partitions
                    .filter(p => !p.program)
                    .sort((a, b) => (b.end - b.start) - (a.end - a.start))
                    [0];
                break;
        }
        
        if (partitionToAllocate) {
            partitionToAllocate.program = program;
            return true;
        }
        
        alert(`No hay suficiente memoria contigua disponible para ${program.name} (${sizeKB} KB)`);
        return false;
    }
    
    deallocate(programId) {
        const partition = this.partitions.find(p => p.program && p.program.id === programId);
        if (partition && !partition.program.permanent) {
            partition.program = null;
            return true;
        }
        return false;
    }
}

class VariableSizeMemoryManager extends MemoryManager {
    constructor(partitionSizesKB, allocationAlgorithm) {
        super(allocationAlgorithm);
        this.partitionSizesKB = partitionSizesKB;
        this.initializeMemory();
    }
    
    initializeMemory() {
        this.partitions = [];
        let currentAddress = 0;
        
        // Reservar espacio para el SO primero
        const osSizeBytes = OS_PROCESS.size * 1024;
        this.partitions.push({
            start: currentAddress,
            end: currentAddress + osSizeBytes - 1,
            program: OS_PROCESS
        });
        currentAddress += osSizeBytes;
        
        // Crear particiones según los tamaños especificados
        for (const sizeKB of this.partitionSizesKB) {
            const sizeBytes = sizeKB * 1024;
            const end = currentAddress + sizeBytes - 1;
            
            if (end >= TOTAL_MEMORY) break;
            
            this.partitions.push({
                start: currentAddress,
                end,
                program: null
            });
            
            currentAddress = end + 1;
        }
        
        // Si queda memoria sin asignar, agregamos una partición adicional
        if (currentAddress < TOTAL_MEMORY - 1) {
            this.partitions.push({
                start: currentAddress,
                end: TOTAL_MEMORY - 1,
                program: null
            });
        }
    }
    
    allocate(program) {
        const sizeKB = program.size;
        const sizeBytes = sizeKB * 1024;
        
        let candidates = this.partitions
            .filter(p => !p.program && (p.end - p.start + 1) >= sizeBytes);
        
        if (candidates.length === 0) {
            alert(`No hay suficiente memoria contigua disponible para ${program.name} (${sizeKB} KB)`);
            return false;
        }
        
        let partitionToAllocate = null;
        
        switch (this.allocationAlgorithm) {
            case 'first-fit':
                partitionToAllocate = candidates[0];
                break;
            case 'best-fit':
                candidates.sort((a, b) => 
                    (a.end - a.start + 1) - (b.end - b.start + 1));
                partitionToAllocate = candidates[0];
                break;
            case 'worst-fit':
                candidates.sort((a, b) => 
                    (b.end - b.start + 1) - (a.end - a.start + 1));
                partitionToAllocate = candidates[0];
                break;
        }
        
        if (partitionToAllocate) {
            partitionToAllocate.program = program;
            return true;
        }
        
        return false;
    }
    
    deallocate(programId) {
        const partition = this.partitions.find(p => p.program && p.program.id === programId);
        if (partition && !partition.program.permanent) {
            partition.program = null;
            return true;
        }
        return false;
    }
}

class DynamicMemoryManager extends MemoryManager {
    constructor(allocationAlgorithm) {
        super(allocationAlgorithm);
        this.initializeMemory();
    }

    initializeMemory() {
        // Reservar espacio para el SO primero
        const osSizeBytes = OS_PROCESS.size * 1024;
        this.partitions = [{
            start: 0,
            end: osSizeBytes - 1,
            program: OS_PROCESS
        }, {
            start: osSizeBytes,
            end: TOTAL_MEMORY - 1,
            program: null
        }];
    }

    allocate(program) {
        const sizeKB = program.size;
        const sizeBytes = sizeKB * 1024;

        // Filtrar particiones libres suficientemente grandes
        let freePartitions = this.partitions
            .map((p, index) => ({ ...p, index }))
            .filter(p => !p.program && (p.end - p.start + 1) >= sizeBytes);

        if (freePartitions.length === 0) {
            alert(`No hay suficiente memoria contigua para ${program.name} (${sizeKB} KB)`);
            return false;
        }

        // Ordenar según algoritmo de asignación
        switch (this.allocationAlgorithm) {
            case 'best-fit':
                freePartitions.sort((a, b) => (a.end - a.start) - (b.end - b.start));
                break;
            case 'worst-fit':
                freePartitions.sort((a, b) => (b.end - b.start) - (a.end - a.start));
                break;
            // En first-fit no se ordena, ya vienen en orden
        }

        const selected = freePartitions[0];
        const partition = this.partitions[selected.index];

        // Dividir partición si sobra espacio
        const originalEnd = partition.end;
        const allocatedEnd = partition.start + sizeBytes - 1;

        partition.end = allocatedEnd;
        partition.program = program;

        if (allocatedEnd < originalEnd) {
            const newPartition = {
                start: allocatedEnd + 1,
                end: originalEnd,
                program: null
            };
            this.partitions.splice(selected.index + 1, 0, newPartition);
        }

        return true;
    }

    deallocate(programId) {
        const index = this.partitions.findIndex(p => p.program && p.program.id === programId);
        if (index === -1 || this.partitions[index].program.permanent) return false;

        this.partitions[index].program = null;
        this.mergeAdjacentFreePartitions();
        return true;
    }

    mergeAdjacentFreePartitions() {
        for (let i = 0; i < this.partitions.length - 1; i++) {
            const current = this.partitions[i];
            const next = this.partitions[i + 1];

            if (!current.program && !next.program) {
                current.end = next.end;
                this.partitions.splice(i + 1, 1);
                i--; // Retrocede para volver a verificar con el siguiente
            }
        }
    }
}

class DynamicCompactMemoryManager extends MemoryManager {
    constructor(allocationAlgorithm) {
        super(allocationAlgorithm);
        this.initializeMemory();
    }

    initializeMemory() {
        // Reservar espacio para el SO primero
        const osSizeBytes = OS_PROCESS.size * 1024;
        this.partitions = [{
            start: 0,
            end: osSizeBytes - 1,
            program: OS_PROCESS
        }];
    }

    allocate(program) {
        const sizeBytes = program.size * 1024;
        const usedBytes = this.partitions.reduce((acc, p) => acc + (p.end - p.start + 1), 0);
        const freeBytes = TOTAL_MEMORY - usedBytes;

        if (freeBytes < sizeBytes) {
            alert(`No hay suficiente memoria para ${program.name} (${program.size} KB)`);
            return false;
        }

        const start = usedBytes;
        const end = start + sizeBytes - 1;

        this.partitions.push({
            start,
            end,
            program
        });

        return true;
    }

    deallocate(programId) {
        const index = this.partitions.findIndex(p => p.program && p.program.id === programId);
        if (index === -1 || this.partitions[index].program.permanent) return false;

        this.partitions.splice(index, 1); // Elimina el programa

        this.compactMemory(); // Reordena los programas hacia el inicio
        return true;
    }

    compactMemory() {
        let currentStart = 0;
        for (const p of this.partitions) {
            const size = p.end - p.start + 1;
            p.start = currentStart;
            p.end = currentStart + size - 1;
            currentStart += size;
        }
    }

    isAllocated(programId) {
        return this.partitions.some(p => p.program && p.program.id === programId);
    }
}

// Funciones de visualización
function updateProgramTimeMatrix() {
    const container = document.getElementById('programTimeMatrix');
    container.innerHTML = ''; 
    
    if (programs.length === 0) {
        container.textContent = "No hay programas para mostrar.";
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'matrix-table';
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.textAlign = 'center';
    table.style.fontSize = '12px';
    
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const emptyTh = document.createElement('th');
    emptyTh.textContent = "Programa \\ Tiempo";
    emptyTh.style.border = '1px solid #ccc';
    emptyTh.style.padding = '4px';
    headerRow.appendChild(emptyTh);
    
    for (let t = 1; t <= MAX_TIME; t++) {
        const th = document.createElement('th');
        th.textContent = t;
        th.style.border = '1px solid #ccc';
        th.style.padding = '4px';
        headerRow.appendChild(th);
    }
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    
    programs.forEach(prog => {
        const tr = document.createElement('tr');
        
        const nameTd = document.createElement('td');
        nameTd.textContent = prog.name;
        nameTd.style.border = '1px solid #ccc';
        nameTd.style.padding = '4px';
        nameTd.style.fontWeight = 'bold';
        nameTd.style.textAlign = 'left';
        tr.appendChild(nameTd);
        
        for (let time = 1; time <= MAX_TIME; time++) {
            const td = document.createElement('td');
            td.style.border = '1px solid #ccc';
            td.style.padding = '8px';
            
            if (prog.activeTimes.includes(time)) {
                td.style.backgroundColor = prog.color;
                td.textContent = '●';
                td.style.color = '#fff';
                td.title = `Activo (Tamaño: ${prog.size} KB)`;
            } else {
                td.textContent = '○';
                td.style.color = '#ddd';
            }
            
            tr.appendChild(td);
        }
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
}

function changeTime(newTime) {
    if (newTime < 1) newTime = 1;
    if (newTime > MAX_TIME) newTime = MAX_TIME;
    
    currentTime = newTime;
    document.getElementById('timeSlider').value = currentTime;
    document.getElementById('currentTime').textContent = currentTime;
    
    if (memoryManager) {
        memoryManager.updateForTime(currentTime);
    }
}

function updateUsageGraph() {
    const graphContainer = document.getElementById('usageGraph');
    const graphContent = document.getElementById('graphContent');
    const graphGrid = document.getElementById('graphGrid');
    const graphLegend = document.getElementById('graphLegend');
    
    // Limpiar contenido anterior
    graphContent.innerHTML = '';
    graphGrid.innerHTML = '';
    graphLegend.innerHTML = '';
    
    // Dimensiones del canvas
    const width = graphContainer.offsetWidth;
    const height = graphContainer.offsetHeight;
    const margin = { top: 30, right: 20, bottom: 50, left: 50 };
    const graphWidth = width - margin.left - margin.right;
    const graphHeight = height - margin.top - margin.bottom;
    
    // Crear cuadrícula
    for (let i = 0; i <= 5; i++) {
        const yPos = margin.top + (i * (graphHeight / 5));
        
        const gridLine = document.createElement('div');
        gridLine.className = 'graph-grid-line horizontal';
        gridLine.style.top = `${yPos}px`;
        graphGrid.appendChild(gridLine);
        
        const label = document.createElement('div');
        label.className = 'graph-labels y-axis';
        label.style.top = `${yPos}px`;
        label.textContent = `${Math.round(16384 * (1 - i/5))} KB`;
        graphContainer.appendChild(label);
    }
    
    for (let i = 0; i <= MAX_TIME; i++) {
        const xPos = margin.left + (i * (graphWidth / MAX_TIME));
        
        const gridLine = document.createElement('div');
        gridLine.className = 'graph-grid-line vertical';
        gridLine.style.left = `${xPos}px`;
        graphGrid.appendChild(gridLine);
        
        const label = document.createElement('div');
        label.className = 'graph-labels x-axis';
        label.style.left = `${xPos}px`;
        label.textContent = `T${i}`;
        graphContainer.appendChild(label);
    }
    
    // Crear leyenda
    programs.forEach((program, index) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        
        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = program.color;
        
        const name = document.createElement('span');
        name.textContent = program.name;
        
        legendItem.appendChild(colorBox);
        legendItem.appendChild(name);
        graphLegend.appendChild(legendItem);
    });
    
    // Crear barras de memoria para cada tiempo
    for (let time = 1; time <= MAX_TIME; time++) {
        if (!memorySnapshots[time]) continue;
        
        const timePartitions = memorySnapshots[time].partitions;
        const xPos = margin.left + ((time - 1) * (graphWidth / MAX_TIME)) + 10;
        const barWidth = (graphWidth / MAX_TIME) - 20;
        
        // Calcular la memoria usada por cada programa en este tiempo
        const programUsage = {};
        
        timePartitions.forEach(partition => {
            if (partition.program && partition.program.activeTimes.includes(time)) {
                const programId = partition.program.id;
                const sizeKB = (partition.end - partition.start + 1) / 1024;
                
                if (!programUsage[programId]) {
                    programUsage[programId] = {
                        size: 0,
                        program: partition.program
                    };
                }
                
                programUsage[programId].size += sizeKB;
            }
        });
        
        // Dibujar barras para cada programa
        let currentY = margin.top + graphHeight;
        
        Object.values(programUsage).forEach(usage => {
            const program = usage.program;
            const programHeight = (usage.size / 16384) * graphHeight;
            
            const bar = document.createElement('div');
            bar.className = 'memory-bar';
            bar.style.left = `${xPos}px`;
            bar.style.width = `${barWidth}px`;
            bar.style.height = `${programHeight}px`;
            bar.style.backgroundColor = program.color;
            bar.style.bottom = `${height - currentY}px`;
            
            // Tooltip para mostrar detalles
            const tooltip = document.createElement('div');
            tooltip.className = 'memory-tooltip';
            tooltip.textContent = `${program.name}: ${usage.size.toFixed(0)} KB`;
            
            bar.addEventListener('mouseenter', () => {
                tooltip.style.opacity = '1';
                tooltip.style.left = `${xPos + barWidth/2}px`;
                tooltip.style.top = `${currentY - programHeight - 30}px`;
            });
            
            bar.addEventListener('mousemove', (e) => {
                tooltip.style.left = `${e.clientX - graphContainer.getBoundingClientRect().left + 10}px`;
                tooltip.style.top = `${e.clientY - graphContainer.getBoundingClientRect().top - 30}px`;
            });
            
            bar.addEventListener('mouseleave', () => {
                tooltip.style.opacity = '0';
            });
            
            graphContent.appendChild(bar);
            graphContent.appendChild(tooltip);
            
            currentY -= programHeight;
        });
    }
    
    // Línea de memoria total
    const totalLine = document.createElement('div');
    totalLine.className = 'graph-line';
    totalLine.style.bottom = `${margin.top}px`;
    totalLine.style.left = `${margin.left}px`;
    totalLine.style.width = `${graphWidth}px`;
    graphContent.appendChild(totalLine);
    
    // Etiqueta para memoria total
    const totalLabel = document.createElement('div');
    totalLabel.className = 'graph-labels';
    totalLabel.textContent = 'Memoria Total (16 MiB)';
    totalLabel.style.bottom = `${margin.top - 10}px`;
    totalLabel.style.left = `${margin.left + graphWidth - 100}px`;
    totalLabel.style.color = '#e74c3c';
    totalLabel.style.fontWeight = 'bold';
    graphContent.appendChild(totalLabel);
}

// Funciones de configuración
function applyConfiguration() {
    const memoryType = document.getElementById('memoryType').value;
    const algorithm = document.getElementById('allocationAlgorithm').value;

    switch (memoryType) {
        case 'fixed':
            const partitionSize = parseInt(document.getElementById('partitionSize').value);
            memoryManager = new FixedSizeMemoryManager(partitionSize, algorithm);
            break;
        case 'variable':
            const partitionSizes = document.getElementById('partitionSizes').value
                .split(',')
                .map(s => parseInt(s.trim()));
            memoryManager = new VariableSizeMemoryManager(partitionSizes, algorithm);
            break;
        case 'dynamic':
            memoryManager = new DynamicMemoryManager(algorithm);
            break;
        case 'dynamic-compact':
            memoryManager = new DynamicCompactMemoryManager(algorithm);
            break;
    }

    // Reasignar programas existentes
    const currentPrograms = [...programs];
    programs = [OS_PROCESS]; // Siempre incluir el SO
    processes = [OS_PROCESS]; // Siempre incluir el SO
    currentPrograms
        .filter(p => !p.permanent) // Mantener solo aplicaciones no permanentes
        .forEach(program => {
            memoryManager.allocate(program);
            programs.push(program);
            processes.push(program);
        });

    memoryManager.updateAll();
    memoryManager.updateAppList();
    memoryManager.updateProcessList();
}

function toggleAlgorithmTypeVisibility() {
    const memoryType = document.getElementById('memoryType').value;
    const algorithmType = document.getElementById('algorithmType');
  
    if (memoryType === "fixed") {
        document.getElementById('fixedParams').style.display = 'block';
        document.getElementById('variableParams').style.display = 'none';
    } else if (memoryType === "variable") {
        document.getElementById('fixedParams').style.display = 'none';
        document.getElementById('variableParams').style.display = 'block';
    } else {
        document.getElementById('fixedParams').style.display = 'none';
        document.getElementById('variableParams').style.display = 'none';
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Configurar listeners
    document.getElementById('memoryType').addEventListener('change', toggleAlgorithmTypeVisibility);
    document.getElementById('applyConfig').addEventListener('click', applyConfiguration);
    document.getElementById('addApp').addEventListener('click', function() {
        if (memoryManager) memoryManager.addApplication();
    });
    document.getElementById('addRandomApp').addEventListener('click', function() {
        if (memoryManager) memoryManager.addRandomApplication();
    });
    document.getElementById('removeAll').addEventListener('click', function() {
        if (memoryManager) memoryManager.removeAllPrograms();
    });
    
    // Control de tiempo
    document.getElementById('timeSlider').addEventListener('input', function() {
        changeTime(parseInt(this.value));
    });
    
    document.getElementById('prevTime').addEventListener('click', function() {
        changeTime(currentTime - 1);
    });
    
    document.getElementById('nextTime').addEventListener('click', function() {
        changeTime(currentTime + 1);
    });

    // Aplicar configuración inicial
    memoryManager = new MemoryManager();
    applyConfiguration();
    
    // Agregar algunas aplicaciones iniciales
    const initialApps = [
        {id: 'A1', name: 'Editor', size: 512, color: generateRandomColor()},
        {id: 'A2', name: 'Navegador', size: 2048, color: generateRandomColor()},
        {id: 'A3', name: 'Reproductor', size: 896, color: generateRandomColor()}
    ];
    
    applications = initialApps;
    memoryManager.updateAppList();
});