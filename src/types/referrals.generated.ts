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

export enum ModelsReferralStatus {
  ReferralStatusOpen = "open",
  ReferralStatusAccepted = "accepted",
  ReferralStatusCancelled = "cancelled",
  ReferralStatusClosed = "closed",
}

export interface HandlerAdditionalInformationRequestListResponse {
  items?: ModelsAdditionalInformationRequest[];
}

export interface HandlerAdditionalInformationRequestResponse {
  additionalInformation?: string;
  createdAt?: string;
  facilityId?: string;
  id?: string;
  referralId?: string;
  requestedBySub?: string;
  requestedByUsername?: string;
  title?: string;
  updatedAt?: string;
}

export interface HandlerErrorResponse {
  error?: string;
  message?: string;
}

export interface HandlerNotificationListResponse {
  items?: ModelsNotification[];
}

export interface HandlerNotificationResponse {
  createdAt?: string;
  eventType?: string;
  id?: string;
  isRead?: boolean;
  payload?: object;
  referralCode?: string;
  referralId?: string;
  targetFacilityCode?: string;
  updatedAt?: string;
}

export interface HandlerReferralHistoryListResponse {
  items?: ModelsReferralHistory[];
}

export interface HandlerReferralListResponse {
  items?: ModelsReferral[];
}

export interface HandlerReferralResponse {
  acceptedAt?: string;
  acceptedByFacilityCode?: string;
  clinicalSummary?: string;
  createdAt?: string;
  id?: string;
  metadata?: object;
  modeOfPayment?: string;
  notes?: string;
  originFacilityCode?: string;
  patient?: ModelsPatient;
  priority?: string;
  raisedBySub?: string;
  raisedByUsername?: string;
  reasonForReferral?: string;
  referralCode?: string;
  serviceType?: string;
  status?: ModelsReferralStatus;
  updatedAt?: string;
}

export interface HandlerStatusResponse {
  status?: string;
}

export interface ModelsAdditionalInformationRequest {
  additionalInformation?: string;
  createdAt?: string;
  facilityId?: string;
  id?: string;
  referralId?: string;
  requestedBySub?: string;
  requestedByUsername?: string;
  title?: string;
  updatedAt?: string;
}

export interface ModelsNotification {
  createdAt?: string;
  eventType?: string;
  id?: string;
  isRead?: boolean;
  payload?: object;
  referralCode?: string;
  referralId?: string;
  targetFacilityCode?: string;
  updatedAt?: string;
}

export interface ModelsPatient {
  additionalNotes?: string;
  allergies?: string;
  createdAt?: string;
  dateOfBirth?: number;
  diagnosis?: string;
  fullName?: string;
  gender?: string;
  id?: string;
  referralId?: string;
  updatedAt?: string;
  vitalSummary?: string;
}

export interface ModelsReferral {
  acceptedAt?: string;
  acceptedByFacilityCode?: string;
  clinicalSummary?: string;
  createdAt?: string;
  id?: string;
  metadata?: object;
  modeOfPayment?: string;
  notes?: string;
  originFacilityCode?: string;
  patient?: ModelsPatient;
  priority?: string;
  raisedBySub?: string;
  raisedByUsername?: string;
  reasonForReferral?: string;
  referralCode?: string;
  serviceType?: string;
  status?: ModelsReferralStatus;
  updatedAt?: string;
}

export interface ModelsReferralHistory {
  action?: string;
  actorName?: string;
  actorSub?: string;
  createdAt?: string;
  description?: string;
  facilityCode?: string;
  id?: string;
  metadata?: object;
  referralId?: string;
}

export interface ServiceAcceptReferralInput {
  facilityCode: string;
  notes?: string;
}

export interface ServiceCreateAdditionalInformationRequestInput {
  additionalInformation: string;
  facilityId: string;
  title: string;
}

export interface ServiceCreateReferralInput {
  clinicalSummary?: string;
  metadata?: Record<string, any>;
  modeOfPayment: string;
  notes?: string;
  originFacilityCode?: string;
  patient: ServicePatientInput;
  priority: string;
  reasonForReferral: string;
  serviceType: string;
}

