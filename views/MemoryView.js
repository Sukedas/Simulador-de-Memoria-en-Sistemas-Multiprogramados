import { getProgramColor, formatAddress } from '../utils/helpers.js';

export class MemoryView {
    constructor(controller) {
        this.controller = controller;
    }

    toggleMemoryTypeParams(type) {
        document.getElementById('fixedParams').style.display = 
            (type === 'fixed') ? 'block' : 'none';
        document.getElementById('variableParams').style.display = 
            (type === 'variable') ? 'block' : 'none';
    }

    render(memoryManager, programs) {
        this.renderMemoryVisualization(memoryManager);
        this.renderMemoryStats(memoryManager);
        this.renderMemoryTable(memoryManager);
        this.renderProgramList(programs);
    }

    renderMemoryVisualization(memoryManager) {
        const visualization = document.getElementById('memoryVisualization');
        visualization.innerHTML = '';
        
        memoryManager.partitions.forEach(partition => {
            const block = document.createElement('div');
            block.className = 'memory-block';
            
            const startPercent = (partition.start / memoryManager.TOTAL_MEMORY) * 100;
            const endPercent = (partition.end / memoryManager.TOTAL_MEMORY) * 100;
            const heightPercent = endPercent - startPercent;
            
            block.style.bottom = `${startPercent}%`;
            block.style.height = `${heightPercent}%`;
            
            if (partition.program) {
                block.style.backgroundColor = getProgramColor(partition.program.id);
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

    renderMemoryStats(memoryManager) {
        const totalMemoryKB = memoryManager.TOTAL_MEMORY_KB;
        const usedMemoryKB = memoryManager.partitions
            .filter(p => p.program)
            .reduce((sum, p) => sum + (p.end - p.start + 1) / 1024, 0);
        const freeMemoryKB = totalMemoryKB - usedMemoryKB;
        const fragmentation = memoryManager.calculateFragmentation();
        
        const statsElement = document.getElementById('memoryStats');
        statsElement.innerHTML = `
            <p><strong>Memoria total:</strong> ${totalMemoryKB} KB</p>
            <p><strong>Memoria usada:</strong> ${usedMemoryKB} KB (${(usedMemoryKB/totalMemoryKB*100).toFixed(2)}%)</p>
            <p><strong>Memoria libre:</strong> ${freeMemoryKB} KB (${(freeMemoryKB/totalMemoryKB*100).toFixed(2)}%)</p>
            <p><strong>Fragmentación externa:</strong> ${fragmentation.external} KB</p>
            <p><strong>Fragmentación interna:</strong> ${fragmentation.internal} KB</p>
        `;
    }

    renderMemoryTable(memoryManager) {
        const tableBody = document.querySelector('#memoryTable tbody');
        tableBody.innerHTML = '';
        
        const data = memoryManager.getMemoryTableData();
        data.forEach(row => {
            const tr = document.createElement('tr');
            
            const startAddr = formatAddress(row.start);
            const endAddr = formatAddress(row.end);
            
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

    renderProgramList(programs) {
        const programList = document.getElementById('programList');
        programList.innerHTML = '';
        
        programs.forEach(program => {
            const programTag = document.createElement('div');
            programTag.className = 'program-tag';
            programTag.style.backgroundColor = getProgramColor(program.id);
            
            programTag.innerHTML = `
                <span>${program.name} (${program.size} KB)</span>
                <button data-id="${program.id}">X</button>
            `;
            
            programTag.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                this.controller.removeProgram(program.id);
            });
            
            programList.appendChild(programTag);
        });
    }
}