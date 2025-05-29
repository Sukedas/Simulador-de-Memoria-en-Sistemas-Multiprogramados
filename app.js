import { MemoryController } from './controllers/MemoryController.js';

document.addEventListener('DOMContentLoaded', () => {
    const controller = new MemoryController();
    controller.init();
});