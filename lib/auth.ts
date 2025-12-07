// =====================================================
// 인증 유틸리티 함수
// 로그인, 로그아웃, 역할 확인 등의 기능을 제공합니다.
// =====================================================

import { supabaseBrowser } from "./supabase-browser";
import type { User } from "@supabase/supabase-js";

// 역할 타입 정의
export type UserRole = "admin" | "client";

// 사용자 정보 타입
export interface UserInfo {
  user: User;
  role: UserRole;
  companyName: string | null;
}

/**
 * 이메일과 비밀번호로 로그인합니다.
 * 
 * @param email - 사용자 이메일
 * @param password - 비밀번호
 * @returns 로그인 결과
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabaseBrowser.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user };
}

/**
 * 로그아웃합니다.
 */
export async function signOut() {
  const { error } = await supabaseBrowser.auth.signOut();
  
  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 현재 로그인된 사용자를 가져옵니다.
 * 
 * @returns 현재 사용자 또는 null
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabaseBrowser.auth.getUser();
  return user;
}

/**
 * 현재 사용자의 역할을 가져옵니다.
 * 
 * @returns 사용자 역할 정보 또는 null
 */
export async function getUserRole(): Promise<{ role: UserRole; companyName: string | null } | null> {
  const user = await getCurrentUser();
  
  if (!user) return null;

  const { data, error } = await supabaseBrowser
    .from("user_roles")
    .select("role, company_name")
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    console.error("역할 조회 오류:", error);
    return null;
  }

  return {
    role: data.role as UserRole,
    companyName: data.company_name,
  };
}

/**
 * 현재 사용자의 전체 정보를 가져옵니다.
 * 
 * @returns 사용자 정보 또는 null
 */
export async function getUserInfo(): Promise<UserInfo | null> {
  const user = await getCurrentUser();
  
  if (!user) return null;

  const roleInfo = await getUserRole();
  
  if (!roleInfo) return null;

  return {
    user,
    role: roleInfo.role,
    companyName: roleInfo.companyName,
  };
}

/**
 * 사용자가 관리자인지 확인합니다.
 * 
 * @returns 관리자 여부
 */
export async function isAdmin(): Promise<boolean> {
  const roleInfo = await getUserRole();
  return roleInfo?.role === "admin";
}

/**
 * 사용자가 고객사인지 확인합니다.
 * 
 * @returns 고객사 여부
 */
export async function isClient(): Promise<boolean> {
  const roleInfo = await getUserRole();
  return roleInfo?.role === "client";
}

/**
 * 인증 상태 변경 리스너를 등록합니다.
 * 
 * @param callback - 상태 변경 시 호출될 콜백
 * @returns 구독 해제 함수
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
    (event, session) => {
      callback(session?.user ?? null);
    }
  );

  return () => subscription.unsubscribe();
}

/**
 * 비밀번호를 변경합니다.
 * 
 * @param newPassword - 새 비밀번호
 * @returns 변경 결과
 */
export async function updatePassword(newPassword: string) {
  const { error } = await supabaseBrowser.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

