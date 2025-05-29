import { getProgramColor } from '../utils/helpers.js';

export class MemoryManager {
    static TOTAL_MEMORY = 16 * 1024 * 1024; // 16 MiB en bytes
    static TOTAL_MEMORY_KB = 16 * 1024; // 16 MiB en KB

    constructor(allocationAlgorithm = 'first-fit') {
        this.allocationAlgorithm = allocationAlgorithm;
        this.partitions = [];
        this.initializeMemory();
    }
    
    initializeMemory() {
        throw new Error('Método initializeMemory debe ser implementado por subclases');
    }
    
    allocate(program) {
        throw new Error('Método allocate debe ser implementado por subclases');
    }
    
    deallocate(programId) {
        throw new Error('Método deallocate debe ser implementado por subclases');
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
}