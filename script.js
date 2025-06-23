// Constantes
const TOTAL_MEMORY = 16 * 1024 * 1024; // 16 MiB en bytes
let MAX_TIME = 0; // irá creciendo dinámicamente
const PROGRAM_COLORS = [
    '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', 
    '#1abc9c', '#d35400', '#34495e', '#7f8c8d', '#27ae60'
];

let pendingPrograms = []; // cola de espera
let queuedProgramIds = []; // IDs de programas que están en cola

let memoryManager = null;
let programs = [];
let currentTime = 0;
let memorySnapshots = {};
const predefinedPrograms = [
    { name: "O.S", size: 1024, protected: true },
    { name: "Editor de Texto", size: 512 },
    { name: "Juego", size: 2328 },
    { name: "Reproductor", size: 896 },
    { name: "Compilador", size: 536 }
];

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
            .filter(p => p.program && p.program.activeTimes.includes(time))
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
    
    updateProgramList() {
        const programList = document.getElementById('programList');
        programList.innerHTML = '';
    
        programs.forEach(program => {
            const tag = document.createElement('div');
            tag.className = 'program-tag';
            tag.style.backgroundColor = this.getProgramColor(program.id);
    
            const isQueued = queuedProgramIds.includes(program.id);
    
            tag.innerHTML = `<span>${program.name} (${program.size} KB)</span>`;

            if (!program.protected) {
                const queueButton = document.createElement('button');
                queueButton.className = 'btn-queue';
                queueButton.textContent = isQueued ? '✔️ En Cola' : '➕ A Cola';
                queueButton.addEventListener('click', () => {
                    if (!isQueued) {
                        queuedProgramIds.push(program.id);
                        memoryManager.updateProgramList();
                    }
                });
                tag.appendChild(queueButton);

                const deleteButton = document.createElement('button');
                deleteButton.className = 'btn-delete';
                deleteButton.textContent = '🗑️';
                deleteButton.addEventListener('click', () => {
                    memoryManager.deallocate(program.id);
                    programs = programs.filter(p => p.id !== program.id);
                    queuedProgramIds = queuedProgramIds.filter(id => id !== program.id);
                    memoryManager.updateProgramList();
                    memoryManager.updateAll();
                });
                tag.appendChild(deleteButton);
            }
    
            programList.appendChild(tag);
        });
    
        updateProgramTimeMatrix();
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
            
            if (partition.program && isActive) {
                block.style.backgroundColor = this.getProgramColor(partition.program.id);
                block.title = `${partition.program.name} (${partition.program.size} KB)`;
                block.textContent = `${partition.program.name} (${(partition.end - partition.start + 1)/1024} KB)`;
            } else {
                block.style.backgroundColor = partition.program ? '#95a5a6' : '#ecf0f1';
                block.style.color = partition.program ? 'white' : '#7f8c8d';
                const sizeKB = (partition.end - partition.start + 1)/1024;
                block.title = partition.program ? 
                    `Programa inactivo: ${partition.program.name} (${sizeKB} KB)` : 
                    `Bloque libre (${sizeKB} KB)`;
                block.textContent = partition.program ? `(${partition.program.name})` : `Libre (${sizeKB} KB)`;
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
            programs.forEach(prog => {
                if (!prog.activeTimes.includes(time) && this.isAllocated(prog.id)) {
                    this.deallocate(prog.id);
                }
            });
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
        let usedMemoryKB = 0;
        if (this.frames) {
            // Si es paginación, contar marcos ocupados
            usedMemoryKB = this.frames.filter(f => f).length * this.pageSizeKB;
        } else {
            usedMemoryKB = this.partitions
                .filter(p => p.program && p.program.activeTimes.includes(time))
                .reduce((sum, p) => sum + (p.end - p.start + 1) / 1024, 0);
        }
        const freeMemoryKB = totalMemoryKB - usedMemoryKB;
        // Fragmentación interna: suma de espacio desperdiciado en la última página de cada programa activo
        let internal = 0;
        if (this.frames) {
            for (const pid in this.pageTables) {
                const prog = programs.find(p => p.id == pid);
                if (!prog || !prog.activeTimes.includes(time)) continue;
                const numPages = Math.ceil(prog.size / this.pageSizeKB);
                const lastPageSize = prog.size % this.pageSizeKB;
                if (lastPageSize > 0) {
                    internal += this.pageSizeKB - lastPageSize;
                }
            }
        }
        const fragmentation = { external: 0, internal };
        return {
            totalMemoryKB,
            usedMemoryKB,
            freeMemoryKB,
            fragmentation
        };
    }
}

