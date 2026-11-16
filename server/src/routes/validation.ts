/**
 * Type checks for request payloads. Bodies come from untrusted clients, so a
 * field being present says nothing about its type.
 */

import { GradeType, GRADE_TYPE } from "../models/Class";

export const isString = (value: unknown): value is string => typeof value === 'string';

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const isInteger = (value: unknown): value is number => Number.isInteger(value);

export const isGradeType = (value: unknown): value is GradeType => 
  typeof value === 'string' && (GRADE_TYPE as readonly string[]).includes(value);