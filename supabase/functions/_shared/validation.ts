import { z } from 'npm:zod@3.24.1';

const uuid = z.string().uuid();
const optionalUuid = z.union([uuid, z.literal('')]).optional();

export const registrationRequestSchema = z.object({
  token: z.string().min(16).max(256),
  source: z.enum(['home', 'onsite']),
  payload: z.object({
    id: optionalUuid,
    full_name: z.string().trim().min(2).max(160),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(40).optional(),
    gender: z.enum(['male', 'female']).optional(),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    address: z.string().trim().max(500).optional(),
    occupation: z.string().trim().max(160).optional(),
    emergency_contact: z.string().trim().max(160).optional(),
    photo_path: z.string().trim().max(500).optional(),
    band_id: optionalUuid,
    church_location_id: optionalUuid,
    church_group_id: optionalUuid,
    department_ids: z.array(uuid).max(20).default([]),
    is_first_timer: z.boolean().optional(),
    wants_permanent: z.boolean().optional(),
    consent: z.literal(true),
    guardian_consent: z.boolean().optional(),
    client_created_at: z.string().datetime().optional(),
    leadership_role: z.string().trim().max(160).optional(),
    website: z.string().max(200).optional().default(''),
  }).strict(),
}).strict();

export const uploadRequestSchema = z.object({
  action: z.enum(['url', 'attach']),
  kind: z.enum(['photo', 'tag']),
  member_id: uuid,
  status_token: z.string().min(32).max(128),
  path: z.string().max(500).optional(),
}).strict();