export interface ServicePatientInput {
  additionalNotes?: string;
  allergies?: string;
  dateOfBirth: number;
  diagnosis?: string;
  fullName: string;
  gender: string;
  vitalSummary?: string;
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
  public baseUrl: string = "/api/v1";
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
 * @title NRS Referrals API
 * @version 1.0.0
 * @baseUrl /api/v1
 * @contact
 *
 * Referral microservice secured by Amazon Cognito.
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  facilities = {
    /**
     * @description Returns referrals created by or accepted by a facility.
     *
     * @tags facilities
     * @name ReferralsList
     * @summary Get facility referrals
     * @request GET:/facilities/{facilityCode}/referrals
     * @secure
     */
    referralsList: (
      facilityCode: string,
      query?: {
        /** Referral status filter */
        status?: string;
        /** origin or accepted */
        role?: string;
        /** Page size */
        limit?: number;
        /** Page offset */
        offset?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<HandlerReferralListResponse, HandlerErrorResponse>({
        path: `/facilities/${facilityCode}/referrals`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),
  };
  healthz = {
    /**
     * @description Returns service health status.
     *
     * @tags health
     * @name HealthzList
     * @summary Health check
     * @request GET:/healthz
     */
    healthzList: (params: RequestParams = {}) =>
      this.request<HandlerStatusResponse, any>({
        path: `/healthz`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  notifications = {
    /**
     * @description Returns notifications for a facility.
     *
     * @tags notifications
     * @name NotificationsList
     * @summary List notifications
     * @request GET:/notifications
     * @secure
     */
    notificationsList: (
      query?: {
        /** Facility code */
        facility_code?: string;
        /** Unread only */
        unread_only?: boolean;
        /** Page size */
        limit?: number;
        /** Page offset */
        offset?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<HandlerNotificationListResponse, HandlerErrorResponse>({
        path: `/notifications`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Opens a Server-Sent Events stream for facility and pool notifications.
     *
     * @tags notifications
     * @name StreamList
     * @summary Stream notifications
     * @request GET:/notifications/stream
     * @secure
     */
    streamList: (
      query?: {
        /** Facility code */
        facility_code?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<string, HandlerErrorResponse>({
        path: `/notifications/stream`,
        method: "GET",
        query: query,
        secure: true,
        ...params,
      }),

    /**
     * @description Opens a Server-Sent Events stream for a facility using the facility code path parameter.
     *
     * @tags notifications
     * @name StreamDetail
     * @summary Stream notifications by facility
     * @request GET:/notifications/stream/{facilityCode}
     * @secure
     */
    streamDetail: (facilityCode: string, params: RequestParams = {}) =>
      this.request<string, HandlerErrorResponse>({
        path: `/notifications/stream/${facilityCode}`,
        method: "GET",
        secure: true,
        ...params,
      }),

    /**
     * @description Marks a facility notification as read.
     *
     * @tags notifications
     * @name ReadPartialUpdate
     * @summary Mark notification as read
     * @request PATCH:/notifications/{id}/read
     * @secure
     */
    readPartialUpdate: (
      id: string,
      query?: {
        /** Facility code */
        facility_code?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<HandlerNotificationResponse, HandlerErrorResponse>({
        path: `/notifications/${id}/read`,
        method: "PATCH",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),
  };
  readyz = {
    /**
     * @description Returns readiness status after checking database connectivity.
     *
     * @tags health
     * @name ReadyzList
     * @summary Readiness check
     * @request GET:/readyz
     */
    readyzList: (params: RequestParams = {}) =>
      this.request<HandlerStatusResponse, HandlerStatusResponse>({
        path: `/readyz`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  referrals = {
    /**
     * @description Creates a new referral and publishes it to the referral pool. The raising user is derived from the Cognito token.
     *
     * @tags referrals
     * @name ReferralsCreate
     * @summary Create referral
     * @request POST:/referrals
     * @secure
     */
    referralsCreate: (
      request: ServiceCreateReferralInput,
      params: RequestParams = {},
    ) =>
      this.request<HandlerReferralResponse, HandlerErrorResponse>({
        path: `/referrals`,
        method: "POST",
        body: request,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns additional information requests for a referral.
     *
     * @tags referrals
     * @name ByIdInformationRequestsList
     * @summary List additional information requests
     * @request GET:/referrals/by-id/{referralId}/information-requests
     * @secure
     */
    byIdInformationRequestsList: (
      referralId: string,
      params: RequestParams = {},
    ) =>
      this.request<
        HandlerAdditionalInformationRequestListResponse,
        HandlerErrorResponse
      >({
        path: `/referrals/by-id/${referralId}/information-requests`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Creates an additional information request for a referral and notifies the target facility.
     *
     * @tags referrals
     * @name ByIdInformationRequestsCreate
     * @summary Request additional referral information
     * @request POST:/referrals/by-id/{referralId}/information-requests
     * @secure
     */
    byIdInformationRequestsCreate: (
      referralId: string,
      request: ServiceCreateAdditionalInformationRequestInput,
      params: RequestParams = {},
    ) =>
      this.request<
        HandlerAdditionalInformationRequestResponse,
        HandlerErrorResponse
      >({
        path: `/referrals/by-id/${referralId}/information-requests`,
        method: "POST",
        body: request,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns referrals currently available in the referral pool.
     *
     * @tags referrals
     * @name PoolList
     * @summary List open referrals
     * @request GET:/referrals/pool
     * @secure
     */
    poolList: (
      query?: {
        /** Service type filter */
        service_type?: string;
        /** Page size */
        limit?: number;
        /** Page offset */
        offset?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<HandlerReferralListResponse, HandlerErrorResponse>({
        path: `/referrals/pool`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns a single referral using its referral code.
     *
     * @tags referrals
     * @name ReferralsDetail
     * @summary Get referral by code
     * @request GET:/referrals/{referralCode}
     * @secure
     */
    referralsDetail: (referralCode: string, params: RequestParams = {}) =>
      this.request<HandlerReferralResponse, HandlerErrorResponse>({
        path: `/referrals/${referralCode}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Accepts an open referral for a facility and removes it from the pool.
     *
     * @tags referrals
     * @name AcceptCreate
     * @summary Accept referral
     * @request POST:/referrals/{referralCode}/accept
     * @secure
     */
    acceptCreate: (
      referralCode: string,
      request: ServiceAcceptReferralInput,
      params: RequestParams = {},
    ) =>
      this.request<HandlerReferralResponse, HandlerErrorResponse>({
        path: `/referrals/${referralCode}/accept`,
        method: "POST",
        body: request,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns audit history entries for a referral.
     *
     * @tags referrals
     * @name HistoryList
     * @summary Get referral history
     * @request GET:/referrals/{referralCode}/history
     * @secure
     */
    historyList: (referralCode: string, params: RequestParams = {}) =>
      this.request<HandlerReferralHistoryListResponse, HandlerErrorResponse>({
        path: `/referrals/${referralCode}/history`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
}
