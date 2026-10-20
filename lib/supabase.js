/**
 * Supabase Data & Auth Adapter (Zero-dependency REST client)
 * Combina integración con Supabase en la nube y fallback a TenantRepository local.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export class SupabaseAdapter {
  constructor({ url, apiKey, tenantRepo }) {
    this.url = (url || process.env.SUPABASE_URL || "").replace(/\/$/, "");
    this.key = apiKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
    this.repo = tenantRepo;
    this.isConfigured = Boolean(this.url && this.key);
  }

  // Hash de contraseñas seguro con salt (PBKDF2)
  static hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return `${salt}:${hash}`;
  }

  static verifyPassword(password, stored) {
    if (!stored || !stored.includes(":")) return false;
    const [salt, hash] = stored.split(":");
    const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return hash === testHash;
  }

  // Registro de usuario
  async register({ email, password }) {
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) throw new Error("Correo electrónico inválido");
    if (!password || password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");

    // Supabase Cloud
    if (this.isConfigured) {
      try {
        const resp = await fetch(`${this.url}/auth/v1/signup`, {
          method: "POST",
          headers: {
            apikey: this.key,
            Authorization: `Bearer ${this.key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: cleanEmail, password }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.msg || data.error_description || "Error en registro de Supabase");
        
        const userId = data.user?.id || cleanEmail.replace(/[^a-z0-9_-]/g, "_");

        // Insertar perfil en public.profiles de Supabase
        await this.syncProfile(userId, {
          email: cleanEmail,
          xp: 0,
          level: 1,
          streak: 0,
        });

        // Asegurar que el almacén local del tenant también tenga su perfil inicializado
        const store = this.repo.getStore(userId);
        store.data.profile.email = cleanEmail;
        store.data.profile.auth = {
          registeredAt: Date.now(),
          provider: "supabase",
        };
        store.save();

        return {
          id: userId,
          email: cleanEmail,
          provider: "supabase",
        };
      } catch (err) {
        console.warn("Fallo registro en Supabase, usando persistencia local:", err.message);
      }
    }

    // Persistencia Local Multi-Tenant
    const tenantId = cleanEmail.replace(/[^a-z0-9_-]/g, "_");
    const store = this.repo.getStore(tenantId);
    if (store.data.profile.auth?.hash) {
      throw new Error("El usuario ya se encuentra registrado.");
    }
    store.data.profile.email = cleanEmail;
    store.data.profile.auth = {
      hash: SupabaseAdapter.hashPassword(password),
      registeredAt: Date.now(),
    };
    store.save();

    return {
      id: tenantId,
      email: cleanEmail,
      provider: "local",
    };
  }

  // Inicio de sesión
  async login({ email, password }) {
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) throw new Error("Falta el correo electrónico");

    // Supabase Cloud
    if (this.isConfigured) {
      try {
        const resp = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            apikey: this.key,
            Authorization: `Bearer ${this.key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: cleanEmail, password }),
        });
        const data = await resp.json();
        if (resp.ok && data.access_token) {
          const userId = data.user?.id || cleanEmail.replace(/[^a-z0-9_-]/g, "_");
          await this.syncProfile(userId, { email: cleanEmail });
          return {
            id: userId,
            email: cleanEmail,
            token: data.access_token,
            provider: "supabase",
          };
        }
      } catch (err) {
        console.warn("Fallo login en Supabase, verificando almacén local:", err.message);
      }
    }

    // Persistencia Local
    const tenantId = cleanEmail.replace(/[^a-z0-9_-]/g, "_");
    const store = this.repo.getStore(tenantId);
    const auth = store.data.profile.auth;
    if (!auth || !auth.hash) {
      // Auto-registro en primer login si no existe
      return this.register({ email: cleanEmail, password });
    }

    if (!SupabaseAdapter.verifyPassword(password, auth.hash)) {
      throw new Error("Contraseña incorrecta. Verifica tus datos e intenta nuevamente.");
    }

    return {
      id: tenantId,
      email: cleanEmail,
      provider: "local",
    };
  }

  // Recuperación de contraseña por correo
  async recoverPassword({ email }) {
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      throw new Error("Ingresa un correo electrónico válido para recuperar tu contraseña.");
    }

    // Supabase Cloud Auth Password Recovery
    if (this.isConfigured) {
      try {
        const resp = await fetch(`${this.url}/auth/v1/recover`, {
          method: "POST",
          headers: {
            apikey: this.key,
            Authorization: `Bearer ${this.key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: cleanEmail }),
        });
        if (resp.ok) {
          return {
            ok: true,
            message: "Te hemos enviado un enlace a tu correo para restablecer tu contraseña.",
          };
        }
      } catch (err) {
        console.warn("Fallo recovery en Supabase, usando flujo local:", err.message);
      }
    }

    // Flujo local / desarrollo: generar token seguro de restablecimiento
    const tenantId = cleanEmail.replace(/[^a-z0-9_-]/g, "_");
    const store = this.repo.getStore(tenantId);
    const resetToken = crypto.randomBytes(20).toString("hex");
    if (!store.data.profile.auth) store.data.profile.auth = {};
    store.data.profile.auth.resetToken = resetToken;
    store.data.profile.auth.resetTokenExpires = Date.now() + 3600000; // 1 hora
    store.save();

    return {
      ok: true,
      message: "Te hemos enviado las instrucciones a tu correo para restablecer tu contraseña.",
      resetToken, // En dev/test permite verificar el flujo de punta a punta
    };
  }

  // Guardar conversación en el historial
  async saveConversation(tenantId, conversation) {
    if (this.isConfigured) {
      try {
        await fetch(`${this.url}/rest/v1/conversations`, {
          method: "POST",
          headers: {
            apikey: this.key,
            Authorization: `Bearer ${this.key}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            user_id: tenantId,
            lang: conversation.lang,
            level: conversation.level,
            mission: conversation.mission,
            turns: conversation.turns,
            created_at: new Date().toISOString(),
          }),
        });
      } catch (e) {
        console.warn("Error guardando conversación en Supabase:", e.message);
      }
    }

    // Guardado local
    const store = this.repo.getStore(tenantId);
    if (!Array.isArray(store.data.conversations)) store.data.conversations = [];
    store.data.conversations.unshift({
      id: Math.random().toString(36).slice(2, 10),
      ...conversation,
      createdAt: Date.now(),
    });
    if (store.data.conversations.length > 50) store.data.conversations.splice(50);
    store.save();
  }

  // Guardar o actualizar perfil en la tabla public.profiles de Supabase
  async syncProfile(tenantId, profileData = {}) {
    if (!this.isConfigured || !tenantId) return;
    try {
      await fetch(`${this.url}/rest/v1/profiles`, {
        method: "POST",
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          id: tenantId,
          email: profileData.email || "",
          xp: profileData.xp || 0,
          level: profileData.level || 1,
          streak: profileData.streak || 0,
          updated_at: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.warn("Error sincronizando perfil en Supabase:", e.message);
    }
  }
}
