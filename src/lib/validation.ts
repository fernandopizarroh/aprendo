import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(128),
});

export const loginSchema = z.object({
  role: z.enum(["parent", "student"]),
  identifier: z.string().trim().min(1).max(254), // email (apoderado) o usuario (alumno)
  password: z.string().min(1).max(128),
});

export const createSubjectSchema = z.object({
  studentId: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  colorTag: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#4F46E5"),
  icon: z.string().trim().min(1).max(30).default("book"),
});

// HU-05: parámetros de la ruta (llegan como strings desde multipart)
export const createRouteSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  syllabusText: z.string().trim().min(10, "Escribe o pega el temario (mínimo 10 caracteres)").max(20_000),
  diagQuestions: z.coerce.number().int().min(5).max(15).default(10),
  challengeQuestions: z.coerce.number().int().min(10).max(30).default(15),
  unlockThreshold: z.coerce.number().int().min(1).max(100).default(90), // % del Diagnóstico para abrir el Desafío
  challengeThreshold: z.coerce.number().int().min(1).max(100).default(90), // % del Desafío para aprobar
});

const percent = z.coerce.number().int().min(1, "Debe ser entre 1 y 100").max(100, "Debe ser entre 1 y 100");

/** Cambiar los porcentajes de una ruta ya creada (no toca las cantidades de preguntas). */
export const updateRouteSettingsSchema = z
  .object({ unlockThreshold: percent.optional(), challengeThreshold: percent.optional() })
  .refine((v) => v.unlockThreshold !== undefined || v.challengeThreshold !== undefined, { message: "Indica al menos un porcentaje" });

export const updateStudentSchema = z.object({
  gradeLevel: z.string().trim().min(1, "Escribe el curso").max(40),
});

/** Editar el contexto de una ruta ya creada: texto, fotos y qué etapas regenerar con el contexto nuevo. */
export const updateRouteContextSchema = z.object({
  title: z.string().trim().min(1, "El título no puede quedar vacío").max(120).optional(),
  syllabusText: z.string().trim().min(10, "El temario debe tener al menos 10 caracteres").max(20_000).optional(),
  remove: z.array(z.string().min(1).max(200)).max(10).default([]),
  regenerate: z.array(z.enum(["review", "diagnostic", "challenge"])).max(3).default([]),
});

export const generateRouteSchema = z.object({
  // Sin etapa: reintenta solo lo que falta. "all": regenera todo.
  stage: z.enum(["review", "diagnostic", "challenge", "all"]).optional(),
});

export const createStudentSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_.-]{3,30}$/, "Usuario de 3 a 30 caracteres: letras, números, _ . -"),
  password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres").max(128),
  displayName: z.string().trim().min(1).max(60),
  gradeLevel: z.string().trim().min(1).max(40),
});
