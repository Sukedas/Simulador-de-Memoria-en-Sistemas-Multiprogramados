import { MemoryManager } from './MemoryManager.js';

export class DynamicMemoryManager extends MemoryManager {
    constructor(allocationAlgorithm) {
        super(allocationAlgorithm);
        this.initializeMemory();
    }
    
    initializeMemory() {
        this.partitions = [{
            start: 0,
            end: MemoryManager.TOTAL_MEMORY - 1,
            program: null
        }];
    }
    
    allocate(program) {
        const sizeBytes = program.size * 1024;
        
        let candidates = [];
        
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
            alert(`No hay suficiente memoria contigua disponible para ${program.name} (${program.size} KB)`);
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