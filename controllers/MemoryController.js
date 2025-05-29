import { MemoryManagerFactory } from '../models/MemoryManagerFactory.js';
import { MemoryView } from '../views/MemoryView.js';
import { Program, addPredefinedPrograms } from '../models/Program.js';

export class MemoryController {
    constructor() {
        this.programs = [];
        this.memoryManager = null;
        this.view = new MemoryView(this);
    }

    init() {
        this.setupEventListeners();
        addPredefinedPrograms(this.programs);
        this.applyConfiguration();
    }

    setupEventListeners() {
        document.getElementById('memoryType').addEventListener('change', (e) => {
            this.view.toggleMemoryTypeParams(e.target.value);
        });

        document.getElementById('applyConfig').addEventListener('click', () => {
            this.applyConfiguration();
        });

        document.getElementById('addProgram').addEventListener('click', () => {
            this.addProgram();
        });

        document.getElementById('addRandomProgram').addEventListener('click', () => {
            this.addRandomProgram();
        });

        document.getElementById('removeAll').addEventListener('click', () => {
            this.removeAllPrograms();
        });
    }

    applyConfiguration() {
        const memoryType = document.getElementById('memoryType').value;
        const algorithm = document.getElementById('allocationAlgorithm').value;
        let partitionSize, partitionSizes;

        if (memoryType === 'fixed') {
            partitionSize = parseInt(document.getElementById('partitionSize').value);
        } else if (memoryType === 'variable') {
            partitionSizes = document.getElementById('partitionSizes').value
                .split(',')
                .map(s => parseInt(s.trim()));
        }

        this.memoryManager = MemoryManagerFactory.createManager(
            memoryType, 
            algorithm, 
            partitionSize, 
            partitionSizes
        );

        // Reasignar programas existentes
        const currentPrograms = [...this.programs];
        this.programs = [];
        currentPrograms.forEach(program => {
            this.memoryManager.allocate(program);
            this.programs.push(program);
        });

        this.updateView();
    }

    addProgram() {
        const size = parseInt(document.getElementById('programSize').value);
        if (isNaN(size)) return;

        const programId = this.programs.length > 0 ? Math.max(...this.programs.map(p => p.id)) + 1 : 1;
        const programName = `Programa ${programId}`;

        const program = new Program(programId, programName, size);

        if (this.memoryManager.allocate(program)) {
            this.programs.push(program);
            this.updateView();
        }
    }

    addRandomProgram() {
        const randomSize = Math.floor(Math.random() * 4096) + 128; // Entre 128 KB y 4224 KB
        document.getElementById('programSize').value = randomSize;
        this.addProgram();
    }

    removeAllPrograms() {
        this.programs.forEach(program => {
            this.memoryManager.deallocate(program.id);
        });
        this.programs = [];
        this.updateView();
    }

    removeProgram(programId) {
        this.memoryManager.deallocate(programId);
        this.programs = this.programs.filter(p => p.id !== programId);
        this.updateView();
    }

    updateView() {
        this.view.render(this.memoryManager, this.programs);
    }
}