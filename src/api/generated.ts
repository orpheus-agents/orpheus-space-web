// Generated from api/upstream.yaml by npm run generate:api. Do not edit.
export type paths = {
    "/api/v1/schedules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List schedules */
        get: operations["ListSchedules"];
        put?: never;
        /**
         * Create a schedule
         * @description SAML non-admins can create only for their own email; an omitted owner is filled from the session. Explicit null or another owner returns 403 schedule_forbidden. Bearer, anonymous and admins have full access.
         */
        post: operations["CreateSchedule"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/schedules/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["ID"];
            };
            cookie?: never;
        };
        /** Get a schedule including deleted records */
        get: operations["GetSchedule"];
        put?: never;
        post?: never;
        /**
         * Soft delete a schedule
         * @description SAML non-admins can delete only their own schedules. Denied writes return 403 schedule_forbidden.
         */
        delete: operations["DeleteSchedule"];
        options?: never;
        head?: never;
        /**
         * Update selected schedule fields
         * @description SAML non-admins can update only their own schedules and cannot change or clear the owner. Denied writes return 403 schedule_forbidden.
         */
        patch: operations["UpdateSchedule"];
        trace?: never;
    };
    "/api/v1/schedules/profiles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Orpheus profiles and the creation default */
        get: operations["GetProfiles"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/schedules/templates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Orpheus templates and the creation default */
        get: operations["GetTemplates"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/schedules/settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get allowed environment names */
        get: operations["GetSettings"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/schedules/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Preview five future cron occurrences */
        post: operations["PreviewSchedule"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get browser access state */
        get: operations["GetAuthSession"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/schedules/{id}/occurrences": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["ID"];
            };
            cookie?: never;
        };
        /** Read stored history without calling the core */
        get: operations["ListOccurrences"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/schedules/{id}/occurrences/{occurrence_id}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["ID"];
                occurrence_id: components["parameters"]["OccurrenceID"];
            };
            cookie?: never;
        };
        /** Read a stored occurrence without calling the core */
        get: operations["GetOccurrence"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/schedules/{id}/occurrences/{occurrence_id}/result": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["ID"];
                occurrence_id: components["parameters"]["OccurrenceID"];
            };
            cookie?: never;
        };
        /** Explicitly fetch the current result from the Orpheus core */
        get: operations["GetOccurrenceResult"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/schedules/{id}/reset-session": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["ID"];
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Detach the reusable session for the next occurrence
         * @description SAML non-admins can reset only their own schedules. Denied writes return 403 schedule_forbidden.
         */
        post: operations["ResetSession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Start SP-initiated SAML login
         * @description SAML mode only; otherwise 404 auth_not_enabled. next must be a local absolute path (not auth routes); default /api/v1/auth/session. No Host or proxy header trust.
         */
        get: operations["BrowserLogin"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/callback": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Consume a signed SAML HTTP-POST response
         * @description SAML mode only. Body is application/x-www-form-urlencoded with exactly one SAMLResponse and RelayState, at most 1 MiB. One-time request and browser nonce are required. Unsolicited responses are rejected.
         */
        post: operations["BrowserCallback"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Revoke the local browser session
         * @description Requires the configured Origin and X-Orpheus-CSRF header equal to 1. Idempotent; clears the cookie. Does not terminate the IdP session.
         */
        post: operations["BrowserLogout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/saml/metadata": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read service provider metadata */
        get: operations["SamlMetadata"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
};
export type webhooks = Record<string, never>;
export type components = {
    schemas: {
        Problem: {
            error: {
                code: string;
                message: string;
                phase: string | null;
                details: {
                    path: string[];
                    code: string;
                }[];
            };
        };
        /** @enum {string} */
        Status: Status;
        /** @enum {string} */
        SessionMode: SessionMode;
        EnvFrom: string[];
        Profile: {
            name: string;
            description: string | null;
            /** @enum {string} */
            harness: ProfileHarness;
            model: string | null;
            codex: components["schemas"]["CodexProfile"];
            instructions: string;
            is_default: boolean;
        };
        CodexProfile: {
            /** @enum {string} */
            effort?: CodexProfileEffort;
            /** @enum {string} */
            summary?: CodexProfileSummary;
            /** @enum {string} */
            personality?: CodexProfilePersonality;
            service_tier?: string;
        };
        Profiles: {
            items: components["schemas"]["Profile"][];
        };
        Template: {
            name: string;
            description: string | null;
            is_default: boolean;
        };
        Templates: {
            items: components["schemas"]["Template"][];
        };
        CreateSchedule: {
            /** @description Exact Orpheus profile name; creation uses the configured default when omitted. */
            profile?: string;
            /** @description Exact Orpheus template name; creation uses the configured default when omitted. */
            template?: string;
            name: string;
            prompt: string;
            cron: string;
            timezone: string;
            status?: components["schemas"]["Status"];
            model?: string | null;
            session_mode?: components["schemas"]["SessionMode"];
            /** @description SAML non-admins must use their session email; omission fills it, explicit null is forbidden. Full-access callers may use any owner or null. */
            owner_email?: string | null;
            env_from?: components["schemas"]["EnvFrom"];
        };
        UpdateSchedule: {
            /** @description Exact Orpheus profile name; omitted keeps the stored choice; a change starts a new reusable session. */
            profile?: string;
            /** @description Exact Orpheus template name; omitted keeps the stored choice; a change starts a new reusable session. */
            template?: string;
            name?: string;
            prompt?: string;
            cron?: string;
            timezone?: string;
            status?: components["schemas"]["Status"];
            model?: string | null;
            session_mode?: components["schemas"]["SessionMode"];
            owner_email?: string | null;
            env_from?: components["schemas"]["EnvFrom"];
        };
        Schedule: {
            /** @description Whether this caller may modify the current schedule. False for deleted schedules. Computed from current ownership even on an idempotent creation replay; busy state can still prevent session reset. */
            can_edit: boolean;
            /** @description Stored Orpheus profile name. */
            profile: string;
            /** @description Stored Orpheus template name. */
            template: string;
            /**
             * Format: uri
             * @description Absolute Space Web card URL from ORPHEUS_PUBLIC_URL, or null when not configured. Computed at response time.
             */
            url: string | null;
            name: string;
            prompt: string;
            cron: string;
            timezone: string;
            status: components["schemas"]["Status"];
            model: string | null;
            session_mode: components["schemas"]["SessionMode"];
            owner_email: string | null;
            env_from: components["schemas"]["EnvFrom"];
            /** Format: uuid */
            id: string;
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            updated_at: string;
            /** Format: date-time */
            next_run_at: string | null;
            /** Format: date-time */
            deleted_at: string | null;
            last_occurrence: components["schemas"]["NullableOccurrence"];
        };
        SchedulePage: {
            items: components["schemas"]["Schedule"][];
            next_cursor: string | null;
        };
        Settings: {
            base_env_from: components["schemas"]["EnvFrom"];
            allowed_env_from: components["schemas"]["EnvFrom"];
            /** @enum {string} */
            browser_auth: SettingsBrowser_auth;
        };
        PreviewInput: {
            cron: string;
            timezone: string;
        };
        Preview: {
            times: string[];
        };
        AuthSession: {
            /** @enum {string} */
            mode: AuthSessionMode;
            authenticated: boolean;
            read_access: boolean;
            /** @description Can create schedules and modify those available to this caller. SAML users without an email cannot write. */
            write_access: boolean;
            /** @description Can manage all schedules and assign or clear their owners. True for configured SAML admins, valid Bearer keys and anonymous mode. */
            can_manage_all: boolean;
            user: {
                subject: string;
                display_name: string;
                /** @description Normalized email from the SAML identity, or null when unavailable. */
                email: string | null;
            } | null;
            /** Format: date-time */
            expires_at: string | null;
        };
        Occurrence: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            schedule_id: string;
            /** Format: date-time */
            scheduled_at: string;
            state: components["schemas"]["OccurrenceState"];
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            updated_at: string;
            /** Format: uuid */
            session_id: string | null;
            /** Format: uuid */
            run_id: string | null;
            run_status: string | null;
            /** Format: date-time */
            observed_at: string | null;
            /** Format: date-time */
            execution_started_at: string | null;
            /** Format: date-time */
            finished_at: string | null;
            run_error_code: string | null;
            sync_error_code: string | null;
            error_code: string | null;
            attempts: number;
            /** Format: date-time */
            next_attempt_at: string | null;
        };
        OccurrencePage: {
            items: components["schemas"]["Occurrence"][];
            next_cursor: string | null;
        };
        OccurrenceResult: {
            run_status: string;
            /** Format: date-time */
            fetched_at: string;
            error: {
                code: string;
                message: string;
                phase: string | null;
            } | null;
            final_message: {
                /** Format: uuid */
                id: string;
                text: string;
                /** Format: date-time */
                created_at: string;
            } | null;
        };
        /** @enum {string} */
        OccurrenceState: OccurrenceState;
        NullableOccurrence: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            schedule_id: string;
            /** Format: date-time */
            scheduled_at: string;
            state: components["schemas"]["OccurrenceState"];
            /** Format: date-time */
            created_at: string;
            /** Format: date-time */
            updated_at: string;
            /** Format: uuid */
            session_id: string | null;
            /** Format: uuid */
            run_id: string | null;
            run_status: string | null;
            /** Format: date-time */
            observed_at: string | null;
            /** Format: date-time */
            execution_started_at: string | null;
            /** Format: date-time */
            finished_at: string | null;
            run_error_code: string | null;
            sync_error_code: string | null;
            error_code: string | null;
            attempts: number;
            /** Format: date-time */
            next_attempt_at: string | null;
        } | null;
    };
    responses: {
        /** @description Structured API error. 401 credentials, 403 CSRF or schedule_forbidden, 404 missing, 409 conflict, 422 validation, 503 unavailable. */
        Problem: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Problem"];
            };
        };
    };
    parameters: {
        ID: string;
        /** @description Retries with the same normalized body return the original response. Keys do not expire. */
        IdempotencyKey: string;
        /** @description Repeated email filter; OR semantics, at most 100 distinct normalized emails. */
        OwnerEmail: string[];
        /** @description Only schedules without an owner. Cannot be combined with owner_email. */
        Unowned: boolean;
        Status: components["schemas"]["Status"];
        Limit: number;
        /** @description Opaque position bound to normalized filters. New inserts are excluded from an ongoing traversal. */
        Cursor: string;
        OccurrenceID: string;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
};
export type Problem = components['schemas']['Problem'];
export type EnvFrom = components['schemas']['EnvFrom'];
export type Profile = components['schemas']['Profile'];
export type CodexProfile = components['schemas']['CodexProfile'];
export type Profiles = components['schemas']['Profiles'];
export type Template = components['schemas']['Template'];
export type Templates = components['schemas']['Templates'];
export type CreateSchedule = components['schemas']['CreateSchedule'];
export type UpdateSchedule = components['schemas']['UpdateSchedule'];
export type Schedule = components['schemas']['Schedule'];
export type SchedulePage = components['schemas']['SchedulePage'];
export type Settings = components['schemas']['Settings'];
export type PreviewInput = components['schemas']['PreviewInput'];
export type Preview = components['schemas']['Preview'];
export type AuthSession = components['schemas']['AuthSession'];
export type Occurrence = components['schemas']['Occurrence'];
export type OccurrencePage = components['schemas']['OccurrencePage'];
export type OccurrenceResult = components['schemas']['OccurrenceResult'];
export type NullableOccurrence = components['schemas']['NullableOccurrence'];
export type ResponseProblem = components['responses']['Problem'];
export type ParameterId = components['parameters']['ID'];
export type ParameterIdempotencyKey = components['parameters']['IdempotencyKey'];
export type ParameterOwnerEmail = components['parameters']['OwnerEmail'];
export type ParameterUnowned = components['parameters']['Unowned'];
export type ParameterStatus = components['parameters']['Status'];
export type ParameterLimit = components['parameters']['Limit'];
export type ParameterCursor = components['parameters']['Cursor'];
export type ParameterOccurrenceId = components['parameters']['OccurrenceID'];
export type $defs = Record<string, never>;
export interface operations {
    ListSchedules: {
        parameters: {
            query?: {
                /** @description Repeated email filter; OR semantics, at most 100 distinct normalized emails. */
                owner_email?: components["parameters"]["OwnerEmail"];
                /** @description Only schedules without an owner. Cannot be combined with owner_email. */
                unowned?: components["parameters"]["Unowned"];
                status?: components["parameters"]["Status"];
                limit?: components["parameters"]["Limit"];
                /** @description Opaque position bound to normalized filters. New inserts are excluded from an ongoing traversal. */
                cursor?: components["parameters"]["Cursor"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SchedulePage"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    CreateSchedule: {
        parameters: {
            query?: never;
            header?: {
                /** @description Retries with the same normalized body return the original response. Keys do not expire. */
                "Idempotency-Key"?: components["parameters"]["IdempotencyKey"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateSchedule"];
            };
        };
        responses: {
            /** @description Success */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Schedule"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    GetSchedule: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["ID"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Schedule"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    DeleteSchedule: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["ID"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            default: components["responses"]["Problem"];
        };
    };
    UpdateSchedule: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["ID"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateSchedule"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Schedule"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    GetProfiles: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Profiles"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    GetTemplates: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Templates"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    GetSettings: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Settings"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    PreviewSchedule: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PreviewInput"];
            };
        };
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Preview"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    GetAuthSession: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthSession"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    ListOccurrences: {
        parameters: {
            query?: {
                limit?: components["parameters"]["Limit"];
                /** @description Opaque position bound to normalized filters. New inserts are excluded from an ongoing traversal. */
                cursor?: components["parameters"]["Cursor"];
            };
            header?: never;
            path: {
                id: components["parameters"]["ID"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OccurrencePage"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    GetOccurrence: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["ID"];
                occurrence_id: components["parameters"]["OccurrenceID"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Occurrence"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    GetOccurrenceResult: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["ID"];
                occurrence_id: components["parameters"]["OccurrenceID"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OccurrenceResult"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    ResetSession: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["ID"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Success */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Schedule"];
                };
            };
            default: components["responses"]["Problem"];
        };
    };
    BrowserLogin: {
        parameters: {
            query?: {
                next?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Start SP-initiated SAML login */
            302: {
                headers: {
                    /** @description SAML IdP URL. */
                    Location?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Invalid return path (400), authentication disabled (404), request validation failed (422), or authentication/storage unavailable (503). */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Problem"];
                };
            };
        };
    };
    BrowserCallback: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Consume a signed SAML HTTP-POST response */
            303: {
                headers: {
                    /** @description Validated local return path. */
                    Location?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Invalid login state (400), invalid SAML response (401), authentication disabled (404), oversized form (413), or authentication/storage unavailable (503). */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Problem"];
                };
            };
        };
    };
    BrowserLogout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Revoke the local browser session */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Invalid origin or CSRF header (403), or storage unavailable (503). */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Problem"];
                };
            };
        };
    };
    SamlMetadata: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Read service provider metadata */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/samlmetadata+xml": string;
                };
            };
            /** @description Authentication disabled (404), or metadata unavailable (503). */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Problem"];
                };
            };
        };
    };
}
export enum Status {
    active = "active",
    paused = "paused"
}
export enum SessionMode {
    new = "new",
    reuse = "reuse"
}
export enum ProfileHarness {
    codex = "codex"
}
export enum CodexProfileEffort {
    none = "none",
    minimal = "minimal",
    low = "low",
    medium = "medium",
    high = "high",
    xhigh = "xhigh",
    max = "max",
    ultra = "ultra"
}
export enum CodexProfileSummary {
    auto = "auto",
    concise = "concise",
    detailed = "detailed",
    none = "none"
}
export enum CodexProfilePersonality {
    none = "none",
    friendly = "friendly",
    pragmatic = "pragmatic"
}
export enum SettingsBrowser_auth {
    api_only = "api_only",
    anonymous = "anonymous",
    saml = "saml"
}
export enum AuthSessionMode {
    api_only = "api_only",
    anonymous = "anonymous",
    saml = "saml"
}
export enum OccurrenceState {
    pending = "pending",
    dispatching = "dispatching",
    accepted = "accepted",
    skipped = "skipped",
    failed = "failed",
    cancelled = "cancelled"
}