// Particiones estáticas de tamaño fijo
class FixedSizeMemoryManager extends MemoryManager {
    constructor(partitionSizeKB, allocationAlgorithm) {
        super(allocationAlgorithm);
        this.partitionSizeBytes = partitionSizeKB * 1024;
        this.initializeMemory();
    }
    
    initializeMemory() {
        this.partitions = [];
        const numPartitions = Math.floor(TOTAL_MEMORY / this.partitionSizeBytes);
        
        for (let i = 0; i < numPartitions; i++) {
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
            return false;
        }
        
        let partitionToAllocate = null;
        
        switch (this.allocationAlgorithm) {
            case 'first-fit':
            case 'best-fit':
            case 'worst-fit':
                partitionToAllocate = this.partitions.find(p => !p.program);
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
        if (partition) {
            partition.program = null;
            return true;
        }
        return false;
    }
}

// Particiones estáticas de tamaño variable
class VariableSizeMemoryManager extends MemoryManager {
    constructor(partitionSizesKB, allocationAlgorithm) {
        super(allocationAlgorithm);
        this.partitionSizesKB = partitionSizesKB;
        this.initializeMemory();
    }
    
    initializeMemory() {
        this.partitions = [];
        let currentAddress = 0;
        
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

        // Si es el OS, siempre asignar a la primera partición libre adecuada
        if (program.name === "O.S") {
            partitionToAllocate = candidates[0];
        } else {
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
        }

        if (partitionToAllocate) {
            partitionToAllocate.program = program;
            return true;
        }

        return false;
    }
    
    deallocate(programId) {
        const partition = this.partitions.find(p => p.program && p.program.id === programId);
        if (partition) {
            partition.program = null;
            return true;
        }
        return false;
    }
}

// Particiones dinámicas sin compactación
class DynamicMemoryManager extends MemoryManager {
    constructor(allocationAlgorithm) {
        super(allocationAlgorithm);
        this.initializeMemory();
    }

