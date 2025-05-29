import { DynamicMemoryManager } from './DynamicManager.js';

export class DynamicCompactMemoryManager extends DynamicMemoryManager {
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
        
        if (currentAddress < MemoryManager.TOTAL_MEMORY - 1) {
            newPartitions.push({
                start: currentAddress,
                end: MemoryManager.TOTAL_MEMORY - 1,
                program: null
            });
        }
        
        this.partitions = newPartitions;
    }
}