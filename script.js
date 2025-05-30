// Constantes
const TOTAL_MEMORY = 16 * 1024 * 1024; // 16 MiB en bytes

let memoryManager = null;
let programs = [];
const predefinedPrograms = [
    { name: "Navegador", size: 1024, startTime: 1, endTime: 2 },
    { name: "Editor de Texto", size: 512, startTime: 2, endTime: 3 },
    { name: "Reproductor Multimedia", size: 869, startTime: 1, endTime: 4 },
    { name: "Juego", size: 365, startTime: 4, endTime: 6 },
    { name: "Compilador", size: 1002, startTime: 3, endTime: 5 }
];

// Clase base para administradores de memoria
class MemoryManager {
    constructor(allocationAlgorithm = 'first-fit') {
        this.allocationAlgorithm = allocationAlgorithm;
        this.partitions = [];
        this.initializeMemory();
    }
    
    initializeMemory() {
        // Implementado por subclases
    }
    
    allocate(program) {
        // Implementado por subclases
        return false;
    }
    
    deallocate(programId) {
        // Implementado por subclases
        return false;
    }
    
    compact() {
        // Implementado por subclases que lo necesiten
    }
    
    getMemoryTableData() {
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
        const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', 
                        '#1abc9c', '#d35400', '#34495e', '#7f8c8d', '#27ae60'];
        return colors[programId % colors.length];
    }
    
    updateStats() {
        const totalMemoryKB = TOTAL_MEMORY / 1024;
        const usedMemoryKB = this.partitions
            .filter(p => p.program)
            .reduce((sum, p) => sum + (p.end - p.start + 1) / 1024, 0);
        const freeMemoryKB = totalMemoryKB - usedMemoryKB;
        const fragmentation = this.calculateFragmentation();
        
        const statsElement = document.getElementById('memoryStats');
        statsElement.innerHTML = `
            <p><strong>Memoria total:</strong> ${totalMemoryKB} KB</p>
            <p><strong>Memoria usada:</strong> ${usedMemoryKB} KB (${(usedMemoryKB/totalMemoryKB*100).toFixed(2)}%)</p>
            <p><strong>Memoria libre:</strong> ${freeMemoryKB} KB (${(freeMemoryKB/totalMemoryKB*100).toFixed(2)}%)</p>
            <p><strong>Fragmentación externa:</strong> ${fragmentation.external.toFixed(2)} KB</p>
            <p><strong>Fragmentación interna:</strong> ${fragmentation.internal.toFixed(2)} KB</p>
        `;
    }
    
    calculateFragmentation() {
        let external = 0;
        let internal = 0;
        
        // Fragmentación externa: suma de todos los bloques libres
        external = this.partitions
            .filter(p => !p.program)
            .reduce((sum, p) => sum + (p.end - p.start + 1) / 1024, 0);
        
        // Fragmentación interna (solo para particiones fijas)
        internal = this.partitions
            .filter(p => p.program && p.fixedSize)
            .reduce((sum, p) => sum + (p.fixedSize - p.program.size), 0);
        
        return { external, internal };
    }
    
    updateProgramList() {
        const programList = document.getElementById('programList');
        programList.innerHTML = '';
        
        programs.forEach(program => {
            const programTag = document.createElement('div');
            programTag.className = 'program-tag';
            programTag.style.backgroundColor = this.getProgramColor(program.id);
            
            programTag.innerHTML = `
                <span>${program.name} (${program.size} KB) [Tiempos: ${program.startTime} - ${program.endTime}]</span>
                <button data-id="${program.id}">X</button>
            `;
            
            programTag.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deallocate(program.id);
                programs = programs.filter(p => p.id !== program.id);
                this.updateAll();
            });
            
            programList.appendChild(programTag);
        });

        // Actualizar matriz
        updateProgramTimeMatrix();
    }

    visualizeMemory(time) {
        const visualization = document.getElementById(`memoryVisualization${time}`);
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
            
            if (partition.program && time >= partition.program.startTime && time <= partition.program.endTime) {
                block.style.backgroundColor = this.getProgramColor(partition.program.id);
                block.title = `${partition.program.name} (${partition.program.size} KB)`;
                block.textContent = `${partition.program.name} (${(partition.end - partition.start + 1)/1024} KB)`;
            } else {
                block.style.backgroundColor = '#ddd';
                block.title = `Bloque libre (${(partition.end - partition.start + 1)/1024} KB)`;
                block.textContent = `Libre (${(partition.end - partition.start + 1)/1024} KB)`;
            }
            
            visualization.appendChild(block);
        });
    }

    updateMemoryTable(time) {
        const tableBody = document.querySelector(`#memoryTable${time} tbody`);
        if (!tableBody) return;
        tableBody.innerHTML = '';
        
        const data = this.getMemoryTableData();
        data.forEach(row => {
            const tr = document.createElement('tr');
            
            const startAddr = `0x${row.start.toString(16).padStart(6, '0').toUpperCase()}`;
            const endAddr = `0x${row.end.toString(16).padStart(6, '0').toUpperCase()}`;
            
            let status = row.status;
            let programName = row.program;
            
            // Comprobar si el programa está activo en este tiempo
            const progObj = programs.find(p => p.name === programName);
            if (progObj) {
                if (time >= progObj.startTime && time <= progObj.endTime) {
                    status = "Ocupado";
                } else {
                    status = "Libre";
                    programName = "-";
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

    updateAll() {
        for (let time = 1; time <= 6; time++) {
            this.visualizeMemory(time);
            this.updateMemoryTable(time);
        }
        this.updateStats();
        this.updateProgramList();
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
            alert(`El programa ${program.name} (${sizeKB} KB) es demasiado grande para las particiones de ${this.partitionSizeBytes/1024} KB`);
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
        
        switch (this.allocationAlgorithm) {
            case 'first-fit':
                partitionToAllocate = candidates[0];
                break;
            case 'best-fit':
                candidates.sort((a, b) => (a.end - a.start) - (b.end - b.start));
                partitionToAllocate = candidates[0];
                break;
            case 'worst-fit':
                candidates.sort((a, b) => (b.end - b.start) - (a.end - a.start));
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
        
        let candidates = [];
        
        for (let i = 0; i < this.partitions.length; i++) {
            const partition = this.partitions[i];
            if (!partition.program) {
                const partitionSize = partition.end - partition.start + 1;
                if (partitionSize >= sizeBytes) {
                    candidates.push({index: i, size: partitionSize});
                }
            }
        }
        
        if (candidates.length === 0) {
            alert(`No hay suficiente memoria contigua disponible para ${program.name} (${sizeKB} KB)`);
            return false;
        }
        
        let selectedCandidate = null;
        
        switch (this.allocationAlgorithm) {
            case 'first-fit':
                selectedCandidate = candidates[0];
                break;
            case 'best-fit':
                candidates.sort((a, b) => a.size - b.size);
                selectedCandidate = candidates[0];
                break;
            case 'worst-fit':
                candidates.sort((a, b) => b.size - a.size);
                selectedCandidate = candidates[0];
                break;
        }
        
        if (selectedCandidate) {
            const partitionIndex = selectedCandidate.index;
            const partition = this.partitions[partitionIndex];
            
            if ((partition.end - partition.start + 1) > sizeBytes) {
                const newPartition = {
                    start: partition.start + sizeBytes,
                    end: partition.end,
                    program: null
                };
                
                partition.end = partition.start + sizeBytes - 1;
                partition.program = program;
                
                this.partitions.splice(partitionIndex + 1, 0, newPartition);
            } else {
                partition.program = program;
            }
            
            return true;
        }
        
        return false;
    }
    
    deallocate(programId) {
        const partitionIndex = this.partitions.findIndex(p => p.program && p.program.id === programId);
        if (partitionIndex === -1) return false;
        
        this.partitions[partitionIndex].program = null;
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
                i--;
            }
        }
    }
}

// Particiones dinámicas con compactación
class DynamicCompactMemoryManager extends DynamicMemoryManager {
    constructor(allocationAlgorithm) {
        super(allocationAlgorithm);
    }
    
    allocate(program) {
        const result = super.allocate(program);
        if (!result) {
            this.compact();
            return super.allocate(program);
        }
        return result;
    }
    
    compact() {
        let currentAddress = 0;
        const newPartitions = [];
        
        for (const partition of this.partitions) {
            if (partition.program) {
                const size = partition.end - partition.start + 1;
                newPartitions.push({
                    start: currentAddress,
                    end: currentAddress + size - 1,
                    program: partition.program
                });
                currentAddress += size;
            }
        }
        
        if (currentAddress < TOTAL_MEMORY) {
            newPartitions.push({
                start: currentAddress,
                end: TOTAL_MEMORY - 1,
                program: null
            });
        }
        
        this.partitions = newPartitions;
    }
}

// Funciones principales para interacción y configuración

function addProgram() {
    const size = parseInt(document.getElementById('programSize').value);
    const startTime = parseInt(document.getElementById('startTime').value);
    const endTime = parseInt(document.getElementById('endTime').value);

    if (isNaN(size) || isNaN(startTime) || isNaN(endTime)) return;
    if (startTime < 1 || startTime > 6 || endTime < 1 || endTime > 6 || endTime < startTime) {
        alert("Tiempos inválidos (1-6, y fin >= inicio)");
        return;
    }

    const programId = programs.length > 0 ? Math.max(...programs.map(p => p.id)) + 1 : 1;
    const programName = `Programa ${programId}`;

    const program = {
        id: programId,
        name: programName,
        size: size,
        startTime: startTime,
        endTime: endTime
    };

    if (memoryManager.allocate(program)) {
        programs.push(program);
        memoryManager.updateAll();
    }
}

function addRandomProgram() {
    const randomSize = Math.floor(Math.random() * 4096) + 128;
    const start = Math.floor(Math.random() * 6) + 1;
    const end = Math.floor(Math.random() * 6) + 1;
    const startTime = Math.min(start, end);
    const endTime = Math.max(start, end);

    document.getElementById('programSize').value = randomSize;
    document.getElementById('startTime').value = startTime;
    document.getElementById('endTime').value = endTime;

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
    }

    // Reasignar programas existentes (recalcula las asignaciones)
    const currentPrograms = [...programs];
    programs = [];
    currentPrograms.forEach(program => {
        memoryManager.allocate(program);
        programs.push(program);
    });

    memoryManager.updateAll();
}

function removeAllPrograms() {
    programs.forEach(program => {
        memoryManager.deallocate(program.id);
    });
    programs = [];
    memoryManager.updateAll();
}

// Inicialización de la página y eventos
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('memoryType').addEventListener('change', function() {
        const type = this.value;
        document.getElementById('fixedParams').style.display = 
            (type === 'fixed') ? 'block' : 'none';
        document.getElementById('variableParams').style.display = 
            (type === 'variable') ? 'block' : 'none';
    });

    document.getElementById('applyConfig').addEventListener('click', applyConfiguration);
    document.getElementById('addProgram').addEventListener('click', addProgram);
    document.getElementById('addRandomProgram').addEventListener('click', addRandomProgram);
    document.getElementById('removeAll').addEventListener('click', removeAllPrograms);

    // Añadir programas predefinidos
    predefinedPrograms.forEach((prog, index) => {
        const program = {
            id: index + 1,
            name: prog.name,
            size: prog.size,
            startTime: prog.startTime || 1,
            endTime: prog.endTime || 6
        };
        programs.push(program);
    });

    applyConfiguration();
});