    initializeMemory() {
        this.partitions = [{
            start: 0,
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
        if (index === -1) return false;

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

// Particiones dinámicas con compactación
class DynamicCompactMemoryManager extends MemoryManager {
    constructor(allocationAlgorithm) {
        super(allocationAlgorithm);
        this.initializeMemory();
    }

    initializeMemory() {
        this.partitions = []; // Solo programas cargados, la memoria libre está implícita al final
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
        if (index === -1) return false;

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

// Clase para administración de memoria por paginación
class PagingMemoryManager extends MemoryManager {
    constructor(pageSizeKB = 4) {
        super('paging');
        this.pageSizeKB = pageSizeKB;
        this.pageSizeBytes = pageSizeKB * 1024;
        this.numFrames = Math.floor(TOTAL_MEMORY / this.pageSizeBytes);
        this.frames = Array(this.numFrames).fill(null); // Cada frame puede estar libre o tener { programId, page }
        this.pageTables = {}; // { programId: [frameIndex, ...] }
        this.initializeMemory();
    }

    initializeMemory() {
        this.frames = Array(this.numFrames).fill(null);
        this.pageTables = {};
        this.partitions = [];
    }

    allocate(program) {
        const numPages = Math.ceil((program.size) / this.pageSizeKB);
        let freeFrames = [];
        for (let i = 0; i < this.frames.length; i++) {
            if (!this.frames[i]) freeFrames.push(i);
        }
        if (freeFrames.length < numPages) {
            alert(`No hay suficientes marcos de página libres para ${program.name}`);
            return false;
        }
        this.pageTables[program.id] = [];
        for (let p = 0; p < numPages; p++) {
            const frame = freeFrames[p];
            this.frames[frame] = { programId: program.id, page: p };
            this.pageTables[program.id].push(frame);
        }
        return true;
    }

    deallocate(programId) {
        if (!this.pageTables[programId]) return false;
        for (const frame of this.pageTables[programId]) {
            this.frames[frame] = null;
        }
        delete this.pageTables[programId];
        return true;
    }

    getMemoryTableData(time) {
        // Para compatibilidad con la tabla de memoria
        let data = [];
        for (let i = 0; i < this.frames.length; i++) {
            const frame = this.frames[i];
            let programName = '-';
            let status = 'Libre';
            if (frame) {
                const prog = programs.find(p => p.id === frame.programId);
                if (prog && prog.activeTimes.includes(time)) {
                    programName = prog.name + ` (Página ${frame.page})`;
                    status = 'Ocupado';
                } else if (prog) {
                    programName = prog.name + ` (Página ${frame.page})`;
                    status = 'Inactivo';
                }
            }
            data.push({
                start: i * this.pageSizeBytes,
                end: (i + 1) * this.pageSizeBytes - 1,
                size: this.pageSizeBytes / 1024,
                status,
                program: programName
            });
        }
        return data;
    }

    updateAll() {
        // Limpiar frames y tablas
        this.initializeMemory();
        for (let time = 1; time <= MAX_TIME; time++) {
            // Asignar marcos a los programas activos en este tiempo
            programs.forEach(prog => {
                if (prog.activeTimes.includes(time)) {
                    this.allocate(prog);
                } else {
                    this.deallocate(prog.id);
                }
            });
            // Guardar snapshot
            memorySnapshots[time] = JSON.parse(JSON.stringify({
                frames: this.frames,
                pageTables: this.pageTables,
                stats: this.calculateStats(time)
            }));
        }
        this.updateForTime(currentTime);
        updateUsageGraph();
        this.updatePagingPanel();
    }

    updateForTime(time) {
        if (memorySnapshots[time]) {
            const snapshot = memorySnapshots[time];
            this.frames = snapshot.frames;
            this.pageTables = snapshot.pageTables;
            this.visualizeMemory(time);
            this.updateMemoryTable(time);
            this.updateStats(time);
            this.updatePagingPanel();
        }
    }

    updatePagingPanel() {
        const panel = document.getElementById('pagingPanel');
        if (!panel) return;
        if (document.getElementById('memoryType').value !== 'paging') {
            panel.style.display = 'none';
            return;
        }
        panel.style.display = '';
        // Mostrar marcos de página en cuadrícula
        const framesStatus = document.getElementById('framesStatus');
        framesStatus.innerHTML = '<b>Marcos de Página:</b>';
        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(8, 1fr)';
        grid.style.gap = '6px';
        for (let i = 0; i < this.frames.length; i++) {
            const frame = this.frames[i];
            const cell = document.createElement('div');
            cell.style.border = '1px solid #ccc';
            cell.style.borderRadius = '8px';
            cell.style.padding = '6px 2px';
            cell.style.background = frame ? this.getProgramColor(frame.programId) : '#ecf0f1';
            cell.style.color = frame ? '#fff' : '#888';
            cell.style.fontWeight = 'bold';
            cell.style.fontSize = '13px';
            cell.style.textAlign = 'center';
            cell.title = frame ? `P${frame.programId} (Página ${frame.page})` : 'Libre';
            cell.innerHTML = `<span style="font-size:11px;">${i.toString(16).toUpperCase().padStart(2,'0')}</span><br>${frame ? `P${frame.programId}<br>Pág. ${frame.page}` : 'Libre'}`;
            grid.appendChild(cell);
        }
        framesStatus.appendChild(grid);
        // Mostrar tablas de páginas con mejor estilo
        const pageTablesDiv = document.getElementById('pageTables');
        pageTablesDiv.innerHTML = '';
        for (const pid in this.pageTables) {
            const prog = programs.find(p => p.id == pid);
            if (!prog) continue;
            const tableDiv = document.createElement('div');
            tableDiv.className = 'segment-table';
            tableDiv.style.background = '#f9f9f9';
            tableDiv.style.marginBottom = '12px';
            tableDiv.style.minWidth = '180px';
            tableDiv.style.display = 'inline-block';
            tableDiv.style.verticalAlign = 'top';
            tableDiv.style.border = '1px solid #ddd';
            tableDiv.style.borderRadius = '8px';
            tableDiv.style.padding = '10px';
            const header = document.createElement('h3');
            header.textContent = `${prog.name} - Tabla de Páginas`;
            header.style.marginTop = '0';
            header.style.fontSize = '15px';
            header.style.color = '#2c3e50';
            header.style.borderBottom = '1px solid #ddd';
            header.style.paddingBottom = '5px';
            tableDiv.appendChild(header);
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            const thead = document.createElement('thead');
            thead.innerHTML = '<tr><th style="background:#ffe600;color:#222;border-radius:6px 6px 0 0;">Página</th><th style="background:#ffe600;color:#222;border-radius:6px 6px 0 0;">Marco</th></tr>';
            table.appendChild(thead);
            const tbody = document.createElement('tbody');
            this.pageTables[pid].forEach((frame, page) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td style="padding:6px 4px;">${page}</td><td style="padding:6px 4px;">${frame.toString(16).toUpperCase().padStart(2,'0')}</td>`;
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            tableDiv.appendChild(table);
            pageTablesDiv.appendChild(tableDiv);
        }
    }
}

// Clase para Segmentación
class SegmentationMemoryManager extends MemoryManager {
    constructor(allocationAlgorithm = 'first-fit') {
        super(allocationAlgorithm);
        this.segments = []; // Lista de segmentos en memoria física
        this.segmentTables = {}; // Tabla de segmentos por programa
        this.initializeMemory();
    }

    initializeMemory() {
        this.segments = [{
            start: 0,
            end: TOTAL_MEMORY - 1,
            program: null
        }];
        this.segmentTables = {};
    }

    allocate(program) {
        // Para simular segmentos, dividimos el programa en segmentos lógicos
        const segments = this.splitProgramIntoSegments(program);
        let allocatedSegments = [];

        // Intentar asignar cada segmento
        for (const segment of segments) {
            const sizeBytes = segment.size * 1024;
            let freeSegments = this.segments
                .map((seg, idx) => ({ ...seg, idx }))
                .filter(seg => !seg.program && (seg.end - seg.start + 1) >= sizeBytes);

            if (freeSegments.length === 0) {
                alert(`No hay suficiente memoria para el segmento de ${program.name}`);
                // Liberar segmentos ya asignados
                allocatedSegments.forEach(seg => this.deallocateSegment(seg));
                return false;
            }

            // Seleccionar segmento según algoritmo
            let selected = null;
            switch (this.allocationAlgorithm) {
                case 'best-fit':
                    freeSegments.sort((a, b) => (a.end - a.start) - (b.end - b.start));
                    selected = freeSegments[0];
                    break;
                case 'worst-fit':
                    freeSegments.sort((a, b) => (b.end - b.start) - (a.end - a.start));
                    selected = freeSegments[0];
                    break;
                default: // first-fit
                    selected = freeSegments[0];
                    break;
            }

            const segIdx = selected.idx;
            const seg = this.segments[segIdx];
            const allocatedEnd = seg.start + sizeBytes - 1;

            // Crear nuevo segmento asignado
            const allocatedSegment = {
                start: seg.start,
                end: allocatedEnd,
                program: program,
                segmentName: segment.name
            };

            // Actualizar el segmento libre original
            if (allocatedEnd < seg.end) {
                seg.start = allocatedEnd + 1;
            } else {
                // Eliminar el segmento libre si se usó completamente
                this.segments.splice(segIdx, 1);
            }

            // Insertar el nuevo segmento asignado
            this.segments.splice(segIdx, 0, allocatedSegment);
            allocatedSegments.push(allocatedSegment);
        }

        // Registrar en tabla de segmentos
        this.segmentTables[program.id] = allocatedSegments.map(seg => ({
            name: seg.segmentName,
            base: seg.start,
            limit: seg.end - seg.start + 1,
            sizeKB: (seg.end - seg.start + 1) / 1024
        }));

        return true;
    }

    deallocate(programId) {
        // Liberar todos los segmentos del programa
        for (let i = 0; i < this.segments.length; i++) {
            if (this.segments[i].program && this.segments[i].program.id === programId) {
                // Convertir a segmento libre
                this.segments[i].program = null;
                this.segments[i].segmentName = null;
            }
        }

        // Fusionar segmentos libres adyacentes
        this.mergeAdjacentFreeSegments();

        // Eliminar tabla de segmentos
        delete this.segmentTables[programId];

        return true;
    }

    splitProgramIntoSegments(program) {
        // Simular diferentes tipos de segmentos para el programa
        const segmentTypes = [
            { name: "Código", percentage: 0.4 },
            { name: "Datos", percentage: 0.3 },
            { name: "Pila", percentage: 0.2 },
            { name: "Heap", percentage: 0.1 }
        ];

        let segments = [];
        let remaining = program.size;

        for (let i = 0; i < segmentTypes.length; i++) {
            let size = 0;
            if (i === segmentTypes.length - 1) {
                size = remaining; // El último segmento toma el resto
            } else {
                size = Math.round(program.size * segmentTypes[i].percentage);
                remaining -= size;
            }

            if (size > 0) {
                segments.push({
                    name: `${program.name} - ${segmentTypes[i].name}`,
                    size: size
                });
            }
        }

        return segments;
    }

    mergeAdjacentFreeSegments() {
        for (let i = 0; i < this.segments.length - 1; i++) {
            const current = this.segments[i];
            const next = this.segments[i + 1];

            if (!current.program && !next.program) {
                // Fusionar segmentos libres adyacentes
                current.end = next.end;
                this.segments.splice(i + 1, 1);
                i--; // Revisar el mismo índice de nuevo
            }
        }
    }

    getMemoryTableData(time) {
        return this.segments.map(segment => {
            const sizeKB = (segment.end - segment.start + 1) / 1024;
            let programName = '-';
            let status = 'Libre';
            let segmentName = '-';
            
            if (segment.program) {
                programName = segment.program.name;
                segmentName = segment.segmentName || 'Segmento';
                
                // Verificar si el programa está activo en este tiempo
                if (segment.program.activeTimes.includes(time)) {
                    status = 'Ocupado';
                } else {
                    status = 'Inactivo';
                }
            }
            
            return {
                start: segment.start,
                end: segment.end,
                size: sizeKB,
                status,
                program: programName,
                segment: segmentName
            };
        });
    }

    updateSegmentTables() {
        const panel = document.getElementById('segmentationPanel');
        if (!panel) return;
        
        if (document.getElementById('memoryType').value !== 'segmentation') {
            panel.style.display = 'none';
            return;
        }
        
        panel.style.display = '';
        const segmentTablesDiv = document.getElementById('segmentTables');
        segmentTablesDiv.innerHTML = '';
        
        for (const pid in this.segmentTables) {
            const prog = programs.find(p => p.id == pid);
            if (!prog) continue;
            
            const tableDiv = document.createElement('div');
            tableDiv.className = 'segment-table';
            
            const header = document.createElement('h3');
            header.textContent = `${prog.name} - Tabla de Segmentos`;
            tableDiv.appendChild(header);
            
            this.segmentTables[pid].forEach(segment => {
                const row = document.createElement('div');
                row.className = 'segment-row';
                
                const nameSpan = document.createElement('span');
                nameSpan.className = 'segment-name';
                nameSpan.textContent = segment.name;
                
                const baseSpan = document.createElement('span');
                baseSpan.className = 'segment-address';
                baseSpan.textContent = `0x${segment.base.toString(16).padStart(6, '0').toUpperCase()}`;
                
                const sizeSpan = document.createElement('span');
                sizeSpan.textContent = `${segment.sizeKB.toFixed(1)} KB`;
                
                row.appendChild(nameSpan);
                row.appendChild(baseSpan);
                row.appendChild(sizeSpan);
                
                tableDiv.appendChild(row);
            });
            
            segmentTablesDiv.appendChild(tableDiv);
        }
        
        if (Object.keys(this.segmentTables).length === 0) {
            segmentTablesDiv.innerHTML = '<p>No hay programas cargados con segmentos</p>';
        }
    }

    updateForTime(time) {
        super.updateForTime(time);
        this.updateSegmentTables();
    }
}

// Funciones para interacción

function addProgram() {
    const size = parseInt(document.getElementById('programSize').value);
    if (isNaN(size)) return;

    const id = programs.length > 0 ? Math.max(...programs.map(p => p.id)) + 1 : 1;
    const name = `Programa ${id}`;

    const program = {
        id,
        name,
        size,
        activeTimes: []
    };

    programs.push(program);
    memoryManager.updateProgramList();
}

function addRandomProgram() {
    const randomSize = Math.floor(Math.random() * 4096) + 128;
    document.getElementById('programSize').value = randomSize;
    addProgram();
}

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
        case 'paging':
            const pageSize = parseInt(document.getElementById('pageSize').value);
            memoryManager = new PagingMemoryManager(pageSize);
            break;
        case 'segmentation':
            memoryManager = new SegmentationMemoryManager(algorithm);
            break;
    }

    // Reasignar programas existentes
    const currentPrograms = [...programs];
    programs = [];
    currentPrograms.forEach(program => {
    memoryManager.allocate(program);
    programs.push(program);
    });

    memoryManager.updateAll();
}

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
                td.style.backgroundColor = memoryManager.getProgramColor(prog.id);
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

// Función para actualizar la gráfica de uso de memoria
function updateUsageGraph() {
    const graphContainer = document.getElementById('usageGraph');
    const graphContent = document.getElementById('graphContent');
    const graphGrid = document.getElementById('graphGrid');
    const graphLegend = document.getElementById('graphLegend');
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
    programs.forEach((program, index) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = PROGRAM_COLORS[program.id % PROGRAM_COLORS.length];
        const name = document.createElement('span');
        name.textContent = program.name;
        legendItem.appendChild(colorBox);
        legendItem.appendChild(name);
        graphLegend.appendChild(legendItem);
    });
    for (let time = 1; time <= MAX_TIME; time++) {
        if (!memorySnapshots[time]) continue;
        let timePartitions = memorySnapshots[time].partitions;
        // Soporte para paginación: usar frames si existen
        if (!timePartitions && memorySnapshots[time].frames) {
            // Simular particiones a partir de frames
            timePartitions = memorySnapshots[time].frames.map((frame, idx) => {
                if (!frame) return null;
                const prog = programs.find(p => p.id === frame.programId);
                return prog && prog.activeTimes.includes(time) ? {
                    program: prog,
                    start: idx * (prog && prog.pageSizeBytes ? prog.pageSizeBytes : 4096),
                    end: (idx + 1) * (prog && prog.pageSizeBytes ? prog.pageSizeBytes : 4096) - 1
                } : null;
            }).filter(Boolean);
        }
        const xPos = margin.left + ((time - 1) * (graphWidth / MAX_TIME)) + 10;
        const barWidth = (graphWidth / MAX_TIME) - 20;
        const programUsage = {};
        (timePartitions || []).forEach(partition => {
            if (partition.program && partition.program.activeTimes && partition.program.activeTimes.includes(time)) {
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
        let currentY = margin.top + graphHeight;
        Object.values(programUsage).forEach(usage => {
            const program = usage.program;
            const programHeight = (usage.size / 16384) * graphHeight;
            const bar = document.createElement('div');
            bar.className = 'memory-bar';
            bar.style.left = `${xPos}px`;
            bar.style.width = `${barWidth}px`;
            bar.style.height = `${programHeight}px`;
            bar.style.backgroundColor = PROGRAM_COLORS[program.id % PROGRAM_COLORS.length];
            bar.style.bottom = `${height - currentY}px`;
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
    const totalLine = document.createElement('div');
    totalLine.className = 'graph-line';
    totalLine.style.bottom = `${margin.top}px`;
    totalLine.style.left = `${margin.left}px`;
    totalLine.style.width = `${graphWidth}px`;
    graphContent.appendChild(totalLine);
    const totalLabel = document.createElement('div');
    totalLabel.className = 'graph-labels';
    totalLabel.textContent = 'Memoria Total (16 MiB)';
    totalLabel.style.bottom = `${margin.top - 10}px`;
    totalLabel.style.left = `${margin.left + graphWidth - 100}px`;
    totalLabel.style.color = '#e74c3c';
    totalLabel.style.fontWeight = 'bold';
    graphContent.appendChild(totalLabel);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('memoryType').addEventListener('change', function() {
        const type = this.value;
        document.getElementById('fixedParams').style.display = 
            (type === 'fixed') ? 'block' : 'none';
        document.getElementById('variableParams').style.display = 
            (type === 'variable') ? 'block' : 'none';
        document.getElementById('pagingParams').style.display = 
            (type === 'paging') ? 'block' : 'none';
        document.getElementById('pagingPanel').style.display = 
            (type === 'paging') ? '' : 'none';
        document.getElementById('segmentationPanel').style.display = 
            (type === 'segmentation') ? '' : 'none';
    });

    document.getElementById('applyConfig').addEventListener('click', applyConfiguration);
    document.getElementById('addProgram').addEventListener('click', addProgram);
    document.getElementById('addRandomProgram').addEventListener('click', addRandomProgram);
    document.getElementById('simulateStep').addEventListener('click', simulateStep);
    
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

    // Inicializar con programas predeterminados
    predefinedPrograms.forEach((prog, index) => {
        programs.push({
            id: index + 1,
            name: prog.name,
            size: prog.size,
            activeTimes: [],
            protected: prog.protected || false
        });
    });

    // Aplicar configuración inicial
    applyConfiguration();
    memoryManager.updateProgramList();
});

function simulateStep() {
    if (queuedProgramIds.length === 0) return;

    currentTime++;
    MAX_TIME = currentTime;

    const osProgram = programs.find(p => p.name === "O.S");
    if (osProgram && !osProgram.activeTimes.includes(currentTime)) {
        osProgram.activeTimes.push(currentTime);
        memoryManager.allocate(osProgram);
    }

    const newPrograms = programs.filter(p => queuedProgramIds.includes(p.id));
    newPrograms.forEach(p => {
        p.activeTimes.push(currentTime);
        memoryManager.allocate(p);
    });

    queuedProgramIds = [];
    memoryManager.updateAll();
    memoryManager.updateProgramList();

    document.getElementById('timeSlider').max = MAX_TIME;
    document.getElementById('timeSlider').value = currentTime;
    document.getElementById('currentTime').textContent = currentTime;

    applyConfiguration(); 
}