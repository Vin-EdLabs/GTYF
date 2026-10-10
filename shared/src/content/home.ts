import type { ProgrammeSlug } from './programmes';

export interface HeroSlideSeed {
  eyebrow: string;
  headline: string;
  /** One word of the headline that gets the hand-drawn underline. */
  underlineWord: string;
  subtext: string;
  programme: ProgrammeSlug | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}

/** Five slides: one "who we are", then one per programme. Images are uploaded in admin. */
export const heroSlides: HeroSlideSeed[] = [
  {
    eyebrow: 'Guide The Youth Foundation',
    headline: 'Every child deserves a guide.',
    underlineWord: 'guide',
    subtext: "Since 2023 we've walked with children and young people across Wamfie and beyond.",
    programme: null,
    primaryLabel: 'Donate',
    primaryHref: '/donate',
    secondaryLabel: 'Who we are',
    secondaryHref: '/about',
  },
  {
    eyebrow: 'Uniforms and Footwear Support Program',
    headline: 'Confidence starts at the school gate.',
    underlineWord: 'Confidence',
    subtext: '45 uniforms and 40 pairs of shoes given to children in rural schools.',
    programme: 'uniforms-footwear',
    primaryLabel: 'Donate',
    primaryHref: '/donate?cause=uniforms-footwear',
    secondaryLabel: 'Learn more',
    secondaryHref: '/programmes/uniforms-footwear',
  },
  {
    eyebrow: 'Learning Materials Assistance Program',
    headline: '1,800 exercise books. 1,800 fresh starts.',
    underlineWord: 'fresh',
    subtext: 'Exercise books, pens and pencils for students whose families cannot provide them.',
    programme: 'learning-materials',
    primaryLabel: 'Donate',
    primaryHref: '/donate?cause=learning-materials',
    secondaryLabel: 'Learn more',
    secondaryHref: '/programmes/learning-materials',
  },
  {
    eyebrow: 'Life After School',
    headline: 'What comes after JHS?',
    underlineWord: 'after',
    subtext: 'Career guidance and mentorship for the next step.',
    programme: 'life-after-school',
    primaryLabel: 'Donate',
    primaryHref: '/donate?cause=life-after-school',
    secondaryLabel: 'Learn more',
    secondaryHref: '/programmes/life-after-school',
  },
  {
    eyebrow: 'The Youth Must Know',
    headline: 'Knowledge that changes direction.',
    underlineWord: 'direction',
    subtext: '240 young people and parents in one room in Wamfie.',
    programme: 'the-youth-must-know',
    primaryLabel: 'Donate',
    primaryHref: '/donate?cause=the-youth-must-know',
    secondaryLabel: 'Learn more',
    secondaryHref: '/programmes/the-youth-must-know',
  },
];

export const HOME_SECTION_KEYS = [
  'hero',
  'impact',
  'programmes',
  'selection',
  'upcoming',
  'journey',
  'values',
  'news',
] as const;
export type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number];

export interface HomeSectionSeed {
  key: HomeSectionKey;
  eyebrow: string;
  heading: string;
  underlineWord: string;
  body: string;
}

/** Order here is the default order on the home page; admin can reorder and hide. */
export const homeSections: HomeSectionSeed[] = [
  { key: 'hero', eyebrow: '', heading: '', underlineWord: '', body: '' },
  {
    key: 'impact',
    eyebrow: 'Our impact so far',
    heading: 'Small things, given faithfully.',
    underlineWord: 'faithfully',
    body: '',
  },
  {
    key: 'programmes',
    eyebrow: 'What we do',
    heading: 'Four ways we guide.',
    underlineWord: 'guide',
    body: '',
  },
  {
    key: 'selection',
    eyebrow: 'How we choose who we help',
    heading: 'Every gift reaches a child who needs it.',
    underlineWord: 'needs',
    body:
      'To ensure fairness, transparency, and equal opportunity, the foundation personally visits various schools and communities to identify students who genuinely require support.',
  },
  {
    key: 'upcoming',
    eyebrow: 'Next outreach',
    heading: "Where we're going next.",
    underlineWord: 'next',
    body: "Our next outreach is being planned. Join the list and we'll tell you first.",
  },
  {
    key: 'journey',
    eyebrow: 'Our journey',
    heading: 'From 2023 to today.',
    underlineWord: 'today',
    body: '',
  },
  { key: 'values', eyebrow: 'What we stand for', heading: '', underlineWord: '', body: '' },
  {
    key: 'news',
    eyebrow: 'Latest news',
    heading: 'From the field.',
    underlineWord: 'field',
    body: '',
  },
];

/** The three trust steps shown in the "How we choose who we help" section. */
export const selectionSteps = [
  {
    title: 'Visit',
    body: 'We personally visit schools and communities to identify students who genuinely require support.',
  },
  {
    title: 'Verify with schools',
    body: 'Through interviews, assessments and careful verification, we work with school authorities to select students based on their actual needs.',
  },
  {
    title: 'Follow up',
    body: 'We visit schools three times each year to check on the support given and identify students who need more help.',
  },
];
