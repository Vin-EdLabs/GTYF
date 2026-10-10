/**
 * GTYF's past outreach, verbatim from their records. Dates are ISO (YYYY-MM-DD).
 * Upcoming events have no seed: the admin creates them.
 */
import type { ProgrammeSlug } from './programmes';

export interface EventSeed {
  slug: string;
  title: string;
  programme: ProgrammeSlug;
  dateStart: string;
  dateEnd?: string;
  venue: string;
  participants?: number;
  /** Opening story paragraph, when GTYF supplied one. */
  story?: string;
  highlights: string[];
  schoolsVisited?: string[];
  /** Closing paragraph, when GTYF supplied one. */
  closingNote?: string;
}

export const pastEvents: EventSeed[] = [
  {
    slug: 'the-youth-must-know-2023',
    title: 'The Youth Must Know Program',
    programme: 'the-youth-must-know',
    dateStart: '2023-08-14',
    venue: 'Assemblies of God Church, Wamfie',
    participants: 240,
    story:
      'We organized a community engagement program bringing together young people and parents to inspire the youth to reach their full potential. The session also guided parents on how to better understand and support today\'s children. Key discussions included drug abuse and its effects on young people.',
    highlights: [
      'Engagement with pastors, teachers, business professionals, and community leaders who shared motivational and educational insights.',
      'Guest speaker Hon. Rachel Owusuaa, Member of Parliament (Dormaa East), delivered an inspiring message to empower and encourage young girls.',
      'An interactive question-and-answer session where participants actively engaged and received clear responses.',
    ],
  },
  {
    slug: 'learning-materials-wamfie-2023',
    title: 'Learning Materials Donation, Wamfie',
    programme: 'learning-materials',
    dateStart: '2023-09-13',
    venue: 'Wamfie',
    highlights: [
      'Donated 800 exercise books to needy students in Wamfie',
      'Provided over 300 pens and pencils',
    ],
  },
  {
    slug: 'learning-materials-wamfie-2024',
    title: 'Learning Materials Donation, Wamfie',
    programme: 'learning-materials',
    dateStart: '2024-09-20',
    venue: 'Wamfie',
    highlights: ['Distributed over 1,000 exercise books and pens to needy students in Wamfie'],
  },
  {
    slug: 'uniforms-footwear-sunuroase-2025',
    title: 'Uniform and Footwear Donation, Sunuroase',
    programme: 'uniforms-footwear',
    dateStart: '2025-10-10',
    venue: 'Sunuroase',
    highlights: [
      'Donated 30 school uniforms to students of Sunuroase',
      'Provided 40 pairs of footwear',
      'Distributed casual wear to many students',
    ],
  },
  {
    slug: 'uniforms-wamfie-asuotiano-2025',
    title: 'Uniform Donation, Wamfie and Asuotiano',
    programme: 'uniforms-footwear',
    dateStart: '2025-10-15',
    venue: 'Wamfie and Asuotiano',
    highlights: ['Donated 15 school uniforms to needy students in Wamfie and Asuotiano'],
  },
  {
    slug: 'life-after-school-2025',
    title: 'Life After School Program',
    programme: 'life-after-school',
    dateStart: '2025-10-19',
    dateEnd: '2025-10-20',
    venue: 'Wamfie circuit',
    story:
      'We conducted a mentorship program for Junior High School students in Wamfie aimed at guiding them in selecting appropriate SHS courses and preparing them for life in Senior High School.',
    highlights: [],
    schoolsVisited: [
      'Anglican JHS Wamfie',
      'St. Michael JHS Wamfie',
      'D/A JHS Wamfie',
      'Presbyterian JHS Wamfie',
    ],
    closingNote:
      'Students actively participated in the session, asking insightful questions and engaging meaningfully throughout the program.',
  },
];
