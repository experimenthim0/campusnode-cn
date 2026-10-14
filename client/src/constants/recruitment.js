/**
 * CampusNode Recruitment Configuration
 * 
 * NOTE: Replace the placeholder URL below with the published Google Form link
 * for student applications (UI/UX Design, Frontend Development, Creative Design).
 * This constant is used by both the Homepage recruitment CTA and the Team page.
 */
export const RECRUITMENT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeIIYel-2TTOziP5GRI8yN0VgkJ5UY44YK7jtx6RQuzBpF4wg/viewform?usp=publish-editor';

export const RECRUITMENT_ROLES = [
  {
    id: 'ui-ux',
    title: 'UI/UX Designer',
    badge: 'Primary Role',
    description: 'Design clean, intuitive interfaces for event pages, festival themes, components, and campus experiences.',
    isPrimary: true,
  },
  {
    id: 'frontend',
    title: 'Frontend Developer',
    description: 'Help turn approved designs into responsive, accessible React interfaces.',
    isPrimary: false,
  },
  {
    id: 'creative',
    title: 'Creative Designer',
    description: 'Contribute event visuals, banners, illustrations, and other digital assets.',
    isPrimary: false,
  },
];