function updateProgramTimeMatrix() {
    const container = document.getElementById('programTimeMatrix');
    container.innerHTML = ''; // limpiar
    
    if (programs.length === 0) {
        container.textContent = "No hay programas para mostrar.";
        return;
    }
    
    // Crear tabla
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.textAlign = 'center';
    table.style.fontSize = '12px';
    
    // Crear encabezado de columnas (Tiempos 1 a 6)
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const emptyTh = document.createElement('th');
    emptyTh.textContent = "Programa \\ Tiempo";
    emptyTh.style.border = '1px solid #ccc';
    emptyTh.style.padding = '4px';
    headerRow.appendChild(emptyTh);
    
    for (let t = 1; t <= 6; t++) {
        const th = document.createElement('th');
        th.textContent = t;
        th.style.border = '1px solid #ccc';
        th.style.padding = '4px';
        headerRow.appendChild(th);
    }
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Crear cuerpo con filas por programa
    const tbody = document.createElement('tbody');
    
    programs.forEach(prog => {
        const tr = document.createElement('tr');
        
        // Columna nombre programa
        const nameTd = document.createElement('td');
        nameTd.textContent = prog.name;
        nameTd.style.border = '1px solid #ccc';
        nameTd.style.padding = '4px';
        nameTd.style.fontWeight = 'bold';
        nameTd.style.textAlign = 'left';
        tr.appendChild(nameTd);
        
        // Columnas tiempos 1-6
        for (let time = 1; time <= 6; time++) {
            const td = document.createElement('td');
            td.style.border = '1px solid #ccc';
            td.style.padding = '8px';
            
            // Si el programa está activo en este tiempo, coloreamos
            if (time >= prog.startTime && time <= prog.endTime) {
                td.style.backgroundColor = memoryManager.getProgramColor(prog.id);
                td.textContent = '●';  // Puedes cambiar por algo más visual
                td.style.color = '#fff';
            } else {
                td.textContent = '';
            }
            
            tr.appendChild(td);
        }
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
}

