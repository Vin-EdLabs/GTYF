/**
 * Site-wide editable text and details. Stored in the `site_settings` table as
 * one row per top-level group (key = group name, value = JSON). These defaults
 * seed the database and are the client's fallback if the API is unreachable.
 *
 * Values starting with "TODO:" are missing from GTYF's documents and must be
 * filled in through the admin before launch.
 */

export interface NavLink {
  label: string;
  href: string;
}

export interface SiteSettings {
  organisation: {
    name: string;
    shortName: string;
    missionLine: string;
    registrationNumber: string;
    foundedYear: number;
    location: string;
    /** Media id of an uploaded logo; null uses the built-in wordmark. */
    logoMediaId: string | null;
  };
  contact: {
    email: string;
    phone: string;
    whatsapp: string;
    address: string;
  };
  /** Empty string = not shown. */
  socials: {
    facebook: string;
    instagram: string;
    x: string;
    tiktok: string;
    youtube: string;
    linkedin: string;
  };
  bank: {
    accountName: string;
    bankName: string;
    accountNumber: string;
    branch: string;
    momoNumber: string;
    momoName: string;
  };
  navigation: {
    links: NavLink[];
    donateLabel: string;
  };
  footer: {
    blurb: string;
    newsletterHeading: string;
    newsletterBody: string;
    newsletterSuccess: string;
    exploreHeading: string;
    exploreLinks: NavLink[];
    involvedHeading: string;
    involvedLinks: NavLink[];
    contactHeading: string;
    paymentsNote: string;
    /** {year} and {name} are filled in automatically. */
    copyright: string;
  };
  seo: {
    defaultTitle: string;
    titleTemplate: string;
    defaultDescription: string;
    defaultOgImageId: string | null;
  };
  about: {
    eyebrow: string;
    heading: string;
    underlineWord: string;
    intro: string;
    storyHeading: string;
    /** Paragraphs separated by a blank line. */
    story: string;
    whereHeading: string;
    whereBody: string;
    valuesHeading: string;
    selectionHeading: string;
    teamHeading: string;
    teamLinkLabel: string;
    /** Photo beside the "Where we work" / story text. */
    photoId: string | null;
  };
  pages: {
    programmes: PageIntro;
    programme: {
      howItWorksLabel: string;
      eventsHeading: string;
      galleryHeading: string;
      fundHeading: string;
      fundBody: string;
    };
    events: PageIntro & { upcomingTab: string; pastTab: string; emptyUpcoming: string };
    event: {
      highlightsHeading: string;
      schoolsHeading: string;
      galleryHeading: string;
      supportLabel: string;
      volunteerLabel: string;
    };
    news: PageIntro & { empty: string };
    gallery: PageIntro & { empty: string };
    team: PageIntro & { empty: string };
    contact: PageIntro & { formHeading: string; success: string };
    getInvolved: PageIntro & {
      volunteerHeading: string;
      volunteerIntro: string;
      partnerHeading: string;
      partnerIntro: string;
      success: string;
    };
  };
  /** Button and link wording used across the site. */
  common: {
    learnMore: string;
    exploreProgramme: string;
    readMore: string;
    allProgrammes: string;
    allNews: string;
    upcomingBadge: string;
    programmeEyebrow: string;
    upcomingEventEyebrow: string;
    leaderBadge: string;
    joinList: string;
    joiningLabel: string;
    newsletterPlaceholder: string;
  };
  /** The call-to-action band at the bottom of inner pages. */
  closing: {
    heading: string;
    underlineWord: string;
    body: string;
  };
  /** Words on the donate page and the donation card. */
  donate: {
    pageEyebrow: string;
    eventEyebrow: string;
    secureNote: string;
    monthlyLabel: string;
    oneTimeLabel: string;
    monthlyNote: string;
    oneTimeNote: string;
    causeHeading: string;
    impactLabel: string;
    detailsHeading: string;
    mobileMoneyHint: string;
    moreOptionsLabel: string;
    giveLabel: string;
    coverFeeText: string;
    anonymousText: string;
    trustNote: string;
  };
  /**
   * The thank-you page, the receipt (web, PDF and email) and what people share.
   * {name} = donor's first name, {org} = organisation name, {link} = donate link, {impact} = what the gift provides.
   */
  thanks: {
    headline: string;
    introOnce: string;
    introMonthly: string;
    receiptTitle: string;
    receivedFrom: string;
    message: string;
    signOff: string;
    shareLabel: string;
    friendLabel: string;
    pdfLabel: string;
    emailNote: string;
    monthlyHeading: string;
    monthlyBody: string;
    whatsappText: string;
  };
  /** The "page not found" screen. */
  notFound: {
    eyebrow: string;
    heading: string;
    underlineWord: string;
    body: string;
    homeLabel: string;
  };
}

