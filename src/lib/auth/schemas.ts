import { z } from "zod";

export const emailSchema = z.string().email("Enter a valid email address");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: emailSchema,
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Include an uppercase letter")
    .regex(/[0-9]/, "Include a number")
    .regex(/[^A-Za-z0-9]/, "Include a special character"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[0-9]/, "Include a number")
      .regex(/[^A-Za-z0-9]/, "Include a special character"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords must match",
    path: ["confirm"],
  });

export const onboardingSchema = z.object({
  name: z.string().min(1),
  goal: z.string().min(3),
  goalTemplate: z.string().optional().default(""),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  hoursPerDay: z.number().min(0.5).max(6).multipleOf(0.5),
  days: z.array(z.number().int().min(0).max(6)),
  deadline: z.string().nullable().optional(),
  skip: z.boolean().optional(),
});
