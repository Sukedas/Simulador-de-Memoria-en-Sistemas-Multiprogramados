export function getProgramColor(programId) {
    const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', 
                    '#1abc9c', '#d35400', '#34495e', '#7f8c8d', '#27ae60'];
    return colors[programId % colors.length];
}

export function formatAddress(address) {
    return `0x${address.toString(16).padStart(6, '0').toUpperCase()}`;
}