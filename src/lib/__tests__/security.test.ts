// @ts-expect-error - test file uses dynamic mocking patterns not known to TS
import { expect, test, describe, beforeEach, afterEach, mock } from "bun:test";

// Mock dompurify before importing security.ts
mock.module("dompurify", () => {
  return {
    default: {
      sanitize: (s: string) => `sanitized: ${s}`,
    },
  };
});

// Mock crypto if needed (though Bun should have it)
if (!globalThis.crypto) {
  // @ts-expect-error - assigning crypto for test environments that lack it
  globalThis.crypto = {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
      return arr;
    },
  };
}

// Now import functions from security
const {
  RateLimiter,
  sanitizeInput,
  isValidEmail,
  isValidPhone,
  sanitizeFormData,
  maskContactInfo,
  generateCSRFToken,
  validateCSRFToken
} = await import("../security");

describe("Security Utilities", () => {

  describe("RateLimiter", () => {
    let limiter: InstanceType<typeof RateLimiter>;

    beforeEach(() => {
      limiter = new RateLimiter();
    });

    test("should allow requests under the limit", () => {
      const key = "test-key";
      for (let i = 0; i < 5; i++) {
        expect(limiter.isRateLimited(key, 5, 60000)).toBe(false);
      }
    });

    test("should rate limit after exceeding max attempts", () => {
      const key = "test-key";
      for (let i = 0; i < 5; i++) {
        limiter.isRateLimited(key, 5, 60000);
      }
      expect(limiter.isRateLimited(key, 5, 60000)).toBe(true);
    });

    test("should track different keys independently", () => {
      const key1 = "user1";
      const key2 = "user2";

      for (let i = 0; i < 5; i++) {
        limiter.isRateLimited(key1, 5, 60000);
      }

      expect(limiter.isRateLimited(key1, 5, 60000)).toBe(true);
      expect(limiter.isRateLimited(key2, 5, 60000)).toBe(false);
    });

    test("should reset after the window expires", async () => {
      const key = "test-reset";
      const windowMs = 50;

      for (let i = 0; i < 5; i++) {
        limiter.isRateLimited(key, 5, windowMs);
      }
      expect(limiter.isRateLimited(key, 5, windowMs)).toBe(true);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, windowMs + 10));

      expect(limiter.isRateLimited(key, 5, windowMs)).toBe(false);
    });
  });

  describe("Validation Functions", () => {
    test("isValidEmail should correctly validate emails", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name+tag@domain.co.uk")).toBe(true);
      expect(isValidEmail("invalid-email")).toBe(false);
      expect(isValidEmail("@missing-local.com")).toBe(false);
      expect(isValidEmail("missing-at.com")).toBe(false);
    });

    test("isValidPhone should correctly validate phone numbers", () => {
      expect(isValidPhone("1234567890")).toBe(true);
      expect(isValidPhone("+123456789012345")).toBe(true);
      expect(isValidPhone("123-456-7890")).toBe(true);
      expect(isValidPhone("(123) 456-7890")).toBe(true);
      expect(isValidPhone("invalid-phone")).toBe(false);
    });
  });

  describe("Sanitization Functions", () => {
    test("sanitizeInput should call DOMPurify and trim input", () => {
      const input = "  <script>alert('xss')</script>  ";
      const result = sanitizeInput(input);
      expect(result).toContain("sanitized:");
      expect(result).toContain("<script>alert('xss')</script>");
    });

    test("sanitizeFormData should sanitize all string fields", () => {
      const formData = {
        name: "  John Doe  ",
        email: "test@example.com",
        count: 5,
        active: true
      };
      const result = sanitizeFormData(formData);
      expect(result.name).toBe("sanitized: John Doe");
      expect(result.email).toBe("sanitized: test@example.com");
      expect(result.count).toBe(5);
      expect(result.active).toBe(true);
    });
  });

  describe("maskContactInfo", () => {
    test("should mask emails correctly", () => {
      expect(maskContactInfo("test@example.com")).toBe("te***@example.com");
      expect(maskContactInfo("a@b.com")).toBe("***@b.com"); // local.length <= 2
    });

    test("should mask phone numbers correctly", () => {
      expect(maskContactInfo("1234567890")).toBe("123***90");
      expect(maskContactInfo("+1 (123) 456-7890")).toBe("+11***90");
    });

    test("should handle short strings and empty input", () => {
      expect(maskContactInfo("")).toBe("");
      expect(maskContactInfo("abcde")).toBe("ab***"); // length > 4
      expect(maskContactInfo("abc")).toBe("***"); // length <= 4
    });
  });

  describe("CSRF Tokens", () => {
    test("generateCSRFToken should return a 64-character hex string", () => {
      const token = generateCSRFToken();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    test("validateCSRFToken should correctly compare tokens", () => {
      const token1 = "token123";
      const token2 = "token123";
      const token3 = "different";
      expect(validateCSRFToken(token1, token2)).toBe(true);
      expect(validateCSRFToken(token1, token3)).toBe(false);
    });
  });
});
