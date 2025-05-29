import { MemoryManager } from './MemoryManager.js';

export class VariableSizeMemoryManager extends MemoryManager {
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
            
            if (end >= MemoryManager.TOTAL_MEMORY) break;
            
            this.partitions.push({
                start: currentAddress,
                end,
                program: null
            });
            
            currentAddress = end + 1;
        }
        
        if (currentAddress < MemoryManager.TOTAL_MEMORY - 1) {
            this.partitions.push({
                start: currentAddress,
                end: MemoryManager.TOTAL_MEMORY - 1,
                program: null
            });
        }
    }
    
    allocate(program) {
        const sizeBytes = program.size * 1024;
        
        let candidates = this.partitions
            .filter(p => !p.program && (p.end - p.start + 1) >= sizeBytes);
        
        if (candidates.length === 0) {
            alert(`No hay suficiente memoria contigua disponible para ${program.name} (${program.size} KB)`);
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