import axios from "axios";
import type {
  InternalApiCreatePatientRequest,
  InternalApiUpdatePatientRequest,
  MsOrganizationsInternalDomainModelPatient as Patient,
} from "../types/api.generated";

const ORGANIZATIONS_BASE_URL =
  (import.meta.env.VITE_ORGANIZATIONS_API_BASE_URL as string | undefined) ??
  "https://nrs-organizations-production.up.railway.app";

const patientsApi = axios.create({
  baseURL: ORGANIZATIONS_BASE_URL,
});

function authHeaders(accessToken?: string) {
  if (!accessToken) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export type PatientUpsertInput = InternalApiCreatePatientRequest;

export type PatientListQuery = {
  name?: string;
  dob?: string;
};

export async function listPatients(
  query?: PatientListQuery,
  accessToken?: string,
): Promise<Patient[]> {
  const response = await patientsApi.get<Patient[]>("/patients", {
    params: query,
    headers: authHeaders(accessToken),
  });

  return response.data;
}

export async function createPatient(
  payload: PatientUpsertInput,
  accessToken?: string,
): Promise<Patient> {
  const response = await patientsApi.post<Patient>("/patients", payload, {
    headers: authHeaders(accessToken),
  });

  return response.data;
}

export async function updatePatientById(
  patientId: string,
  payload: InternalApiUpdatePatientRequest,
  accessToken?: string,
): Promise<Patient> {
  const response = await patientsApi.put<Patient>(`/patients/${patientId}`, payload, {
    headers: authHeaders(accessToken),
  });

  return response.data;
}

export async function deletePatientById(patientId: string, accessToken?: string): Promise<void> {
  await patientsApi.delete(`/patients/${patientId}`, {
    headers: authHeaders(accessToken),
  });
}
