import type { ImpactIcon } from '../index';
import type { ProgrammeSlug } from './programmes';

export interface CoreValueSeed {
  name: string;
  description: string;
  /** True until GTYF has confirmed the wording. */
  isDraft: boolean;
}

/** The eight values are GTYF's. The one-line explanations are drafts for GTYF to confirm. */
export const coreValues: CoreValueSeed[] = [
  { name: 'Integrity', description: 'We are honest in what we say and careful with every cedi entrusted to us.', isDraft: true },
  { name: 'Compassion', description: 'We meet every child and family with kindness and respect for their situation.', isDraft: true },
  { name: 'Excellence', description: 'We aim for work of lasting quality, and we expect the best for the children we serve.', isDraft: true },
  { name: 'Respect', description: 'We protect the dignity of every child, parent, school and community we work with.', isDraft: true },
  { name: 'Faith and Morality', description: 'Our work is guided by faith and by strong moral values.', isDraft: true },
  { name: 'Inclusiveness', description: 'Support goes to children in need, whatever their background.', isDraft: true },
  { name: 'Teamwork', description: 'We work hand in hand with schools, parents, leaders and volunteers.', isDraft: true },
  { name: 'Accountability', description: 'We verify every need, follow up on every gift and report what we do.', isDraft: true },
];

export interface ImpactStatSeed {
  key: string;
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  /** Show the number as-is (no count-up, no thousands separator), e.g. a year. */
  isYear?: boolean;
}

/** Derived from GTYF's event records; admin-editable. */
export const impactStats: ImpactStatSeed[] = [
  { key: 'exercise_books', value: 1800, suffix: '+', label: 'Exercise books given' },
  { key: 'pens_pencils', value: 300, suffix: '+', label: 'Pens and pencils' },
  { key: 'uniforms', value: 45, label: 'School uniforms' },
  { key: 'footwear', value: 40, label: 'Pairs of footwear' },
  { key: 'youth_parents', value: 240, label: 'Youth and parents at The Youth Must Know' },
  { key: 'jhs_schools', value: 4, label: 'JHS schools mentored in Life After School' },
  { key: 'since', value: 2023, prefix: 'Since', label: 'Serving Wamfie and beyond', isYear: true },
];

export interface ImpactItemSeed {
  key: string;
  /** null = counts toward "where it's needed most" only. */
  programme: ProgrammeSlug | null;
  label: string;
  singular: string;
  plural: string;
  /** Price in pesewas. */
  unitPrice: number;
  icon: ImpactIcon;
  /** Prices are placeholders until GTYF confirms them. */
  needsConfirmation: boolean;
}

/** CONFIRM WITH GTYF: every price below is a placeholder default. */
export const impactItems: ImpactItemSeed[] = [
  {
    key: 'exercise_book_pack',
    programme: 'learning-materials',
    label: 'Exercise book pack (10 books)',
    singular: 'pack of 10 exercise books',
    plural: 'packs of 10 exercise books',
    unitPrice: 3000,
    icon: 'book',
    needsConfirmation: true,
  },
  {
    key: 'class_pens_pencils',
    programme: 'learning-materials',
    label: 'Pens and pencils for a class',
    singular: 'class set of pens and pencils',
    plural: 'class sets of pens and pencils',
    unitPrice: 2500,
    icon: 'pen',
    needsConfirmation: true,
  },
  {
    key: 'school_uniform',
    programme: 'uniforms-footwear',
    label: 'School uniform',
    singular: 'full school uniform',
    plural: 'full school uniforms',
    unitPrice: 12000,
    icon: 'uniform',
    needsConfirmation: true,
  },
  {
    key: 'school_shoes',
    programme: 'uniforms-footwear',
    label: 'Pair of school shoes',
    singular: 'pair of shoes',
    plural: 'pairs of shoes',
    unitPrice: 8000,
    icon: 'shoe',
    needsConfirmation: true,
  },
  {
    key: 'mentorship_seat',
    programme: 'life-after-school',
    label: 'Mentorship seat (one student, one Life After School session)',
    singular: 'mentorship seat',
    plural: 'mentorship seats',
    unitPrice: 5000,
    icon: 'mentor',
    needsConfirmation: true,
  },
];
