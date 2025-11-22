/**
 * Supabase Auth Service
 *
 * Handles authentication using Supabase Auth with Google OAuth
 */

import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "@app/lib/supabase";

export interface AuthResult {
  session: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    user: {
      id: string;
      email?: string;
      user_metadata: {
        name?: string;
        avatar_url?: string;
      };
    };
  };
}

export class SupabaseAuthService {
  /**
   * Sign in with Google using Supabase Auth
   */
  static async signInWithGoogle(): Promise<AuthResult> {
    try {
      const redirectUrl = makeRedirectUri({
        scheme: "sampyeongoh",
        path: "auth/callback",
      });

      console.log("[SupabaseAuth] Redirect URL:", redirectUrl);

      // Start OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("No authorization URL received");

      console.log("[SupabaseAuth] Opening browser for OAuth...");
      console.log("[SupabaseAuth] Auth URL:", data.url);
      console.log("[SupabaseAuth] Expected redirect URL:", redirectUrl);

      // Open browser for OAuth with timeout
      console.log("[SupabaseAuth] Waiting for OAuth callback...");
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("OAuth 타임아웃: 브라우저에서 리다이렉트가 발생하지 않았습니다. Supabase 대시보드에서 Redirect URL이 올바르게 설정되었는지 확인하세요."));
        }, 120000); // 2분 타임아웃
      });

      const authPromise = WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      
      const result = await Promise.race([authPromise, timeoutPromise]);

      console.log("[SupabaseAuth] OAuth result received");
      console.log("[SupabaseAuth] OAuth result type:", result.type);

      if (result.type !== "success") {
        // 더 자세한 에러 정보 제공
        const errorMessage = result.type === "dismiss" 
          ? "OAuth가 취소되었거나 브라우저가 닫혔습니다. 리다이렉트 URL이 올바르게 설정되었는지 확인하세요."
          : `OAuth cancelled or failed: ${result.type}`;
        throw new Error(errorMessage);
      }

      // Type guard: result.type === "success"일 때만 url 속성 존재
      const resultUrl = "url" in result ? result.url : null;
      
      if (!resultUrl) {
        throw new Error("OAuth 성공했지만 리다이렉트 URL을 받지 못했습니다.");
      }

      console.log("[SupabaseAuth] OAuth result URL:", resultUrl);
      console.log("[SupabaseAuth] OAuth successful, exchanging code...");

      // Extract code from URL
      const url = Linking.parse(resultUrl);
      console.log("[SupabaseAuth] Parsed URL:", JSON.stringify(url, null, 2));
      
      // Check for error parameters
      if (url.queryParams?.error) {
        const errorDescription = url.queryParams.error_description || "No description";
        throw new Error(`OAuth Error from provider: ${url.queryParams.error} (${errorDescription})`);
      }

      let code = url.queryParams?.code as string;

      // Fallback: Check if code is in the hash (Implicit Flow or misconfiguration)
      if (!code && resultUrl.includes("#")) {
        console.log("[SupabaseAuth] Checking hash for code...");
        // Simple manual parsing for hash params
        const hashPart = resultUrl.split("#")[1];
        const hashParams = new URLSearchParams(hashPart);
        
        // Try to find code or access_token in hash
        if (hashParams.has("code")) {
          code = hashParams.get("code") as string;
          console.log("[SupabaseAuth] Found code in hash");
        } else if (hashParams.has("access_token") && hashParams.has("refresh_token")) {
          // Implicit flow return (access_token directly)
          console.log("[SupabaseAuth] Found access_token in hash (Implicit Flow)");
          const accessToken = hashParams.get("access_token") as string;
          const refreshToken = hashParams.get("refresh_token") as string;
          
          // Manually set session
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (sessionError) throw sessionError;
          if (!sessionData?.session) throw new Error("Failed to set session from implicit flow");
          
          console.log("[SupabaseAuth] Authentication complete (Implicit)");
          return { session: sessionData.session };
        } else if (hashParams.has("error")) {
           const errorDescription = hashParams.get("error_description") || "No description";
           throw new Error(`OAuth Error in hash: ${hashParams.get("error")} (${errorDescription})`);
        }
      }

      if (!code) {
        console.error("[SupabaseAuth] Missing code in params:", url.queryParams);
        throw new Error("No authorization code received. URL parameters: " + JSON.stringify(url.queryParams));
      }

      // Exchange code for session
      const { data: sessionData, error: sessionError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) throw sessionError;
      if (!sessionData?.session) throw new Error("No session received");

      console.log("[SupabaseAuth] Authentication complete");
      console.log("[SupabaseAuth] User ID:", sessionData.session.user.id);

      return {
        session: sessionData.session,
      };
    } catch (error) {
      console.error("[SupabaseAuth] Error:", error);
      throw error;
    }
  }

  /**
   * Sign out
   */
  static async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  /**
   * Get current session
   */
  static async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  /**
   * Refresh session
   */
  static async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  }
}
