/**
 * DEMO PHOTOS: placeholders so the site looks complete until GTYF uploads its
 * own, consented photos. They are free-licence photos from Unsplash
 * (https://unsplash.com/license), NOT GTYF's beneficiaries, so:
 *   - every one is tagged `demo` in the photo library (shown as "Demo" in the admin),
 *   - staff replace them from Admin → Photos (one tap each),
 *   - Admin → Photos → "Remove all demo photos" clears them in one go.
 *
 * Files are stored in server/seed/demo-photos/<key>.jpg (downloaded once by
 * `npm run demo-photos:fetch -w server`) so seeding never depends on Unsplash.
 * `npm run db:seed` loads them and fills only photo spots that are still empty.
 */
import type { ProgrammeSlug } from '@gtyf/shared/content';

export type DemoSlot =
  | { kind: 'slide'; index: number }
  | { kind: 'programme'; slug: ProgrammeSlug }
  | { kind: 'section'; programme: ProgrammeSlug; index: number }
  | { kind: 'about' }
  | { kind: 'event'; slug: string }
  | { kind: 'share' };

export interface DemoPhoto {
  key: string;
  unsplashId: string;
  alt: string;
  focalX: number;
  focalY: number;
  slots: DemoSlot[];
  programme?: ProgrammeSlug;
  event?: string;
}

export const demoPhotos: DemoPhoto[] = [
  { key: 'classroom-hands-up', unsplashId: '1627423896085-e3e694d88e40', alt: 'A full classroom of pupils raising their hands to answer', focalX: 0.5, focalY: 0.45, slots: [{ kind: 'slide', index: 0 }] },
  { key: 'pupils-in-uniform', unsplashId: '1612229693210-30e16029c415', alt: 'Pupils in white and blue school uniforms smiling outside their school', focalX: 0.5, focalY: 0.4, slots: [{ kind: 'slide', index: 1 }], programme: 'uniforms-footwear' },
  { key: 'child-writing', unsplashId: '1529390079861-591de354faf5', alt: 'A boy writing carefully in his exercise book', focalX: 0.55, focalY: 0.45, slots: [{ kind: 'slide', index: 2 }], programme: 'learning-materials' },
  { key: 'shs-students', unsplashId: '1632215863153-0dae7657d0a9', alt: 'Senior high school students smiling together on their school field', focalX: 0.5, focalY: 0.35, slots: [{ kind: 'slide', index: 3 }], programme: 'life-after-school' },
  { key: 'young-people-gathered', unsplashId: '1584365098838-50ccef838f4a', alt: 'Young people seated together at a youth gathering', focalX: 0.5, focalY: 0.4, slots: [{ kind: 'slide', index: 4 }], programme: 'the-youth-must-know' },

  { key: 'boy-at-desk-writing', unsplashId: '1536337005238-94b997371b40', alt: 'A smiling pupil writing at his desk', focalX: 0.45, focalY: 0.35, slots: [{ kind: 'programme', slug: 'learning-materials' }], programme: 'learning-materials' },
  { key: 'students-in-uniform-class', unsplashId: '1687794504223-8bdc02e25ef6', alt: 'Students in school uniform listening in class', focalX: 0.5, focalY: 0.5, slots: [{ kind: 'programme', slug: 'uniforms-footwear' }], programme: 'uniforms-footwear' },
  { key: 'student-in-tie', unsplashId: '1642140027867-e5983a32119c', alt: 'A student in a blue shirt and school tie, smiling', focalX: 0.5, focalY: 0.3, slots: [{ kind: 'programme', slug: 'life-after-school' }], programme: 'life-after-school' },
  { key: 'community-women', unsplashId: '1509099896299-af46ad97ff57', alt: 'Parents and community members gathered for a meeting', focalX: 0.5, focalY: 0.4, slots: [{ kind: 'programme', slug: 'the-youth-must-know' }], programme: 'the-youth-must-know' },

  { key: 'teacher-reading-with-pupils', unsplashId: '1632215861513-130b66fe97f4', alt: 'A teacher reading with pupils in a busy classroom', focalX: 0.3, focalY: 0.4, slots: [{ kind: 'section', programme: 'learning-materials', index: 0 }], programme: 'learning-materials' },
  { key: 'pupils-at-table', unsplashId: '1620608929452-ccc05381b0f7', alt: 'Young pupils sitting together at a classroom table', focalX: 0.5, focalY: 0.5, slots: [{ kind: 'section', programme: 'uniforms-footwear', index: 0 }], programme: 'uniforms-footwear' },
  { key: 'teacher-at-board', unsplashId: '1744809482817-9a9d4fc280af', alt: 'A teacher explaining a lesson to attentive students', focalX: 0.45, focalY: 0.4, slots: [{ kind: 'section', programme: 'uniforms-footwear', index: 1 }] },

  { key: 'boy-arms-open', unsplashId: '1663919400231-d9d36115ddae', alt: 'A joyful boy with his arms open wide in his community', focalX: 0.55, focalY: 0.4, slots: [{ kind: 'about' }] },

  { key: 'community-celebration', unsplashId: '1663919402880-1b80b17a0270', alt: 'Young people and parents gathered for a community programme', focalX: 0.5, focalY: 0.45, slots: [{ kind: 'event', slug: 'the-youth-must-know-2023' }], programme: 'the-youth-must-know', event: 'the-youth-must-know-2023' },
  { key: 'child-writing-outdoors', unsplashId: '1539893867126-7ce0b48971ca', alt: 'A pupil writing in a notebook outdoors', focalX: 0.55, focalY: 0.5, slots: [{ kind: 'event', slug: 'learning-materials-wamfie-2023' }], programme: 'learning-materials', event: 'learning-materials-wamfie-2023' },
  { key: 'girls-with-books', unsplashId: '1666281269793-da06484657e8', alt: 'Girls proudly holding up their new books', focalX: 0.5, focalY: 0.35, slots: [{ kind: 'event', slug: 'learning-materials-wamfie-2024' }], programme: 'learning-materials', event: 'learning-materials-wamfie-2024' },
  { key: 'joyful-pupils-uniform', unsplashId: '1706117386176-e0eab81b9abc', alt: 'Two pupils in school uniform laughing together', focalX: 0.5, focalY: 0.35, slots: [{ kind: 'event', slug: 'uniforms-footwear-sunuroase-2025' }], programme: 'uniforms-footwear', event: 'uniforms-footwear-sunuroase-2025' },
  { key: 'pupils-green-uniform', unsplashId: '1617056239820-8ce90ba48193', alt: 'A pupil in a green and white school uniform', focalX: 0.5, focalY: 0.3, slots: [{ kind: 'event', slug: 'uniforms-wamfie-asuotiano-2025' }], programme: 'uniforms-footwear', event: 'uniforms-wamfie-asuotiano-2025' },
  { key: 'student-with-backpack', unsplashId: '1744809448493-448812255e4d', alt: 'A smiling student with his school backpack', focalX: 0.5, focalY: 0.3, slots: [{ kind: 'event', slug: 'life-after-school-2025' }], programme: 'life-after-school', event: 'life-after-school-2025' },

  { key: 'smiling-children', unsplashId: '1644609019571-e8bc18eea658', alt: 'Smiling children looking into the camera', focalX: 0.4, focalY: 0.4, slots: [{ kind: 'share' }] },
];

export const DEMO_TAG = 'demo';
