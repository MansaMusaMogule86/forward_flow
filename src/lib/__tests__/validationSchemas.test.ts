// @ts-expect-error - test file uses dynamic patterns not fully typed
import { expect, test, describe } from "vitest";
import {
  authFormSchema,
  registrationFormSchema,
  contactFormSchema,
  consultationFormSchema
} from "../validationSchemas";

describe("authFormSchema", () => {
  describe("email validation", () => {
    test("should accept a valid email address", () => {
      const result = authFormSchema.safeParse({
        email: "test@example.com",
        password: "Password123"
      });
      expect(result.success).toBe(true);
    });

    test("should reject an invalid email address", () => {
      const result = authFormSchema.safeParse({
        email: "invalid-email",
        password: "Password123"
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.format().email?._errors).toContain("Please enter a valid email address");
      }
    });

    test("should reject an empty email", () => {
      const result = authFormSchema.safeParse({
        email: "",
        password: "Password123"
      });
      expect(result.success).toBe(false);
    });
  });

  describe("password validation", () => {
    test("should accept a valid password", () => {
      const result = authFormSchema.safeParse({
        email: "test@example.com",
        password: "Password123"
      });
      expect(result.success).toBe(true);
    });

    test("should reject a password shorter than 8 characters", () => {
      const result = authFormSchema.safeParse({
        email: "test@example.com",
        password: "Pass12"
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.format().password?._errors).toContain("Password must be at least 8 characters");
      }
    });

    test("should reject a password missing an uppercase letter", () => {
      const result = authFormSchema.safeParse({
        email: "test@example.com",
        password: "password123"
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.format().password?._errors).toContain("Password must contain at least one uppercase letter");
      }
    });

    test("should reject a password missing a lowercase letter", () => {
      const result = authFormSchema.safeParse({
        email: "test@example.com",
        password: "PASSWORD123"
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.format().password?._errors).toContain("Password must contain at least one lowercase letter");
      }
    });

    test("should reject a password missing a number", () => {
      const result = authFormSchema.safeParse({
        email: "test@example.com",
        password: "Password"
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.format().password?._errors).toContain("Password must contain at least one number");
      }
    });
  });
});

describe("registrationFormSchema", () => {
  test("should accept valid matching passwords", () => {
    const result = registrationFormSchema.safeParse({
      email: "test@example.com",
      password: "Password123",
      confirmPassword: "Password123"
    });
    expect(result.success).toBe(true);
  });

  test("should reject non-matching passwords", () => {
    const result = registrationFormSchema.safeParse({
      email: "test@example.com",
      password: "Password123",
      confirmPassword: "DifferentPassword123"
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.format().confirmPassword?._errors).toContain("Passwords don't match");
    }
  });

  test("should still validate password complexity", () => {
    const result = registrationFormSchema.safeParse({
      email: "test@example.com",
      password: "weak",
      confirmPassword: "weak"
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.format().password?._errors).toContain("Password must be at least 8 characters");
    }
  });
});

describe("contactFormSchema", () => {
  test("should accept valid contact data", () => {
    const result = contactFormSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      message: "This is a valid message of sufficient length."
    });
    expect(result.success).toBe(true);
  });

  test("should reject short names", () => {
    const result = contactFormSchema.safeParse({
      name: "A",
      email: "john@example.com",
      message: "This is a valid message of sufficient length."
    });
    expect(result.success).toBe(false);
  });

  test("should reject short messages", () => {
    const result = contactFormSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      message: "Short"
    });
    expect(result.success).toBe(false);
  });
});

describe("consultationFormSchema", () => {
  test("should accept valid consultation data", () => {
    const result = consultationFormSchema.safeParse({
      organization_name: "Test Org",
      contact_name: "Jane Smith",
      email: "jane@example.com"
    });
    expect(result.success).toBe(true);
  });

  test("should reject missing organization name", () => {
    const result = consultationFormSchema.safeParse({
      contact_name: "Jane Smith",
      email: "jane@example.com"
    });
    expect(result.success).toBe(false);
  });
});
