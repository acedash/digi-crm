import { create } from 'zustand';

/**
 * Walkthrough Step structure:
 * {
 *   target: string, // CSS selector
 *   title: string,
 *   content: string,
 *   position: 'top' | 'bottom' | 'left' | 'right'
 * }
 */

export const useWalkthroughStore = create((set) => ({
  isActive: false,
  currentStepIndex: 0,
  steps: [],
  startTour: (steps) => set({ steps, currentStepIndex: 0, isActive: true }),
  nextStep: () => set((state) => ({
    currentStepIndex: Math.min(state.currentStepIndex + 1, state.steps.length - 1)
  })),
  prevStep: () => set((state) => ({
    currentStepIndex: Math.max(state.currentStepIndex - 1, 0)
  })),
  endTour: () => set({ isActive: false, steps: [], currentStepIndex: 0 }),
}));
