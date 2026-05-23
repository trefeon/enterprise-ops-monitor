export type AppMode = 'demo' | 'production';

const rawMode = String(import.meta.env.VITE_APP_MODE || 'production').toLowerCase();

export const APP_MODE: AppMode = rawMode === 'demo' ? 'demo' : 'production';
export const isDemoMode = APP_MODE === 'demo';
export const isProductionMode = APP_MODE === 'production';
