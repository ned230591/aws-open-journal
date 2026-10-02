import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CookieService {
  getCookie(name: string): string | null {
    const cookies = document.cookie.split(';');
    const cookie = cookies.find((c) => c.trim().startsWith(`${name}=`));
    if (!cookie) {
      return null;
    }
    return decodeURIComponent(cookie.trim().substring(name.length + 1));
  }

  deleteCookie(name: string): void {
    document.cookie = `${name}=;` + `expires=Thu, 01 Jan 1970 00:00:00 UTC;` + `path=/;`;
  }

  setCookie(name: string, value: string, days = 30): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie =
      `${name}=${encodeURIComponent(value)};` +
      `expires=${expires.toUTCString()};` +
      `path=/;` +
      `SameSite=Lax`;
  }

  getJson<T>(name: string): T | null {
    const raw = this.getCookie(name);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  setJson<T>(name: string, value: T, days = 30): void {
    this.setCookie(name, JSON.stringify(value), days);
  }
}
