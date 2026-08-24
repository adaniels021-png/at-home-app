export type EmergencyContact = {
  id: string;
  childId: string;
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
  notes?: string;
};

export type LocationSourceType =
  | 'phone'
  | 'smartwatch'
  | 'item_tracker'
  | 'dedicated_gps'
  | 'external_app'
  | 'provider_service'
  | 'future_companion_device'
  | 'other';

export type LocationConnectionMode =
  | 'external_launch'
  | 'manual'
  | 'api'
  | 'companion_device';

export type LocationSource = {
  id: string;
  childId: string;
  label: string;
  sourceType: LocationSourceType;
  connectionMode: LocationConnectionMode;
  providerName?: string;
  deviceName?: string;
  launchUri?: string;
  webUrl?: string;
  notes?: string;
};

export type SafetyProfile = {
  id?: string;
  childId: string;
  preferredName?: string;
  photoPath?: string;
  physicalDescription?: {
    height?: string;
    weight?: string;
    hair?: string;
    eyes?: string;
    identifyingFeatures?: string;
  };
  communication?: {
    methods?: string[];
    methodsOther?: string;
    respondsToName?: 'yes' | 'sometimes' | 'not-usually' | 'unknown';
    canShareName?: 'yes' | 'sometimes' | 'not-usually' | 'unknown';
    understandingSupports?: string[];
    understandingSupportsOther?: string;
    helpfulPhrases?: string;
  };
  approach?: {
    guidance?: string[];
    guidanceOther?: string;
    notes?: string;
  };
  wandering?: {
    history?: 'yes' | 'no' | 'unknown';
    patterns?: string[];
    patternsOther?: string;
    destinations?: string[];
    destinationsOther?: string;
    safetyConcerns?: string[];
    safetyConcernsOther?: string;
  };
  regulation?: {
    harderTriggers?: string[];
    harderTriggersOther?: string;
    helpfulSupports?: string[];
    helpfulSupportsOther?: string;
  };
  importantHealthSafetyNotes?: string;
  additionalNotes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EmergencySessionType =
  | 'elopement'
  | 'aggression'
  | 'self-injury'
  | 'medical'
  | 'other';

export type EmergencySighting = {
  id: string;
  time: string;
  latitude?: number;
  longitude?: number;
  placeLabel?: string;
  notes?: string;
};

export type LastKnownLocation = {
  time?: string;
  latitude?: number;
  longitude?: number;
  placeLabel?: string;
  source?: 'caregiver' | 'reported-sighting';
};

export type LiveLocation = {
  latitude: number;
  longitude: number;
  recordedAt: string;
  sourceId: string;
};

export type EmergencySession = {
  id: string;
  childId: string;
  type: EmergencySessionType;
  startedAt: string;
  status: 'active' | 'resolved';
  currentClothing?: string;
  lastKnownLocation?: LastKnownLocation;
  liveLocation?: LiveLocation;
  sightings?: EmergencySighting[];
  resolvedAt?: string;
};

export type SafetyPermissions = {
  childId: string;
  caregiverUserId: string;
  canViewSafetyProfile: boolean;
  canEditSafetyProfile: boolean;
  canUseSafetyMode: boolean;
  canParticipateInSafetyIncident: boolean;
  receiveSafetyAlerts: boolean;
};

export type SafetyAccess = {
  canViewSafetyProfile: boolean;
  canViewEmergencyResponseData: boolean;
  canEditSafetyProfile: boolean;
  canUseSafetyMode: boolean;
  canParticipateInSafetyIncident: boolean;
  receiveSafetyAlerts: boolean;
};

export type SafetyIncidentEventType =
  | 'incident_started'
  | 'new_sighting'
  | 'danger_escalated'
  | 'child_found';
