import {
    signUp,
    confirmSignUp,
    resendSignUpCode as amplifyResendSignUpCode,
    resetPassword as amplifyResetPassword,
    confirmResetPassword as amplifyConfirmResetPassword,
    signIn,
    signOut,
    fetchAuthSession,
    getCurrentUser,

} from "aws-amplify/auth"
import type { AuthTokens } from "aws-amplify/auth";

type TokenPayload = Record<string, unknown>;

export type LoginUserResult = {
    isSignedIn: boolean;
    nextStep?: Awaited<ReturnType<typeof signIn>>["nextStep"];
};

export type AuthTokenSnapshot = {
    accessToken?: string;
    idToken?: string;
    accessTokenPayload?: TokenPayload;
    idTokenPayload?: TokenPayload;
};

export type PasswordResetStartResult = Awaited<ReturnType<typeof amplifyResetPassword>>;

function tokenPayloadToRecord(token?: AuthTokens["accessToken"]): TokenPayload | undefined {
    if (!token?.payload || typeof token.payload !== "object") {
        return undefined;
    }

    return token.payload as TokenPayload;
}

function extractGroups(payload?: TokenPayload): string[] {
    if (!payload) {
        return [];
    }

    const groups = payload["cognito:groups"];
    if (!Array.isArray(groups)) {
        return [];
    }


    return groups.filter((group): group is string => typeof group === "string");
}

function makeUsername(email: string) {
    const base = email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "");
    return `${base}_${crypto.randomUUID().slice(0, 8)}`;
}

export async function registerUser(input: {
    email: string;
    name: string;
    phone_number: string;
    password: string;
    birthdate: string;
    facility_id: string
}) {
    const username = makeUsername(input.email);

    const { isSignUpComplete, nextStep, userId } = await signUp({
        username,
        password: input.password,
        options: {
            userAttributes: {
                email: input.email,
                birthdate: input.birthdate,
                name: input.name,
                phone_number: input.phone_number,
                updated_at: Math.floor(Date.now() / 1000).toString(),
                "custom:facility_id": input.facility_id
            },
        },
    });

    return {
        username,
        isSignUpComplete,
        nextStep,
        userId,
    };
}

export async function confirmUser(username: string, code: string) {
    const { isSignUpComplete, nextStep } = await confirmSignUp({
        username,
        confirmationCode: code,
    });

    return {
        isSignUpComplete,
        nextStep,
    };
}

export async function resendSignUpCode(username: string) {
    const codeDeliveryDetails = await amplifyResendSignUpCode({
        username,
    });

    return codeDeliveryDetails;
}

export async function requestPasswordReset(username: string): Promise<PasswordResetStartResult> {
    return amplifyResetPassword({
        username,
    });
}

export async function confirmPasswordReset(username: string, code: string, newPassword: string) {
    await amplifyConfirmResetPassword({
        username,
        confirmationCode: code,
        newPassword,
    });
}

export async function loginUser(email: string, password: string): Promise<LoginUserResult> {
    const { isSignedIn, nextStep } = await signIn({
        username: email,
        password,
    });

    return {
        isSignedIn,
        nextStep,
    };
}

export async function getAuthTokens(): Promise<AuthTokenSnapshot> {
    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken;
    const idToken = session.tokens?.idToken;

    return {
        accessToken: accessToken?.toString(),
        idToken: idToken?.toString(),
        accessTokenPayload: tokenPayloadToRecord(accessToken),
        idTokenPayload: tokenPayloadToRecord(idToken),
    };
}

export async function getUserRoles(): Promise<string[]> {
    const { accessTokenPayload, idTokenPayload } = await getAuthTokens();
    const accessGroups = extractGroups(accessTokenPayload);
    if (accessGroups.length > 0) {
        return accessGroups;
    }

    return extractGroups(idTokenPayload);
}

export async function getAuthenticatedUser() {
    return getCurrentUser();
}

export async function logoutUser() {
    await signOut();
}
