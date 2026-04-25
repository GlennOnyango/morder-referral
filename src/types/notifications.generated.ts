/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * Types generated from NRS Notifications API
 * Swagger: https://nrs-notifications-production.up.railway.app/swagger/doc.json
 */

export interface Notification {
  createdAt?: string;
  eventType?: string;
  id?: string;
  isRead?: boolean;
  payload?: Record<string, unknown>;
  referralCode?: string;
  referralId?: string;
  sourceOrganizationId?: string;
  targetFacilityCode?: string;
  targetOrganizationId?: string;
  updatedAt?: string;
}

export interface NotificationListResponse {
  items?: Notification[];
}

export interface NotificationReadResponse extends Notification {}

export interface ErrorResponse {
  error?: string;
  message?: string;
}

export interface StatusResponse {
  message?: string;
  status?: string;
}
