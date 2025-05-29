export const predefinedPrograms = [
    { name: "Navegador", size: 1024 },
    { name: "Editor de Texto", size: 512 },
    { name: "Reproductor Multimedia", size: 2048 },
    { name: "Juego", size: 4096 },
    { name: "Compilador", size: 1536 }
];

export class Program {
    constructor(id, name, size) {
        this.id = id;
        this.name = name;
        this.size = size;
    }
}

export function addPredefinedPrograms(programs) {
    predefinedPrograms.forEach((prog, index) => {
        const program = new Program(index + 1, prog.name, prog.size);
        programs.push(program);
    });
}