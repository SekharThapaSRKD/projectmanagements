import { nanoid } from 'nanoid';

export const createId = (prefix: string) => `${prefix}_${nanoid(10)}`;

export const avatarFor = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map(part => part.slice(0, 1))
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'TF';
