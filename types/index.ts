// ─── DB-derived types ─────────────────────────────────────────────────────────

export type Role             = "ADMIN" | "COACH" | "TRAINEE";
export type MembershipStatus = "ACTIVE" | "EXPIRED" | "FROZEN" | "CANCELLED";
export type PaymentStatus    = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type FieldType        = "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT";
export type TargetObject     = "USER" | "SESSION" | "MEMBERSHIP" | "WORKOUT_BOOKLET";
export type ProductType      =
  | "PERSONAL_TRAINING"
  | "GROUP_SESSION"
  | "MEMBERSHIP_PLAN"
  | "NUTRITION_PLAN"
  | "OTHER";

// ─── API Response shape ───────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// ─── Client (User with relations) ────────────────────────────────────────────

export interface ClientProfile {
  id:        string;
  email:     string;
  role:      Role;
  isActive:  boolean;
  createdAt: string;
  profile: {
    firstName:  string;
    lastName:   string;
    phone:      string | null;
    birthDate:  string | null;
    gender:     string | null;
    notes:      string | null;
  } | null;
  memberships: {
    id:        string;
    status:    MembershipStatus;
    endDate:   string;
    plan: { name: string; price: string };
  }[];
  customValues: {
    fieldDefId: string;
    value:      string;
    fieldDef: {
      label:     string;
      fieldType: FieldType;
    };
  }[];
}

// ─── Custom Field ─────────────────────────────────────────────────────────────

export interface CustomField {
  id:           string;
  name:         string;
  label:        string;
  fieldType:    FieldType;
  options:      string[] | null;
  targetObject: TargetObject;
  required:     boolean;
  order:        number;
  isActive:     boolean;
  createdAt:    string;
}

// ─── Product ─────────────────────────────────────────────────────────────────

export interface Product {
  id:          string;
  name:        string;
  description: string | null;
  type:        ProductType;
  price:       string;
  currency:    string;
  isActive:    boolean;
  createdAt:   string;
}

// ─── Coach ────────────────────────────────────────────────────────────────────

export interface CoachProfile {
  id:       string;
  email:    string;
  isActive: boolean;
  profile: {
    firstName: string;
    lastName:  string;
    phone:     string | null;
  } | null;
  coachProfile: {
    bio:             string | null;
    specializations: string[];
    certifications:  string[];
  } | null;
}

// ─── Forms ────────────────────────────────────────────────────────────────────

export interface ClientFormData {
  email:        string;
  firstName:    string;
  lastName:     string;
  phone:        string;
  birthDate:    string;
  gender:       string;
  notes:        string;
  role:         Role;
  // health
  hasConditions:     boolean;
  conditions:        string;
  injuries:          string;
  medications:       string;
  physicianApproval: boolean;
  // custom fields: { [fieldDefId]: string }
  customFields: Record<string, string>;
}

export interface CustomFieldFormData {
  name:        string;
  label:       string;
  fieldType:   FieldType;
  options:     string;   // comma-separated for SELECT
  targetObject: TargetObject;
  required:    boolean;
  order:       number;
}

export interface ProductFormData {
  name:        string;
  description: string;
  type:        ProductType;
  price:       string;
  currency:    string;
}
