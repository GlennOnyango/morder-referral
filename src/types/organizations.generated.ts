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

export interface ApiCreateOrganizationRequest {
  county?: number;
  facility_code?: string;
  lat?: number;
  level?: number;
  lng?: number;
  name: string;
  organization_type: "facility" | "service";
  ownership_type?: "public" | "private" | "faith_based";
  sub_county?: string;
  transport_available?: boolean;
  ward?: string;
}

export interface ApiCreateServiceRequest {
  availability: "available" | "limited" | "unavailable";
  notes?: string;
  service_name: string;
  service_type?: string;
}

export interface ApiCreateServiceRequestMessageRequest {
  body: string;
  currency?: string;
  message_type: "comment" | "clarification" | "bid" | "answer";
  proposed_amount?: number;
  sender_organization_id: string;
}

export interface ApiCreateServiceRequestRequest {
  needed_by?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  provider_organization_id: string;
  request_details: string;
  requesting_organization_id: string;
  service_id: string;
}

export interface ApiFacilityCodeValidationResponse {
  facilityId?: string;
  valid?: boolean;
}

export interface ApiPaginatedResponse {
  data?: any;
  limit?: number;
  offset?: number;
}

export interface ApiReviewOrganizationVerificationRequest {
  decision: "verified" | "rejected";
  reason: string;
}

export interface ApiUpdateOrganizationRequest {
  county?: number;
  facility_code?: string;
  lat?: number;
  level?: number;
  lng?: number;
  name: string;
  organization_type: "facility" | "service";
  ownership_type?: "public" | "private" | "faith_based";
  sub_county?: string;
  transport_available?: boolean;
  ward?: string;
}

export interface ApiUpdateServiceRequest {
  availability: "available" | "limited" | "unavailable";
  notes?: string;
  service_name: string;
  service_type?: string;
}

export interface ApiUpdateServiceRequestStatusRequest {
  eta?: string;
  provider_organization_id: string;
  response_notes?: string;
  status: "accepted" | "rejected" | "completed";
}

export type GinH = Record<string, any>;

export interface ModelOrganization {
  county?: number;
  created_at?: string;
  deleted?: boolean;
  facility_code?: string;
  id?: string;
  is_verified?: boolean;
  lat?: number;
  level?: number;
  lng?: number;
  name?: string;
  organization_type?: string;
  ownership_type?: string;
  sub_county?: string;
  transport_available?: boolean;
  updated_at?: string;
  ward?: string;
}

export interface ModelService {
  availability?: string;
  created_at?: string;
  deleted?: boolean;
  id?: string;
  notes?: string;
  organization_id?: string;
  service_name?: string;
  service_type?: string;
  updated_at?: string;
}

export interface ModelServiceRequest {
  created_at?: string;
  deleted?: boolean;
  eta?: string;
  id?: string;
  needed_by?: string;
  priority?: string;
  provider_organization_id?: string;
  request_details?: string;
  requesting_organization_id?: string;
  response_notes?: string;
  service_id?: string;
  status?: string;
  updated_at?: string;
}