/** Heading block at the top of an inner page. */
export interface PageIntro {
  eyebrow: string;
  heading: string;
  underlineWord: string;
  intro: string;
}

export type SiteSettingsKey = keyof SiteSettings;

const MISSION_LINE =
  'Support our mission to empower school children and the youth with the resources they need to thrive. Through our work, we strengthen academic success, build confidence, nurture talents, and help develop stronger communities for a brighter future.';

export const defaultSiteSettings: SiteSettings = {
  organisation: {
    name: 'Guide The Youth Foundation',
    shortName: 'GTYF',
    missionLine: MISSION_LINE,
    registrationNumber: '',
    foundedYear: 2023,
    location: 'Wamfie, Dormaa East, Bono Region, Ghana',
    logoMediaId: null,
  },
  contact: {
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
  },
  socials: {
    facebook: '',
    instagram: '',
    x: '',
    tiktok: '',
    youtube: '',
    linkedin: '',
  },
  bank: {
    accountName: '',
    bankName: '',
    accountNumber: '',
    branch: '',
    momoNumber: '',
    momoName: '',
  },
  navigation: {
    links: [
      { label: 'About', href: '/about' },
      { label: 'Our team', href: '/team' },
      { label: 'Programmes', href: '/programmes' },
      { label: 'Events', href: '/events' },
      { label: 'News', href: '/news' },
      { label: 'Get involved', href: '/get-involved' },
    ],
    donateLabel: 'Donate',
  },
  footer: {
    blurb:
      'Supporting needy and vulnerable school children and mentoring young people in Wamfie and nearby communities since 2023.',
    newsletterHeading: 'Hear from the classroom.',
    newsletterBody: 'Stories from each outreach and news of the next one. A few emails a year.',
    newsletterSuccess: "Thank you. We'll be in touch after our next outreach.",
    exploreHeading: 'Explore',
    exploreLinks: [
      { label: 'About us', href: '/about' },
      { label: 'Programmes', href: '/programmes' },
      { label: 'Events', href: '/events' },
      { label: 'Gallery', href: '/gallery' },
      { label: 'News', href: '/news' },
      { label: 'Our team', href: '/team' },
    ],
    involvedHeading: 'Get involved',
    involvedLinks: [
      { label: 'Donate', href: '/donate' },
      { label: 'Volunteer', href: '/get-involved#volunteer' },
      { label: 'Partner with us', href: '/get-involved#partner' },
      { label: 'Contact', href: '/contact' },
    ],
    contactHeading: 'Contact',
    paymentsNote: 'Payments secured by Paystack',
    copyright: '© {year} {name}',
  },
  seo: {
    defaultTitle: 'Guide The Youth Foundation',
    titleTemplate: '%s · Guide The Youth Foundation',
    defaultDescription:
      'Guide The Youth Foundation supports needy school children in Wamfie, Ghana with learning materials, uniforms and footwear, and mentors young people for life after school.',
    defaultOgImageId: null,
  },
  about: {
    eyebrow: 'About us',
    heading: 'Every child deserves a guide.',
    underlineWord: 'guide',
    intro: MISSION_LINE,
    storyHeading: 'Our story',
    story:
      'Guide The Youth Foundation began in 2023 in Wamfie, in the Dormaa East District of the Bono Region, with one simple belief: no child should be held back from school by what their family cannot afford.\n\nWe visit schools, speak with teachers and families, and give children the exercise books, uniforms and footwear they need to learn with dignity. We also mentor young people so they can see a future beyond the classroom.\n\nEvery gift we receive goes into the children’s hands, and we share what each outreach achieved.',
    whereHeading: 'Where we work',
    whereBody:
      'Since 2023 we have worked in rural communities around Wamfie in Dormaa East, Bono Region, and nearby communities including Sunuroase and Asuotiano. We support needy and vulnerable school children with learning materials, uniforms and footwear, and mentor JHS and SHS students and young people.',
    valuesHeading: 'What we stand for',
    selectionHeading: 'How we choose who we help',
    teamHeading: 'The people behind GTYF',
    teamLinkLabel: 'Meet the team',
    photoId: null,
  },
  pages: {
    programmes: {
      eyebrow: 'Programmes',
      heading: 'Four ways we guide.',
      underlineWord: 'guide',
      intro:
        'From exercise books and school shoes to mentorship for life after school, each programme meets a real need we have seen in the classroom.',
    },
    programme: {
      howItWorksLabel: 'How it works',
      eventsHeading: 'Where this programme has been',
      galleryHeading: 'In pictures',
      fundHeading: 'Fund this programme',
      fundBody: 'Choose this programme when you give and every cedi goes to its work.',
    },
    events: {
      eyebrow: 'Events',
      heading: 'Outreach, in the community.',
      underlineWord: 'community',
      intro: 'Every donation, mentorship session and community programme we have run, and the next ones we are planning.',
      upcomingTab: 'Upcoming',
      pastTab: 'Past',
      emptyUpcoming: "Our next outreach is being planned. Join the list and we'll tell you first.",
    },
    event: {
      highlightsHeading: 'Highlights',
      schoolsHeading: 'Schools visited',
      galleryHeading: 'Photos',
      supportLabel: 'Support this outreach',
      volunteerLabel: 'Volunteer for this event',
    },
    news: {
      eyebrow: 'News',
      heading: 'From the field.',
      underlineWord: 'field',
      intro: 'Updates from our outreaches and programmes.',
      empty: 'Stories from our outreaches will appear here soon.',
    },
    gallery: {
      eyebrow: 'Gallery',
      heading: 'Moments worth keeping.',
      underlineWord: 'keeping',
      intro: 'Photos from our outreaches, shared with the consent of the families and schools involved.',
      empty: 'Photos from our outreaches will appear here soon.',
    },
    team: {
      eyebrow: 'Our team',
      heading: 'The people who show up.',
      underlineWord: 'show up',
      intro: 'Teachers, mentors and volunteers who give their time so that every child in Wamfie can learn with confidence.',
      empty: 'Team profiles are coming soon.',
    },
    contact: {
      eyebrow: 'Contact',
      heading: "We'd love to hear from you.",
      underlineWord: 'hear',
      intro: 'Questions about our work, a school we should visit, or a way you would like to help. Write to us.',
      formHeading: 'Send a message',
      success: "Thank you. Your message has reached us and we'll reply soon.",
    },
    getInvolved: {
      eyebrow: 'Get involved',
      heading: 'Give your time, not just your money.',
      underlineWord: 'time',
      intro: 'Volunteers and partners help us reach more schools, more children and more young people.',
      volunteerHeading: 'Volunteer',
      volunteerIntro: 'Help at outreach days, mentor young people, or lend a skill. Tell us a little about yourself.',
      partnerHeading: 'Partner with us',
      partnerIntro: 'Businesses, schools, churches and organisations can sponsor a programme, an outreach or a school.',
      success: "Thank you. We've received your details and will be in touch.",
    },
  },
  common: {
    learnMore: 'Learn more',
    exploreProgramme: 'Explore the programme',
    readMore: 'Read more',
    allProgrammes: 'All programmes',
    allNews: 'All news',
    upcomingBadge: 'Upcoming',
    programmeEyebrow: 'Programme',
    upcomingEventEyebrow: 'Upcoming event',
    leaderBadge: 'Leader',
    joinList: 'Join the list',
    joiningLabel: 'Joining…',
    newsletterPlaceholder: 'you@example.com',
  },
  closing: {
    heading: 'Every child deserves a guide.',
    underlineWord: 'guide',
    body: MISSION_LINE,
  },
  donate: {
    pageEyebrow: 'Your gift goes to',
    eventEyebrow: 'Supporting this outreach',
    secureNote: 'Secure donation · Paystack',
    monthlyLabel: 'Monthly',
    oneTimeLabel: 'One-time',
    monthlyNote: 'every month · charged to a card',
    oneTimeNote: 'one-time · Mobile Money, card or bank',
    causeHeading: 'Where should it go?',
    impactLabel: 'Your impact',
    detailsHeading: 'Your details',
    mobileMoneyHint: 'Paying with Mobile Money? Give once instead',
    moreOptionsLabel: 'More options',
    giveLabel: 'Give',
    coverFeeText: 'So 100% of your gift reaches the children.',
    anonymousText: 'Your name is never shown publicly.',
    trustNote: 'We never see your card or Mobile Money details.',
  },
  thanks: {
    headline: 'Thank you, {name}!',
    introOnce: 'Your gift has been received.',
    introMonthly: 'Your monthly gift is set up.',
    receiptTitle: 'Official donation receipt',
    receivedFrom: 'Received with gratitude from',
    message:
      'Thank you, {name}. Your generosity helps a child in our community learn with confidence and dignity. We are truly grateful to have you walking with us.',
    signOff: 'The {org} team',
    shareLabel: 'Share my impact',
    friendLabel: 'Tell a friend',
    pdfLabel: 'Receipt PDF',
    emailNote: 'A copy of this receipt is on its way to your email.',
    monthlyHeading: 'Make it monthly and help every term.',
    monthlyBody: 'A monthly gift lets us plan each school term knowing the books and uniforms are covered.',
    whatsappText: 'I just gave {impact} to children in Wamfie, Ghana through {org}. Every child deserves a guide. Join me: {link}',
  },
  notFound: {
    eyebrow: 'Error 404',
    heading: 'This page has gone missing.',
    underlineWord: 'missing',
    body: "The link may be old, or the page may have moved. The children we serve haven't gone anywhere, though.",
    homeLabel: 'Go to the home page',
  },
};
