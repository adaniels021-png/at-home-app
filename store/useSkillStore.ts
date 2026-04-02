import { create } from 'zustand';

interface SkillState {
  currentSkill: string;
  currentLevel: string;
  setSkill: (skill: string) => void;
  setLevel: (level: string) => void;
}

export const useSkillStore = create<SkillState>((set) => ({
  currentSkill: 'Functional Communication',
  currentLevel: 'Emerging',
  setSkill: (skill) => set({ currentSkill: skill }),
  setLevel: (level) => set({ currentLevel: level }),
}));
