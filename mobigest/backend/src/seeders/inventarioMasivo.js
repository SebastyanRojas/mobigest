const { Repuesto } = require('../models');

const INVENTARIO_PREMIUM = [
  // --- XIAOMI ---
  { nombre: 'Pantalla Xiaomi Redmi 10A (Original)', codigo: 'PNT-XIA-001', precioUnitario: 9000, stockActual: 12, stockMinimo: 3, proveedor: 'ImportCell SpA' },
  { nombre: 'Pantalla Xiaomi Redmi 9A (Original)', codigo: 'PNT-XIA-002', precioUnitario: 9000, stockActual: 8, stockMinimo: 2, proveedor: 'TechSupply Ltda' },
  { nombre: 'Pantalla Xiaomi Note 10 / 10S (Incell)', codigo: 'PNT-XIA-003', precioUnitario: 11000, stockActual: 4, stockMinimo: 5, proveedor: 'MovilParts Chile' },
  { nombre: 'Pantalla Xiaomi Note 11 (Incell)', codigo: 'PNT-XIA-004', precioUnitario: 11000, stockActual: 15, stockMinimo: 4, proveedor: 'ImportCell SpA' },
  { nombre: 'Pantalla Xiaomi Note 11 Pro 5G (OLED)', codigo: 'PNT-XIA-005', precioUnitario: 40000, stockActual: 2, stockMinimo: 2, proveedor: 'TechSupply Ltda' },
  { nombre: 'Pantalla Xiaomi Poco X3 Pro (Original)', codigo: 'PNT-XIA-006', precioUnitario: 18000, stockActual: 6, stockMinimo: 2, proveedor: 'MovilParts Chile' },
  
  // --- MOTOROLA ---
  { nombre: 'Pantalla Motorola E20 (Original)', codigo: 'PNT-MOT-001', precioUnitario: 10000, stockActual: 9, stockMinimo: 3, proveedor: 'ImportCell SpA' },
  { nombre: 'Pantalla Motorola G20 con Marco (Original)', codigo: 'PNT-MOT-002', precioUnitario: 12000, stockActual: 11, stockMinimo: 3, proveedor: 'MovilParts Chile' },
  { nombre: 'Pantalla Motorola G50 5G (Original)', codigo: 'PNT-MOT-003', precioUnitario: 13000, stockActual: 5, stockMinimo: 2, proveedor: 'TechSupply Ltda' },
  { nombre: 'Pantalla Motorola Edge 30 Neo (Incell)', codigo: 'PNT-MOT-004', precioUnitario: 25000, stockActual: 1, stockMinimo: 2, proveedor: 'ImportCell SpA' },
  { nombre: 'Pantalla Motorola Edge 40 / 40 Neo (Original)', codigo: 'PNT-MOT-005', precioUnitario: 45000, stockActual: 3, stockMinimo: 1, proveedor: 'TechSupply Ltda' },

  // --- SAMSUNG ---
  { nombre: 'Pantalla Samsung A03 M/F (Original)', codigo: 'PNT-SAM-001', precioUnitario: 9000, stockActual: 20, stockMinimo: 5, proveedor: 'MovilParts Chile' },
  { nombre: 'Pantalla Samsung A12 (Original C/M)', codigo: 'PNT-SAM-002', precioUnitario: 13000, stockActual: 14, stockMinimo: 4, proveedor: 'ImportCell SpA' },
  { nombre: 'Pantalla Samsung A32 (OLED Con Marco)', codigo: 'PNT-SAM-003', precioUnitario: 25000, stockActual: 4, stockMinimo: 2, proveedor: 'TechSupply Ltda' },
  { nombre: 'Pantalla Samsung A53 5G (Incell Con Marco)', codigo: 'PNT-SAM-004', precioUnitario: 15000, stockActual: 7, stockMinimo: 2, proveedor: 'MovilParts Chile' },
  { nombre: 'Pantalla Samsung S21FE (OLED Con Marco)', codigo: 'PNT-SAM-005', precioUnitario: 35000, stockActual: 2, stockMinimo: 2, proveedor: 'ImportCell SpA' },
  { nombre: 'Pantalla Samsung S22 (OLED Con Marco)', codigo: 'PNT-SAM-006', precioUnitario: 80000, stockActual: 5, stockMinimo: 1, proveedor: 'TechSupply Ltda' },

  // --- IPHONE ---
  { nombre: 'Pantalla iPhone 11 (JK Cambio IC)', codigo: 'PNT-IPH-001', precioUnitario: 18000, stockActual: 25, stockMinimo: 5, proveedor: 'ImportCell SpA' },
  { nombre: 'Pantalla iPhone 11 Pro Max (Incell Alta Calidad)', codigo: 'PNT-IPH-002', precioUnitario: 20000, stockActual: 8, stockMinimo: 2, proveedor: 'MovilParts Chile' },
  { nombre: 'Pantalla iPhone 12 / 12 Pro (Incell Full HD)', codigo: 'PNT-IPH-003', precioUnitario: 22000, stockActual: 12, stockMinimo: 3, proveedor: 'TechSupply Ltda' },
  { nombre: 'Pantalla iPhone 13 Pro Max (Incell Cambio IC)', codigo: 'PNT-IPH-004', precioUnitario: 84000, stockActual: 3, stockMinimo: 1, proveedor: 'ImportCell SpA' },
  { nombre: 'Pantalla iPhone 14 Pro Max (Incell JK Full HD)', codigo: 'PNT-IPH-005', precioUnitario: 62000, stockActual: 0, stockMinimo: 2, proveedor: 'TechSupply Ltda' }
];

async function inyectarInventario() {
  try {
    console.log("⏳ Iniciando inyección de inventario premium...");
    await Repuesto.bulkCreate(INVENTARIO_PREMIUM);
    console.log("✅ ¡Éxito! 22 repuestos inyectados correctamente a la base de datos.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error al inyectar los datos:", error);
    process.exit(1);
  }
}

inyectarInventario();