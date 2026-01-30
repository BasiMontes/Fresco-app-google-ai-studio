
// Servicio robusto para normalizar unidades y comparar cantidades

export const cleanName = (name: string): string => {
    if (!name) return '';
    return name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos (tildes)
        .replace(/\(.*\)/g, '') // Quitar texto entre paréntesis
        .replace(/[^a-z0-9ñ ]/g, '') // Quitar caracteres especiales excepto ñ
        .replace(/s$/, '') // Singularizar básico (plural simple)
        .replace(/es$/, '') // Singularizar básico (plural complejo)
        .trim();
};

/**
 * Redondeo seguro para evitar errores de precisión float.
 * Ahora soporta hasta 3 decimales para alta precisión (gramos en kg).
 */
export const roundSafe = (num: number, decimals: number = 3): number => {
    const factor = Math.pow(10, decimals);
    return Math.round((num + Number.EPSILON) * factor) / factor;
};

/**
 * Formatea un número para mostrar siempre el número de decimales deseado
 * útil para que el usuario vea el cambio (ej: 2.25 -> 2.250)
 */
export const formatQuantity = (num: number, unit: string): string => {
    const u = unit.toLowerCase();
    // Si es kg o l, mostramos 3 decimales para que se vean los gramos/ml
    if (['kg', 'l'].includes(u)) {
        return num.toFixed(3);
    }
    // Para unidades, packs o gramos sueltos, con 1 decimal o entero suele bastar
    return Number.isInteger(num) ? num.toString() : num.toFixed(1);
};

/**
 * Re-escala una cantidad y unidad a su forma más legible.
 * Ej: 1200g -> 1.2kg | 0.5kg -> 500g
 */
export const autoScaleIngredient = (quantity: number, unit: string): { quantity: number, unit: string } => {
    const u = unit.toLowerCase().trim();
    let q = quantity;

    // MAGNITUD MASA
    if (['g', 'gramo', 'gr'].includes(u)) {
        if (q >= 1000) return { quantity: roundSafe(q / 1000), unit: 'kg' };
    }
    if (['kg', 'kilo', 'kilogramo'].includes(u)) {
        if (q > 0 && q < 1) return { quantity: roundSafe(q * 1000), unit: 'g' };
    }

    // MAGNITUD VOLUMEN
    if (['ml', 'mililitro'].includes(u)) {
        if (q >= 1000) return { quantity: roundSafe(q / 1000), unit: 'l' };
    }
    if (['l', 'litro'].includes(u)) {
        if (q > 0 && q < 1) return { quantity: roundSafe(q * 1000), unit: 'ml' };
    }

    return { quantity: roundSafe(q), unit };
};

export const normalizeUnit = (quantity: number, unit: string): { value: number, type: 'mass' | 'volume' | 'count' } => {
    const u = unit.toLowerCase().trim()
        .replace(/\.$/, '') // Quitar puntos finales (gr.)
        .replace(/s$/, ''); // Singularizar básico (litros -> litro)

    // --- MASA (Base: Gramos) ---
    if (['kg', 'kilo', 'kilogramo'].includes(u)) return { value: quantity * 1000, type: 'mass' };
    if (['g', 'gr', 'gramo'].includes(u)) return { value: quantity, type: 'mass' };
    if (['mg', 'miligramo'].includes(u)) return { value: quantity / 1000, type: 'mass' };
    if (['lb', 'libra', 'pound'].includes(u)) return { value: quantity * 453.59, type: 'mass' };
    if (['oz', 'onza', 'ounce'].includes(u)) return { value: quantity * 28.35, type: 'mass' };
    
    // --- VOLUMEN (Base: Mililitros) ---
    if (['l', 'litro', 'lt'].includes(u)) return { value: quantity * 1000, type: 'volume' };
    if (['ml', 'mililitro', 'cc'].includes(u)) return { value: quantity, type: 'volume' };
    if (['cl', 'centilitro'].includes(u)) return { value: quantity * 10, type: 'volume' };
    if (['dl', 'decilitro'].includes(u)) return { value: quantity * 100, type: 'volume' };
    if (['taza', 'cup', 'vaso'].includes(u)) return { value: quantity * 240, type: 'volume' }; 
    if (['cucharada', 'tbsp', 'cda'].includes(u)) return { value: quantity * 15, type: 'volume' };
    if (['cucharadita', 'tsp', 'cdta'].includes(u)) return { value: quantity * 5, type: 'volume' };
    if (['pinta', 'pint', 'pt'].includes(u)) return { value: quantity * 473.17, type: 'volume' }; 
    if (['galon', 'gallon', 'gal'].includes(u)) return { value: quantity * 3785.41, type: 'volume' };
    if (['onza fluida', 'fl oz'].includes(u)) return { value: quantity * 29.57, type: 'volume' };

    // --- CONTEO (Base: Unidad) ---
    if (['docena'].includes(u)) return { value: quantity * 12, type: 'count' };
    
    return { value: quantity, type: 'count' };
};

export const convertBack = (value: number, type: 'mass' | 'volume' | 'count'): { quantity: number, unit: string } => {
    if (type === 'mass') {
        if (value >= 1000) return { quantity: roundSafe(value / 1000), unit: 'kg' };
        return { quantity: roundSafe(value), unit: 'g' };
    }
    if (type === 'volume') {
        if (value >= 1000) return { quantity: roundSafe(value / 1000), unit: 'l' };
        return { quantity: roundSafe(value), unit: 'ml' };
    }
    return { quantity: roundSafe(value), unit: 'uds' };
};

export const subtractIngredient = (sourceQty: number, sourceUnit: string, usedQty: number, usedUnit: string): { quantity: number, unit: string } | null => {
    const source = normalizeUnit(sourceQty, sourceUnit);
    const used = normalizeUnit(usedQty, usedUnit);

    if (source.type !== used.type) {
        if ((source.type === 'mass' && used.type === 'volume') || (source.type === 'volume' && used.type === 'mass')) {
            const remainingVal = Math.max(0, source.value - used.value);
            return convertBack(remainingVal, source.type);
        }
        return null; 
    }

    const remainingVal = Math.max(0, source.value - used.value);
    return convertBack(remainingVal, source.type);
};

export const addIngredient = (currentQty: number, currentUnit: string, addedQty: number, addedUnit: string): { quantity: number, unit: string } => {
    const current = normalizeUnit(currentQty, currentUnit);
    const added = normalizeUnit(addedQty, addedUnit);

    let totalValue = current.value;
    
    if (current.type === added.type) {
        totalValue += added.value;
    } else if ((current.type === 'mass' && added.type === 'volume') || (current.type === 'volume' && added.type === 'mass')) {
        totalValue += added.value;
    } else {
        return { quantity: roundSafe(currentQty + addedQty), unit: currentUnit };
    }

    return convertBack(totalValue, current.type);
};
