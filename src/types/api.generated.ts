/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export type GinH = Record<string, any>;

export interface InternalApiCreateOrganizationRequest {
  /**
   * @min 1
   * @max 47
   */
  county: number;
  facility_code: string;
  lat: number;
  /**
   * @min 1
   * @max 6
   */
  level: number;
  lng: number;
  name: string;
  ownership_type: "public" | "private" | "faith_based";
}

export interface InternalApiCreatePatientAddress {
  city?: string;
  postal_code?: string;
  status?: string;
}

export interface InternalApiCreatePatientRequest {
  active?: boolean;
  address: InternalApiCreatePatientAddress;
  /** ISO8601 date */
  date_of_birth: string;
  full_name: string;
  gender?: "male" | "female" | "other" | "unknown";
  primary_phone: string;
}

export interface InternalApiCreateServiceRequest {
  availability: "available" | "limited" | "unavailable";
  notes?: string;
  service_name: string;
}

export interface InternalApiUpdateOrganizationRequest {
  /**
   * @min 1
   * @max 47
   */
  county: number;
  facility_code: string;
  lat: number;
  /**
   * @min 1
   * @max 6
   */
  level: number;
  lng: number;
  name: string;
  ownership_type: "public" | "private" | "faith_based";
}

export interface InternalApiUpdatePatientAddress {
  city?: string;
  postal_code?: string;
  status?: string;
}

export interface InternalApiUpdatePatientRequest {
  active?: boolean;
  address: InternalApiUpdatePatientAddress;
  date_of_birth: string;
  full_name: string;
  gender?: "male" | "female" | "other" | "unknown";
  primary_phone: string;
}

export interface InternalApiUpdateServiceRequest {
  availability: "available" | "limited" | "unavailable";
  notes?: string;
  service_name: string;
}

export interface MsOrganizationsInternalDomainModelOrganization {
  county?: number;
  created_at?: string;
  facility_code?: string;
  id?: string;
  lat?: number;
  level?: number;
  lng?: number;
  name?: string;
  ownership_type?: string;
  updated_at?: string;
}

export interface MsOrganizationsInternalDomainModelPatient {
  active?: boolean;
  address?: MsOrganizationsInternalDomainModelPatientAddress;
  created_at?: string;
  date_of_birth?: string;
  full_name?: string;
  gender?: string;
  id?: string;
  primary_phone?: string;
  updated_at?: string;
}

export interface MsOrganizationsInternalDomainModelPatientAddress {
  city?: string;
  postal_code?: string;
  status?: string;
}

export interface MsOrganizationsInternalDomainModelService {
  availability?: string;
  created_at?: string;
  id?: string;
  notes?: string;
  organization_id?: string;
  service_name?: string;
  updated_at?: string;
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown>
  extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) =>
    fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter(
      (key) => "undefined" !== typeof query[key],
    );
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key),
      )
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.JsonApi]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.Text]: (input: any) =>
      input !== null && typeof input !== "string"
        ? JSON.stringify(input)
        : input,
    [ContentType.FormData]: (input: any) => {
      if (input instanceof FormData) {
        return input;
      }

      return Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        );
        return formData;
      }, new FormData());
    },
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(
    params1: RequestParams,
    params2?: RequestParams,
  ): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (
    cancelToken: CancelToken,
  ): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(
      `${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`,
      {
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData
            ? { "Content-Type": type }
            : {}),
        },
        signal:
          (cancelToken
            ? this.createAbortSignal(cancelToken)
            : requestParams.signal) || null,
        body:
          typeof body === "undefined" || body === null
            ? null
            : payloadFormatter(body),
      },
    ).then(async (response) => {
      const r = response as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const responseToParse = responseFormat ? response.clone() : response;
      const data = !responseFormat
        ? r
        : await responseToParse[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data;
    });
  };
}