export interface ModelServiceRequestMessage {
  body?: string;
  created_at?: string;
  currency?: string;
  deleted?: boolean;
  id?: string;
  message_type?: string;
  proposed_amount?: number;
  sender_organization_id?: string;
  service_request_id?: string;
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
 * Microservice for organizations and services.
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
     * @secure
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
      this.request<ModelOrganization[], GinH>({
        path: `/organizations`,
        method: "GET",
        query: query,
        secure: true,
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
     * @secure
     */
    organizationsCreate: (
      body: ApiCreateOrganizationRequest,
      params: RequestParams = {},
    ) =>
      this.request<ModelOrganization, GinH>({
        path: `/organizations`,
        method: "POST",
        body: body,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags services
     * @name FacilityServicesList
     * @summary List services for a facility
     * @request GET:/organizations/facility/{facility_code}/services
     * @secure
     */
    facilityServicesList: (
      facilityCode: string,
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
      this.request<ApiPaginatedResponse, GinH>({
        path: `/organizations/facility/${facilityCode}/services`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags organizations
     * @name UnverifiedList
     * @summary List unverified organizations
     * @request GET:/organizations/unverified
     * @secure
     */
    unverifiedList: (
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
      this.request<ApiPaginatedResponse, GinH>({
        path: `/organizations/unverified`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags organizations
     * @name ValidateDetail
     * @summary Validate a facility code
     * @request GET:/organizations/validate/{facility_code}
     */
    validateDetail: (facilityCode: string, params: RequestParams = {}) =>
      this.request<ApiFacilityCodeValidationResponse, GinH>({
        path: `/organizations/validate/${facilityCode}`,
        method: "GET",
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
     * @secure
     */
    organizationsDetail: (id: string, params: RequestParams = {}) =>
      this.request<ModelOrganization, GinH>({
        path: `/organizations/${id}`,
        method: "GET",
        secure: true,
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
     * @secure
     */
    organizationsUpdate: (
      id: string,
      body: ApiUpdateOrganizationRequest,
      params: RequestParams = {},
    ) =>
      this.request<ModelOrganization, GinH>({
        path: `/organizations/${id}`,
        method: "PUT",
        body: body,
        secure: true,
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
     * @secure
     */
    organizationsDelete: (id: string, params: RequestParams = {}) =>
      this.request<void, GinH>({
        path: `/organizations/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),

    /**
     * No description
     *
     * @tags service-requests
     * @name ServiceRequestsIncomingList
     * @summary List incoming service requests
     * @request GET:/organizations/{id}/service-requests/incoming
     * @secure
     */
    serviceRequestsIncomingList: (
      id: string,
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
      this.request<ApiPaginatedResponse, GinH>({
        path: `/organizations/${id}/service-requests/incoming`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags service-requests
     * @name ServiceRequestsOutgoingList
     * @summary List outgoing service requests
     * @request GET:/organizations/{id}/service-requests/outgoing
     * @secure
     */
    serviceRequestsOutgoingList: (
      id: string,
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
      this.request<ApiPaginatedResponse, GinH>({
        path: `/organizations/${id}/service-requests/outgoing`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags services
     * @name ServicesList
     * @summary List services for an organization
     * @request GET:/organizations/{id}/services
     * @secure
     */
    servicesList: (id: string, params: RequestParams = {}) =>
      this.request<ModelService[], GinH>({
        path: `/organizations/${id}/services`,
        method: "GET",
        secure: true,
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
     * @secure
     */
    servicesCreate: (
      id: string,
      body: ApiCreateServiceRequest,
      params: RequestParams = {},
    ) =>
      this.request<ModelService, GinH>({
        path: `/organizations/${id}/services`,
        method: "POST",
        body: body,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags organizations
     * @name VerificationCreate
     * @summary Review organization verification
     * @request POST:/organizations/{id}/verification
     * @secure
     */
    verificationCreate: (
      id: string,
      body: ApiReviewOrganizationVerificationRequest,
      params: RequestParams = {},
    ) =>
      this.request<ModelOrganization, GinH>({
        path: `/organizations/${id}/verification`,
        method: "POST",
        body: body,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  serviceRequests = {
    /**
     * No description
     *
     * @tags service-requests
     * @name ServiceRequestsCreate
     * @summary Create a service request
     * @request POST:/service-requests
     * @secure
     */
    serviceRequestsCreate: (
      body: ApiCreateServiceRequestRequest,
      params: RequestParams = {},
    ) =>
      this.request<ModelServiceRequest, GinH>({
        path: `/service-requests`,
        method: "POST",
        body: body,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags service-requests
     * @name MessagesList
     * @summary List service request messages
     * @request GET:/service-requests/{id}/messages
     * @secure
     */
    messagesList: (
      id: string,
      query: {
        /** Organization ID */
        organization_id: string;
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
      this.request<ApiPaginatedResponse, GinH>({
        path: `/service-requests/${id}/messages`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags service-requests
     * @name MessagesCreate
     * @summary Create a service request message
     * @request POST:/service-requests/{id}/messages
     * @secure
     */
    messagesCreate: (
      id: string,
      body: ApiCreateServiceRequestMessageRequest,
      params: RequestParams = {},
    ) =>
      this.request<ModelServiceRequestMessage, GinH>({
        path: `/service-requests/${id}/messages`,
        method: "POST",
        body: body,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags service-requests
     * @name StatusPartialUpdate
     * @summary Update service request status
     * @request PATCH:/service-requests/{id}/status
     * @secure
     */
    statusPartialUpdate: (
      id: string,
      body: ApiUpdateServiceRequestStatusRequest,
      params: RequestParams = {},
    ) =>
      this.request<ModelServiceRequest, GinH>({
        path: `/service-requests/${id}/status`,
        method: "PATCH",
        body: body,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  services = {
    /**
     * No description
     *
     * @tags services
     * @name ServicesList
     * @summary List services across organizations
     * @request GET:/services
     * @secure
     */
    servicesList: (
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
      this.request<ApiPaginatedResponse, GinH>({
        path: `/services`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags services
     * @name ServicesDetail
     * @summary Get a service
     * @request GET:/services/{id}
     * @secure
     */
    servicesDetail: (id: string, params: RequestParams = {}) =>
      this.request<ModelService, GinH>({
        path: `/services/${id}`,
        method: "GET",
        secure: true,
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
     * @secure
     */
    servicesUpdate: (
      id: string,
      body: ApiUpdateServiceRequest,
      params: RequestParams = {},
    ) =>
      this.request<ModelService, GinH>({
        path: `/services/${id}`,
        method: "PUT",
        body: body,
        secure: true,
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
     * @secure
     */
    servicesDelete: (id: string, params: RequestParams = {}) =>
      this.request<void, GinH>({
        path: `/services/${id}`,
        method: "DELETE",
        secure: true,
        ...params,
      }),
  };
}
