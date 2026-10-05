import { supabase } from './client';

export type OperationResult = {
  status: 'ok' | 'replayed' | 'already_checked_in' | 'already_claimed';
  occurredAt?: string;
};

function operationId() {
  return crypto.randomUUID();
}

function messageFrom(error: { message?: string } | null) {
  const message = error?.message ?? 'The operation could not be completed.';
  if (message.includes('FORBIDDEN')) return 'You do not have permission for this action.';
  if (message.includes('NOT_CHECKED_IN')) return 'Check-in is required before this item can be claimed.';
  return message;
}

export async function recordCheckIn(input: {
  eventId: string;
  memberId: string;
  device?: string;
  clientEventId?: string;
}) {
  const { data, error } = await (supabase as any).rpc('record_check_in', {
    p_event: input.eventId,
    p_member: input.memberId,
    p_method: 'biometric',
    p_device: input.device ?? 'demo-biometric-bridge',
    p_client_event: input.clientEventId ?? operationId(),
  });
  if (error) throw new Error(messageFrom(error));
  return data as OperationResult;
}

export async function claimResource(input: {
  eventId: string;
  memberId: string;
  resource: 'food' | 'souvenir' | 'entry';
  slot: string;
  device?: string;
  clientEventId?: string;
}) {
  const { data, error } = await (supabase as any).rpc('claim_resource', {
    p_event: input.eventId,
    p_member: input.memberId,
    p_resource: input.resource,
    p_slot: input.slot,
    p_device: input.device ?? 'staff-console',
    p_client_event: input.clientEventId ?? operationId(),
  });
  if (error) throw new Error(messageFrom(error));
  return data as OperationResult;
}

export async function recordParticipation(input: {
  eventId: string;
  memberId: string;
  activityId: string;
  clientEventId?: string;
}) {
  const { data, error } = await (supabase as any).rpc('record_participation', {
    p_event: input.eventId,
    p_member: input.memberId,
    p_activity: input.activityId,
    p_client_event: input.clientEventId ?? operationId(),
  });
  if (error) throw new Error(messageFrom(error));
  return data as OperationResult;
}
