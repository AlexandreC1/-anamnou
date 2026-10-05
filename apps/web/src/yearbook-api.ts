import type { Role } from './class-api';
export type Asset = { id: string; alt: string; width: number; height: number };
export type Profile = {
  version: number;
  membershipId: string;
  displayName: string;
  nickname: string | null;
  bio: string | null;
  quote: string | null;
  activities: string | null;
  aspiration: string | null;
  contact?: string | null;
  contactVisibility?: 'PRIVATE' | 'CLASS';
  visibility: 'PRIVATE' | 'CLASS';
  photoAssetId: string | null;
  photo?: Asset | null;
};
export const sectionTypes = [
  'COVER',
  'MESSAGE',
  'CLASS_PHOTO',
  'MEMBERS',
  'STAFF',
  'QUOTES',
  'GALLERY',
  'ACKNOWLEDGEMENTS',
  'GRADUATION',
] as const;
export type SectionType = (typeof sectionTypes)[number];
export type Section = {
  id: string;
  type: SectionType;
  title: string;
  body: string;
  media: { asset: Asset }[];
};
export type Yearbook = {
  version: number;
  title: string;
  theme: 'PAPER' | 'INK' | 'GARDEN';
  editable: boolean;
  sections: Section[];
  class: { name: string; graduationYear: number; school: { name: string } };
};
export type ReaderMember = Pick<
  Profile,
  | 'membershipId'
  | 'displayName'
  | 'nickname'
  | 'bio'
  | 'quote'
  | 'activities'
  | 'aspiration'
> & { photo: Asset | null; membership: { role: Role } };
