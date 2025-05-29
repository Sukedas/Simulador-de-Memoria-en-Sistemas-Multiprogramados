import { FixedSizeMemoryManager } from './FixedSizeManager.js';
import { VariableSizeMemoryManager } from './VariableSizeManager.js';
import { DynamicMemoryManager } from './DynamicManager.js';
import { DynamicCompactMemoryManager } from './DynamicCompactManager.js';

export class MemoryManagerFactory {
    static createManager(type, algorithm, partitionSize, partitionSizes) {
        switch (type) {
            case 'fixed':
                return new FixedSizeMemoryManager(partitionSize, algorithm);
            case 'variable':
                return new VariableSizeMemoryManager(partitionSizes, algorithm);
            case 'dynamic':
                return new DynamicMemoryManager(algorithm);
            case 'dynamic-compact':
                return new DynamicCompactMemoryManager(algorithm);
            default:
                throw new Error(`Tipo de gestor de memoria desconocido: ${type}`);
        }
    }
}