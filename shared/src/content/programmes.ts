/**
 * GTYF's four programmes. Copy is verbatim from GTYF's own documents.
 * `summary` is an excerpt of that copy, used on cards and in link previews.
 */

export type ProgrammeSlug =
  | 'learning-materials'
  | 'uniforms-footwear'
  | 'life-after-school'
  | 'the-youth-must-know';

export interface ProgrammeSectionSeed {
  heading: string;
  body: string;
}

export interface ProgrammeSeed {
  slug: ProgrammeSlug;
  title: string;
  /** Short name for pills, eyebrows and the donation card. */
  shortTitle: string;
  summary: string;
  /** Paragraphs separated by a blank line. */
  body: string;
  sections: ProgrammeSectionSeed[];
}

export const programmes: ProgrammeSeed[] = [
  {
    slug: 'learning-materials',
    title: 'Learning Materials Assistance Program',
    shortTitle: 'Learning Materials',
    summary:
      'Exercise books, textbooks, pens, pencils and other learning resources for vulnerable students whose families are unable to provide them.',
    body: `As part of our commitment to supporting education, the foundation provides teaching and learning materials to schools in various communities to promote effective teaching and learning. This initiative supports vulnerable students whose parents or guardians are unable to provide essential educational materials such as exercise books, textbooks, pens, pencils, and other learning resources.

Through this program, we aim to create a better learning environment and give every student the opportunity to learn and succeed academically irrespective of their background.`,
    sections: [
      {
        heading: 'Student Selection and Assessment Process',
        body: `To ensure fairness, transparency, and equal opportunity, the foundation personally visits various schools and communities to identify students who genuinely require support. Through interviews, assessments, and careful verification processes, we work closely with school authorities to select vulnerable and deserving students based on their actual needs.

This approach helps us avoid favoritism and ensures that the assistance provided reaches students who truly need educational and personal support.`,
      },
    ],
  },
  {
    slug: 'uniforms-footwear',
    title: 'Uniforms and Footwear Support Program',
    shortTitle: 'Uniforms & Footwear',
    summary:
      'School uniforms, casual wear and footwear for students in need within rural communities, so every child can feel valued, confident and prepared to learn.',
    body: `Our Uniform and Footwear Support Program is dedicated to providing school uniforms, casual wear, and footwear to students in need within rural communities. It is heartbreaking to see children attend school in torn uniforms or without proper footwear, conditions that can affect their confidence, dignity, and willingness to learn. Through this initiative, we strive to restore hope, promote equal opportunities, and help every child feel valued, confident, and prepared to pursue their education.`,
    sections: [
      {
        heading: 'Monitoring and Follow-up Visit',
        body: `As part of our commitment to the program, we visit various schools three times each year to monitor the condition of the uniforms and footwear distributed to students. These follow-up visits allow us to assess the impact of the support provided, identify students who may require further assistance, and ensure the initiative continues to meet their needs effectively.`,
      },
      {
        heading: 'Student Encouragement and Mentorship',
        body: `Beyond monitoring, we also use these visits as an opportunity to encourage and inspire the students. We remind them that regardless of their background or circumstances, they have the potential to succeed, achieve their dreams, and become great individuals in society. Through mentorship and encouragement, we aim to instill confidence, hope, and determination in every child we support.`,
      },
    ],
  },
  {
    slug: 'life-after-school',
    title: 'Life After School',
    shortTitle: 'Life After School',
    summary:
      'Career guidance, educational counseling and mentorship that prepare JHS and SHS graduates for the next stage of life after school.',
    body: `As part of the activities of GTYF, Life After School is a mentorship and guidance program for JHS and SHS graduates aimed at preparing them for the next stage of life after school. The initiative provides career guidance, educational counseling, and mentorship to help young people make informed decisions about their future.

The program also helps participants identify their talents, gifts, and potential abilities while equipping them with the personal development and life skills needed for growth and success. Students are educated on job opportunities, entrepreneurship, leadership, discipline, and responsible behavior in society to help them transition confidently into adulthood.`,
    sections: [],
  },
  {
    slug: 'the-youth-must-know',
    title: 'The Youth Must Know',
    shortTitle: 'The Youth Must Know',
    summary:
      'A youth empowerment and mentorship program that brings leaders, speakers, mentors and life coaches together with young people to encourage growth, leadership and discipline.',
    body: `The Youth Must Know is a youth empowerment and mentorship program aimed at educating, inspiring, and guiding young people to become responsible and purpose-driven individuals. Through this initiative, we invite leaders, motivational speakers, mentors, and life coaches to share knowledge and experiences that encourage personal growth, leadership, discipline, and education.

The program has positively impacted many young people by building confidence, encouraging positive choices, and inspiring them to pursue their goals irrespective of their background. Parents and guardians also join some sessions to support and encourage the development of the youth.`,
    sections: [],
  },
];
