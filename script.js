// Constantes
const TOTAL_MEMORY = 16 * 1024 * 1024; // 16 MiB en bytes

let memoryManager = null;
let programs = [];
const predefinedPrograms = [
    { name: "O.S", size: 1024, activeTimes: [1,2,3,4,5,6] },
    { name: "Editor de Texto", size: 512, activeTimes: [1,2,4,5] },
    { name: "Juego", size: 2328, activeTimes: [2,3,4,5,6] },
    { name: "Reproductor", size: 896, activeTimes: [4,6] },
    { name: "Compilador", size: 536, activeTimes: [3,4] }
];

// Clase base para administradores de memoria
class MemoryManager {
    constructor(allocationAlgorithm = 'first-fit') {
        this.allocationAlgorithm = allocationAlgorithm;
        this.partitions = [];
        // this.initializeMemory();
    }
    
    initializeMemory() {}
    allocate(program) { return false; }
    deallocate(programId) { return false; }
    compact() {}
    
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
        
        external = this.partitions
            .filter(p => !p.program)
            .reduce((sum, p) => sum + (p.end - p.start + 1) / 1024, 0);
        
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
                <span>${program.name} (${program.size} KB) [Tiempos: ${program.activeTimes.join(', ')}]</span>
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
            
            if (partition.program && partition.program.activeTimes.includes(time)) {
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
            
            const progObj = programs.find(p => p.name === programName);
            if (progObj) {
                if (progObj.activeTimes.includes(time)) {
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

    // Nuevo método en MemoryManager para liberar las particiones de los procesos 
    isAllocated(programId) {
    return this.partitions.some(p => p.program && p.program.id === programId);
    }

    // updateAll() {
    //     for (let time = 1; time <= 6; time++) {
    //         this.visualizeMemory(time);
    //         this.updateMemoryTable(time);
    //     }
    //     this.updateStats();
    //     this.updateProgramList();
    // }
    updateAll() {
        for (let time = 1; time <= 6; time++) {
            // 1) Liberar automáticamente los procesos que ya no están activos en este 'time'
            programs.forEach(prog => {
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

            // 3) Renderizar visualización y tabla para este instante
            this.visualizeMemory(time);
            this.updateMemoryTable(time);
        }
        // Actualizar estadísticas y lista de programas
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

    updateAll() {
    for (let time = 1; time <= 6; time++) {
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

        this.visualizeMemory(time);
        this.updateMemoryTable(time);

        // 👇 Segunda pasada para t1 si quedó mal
        if (time === 1) {
            const usedInT1 = programs.filter(p => p.activeTimes.includes(1));
            usedInT1.forEach(p => this.deallocate(p.id));
            usedInT1.forEach(p => this.allocate(p));
            this.visualizeMemory(1);
            this.updateMemoryTable(1);
        }
    }

    this.updateStats();
    this.updateProgramList();
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

    updateAll() {
        for (let time = 1; time <= 6; time++) {
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

            this.visualizeMemory(time);
            this.updateMemoryTable(time);

            if (time === 1) {
                const usedInT1 = programs.filter(p => p.activeTimes.includes(1));
                usedInT1.forEach(p => this.deallocate(p.id));
                usedInT1.forEach(p => this.allocate(p));
                this.visualizeMemory(1);
                this.updateMemoryTable(1);
            }
        }

        this.updateStats();
        this.updateProgramList();
    }
}

// Funciones para interacción

function addProgram() {
    const size = parseInt(document.getElementById('programSize').value);
    const activeTimesInput = document.getElementById('activeTimesInput') 
        ? document.getElementById('activeTimesInput').value : null;

    let activeTimes = [1,2,3,4,5,6]; // predeterminado si no hay input específico

    if (activeTimesInput) {
        activeTimes = activeTimesInput.split(',')
            .map(x => parseInt(x.trim()))
            .filter(x => x >=1 && x <=6);
        if (activeTimes.length === 0) {
            alert("Tiempos inválidos. Deben ser números entre 1 y 6.");
            return;
        }
    }

    if (isNaN(size)) return;

    const programId = programs.length > 0 ? Math.max(...programs.map(p => p.id)) + 1 : 1;
    const programName = `Programa ${programId}`;

    const program = {
        id: programId,
        name: programName,
        size: size,
        activeTimes: activeTimes
    };

    if (memoryManager.allocate(program)) {
        programs.push(program);
        memoryManager.updateAll();
    }
}

function addRandomProgram() {
    const randomSize = Math.floor(Math.random() * 4096) + 128;
    let times = [];
    for (let i = 1; i <= 6; i++) {
        if (Math.random() > 0.5) times.push(i);
    }
    if (times.length === 0) times = [1]; // al menos uno

    document.getElementById('programSize').value = randomSize;
    if (document.getElementById('activeTimesInput')) {
        document.getElementById('activeTimesInput').value = times.join(',');
    }
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

    // Reasignar programas existentes
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

    // Inicializar con programas predeterminados
    predefinedPrograms.forEach((prog, index) => {
        const program = {
            id: index + 1,
            name: prog.name,
            size: prog.size,
            activeTimes: prog.activeTimes || [1,2,3,4,5,6]
        };
        programs.push(program);
    });

    applyConfiguration();
});

// Función para matriz de tiempos y programas (igual que antes)
function updateProgramTimeMatrix() {
    const container = document.getElementById('programTimeMatrix');
    container.innerHTML = ''; 
    
    if (programs.length === 0) {
        container.textContent = "No hay programas para mostrar.";
        return;
    }
    
    const table = document.createElement('table');
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
    
    for (let t = 1; t <= 6; t++) {
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
        
        for (let time = 1; time <= 6; time++) {
            const td = document.createElement('td');
            td.style.border = '1px solid #ccc';
            td.style.padding = '8px';
            
            if (prog.activeTimes.includes(time)) {
                td.style.backgroundColor = memoryManager.getProgramColor(prog.id);
                td.textContent = '●';
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
