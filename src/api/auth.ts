import { invoke } from '@tauri-apps/api/core';

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
  id: number;
}

export async function initiateLogin(): Promise<DeviceCodeResponse> {
  return invoke<DeviceCodeResponse>('initiate_login');
}

export async function pollLogin(
  deviceCode: string,
  interval: number,
): Promise<GitHubUser> {
  return invoke<GitHubUser>('poll_login', { deviceCode, interval });
}

export async function logout(): Promise<void> {
  return invoke<void>('logout');
}

export async function getAuthState(): Promise<GitHubUser | null> {
  return invoke<GitHubUser | null>('get_auth_state');
}
