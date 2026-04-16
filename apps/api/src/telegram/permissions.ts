import type { TelegramRole } from './repositories';

export type MiniPermissionKey =
  | 'can_view_profile'
  | 'can_edit_profile'
  | 'can_manage_calendar'
  | 'can_view_analytics'
  | 'can_manage_team'
  | 'can_manage_subscription'
  | 'can_manage_integrations'
  | 'can_archive_profile'
  | 'can_create_profile';

export type MiniPermissions = Record<MiniPermissionKey, boolean>;

export const OWNER_MINI_PERMISSIONS: MiniPermissions = {
  can_view_profile: true,
  can_edit_profile: true,
  can_manage_calendar: true,
  can_view_analytics: true,
  can_manage_team: true,
  can_manage_subscription: true,
  can_manage_integrations: true,
  can_archive_profile: true,
  can_create_profile: true,
};

export const ASSISTANT_MINI_PERMISSIONS: MiniPermissions = {
  can_view_profile: true,
  can_edit_profile: false,
  can_manage_calendar: true,
  can_view_analytics: false,
  can_manage_team: false,
  can_manage_subscription: false,
  can_manage_integrations: false,
  can_archive_profile: false,
  can_create_profile: false,
};

export function permissionsForTelegramRole(role: TelegramRole | null | undefined): MiniPermissions {
  if (role === 'owner') return OWNER_MINI_PERMISSIONS;
  if (role === 'assistant') return ASSISTANT_MINI_PERMISSIONS;
  return {
    ...ASSISTANT_MINI_PERMISSIONS,
    can_manage_calendar: false,
  };
}

export function hasMiniPermission(
  role: TelegramRole | null | undefined,
  permission: MiniPermissionKey,
): boolean {
  return permissionsForTelegramRole(role)[permission];
}