/**
 * @title MS Organizations API
 * @version 1.0
 * @contact
 *
 * Microservice for organizations, services, and patients (FHIR-inspired).
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  organizations = {
    /**
     * No description
     *
     * @tags organizations
     * @name OrganizationsList
     * @summary List organizations
     * @request GET:/organizations
     */
    organizationsList: (
      query?: {
        /**
         * limit
         * @default 50
         */
        limit?: number;
        /**
         * offset
         * @default 0
         */
        offset?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<MsOrganizationsInternalDomainModelOrganization[], GinH>({
        path: `/organizations`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags organizations
     * @name OrganizationsCreate
     * @summary Create an organization
     * @request POST:/organizations
     */
    organizationsCreate: (
      body: InternalApiCreateOrganizationRequest,
      params: RequestParams = {},
    ) =>
      this.request<MsOrganizationsInternalDomainModelOrganization, GinH>({
        path: `/organizations`,
        method: "POST",
        body: body,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags organizations
     * @name OrganizationsDetail
     * @summary Get an organization
     * @request GET:/organizations/{id}
     */
    organizationsDetail: (id: string, params: RequestParams = {}) =>
      this.request<MsOrganizationsInternalDomainModelOrganization, GinH>({
        path: `/organizations/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags organizations
     * @name OrganizationsUpdate
     * @summary Update an organization
     * @request PUT:/organizations/{id}
     */
    organizationsUpdate: (
      id: string,
      body: InternalApiUpdateOrganizationRequest,
      params: RequestParams = {},
    ) =>
      this.request<MsOrganizationsInternalDomainModelOrganization, GinH>({
        path: `/organizations/${id}`,
        method: "PUT",
        body: body,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags organizations
     * @name OrganizationsDelete
     * @summary Delete an organization
     * @request DELETE:/organizations/{id}
     */
    organizationsDelete: (id: string, params: RequestParams = {}) =>
      this.request<void, GinH>({
        path: `/organizations/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags services
     * @name ServicesList
     * @summary List services for an organization
     * @request GET:/organizations/{id}/services
     */
    servicesList: (id: string, params: RequestParams = {}) =>
      this.request<MsOrganizationsInternalDomainModelService[], GinH>({
        path: `/organizations/${id}/services`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags services
     * @name ServicesCreate
     * @summary Create a service for an organization
     * @request POST:/organizations/{id}/services
     */
    servicesCreate: (
      id: string,
      body: InternalApiCreateServiceRequest,
      params: RequestParams = {},
    ) =>
      this.request<MsOrganizationsInternalDomainModelService, GinH>({
        path: `/organizations/${id}/services`,
        method: "POST",
        body: body,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  patients = {
    /**
     * No description
     *
     * @tags patients
     * @name PatientsList
     * @summary Search patients
     * @request GET:/patients
     */
    patientsList: (
      query?: {
        /** full name */
        name?: string;
        /** date of birth (YYYY-MM-DD) */
        dob?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<MsOrganizationsInternalDomainModelPatient[], GinH>({
        path: `/patients`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags patients
     * @name PatientsCreate
     * @summary Create a patient
     * @request POST:/patients
     */
    patientsCreate: (
      body: InternalApiCreatePatientRequest,
      params: RequestParams = {},
    ) =>
      this.request<MsOrganizationsInternalDomainModelPatient, GinH>({
        path: `/patients`,
        method: "POST",
        body: body,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags patients
     * @name PatientsDetail
     * @summary Get a patient
     * @request GET:/patients/{id}
     */
    patientsDetail: (id: string, params: RequestParams = {}) =>
      this.request<MsOrganizationsInternalDomainModelPatient, GinH>({
        path: `/patients/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags patients
     * @name PatientsUpdate
     * @summary Update a patient
     * @request PUT:/patients/{id}
     */
    patientsUpdate: (
      id: string,
      body: InternalApiUpdatePatientRequest,
      params: RequestParams = {},
    ) =>
      this.request<MsOrganizationsInternalDomainModelPatient, GinH>({
        path: `/patients/${id}`,
        method: "PUT",
        body: body,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags patients
     * @name PatientsDelete
     * @summary Delete a patient
     * @request DELETE:/patients/{id}
     */
    patientsDelete: (id: string, params: RequestParams = {}) =>
      this.request<void, GinH>({
        path: `/patients/${id}`,
        method: "DELETE",
        ...params,
      }),
  };
  services = {
    /**
     * No description
     *
     * @tags services
     * @name ServicesDetail
     * @summary Get a service
     * @request GET:/services/{id}
     */
    servicesDetail: (id: string, params: RequestParams = {}) =>
      this.request<MsOrganizationsInternalDomainModelService, GinH>({
        path: `/services/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags services
     * @name ServicesUpdate
     * @summary Update a service
     * @request PUT:/services/{id}
     */
    servicesUpdate: (
      id: string,
      body: InternalApiUpdateServiceRequest,
      params: RequestParams = {},
    ) =>
      this.request<MsOrganizationsInternalDomainModelService, GinH>({
        path: `/services/${id}`,
        method: "PUT",
        body: body,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags services
     * @name ServicesDelete
     * @summary Delete a service
     * @request DELETE:/services/{id}
     */
    servicesDelete: (id: string, params: RequestParams = {}) =>
      this.request<void, GinH>({
        path: `/services/${id}`,
        method: "DELETE",
        ...params,
      }),
  };
}
