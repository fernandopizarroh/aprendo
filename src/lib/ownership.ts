import { db } from "./db";

/** Ruta solo si pertenece a un alumno del apoderado. */
export function findOwnedRoute(routeId: string, parentId: string) {
  return db.learningRoute.findFirst({ where: { id: routeId, subject: { student: { parentId } } } });
}

export function findOwnedStudent(studentId: string, parentId: string) {
  return db.student.findFirst({ where: { id: studentId, parentId } });
}

export function findOwnedSubject(subjectId: string, parentId: string) {
  return db.subject.findFirst({ where: { id: subjectId, student: { parentId } } });
}
