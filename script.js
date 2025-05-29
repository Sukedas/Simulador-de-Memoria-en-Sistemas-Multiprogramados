// Constantes
const TOTAL_MEMORY = 16 * 1024 * 1024; // 16 MiB en bytes
const TOTAL_MEMORY_KB = 16 * 1024; // 16 MiB en KB

// Estado global
let memoryManager = null;
let programs = [];
const predefinedPrograms = [
    { name: "Navegador", size: 1024 },
    { name: "Editor de Texto", size: 512 },
    { name: "Reproductor Multimedia", size: 2048 },
    { name: "Juego", size: 4096 },
    { name: "Compilador", size: 1536 }
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
    
    visualizeMemory() {
        const visualization = document.getElementById('memoryVisualization');
        visualization.innerHTML = '';
        
        this.partitions.forEach(partition => {
            const block = document.createElement('div');
            block.className = 'memory-block';
            
            const startPercent = (partition.start / TOTAL_MEMORY) * 100;
            const endPercent = (partition.end / TOTAL_MEMORY) * 100;
            const heightPercent = endPercent - startPercent;
            
            block.style.bottom = `${startPercent}%`;
            block.style.height = `${heightPercent}%`;
            
            if (partition.program) {
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
            <p><strong>Fragmentación externa:</strong> ${fragmentation.external} KB</p>
            <p><strong>Fragmentación interna:</strong> ${fragmentation.internal} KB</p>
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
    
    updateMemoryTable() {
        const tableBody = document.querySelector('#memoryTable tbody');
        tableBody.innerHTML = '';
        
        const data = this.getMemoryTableData();
        data.forEach(row => {
            const tr = document.createElement('tr');
            
            const startAddr = `0x${row.start.toString(16).padStart(6, '0').toUpperCase()}`;
            const endAddr = `0x${row.end.toString(16).padStart(6, '0').toUpperCase()}`;
            
            tr.innerHTML = `
                <td>${startAddr}</td>
                <td>${endAddr}</td>
                <td>${row.size}</td>
                <td>${row.status}</td>
                <td>${row.program}</td>
            `;
            
            tableBody.appendChild(tr);
        });
    }
    
    updateAll() {
        this.visualizeMemory();
        this.updateStats();
        this.updateMemoryTable();
        this.updateProgramList();
    }
    
    updateProgramList() {
        const programList = document.getElementById('programList');
        programList.innerHTML = '';
        
        programs.forEach(program => {
            const programTag = document.createElement('div');
            programTag.className = 'program-tag';
            programTag.style.backgroundColor = this.getProgramColor(program.id);
            
            programTag.innerHTML = `
                <span>${program.name} (${program.size} KB)</span>
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
                partitionToAllocate = this.partitions.find(p => !p.program);
                break;
            case 'best-fit':
                // En tamaño fijo, todos los bloques son iguales
                partitionToAllocate = this.partitions.find(p => !p.program);
                break;
            case 'worst-fit':
                // En tamaño fijo, todos los bloques son iguales
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
        
        let candidates = [];
        
        // Buscar todos los huecos que puedan alojar el programa
        for (let i = 0; i < this.partitions.length; i++) {
            const partition = this.partitions[i];
            if (!partition.program) {
                const partitionSize = partition.end - partition.start + 1;
                if (partitionSize >= sizeBytes) {
                    candidates.push({
                        index: i,
                        size: partitionSize
                    });
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
            
            // Dividir la partición si hay espacio sobrante
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
                // Usar toda la partición si encaja perfectamente
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
        
        // Fusionar con particiones adyacentes libres
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
                i--; // Revisar nuevamente esta posición
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
            // Intentar compactación y luego asignar
            this.compact();
            return super.allocate(program);
        }
        return result;
    }
    
    compact() {
        // Mover todos los programas al inicio de la memoria
        let currentAddress = 0;
        const newPartitions = [];
        let freeSpaceStart = null;
        
        // Primero, agregar todos los programas ocupados
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
        
        // Luego agregar el espacio libre restante como una sola partición
        if (currentAddress < TOTAL_MEMORY - 1) {
            newPartitions.push({
                start: currentAddress,
                end: TOTAL_MEMORY - 1,
                program: null
            });
        }
        
        this.partitions = newPartitions;
    }
}

// Funciones de inicialización y control
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
    
    // Reasignar los programas existentes
    const currentPrograms = [...programs];
    programs = [];
    
    currentPrograms.forEach(program => {
        memoryManager.allocate(program);
        programs.push(program);
    });
    
    memoryManager.updateAll();
}

function addProgram() {
    const size = parseInt(document.getElementById('programSize').value);
    if (isNaN(size)) return;
    
    const programId = programs.length > 0 ? Math.max(...programs.map(p => p.id)) + 1 : 1;
    const programName = `Programa ${programId}`;
    
    const program = {
        id: programId,
        name: programName,
        size: size
    };
    
    if (memoryManager.allocate(program)) {
        programs.push(program);
        memoryManager.updateAll();
    }
}

function addRandomProgram() {
    const randomSize = Math.floor(Math.random() * 4096) + 128; // Entre 128 KB y 4224 KB
    document.getElementById('programSize').value = randomSize;
    addProgram();
}

function addPredefinedPrograms() {
    predefinedPrograms.forEach((prog, index) => {
        const program = {
            id: index + 1,
            name: prog.name,
            size: prog.size
        };
        programs.push(program);
    });
}

function removeAllPrograms() {
    programs.forEach(program => {
        memoryManager.deallocate(program.id);
    });
    programs = [];
    memoryManager.updateAll();
}

// Inicialización de la página
document.addEventListener('DOMContentLoaded', function() {
    // Configurar eventos de los controles
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
    
    // Agregar programas predefinidos
    addPredefinedPrograms();
    
    // Aplicar configuración inicial
    applyConfiguration();
});

// Probando GIT